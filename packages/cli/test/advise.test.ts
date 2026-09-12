/**
 * `ctxmux advise`.
 *
 * The contract worth protecting is that it never fails the build — suggestions are not errors,
 * and a command that exits non-zero over a thin skill description is one people stop running.
 * `check` is the command that exits non-zero.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { adviseCommand } from '../src/commands/advise.js'
import { argv, initGit, makeRepo, MINIMAL_CONTEXT, removeRepo, runCli, writeAll } from './helpers.js'

const BROKEN: Record<string, string> = {
  '.ctxmux/config.json': JSON.stringify({ targets: ['claude', 'copilot'] }),
  '.ctxmux/rules/dead.md': [
    '---',
    'name: dead',
    'globs: ["lib/**/*.ts"]',
    'targets: ["cursor"]',
    '---',
    '',
    'Always mirror the shape in src/gone.ts when adding a handler.',
    '',
  ].join('\n'),
}

let root: string
beforeEach(async () => {
  root = await makeRepo(MINIMAL_CONTEXT)
})
afterEach(() => removeRepo(root))

describe('advise', () => {
  it('says so plainly when there is nothing to report', async () => {
    await initGit(root)
    const { code, text } = await runCli(adviseCommand, argv(root, 'advise'))

    expect(code).toBe(0)
    expect(text).toContain('Nothing to say')
  })

  it('still exits zero when it finds things, because suggestions are not failures', async () => {
    await writeAll(root, BROKEN)
    await initGit(root)
    const { code, text } = await runCli(adviseCommand, argv(root, 'advise'))

    expect(code).toBe(0)
    expect(text).toContain('rules/dead')
  })

  it('groups by severity, leading with what does not work', async () => {
    await writeAll(root, BROKEN)
    await initGit(root)
    const { text } = await runCli(adviseCommand, argv(root, 'advise'))

    expect(text).toContain('Does not work')
    expect(text.indexOf('Does not work')).toBeLessThan(text.indexOf('Probably not what you meant'))
  })

  it('checks globs and paths once there is a file list to check them against', async () => {
    await writeAll(root, BROKEN)
    await initGit(root)
    const { text } = await runCli(adviseCommand, argv(root, 'advise'))

    expect(text).toContain('lib/**/*.ts')
    expect(text).toContain('src/gone.ts')
  })

  it('admits which checks it could not run outside a git repository', async () => {
    await writeAll(root, BROKEN)
    // No initGit. A clean-looking report would be misleading here, so it has to say why.
    const { code, text } = await runCli(adviseCommand, argv(root, 'advise'))

    expect(code).toBe(0)
    expect(text).toContain('Not a git repository')
    expect(text).not.toContain('lib/**/*.ts')
  })

  it('says the same thing on a clean model with no git, rather than staying silent about it', async () => {
    const { text } = await runCli(adviseCommand, argv(root, 'advise'))

    expect(text).toContain('Nothing to say')
    expect(text).toContain('Not a git repository')
  })

  it('emits parseable json and nothing else on --json', async () => {
    await writeAll(root, BROKEN)
    await initGit(root)
    const { code, text } = await runCli(adviseCommand, argv(root, 'advise --json'))

    expect(code).toBe(0)
    const parsed = JSON.parse(text)
    expect(parsed.findings.length).toBeGreaterThan(0)
    expect(parsed.findings[0]).toHaveProperty('check')
    expect(parsed.checked).toContain('rule')
  })
})
