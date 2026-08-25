import { describe, expect, it } from 'vitest'
import { FakeGitHub } from '@contextmux/forge-github'
import { runTrackerContract } from '@contextmux/core'
import { GitHubTracker, STATE_LABELS } from '../src/index.js'

function setup() {
  const fake = new FakeGitHub()
  fake.addIssue({
    title: 'Add a formatter',
    body: 'Format values.\n\n## Acceptance criteria\n- A helper exists\n- It is tested',
    labels: [{ name: 'agent-ok' }],
  })
  const tracker = new GitHubTracker({ client: fake, repo: { owner: 'o', repo: 'r' }, label: 'agent-ok' })
  return { fake, tracker }
}

describe('GitHubTracker contract', () => {
  runTrackerContract(
    { it, expect: expect as never },
    { setup: () => ({ tracker: setup().tracker, taskId: '1' }) },
  )
})

describe('GitHubTracker behaviour', () => {
  it('reads acceptance criteria out of the issue body', async () => {
    const { tracker } = setup()
    const spec = await tracker.get('1')
    expect(spec?.acceptanceCriteria.map((c) => c.text)).toEqual(['A helper exists', 'It is tested'])
  })

  it('only offers issues carrying the opt-in label', async () => {
    const { fake, tracker } = setup()
    fake.addIssue({ title: 'not opted in' })
    expect((await tracker.listReady()).map((t) => t.title)).toEqual(['Add a formatter'])
  })

  it('does not offer work that is already in flight', async () => {
    const { fake, tracker } = setup()
    fake.addIssue({ title: 'in flight', labels: [{ name: 'agent-ok' }, { name: STATE_LABELS.in_progress }] })
    expect((await tracker.listReady()).map((t) => t.title)).toEqual(['Add a formatter'])
  })

  it('never returns a pull request as a task', async () => {
    const { fake, tracker } = setup()
    fake.addPull({ number: 50 })
    expect((await tracker.listReady()).map((t) => t.id)).toEqual(['1'])
  })

  it('replaces the previous state label rather than accumulating them', async () => {
    const { fake, tracker } = setup()
    await tracker.transition('1', 'in_progress')
    await tracker.transition('1', 'in_review')

    const labels = fake.issues.get(1)?.labels.map((l) => l.name) ?? []
    expect(labels).toContain(STATE_LABELS.in_review)
    expect(labels).not.toContain(STATE_LABELS.in_progress)
  })

  it('closes the issue when the task is done', async () => {
    // Leaving finished work open is how a board fills up with things nobody needs to see.
    const { fake, tracker } = setup()
    await tracker.transition('1', 'done')
    expect(fake.issues.get(1)?.state).toBe('closed')
  })

  it('keeps bookkeeping labels out of the spec, so they cannot reach a gate', async () => {
    const { fake, tracker } = setup()
    await tracker.transition('1', 'in_progress')
    const spec = await tracker.get('1')
    expect(spec?.labels).toEqual(['agent-ok'])
  })

  it('returns null for a non-numeric id instead of querying with NaN', async () => {
    const { tracker } = setup()
    expect(await tracker.get('ABC-1234')).toBeNull()
  })
})

describe('issue ids that are not issue numbers', () => {
  it('does not treat an empty id as issue zero', async () => {
    /*
     * The guard was `Number.isFinite(Number(id))`, and `Number('')` is `0`. An empty or
     * whitespace id therefore passed validation and addressed issue #0 — a misconfigured task
     * turning into a live call against the wrong thing rather than doing nothing.
     */
    const fake = new FakeGitHub()
    const tracker = new GitHubTracker({ client: fake, repo: { owner: 'o', repo: 'r' } })

    for (const id of ['', '   ', '0', '-3', '1.5', 'abc']) {
      expect(await tracker.get(id)).toBeNull()
      await tracker.comment(id, 'hello')
      await tracker.setLabels(id, ['x'], [])
      await tracker.transition(id, 'done')
    }

    expect(fake.comments).toEqual([])
    expect(fake.restCalls.filter((c) => c.method !== 'GET')).toEqual([])
  })

  it('still works for a real issue number', async () => {
    const fake = new FakeGitHub()
    const issue = fake.addIssue({ title: 'Real' })
    const tracker = new GitHubTracker({ client: fake, repo: { owner: 'o', repo: 'r' } })

    await tracker.comment(String(issue.number), 'hello')
    expect(fake.comments).toEqual([{ number: issue.number, body: 'hello' }])
  })
})
