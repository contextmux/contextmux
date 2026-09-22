/**
 * `notifyOutcome` — which run states are worth interrupting someone over, and what gets sent.
 */
import { describe, expect, it } from 'vitest'
import { createRun, fakeTask, type Notifier, type Run } from '@contextmux/core'
import { notifyOutcome } from '../src/commands/run.js'

function runAt(state: Run['state'], overrides: Partial<Run> = {}): Run {
  return { ...createRun(fakeTask()), state, ...overrides }
}

function fakeNotifier(id: string): Notifier & { sent: Array<{ level: string; title: string; body: string; runId?: string }> } {
  const sent: Array<{ level: string; title: string; body: string; runId?: string }> = []
  return {
    id,
    sent,
    async send(event) {
      sent.push(event)
    },
  }
}

describe('notifyOutcome', () => {
  it('does nothing when nothing is configured', async () => {
    await notifyOutcome([], fakeTask(), runAt('escalated'))
    // Nothing to assert beyond "did not throw" — there is no notifier to have called.
  })

  it('alerts on escalation', async () => {
    const notifier = fakeNotifier('slack')
    await notifyOutcome([notifier], fakeTask({ id: 'T-1' }), runAt('escalated'))

    expect(notifier.sent).toHaveLength(1)
    expect(notifier.sent[0]!.level).toBe('warn')
    expect(notifier.sent[0]!.title).toContain('T-1')
    expect(notifier.sent[0]!.title).toContain('needs a human')
  })

  it('alerts on failure', async () => {
    const notifier = fakeNotifier('slack')
    await notifyOutcome([notifier], fakeTask({ id: 'T-1' }), runAt('failed'))

    expect(notifier.sent).toHaveLength(1)
    expect(notifier.sent[0]!.level).toBe('error')
    expect(notifier.sent[0]!.title).toContain('failed')
  })

  it('says nothing for states that are not worth interrupting anyone over', async () => {
    const notifier = fakeNotifier('slack')
    for (const state of ['discovered', 'ready', 'working', 'proposed', 'in_review', 'revising', 'completed', 'rejected'] as const) {
      await notifyOutcome([notifier], fakeTask(), runAt(state))
    }
    expect(notifier.sent).toHaveLength(0)
  })

  it('notifies every configured notifier, not just the first', async () => {
    const slack = fakeNotifier('slack')
    const teams = fakeNotifier('teams')
    await notifyOutcome([slack, teams], fakeTask(), runAt('escalated'))

    expect(slack.sent).toHaveLength(1)
    expect(teams.sent).toHaveLength(1)
  })

  it('keeps going when one notifier fails, rather than losing the other', async () => {
    const broken: Notifier = { id: 'broken', send: async () => { throw new Error('webhook down') } }
    const slack = fakeNotifier('slack')

    await notifyOutcome([broken, slack], fakeTask(), runAt('escalated'))

    expect(slack.sent).toHaveLength(1)
  })

  it('carries the run id and terminal reason through', async () => {
    const notifier = fakeNotifier('slack')
    const run = runAt('escalated', { id: 'run-T-9', terminalReason: 'gave up after 2 rounds\nmore detail' })

    await notifyOutcome([notifier], fakeTask(), run)

    expect(notifier.sent[0]!.runId).toBe('run-T-9')
    expect(notifier.sent[0]!.body).toContain('gave up after 2 rounds')
    expect(notifier.sent[0]!.body).not.toContain('more detail')
  })
})
