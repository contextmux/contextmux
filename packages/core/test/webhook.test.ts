/**
 * Webhook coalescing.
 *
 * These encode the fan-out bug directly: one human, one review, four deliveries. Getting it
 * wrong burns a run's entire escalation budget on a single piece of feedback, and it is
 * invisible from the outside — the pipeline looks like it is working.
 */
import { describe, expect, it } from 'vitest'
import { FeedbackCoalescer, mergeFeedback, type WebhookEvent } from '../src/webhook.js'

const at = (t: number) => t
const base = (over: Partial<WebhookEvent> = {}): WebhookEvent => ({
  kind: 'review_comment',
  runId: 'run-T-1',
  actor: 'a-human',
  receivedAt: at(1000),
  ...over,
})

describe('fan-out', () => {
  it('folds one review and its inline comments into a single event', () => {
    // The bug: a review carrying three inline comments arrives as four deliveries. Counting
    // each as separate feedback spends four revision rounds on one person's single review.
    const c = new FeedbackCoalescer()
    c.add(base({ kind: 'review_submitted', state: 'changes_requested', body: 'A few things.', receivedAt: at(1000) }))
    c.add(base({ file: 'src/a.ts', line: 3, body: 'rename this', receivedAt: at(1100) }))
    c.add(base({ file: 'src/b.ts', line: 9, body: 'extract this', receivedAt: at(1200) }))
    c.add(base({ file: 'src/c.ts', line: 1, body: 'drop this', receivedAt: at(1300) }))

    const out = c.flush(at(9000))

    expect(out).toHaveLength(1)
    expect(out[0]?.merged).toBe(4)
    expect(out[0]?.event.type).toBe('review_changes_requested')
  })

  it('carries every inline comment through to the agent', () => {
    const c = new FeedbackCoalescer()
    c.add(base({ kind: 'review_submitted', state: 'changes_requested', body: 'See comments.' }))
    c.add(base({ file: 'src/a.ts', line: 3, body: 'rename this' }))

    const [result] = c.flush(at(9000))
    const event = result?.event
    if (event?.type !== 'review_changes_requested') throw new Error('wrong event')

    expect(event.feedback.body).toContain('See comments.')
    expect(event.feedback.items).toEqual([{ file: 'src/a.ts', line: 3, body: 'rename this' }])
  })

  it('waits for the window before emitting, so a burst is not split', () => {
    const c = new FeedbackCoalescer({ windowMs: 3000 })
    c.add(base({ body: 'first', receivedAt: at(1000) }))

    expect(c.flush(at(2000))).toHaveLength(0)

    c.add(base({ body: 'second', receivedAt: at(2500) }))
    expect(c.flush(at(3000))).toHaveLength(0)
    expect(c.flush(at(6000))).toHaveLength(1)
  })

  it('can be drained immediately, for a short-lived CI run', () => {
    const c = new FeedbackCoalescer()
    c.add(base({ body: 'urgent' }))
    expect(c.flush(at(1000), { force: true })).toHaveLength(1)
  })

  it('keeps runs separate', () => {
    const c = new FeedbackCoalescer()
    c.add(base({ runId: 'run-A', body: 'for A' }))
    c.add(base({ runId: 'run-B', body: 'for B' }))
    expect(c.flush(at(9000))).toHaveLength(2)
  })
})

describe('bot filtering', () => {
  it('ignores the agent talking to itself', () => {
    // A pipeline that treats its own agent's comments as feedback never terminates, and it is
    // not obvious from the outside that it is looping.
    const c = new FeedbackCoalescer({ botLogins: ['Copilot'] })
    expect(c.add(base({ actor: 'Copilot', body: 'I have pushed a fix' }))).toBe(false)
    expect(c.flush(at(9000), { force: true })).toHaveLength(0)
  })

  it('ignores any [bot] account without needing it configured', () => {
    const c = new FeedbackCoalescer()
    expect(c.add(base({ actor: 'dependabot[bot]', body: 'bumping' }))).toBe(false)
  })

  it('still accepts humans in the same burst as bots', () => {
    const c = new FeedbackCoalescer({ botLogins: ['Copilot'] })
    c.add(base({ actor: 'Copilot', body: 'pushed' }))
    c.add(base({ actor: 'a-human', body: 'not quite' }))
    expect(c.flush(at(9000))).toHaveLength(1)
  })
})

describe('noise', () => {
  it('ignores an empty comment, which is a reaction rather than feedback', () => {
    const c = new FeedbackCoalescer()
    expect(c.add(base({ kind: 'issue_comment', body: '   ' }))).toBe(false)
  })

  it('does not emit an event for a burst containing nothing actionable', () => {
    const c = new FeedbackCoalescer()
    c.add(base({ kind: 'review_submitted', state: 'commented', body: '' }))
    expect(c.flush(at(9000), { force: true })).toHaveLength(0)
  })
})

describe('approval', () => {
  it('emits approval immediately rather than holding it in the window', () => {
    const c = new FeedbackCoalescer({ windowMs: 3000 })
    c.add(base({ kind: 'review_submitted', state: 'approved', receivedAt: at(1000) }))
    const out = c.flush(at(9000))
    expect(out[0]?.event.type).toBe('review_approved')
  })

  it('prefers the feedback when a burst contains both', () => {
    // Someone approving and then immediately commenting means the comments matter.
    const c = new FeedbackCoalescer()
    c.add(base({ kind: 'review_submitted', state: 'changes_requested', body: 'one more thing' }))
    c.add(base({ file: 'src/a.ts', body: 'here' }))
    expect(c.flush(at(9000))[0]?.event.type).toBe('review_changes_requested')
  })
})

describe('dedupe keys', () => {
  it('gives a redelivered review the same key despite a new delivery id', () => {
    // Forges redeliver routinely, and a redelivery arrives with a *fresh* delivery id — so
    // keying on that id would let the same review through twice as new feedback.
    const first = new FeedbackCoalescer()
    first.add(base({ body: 'use the shared helper', deliveryId: 'delivery-1' }))
    const a = first.flush(at(9000))[0]

    const second = new FeedbackCoalescer()
    second.add(base({ body: 'use the shared helper', deliveryId: 'delivery-2-redelivery' }))
    const b = second.flush(at(9000))[0]

    expect(a?.dedupeKey).toBe(b?.dedupeKey)
  })

  it('gives genuinely different feedback different keys', () => {
    const c1 = new FeedbackCoalescer()
    c1.add(base({ body: 'first point' }))
    const c2 = new FeedbackCoalescer()
    c2.add(base({ body: 'a completely different point' }))

    expect(c1.flush(at(9000))[0]?.dedupeKey).not.toBe(c2.flush(at(9000))[0]?.dedupeKey)
  })

  it('distinguishes rounds, so a second review is not mistaken for a redelivery', () => {
    const round1 = new FeedbackCoalescer({ currentRound: () => 0 })
    round1.add(base({ body: 'same words' }))
    const round2 = new FeedbackCoalescer({ currentRound: () => 1 })
    round2.add(base({ body: 'same words' }))

    expect(round1.flush(at(9000))[0]?.dedupeKey).not.toBe(round2.flush(at(9000))[0]?.dedupeKey)
  })
})

describe('round numbering', () => {
  it('numbers from the run, not from the delivery', () => {
    const c = new FeedbackCoalescer({ currentRound: () => 2 })
    c.add(base({ body: 'again' }))
    const event = c.flush(at(9000))[0]?.event
    if (event?.type !== 'review_changes_requested') throw new Error('wrong event')
    expect(event.feedback.round).toBe(3)
  })
})

describe('mergeFeedback', () => {
  it('returns null when there is nothing to say', () => {
    expect(mergeFeedback([base({ body: '' })], 0)).toBeNull()
  })

  it('falls back to a usable body when only inline comments arrived', () => {
    const merged = mergeFeedback([base({ file: 'src/a.ts', body: 'fix' })], 0)
    expect(merged?.body.length).toBeGreaterThan(0)
  })
})

describe('approval dedupe', () => {
  it('gives a redelivered approval the same key', () => {
    /*
     * `deliveryId` is an HTTP header rather than part of the payload, so nothing ever set one
     * and the key fell through to `receivedAt` — a fresh timestamp per invocation. The guard
     * looked durable and matched nothing.
     */
    const approval = (receivedAt: number) => ({
      kind: 'review_submitted' as const,
      runId: 'run-1',
      actor: 'alice',
      state: 'approved' as const,
      receivedAt,
    })

    const first = new FeedbackCoalescer()
    first.add(approval(1_000))
    const second = new FeedbackCoalescer()
    second.add(approval(9_999))

    const a = first.flush(2_000, { force: true })[0]
    const b = second.flush(11_000, { force: true })[0]

    expect(a?.dedupeKey).toBe(b?.dedupeKey)
  })

  it('gives a later approval a different key, so it still applies', () => {
    // Approve, changes requested, approve again is three events and two of them are real.
    const approval = {
      kind: 'review_submitted' as const,
      runId: 'run-1',
      actor: 'alice',
      state: 'approved' as const,
      receivedAt: 1_000,
    }

    const early = new FeedbackCoalescer({ currentRound: () => 0 })
    early.add(approval)
    const later = new FeedbackCoalescer({ currentRound: () => 1 })
    later.add(approval)

    expect(early.flush(2_000, { force: true })[0]?.dedupeKey).not.toBe(
      later.flush(2_000, { force: true })[0]?.dedupeKey,
    )
  })
})

describe('the pull request closing', () => {
  it('turns a merge into the run completing', () => {
    /*
     * `pr_merged` was declared on WebhookEvent, produced by the normaliser and counted as
     * accepted — and then dropped. It carries no body and no file, so `mergeFeedback` returned
     * null and `flush` skipped it. A merged pull request left its run sitting in review while
     * the CLI reported "1 accepted" and exited 0.
     */
    const c = new FeedbackCoalescer()
    expect(c.add(base({ kind: 'pr_merged', actor: 'system', receivedAt: at(1000) }))).toBe(true)

    const out = c.flush(at(1000), { force: true })
    expect(out).toHaveLength(1)
    expect(out[0]?.event.type).toBe('review_approved')
  })

  it('turns a close without a merge into a cancellation', () => {
    const c = new FeedbackCoalescer()
    c.add(base({ kind: 'pr_closed', actor: 'system', receivedAt: at(1000) }))

    const [result] = c.flush(at(1000), { force: true })
    const event = result?.event
    if (event?.type !== 'cancelled') throw new Error(`expected cancelled, got ${event?.type}`)
    expect(event.reason).toContain('without merging')
  })

  it('does not wait out the window for it', () => {
    // Nothing can arrive that would change what a closed pull request means, so there is
    // nothing to gather. The window applied to every group regardless.
    const c = new FeedbackCoalescer({ windowMs: 60_000 })
    c.add(base({ kind: 'pr_merged', actor: 'system', receivedAt: at(1000) }))

    expect(c.flush(at(1001))).toHaveLength(1)
  })

  it('outranks a comment that arrived in the same burst', () => {
    // Emitting both hands the machine "this run is done" and "this run needs another round"
    // from one burst, and which won depended on Map insertion order.
    const c = new FeedbackCoalescer()
    c.add(base({ file: 'src/a.ts', line: 2, body: 'a nit', receivedAt: at(1000) }))
    c.add(base({ kind: 'pr_merged', actor: 'system', receivedAt: at(1100) }))

    const out = c.flush(at(9000))
    expect(out).toHaveLength(1)
    expect(out[0]?.event.type).toBe('review_approved')
  })

  it('keys a redelivered close the same way however many rounds have passed', () => {
    const closed = base({ kind: 'pr_merged' as const, actor: 'system' })
    const first = new FeedbackCoalescer({ currentRound: () => 0 })
    first.add(closed)
    const later = new FeedbackCoalescer({ currentRound: () => 3 })
    later.add(closed)

    expect(first.flush(at(9000))[0]?.dedupeKey).toBe(later.flush(at(9000))[0]?.dedupeKey)
  })
})

describe('an approval carrying notes', () => {
  it('is not delayed behind the coalescing window', () => {
    // `add` says an approval "should not be delayed behind a window", and then `flush` applied
    // the window to it anyway. A caller draining without `force` saw nothing.
    const c = new FeedbackCoalescer({ windowMs: 60_000 })
    c.add(base({ kind: 'review_submitted', state: 'approved', actor: 'alice', receivedAt: at(1000) }))

    expect(c.flush(at(1001))).toHaveLength(1)
    expect(c.flush(at(1001))).toHaveLength(0)
  })

  it('does not also request changes for the same run', () => {
    /*
     * Approving while leaving inline comments is one click. It put the approval in one group
     * and the comments in another, and both were emitted — so the run was told it was complete
     * and that it needed another round. GitHub's own semantics say an APPROVED review carries
     * non-blocking notes, so the approval is what survives.
     */
    const c = new FeedbackCoalescer()
    c.add(base({ kind: 'review_submitted', state: 'approved', actor: 'alice', receivedAt: at(1000) }))
    c.add(base({ file: 'src/a.ts', line: 4, body: 'nit: naming', actor: 'alice', receivedAt: at(1100) }))

    const out = c.flush(at(9000))
    expect(out.map((o) => o.event.type)).toEqual(['review_approved'])
  })
})
