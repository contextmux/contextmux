/**
 * `ctxmux run` — up to, but never past, the point where it would cost something.
 *
 * `--dry-run` is the seam. It exercises everything that is free — resolving the task, the
 * gates, the worktree, assembling the prompt — and stops before dispatch. That covers most of
 * the command, and the alternative (a real agent) is neither hermetic nor free.
 */
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runCommand } from '../src/commands/run.js'
import {
  argv,
  exists,
  initGit,
  initGitWithoutCommit,
  makeRepo,
  removeRepo,
  runCli,
  runCliExpectingThrow,
  useIsolatedEnv,
  writeAll,
} from './helpers.js'

useIsolatedEnv()

let root: string

const TASK = [
  '---',
  'id: T-1',
  'title: Add a currency formatter',
  'status: todo',
  '---',
  '',
  'Add a helper that formats a number as a currency string for display.',
  '',
  '## Acceptance criteria',
  '',
  '- Formats a number with two decimal places',
  '- Has a test',
  '',
].join('\n')

/** Worktrees git still knows about for this repository. */
async function worktreesLeft(): Promise<string[]> {
  return fs.readdir(path.join(root, '.git', 'worktrees')).catch(() => [] as string[])
}

beforeEach(async () => {
  root = await makeRepo({
    'package.json': JSON.stringify({ name: 'fixture', packageManager: 'pnpm@9.0.0' }),
    'src/index.ts': 'export const x = 1\n',
    '.ctxmux/tasks/T-1.md': TASK,
  })
  await initGit(root)
})
afterEach(() => removeRepo(root))

describe('run', () => {
  it('says what to type when given nothing', async () => {
    const { code, text } = await runCli(runCommand, argv(root, 'run'))

    expect(code).toBe(1)
    expect(text).toContain('Nothing to run')
    expect(text).toContain('ctxmux run T-1')
  })

  it('reports the plan before spending anything', async () => {
    const { code, text } = await runCli(runCommand, argv(root, 'run T-1 --dry-run'))

    expect(code).toBe(0)
    expect(text).toContain('Task T-1')
    expect(text).toContain('Add a currency formatter')
    expect(text).toContain('2 acceptance criteri')
    expect(text).toContain('gates:')
    expect(text).toContain('nothing will be dispatched')
  })

  it('stops at the gates rather than inventing a result', async () => {
    /*
     * A dry run that fabricated a change fed a synthetic filename through the verify gates,
     * failed path-scope, drove a correction loop and ended in a fake escalation — confident,
     * detailed and entirely untrue.
     */
    const { code, text } = await runCli(runCommand, argv(root, 'run T-1 --dry-run'))

    expect(code).toBe(0)
    expect(text).toContain('gates passed and the prompt was assembled')
    expect(text).not.toContain('escalated')
  })

  it('shows the prompt it would send under --verbose', async () => {
    const { text } = await runCli(runCommand, argv(root, 'run T-1 --dry-run --verbose'))

    expect(text).toContain('prompt preview')
    expect(text).toContain('Add a currency formatter')
  })

  it('rejects a task too thin to act on, and says what is missing', async () => {
    // A vague task does not produce a vague change; it produces a confident change that solves
    // the wrong problem and costs more to review than it would have cost to write.
    await writeAll(root, { '.ctxmux/tasks/T-2.md': '---\nid: T-2\ntitle: Fix it\n---\n\nBroken.\n' })

    const { code, text } = await runCli(runCommand, argv(root, 'run T-2 --dry-run'))

    expect(code).toBe(3)
    expect(text).toContain('readiness')
    expect(text).toContain('Acceptance criteria')
  })

  it('rejects a task that should have been split', async () => {
    await writeAll(root, {
      '.ctxmux/tasks/T-3.md': [
        '---',
        'id: T-3',
        'title: Rewrite and migrate the billing module',
        'estimate: 8',
        '---',
        '',
        'A large refactor of everything to do with billing, migrating the old schema.',
        '',
        '## Acceptance criteria',
        '',
        '- It all works',
        '',
      ].join('\n'),
    })

    const { code, text } = await runCli(runCommand, argv(root, 'run T-3 --dry-run'))

    expect(code).toBe(3)
    expect(text).toContain('complexity')
    expect(text).toContain('Split this into smaller tasks')
  })

  it('treats a bare sentence as an ad-hoc task', async () => {
    // The fastest way to try the tool on something real, so it must not require a task file.
    const sentence =
      'add a helper that formats a number as a currency string for display, ' +
      'with two decimal places and a thousands separator'

    const { code, text } = await runCli(runCommand, argv(root, `run ${sentence} --dry-run`))

    expect(code).toBe(0)
    expect(text).toContain('ad-hoc task')
    expect(text).toContain('gates passed')
  })

  it('still refuses a typed task with essentially nothing in it', async () => {
    /*
     * The readiness bar is lower for something typed at the prompt — the person is still there
     * and can retype it — but it is not absent. "fix it" names no behaviour at all.
     */
    const { code, text } = await runCli(runCommand, argv(root, 'run fix it --dry-run'))

    expect(code).toBe(3)
    expect(text).toContain('readiness')
  })

  it('still demands acceptance criteria from a task file', async () => {
    // A ticket is written by someone else, hours ago, and they are not there to be asked. That
    // is the situation the gate exists for, and it is unchanged.
    await writeAll(root, {
      '.ctxmux/tasks/T-4.md': [
        '---',
        'id: T-4',
        'title: Improve the checkout flow',
        '---',
        '',
        'The checkout flow should be improved so that it works better for everyone using it.',
        '',
      ].join('\n'),
    })

    const { code, text } = await runCli(runCommand, argv(root, 'run T-4 --dry-run'))

    expect(code).toBe(3)
    expect(text).toContain('no acceptance criteria found')
  })

  it('works in an isolated worktree, not your checkout', async () => {
    const { text } = await runCli(runCommand, argv(root, 'run T-1 --dry-run'))

    expect(text).toContain('isolated worktree')
    expect(text).not.toContain('running in your working tree')
  })

  it('says plainly when it is not isolating', async () => {
    // Someone who asked for no isolation should be told, every time — an agent editing your
    // own checkout is not a detail to bury.
    const { text } = await runCli(runCommand, argv(root, 'run T-1 --dry-run --no-isolate'))

    expect(text).toContain('running in your working tree')
  })

  it('leaves no worktree behind when the run produced nothing', async () => {
    // Every dry run used to leak a checkout and a branch that nothing ever collected.
    await runCli(runCommand, argv(root, 'run T-1 --dry-run'))

    expect(await worktreesLeft()).toEqual([])
  })

  it('leaves no worktree behind when the command throws', async () => {
    /*
     * The cleanup used to sit on the happy path, below everything that could fail — so the runs
     * that leaked were the ones that went wrong, which is both the common case and the one
     * nobody thinks to check. `--max-rounds` is validated after the worktree exists, so a
     * mistyped value reaches it.
     */
    await runCliExpectingThrow(runCommand, argv(root, 'run T-1 --dry-run --max-rounds abc'))

    expect(await worktreesLeft()).toEqual([])
  })

  it('leaves no worktree behind when the task is rejected before dispatch', async () => {
    await writeAll(root, { '.ctxmux/tasks/T-5.md': '---\nid: T-5\ntitle: x\n---\n\nThin.\n' })

    const { code } = await runCli(runCommand, argv(root, 'run T-5 --dry-run'))

    expect(code).toBe(3)
    expect(await worktreesLeft()).toEqual([])
  })

  it('reports having no gates as a warning, not silence', async () => {
    const { code, text } = await runCli(runCommand, argv(root, 'run T-1 --dry-run --no-gates'))

    expect(code).toBe(0)
    expect(text).toContain('gates: none')
  })

  it('narrows the scope it was given', async () => {
    const { text } = await runCli(
      runCommand,
      argv(root, 'run T-1 --dry-run --verbose --allow src/**'),
    )

    expect(text).toContain('src/**')
  })

  it('refuses a numeric flag that is not a number', async () => {
    /*
     * `Number('abc')` is `NaN`, which compares false against everything — so this did not fail,
     * it turned the limit off. `--max-rounds` is the worst of them: `round > NaN` is false
     * forever, which is a correction loop with no exit that pays for an agent every time round.
     */
    for (const flag of ['--max-files abc', '--max-rounds abc', '--stall-after abc']) {
      const err = await runCliExpectingThrow(runCommand, argv(root, `run T-1 --dry-run ${flag}`))
      expect(err.message, flag).toMatch(/must be a number/)
    }
  })

  it('refuses a correction limit outside anything sensible', async () => {
    const err = await runCliExpectingThrow(runCommand, argv(root, 'run T-1 --dry-run --max-rounds 500'))
    expect(err.message).toMatch(/at most 20/)
  })

  it('reports an unknown agent by name, with the valid ones', async () => {
    const { code, text } = await runCli(runCommand, argv(root, 'run T-1 --dry-run --agent windsurf'))

    expect(code).toBe(1)
    expect(text).toContain('Unknown agent "windsurf"')
    expect(text).toContain('claude')
  })

  it('records no trace for a run that never dispatched', async () => {
    await runCli(runCommand, argv(root, 'run T-1 --dry-run'))

    expect(await exists(root, '.ctxmux/state/traces')).toBe(false)
  })
})

describe('isolation', () => {
  it('refuses to work in your checkout when isolation was wanted and unavailable', async () => {
    /*
     * A warning was not enough. Isolation is the default, so not getting it is not something
     * anyone chose — and the message scrolls past seconds before a paid agent starts rewriting
     * files. The case that reaches here most often is a repository with no commits, which is
     * exactly when there is no way to undo what the agent does.
     */
    const fresh = await makeRepo({
      'package.json': JSON.stringify({ name: 'fixture' }),
      '.ctxmux/tasks/T-1.md': TASK,
    })
    try {
      // A git repository, but with nothing committed — so there is nothing to branch from.
      await initGitWithoutCommit(fresh)

      const { code, text } = await runCli(runCommand, argv(fresh, 'run T-1 --dry-run'))

      expect(code).toBe(1)
      expect(text).toContain('Refusing to run an agent in your working tree')
      expect(text).toContain('--no-isolate')
    } finally {
      await removeRepo(fresh)
    }
  })

  it('proceeds when the user says so', async () => {
    const fresh = await makeRepo({
      'package.json': JSON.stringify({ name: 'fixture' }),
      '.ctxmux/tasks/T-1.md': TASK,
    })
    try {
      await initGitWithoutCommit(fresh)

      const { code, text } = await runCli(runCommand, argv(fresh, 'run T-1 --dry-run --no-isolate'))

      expect(code).toBe(0)
      expect(text).toContain('running in your working tree')
    } finally {
      await removeRepo(fresh)
    }
  })

  it('says nothing about it when isolation worked', async () => {
    const { text } = await runCli(runCommand, argv(root, 'run T-1 --dry-run'))

    expect(text).toContain('isolated worktree')
    expect(text).not.toContain('Refusing to run')
  })
})

describe('--json', () => {
  it('prints one parseable object and nothing else on stdout', async () => {
    /*
     * The GitHub Action used to grep the human report for phrases like "needs a human". Every
     * message reworded for clarity broke a workflow silently, and nothing failed loudly enough
     * to notice. Machine mode has to be machine-only, or it is not a contract.
     */
    const { code, lines } = await runCli(runCommand, argv(root, 'run T-1 --dry-run --json'))

    expect(code).toBe(0)
    expect(lines).toHaveLength(1)

    const summary = JSON.parse(lines[0]!) as Record<string, unknown>
    expect(summary['taskId']).toBe('T-1')
    expect(summary['state']).toBe('ready')
    expect(summary['ok']).toBe(false)
  })

  it('reports the gate verdicts, so a workflow can say why', async () => {
    await writeAll(root, { '.ctxmux/tasks/T-2.md': '---\nid: T-2\ntitle: Fix it\n---\n\nBroken.\n' })

    const { code, lines } = await runCli(runCommand, argv(root, 'run T-2 --dry-run --json'))
    const summary = JSON.parse(lines[0]!) as {
      state: string
      exitCode: number
      gates: Array<{ gate: string; verdict: string; reason?: string }>
    }

    expect(code).toBe(3)
    expect(summary.state).toBe('rejected')
    expect(summary.exitCode).toBe(3)

    const readiness = summary.gates.find((g) => g.gate === 'readiness')
    expect(readiness?.verdict).toBe('reject')
    expect(readiness?.reason).toContain('acceptance criteria')
  })

  it('agrees with the exit code the human path returns', async () => {
    // Two ways of saying the same thing that could drift apart. They share one function.
    const human = await runCli(runCommand, argv(root, 'run T-1 --dry-run'))
    const machine = await runCli(runCommand, argv(root, 'run T-1 --dry-run --json'))

    expect(machine.code).toBe(human.code)
    expect((JSON.parse(machine.lines[0]!) as { exitCode: number }).exitCode).toBe(human.code)
  })
})

describe('--minimal', () => {
  it('leaves the minimalism gates off by default', async () => {
    /*
     * They were exported, tested, and documented in the README as gates you get — and no
     * command ever added them. A check that cannot fire is worse than none, because the run
     * still reports which gates it ran.
     */
    const { text } = await runCli(runCommand, argv(root, 'run T-1 --dry-run'))

    expect(text).toContain('gates:')
    expect(text).not.toContain('no-unrequested-dependencies')
  })

  it('adds all three when asked', async () => {
    const { code, text } = await runCli(runCommand, argv(root, 'run T-1 --dry-run --minimal'))

    expect(code).toBe(0)
    expect(text).toContain('no-unrequested-dependencies')
    expect(text).toContain('no-speculative-abstraction')
    expect(text).toContain('no-duplicate-symbols')
  })

  it('reports them in the json summary too', async () => {
    const { lines } = await runCli(runCommand, argv(root, 'run T-1 --dry-run --minimal --json'))
    const summary = JSON.parse(lines[0]!) as { gates: Array<{ gate: string }> }

    // Preflight gates only, at a dry run — the verify ones have nothing to check yet.
    expect(summary.gates.map((g) => g.gate)).toContain('readiness')
  })
})

describe('a tracker that cannot answer', () => {
  /*
   * `.invalid` is reserved and never resolves, so this fails at DNS instantly and identically
   * offline — it exercises the transport error path without depending on a network.
   */
  const unreachableJira = () => {
    vi.stubEnv('JIRA_URL', 'https://ctxmux-test.invalid')
    vi.stubEnv('JIRA_EMAIL', 'a@b.c')
    vi.stubEnv('JIRA_API_TOKEN', 'not-a-real-token')
  }

  it('reports why the tracker failed instead of inventing a task', async () => {
    /*
     * The lookup was `.catch(() => null)`, which folded an expired token, an unreachable host
     * and a 500 into the same "not found" as a genuine miss — and then made up a task from the
     * argument. Asking for ABC-1234 with a stale Jira token produced a five-character task
     * called "ABC-1234", which readiness rejected for having no description: a real error
     * reported as a badly written ticket, with the cause thrown away.
     */
    unreachableJira()
    const { code, text } = await runCli(runCommand, argv(root, 'run ABC-1 --tracker jira --dry-run'))

    expect(code).toBe(1)
    expect(text).toMatch(/Could not read "ABC-1" from the jira tracker/)
    expect(text).not.toMatch(/ad-hoc/)
    // The specific wrong outcome: readiness complaining about a five-character description.
    expect(text).not.toMatch(/readiness/)
  })

  it('still treats a bare sentence as a task for the file tracker', async () => {
    // The ad-hoc path is what makes the tool quick to try, and naming no tracker means the
    // default one — so this must keep working.
    const { code, text } = await runCli(
      runCommand,
      argv(root, 'run "add a currency formatter that handles negatives" --dry-run'),
    )

    expect(text).toMatch(/ad-hoc/)
    expect(code).toBe(0)
  })
})
