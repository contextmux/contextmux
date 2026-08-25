import { describe, expect, it } from 'vitest'
import { FakeRunner } from '@contextmux/core'
import {
  actedOnUnresolvedError,
  allTalkNoAction,
  inspect,
  irreversibleWhileStruggling,
  ProgressMonitor,
  repeatedCall,
  stallFeedback,
  Trajectory,
  worstSeverity,
  writeBeforeRead,
  type TrajectoryMeta,
} from '../src/index.js'

const meta = (): TrajectoryMeta => ({
  runId: 'run-1',
  taskId: 'T-1',
  agentId: 'a',
  round: 0,
  startedAt: Date.now(),
})

describe('repeated calls', () => {
  it('spots an agent retrying the identical call', () => {
    // The commonest way an agent gets stuck: a result surprises it, it does not update its
    // model of the world, and it tries again verbatim.
    const t = new Trajectory(meta())
    for (let i = 0; i < 3; i++) t.tool('Grep', { pattern: 'findUser' })

    const smell = repeatedCall().inspect(t)
    expect(smell?.name).toBe('repeated-call')
    expect(smell?.detail).toContain('3 times')
    expect(smell?.advice).toContain('Change the approach')
  })

  it('ignores a retry that the agent has since moved on from', () => {
    // An early retry followed by progress is an agent recovering, which is what we want.
    const t = new Trajectory(meta())
    for (let i = 0; i < 3; i++) t.tool('Grep', { pattern: 'findUser' })
    for (let i = 0; i < 15; i++) t.tool('Read', { file_path: `f${i}.ts` })

    expect(repeatedCall().inspect(t)).toBeNull()
  })

  it('does not fire on similar calls with different arguments', () => {
    const t = new Trajectory(meta())
    t.tool('Grep', { pattern: 'a' })
    t.tool('Grep', { pattern: 'b' })
    t.tool('Grep', { pattern: 'c' })
    expect(repeatedCall().inspect(t)).toBeNull()
  })
})

describe('writing without reading', () => {
  it('flags a change to a file the agent never looked at', () => {
    // Modifying a file whose contents it has not seen is a guess, and a wrong guess silently
    // drops whatever was there.
    const t = new Trajectory(meta())
    const step = t.tool('Write', { file_path: 'src/a.ts' }, { files: ['src/a.ts'] })
    step.data!['existed'] = true

    const smell = writeBeforeRead().inspect(t)
    expect(smell?.detail).toContain('src/a.ts')
  })

  it('does not flag creating a new file', () => {
    // Creating a file is exactly "writing something you never read", and perfectly correct.
    const t = new Trajectory(meta())
    t.tool('Write', { file_path: 'src/new.ts' }, { files: ['src/new.ts'] })
    expect(writeBeforeRead().inspect(t)).toBeNull()
  })

  it('does not flag a write that followed a read', () => {
    const t = new Trajectory(meta())
    t.tool('Read', { file_path: 'src/a.ts' }, { files: ['src/a.ts'] })
    const step = t.tool('Edit', { file_path: 'src/a.ts' }, { files: ['src/a.ts'] })
    step.data!['existed'] = true
    expect(writeBeforeRead().inspect(t)).toBeNull()
  })

  it('still flags a write that was only read afterwards', () => {
    // The order is the whole question. Reading a file at step 3 does not make the blind
    // overwrite at step 1 any less blind — but a Set of "files ever read" cannot tell the
    // difference, so this went unreported.
    const t = new Trajectory(meta())
    const step = t.tool('Write', { file_path: 'src/a.ts' }, { files: ['src/a.ts'] })
    step.data!['existed'] = true
    t.tool('Read', { file_path: 'src/a.ts' }, { files: ['src/a.ts'] })

    const smell = writeBeforeRead().inspect(t)
    expect(smell?.name).toBe('write-before-read')
    expect(smell?.detail).toContain('src/a.ts')
  })

  it('counts one step touching three unread files as one offence', () => {
    // Pushing the step once per file reported a step count as a file count and produced
    // evidence like [7, 7, 7], which points a reader at the same line three times.
    const t = new Trajectory(meta())
    const step = t.tool(
      'MultiEdit',
      { files: ['a.ts', 'b.ts', 'c.ts'] },
      { files: ['a.ts', 'b.ts', 'c.ts'] },
    )
    step.data!['existed'] = true

    const smell = writeBeforeRead().inspect(t)
    expect(smell?.detail).toContain('3 existing file(s)')
    expect(smell?.evidence).toEqual([step.seq])
  })
})

describe('acting on an unresolved error', () => {
  it('flags a failure followed straight by a change', () => {
    // The trajectory shape behind most confidently-wrong changes: it decided what the failure
    // meant without checking.
    const t = new Trajectory(meta())
    t.tool('Bash', { command: 'psql -c "select 1"' }, { ok: false, error: 'connection refused' })
    t.tool('Write', { file_path: 'src/db.ts' }, { files: ['src/db.ts'] })

    const smell = actedOnUnresolvedError().inspect(t)
    expect(smell?.detail).toContain('connection refused')
    expect(smell?.advice).toContain('verifying its interpretation')
  })

  it('does not flag a failure the agent investigated first', () => {
    const t = new Trajectory(meta())
    t.tool('Bash', { command: 'x' }, { ok: false, error: 'boom' })
    t.tool('Read', { file_path: 'config.ts' }, { files: ['config.ts'] })
    t.tool('Write', { file_path: 'src/db.ts' }, { files: ['src/db.ts'] })
    expect(actedOnUnresolvedError().inspect(t)).toBeNull()
  })

  it('does not flag a successful call followed by a change', () => {
    const t = new Trajectory(meta())
    t.tool('Bash', { command: 'x' }, { ok: true })
    t.tool('Write', { file_path: 'a.ts' }, { files: ['a.ts'] })
    expect(actedOnUnresolvedError().inspect(t)).toBeNull()
  })
})

describe('irreversible acts during a failing run', () => {
  it('blocks rather than warns, because the point is to stop it', () => {
    // Nothing here can be undone by restoring files, which is why the time-machine framing
    // fails and this one does not.
    const t = new Trajectory(meta())
    for (let i = 0; i < 3; i++) t.tool('Bash', { command: `attempt ${i}` }, { ok: false, error: 'failed' })
    t.tool('Bash', { command: 'pnpm migrate:deploy' })

    const smell = irreversibleWhileStruggling().inspect(t)
    expect(smell?.severity).toBe('block')
    expect(smell?.advice).toContain('human')
  })

  it.each([
    'run the database migration',
    'migrate the schema',
    'dropping the users table',
    'deploying to production',
    'publishing the package',
    'sending the invoices',
  ])('recognises %j as irreversible', (command) => {
    /*
     * The pattern was written as prefixes — `migrat`, `charge` — with a trailing `\b`, which
     * demands a non-word character next. No English word ends at "migrat", so the one detector
     * whose job is to stop unrecoverable work matched none of these.
     */
    const t = new Trajectory(meta())
    for (let i = 0; i < 3; i++) t.tool('Bash', { command: `attempt ${i}` }, { ok: false, error: 'failed' })
    t.tool('Bash', { command })

    expect(irreversibleWhileStruggling().inspect(t)?.severity).toBe('block')
  })

  it.each(['render a dropdown menu', 'a deployable artifact', 'update the senders list'])(
    'does not read %j as irreversible',
    (command) => {
      // Guards the obvious over-correction: matching any word *starting* with these stems
      // blocks runs over a dropdown component. This severity asks for a human, so a false
      // positive costs someone their afternoon.
      const t = new Trajectory(meta())
      for (let i = 0; i < 3; i++) t.tool('Bash', { command: `attempt ${i}` }, { ok: false, error: 'failed' })
      t.tool('Bash', { command })

      expect(irreversibleWhileStruggling().inspect(t)).toBeNull()
    },
  )

  it('says nothing about an irreversible act in a run going well', () => {
    // Running a migration is normal. Running one while thrashing is not.
    const t = new Trajectory(meta())
    t.tool('Read', { file_path: 'a.ts' }, { ok: true })
    t.tool('Bash', { command: 'pnpm migrate' }, { ok: true })
    expect(irreversibleWhileStruggling().inspect(t)).toBeNull()
  })
})

describe('deliberating instead of acting', () => {
  it('flags a run of messages with no tool call', () => {
    const t = new Trajectory(meta())
    t.tool('Read', { file_path: 'a.ts' })
    for (let i = 0; i < 5; i++) t.message(`considering option ${i}`)
    expect(allTalkNoAction().inspect(t)?.name).toBe('all-talk-no-action')
  })

  it('does not fire while the agent is still doing things', () => {
    const t = new Trajectory(meta())
    for (let i = 0; i < 5; i++) {
      t.message('thinking')
      t.tool('Read', { file_path: `f${i}.ts` })
    }
    expect(allTalkNoAction().inspect(t)).toBeNull()
  })
})

describe('reporting', () => {
  it('puts the most serious first, so a blocker is not buried', () => {
    const t = new Trajectory(meta())
    for (let i = 0; i < 3; i++) t.tool('Grep', { pattern: 'x' }, { ok: false, error: 'no match' })
    t.tool('Bash', { command: 'pnpm migrate:deploy' })

    const smells = inspect(t)
    expect(smells[0]?.severity).toBe('block')
    expect(worstSeverity(smells)).toBe('block')
  })

  it('reports nothing for a healthy trajectory', () => {
    const t = new Trajectory(meta())
    t.tool('Read', { file_path: 'a.ts' }, { ok: true, files: ['a.ts'] })
    t.tool('Edit', { file_path: 'a.ts' }, { ok: true, files: ['a.ts'] })
    expect(inspect(t)).toEqual([])
    expect(worstSeverity([])).toBeNull()
  })

  it('every smell says what to do about it', () => {
    // A finding with no advice is noise, and noise is what people learn to ignore.
    const t = new Trajectory(meta())
    for (let i = 0; i < 3; i++) t.tool('Grep', { pattern: 'x' })
    for (const smell of inspect(t)) {
      expect(smell.advice.length).toBeGreaterThan(20)
      expect(smell.evidence.length).toBeGreaterThan(0)
    }
  })
})

describe('the monitor', () => {
  const runnerReturning = (files: string[], diff: string) => new FakeRunner({ changedFiles: files, diff })

  it('does nothing while the workspace keeps changing', async () => {
    const t = new Trajectory(meta())
    const runner = runnerReturning(['a.ts'], 'one')
    const monitor = new ProgressMonitor({ runner, trajectory: t, stallAfterSamples: 2 })

    await monitor.sample()
    runner.setChangedFiles(['a.ts', 'b.ts'])
    expect(await monitor.sample()).toBeNull()
    expect(monitor.signal.aborted).toBe(false)
  })

  it('stops the agent once nothing has changed for long enough', async () => {
    // The recovery that works without owning the agent's loop: observe, then stop.
    const t = new Trajectory(meta())
    const monitor = new ProgressMonitor({
      runner: runnerReturning(['a.ts'], 'unchanged'),
      trajectory: t,
      stallAfterSamples: 2,
    })

    await monitor.sample()
    await monitor.sample()
    const verdict = await monitor.sample()

    expect(verdict?.stalled).toBe(true)
    expect(monitor.signal.aborted).toBe(true)
    expect(verdict?.needsHuman).toBe(false)
  })

  it('stops immediately on a blocking smell, without waiting out the stall window', async () => {
    const t = new Trajectory(meta())
    for (let i = 0; i < 3; i++) t.tool('Bash', { command: `x${i}` }, { ok: false, error: 'failed' })
    t.tool('Bash', { command: 'pnpm migrate:deploy' })

    const monitor = new ProgressMonitor({
      runner: runnerReturning(['a.ts'], 'x'),
      trajectory: t,
      stallAfterSamples: 99,
    })

    const verdict = await monitor.sample()
    expect(verdict?.needsHuman).toBe(true)
    expect(monitor.signal.aborted).toBe(true)
  })

  it('names what went wrong in the stall reason, not just that it stalled', async () => {
    // "The run timed out" tells an agent nothing it can use.
    const t = new Trajectory(meta())
    for (let i = 0; i < 3; i++) t.tool('Grep', { pattern: 'findUser' })

    const monitor = new ProgressMonitor({
      runner: runnerReturning(['a.ts'], 'unchanged'),
      trajectory: t,
      stallAfterSamples: 1,
    })
    await monitor.sample()
    const verdict = await monitor.sample()

    expect(verdict?.reason).toContain('identical arguments')
  })

  it('records its intervention in the trajectory', async () => {
    const t = new Trajectory(meta())
    const monitor = new ProgressMonitor({
      runner: runnerReturning([], ''),
      trajectory: t,
      stallAfterSamples: 1,
    })
    await monitor.sample()
    await monitor.sample()
    expect(t.of('intervention')).toHaveLength(1)
  })

  it('does not intervene twice', async () => {
    const t = new Trajectory(meta())
    const monitor = new ProgressMonitor({
      runner: runnerReturning([], ''),
      trajectory: t,
      stallAfterSamples: 1,
    })
    await monitor.sample()
    await monitor.sample()
    await monitor.sample()
    expect(t.of('intervention')).toHaveLength(1)
  })
})

describe('stall feedback', () => {
  it('tells the agent what to stop doing, not merely that it failed', () => {
    // Naming the failure is what makes the retry worth paying for.
    const t = new Trajectory(meta())
    for (let i = 0; i < 3; i++) t.tool('Grep', { pattern: 'findUser' })

    const feedback = stallFeedback(
      { stalled: true, reason: 'no progress', smells: inspect(t), needsHuman: false },
      1,
    )

    expect(feedback.source).toBe('recovery')
    expect(feedback.body).toContain('identical arguments')
    expect(feedback.body).toContain('different approach')
    expect(feedback.body).toContain('say so plainly')
  })
})
