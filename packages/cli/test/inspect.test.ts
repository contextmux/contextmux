/**
 * The commands that read a finished run: `status`, `trace`, `handoff`.
 *
 * All three work off recorded state, so they are exercised by writing that state directly.
 * That is also the honest shape of the test — these commands never run an agent.
 */
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { statusCommand } from '../src/commands/run.js'
import { traceCommand } from '../src/commands/trace.js'
import { handoffCommand } from '../src/commands/handoff.js'
import { argv, makeRepo, removeRepo, runCli, runCliExpectingThrow } from './helpers.js'

let root: string
beforeEach(async () => {
  root = await makeRepo()
})
afterEach(() => removeRepo(root))

/** A recorded run, in the shape the store writes. */
async function recordRun(over: Record<string, unknown> = {}): Promise<string> {
  const run = {
    id: 'run-T-1',
    task: { id: 'T-1', title: 'Add a currency formatter', body: '', acceptanceCriteria: [], scope: { allow: [], deny: [] }, qualityGate: [], origin: { tracker: 'file', id: 'T-1' }, labels: [] },
    state: 'in_review',
    attempt: 0,
    feedbackRound: 0,
    policy: { maxFeedbackRounds: 2, maxAttempts: 2, selfCorrect: true },
    history: [],
    gateOutcomes: [],
    result: { status: 'succeeded', filesChanged: ['src/money.ts'], summary: 'Added it.', diff: '--- a/src/money.ts\n+++ b/src/money.ts\n+export const x = 1\n' },
    ...over,
  }
  const dir = path.join(root, '.ctxmux', 'state', 'runs')
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, `${encodeURIComponent(run.id as string)}.json`), JSON.stringify(run), 'utf8')
  return run.id as string
}

/** A recorded trajectory, in the shape `ctxmux run` writes. */
async function recordTrace(runId: string, steps: unknown[]): Promise<void> {
  const dir = path.join(root, '.ctxmux', 'state', 'traces')
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(
    path.join(dir, `${encodeURIComponent(runId)}.json`),
    JSON.stringify({
      meta: { runId, taskId: 'T-1', agentId: 'claude-code', round: 0, startedAt: 1_000 },
      steps,
      dropped: 0,
    }),
    'utf8',
  )
}

const toolStep = (seq: number, name: string, summary: string, data: Record<string, unknown> = {}) => ({
  seq,
  at: 1_000 + seq * 1_000,
  kind: 'tool',
  name,
  summary,
  data: { mutating: false, signature: `sig-${name}-${summary}`, ...data },
})

describe('status', () => {
  it('says so when nothing has been run', async () => {
    const { code, text } = await runCli(statusCommand, argv(root, 'status'))

    expect(code).toBe(0)
    expect(text).toContain('No runs recorded yet')
  })

  it('lists recorded runs with their state', async () => {
    await recordRun()

    const { code, text } = await runCli(statusCommand, argv(root, 'status'))

    expect(code).toBe(0)
    expect(text).toContain('T-1')
    expect(text).toContain('in review')
    expect(text).toContain('Add a currency formatter')
  })

  it('counts what is waiting on a person', async () => {
    await recordRun({ id: 'run-T-2', state: 'escalated', terminalReason: 'needs a decision' })

    const { text } = await runCli(statusCommand, argv(root, 'status'))

    expect(text).toContain('needs human')
    expect(text).toContain('needs a decision')
    expect(text).toContain('1 run(s) waiting on you')
  })
})

describe('trace', () => {
  it('says so when nothing has been recorded', async () => {
    const { code, text } = await runCli(traceCommand, argv(root, 'trace'))

    expect(code).toBe(0)
    expect(text).toContain('No traces recorded yet')
  })

  it('lists what is available when asked for nothing in particular', async () => {
    await recordTrace('run-T-1', [toolStep(1, 'Read', 'src/a.ts')])

    const { code, text } = await runCli(traceCommand, argv(root, 'trace'))

    expect(code).toBe(0)
    expect(text).toContain('run-T-1')
    expect(text).toContain('1 tool call(s)')
  })

  it('renders the timeline of one run', async () => {
    await recordTrace('run-T-1', [
      toolStep(1, 'Read', 'src/money.ts'),
      toolStep(2, 'Edit', 'src/money.ts', { mutating: true }),
    ])

    const { code, text } = await runCli(traceCommand, argv(root, 'trace run-T-1'))

    expect(code).toBe(0)
    expect(text).toContain('Timeline')
    expect(text).toContain('Read')
    expect(text).toContain('src/money.ts')
  })

  it('accepts a bare task id as well as a run id', async () => {
    // Both are things a person has to hand, and making them guess which is a papercut.
    await recordTrace('run-T-1', [toolStep(1, 'Read', 'src/a.ts')])

    const { code } = await runCli(traceCommand, argv(root, 'trace T-1'))
    expect(code).toBe(0)
  })

  it('shows only the actions under --tools', async () => {
    await recordTrace('run-T-1', [
      toolStep(1, 'Read', 'src/a.ts'),
      { seq: 2, at: 3_000, kind: 'message', name: 'assistant', summary: 'Thinking about it.' },
    ])

    const { text } = await runCli(traceCommand, argv(root, 'trace run-T-1 --tools'))

    expect(text).toContain('Read')
    expect(text).not.toContain('Thinking about it.')
  })

  it('reports a concern it found, with the steps that produced it', async () => {
    /*
     * The point of recording at all. Three identical calls is the most common way an agent gets
     * stuck, and it is invisible in a diff.
     */
    await recordTrace('run-T-1', [
      toolStep(1, 'Grep', 'formatDate'),
      toolStep(2, 'Grep', 'formatDate'),
      toolStep(3, 'Grep', 'formatDate'),
    ])

    const { code, text } = await runCli(traceCommand, argv(root, 'trace run-T-1'))

    expect(code).toBe(0)
    expect(text).toContain('Concerns')
    expect(text).toContain('repeated-call')
    expect(text).toContain('steps 1, 2, 3')
  })

  it('says plainly when there is nothing concerning', async () => {
    await recordTrace('run-T-1', [toolStep(1, 'Read', 'src/a.ts')])

    const { text } = await runCli(traceCommand, argv(root, 'trace run-T-1'))

    expect(text).toContain('Nothing concerning')
  })

  it('emits an OTLP payload without needing a collector', async () => {
    await recordTrace('run-T-1', [toolStep(1, 'Read', 'src/a.ts')])

    const { code, text } = await runCli(traceCommand, argv(root, 'trace run-T-1 --otlp-json'))
    const payload = JSON.parse(text) as { resourceSpans: Array<{ scopeSpans: Array<{ spans: unknown[] }> }> }

    expect(code).toBe(0)
    // One root span for the run, one child per step.
    expect(payload.resourceSpans[0]?.scopeSpans[0]?.spans).toHaveLength(2)
  })

  it('lists what does exist when asked for a trace that does not', async () => {
    await recordTrace('run-T-1', [toolStep(1, 'Read', 'src/a.ts')])

    const { code, text } = await runCli(traceCommand, argv(root, 'trace run-nope'))

    expect(code).toBe(1)
    expect(text).toContain('No trace for "run-nope"')
    expect(text).toContain('run-T-1')
  })

  it('refuses a --limit that is not a number', async () => {
    await recordTrace('run-T-1', [toolStep(1, 'Read', 'src/a.ts')])

    const err = await runCliExpectingThrow(traceCommand, argv(root, 'trace run-T-1 --limit abc'))
    expect(err.message).toMatch(/must be a number/)
  })
})

describe('handoff', () => {
  it('asks which run when given none', async () => {
    const { code, text } = await runCli(handoffCommand, argv(root, 'handoff'))

    expect(code).toBe(1)
    expect(text).toContain('Which run?')
  })

  it('reports an unknown run rather than inventing a package', async () => {
    const { code, text } = await runCli(handoffCommand, argv(root, 'handoff run-nope'))

    expect(code).toBe(1)
    expect(text).toContain('No run "run-nope"')
  })

  it('shows what would be transferred, and what each tier costs', async () => {
    /*
     * The measurement is the point. A transfer format nobody has measured is a claim about what
     * matters; printing the cost of each tier turns it into something testable.
     */
    await recordRun({ state: 'escalated', terminalReason: 'gave up after two rounds' })
    await recordTrace('run-T-1', [
      toolStep(1, 'Grep', 'formatMoney', { ok: false, error: 'no matches' }),
      toolStep(2, 'Grep', 'formatMoney', { ok: false, error: 'no matches' }),
      toolStep(3, 'Grep', 'formatMoney', { ok: false, error: 'no matches' }),
    ])

    const { code, text } = await runCli(handoffCommand, argv(root, 'handoff run-T-1'))

    expect(code).toBe(0)
    expect(text).toContain('gave up after two rounds')
    expect(text).toContain('Already ruled out')
    expect(text).toContain('formatMoney')
    expect(text).toContain('Cost by tier')
    expect(text).toContain('task only (control)')
  })

  it('renders the prompt itself at the tier asked for', async () => {
    await recordRun({ state: 'escalated' })
    await recordTrace('run-T-1', [toolStep(1, 'Read', 'src/money.ts')])

    const { code, text } = await runCli(handoffCommand, argv(root, 'handoff run-T-1 --tier essential'))

    expect(code).toBe(0)
    expect(text).toContain('Continuing work started by another agent')
    expect(text).toContain('Add a currency formatter')
  })

  it('costs more at each tier than the one below it', async () => {
    await recordRun({ state: 'escalated' })
    await recordTrace('run-T-1', [
      toolStep(1, 'Grep', 'x', { ok: false, error: 'no matches' }),
      toolStep(2, 'Grep', 'x', { ok: false, error: 'no matches' }),
      toolStep(3, 'Grep', 'x', { ok: false, error: 'no matches' }),
    ])

    const { text } = await runCli(handoffCommand, argv(root, 'handoff run-T-1'))
    const tokens = [...text.matchAll(/^\s+(none|essential|valuable|optional)\s+(\d+) tokens/gm)].map(
      (m) => Number(m[2]),
    )

    expect(tokens).toHaveLength(4)
    expect(tokens[0]).toBeLessThan(tokens[1]!)
    expect(tokens[1]).toBeLessThanOrEqual(tokens[2]!)
    expect(tokens[2]).toBeLessThanOrEqual(tokens[3]!)
  })

  it('says plainly when the trajectory ruled nothing out', async () => {
    await recordRun({ state: 'escalated' })

    const { code, text } = await runCli(handoffCommand, argv(root, 'handoff run-T-1'))

    expect(code).toBe(0)
    expect(text).toContain('nothing — the trajectory records no failed or repeated approach')
  })
})

describe('what the runs have cost', () => {
  it('shows a per-run figure and a total', async () => {
    /*
     * The cost was recorded on every run and shown by none of them, so the one question worth
     * asking after a week of use — what has this spent — had no answer short of reading JSON
     * out of `.ctxmux/state`.
     */
    await recordRun({
      id: 'run-T-1',
      result: {
        status: 'succeeded',
        filesChanged: ['a.ts'],
        summary: 's',
        usage: { costUsd: 1.2734, turns: 20 },
      },
    })
    await recordRun({
      id: 'run-T-2',
      task: { id: 'T-2', title: 'Second', body: '', acceptanceCriteria: [], scope: { allow: [], deny: [] }, qualityGate: [], origin: { tracker: 'file', id: 'T-2' }, labels: [] },
      result: { status: 'succeeded', filesChanged: ['b.ts'], summary: 's', usage: { costUsd: 0.421 } },
    })

    const { code, text } = await runCli(statusCommand, argv(root, 'status'))

    expect(code).toBe(0)
    expect(text).toContain('$1.27')
    expect(text).toContain('$0.42')
    expect(text).toContain('$1.69')
  })

  it('says a cloud agent bills elsewhere rather than showing nothing', async () => {
    // A delegated agent's spend is real and invisible here: GitHub counts premium requests
    // against an organisation and exposes nothing per task. A blank reads as free.
    await recordRun({
      result: {
        status: 'succeeded',
        filesChanged: ['a.ts'],
        summary: 's',
        location: { prUrl: 'https://github.com/o/r/pull/779' },
      },
    })

    const { text } = await runCli(statusCommand, argv(root, 'status'))

    expect(text).toMatch(/bills separately/)
    expect(text).not.toMatch(/\$0\.00/)
  })

  it('says nothing about cost when no run reported any', async () => {
    // A line that appears unconditionally is a line people stop reading.
    await recordRun()
    const { text } = await runCli(statusCommand, argv(root, 'status'))
    expect(text).not.toMatch(/reported a cost|bills separately/)
  })
})
