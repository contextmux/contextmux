import { describe, expect, it } from 'vitest'
import { fakeTask } from '@contextmux/core'
import { Trajectory, type TrajectoryMeta } from '@contextmux/trajectory'
import {
  buildHandoff,
  estimateTokens,
  extractDeadEnds,
  HandoffTooLargeError,
  measureTiers,
  renderHandoff,
  summariseDiff,
  TIERS,
} from '../src/index.js'

const meta = (): TrajectoryMeta => ({
  runId: 'run-1', taskId: 'T-1', agentId: 'claude-code', round: 0, startedAt: Date.now(),
})

/** A trajectory of an agent that tried hard and got nowhere. */
function struggling(): Trajectory {
  const t = new Trajectory(meta())
  t.tool('Bash', { command: 'psql -c "\\dt"' }, { ok: false, error: 'connection refused', id: 'a' })
  t.resolveTool('a', false, 'connection refused')
  t.tool('Read', { file_path: 'src/db.ts' }, { files: ['src/db.ts'] })
  t.tool('Read', { file_path: 'config/database.yml' }, { files: ['config/database.yml'] })
  for (let i = 0; i < 3; i++) t.tool('Grep', { pattern: 'DATABASE_URL' })
  t.message('The codebase already has a connection helper in src/db.ts.')
  return t
}

describe('what gets ruled out', () => {
  it('records an explicit failure as a dead end', () => {
    const ends = extractDeadEnds(struggling())
    const failure = ends.find((e) => e.outcome.includes('connection refused'))
    expect(failure).toBeTruthy()
    expect(failure?.approach).toContain('Bash')
  })

  it('records repetition as a dead end even with no explicit error', () => {
    // The agent kept asking and kept not getting what it needed. It did not recognise that as
    // a failure, which is exactly why the next agent needs telling.
    const ends = extractDeadEnds(struggling())
    const repeated = ends.find((e) => e.outcome.includes('repeatedly'))
    expect(repeated?.attempts).toBe(3)
    expect(repeated?.approach).toContain('Grep')
  })

  it('does not treat an ordinary retry as a dead end', () => {
    const t = new Trajectory(meta())
    t.tool('Grep', { pattern: 'x' })
    t.tool('Grep', { pattern: 'x' })
    expect(extractDeadEnds(t)).toEqual([])
  })

  it('orders by how hard the agent pushed', () => {
    const ends = extractDeadEnds(struggling())
    expect(ends[0]!.attempts).toBeGreaterThanOrEqual(ends.at(-1)!.attempts)
  })
})

describe('summarising the change', () => {
  it('reports per-file counts rather than carrying the whole diff', () => {
    // The full diff is already on disk in the worktree the next agent inherits. Duplicating it
    // into the prompt is the "transfer everything" mistake in miniature.
    const diff = [
      '--- a/src/a.ts', '+++ b/src/a.ts', '+added one', '+added two', '-removed one',
      '--- a/src/b.ts', '+++ b/src/b.ts', '+added',
    ].join('\n')
    expect(summariseDiff(diff)).toBe('src/a.ts (+2/-1), src/b.ts (+1/-0)')
  })

  it('says so when nothing has changed', () => {
    expect(summariseDiff('')).toBe('no changes yet')
  })
})

describe('building a package', () => {
  const build = () =>
    buildHandoff({
      task: fakeTask({ id: 'T-1' }),
      trajectory: struggling(),
      reason: 'ran out of attempts',
      fromAgentId: 'claude-code',
      runId: 'run-1',
      round: 1,
      result: {
        status: 'failed',
        filesChanged: ['src/db.ts'],
        summary: 'Got partway, could not reach the database.',
        diff: '--- a/src/db.ts\n+++ b/src/db.ts\n+const x = 1',
        location: { branch: 'ctxmux/t-1', worktree: '/tmp/wt' },
      },
      gateOutcomes: [{ gate: 'quality-gate', verdict: 'reject', reason: 'pnpm test failed' }],
    })

  it('carries the task unchanged', () => {
    expect(build().task.id).toBe('T-1')
  })

  it('points at the existing work rather than describing it', () => {
    const pkg = build()
    expect(pkg.workspace.worktree).toBe('/tmp/wt')
    expect(pkg.workspace.filesChanged).toEqual(['src/db.ts'])
  })

  it('carries what has been ruled out', () => {
    expect(build().deadEnds.length).toBeGreaterThan(0)
  })

  it('carries the checks that must still pass', () => {
    expect(build().failedChecks[0]?.gate).toBe('quality-gate')
  })

  it('carries what was read, so the next agent need not re-read it', () => {
    expect(build().filesExamined).toContain('src/db.ts')
  })

  it('picks up observations about the codebase, not narration of intent', () => {
    expect(build().observations.join(' ')).toContain('already has a connection helper')
  })

  it('assigns every field a tier, so nothing escapes the ablation', () => {
    const pkg = build()
    // `suggestion` is genuinely optional — an agent that said nothing useful last has none.
    for (const key of Object.keys(TIERS).filter((k) => k !== 'suggestion')) {
      expect(pkg, key).toHaveProperty(key)
    }
  })

  it('carries what the previous agent thought should happen next', () => {
    expect(build().suggestion).toContain('already has a connection helper')
  })

  it('omits a suggestion when the agent said nothing useful', () => {
    const quiet = buildHandoff({
      task: fakeTask(),
      trajectory: new Trajectory(meta()),
      reason: 'crashed',
      fromAgentId: 'a',
      runId: 'r',
      round: 0,
    })
    expect(quiet.suggestion).toBeUndefined()
  })
})

describe('rendering at a tier', () => {
  const pkg = buildHandoff({
    task: fakeTask(),
    trajectory: struggling(),
    reason: 'gave up',
    fromAgentId: 'claude-code',
    runId: 'run-1',
    round: 1,
    result: { status: 'failed', filesChanged: ['src/db.ts'], summary: 'partway', diff: '' },
    gateOutcomes: [{ gate: 'quality-gate', verdict: 'reject', reason: 'tests failed' }],
  })

  it('none is a true control — no hint that anything came before', () => {
    // Without a control there is no way to tell whether a handoff helped or whether the second
    // agent would have succeeded anyway.
    const text = renderHandoff(pkg, { tier: 'none' })
    expect(text).not.toContain('another agent')
    expect(text).not.toContain('ruled out')
    expect(text).toContain(pkg.task.title)
  })

  it('essential gets the agent started and no more', () => {
    const text = renderHandoff(pkg, { tier: 'essential' })
    expect(text).toContain('Where the work is')
    expect(text).not.toContain('Already ruled out')
  })

  it('valuable adds the negative knowledge', () => {
    const text = renderHandoff(pkg, { tier: 'valuable' })
    expect(text).toContain('Already ruled out')
    expect(text).toContain('Do not repeat them')
    expect(text).not.toContain('Already examined')
  })

  it('optional adds everything', () => {
    expect(renderHandoff(pkg, { tier: 'optional' })).toContain('Already examined')
  })

  it('each tier is a superset of the one before', () => {
    const sizes = measureTiers(pkg).map((m) => m.chars)
    for (let i = 1; i < sizes.length; i++) {
      expect(sizes[i]!).toBeGreaterThanOrEqual(sizes[i - 1]!)
    }
  })

  it('tells the receiving agent not to revert work it did not criticise', () => {
    expect(renderHandoff(pkg, { tier: 'essential' })).toContain('do not revert')
  })
})

describe('measuring the tiers', () => {
  const pkg = buildHandoff({
    task: fakeTask(),
    trajectory: struggling(),
    reason: 'gave up',
    fromAgentId: 'a',
    runId: 'r',
    round: 1,
    result: { status: 'failed', filesChanged: [], summary: 's', diff: '' },
  })

  it('reports what each tier costs, so the question can be answered rather than asserted', () => {
    const measured = measureTiers(pkg)
    expect(measured.map((m) => m.tier)).toEqual(['none', 'essential', 'valuable', 'optional'])
    for (const m of measured) {
      expect(m.tokens).toBeGreaterThan(0)
      expect(m.tokens).toBe(estimateTokens(renderHandoff(pkg, { tier: m.tier })))
    }
  })

  it('stays far smaller than a transcript would be', () => {
    // The naive answer — replay the conversation — costs as much as the original attempt and
    // carries the reasoning that got the first agent stuck.
    const full = measureTiers(pkg).at(-1)!
    expect(full.tokens).toBeLessThan(2_000)
  })
})

describe('size cap', () => {
  const big = () =>
    buildHandoff({
      task: fakeTask({ body: 'x'.repeat(200) }),
      trajectory: struggling(),
      reason: 'gave up',
      fromAgentId: 'a',
      runId: 'r',
      round: 1,
      result: { status: 'failed', filesChanged: [], summary: 'y'.repeat(200), diff: '' },
    })

  it('drops the least necessary tier first rather than truncating', () => {
    // Truncating would cut whichever section happened to be last, which for a package whose
    // whole point is ordered necessity would be an odd way to choose.
    const capped = renderHandoff(big(), { tier: 'optional', maxChars: 900 })
    expect(capped).toContain('Task')
    expect(capped).not.toContain('Already examined')
    expect(capped.length).toBeLessThan(1_400)
  })

  it('leaves a rendering that already fits alone', () => {
    const uncapped = renderHandoff(big(), { tier: 'optional' })
    expect(renderHandoff(big(), { tier: 'optional', maxChars: uncapped.length })).toBe(uncapped)
  })

  it('refuses rather than returning a rendering over the cap', () => {
    // The essential sections cannot be dropped, so the cap cannot be met by dropping. Handing
    // the text back anyway would make `maxChars` a suggestion, and a caller that sized a prompt
    // budget around it would overrun without ever being told.
    expect(() => renderHandoff(big(), { tier: 'optional', maxChars: 100 })).toThrow(HandoffTooLargeError)
  })

  it('says by how much it missed, and carries the rendering it could not shrink', () => {
    let thrown: HandoffTooLargeError | undefined
    try {
      renderHandoff(big(), { tier: 'optional', maxChars: 100 })
    } catch (err) {
      thrown = err as HandoffTooLargeError
    }

    expect(thrown?.maxChars).toBe(100)
    expect(thrown?.chars).toBeGreaterThan(100)
    // A caller that would rather overrun than fail can still get what it asked for.
    expect(thrown?.text).toContain('Where the work is')
    expect(thrown?.text.length).toBe(thrown?.chars)
    expect(thrown?.message).toContain('100')
  })

  it('holds the control tier to the cap too', () => {
    // `none` renders the task alone and drops nothing, so the cap is either honoured here or
    // it is not a cap.
    expect(() => renderHandoff(big(), { tier: 'none', maxChars: 100 })).toThrow(HandoffTooLargeError)
    expect(renderHandoff(big(), { tier: 'none', maxChars: 10_000 })).toContain('Task')
  })
})

describe('diff summary regressions', () => {
  it('attributes a deleted file’s removals to the file that was deleted', () => {
    /*
     * A deletion names its file on the `---` line and writes `/dev/null` on the `+++` line, so
     * a parser watching only `+++ b/…` never opens an entry for it — and charged every removed
     * line to whichever file happened to come before it in the diff.
     */
    const diff = [
      'diff --git a/src/keep.ts b/src/keep.ts',
      '--- a/src/keep.ts',
      '+++ b/src/keep.ts',
      '+const a = 1',
      'diff --git a/src/gone.ts b/src/gone.ts',
      '--- a/src/gone.ts',
      '+++ /dev/null',
      '-const b = 2',
      '-const c = 3',
    ].join('\n')

    const summary = summariseDiff(diff)

    expect(summary).toContain('src/keep.ts (+1/-0)')
    expect(summary).toContain('src/gone.ts (+0/-2)')
  })

  it('attributes a new file’s additions to the new file', () => {
    const diff = ['--- /dev/null', '+++ b/src/new.ts', '+const a = 1', '+const b = 2'].join('\n')
    expect(summariseDiff(diff)).toBe('src/new.ts (+2/-0)')
  })
})

describe('a file appearing in more than one section', () => {
  it('adds the tallies rather than restarting them', () => {
    /*
     * `LocalRunner.diff()` concatenates the committed diff, the working-tree diff and each
     * untracked file, so a file the agent committed and then edited again heads two sections.
     * The second header reset the count, so thirty committed lines plus one working-tree edit
     * was handed on as "+1" — an invitation for the next agent to redo the work.
     */
    const concatenated = [
      '--- a/src/a.ts',
      '+++ b/src/a.ts',
      '+committed one',
      '+committed two',
      '+committed three',
      '--- a/src/a.ts',
      '+++ b/src/a.ts',
      '+working one',
    ].join('\n')

    expect(summariseDiff(concatenated)).toBe('src/a.ts (+4/-0)')
  })

  it('still keeps separate files separate', () => {
    const diff = [
      '--- a/src/a.ts', '+++ b/src/a.ts', '+one',
      '--- a/src/b.ts', '+++ b/src/b.ts', '+two', '-three',
    ].join('\n')

    expect(summariseDiff(diff)).toBe('src/a.ts (+1/-0), src/b.ts (+1/-1)')
  })
})
