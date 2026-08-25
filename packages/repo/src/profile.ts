/**
 * Project profile detection.
 *
 * This exists to stop agents being handed instructions their sandbox cannot execute. The
 * canonical failure — an agent told to run `pnpm test` in an environment that ran
 * `npm install` against a pnpm workspace — is silent, total, and extremely common in
 * hand-rolled pipelines. Detecting the toolchain from the repo rather than asking a human to
 * restate it removes the class of bug entirely.
 */
import { promises as fs } from 'node:fs'
import * as path from 'node:path'

export type PackageManager = 'pnpm' | 'yarn' | 'npm' | 'bun' | 'unknown'

export interface Workspace {
  name: string
  dir: string
  scripts: Record<string, string>
}

export interface ProjectProfile {
  root: string
  packageManager: PackageManager
  /** Version from `packageManager:` if present — the most reliable source there is. */
  packageManagerVersion?: string
  nodeVersion?: string
  isMonorepo: boolean
  workspaces: Workspace[]
  frameworks: string[]
  languages: string[]
  /** Commands an agent should run to validate its own work, in the order to run them. */
  qualityGate: string[]
  /** Detected but unverified — the CLI prints these as suggestions, not facts. */
  notes: string[]
}

async function readJson(p: string): Promise<Record<string, any> | null> {
  try {
    return JSON.parse(await fs.readFile(p, 'utf8'))
  } catch {
    return null
  }
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function detectPackageManager(
  root: string,
  pkg: Record<string, any> | null,
): Promise<{ pm: PackageManager; version?: string }> {
  // `packageManager:` is authoritative when present — it is what corepack enforces.
  const declared = typeof pkg?.['packageManager'] === 'string' ? pkg['packageManager'] : null
  if (declared) {
    const [name, version] = declared.split('@')
    if (name === 'pnpm' || name === 'yarn' || name === 'npm' || name === 'bun') {
      return { pm: name, ...(version ? { version } : {}) }
    }
  }
  // Lockfiles are the next most reliable signal.
  if (await exists(path.join(root, 'pnpm-lock.yaml'))) return { pm: 'pnpm' }
  if (await exists(path.join(root, 'bun.lockb'))) return { pm: 'bun' }
  if (await exists(path.join(root, 'yarn.lock'))) return { pm: 'yarn' }
  if (await exists(path.join(root, 'package-lock.json'))) return { pm: 'npm' }
  return { pm: 'unknown' }
}

const FRAMEWORK_MARKERS: Array<[string, string]> = [
  ['next', 'Next.js'], ['react', 'React'], ['vue', 'Vue'], ['svelte', 'Svelte'],
  ['@angular/core', 'Angular'], ['solid-js', 'Solid'], ['astro', 'Astro'],
  ['express', 'Express'], ['fastify', 'Fastify'], ['@nestjs/core', 'NestJS'],
  ['vitest', 'Vitest'], ['jest', 'Jest'], ['mocha', 'Mocha'],
  ['@playwright/test', 'Playwright'], ['cypress', 'Cypress'],
  ['tailwindcss', 'Tailwind CSS'], ['redux', 'Redux'], ['@reduxjs/toolkit', 'Redux Toolkit'],
  ['graphql', 'GraphQL'], ['prisma', 'Prisma'], ['drizzle-orm', 'Drizzle'],
]

/**
 * Pick the commands an agent should run before declaring work finished.
 *
 * Preference order matters: a repo-wide script beats a per-workspace one, because an agent
 * that only validates the package it touched will miss the type error it caused elsewhere.
 */
function deriveQualityGate(pm: PackageManager, scripts: Record<string, string>): string[] {
  const runner = pm === 'unknown' ? 'npm run' : pm === 'npm' ? 'npm run' : `${pm} run`
  const gate: string[] = []

  const pick = (...candidates: string[]): string | null =>
    candidates.find((c) => c in scripts) ?? null

  const test = pick('test', 'test:unit', 'vitest', 'jest')
  const lint = pick('lint', 'eslint', 'lint:check')
  const types = pick('typecheck', 'type-check', 'tsc', 'types')
  const build = pick('build')

  if (types) gate.push(`${runner} ${types}`)
  if (lint) gate.push(`${runner} ${lint}`)
  if (test) gate.push(`${runner} ${test}`)
  // Build is included only when nothing else validates correctness, since it is the slowest
  // signal and usually redundant once typecheck passes.
  if (gate.length === 0 && build) gate.push(`${runner} ${build}`)

  return gate
}

export async function detectProfile(root: string): Promise<ProjectProfile> {
  const notes: string[] = []
  const pkg = await readJson(path.join(root, 'package.json'))
  const { pm, version } = await detectPackageManager(root, pkg)

  // --- node version -------------------------------------------------------
  let nodeVersion: string | undefined
  try {
    nodeVersion = (await fs.readFile(path.join(root, '.nvmrc'), 'utf8')).trim()
  } catch {
    const engines = pkg?.['engines']?.['node']
    if (typeof engines === 'string') nodeVersion = engines
  }

  // --- workspaces ---------------------------------------------------------
  const workspaces: Workspace[] = []
  let isMonorepo = false

  const patterns: string[] = []
  if (Array.isArray(pkg?.['workspaces'])) patterns.push(...pkg['workspaces'])
  else if (Array.isArray(pkg?.['workspaces']?.['packages'])) patterns.push(...pkg['workspaces']['packages'])

  const pnpmWs = await fs.readFile(path.join(root, 'pnpm-workspace.yaml'), 'utf8').catch(() => null)
  if (pnpmWs) {
    for (const line of pnpmWs.split('\n')) {
      const m = /^\s*-\s*['"]?([^'"\n]+)['"]?\s*$/.exec(line)
      if (m?.[1]) patterns.push(m[1].trim())
    }
  }

  if (patterns.length > 0) {
    isMonorepo = true
    // Only the leading literal segment is expanded; deep glob expansion is not worth a
    // dependency when every real workspace layout is `<dir>/*`.
    for (const pattern of new Set(patterns)) {
      const base = pattern.split('/')[0]
      if (!base || base.includes('*')) continue
      const dir = path.join(root, base)
      let entries: string[] = []
      try {
        entries = (await fs.readdir(dir, { withFileTypes: true }))
          .filter((e) => e.isDirectory())
          .map((e) => e.name)
      } catch {
        continue
      }
      for (const entry of entries) {
        const wsPkg = await readJson(path.join(dir, entry, 'package.json'))
        if (!wsPkg) continue
        workspaces.push({
          name: String(wsPkg['name'] ?? `${base}/${entry}`),
          dir: path.join(base, entry),
          scripts: (wsPkg['scripts'] ?? {}) as Record<string, string>,
        })
      }
    }
  }

  // --- frameworks and languages ------------------------------------------
  const allDeps = {
    ...(pkg?.['dependencies'] ?? {}),
    ...(pkg?.['devDependencies'] ?? {}),
    ...Object.fromEntries(
      workspaces.flatMap(() => []),
    ),
  } as Record<string, string>

  const frameworks = FRAMEWORK_MARKERS.filter(([dep]) => dep in allDeps).map(([, name]) => name)

  const languages: string[] = []
  if (pkg) languages.push('JavaScript')
  if (await exists(path.join(root, 'tsconfig.json'))) languages.push('TypeScript')
  for (const [file, lang] of [
    ['pyproject.toml', 'Python'], ['requirements.txt', 'Python'],
    ['go.mod', 'Go'], ['Cargo.toml', 'Rust'],
    ['pom.xml', 'Java'], ['build.gradle', 'Java'], ['build.gradle.kts', 'Kotlin'],
    ['Gemfile', 'Ruby'],
  ] as const) {
    if (await exists(path.join(root, file))) languages.push(lang)
  }

  const scripts = (pkg?.['scripts'] ?? {}) as Record<string, string>
  const qualityGate = deriveQualityGate(pm, scripts)

  if (pm === 'unknown' && pkg) {
    notes.push(
      'No lockfile or packageManager field found — an agent will not know which package manager to use.',
    )
  }
  if (qualityGate.length === 0 && pkg) {
    notes.push(
      'No test/lint/typecheck scripts detected. Agents have no way to verify their own work; add them to package.json or set qualityGate manually.',
    )
  }
  if (isMonorepo && workspaces.length === 0) {
    notes.push('Workspace patterns declared but no packages resolved — check the glob patterns.')
  }

  return {
    root,
    packageManager: pm,
    ...(version ? { packageManagerVersion: version } : {}),
    ...(nodeVersion ? { nodeVersion } : {}),
    isMonorepo,
    workspaces: workspaces.sort((a, b) => a.name.localeCompare(b.name)),
    frameworks: [...new Set(frameworks)].sort(),
    languages: [...new Set(languages)].sort(),
    qualityGate,
    notes,
  }
}

/** Render a profile as the markdown block that goes into generated instructions. */
export function renderProfile(p: ProjectProfile): string {
  const lines: string[] = ['## Project toolchain', '']
  const install =
    p.packageManager === 'unknown'
      ? null
      : p.packageManager === 'pnpm'
        ? 'pnpm install --frozen-lockfile'
        : p.packageManager === 'yarn'
          ? 'yarn install --immutable'
          : p.packageManager === 'bun'
            ? 'bun install --frozen-lockfile'
            : 'npm ci'

  if (install) lines.push(`- **Install:** \`${install}\``)
  if (p.packageManagerVersion) {
    lines.push(`- **Package manager:** ${p.packageManager}@${p.packageManagerVersion} — do not use any other`)
  } else if (p.packageManager !== 'unknown') {
    lines.push(`- **Package manager:** ${p.packageManager} — do not use any other`)
  }
  if (p.nodeVersion) lines.push(`- **Node:** ${p.nodeVersion}`)
  if (p.languages.length) lines.push(`- **Languages:** ${p.languages.join(', ')}`)
  if (p.frameworks.length) lines.push(`- **Stack:** ${p.frameworks.join(', ')}`)
  if (p.isMonorepo) {
    lines.push(`- **Monorepo:** ${p.workspaces.length} workspace(s): ${p.workspaces.map((w) => w.name).join(', ')}`)
  }
  if (p.qualityGate.length) {
    lines.push('', '**Before finalising any change, run all of these and fix every failure:**', '', '```bash')
    lines.push(...p.qualityGate)
    lines.push('```')
  }
  return lines.join('\n') + '\n'
}
