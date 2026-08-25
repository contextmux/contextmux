/**
 * State machine tests.
 *
 * The reducer is pure, so the policy that actually matters — when to retry, when to correct,
 * when to hand over to a human — is exercised exhaustively here with no I/O at all.
 */
import { describe, expect, it } from 'vitest'
import {
  createRun,
  DEFAULT_POLICY,
  reduce,
  replay,
  TERMINAL,
  type Effect,
  type GateOutcome,
  type Run,
  type RunEvent,
} from '../src/machine.js'
import { fakeTask } from '../src/testing.js'
import type { AgentResult, Feedback } from '../src/task.js'

const result = (over: Partial<AgentResult> = {}): AgentResult => ({
  status: 'succeeded',
  filesChanged: ['src/a.ts'],
  summary: 'done',
  ...over,
})

const feedback = (round = 1): Feedback => ({ round, source: 'reviewer', body: 'please fix X' })
const rejectOutcome: GateOutcome = { gate: 'g', verdict: 'reject', reason: 'nope' }
const escalateOutcome: GateOutcome = { gate: 'g', verdict: 'escalate', reason: 'suspicious' }

const start = (policy = DEFAULT_POLICY) => createRun(fakeTask(), policy)
const effectTypes = (effects: Effect[]) => effects.map((e) => e.type)

/** Drive a run to `working` — the state most scenarios branch from. */
function toWorking(run: Run = start()): Run {
  const a = reduce(run, { type: 'preflight_passed' }).run
  return reduce(a, { type: 'agent_started', handleRef: 'h1' }).run
}

describe('happy path', () => {
  it('runs discovered -> completed', () => {
    const events: RunEvent[] = [
      { type: 'preflight_passed' },
      { type: 'agent_started', handleRef: 'h1' },
      { type: 'agent_succeeded', result: result() },
      { type: 'verify_passed' },
      { type: 'review_approved' },
    ]
    const { run } = replay(start(), events)
    expect(run.state).toBe('completed')
    expect(run.history.map((h) => h.to)).toEqual([
      'ready', 'working', 'proposed', 'in_review', 'completed',
    ])
  })

  it('moves the tracker through the states a human would expect', () => {
    const { effects } = replay(start(), [
      { type: 'preflight_passed' },
      { type: 'agent_started', handleRef: 'h1' },
      { type: 'agent_succeeded', result: result() },
      { type: 'verify_passed' },
      { type: 'review_approved' },
    ])
    const transitions = effects.filter((e) => e.type === 'tracker_transition').map((e) => e.to)
    expect(transitions).toEqual(['in_progress', 'in_review', 'done'])
  })

  it('dispatches the agent exactly once on a clean run', () => {
    const { effects } = replay(start(), [
      { type: 'preflight_passed' },
      { type: 'agent_started', handleRef: 'h1' },
      { type: 'agent_succeeded', result: result() },
      { type: 'verify_passed' },
      { type: 'review_approved' },
    ])
    expect(effects.filter((e) => e.type === 'dispatch_agent')).toHaveLength(1)
  })
})

describe('preflight rejection', () => {
  it('rejects without spending an agent', () => {
    const { run, effects } = reduce(start(), { type: 'preflight_failed', outcomes: [rejectOutcome] })
    expect(run.state).toBe('rejected')
    expect(effectTypes(effects)).not.toContain('dispatch_agent')
  })

  it('explains the rejection on the task rather than failing silently', () => {
    const { effects } = reduce(start(), { type: 'preflight_failed', outcomes: [rejectOutcome] })
    const comment = effects.find((e) => e.type === 'tracker_comment')
    expect(comment && 'body' in comment ? comment.body : '').toContain('nope')
  })

  it('escalates instead of rejecting when a gate demands a human', () => {
    const { run } = reduce(start(), { type: 'preflight_failed', outcomes: [escalateOutcome] })
    expect(run.state).toBe('escalated')
  })
})

describe('agent failure', () => {
  it('retries within the attempt budget', () => {
    const { run, effects } = reduce(toWorking(), { type: 'agent_failed', error: 'boom' })
    expect(run.state).toBe('ready')
    expect(run.attempt).toBe(1)
    expect(effectTypes(effects)).toContain('dispatch_agent')
  })

  it('escalates once attempts are exhausted', () => {
    let run = toWorking()
    run = reduce(run, { type: 'agent_failed', error: 'boom' }).run
    run = reduce(run, { type: 'agent_started', handleRef: 'h2' }).run
    run = reduce(run, { type: 'agent_failed', error: 'boom again' }).run
    expect(run.state).toBe('escalated')
    expect(run.terminalReason).toContain('boom again')
  })

  it('treats a timeout as a failure, not a silent end', () => {
    const { run } = reduce(toWorking(), { type: 'timed_out', afterMs: 1000 })
    expect(run.state).toBe('ready')
    expect(run.attempt).toBe(1)
  })

  it('escalates a refusal instead of retrying it', () => {
    // Re-running a refused task produces the same judgement and spends the budget to hear it
    // twice; the agent decided the task was wrong, which is information for a human.
    const { run } = reduce(toWorking(), { type: 'agent_refused', reason: 'the premise is wrong' })
    expect(run.state).toBe('escalated')
    expect(run.attempt).toBe(0)
    expect(run.terminalReason).toContain('premise is wrong')
  })
})

describe('verify failure and self-correction', () => {
  const toProposed = () =>
    reduce(toWorking(), { type: 'agent_succeeded', result: result() }).run

  it('sends the agent back with the gate output as feedback', () => {
    const { run, effects } = reduce(toProposed(), {
      type: 'verify_failed',
      outcomes: [{ gate: 'path-scope', verdict: 'reject', reason: 'changed package.json' }],
    })
    expect(run.state).toBe('revising')
    expect(run.feedbackRound).toBe(1)

    const dispatch = effects.find((e) => e.type === 'dispatch_agent')
    expect(dispatch && 'feedback' in dispatch ? dispatch.feedback?.body : '').toContain('changed package.json')
  })

  it('escalates rather than looping once correction rounds run out', () => {
    let run = toProposed()
    for (let i = 0; i < DEFAULT_POLICY.maxFeedbackRounds; i++) {
      run = reduce(run, { type: 'verify_failed', outcomes: [rejectOutcome] }).run
      run = reduce(run, { type: 'agent_started', handleRef: `h${i}` }).run
      run = reduce(run, { type: 'agent_succeeded', result: result() }).run
    }
    run = reduce(run, { type: 'verify_failed', outcomes: [rejectOutcome] }).run
    expect(run.state).toBe('escalated')
  })

  it('escalates immediately when a verify gate demands a human', () => {
    // test-integrity uses this: an agent asked to fix a flagged test change may just hide it.
    const { run } = reduce(toProposed(), { type: 'verify_failed', outcomes: [escalateOutcome] })
    expect(run.state).toBe('escalated')
  })

  it('escalates without correcting when self-correction is disabled', () => {
    const run = reduce(
      reduce(toWorking(createRun(fakeTask(), { ...DEFAULT_POLICY, selfCorrect: false })), {
        type: 'agent_succeeded',
        result: result(),
      }).run,
      { type: 'verify_failed', outcomes: [rejectOutcome] },
    ).run
    expect(run.state).toBe('escalated')
  })
})

describe('review rounds', () => {
  const toReview = () => {
    let run = toWorking()
    run = reduce(run, { type: 'agent_succeeded', result: result() }).run
    return reduce(run, { type: 'verify_passed' }).run
  }

  it('sends changes back to the agent', () => {
    const { run, effects } = reduce(toReview(), {
      type: 'review_changes_requested',
      feedback: feedback(),
    })
    expect(run.state).toBe('revising')
    expect(run.feedbackRound).toBe(1)
    expect(effectTypes(effects)).toContain('dispatch_agent')
  })

  it('escalates after the configured number of rounds', () => {
    let run = toReview()
    for (let i = 0; i < DEFAULT_POLICY.maxFeedbackRounds; i++) {
      run = reduce(run, { type: 'review_changes_requested', feedback: feedback(i + 1) }).run
      run = reduce(run, { type: 'agent_started', handleRef: `h${i}` }).run
      run = reduce(run, { type: 'agent_succeeded', result: result() }).run
      run = reduce(run, { type: 'verify_passed' }).run
    }
    run = reduce(run, { type: 'review_changes_requested', feedback: feedback(9) }).run
    expect(run.state).toBe('escalated')
    expect(run.terminalReason).toContain('review round')
  })

  it('numbers rounds from the run, not from what the caller claims', () => {
    // A webhook can carry any round number it likes; the run's own count is the authority.
    const { effects } = reduce(toReview(), {
      type: 'review_changes_requested',
      feedback: { ...feedback(), round: 99 },
    })
    const dispatch = effects.find((e) => e.type === 'dispatch_agent')
    expect(dispatch && 'feedback' in dispatch ? dispatch.feedback?.round : 0).toBe(1)
  })
})

describe('duplicate and out-of-order events', () => {
  it('ignores an event that does not apply to the current state', () => {
    // Redelivered webhooks are ordinary traffic, not errors.
    const run = toWorking()
    const { run: after, applied } = reduce(run, { type: 'review_approved' })
    expect(applied).toBe(false)
    expect(after).toBe(run)
  })

  it('does not double-count a repeated review event', () => {
    let run = toWorking()
    run = reduce(run, { type: 'agent_succeeded', result: result() }).run
    run = reduce(run, { type: 'verify_passed' }).run
    run = reduce(run, { type: 'review_changes_requested', feedback: feedback() }).run
    const before = run.feedbackRound
    // The same delivery arriving twice: the run has moved to `revising`, so it no longer applies.
    run = reduce(run, { type: 'review_changes_requested', feedback: feedback() }).run
    expect(run.feedbackRound).toBe(before)
  })

  it('ignores every event once terminal', () => {
    const { run } = replay(start(), [
      { type: 'preflight_passed' },
      { type: 'agent_started', handleRef: 'h' },
      { type: 'agent_succeeded', result: result() },
      { type: 'verify_passed' },
      { type: 'review_approved' },
    ])
    for (const state of TERMINAL) expect(TERMINAL.has(state)).toBe(true)
    const after = reduce(run, { type: 'review_changes_requested', feedback: feedback() })
    expect(after.applied).toBe(false)
    expect(after.run.state).toBe('completed')
  })
})

describe('escalation and cancellation', () => {
  it('escalates from any live state and tells a human', () => {
    const { run, effects } = reduce(toWorking(), { type: 'escalated', reason: 'needs judgement' })
    expect(run.state).toBe('escalated')
    expect(effectTypes(effects)).toContain('notify')
    const labels = effects.find((e) => e.type === 'tracker_label')
    expect(labels && 'add' in labels ? labels.add : []).toContain('needs-human')
  })

  it('cancels cleanly', () => {
    const { run, effects } = reduce(toWorking(), { type: 'cancelled', reason: 'user aborted' })
    expect(run.state).toBe('failed')
    expect(effectTypes(effects)).toContain('dispose_runner')
  })
})

describe('history', () => {
  it('records every transition, giving an audit log for free', () => {
    const { run } = replay(start(), [
      { type: 'preflight_passed' },
      { type: 'agent_started', handleRef: 'h' },
      { type: 'agent_failed', error: 'boom' },
      { type: 'agent_started', handleRef: 'h2' },
      { type: 'agent_succeeded', result: result() },
      { type: 'verify_passed' },
      { type: 'review_approved' },
    ])
    expect(run.history).toHaveLength(7)
    expect(run.history[2]).toMatchObject({ from: 'working', to: 'ready', event: 'agent_failed' })
    expect(run.history[2]?.note).toContain('boom')
  })

  it('replays deterministically, which is what makes crash recovery tractable', () => {
    const events: RunEvent[] = [
      { type: 'preflight_passed' },
      { type: 'agent_started', handleRef: 'h' },
      { type: 'agent_succeeded', result: result() },
      { type: 'verify_passed' },
    ]
    const a = replay(start(), events)
    const b = replay(start(), events)
    expect(a.run).toEqual(b.run)
    expect(a.effects).toEqual(b.effects)
  })
})

describe('gate outcomes on success', () => {
  it('keeps the passing outcomes, not only the failures', () => {
    // Recording only failures meant nothing downstream could tell "the quality gate passed"
    // from "the quality gate never ran", so a report could say passed and failed at once.
    const outcomes: GateOutcome[] = [
      { gate: 'quality-gate', verdict: 'pass' },
      { gate: 'path-scope', verdict: 'pass' },
    ]
    let run = reduce(start(), { type: 'preflight_passed', outcomes }).run
    expect(run.gateOutcomes).toEqual(outcomes)

    run = reduce(run, { type: 'agent_started', handleRef: 'h' }).run
    run = reduce(run, { type: 'agent_succeeded', result: result() }).run
    run = reduce(run, { type: 'verify_passed', outcomes }).run

    expect(run.state).toBe('in_review')
    expect(run.gateOutcomes.map((o) => o.gate)).toContain('quality-gate')
    expect(run.gateOutcomes.every((o) => o.verdict === 'pass')).toBe(true)
  })

  it('still works when a caller omits the outcomes', () => {
    const run = reduce(start(), { type: 'preflight_passed' }).run
    expect(run.state).toBe('ready')
  })
})

describe('recovery feedback on retry', () => {
  it('retries with the diagnosis rather than resending the prompt that failed', () => {
    // Without this, an agent stopped for repeating itself is handed the original prompt again
    // and has every reason to repeat itself again. Naming the failure is the whole point.
    const recovery: Feedback = {
      round: 1,
      source: 'recovery',
      body: 'You called the same search five times with identical arguments.',
    }

    const { run, effects } = reduce(toWorking(), {
      type: 'agent_failed',
      error: 'no progress',
      recovery,
    })

    expect(run.state).toBe('ready')
    expect(run.pendingFeedback?.body).toContain('identical arguments')

    const dispatch = effects.find((e) => e.type === 'dispatch_agent')
    expect(dispatch && 'feedback' in dispatch ? dispatch.feedback?.source : '').toBe('recovery')
  })

  it('still retries plainly when there is no diagnosis to give', () => {
    const { run, effects } = reduce(toWorking(), { type: 'agent_failed', error: 'crashed' })
    expect(run.state).toBe('ready')
    expect(run.pendingFeedback).toBeUndefined()
    const dispatch = effects.find((e) => e.type === 'dispatch_agent')
    expect(dispatch && 'feedback' in dispatch ? dispatch.feedback : undefined).toBeUndefined()
  })

  it('carries the diagnosis across a restart', () => {
    // A resumed run must not lose why the previous attempt was stopped.
    const recovery: Feedback = { round: 1, source: 'recovery', body: 'stopped: no progress' }
    const failed = reduce(toWorking(), { type: 'agent_failed', error: 'x', recovery }).run
    const { effects } = reduce(failed, { type: 'resumed' })
    const dispatch = effects.find((e) => e.type === 'dispatch_agent')
    expect(dispatch && 'feedback' in dispatch ? dispatch.feedback?.body : '').toContain('no progress')
  })

  it('escalates a stall that needs a human without retrying', () => {
    // An irreversible act during a failing run is not something to try again.
    const { run } = reduce(toWorking(), {
      type: 'agent_refused',
      reason: 'an irreversible operation during a run that was already failing',
    })
    expect(run.state).toBe('escalated')
    expect(run.attempt).toBe(0)
  })
})

/*
 * Regressions.
 *
 * Each of these describes a way the reducer was wrong in a manner nothing else noticed: the
 * run kept moving, the states looked reasonable, and the information that made the next step
 * correct had quietly gone missing.
 */
describe('regressions', () => {
  it('re-dispatches a failed revision with the reviewer’s request still attached', () => {
    // A run in `revising` carries the reviewer's words. If the agent then *fails* — a crash, a
    // timeout — the retry has to carry them too. Dispatching without them re-sends the original
    // prompt, so the agent rebuilds the change that was just rejected and the review comment is
    // lost with nothing to show where it went.
    const reviewed = reduce(
      reduce(toWorking(), { type: 'agent_succeeded', result: result() }).run,
      { type: 'verify_passed' },
    ).run
    const revising = reduce(reviewed, {
      type: 'review_changes_requested',
      feedback: feedback(),
    }).run
    expect(revising.state).toBe('revising')

    const retried = reduce(revising, { type: 'agent_failed', error: 'process died' })

    const dispatch = retried.effects.find((e) => e.type === 'dispatch_agent')
    expect(dispatch).toBeDefined()
    expect((dispatch as { feedback?: Feedback }).feedback?.body).toBe('please fix X')
    expect(retried.run.pendingFeedback?.body).toBe('please fix X')
  })

  it('prefers a fresh diagnosis over the older feedback when the agent supplies one', () => {
    const revising = reduce(
      reduce(
        reduce(toWorking(), { type: 'agent_succeeded', result: result() }).run,
        { type: 'verify_passed' },
      ).run,
      { type: 'review_changes_requested', feedback: feedback() },
    ).run

    const recovery: Feedback = { round: 2, source: 'recovery', body: 'you repeated one search' }
    const retried = reduce(revising, { type: 'agent_failed', error: 'stalled', recovery })

    expect(retried.run.pendingFeedback?.body).toBe('you repeated one search')
  })

  it('carries the failing gates onto a run that escalated at verify', () => {
    // Escalation is expressed by re-entering with an `escalated` event, which knows nothing
    // about gates. Without carrying them the run reached a human still holding its *preflight*
    // passes — so the report showed "passed" beside a run that escalated on that very gate.
    const proposed = reduce(toWorking(), { type: 'agent_succeeded', result: result() }).run
    const escalated = reduce(proposed, { type: 'verify_failed', outcomes: [escalateOutcome] })

    expect(escalated.run.state).toBe('escalated')
    expect(escalated.run.gateOutcomes).toEqual([escalateOutcome])
  })

  it('carries the failing gates when correction rounds run out', () => {
    let run = reduce(toWorking(start({ ...DEFAULT_POLICY, maxFeedbackRounds: 0 })), {
      type: 'agent_succeeded',
      result: result(),
    }).run
    const out = reduce(run, { type: 'verify_failed', outcomes: [rejectOutcome] })

    expect(out.run.state).toBe('escalated')
    expect(out.run.gateOutcomes).toEqual([rejectOutcome])
  })

  it('carries the failing gates when preflight escalates', () => {
    const out = reduce(start(), { type: 'preflight_failed', outcomes: [escalateOutcome] })

    expect(out.run.state).toBe('escalated')
    expect(out.run.gateOutcomes).toEqual([escalateOutcome])
  })
})
