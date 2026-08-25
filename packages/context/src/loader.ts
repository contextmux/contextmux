/**
 * Loads a `.ctxmux/` directory into the canonical model.
 *
 * Validation failures are collected rather than thrown one at a time — a user with six
 * malformed skills should learn about all six in one run, not discover them across six
 * invocations.
 */
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { z } from 'zod'
import { parseFrontmatter } from './frontmatter.js'
import { ContextError, type Diagnostic } from './errors.js'
import {
  AgentSchema,
  CommandSchema,
  ConfigSchema,
  ContextModelSchema,
  InstructionsSchema,
  literalEnvKeys,
  McpServerSchema,
  PROVENANCE_PREFIX,
  RuleSchema,
  SkillSchema,
  type Config,
  type LoadedContext,
} from './schema.js'

/**
 * Separate provenance keys from configuration.
 *
 * Anything under the reserved prefix is attribution written by a pack installer; everything
 * else has to satisfy the schema, so a typo in a real field still fails loudly.
 */
function splitProvenance(data: Record<string, unknown>): {
  fields: Record<string, unknown>
  provenance?: Record<string, string>
} {
  const fields: Record<string, unknown> = {}
  const provenance: Record<string, string> = {}

  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith(PROVENANCE_PREFIX)) {
      provenance[key.slice(PROVENANCE_PREFIX.length)] = String(value)
    } else {
      fields[key] = value
    }
  }

  return Object.keys(provenance).length > 0 ? { fields, provenance } : { fields }
}

async function readIfExists(p: string): Promise<string | null> {
  try {
    return await fs.readFile(p, 'utf8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
  }
}

async function listFiles(dir: string, ext = '.md'): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    return entries
      .filter((e) => e.isFile() && e.name.endsWith(ext) && !e.name.startsWith('.'))
      .map((e) => path.join(dir, e.name))
      .sort()
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw err
  }
}

async function listDirs(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    return entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
      .map((e) => path.join(dir, e.name))
      .sort()
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw err
  }
}

/** Turn a zod failure into diagnostics that name the field and say what to do. */
function zodDiagnostics(err: z.ZodError, file: string): Diagnostic[] {
  return err.issues.map((issue) => ({
    level: 'error' as const,
    file,
    message: `${issue.path.join('.') || '(root)'}: ${issue.message}`,
    hint:
      issue.code === 'unrecognized_keys'
        ? 'Unknown frontmatter keys are rejected so typos surface immediately.'
        : undefined,
  }))
}

export interface LoadOptions {
  /** Repo root. The source directory is resolved relative to this. */
  root?: string
  /** Overrides `config.sourceDir` — used by `import` when writing somewhere else. */
  sourceDir?: string
}

export async function loadConfig(root: string, sourceDir = '.ctxmux'): Promise<Config> {
  const dir = path.resolve(root, sourceDir)
  const jsonRaw = await readIfExists(path.join(dir, 'config.json'))
  if (jsonRaw) {
    let parsed: unknown
    try {
      parsed = JSON.parse(jsonRaw)
    } catch (err) {
      throw new ContextError('Invalid config.json', [
        {
          level: 'error',
          file: path.join(sourceDir, 'config.json'),
          message: (err as Error).message,
        },
      ])
    }
    const result = ConfigSchema.safeParse(parsed)
    if (!result.success) {
      throw new ContextError(
        'Invalid config.json',
        zodDiagnostics(result.error, path.join(sourceDir, 'config.json')),
      )
    }
    return { ...result.data, sourceDir }
  }
  return { ...ConfigSchema.parse({}), sourceDir }
}

export async function loadContext(opts: LoadOptions = {}): Promise<LoadedContext> {
  const root = path.resolve(opts.root ?? process.cwd())
  const config = await loadConfig(root, opts.sourceDir ?? '.ctxmux')
  const dir = path.resolve(root, config.sourceDir)
  const sources: string[] = []
  const diagnostics: Diagnostic[] = []

  const rel = (p: string) => path.relative(root, p)

  try {
    await fs.access(dir)
  } catch {
    throw new ContextError(`No context directory at ${config.sourceDir}/`, [
      {
        level: 'error',
        message: `${config.sourceDir}/ does not exist.`,
        hint: 'Run `ctxmux init` to scaffold one, or `ctxmux import` to build it from existing agent config files.',
      },
    ])
  }

  // --- instructions -------------------------------------------------------
  let instructions
  const instrPath = path.join(dir, 'instructions.md')
  const instrRaw = await readIfExists(instrPath)
  if (instrRaw !== null) {
    sources.push(instrPath)
    const { data, body } = parseFrontmatter(instrRaw, rel(instrPath))
    const result = InstructionsSchema.safeParse({ ...data, body })
    if (result.success) instructions = result.data
    else diagnostics.push(...zodDiagnostics(result.error, rel(instrPath)))
  }

  // --- rules --------------------------------------------------------------
  const rules = []
  for (const file of await listFiles(path.join(dir, 'rules'))) {
    sources.push(file)
    const raw = await fs.readFile(file, 'utf8')
    const { data, body } = parseFrontmatter(raw, rel(file))
    const fallbackName = path.basename(file, '.md')
    const { fields, provenance } = splitProvenance(data)
    const result = RuleSchema.safeParse({
      name: fallbackName,
      ...fields,
      ...(provenance ? { provenance } : {}),
      body,
    })
    if (result.success) rules.push(result.data)
    else diagnostics.push(...zodDiagnostics(result.error, rel(file)))
  }

  // --- skills (directory-per-skill, so resources can be bundled) ----------
  const skills = []
  for (const skillDir of await listDirs(path.join(dir, 'skills'))) {
    const file = path.join(skillDir, 'SKILL.md')
    const raw = await readIfExists(file)
    if (raw === null) {
      diagnostics.push({
        level: 'warning',
        file: rel(skillDir),
        message: 'skill directory has no SKILL.md — ignored',
        hint: `Create ${path.join(rel(skillDir), 'SKILL.md')} or remove the directory.`,
      })
      continue
    }
    sources.push(file)
    const { data, body } = parseFrontmatter(raw, rel(file))
    const fallbackName = path.basename(skillDir)

    // Bundled resources are discovered, not declared, so authors cannot forget to list them.
    const discovered: string[] = []
    for (const sub of ['references', 'scripts', 'assets']) {
      for (const f of await listFiles(path.join(skillDir, sub), '')) {
        discovered.push(path.relative(skillDir, f))
      }
    }

    const { fields, provenance } = splitProvenance(data)
    const result = SkillSchema.safeParse({
      name: fallbackName,
      ...fields,
      ...(provenance ? { provenance } : {}),
      resources: discovered.sort(),
      body,
    })
    if (result.success) skills.push(result.data)
    else diagnostics.push(...zodDiagnostics(result.error, rel(file)))
  }

  // --- agents -------------------------------------------------------------
  const agents = []
  for (const file of await listFiles(path.join(dir, 'agents'))) {
    sources.push(file)
    const raw = await fs.readFile(file, 'utf8')
    const { data, body } = parseFrontmatter(raw, rel(file))
    const fallbackName = path.basename(file, '.md').replace(/\.agent$/, '')
    const result = AgentSchema.safeParse({ name: fallbackName, ...data, body })
    if (result.success) agents.push(result.data)
    else diagnostics.push(...zodDiagnostics(result.error, rel(file)))
  }

  // --- commands -----------------------------------------------------------
  const commands = []
  for (const file of await listFiles(path.join(dir, 'commands'))) {
    sources.push(file)
    const raw = await fs.readFile(file, 'utf8')
    const { data, body } = parseFrontmatter(raw, rel(file))
    const fallbackName = path.basename(file, '.md')
    const result = CommandSchema.safeParse({ name: fallbackName, ...data, body })
    if (result.success) commands.push(result.data)
    else diagnostics.push(...zodDiagnostics(result.error, rel(file)))
  }

  // --- mcp ----------------------------------------------------------------
  const mcp = []
  const mcpPath = path.join(dir, 'mcp.json')
  const mcpRaw = await readIfExists(mcpPath)
  if (mcpRaw !== null) {
    sources.push(mcpPath)
    let parsed: unknown
    try {
      parsed = JSON.parse(mcpRaw)
    } catch (err) {
      diagnostics.push({ level: 'error', file: rel(mcpPath), message: (err as Error).message })
      parsed = null
    }
    if (parsed && typeof parsed === 'object') {
      // Accept both `{ servers: {...} }` and a bare `{...}` map, since both are common
      // in the wild and rejecting one is a pointless papercut.
      const record = (parsed as Record<string, unknown>)
      const servers = (record['servers'] ?? record['mcpServers'] ?? record) as Record<string, unknown>
      for (const [name, value] of Object.entries(servers)) {
        if (!value || typeof value !== 'object') continue
        const result = McpServerSchema.safeParse({ name, ...(value as object) })
        if (!result.success) {
          diagnostics.push(...zodDiagnostics(result.error, rel(mcpPath)))
          continue
        }
        mcp.push(result.data)

        /*
         * A value here rather than a reference to one.
         *
         * This file compiles out to four more, one of which is a document written to be read
         * in a pull request — so a credential put here does not sit in one place, it is copied
         * into five. Warned rather than rejected so an existing repository still loads, and
         * only the *key* is named: repeating the value would put it in the terminal too.
         */
        const literals = literalEnvKeys(result.data.env)
        if (literals.length > 0) {
          diagnostics.push({
            level: 'warning',
            file: rel(mcpPath),
            message: `mcp server "${name}" has literal env value(s) for ${literals.join(', ')}`,
            hint: `Use a reference instead — "${literals[0]}": "\${${literals[0]}}" — so the value stays out of every generated file.`,
          })
        }
      }
    }
  }

  // --- duplicate names ----------------------------------------------------
  for (const [kind, items] of Object.entries({ rules, skills, agents, commands })) {
    const seen = new Map<string, number>()
    for (const item of items as Array<{ name: string }>) {
      seen.set(item.name, (seen.get(item.name) ?? 0) + 1)
    }
    for (const [name, count] of seen) {
      if (count > 1) {
        diagnostics.push({
          level: 'error',
          message: `duplicate ${kind.slice(0, -1)} name "${name}" (${count} definitions)`,
          hint: 'Names become filenames in compiled output, so they must be unique.',
        })
      }
    }
  }

  const errors = diagnostics.filter((d) => d.level === 'error')
  if (errors.length > 0) {
    throw new ContextError(`${errors.length} problem(s) in ${config.sourceDir}/`, diagnostics)
  }

  const model = ContextModelSchema.parse({
    instructions,
    rules,
    skills,
    agents,
    commands,
    mcp,
  })

  return { model, config, root, sources, warnings: diagnostics.filter((d) => d.level === 'warning') }
}
