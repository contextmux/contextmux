import { describe, expect, it } from 'vitest'
import { FakeGitHub } from '@contextmux/forge-github'
import { fakeTask, runAgentContract } from '@contextmux/core'
import { CopilotAgent, COPILOT_LOGINS } from '../src/index.js'

/** A fake repository where Copilot is available as an assignee. */
function enabled(): FakeGitHub {
  const fake = new FakeGitHub()
  fake.suggestedActors = [
    { __typename: 'User', login: 'a-human' },
    { __typename: 'Bot', login: 'copilot-swe-agent', id: 'BOT_this_repo' },
  ]
  return fake
}

const agentFor = (fake: FakeGitHub) =>
  new CopilotAgent({ client: fake, repo: { owner: 'o', repo: 'r' }, pollIntervalMs: 1 })

describe('actor discovery', () => {
  it('resolves the bot id for this repository rather than assuming one', async () => {
    // A hard-coded id works on the repository it was written against and fails silently
    // everywhere else, which is the failure mode this whole method exists to prevent.
    const fake = enabled()
    const agent = agentFor(fake)

    expect(await agent.preflight()).toMatchObject({ ok: true })
    expect(fake.graphqlCalls[0]?.query).toContain('suggestedActors')
    expect(fake.graphqlCalls[0]?.headers).toHaveProperty('GraphQL-Features')
  })

  it('fails loudly and actionably when Copilot is not enabled', async () => {
    const fake = new FakeGitHub()
    fake.suggestedActors = [{ __typename: 'User', login: 'a-human' }]

    const health = await agentFor(fake).preflight()

    expect(health.ok).toBe(false)
    expect(health.detail).toContain('Enable the Copilot coding agent')
  })

  it('does not fall back to a guessed id', async () => {
    const fake = new FakeGitHub()
    fake.suggestedActors = []
    await expect(agentFor(fake).delegate({ task: fakeTask(), prompt: 'x' })).rejects.toThrow(
      /not available as an assignee/,
    )
    // Nothing should have been created for work nobody can pick up.
    expect(fake.issues.size).toBe(0)
  })

  it('caches the resolved id across calls', async () => {
    const fake = enabled()
    const agent = agentFor(fake)
    await agent.preflight()
    await agent.preflight()
    expect(fake.graphqlCalls.filter((c) => c.query.includes('suggestedActors'))).toHaveLength(1)
  })
})

describe('delegation', () => {
  it('creates an issue carrying the task and assigns it', async () => {
    const fake = enabled()
    const handle = await agentFor(fake).delegate({
      task: fakeTask({ id: 'T-9' }),
      prompt: 'Do the thing, carefully.',
    })

    const issue = fake.issues.get(Number(handle.ref))
    expect(issue?.title).toBe('[T-9] Add a currency formatting helper')
    expect(issue?.body).toBe('Do the thing, carefully.')
    expect(issue?.labels.map((l) => l.name)).toContain('task:T-9')
    expect(issue?.assignees).toEqual([{ login: 'Copilot' }])
  })

  it('closes the issue when assignment fails, rather than leaving an orphan', async () => {
    // An unassigned issue looks like queued work forever. A run that fails cleanly is
    // recoverable; one that leaves debris behind is not.
    const fake = enabled()
    const agent = agentFor(fake)
    await agent.preflight()

    const originalGraphql = fake.graphql.bind(fake)
    fake.graphql = async (query, vars, headers) => {
      if (query.includes('replaceActorsForAssignable')) throw new Error('token lacks permission')
      return originalGraphql(query, vars, headers)
    }

    await expect(agent.delegate({ task: fakeTask(), prompt: 'x' })).rejects.toThrow(/token lacks permission/)

    const issue = [...fake.issues.values()][0]
    expect(issue?.state).toBe('closed')
    expect(fake.comments.some((c) => c.body.includes('Could not assign Copilot'))).toBe(true)
  })
})

describe('observation', () => {
  it('reports nothing while no pull request exists', async () => {
    const fake = enabled()
    const handle = await agentFor(fake).delegate({ task: fakeTask(), prompt: 'x' })
    expect(await agentFor(fake).observe(handle)).toBeNull()
  })

  it('treats a draft pull request as still in progress', async () => {
    // Treating a draft as finished sends a half-written change to review, and the agent keeps
    // pushing to it afterwards.
    const fake = enabled()
    const agent = agentFor(fake)
    const handle = await agent.delegate({ task: fakeTask(), prompt: 'x' })
    fake.addPull({ number: 20, closesIssue: Number(handle.ref), draft: true })

    expect(await agent.observe(handle)).toBeNull()
  })

  it('resolves once the pull request is ready', async () => {
    const fake = enabled()
    const agent = agentFor(fake)
    const handle = await agent.delegate({ task: fakeTask(), prompt: 'x' })
    fake.addPull({
      number: 20,
      closesIssue: Number(handle.ref),
      draft: false,
      files: ['src/a.ts', 'test/a.test.ts'],
      body: 'Added the helper.',
    })

    const result = await agent.observe(handle)

    expect(result?.status).toBe('succeeded')
    expect(result?.filesChanged).toEqual(['src/a.ts', 'test/a.test.ts'])
    expect(result?.location?.prUrl).toContain('/pull/20')
  })

  it('treats a pull request closed without merging as a failure', async () => {
    const fake = enabled()
    const agent = agentFor(fake)
    const handle = await agent.delegate({ task: fakeTask(), prompt: 'x' })
    fake.addPull({ number: 21, closesIssue: Number(handle.ref), state: 'closed', merged: false })

    const result = await agent.observe(handle)

    expect(result?.status).toBe('failed')
    expect(result?.error).toContain('closed without merging')
  })

  it('rejects a malformed handle instead of querying with NaN', async () => {
    const result = await agentFor(enabled()).observe({ ref: 'not-a-number', agentId: 'copilot' })
    expect(result?.status).toBe('failed')
    expect(result?.error).toContain('invalid handle')
  })
})

describe('revision rounds', () => {
  it('comments on the pull request, which is where the agent is listening', async () => {
    const fake = enabled()
    const agent = agentFor(fake)
    const handle = await agent.delegate({ task: fakeTask(), prompt: 'x' })
    fake.addPull({ number: 30, closesIssue: Number(handle.ref) })

    await agent.nudge(handle, { round: 2, source: 'reviewer', body: 'use the shared helper' })

    const comment = fake.comments.at(-1)
    expect(comment?.number).toBe(30)
    expect(comment?.body).toContain('@copilot')
    expect(comment?.body).toContain('Revision round 2')
    expect(comment?.body).toContain('use the shared helper')
  })

  it('falls back to the issue when no pull request was opened', async () => {
    const fake = enabled()
    const agent = agentFor(fake)
    const handle = await agent.delegate({ task: fakeTask(), prompt: 'x' })

    await agent.nudge(handle, { round: 1, source: 'gates', body: 'nothing was produced' })

    expect(fake.comments.at(-1)?.number).toBe(Number(handle.ref))
  })

  it('includes per-file review comments', async () => {
    const fake = enabled()
    const agent = agentFor(fake)
    const handle = await agent.delegate({ task: fakeTask(), prompt: 'x' })
    fake.addPull({ number: 31, closesIssue: Number(handle.ref) })

    await agent.nudge(handle, {
      round: 1,
      source: 'reviewer',
      body: 'see comments',
      items: [{ file: 'src/a.ts', line: 12, body: 'rename this' }],
    })

    expect(fake.comments.at(-1)?.body).toContain('`src/a.ts:12` — rename this')
  })
})

describe('review feedback collection', () => {
  it('gathers human review into feedback and ignores the agent itself', async () => {
    const fake = enabled()
    const agent = agentFor(fake)
    const handle = await agent.delegate({ task: fakeTask(), prompt: 'x' })
    fake.addPull({ number: 40, closesIssue: Number(handle.ref) })
    fake.reviews.set(40, [
      { id: 1, user: { login: 'Copilot' }, state: 'COMMENTED', body: 'I did the thing', submitted_at: '' },
      { id: 2, user: { login: 'a-human' }, state: 'CHANGES_REQUESTED', body: 'Use Intl', submitted_at: '' },
    ])

    const feedback = await agent.collectReviewFeedback(handle, 1)

    expect(feedback?.body).toContain('Use Intl')
    expect(feedback?.body).not.toContain('I did the thing')
    expect(COPILOT_LOGINS).toContain('Copilot')
  })

  it('returns nothing when only the agent has spoken', async () => {
    const fake = enabled()
    const agent = agentFor(fake)
    const handle = await agent.delegate({ task: fakeTask(), prompt: 'x' })
    fake.addPull({ number: 41, closesIssue: Number(handle.ref) })
    fake.reviews.set(41, [
      { id: 1, user: { login: 'copilot-swe-agent[bot]' }, state: 'CHANGES_REQUESTED', body: 'hmm', submitted_at: '' },
    ])

    expect(await agent.collectReviewFeedback(handle, 1)).toBeNull()
  })
})

describe('CopilotAgent contract', () => {
  runAgentContract(
    { it, expect: expect as never },
    { setup: () => ({ agent: agentFor(enabled()) }) },
  )
})

describe('regressions', () => {
  it('does not report the unchanged pull request as a new result after a nudge', async () => {
    /*
     * The revision round used to resolve on its first poll. The pull request looked exactly as
     * it had before the feedback was posted, `observe` called that a success, the gates failed
     * again on identical content, and the run burned every round it had — all before Copilot
     * had read a word of the feedback.
     */
    const fake = enabled()
    const agent = agentFor(fake)
    const handle = await agent.delegate({ task: fakeTask(), prompt: 'x' })
    fake.addPull({ number: 30, closesIssue: Number(handle.ref), draft: false })

    expect(await agent.observe(handle)).toMatchObject({ status: 'succeeded' })

    await agent.nudge(handle, { round: 1, source: 'gates', body: 'fix the scope violation' })
    expect(await agent.observe(handle)).toBeNull()
  })

  it('resolves once the agent has actually pushed something', async () => {
    const fake = enabled()
    const agent = agentFor(fake)
    const handle = await agent.delegate({ task: fakeTask(), prompt: 'x' })
    const pr = fake.addPull({ number: 30, closesIssue: Number(handle.ref), draft: false })

    await agent.nudge(handle, { round: 1, source: 'gates', body: 'fix the scope violation' })
    pr.updated_at = new Date(Date.now() + 60_000).toISOString()

    expect(await agent.observe(handle)).toMatchObject({ status: 'succeeded' })
  })

  it('measures the nudge against the forge clock, not this machine', async () => {
    /*
     * `observe` compares the stored mark against `Date.parse(pr.updatedAt)`, which GitHub
     * stamps — and `nudge` stored `Date.now()`, which this machine stamps. Any local clock
     * running ahead of the forge makes every subsequent push look older than the nudge, so
     * `observe` returns null until wall-clock time catches up and the run polls to its timeout.
     *
     * Both timestamps here sit in the past relative to the test machine, which is what a local
     * clock running fast looks like from the inside.
     */
    const fake = enabled()
    const agent = agentFor(fake)
    const handle = await agent.delegate({ task: fakeTask(), prompt: 'x' })
    const pr = fake.addPull({ number: 30, closesIssue: Number(handle.ref), draft: false })
    pr.updated_at = '2026-01-01T00:00:00Z'

    await agent.nudge(handle, { round: 1, source: 'gates', body: 'fix the scope violation' })

    // Copilot pushes. The forge advances its own clock; this machine's is irrelevant.
    pr.updated_at = '2026-01-02T00:00:00Z'

    expect(await agent.observe(handle)).toMatchObject({ status: 'succeeded' })
  })

  it('still ignores a pull request the nudge did not move', async () => {
    // The other half: reading the timestamp off the forge must not make every poll look new.
    const fake = enabled()
    const agent = agentFor(fake)
    const handle = await agent.delegate({ task: fakeTask(), prompt: 'x' })
    const pr = fake.addPull({ number: 30, closesIssue: Number(handle.ref), draft: false })
    pr.updated_at = '2026-01-01T00:00:00Z'

    await agent.nudge(handle, { round: 1, source: 'gates', body: 'fix the scope violation' })

    expect(await agent.observe(handle)).toBeNull()
  })

  it('reports a failure rather than an empty change when the file list cannot be read', async () => {
    /*
     * The file list is the input to the scope gate. Swallowing an API failure into `[]` reports
     * a pull request that touched nothing, which passes every path check there is — a clean
     * verdict on a change nobody read.
     */
    const fake = enabled()
    const agent = agentFor(fake)
    const handle = await agent.delegate({ task: fakeTask(), prompt: 'x' })
    fake.addPull({ number: 30, closesIssue: Number(handle.ref), draft: false })

    const originalRest = fake.rest.bind(fake)
    fake.rest = async (method, p, body) => {
      if (p.includes('/files')) throw new Error('rate limited')
      return originalRest(method, p, body)
    }

    const result = await agent.observe(handle)

    expect(result?.status).toBe('failed')
    expect(result?.error).toContain('could not read the files changed')
  })
})

describe('an artefact too large for an issue body', () => {
  it('refuses before calling GitHub, naming both sizes', async () => {
    /*
     * A 422 from the create call arrives after preflight has passed and reported everything
     * fine, so the run looks healthy right up to the one step that was always going to fail.
     * On a real board the artefact came to 151,604 characters against a 65,536 limit.
     */
    const fake = enabled()
    const agent = agentFor(fake)

    await expect(
      agent.delegate({ task: fakeTask({ id: 'T-1' }), prompt: 'x'.repeat(70_000) }),
    ).rejects.toThrow(/65,536|issue body/)

    // And nothing was created on the way to failing.
    expect(fake.issues.size).toBe(0)
  })

  it('delegates normally when it fits', async () => {
    const fake = enabled()
    const agent = agentFor(fake)
    const handle = await agent.delegate({ task: fakeTask({ id: 'T-2' }), prompt: 'a reasonable prompt' })
    expect(handle.ref).toBeTruthy()
  })
})

describe('when Copilot has actually finished', () => {
  it('treats a draft with a review request as done', async () => {
    /*
     * Copilot never marks its own pull request ready. It commits, writes its summary into the
     * description, requests a review from whoever assigned the issue, and leaves the draft flag
     * set for a human to clear. On a real run the agent finished in a couple of minutes and the
     * poll was still going twelve minutes later, waiting for a flag that does not change.
     */
    const fake = enabled()
    const agent = agentFor(fake)
    const handle = await agent.delegate({ task: fakeTask(), prompt: 'x' })
    fake.addPull({
      number: 779,
      closesIssue: Number(handle.ref),
      draft: true,
      requested_reviewers: [{ login: 'esmaeilabedi-sp' }],
    })

    expect(await agent.observe(handle)).toMatchObject({ status: 'succeeded' })
  })

  it('still waits on a draft nobody has been asked to review', async () => {
    // The mistake in the other direction: treating any draft as finished sends half-written
    // work to the gates while the agent is still pushing to it.
    const fake = enabled()
    const agent = agentFor(fake)
    const handle = await agent.delegate({ task: fakeTask(), prompt: 'x' })
    fake.addPull({ number: 780, closesIssue: Number(handle.ref), draft: true, requested_reviewers: [] })

    expect(await agent.observe(handle)).toBeNull()
  })

  it('still resolves a pull request that was marked ready the ordinary way', async () => {
    const fake = enabled()
    const agent = agentFor(fake)
    const handle = await agent.delegate({ task: fakeTask(), prompt: 'x' })
    fake.addPull({ number: 781, closesIssue: Number(handle.ref), draft: false })

    expect(await agent.observe(handle)).toMatchObject({ status: 'succeeded' })
  })
})

describe('clearing the draft flag once the gates have passed', () => {
  it('marks the pull request ready for review', async () => {
    /*
     * Copilot never does this itself. So a run whose gates passed still read as unfinished to
     * everyone looking at the repository: the ticket said in review, the pull request said work
     * in progress, and the reviewer it had asked for could not merge what it had written.
     */
    const fake = enabled()
    const agent = agentFor(fake)
    const handle = await agent.delegate({ task: fakeTask(), prompt: 'x' })
    const pr = fake.addPull({ number: 900, closesIssue: Number(handle.ref), draft: true })

    const url = await agent.markReady(handle)

    expect(url).toBe(pr.html_url)
    expect(fake.pulls.get(900)?.draft).toBe(false)
  })

  it('says there was nothing to mark when it is already open for review', async () => {
    // The desired end state, not a failure — and losing a completed run over it would be the
    // wrong trade.
    const fake = enabled()
    const agent = agentFor(fake)
    const handle = await agent.delegate({ task: fakeTask(), prompt: 'x' })
    fake.addPull({ number: 901, closesIssue: Number(handle.ref), draft: false })

    expect(await agent.markReady(handle)).toBeNull()
  })

  it('says nothing to mark when no pull request exists', async () => {
    const fake = enabled()
    const agent = agentFor(fake)
    const handle = await agent.delegate({ task: fakeTask(), prompt: 'x' })

    expect(await agent.markReady(handle)).toBeNull()
  })
})
