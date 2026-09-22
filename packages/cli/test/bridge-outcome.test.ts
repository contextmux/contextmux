/**
 * `bridgeOutcomeMessage` — what `run` tells a bridged task's source ticket, and when.
 *
 * The network half (resolving the source tracker, posting the comment) is not exercised here:
 * nothing in this suite drives a real agent to a terminal state end to end, so it is verified by
 * hand against a real tracker instead — see the manual bridge walkthrough. What is worth pinning
 * with a fast test is the decision this function makes on its own: which states are reportable,
 * how each reads, and whether a pull request url rides along.
 */
import { describe, expect, it } from 'vitest'
import { createRun, fakeTask, type Run } from '@contextmux/core'
import { bridgeOutcomeMessage } from '../src/commands/run.js'
import { bridgeLabel } from '../src/bridge.js'

function runAt(state: Run['state'], overrides: Partial<Run> = {}): Run {
  return { ...createRun(fakeTask()), state, ...overrides }
}

describe('bridgeOutcomeMessage', () => {
  it('says nothing when the task was never bridged', () => {
    const task = fakeTask({ labels: ['bug'] })
    expect(bridgeOutcomeMessage(task, runAt('completed'))).toBeNull()
  })

  it('says nothing while the run is still in progress', () => {
    const task = fakeTask({ labels: [bridgeLabel('jira', 'PDC-1')] })
    for (const state of ['discovered', 'ready', 'working', 'proposed', 'revising'] as const) {
      expect(bridgeOutcomeMessage(task, runAt(state))).toBeNull()
    }
  })

  it('names the source ticket once the run reaches a reportable state', () => {
    const task = fakeTask({ labels: [bridgeLabel('jira', 'PDC-6647')], origin: { tracker: 'github', id: '814', url: 'https://github.com/o/r/issues/814' } })
    const outcome = bridgeOutcomeMessage(task, runAt('completed'))

    expect(outcome).not.toBeNull()
    expect(outcome!.bridge).toEqual({ tracker: 'jira', id: 'PDC-6647' })
    expect(outcome!.body).toContain('https://github.com/o/r/issues/814')
    expect(outcome!.body).toContain('completed')
  })

  it('reads distinctly for each reportable state', () => {
    const task = fakeTask({ labels: [bridgeLabel('jira', 'PDC-1')] })
    expect(bridgeOutcomeMessage(task, runAt('escalated'))!.body).toContain('escalated to a human')
    expect(bridgeOutcomeMessage(task, runAt('failed'))!.body).toContain('failed')
    expect(bridgeOutcomeMessage(task, runAt('rejected'))!.body).toContain('rejected at the gates')
    expect(bridgeOutcomeMessage(task, runAt('in_review'))!.body).toContain('awaiting review')
  })

  it('includes the pull request url when the run produced one', () => {
    const task = fakeTask({ labels: [bridgeLabel('github', '9')] })
    const outcome = bridgeOutcomeMessage(
      task,
      runAt('completed', { result: { status: 'succeeded', filesChanged: ['a.ts'], summary: 'done', location: { prUrl: 'https://github.com/o/r/pull/5' } } }),
    )
    expect(outcome!.body).toContain('https://github.com/o/r/pull/5')
  })

  it('says nothing extra when there is no pull request to point at', () => {
    // A delegated agent that escalated, say — there may never be one.
    const task = fakeTask({ labels: [bridgeLabel('jira', 'PDC-1')] })
    const outcome = bridgeOutcomeMessage(task, runAt('escalated'))
    expect(outcome!.body.split('\n')).toHaveLength(1)
  })
})
