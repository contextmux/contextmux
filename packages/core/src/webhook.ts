/**
 * Turning forge webhooks into run events.
 *
 * The interesting problem here is fan-out. One human submitting a review with three inline
 * comments produces four separate webhook deliveries. A pipeline that treats each as a
 * distinct piece of feedback counts four revision rounds, blows its escalation budget on a
 * single review, and posts four comments back — all from one person clicking one button.
 *
 * Two mechanisms prevent that. Events are coalesced by `(runId, kind)` inside a short window,
 * so a burst becomes one event. And the resulting event carries a deterministic dedupe key, so
 * a redelivery — which forges do routinely — is recognised even across process restarts.
 */
import { createHash } from 'node:crypto'
import type { Feedback } from './task.js'
import type { RunEvent } from './machine.js'

export interface WebhookEvent {
  /** Normalised kind, whatever the forge called it. */
  kind: 'review_submitted' | 'review_comment' | 'issue_comment' | 'pr_closed' | 'pr_merged'
  runId: string
  /** Who triggered it, so bot activity can be filtered out. */
  actor: string
  body?: string
  file?: string
  line?: number
  /** Forge-supplied identifier, used for dedupe when present. */
  deliveryId?: string
  /** Review verdict, for review_submitted. */
  state?: 'approved' | 'changes_requested' | 'commented'
  receivedAt: number
}

export interface CoalescedFeedback {
  runId: string
  event: RunEvent
  /** Stable across redeliveries of the same logical event. */
  dedupeKey: string
  /** How many deliveries were folded into this one. */
  merged: number
}

export interface CoalescerOptions {
  /**
   * How long to wait for related deliveries before acting.
   *
   * A review and its inline comments arrive within a second or two of each other, so a few
   * seconds captures the burst without making a human wait noticeably.
   */
  windowMs?: number
  /** Logins whose activity is never treated as human feedback. */
  botLogins?: string[]
  /** Current revision round for a run, so the emitted event is numbered correctly. */
  currentRound?: (runId: string) => number
}

function isBot(actor: string, bots: Set<string>): boolean {
  return bots.has(actor.toLowerCase()) || actor.endsWith('[bot]')
}

/**
 * Collects webhook deliveries and emits one event per burst.
 *
 * Deliberately not a timer-driven background process: `flush` is explicit so a caller in a
 * short-lived Action run can drain it deterministically, and a long-running service can call
 * it on its own schedule. Hidden timers make this untestable and make CI runs hang.
 */
export class FeedbackCoalescer {
  /** Keyed by run and group; the run id is kept beside the key because it may contain a colon. */
  private readonly pending = new Map<string, { runId: string; events: WebhookEvent[] }>()
  private readonly bots: Set<string>

  constructor(private readonly opts: CoalescerOptions = {}) {
    this.bots = new Set(
      [...(opts.botLogins ?? []), 'github-actions[bot]'].map((b) => b.toLowerCase()),
    )
  }

  /** Accept a delivery. Returns false when it was ignored, with no side effect. */
  add(event: WebhookEvent): boolean {
    if (isBot(event.actor, this.bots)) return false

    /*
     * The pull request closing is the end of the run, whatever else is outstanding.
     *
     * These two kinds were declared, produced by the normaliser and counted as accepted, and
     * then discarded: they carry no body and no file, so `mergeFeedback` returned null and
     * `flush` skipped them. A merged pull request left its run sitting in review forever while
     * the CLI reported "1 accepted" and exited 0.
     *
     * Grouped separately from feedback because a terminal event must not be merged into one,
     * and kept out of the window because there is nothing for it to wait for.
     */
    if (event.kind === 'pr_merged' || event.kind === 'pr_closed') {
      this.pending.set(`${event.runId}:closed`, { runId: event.runId, events: [event] })
      return true
    }

    // An approval carries no feedback to merge and should not be delayed behind a window.
    if (event.kind === 'review_submitted' && event.state === 'approved') {
      this.pending.set(`${event.runId}:approved`, { runId: event.runId, events: [event] })
      return true
    }

    // A bare comment with no text is a reaction, not feedback.
    if (event.kind === 'issue_comment' && !event.body?.trim()) return false

    const key = `${event.runId}:feedback`
    const group = this.pending.get(key) ?? { runId: event.runId, events: [] }
    group.events.push(event)
    this.pending.set(key, group)
    return true
  }

  /**
   * Whether the window has elapsed for a group, given the current time.
   *
   * The window exists to gather a burst of related deliveries. A group that can never grow —
   * an approval, a closed pull request — has nothing to wait for, and `add` says as much, but
   * the check was applied to every group regardless. `reduce` rather than a spread so a large
   * burst cannot overflow the argument list.
   */
  private ready(key: string, events: WebhookEvent[], now: number): boolean {
    if (key.endsWith(':approved') || key.endsWith(':closed')) return true
    const windowMs = this.opts.windowMs ?? 3_000
    const newest = events.reduce((max, e) => (e.receivedAt > max ? e.receivedAt : max), -Infinity)
    return now - newest >= windowMs
  }

  /**
   * Drain groups whose window has elapsed.
   *
   * `now` is injected rather than read from the clock so the burst behaviour is testable
   * without sleeping, which is the difference between this being covered and not.
   */
  flush(now = Date.now(), opts: { force?: boolean } = {}): CoalescedFeedback[] {
    const out: CoalescedFeedback[] = []

    /*
     * Drained first, decided second.
     *
     * One human action can populate more than one group — approving while leaving inline
     * comments puts an approval in `:approved` and the comments in `:feedback` — and emitting
     * both handed the state machine "this run is complete" and "this run needs another round"
     * from a single click. Which one won depended on Map insertion order.
     */
    const drained: Array<{ key: string; runId: string; events: WebhookEvent[] }> = []
    for (const [key, { runId, events }] of [...this.pending]) {
      if (!opts.force && !this.ready(key, events, now)) continue
      this.pending.delete(key)
      if (!runId) continue
      drained.push({ key, runId, events })
    }

    const terminal = new Set(drained.filter((g) => g.key.endsWith(':closed')).map((g) => g.runId))
    const approved = new Set(drained.filter((g) => g.key.endsWith(':approved')).map((g) => g.runId))

    for (const { key, runId, events } of drained) {
      const round = this.opts.currentRound?.(runId) ?? 0

      /*
       * The pull request closing outranks everything else for that run.
       *
       * A merge is the outcome the run existed to produce, and a close without one ends it just
       * as definitively. Neither is improved by also processing a review comment that arrived
       * in the same burst.
       */
      if (key.endsWith(':closed')) {
        const merged = events.some((e) => e.kind === 'pr_merged')
        out.push({
          runId,
          event: merged
            ? { type: 'review_approved' }
            : { type: 'cancelled', reason: 'the pull request was closed without merging' },
          // Once per run, so the key does not need the round: a redelivery of a close is a
          // duplicate no matter how many rounds have passed.
          dedupeKey: `${runId}:${merged ? 'merged' : 'closed'}`,
          merged: 1,
        })
        continue
      }

      if (terminal.has(runId)) continue

      const approval = events.find((e) => e.kind === 'review_submitted' && e.state === 'approved')
      if (approval && events.length === 1) {
        out.push({
          runId,
          event: { type: 'review_approved' },
          /*
           * Keyed on the round, not on a delivery id.
           *
           * `deliveryId` is a header rather than part of the payload, so no producer here ever
           * sets one — the key fell through to `receivedAt`, which is a fresh timestamp on every
           * invocation. That made the durable dedupe for approvals inert: it looked like a guard
           * and matched nothing.
           *
           * The round is what makes a *second* approval genuinely different from a redelivery of
           * the first: approve, changes requested, approve again is three events and two of them
           * should apply.
           */
          dedupeKey: `${runId}:approved:round-${round}`,
          merged: 1,
        })
        continue
      }

      /*
       * An approval in the same burst means these comments came attached to it.
       *
       * That is what GitHub's own semantics say — an APPROVED review carries non-blocking
       * notes — and spending a revision round on nits would leave the run in review with
       * nothing left to approve it.
       */
      if (approved.has(runId)) continue

      const merged = mergeFeedback(events, round)
      if (!merged) continue

      out.push({
        runId,
        event: { type: 'review_changes_requested', feedback: merged },
        /*
         * Keyed on content, not on delivery id.
         *
         * The same logical review redelivered arrives with a *new* delivery id, so keying on
         * that would let a redelivery through as fresh feedback. Content plus round is stable
         * across redeliveries and still distinguishes a genuine second review.
         */
        dedupeKey: `${runId}:round-${merged.round}:${fingerprint(merged)}`,
        merged: events.length,
      })
    }

    return out
  }

  /** Deliveries waiting on their window, for a caller deciding whether to keep polling. */
  get size(): number {
    return this.pending.size
  }
}

/** Fold a burst of deliveries into a single piece of feedback. */
export function mergeFeedback(events: WebhookEvent[], currentRound: number): Feedback | null {
  const bodies: string[] = []
  const items: NonNullable<Feedback['items']> = []

  for (const event of events) {
    if (event.file) {
      items.push({
        file: event.file,
        ...(event.line !== undefined ? { line: event.line } : {}),
        body: event.body ?? '',
      })
    } else if (event.body?.trim()) {
      bodies.push(event.body.trim())
    }
  }

  if (bodies.length === 0 && items.length === 0) return null

  return {
    round: currentRound + 1,
    source: events[0]?.actor ?? 'reviewer',
    body: bodies.join('\n\n') || 'Changes were requested on the pull request.',
    ...(items.length ? { items } : {}),
  }
}

/*
 * A real digest.
 *
 * This value decides whether a delivery is a redelivery. A 32-bit accumulator over free text
 * collides often enough to matter, and a collision here does not degrade anything gracefully —
 * it silently discards a second reviewer's feedback as a duplicate of the first, which is
 * indistinguishable from the automation ignoring them.
 */
function fingerprint(feedback: Feedback): string {
  const text = feedback.body + (feedback.items ?? []).map((i) => `${i.file}:${i.line}:${i.body}`).join('|')
  return createHash('sha256').update(text).digest('base64url').slice(0, 22)
}
