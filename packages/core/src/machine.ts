/**
 * The run state machine, as a pure reducer.
 *
 * `reduce(state, event) -> { state, effects }` performs no I/O. Effects are *descriptions* of
 * work; the engine executes them through adapters. Three things fall out of that split:
 *
 *  - The policy that actually matters — when to escalate, how many revision rounds are
 *    allowed, what happens when an agent fails — is testable exhaustively without mocking a
 *    tracker, an agent, or a filesystem.
 *  - Every transition is a value, so the run history is an audit log for free.
 *  - Replaying a run is deterministic, which is what makes crash recovery tractable.
 *
 * Duplicate events are the normal case, not an edge case: webhooks redeliver, cron overlaps,
 * processes die mid-transition. Every transition here is therefore written to be safe to
 * attempt twice; the engine adds durable idempotency on top.
 */
import type { AgentResult, Feedback, TaskSpec } from './task.js'

export type RunState =
  /** Task pulled from a tracker, nothing decided yet. */
  | 'discovered'
  /** Preflight gates passed; ready to hand to an agent. */
  | 'ready'
  /** Preflight gates rejected it; a human needs to improve the task. */
  | 'rejected'
  /** Handed to an agent, work in progress. */
  | 'working'
  /** Agent produced changes; verify gates have not run yet. */
  | 'proposed'
  /** Verify gates passed; awaiting review. */
  | 'in_review'
  /** Review asked for changes; agent is addressing them. */
  | 'revising'
  /** Done. */
  | 'completed'
  /** Handed to a human, deliberately. */
  | 'escalated'
  /** Ended without a usable result and without escalation being appropriate. */
  | 'failed'

/** States from which no further transition is possible. */
/**
 * What a run was judged on, for deciding whether a stored verdict still applies.
 *
 * Only the parts a gate reads. A ticket whose status or assignee moved has not become a
 * different piece of work, and treating it as one would discard a run mid-flight.
 */
export function taskFingerprint(task: TaskSpec): string {
  return [
    task.title.trim(),
    task.body.trim(),
    task.acceptanceCriteria.map((c) => c.text.trim()).join('\u0000'),
    task.scope.allow.join(','),
    task.scope.deny.join(','),
  ].join('\u0001')
}

export const TERMINAL: ReadonlySet<RunState> = new Set<RunState>([
  'completed',
  'escalated',
  'failed',
  'rejected',
])

export interface GateOutcome {
  gate: string
  verdict: 'pass' | 'reject' | 'escalate'
  reason?: string
  hint?: string
}

export type RunEvent =
  /** Re-entry after a crash or a fresh process picking up a stored run. */
  | { type: 'resumed' }
  | { type: 'preflight_passed'; outcomes?: GateOutcome[] }
  | { type: 'preflight_failed'; outcomes: GateOutcome[] }
  | { type: 'agent_started'; handleRef: string }
  | { type: 'agent_succeeded'; result: AgentResult }
  | {
      type: 'agent_failed'
      error: string
      /**
       * A diagnosis to hand back on retry.
       *
       * Without it a retry re-sends the original prompt, and an agent that got stuck repeating
       * itself has every reason to do so again. Naming the failure is the difference between a
       * recovery and paying twice for the same mistake.
       */
      recovery?: Feedback
    }
  | { type: 'agent_refused'; reason: string }
  | { type: 'verify_passed'; outcomes?: GateOutcome[] }
  | { type: 'verify_failed'; outcomes: GateOutcome[] }
  | { type: 'review_changes_requested'; feedback: Feedback }
  | { type: 'review_approved' }
  | { type: 'timed_out'; afterMs: number }
  | { type: 'escalated'; reason: string }
  | { type: 'cancelled'; reason: string }

export type Effect =
  | { type: 'run_preflight_gates' }
  | { type: 'dispatch_agent'; feedback?: Feedback }
  | { type: 'run_verify_gates'; result: AgentResult }
  | { type: 'tracker_transition'; to: 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked' }
  /** Claim the ticket for whoever the credentials belong to, so the board says who has it. */
  | { type: 'tracker_assign' }
  /**
   * Tell the forge the produced artefact is ready for a human.
   *
   * Only some agents need it. Copilot leaves its pull request as a draft and requests a
   * review, so the work sits in a state that reads as unfinished to everyone but us — the run
   * says `in_review` while the pull request says "still being written".
   */
  | { type: 'mark_ready_for_review' }
  | { type: 'tracker_comment'; body: string }
  | { type: 'tracker_label'; add: string[]; remove: string[] }
  | { type: 'notify'; level: 'info' | 'warn' | 'error'; title: string; body: string }
  | { type: 'persist' }
  | { type: 'dispose_runner' }

export interface RunPolicy {
  /** Revision rounds allowed before escalation. */
  maxFeedbackRounds: number
  /** Retries after an agent *failure* — distinct from a revision round. */
  maxAttempts: number
  /**
   * Whether a verify-gate failure sends the agent back to fix it.
   *
   * On by default: a scope violation or a failing quality gate is exactly the kind of thing an
   * agent can correct from a precise description, and doing so costs one round instead of a
   * human's attention.
   */
  selfCorrect: boolean
}

export const DEFAULT_POLICY: RunPolicy = {
  maxFeedbackRounds: 2,
  maxAttempts: 2,
  selfCorrect: true,
}

export interface TransitionRecord {
  from: RunState
  to: RunState
  event: RunEvent['type']
  /** Set by the engine; the reducer stays free of clocks so replay is deterministic. */
  at?: number
  note?: string
}

export interface Run {
  id: string
  task: TaskSpec
  state: RunState
  /** Agent attempts spent on failures. */
  attempt: number
  /** Revision rounds spent on feedback. */
  feedbackRound: number
  policy: RunPolicy
  history: TransitionRecord[]
  handleRef?: string
  result?: AgentResult
  /** Why the run ended, when it ended badly. */
  terminalReason?: string
  gateOutcomes: GateOutcome[]
  /**
   * Feedback the next dispatch must carry.
   *
   * Held on the run rather than passed through the effect alone, so a run resumed in a
   * different process re-dispatches with its correction context instead of silently
   * re-attempting the original task.
   */
  pendingFeedback?: Feedback
}

export function createRun(task: TaskSpec, policy: RunPolicy = DEFAULT_POLICY): Run {
  return {
    id: `run-${task.id}`,
    task,
    state: 'discovered',
    attempt: 0,
    feedbackRound: 0,
    policy,
    history: [],
    gateOutcomes: [],
  }
}

export interface ReduceResult {
  run: Run
  effects: Effect[]
  /** False when the event did not apply in the current state. */
  applied: boolean
}

function advance(run: Run, to: RunState, event: RunEvent, note?: string): Run {
  return {
    ...run,
    state: to,
    history: [...run.history, { from: run.state, to, event: event.type, ...(note ? { note } : {}) }],
  }
}

function summarizeGates(outcomes: GateOutcome[]): string {
  return outcomes
    .filter((o) => o.verdict !== 'pass')
    .map((o) => `- **${o.gate}**: ${o.reason ?? 'failed'}${o.hint ? `\n  ${o.hint}` : ''}`)
    .join('\n')
}

/**
 * Apply an event.
 *
 * Events that do not apply to the current state are ignored rather than throwing. A redelivered
 * webhook arriving after a run has moved on is ordinary traffic, not an error, and treating it
 * as one turns routine duplication into noise or crashes.
 */
export function reduce(run: Run, event: RunEvent): ReduceResult {
  const ignore: ReduceResult = { run, effects: [], applied: false }

  // Cancellation and explicit escalation apply from any non-terminal state.
  if (TERMINAL.has(run.state)) return ignore

  if (event.type === 'cancelled') {
    return {
      run: { ...advance(run, 'failed', event), terminalReason: event.reason },
      effects: [
        { type: 'tracker_comment', body: `Run cancelled: ${event.reason}` },
        { type: 'dispose_runner' },
        { type: 'persist' },
      ],
      applied: true,
    }
  }

  if (event.type === 'escalated') {
    return {
      run: { ...advance(run, 'escalated', event), terminalReason: event.reason },
      effects: [
        { type: 'tracker_transition', to: 'blocked' },
        { type: 'tracker_label', add: ['needs-human'], remove: [] },
        { type: 'tracker_comment', body: `Escalated to a human: ${event.reason}` },
        { type: 'notify', level: 'warn', title: `Escalated: ${run.task.title}`, body: event.reason },
        { type: 'dispose_runner' },
        { type: 'persist' },
      ],
      applied: true,
    }
  }

  switch (run.state) {
    // -----------------------------------------------------------------------
    case 'discovered': {
      if (event.type === 'preflight_passed') {
        return {
          run: {
            ...advance(run, 'ready', event),
            // Keep the passing outcomes too. Recording only failures means nothing downstream
            // can distinguish "the quality gate passed" from "the quality gate never ran" —
            // and a report that cannot tell those apart contradicts itself.
            gateOutcomes: event.outcomes ?? run.gateOutcomes,
          },
          effects: [
            { type: 'tracker_transition', to: 'in_progress' },
            { type: 'tracker_assign' },
            { type: 'dispatch_agent' },
            { type: 'persist' },
          ],
          applied: true,
        }
      }
      if (event.type === 'preflight_failed') {
        const escalating = event.outcomes.some((o) => o.verdict === 'escalate')
        if (escalating) {
          /*
           * Carry the outcomes onto the run before escalating.
           *
           * Escalation is expressed by re-entering with an `escalated` event, which knows
           * nothing about gates. Without this the run reaches a human holding whatever
           * outcomes it had *before* — stale passes for a run that failed — and a report that
           * cannot tell "passed" from "never ran" contradicts itself.
           */
          return reduce({ ...run, gateOutcomes: event.outcomes }, {
            type: 'escalated',
            reason: event.outcomes.find((o) => o.verdict === 'escalate')?.reason ?? 'gate escalation',
          })
        }
        return {
          run: {
            ...advance(run, 'rejected', event),
            gateOutcomes: event.outcomes,
            terminalReason: 'preflight gates rejected the task',
          },
          effects: [
            { type: 'tracker_label', add: ['needs-detail'], remove: [] },
            {
              type: 'tracker_comment',
              body: `This task was not picked up automatically:\n\n${summarizeGates(event.outcomes)}`,
            },
            { type: 'persist' },
          ],
          applied: true,
        }
      }
      return ignore
    }

    // -----------------------------------------------------------------------
    /*
     * The three states in which an agent owes us a result.
     *
     * They are handled together because the two archetypes reach a result differently. A
     * delegated agent is handed work and observed later, so `agent_started` is a real,
     * separately-observable moment. A driven agent's dispatch is a single synchronous call,
     * so its terminal event arrives with no intervening `started`. Requiring the delegated
     * shape from both would strand every driven run in `ready` forever.
     */
    case 'ready':
    case 'revising':
    case 'working': {
      if (event.type === 'resumed') {
        // Re-dispatch. Whatever the previous process was doing produced no recorded result,
        // so the work has to be redone — this is why agents are given an isolated worktree.
        return {
          run,
          effects: [
            { type: 'dispatch_agent', ...(run.pendingFeedback ? { feedback: run.pendingFeedback } : {}) },
          ],
          applied: true,
        }
      }

      if (event.type === 'agent_started') {
        return {
          run: run.state === 'working' ? run : { ...advance(run, 'working', event), handleRef: event.handleRef },
          effects: [{ type: 'persist' }],
          applied: true,
        }
      }

      if (event.type === 'agent_succeeded') {
        return {
          run: {
            ...advance(run, 'proposed', event),
            result: event.result,
            pendingFeedback: undefined,
          },
          effects: [{ type: 'run_verify_gates', result: event.result }, { type: 'persist' }],
          applied: true,
        }
      }

      if (event.type === 'agent_refused') {
        // A refusal is information, not a failure to retry. The agent judged the task
        // impossible or unsafe as written; running it again produces the same answer.
        return reduce(run, { type: 'escalated', reason: `Agent declined the task: ${event.reason}` })
      }

      if (event.type === 'agent_failed' || event.type === 'timed_out') {
        const reason =
          event.type === 'timed_out' ? `timed out after ${event.afterMs}ms` : event.error
        const next = { ...run, attempt: run.attempt + 1 }
        if (next.attempt >= run.policy.maxAttempts) {
          return reduce(next, {
            type: 'escalated',
            reason: `Agent failed ${next.attempt} time(s): ${reason}`,
          })
        }

        // Carry the diagnosis into the retry when there is one, so the next attempt starts
        // from what went wrong rather than from the original prompt alone.
        const recovery = event.type === 'agent_failed' ? event.recovery : undefined

        /*
         * Fall back to whatever the run was already carrying.
         *
         * A failure during a revision round is the case that matters: the run holds the
         * reviewer's request in `pendingFeedback`, and dispatching without it re-sends the
         * original prompt. The agent then produces the change that was already rejected, and
         * the review comment is lost with no trace of where it went.
         */
        const carry = recovery ?? run.pendingFeedback

        return {
          run: {
            ...advance(next, 'ready', event, `attempt ${next.attempt} failed: ${reason}`),
            ...(carry ? { pendingFeedback: carry } : {}),
          },
          effects: [
            { type: 'notify', level: 'warn', title: `Retrying ${run.task.id}`, body: reason },
            { type: 'dispatch_agent', ...(carry ? { feedback: carry } : {}) },
            { type: 'persist' },
          ],
          applied: true,
        }
      }
      return ignore
    }

    // -----------------------------------------------------------------------
    case 'proposed': {
      if (event.type === 'verify_passed') {
        return {
          run: {
            ...advance(run, 'in_review', event),
            gateOutcomes: event.outcomes ?? run.gateOutcomes,
          },
          effects: [
            { type: 'mark_ready_for_review' },
            { type: 'tracker_transition', to: 'in_review' },
            {
              type: 'tracker_comment',
              body: `Changes proposed by ${run.result?.filesChanged.length ?? 0} file(s).\n\n${run.result?.summary ?? ''}`,
            },
            { type: 'persist' },
          ],
          applied: true,
        }
      }

      if (event.type === 'verify_failed') {
        const escalating = event.outcomes.some((o) => o.verdict === 'escalate')
        const detail = summarizeGates(event.outcomes)

        // Same reasoning as preflight: the outcomes travel with the run, not only inside the
        // escalation message, so `ctxmux status` and the report agree with each other.
        const escalated = { ...run, gateOutcomes: event.outcomes }

        if (escalating || !run.policy.selfCorrect) {
          return reduce(escalated, { type: 'escalated', reason: `Verification failed:\n${detail}` })
        }

        const nextRound = run.feedbackRound + 1
        if (nextRound > run.policy.maxFeedbackRounds) {
          return reduce(escalated, {
            type: 'escalated',
            reason: `Verification still failing after ${run.feedbackRound} correction round(s):\n${detail}`,
          })
        }

        // Hand the agent the gate output verbatim. Gate failures are precisely the kind of
        // feedback an agent can act on without a human rewriting it.
        const feedback: Feedback = {
          round: nextRound,
          source: 'verify-gates',
          body: `The following checks failed. Fix them without changing anything else:\n\n${detail}`,
        }
        return {
          run: {
            ...advance(run, 'revising', event),
            feedbackRound: nextRound,
            gateOutcomes: event.outcomes,
            pendingFeedback: feedback,
          },
          effects: [{ type: 'dispatch_agent', feedback }, { type: 'persist' }],
          applied: true,
        }
      }
      return ignore
    }

    // -----------------------------------------------------------------------
    case 'in_review': {
      if (event.type === 'review_approved') {
        return {
          run: advance(run, 'completed', event),
          effects: [
            { type: 'tracker_transition', to: 'done' },
            { type: 'notify', level: 'info', title: `Completed: ${run.task.title}`, body: run.result?.summary ?? '' },
            { type: 'dispose_runner' },
            { type: 'persist' },
          ],
          applied: true,
        }
      }

      if (event.type === 'review_changes_requested') {
        const nextRound = run.feedbackRound + 1
        if (nextRound > run.policy.maxFeedbackRounds) {
          return reduce(run, {
            type: 'escalated',
            reason: `${run.feedbackRound} review round(s) without resolution`,
          })
        }
        const revision: Feedback = { ...event.feedback, round: nextRound }
        return {
          run: { ...advance(run, 'revising', event), feedbackRound: nextRound, pendingFeedback: revision },
          effects: [
            { type: 'tracker_transition', to: 'in_progress' },
            { type: 'dispatch_agent', feedback: revision },
            { type: 'persist' },
          ],
          applied: true,
        }
      }
      return ignore
    }

    default:
      return ignore
  }
}

/** Fold a sequence of events, for replay and for golden tests. */
export function replay(run: Run, events: RunEvent[]): { run: Run; effects: Effect[] } {
  let current = run
  const effects: Effect[] = []
  for (const event of events) {
    const r = reduce(current, event)
    current = r.run
    effects.push(...r.effects)
  }
  return { run: current, effects }
}
