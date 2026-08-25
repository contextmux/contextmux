import { promises as fs } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { detectProfile, renderProfile } from '../src/profile.js'

let dir: string
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ctxmux-profile-'))
})
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true })
})

async function write(rel: string, content: string): Promise<void> {
  const abs = path.join(dir, rel)
  await fs.mkdir(path.dirname(abs), { recursive: true })
  await fs.writeFile(abs, content, 'utf8')
}

const pkg = (o: object) => JSON.stringify(o, null, 2)

describe('package manager detection', () => {
  it('prefers the packageManager field, which is what corepack enforces', async () => {
    await write('package.json', pkg({ name: 'x', packageManager: 'pnpm@10.0.0' }))
    await write('package-lock.json', '{}') // deliberately contradictory
    const p = await detectProfile(dir)
    expect(p.packageManager).toBe('pnpm')
    expect(p.packageManagerVersion).toBe('10.0.0')
  })

  it('falls back to lockfiles', async () => {
    await write('package.json', pkg({ name: 'x' }))
    await write('yarn.lock', '')
    expect((await detectProfile(dir)).packageManager).toBe('yarn')
  })

  it('warns when it cannot tell, because an agent then guesses', async () => {
    await write('package.json', pkg({ name: 'x' }))
    const p = await detectProfile(dir)
    expect(p.packageManager).toBe('unknown')
    expect(p.notes.join(' ')).toMatch(/which package manager/)
  })
})

describe('quality gate derivation', () => {
  it('picks typecheck, lint and test in that order', async () => {
    await write(
      'package.json',
      pkg({ name: 'x', packageManager: 'pnpm@9.0.0', scripts: { test: 'vitest', lint: 'eslint .', typecheck: 'tsc' } }),
    )
    const p = await detectProfile(dir)
    expect(p.qualityGate).toEqual(['pnpm run typecheck', 'pnpm run lint', 'pnpm run test'])
  })

  it('uses the detected package manager, not a hardcoded one', async () => {
    await write('package.json', pkg({ name: 'x', scripts: { test: 'jest' } }))
    await write('bun.lockb', '')
    expect((await detectProfile(dir)).qualityGate).toEqual(['bun run test'])
  })

  it('falls back to build only when nothing verifies correctness', async () => {
    await write('package.json', pkg({ name: 'x', packageManager: 'npm@10.0.0', scripts: { build: 'tsc' } }))
    expect((await detectProfile(dir)).qualityGate).toEqual(['npm run build'])
  })

  it('warns when there is no way for an agent to verify its own work', async () => {
    await write('package.json', pkg({ name: 'x', packageManager: 'npm@10.0.0' }))
    expect((await detectProfile(dir)).notes.join(' ')).toMatch(/verify their own work/)
  })
})

describe('workspaces and stack', () => {
  it('resolves pnpm workspaces', async () => {
    await write('package.json', pkg({ name: 'root', packageManager: 'pnpm@9.0.0' }))
    await write('pnpm-workspace.yaml', "packages:\n  - 'packages/*'\n")
    await write('packages/a/package.json', pkg({ name: '@x/a', scripts: { test: 'vitest' } }))
    await write('packages/b/package.json', pkg({ name: '@x/b' }))
    const p = await detectProfile(dir)
    expect(p.isMonorepo).toBe(true)
    expect(p.workspaces.map((w) => w.name)).toEqual(['@x/a', '@x/b'])
  })

  it('resolves npm workspaces', async () => {
    await write('package.json', pkg({ name: 'root', packageManager: 'npm@10.0.0', workspaces: ['apps/*'] }))
    await write('apps/web/package.json', pkg({ name: 'web' }))
    expect((await detectProfile(dir)).workspaces.map((w) => w.name)).toEqual(['web'])
  })

  it('identifies frameworks and languages', async () => {
    await write(
      'package.json',
      pkg({ name: 'x', packageManager: 'pnpm@9.0.0', dependencies: { next: '1', react: '1' }, devDependencies: { vitest: '1' } }),
    )
    await write('tsconfig.json', '{}')
    const p = await detectProfile(dir)
    expect(p.frameworks).toEqual(expect.arrayContaining(['Next.js', 'React', 'Vitest']))
    expect(p.languages).toEqual(expect.arrayContaining(['TypeScript', 'JavaScript']))
  })

  it('detects non-JavaScript languages', async () => {
    await write('go.mod', 'module x')
    await write('Cargo.toml', '[package]')
    const p = await detectProfile(dir)
    expect(p.languages).toEqual(expect.arrayContaining(['Go', 'Rust']))
  })

  it('reads the node version from .nvmrc ahead of engines', async () => {
    await write('package.json', pkg({ name: 'x', engines: { node: '>=18' } }))
    await write('.nvmrc', '22.14.0\n')
    expect((await detectProfile(dir)).nodeVersion).toBe('22.14.0')
  })
})

describe('renderProfile', () => {
  it('emits the install command matching the detected manager', async () => {
    await write('package.json', pkg({ name: 'x', packageManager: 'pnpm@10.0.0', scripts: { test: 'vitest' } }))
    const out = renderProfile(await detectProfile(dir))
    expect(out).toContain('pnpm install --frozen-lockfile')
    expect(out).toContain('do not use any other')
    expect(out).toContain('pnpm run test')
  })

  it('produces something usable for a repo with no package.json', async () => {
    const out = renderProfile(await detectProfile(dir))
    expect(out).toContain('## Project toolchain')
  })
})
