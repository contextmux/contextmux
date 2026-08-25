/**
 * `ctxmux eval` and `ctxmux add`.
 *
 * `eval` is tested up to the point where it would run agents; `add` is tested against a local
 * pack directory, which is the form that needs no network.
 */
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { addCommand, resolveSpec } from '../src/commands/add.js'
import { evalCommand } from '../src/commands/eval.js'
import {
  argv,
  exists,
  list,
  makeRepo,
  read,
  removeRepo,
  runCli,
  useIsolatedEnv,
  writeAll,
} from './helpers.js'

useIsolatedEnv()

let root: string
beforeEach(async () => {
  root = await makeRepo({ 'package.json': JSON.stringify({ name: 'fixture' }) })
})
afterEach(() => removeRepo(root))

describe('eval', () => {
  it('says what to type when given nothing', async () => {
    const { code, text } = await runCli(evalCommand, argv(root, 'eval'))

    expect(code).toBe(1)
    expect(text).toContain('Nothing to evaluate')
    expect(text).toContain('--agents')
  })

  it('reports every agent it could not configure, rather than one', async () => {
    /*
     * `--agents all` exists for convenience, so one unconfigurable vendor must not block a
     * comparison between the ones that are configured — and when none can be configured, the
     * reason for each is what the user needs.
     *
     * A token is stubbed so the credential lookup does not shell out to `gh` and read whatever
     * login the machine happens to have. What is being tested is the missing *repository*.
     */
    vi.stubEnv('GITHUB_TOKEN', 'stub-token-for-test')

    const { code, text } = await runCli(
      evalCommand,
      argv(root, 'eval add a currency formatting helper --agents copilot'),
    )

    expect(code).toBe(1)
    expect(text).toContain('None of the requested agents could be configured')
    expect(text).toContain('copilot')
    expect(text).toContain('No repository configured')
  })

  it('skips a vendor with no credentials rather than crashing the comparison', async () => {
    /*
     * `resolveClient` throws a `GitHubApiError`, and the skip path only caught `ConfigError` —
     * so the single most likely condition, no login and no token, took the whole command down
     * instead of comparing the agents that were configured.
     */
    vi.stubEnv('GITHUB_TOKEN', undefined)
    vi.stubEnv('PATH', '/nonexistent')

    const { code, text } = await runCli(
      evalCommand,
      argv(root, 'eval add a currency formatting helper --agents copilot'),
    )

    expect(code).toBe(1)
    expect(text).toContain('None of the requested agents could be configured')
    expect(text).toMatch(/credentials|gh auth login|not installed/)
  })

  it('reports an unknown agent by name', async () => {
    const { code, text } = await runCli(
      evalCommand,
      argv(root, 'eval something --agents windsurf'),
    )

    expect(code).toBe(1)
    expect(text).toContain('windsurf')
  })
})

describe('pack specs', () => {
  it('accepts the forms people actually type', () => {
    expect(resolveSpec('owner/repo')).toMatchObject({
      kind: 'git',
      url: 'https://github.com/owner/repo.git',
      name: 'repo',
    })
    expect(resolveSpec('github:owner/repo')).toMatchObject({ kind: 'git', name: 'repo' })
    expect(resolveSpec('https://gitlab.com/o/thing.git')).toMatchObject({
      kind: 'git',
      name: 'thing',
    })
    expect(resolveSpec('./local-pack')).toMatchObject({ kind: 'local', name: 'local-pack' })
  })

  it('says it cannot tell rather than guessing', () => {
    expect(() => resolveSpec('not a location')).toThrow(/Cannot work out where/)
  })
})

describe('add', () => {
  /** A pack laid out the way a real one is, in a directory rather than a repository. */
  async function localPack(files: Record<string, string>): Promise<string> {
    const dir = path.join(root, 'a-pack')
    for (const [rel, content] of Object.entries(files)) {
      const abs = path.join(dir, rel)
      await fs.mkdir(path.dirname(abs), { recursive: true })
      await fs.writeFile(abs, content, 'utf8')
    }
    return dir
  }

  const SKILL = [
    '---',
    'name: minimal-code',
    'description: Use before writing anything new — climb the ladder first.',
    '---',
    '',
    'Prefer what already exists.',
    '',
  ].join('\n')

  it('says how to install one when none are', async () => {
    const { code, text } = await runCli(addCommand, argv(root, 'add'))

    expect(code).toBe(0)
    expect(text).toContain('No packs installed')
    expect(text).toContain('ctxmux add')
  })

  it('installs a local pack and records where it came from', async () => {
    const dir = await localPack({ 'skills/minimal-code/SKILL.md': SKILL, LICENSE: 'MIT License\n' })

    const { code, text } = await runCli(addCommand, argv(root, `add ${dir}`))

    expect(code).toBe(0)
    expect(await exists(root, '.ctxmux/skills/minimal-code/SKILL.md')).toBe(true)

    const installed = await read(root, '.ctxmux/skills/minimal-code/SKILL.md')
    // Attribution has to survive into the file itself, or a reader has to go looking.
    expect(installed).toContain('x-ctxmux-pack: a-pack')
    expect(installed).toContain('x-ctxmux-source')
    expect(text).toContain('MIT License')
  })

  it('lists what is installed, and where each came from', async () => {
    const dir = await localPack({ 'skills/minimal-code/SKILL.md': SKILL })
    await runCli(addCommand, argv(root, `add ${dir}`))

    const { code, text } = await runCli(addCommand, argv(root, 'add'))

    expect(code).toBe(0)
    expect(text).toContain('a-pack')
    expect(text).toContain('minimal-code')
  })

  it('writes nothing under --dry-run', async () => {
    const dir = await localPack({ 'skills/minimal-code/SKILL.md': SKILL })

    const { code, text } = await runCli(addCommand, argv(root, `add ${dir} --dry-run`))

    expect(code).toBe(0)
    expect(text).toContain('Would install')
    expect(await exists(root, '.ctxmux/skills/minimal-code/SKILL.md')).toBe(false)
  })

  it('leaves a skill you wrote alone, even when the names collide', async () => {
    const dir = await localPack({ 'skills/minimal-code/SKILL.md': SKILL })
    await writeAll(root, {
      '.ctxmux/skills/minimal-code/SKILL.md':
        '---\nname: minimal-code\ndescription: mine\n---\n\nMine.\n',
    })

    const { code, text } = await runCli(addCommand, argv(root, `add ${dir}`))

    expect(code).toBe(0)
    expect(text).toContain('Left alone')
    expect(await read(root, '.ctxmux/skills/minimal-code/SKILL.md')).toContain('Mine.')
  })

  it('refuses a skill name that would escape the skills directory, and says so', async () => {
    /*
     * A pack is content from somebody else's repository, and a skill's name becomes a
     * directory. `path.join` resolves `..` rather than rejecting it, so this used to write
     * outside the repository entirely — on the one command whose purpose is running someone
     * else's content.
     */
    const dir = await localPack({
      'skills/ok/SKILL.md': SKILL.replace('name: minimal-code', 'name: ../../../../evil'),
    })

    const { code, text } = await runCli(addCommand, argv(root, `add ${dir}`))

    expect(code).toBe(0)
    expect(text).toContain('Refused')
    expect(text).toContain('../../../../evil')
    // It fell back to the directory name, which cannot contain a separator.
    expect(await list(root, '.ctxmux/skills')).toEqual(['ok'])
    expect(await exists(root, '../evil')).toBe(false)
  })

  it('reports a pack with no skills in it', async () => {
    const dir = await localPack({ 'README.md': 'nothing here\n' })

    const { code, text } = await runCli(addCommand, argv(root, `add ${dir}`))

    expect(code).toBe(1)
    expect(text).toContain('No skills found')
  })

  it('reports a location that does not exist', async () => {
    const { code, text } = await runCli(addCommand, argv(root, 'add ./nowhere'))

    expect(code).toBe(1)
    expect(text).toContain('ENOENT')
  })
})
