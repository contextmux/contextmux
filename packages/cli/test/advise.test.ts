/**
 * `ctxmux advise`.
 *
 * The contract worth protecting is that it never fails the build — suggestions are not errors,
 * and a command that exits non-zero over a thin skill description is one people stop running.
 * `check` is the command that exits non-zero.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { adviseCommand, judgeFor, withJudge } from '../src/commands/advise.js'
import { CLAUDE_SPEC } from '@contextmux/agent-claude'
import { CODEX_SPEC } from '@contextmux/agent-codex'
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

describe('which agent answers', () => {
  it('uses the agent this repository configured, not a fixed one', () => {
    // The spec's own id, which is not always the name used in config.
    expect(judgeFor('codex', undefined).id).toBe(CODEX_SPEC.id)
    expect(judgeFor('claude', undefined).id).toBe(CLAUDE_SPEC.id)
    expect(CODEX_SPEC.id).not.toBe(CLAUDE_SPEC.id)
  })

  it('refuses rather than quietly substituting a different vendor', () => {
    // A repository set up for Copilot used to spend Claude credits without saying so.
    expect(() => judgeFor('copilot', undefined)).toThrow(/copilot cannot be asked a question/)
  })

  it('says why Copilot in particular cannot, since it is not a gap that will be filled', () => {
    expect(() => judgeFor('copilot', undefined)).toThrow(/opens pull requests/)
  })

  it('refuses an agent that can only be asked by also letting it edit', () => {
    // Cursor has no documented way to run without approvals.
    expect(() => judgeFor('cursor', undefined)).toThrow(/without also being allowed to edit/)
  })

  it('names the agents that can, so the error carries its own fix', () => {
    expect(() => judgeFor('copilot', undefined)).toThrow(/claude, codex/)
  })

  it('falls back to claude when no agent was configured at all', () => {
    expect(judgeFor(undefined, undefined).id).toBe(CLAUDE_SPEC.id)
  })
})

describe('advise --depth', () => {
  const ctx = { depth: 'single' as const, context: { targets: ['claude'] as const, sampleFiles: [] } }
  const empty = { rules: [], skills: [], agents: [], commands: [], mcp: [] } as never
  /** A model with something in it. An empty one never reaches the judge at all. */
  const oneRule = {
    rules: [{ name: 'a', globs: [], alwaysApply: false, priority: 50, body: 'Some rule body here.' }],
    skills: [], agents: [], commands: [], mcp: [],
  } as never
  const staticFindings = [
    { check: 'empty-body', severity: 'error' as const, where: 'rules/a', message: 'm', fix: 'f' },
  ]

  /** Capture what a call prints, for things that are not commands returning an exit code. */
  async function capture<T>(fn: () => Promise<T>): Promise<{ value: T; text: string }> {
    const lines: string[] = []
    const collect = (...parts: unknown[]) => void lines.push(parts.map(String).join(' '))
    const log = vi.spyOn(console, 'log').mockImplementation(collect)
    const err = vi.spyOn(console, 'error').mockImplementation(collect)
    try {
      return { value: await fn(), text: lines.join('\n') }
    } finally {
      log.mockRestore()
      err.mockRestore()
    }
  }

  it('reads the agent out of config, which is the whole point of configuring one', async () => {
    // Unit-testing judgeFor alone left this wiring uncovered, and the wiring is the bug that
    // was reported: a Copilot repository silently spending Claude credits.
    await writeAll(root, {
      '.ctxmux/config.json': JSON.stringify({ targets: ['claude'], agent: 'copilot' }),
    })
    await initGit(root)

    await expect(runCli(adviseCommand, argv(root, 'advise --depth single'))).rejects.toThrow(
      /copilot cannot be asked a question/,
    )
  })

  it('lets --agent override what config says', async () => {
    await writeAll(root, {
      '.ctxmux/config.json': JSON.stringify({ targets: ['claude'], agent: 'copilot' }),
    })
    await initGit(root)

    // Reaches the agent rather than the refusal — it fails on the missing binary instead.
    const { code, text } = await runCli(adviseCommand, argv(root, 'advise --depth single --agent codex'))

    expect(code).toBe(0)
    expect(text).not.toContain('cannot be asked a question')
  })

  it('refuses a depth it does not have, rather than guessing one', async () => {
    await expect(runCli(adviseCommand, argv(root, 'advise --depth deep'))).rejects.toThrow(
      /static, single or panel/,
    )
  })

  it('keeps the free findings when the judge cannot be reached', async () => {
    const dead = { id: 'dead', ask: () => Promise.reject(new Error('claude could not be started')) }
    const { value, text } = await capture(() => withJudge(staticFindings, oneRule, dead, ctx))

    expect(value).toEqual(staticFindings)
    expect(text).toContain('did not run')
    expect(text).toContain('could not be started')
  })

  it('does not reach the judge at all when there is nothing to judge', async () => {
    let called = false
    const judge = { id: 'fake', ask: async () => ((called = true), '{"findings":[]}') }
    await capture(() => withJudge(staticFindings, empty, judge, ctx))

    expect(called).toBe(false)
  })

  it('adds what the judge found to what was already known', async () => {
    const judge = {
      id: 'fake',
      ask: async () =>
        JSON.stringify({
          findings: [{ where: 'rules/a', criterion: 'checkable', message: 'm2', fix: 'f2' }],
        }),
    }
    const { value } = await capture(() => withJudge(staticFindings, oneRule, judge, ctx))

    expect(value).toHaveLength(2)
    expect(value.map((f) => f.check)).toContain('checkable')
  })

  it('never lets a judge produce an error, only a suggestion', async () => {
    const judge = {
      id: 'fake',
      ask: async () =>
        JSON.stringify({
          findings: [{ where: 'rules/a', criterion: 'checkable', message: 'm', fix: 'f' }],
        }),
    }
    const { value } = await capture(() => withJudge([], oneRule, judge, ctx))

    expect(value.every((f) => f.severity === 'suggestion')).toBe(true)
  })
})
