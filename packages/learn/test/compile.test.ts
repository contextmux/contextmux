/**
 * The skill compiler.
 *
 * Two questions decide whether this produces anything trustworthy: did the run actually
 * succeed, and what exactly is being compiled. The tests below are mostly about those.
 */
import { describe, expect, it } from 'vitest'
import { Trajectory, type TrajectoryMeta } from '@contextmux/trajectory'
import type { ContextModel } from '@contextmux/context'
import type { GateOutcome } from '@contextmux/core'
import {
  findApproaches,
  isExemplary,
  moveOf,
  proposeApproaches,
  shapeOf,
  toExemplar,
  type Exemplar,
} from '../src/index.js'

const meta = (): TrajectoryMeta => ({
  runId: 'r', taskId: 'T', agentId: 'claude-code', round: 0, startedAt: Date.now(),
})

/** A trajectory of an agent doing it properly: look, change, check. */
function goodRun(): Trajectory {
  const t = new Trajectory(meta())
  t.tool('Read', { file_path: 'src/a.ts' }, { ok: true, files: ['src/a.ts'] })
  t.tool('Read', { file_path: 'test/a.test.ts' }, { ok: true, files: ['test/a.test.ts'] })
  t.tool('Edit', { file_path: 'src/a.ts' }, { ok: true, files: ['src/a.ts'] })
  t.tool('Bash', { command: 'pnpm test' }, { ok: true })
  return t
}

const cleanRun = { state: 'in_review', feedbackRound: 0, attempt: 0, gateOutcomes: [] as GateOutcome[] }

describe('deciding a run is worth learning from', () => {
  it('accepts a clean first-time success', () => {
    expect(isExemplary(cleanRun, goodRun()).ok).toBe(true)
  })

  it('rejects one that needed correcting', () => {
    // Reaching review after three corrections shows the corrections worked. It says nothing
    // about the approach, which is the thing being extracted.
    const out = isExemplary({ ...cleanRun, feedbackRound: 2 }, goodRun())
    expect(out.ok).toBe(false)
    expect(out.reasons.join(' ')).toContain('2 correction round(s)')
  })

  it('rejects one that needed a second attempt', () => {
    expect(isExemplary({ ...cleanRun, attempt: 1 }, goodRun()).ok).toBe(false)
  })

  it('rejects one with a failing gate', () => {
    const out = isExemplary(
      { ...cleanRun, gateOutcomes: [{ gate: 'quality-gate', verdict: 'reject', reason: 'x' }] },
      goodRun(),
    )
    expect(out.reasons.join(' ')).toContain('quality-gate')
  })

  it('rejects one that passed every gate but got there badly', () => {
    // A run can satisfy every check and still show an agent thrashing.
    const messy = new Trajectory(meta())
    for (let i = 0; i < 3; i++) messy.tool('Grep', { pattern: 'x' }, { ok: true })
    messy.tool('Edit', { file_path: 'a.ts' }, { ok: true })
    const out = isExemplary(cleanRun, messy)
    expect(out.ok).toBe(false)
    expect(out.reasons.join(' ')).toContain('repeated-call')
  })

  it('rejects one that did almost nothing', () => {
    const trivial = new Trajectory(meta())
    trivial.tool('Edit', { file_path: 'a.ts' }, { ok: true })
    expect(isExemplary(cleanRun, trivial).ok).toBe(false)
  })

  it('rejects a run that did not reach review', () => {
    expect(isExemplary({ ...cleanRun, state: 'escalated' }, goodRun()).ok).toBe(false)
  })
})

describe('classifying moves', () => {
  const step = (t: Trajectory) => t.all.at(-1)!

  it('treats reading and searching as the same move', () => {
    // `Read`, `Grep` and `Glob` are all finding out what is there. A shape in vendor tool
    // names would neither recur across agents nor mean anything to a reader.
    const t = new Trajectory(meta())
    t.tool('Read', { file_path: 'a.ts' })
    expect(moveOf(step(t))).toBe('explore')
    t.tool('Grep', { pattern: 'x' })
    expect(moveOf(step(t))).toBe('explore')
  })

  it.each([
    ['grep -n "test" src/a.ts', 'explore'],
    ['cat src/foo.test.ts', 'explore'],
    ['head -50 src/spec.ts', 'explore'],
    ['rg "lint" src/', 'explore'],
  ])('reads %j as exploration, not verification', (command, expected) => {
    /*
     * A shell step's summary is the command line, and the whole of it was tested for a verify
     * word — so grepping for "test", or reading `foo.test.ts`, counted as running the tests.
     * Reading a test is how an agent works out what is expected of it, and counting that as
     * checking inverts the shape a successful approach appears to have.
     */
    const t = new Trajectory(meta())
    t.tool('Bash', { command })
    expect(moveOf(step(t))).toBe(expected)
  })

  it.each([
    ['npm run lint', 'verify'],
    ['npm run typecheck', 'verify'],
    ['vitest run', 'verify'],
    ['pytest -q', 'verify'],
  ])('still reads %j as verification', (command, expected) => {
    // The leading token decides only when it is itself a read command; `npm` is not one.
    const t = new Trajectory(meta())
    t.tool('Bash', { command })
    expect(moveOf(step(t))).toBe(expected)
  })

  it.each([
    ['git status', 'explore'],
    ['git log --oneline', 'explore'],
    ['mkdir -p build', 'run'],
  ])('reads %j as %s', (command, expected) => {
    const t = new Trajectory(meta())
    t.tool('Bash', { command })
    expect(moveOf(step(t))).toBe(expected)
  })

  it('recognises running the project’s checks as verification', () => {
    // Distinguishing this from an arbitrary command is what lets "verify before finishing"
    // emerge as a pattern at all.
    const t = new Trajectory(meta())
    t.tool('Bash', { command: 'pnpm test' })
    expect(moveOf(step(t))).toBe('verify')
    t.tool('Bash', { command: 'pnpm run typecheck' })
    expect(moveOf(step(t))).toBe('verify')
  })

  it('separates an arbitrary command from verification', () => {
    const t = new Trajectory(meta())
    t.tool('Bash', { command: 'git status' })
    expect(moveOf(step(t))).toBe('explore')
    t.tool('Bash', { command: 'mkdir -p build' })
    expect(moveOf(step(t))).toBe('run')
  })

  it('treats an edit as a change', () => {
    const t = new Trajectory(meta())
    t.tool('Edit', { file_path: 'a.ts' })
    expect(moveOf(step(t))).toBe('change')
  })
})

describe('the shape of a run', () => {
  it('collapses runs of the same move', () => {
    // Three reads and seven reads are the same approach. Keeping counts would split one
    // pattern into a dozen that each occur once.
    expect(shapeOf(goodRun())).toEqual(['explore', 'change', 'verify'])
  })

  it('ignores anything that is not a tool call', () => {
    const t = goodRun()
    t.message('thinking out loud')
    t.observe(['a.ts'], 'd')
    expect(shapeOf(t)).toEqual(['explore', 'change', 'verify'])
  })
})

describe('finding approaches that keep working', () => {
  const exemplar = (taskId: string, shape: string[], text = 'add a helper'): Exemplar => ({
    taskId, runId: `run-${taskId}`, taskText: text, shape: shape as never, files: [], at: Date.now(),
  })

  it('needs a shape to have worked across several tasks', () => {
    const found = findApproaches([
      exemplar('T-1', ['explore', 'change', 'verify']),
      exemplar('T-2', ['explore', 'change', 'verify']),
      exemplar('T-3', ['explore', 'change', 'verify']),
    ])
    expect(found).toHaveLength(1)
    expect(found[0]?.taskCount).toBe(3)
  })

  it('ignores one that only worked twice', () => {
    const found = findApproaches([
      exemplar('T-1', ['explore', 'change', 'verify']),
      exemplar('T-2', ['explore', 'change', 'verify']),
    ])
    expect(found).toEqual([])
  })

  it('does not blur two different approaches together', () => {
    // Unlike prose, two differing sequences are two approaches. Merging them would describe
    // neither.
    const found = findApproaches([
      ...['T-1', 'T-2', 'T-3'].map((t) => exemplar(t, ['explore', 'change', 'verify'])),
      ...['T-4', 'T-5', 'T-6'].map((t) => exemplar(t, ['change', 'verify'])),
    ])
    expect(found).toHaveLength(2)
  })

  it('ignores a shape too short to describe anything', () => {
    expect(findApproaches(['T-1', 'T-2', 'T-3'].map((t) => exemplar(t, ['change'])))).toEqual([])
  })

  it('works out what the tasks had in common', () => {
    const found = findApproaches([
      exemplar('T-1', ['explore', 'change', 'verify'], 'add a selector for the roster'),
      exemplar('T-2', ['explore', 'change', 'verify'], 'add a selector for the lineup'),
      exemplar('T-3', ['explore', 'change', 'verify'], 'add a selector for events'),
    ])
    expect(found[0]?.commonTerms).toContain('selector')
  })

  it('gives the same shape the same id every time', () => {
    const build = () =>
      findApproaches(['T-1', 'T-2', 'T-3'].map((t) => exemplar(t, ['explore', 'change', 'verify'])))
    expect(build()[0]?.id).toBe(build()[0]?.id)
  })
})

describe('proposing a skill', () => {
  const empty: ContextModel = { rules: [], skills: [], agents: [], commands: [], mcp: [] }
  const patterns = () =>
    findApproaches(
      ['T-1', 'T-2', 'T-3'].map((taskId) => ({
        taskId, runId: `r-${taskId}`, taskText: 'add a selector', at: Date.now(), files: [],
        shape: ['explore', 'change', 'verify'] as never,
      })),
    )

  it('describes the approach in words, not tool calls', () => {
    // Compiling to a script assumes the variation was noise — but if it were noise, nobody
    // would have needed an agent.
    const [proposal] = proposeApproaches(patterns(), empty)
    expect(proposal?.content).toContain('Read the code you are about to change')
    expect(proposal?.content).toContain("Run the project's own checks")
    expect(proposal?.content).not.toContain('Bash')
  })

  it('says it is evidence rather than a procedure', () => {
    // A skill that reads as a procedure invites an agent to follow it where it does not fit.
    const [proposal] = proposeApproaches(patterns(), empty)
    expect(proposal?.content).toContain('evidence, not a procedure')
    expect(proposal?.content).toContain('do the different thing')
  })

  it('says how much evidence there is', () => {
    const [proposal] = proposeApproaches(patterns(), empty)
    expect(proposal?.content).toContain('3 tasks')
    expect(proposal?.taskCount).toBe(3)
  })

  it('names when to reach for it', () => {
    const [proposal] = proposeApproaches(patterns(), empty)
    expect(proposal?.content).toContain('description:')
    expect(proposal?.content).toContain('without needing correction')
  })

  it('cites the runs it came from', () => {
    const [proposal] = proposeApproaches(patterns(), empty)
    expect(proposal?.evidence).toHaveLength(3)
    expect(proposal?.evidence[0]?.source).toBe('succeeded first time')
  })

  it('does not propose something an existing skill already says', () => {
    // A skill repeating an existing one is not an addition, it is dilution.
    const covered: ContextModel = {
      ...empty,
      skills: [
        {
          name: 'work-carefully',
          description: 'How to approach a change.',
          globs: [],
          resources: [],
          body: 'Read the code you are about to change, and whatever tests it. Make the change. Run the project\'s own checks and fix what they report.',
        },
      ],
    }
    expect(proposeApproaches(patterns(), covered)).toEqual([])
  })
})

describe('building an exemplar', () => {
  it('reduces a run to what the compiler needs', () => {
    const e = toExemplar({
      taskId: 'T-1',
      runId: 'run-T-1',
      taskText: 'add a helper',
      trajectory: goodRun(),
      files: ['src/a.ts'],
    })
    expect(e.shape).toEqual(['explore', 'change', 'verify'])
    expect(e.taskId).toBe('T-1')
  })
})

describe('classification, the cases that were wrong first', () => {
  const move = (name: string, args: unknown) => {
    const t = new Trajectory(meta())
    t.tool(name, args)
    return moveOf(t.all.at(-1)!)
  }

  it('treats reading a test file as exploring, not verifying', () => {
    // Matching "test" anywhere classifies reading `a.test.ts` as verification, when reading a
    // test is how an agent works out what is expected of it.
    expect(move('Read', { file_path: 'test/a.test.ts' })).toBe('explore')
    expect(move('Read', { file_path: 'src/thing.spec.ts' })).toBe('explore')
  })

  it('treats a read-only shell command as exploring, not changing', () => {
    // A shell can mutate even when this invocation does not.
    expect(move('Bash', { command: 'git status' })).toBe('explore')
    expect(move('Bash', { command: 'git diff HEAD' })).toBe('explore')
    expect(move('Bash', { command: 'ls -la src' })).toBe('explore')
  })

  it('does not mistake building for checking', () => {
    // `build` in the verify list would classify `mkdir -p build` as verification.
    expect(move('Bash', { command: 'mkdir -p build' })).toBe('run')
  })

  it('still recognises the project’s checks', () => {
    for (const command of ['pnpm test', 'npm run lint', 'pytest -q', 'cargo check']) {
      expect(move('Bash', { command }), command).toBe('verify')
    }
  })
})
