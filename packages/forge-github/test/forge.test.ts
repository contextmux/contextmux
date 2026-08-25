import { describe, expect, it } from 'vitest'
import {
  FakeGitHub,
  GitHubApiError,
  GitHubForge,
  parseRepo,
  redact,
  reviewToFeedback,
  TokenClient,
} from '../src/index.js'

const forge = (fake: FakeGitHub) => new GitHubForge(fake, { owner: 'o', repo: 'r' })

describe('parseRepo', () => {
  it('accepts the forms people paste', () => {
    expect(parseRepo('owner/repo')).toEqual({ owner: 'owner', repo: 'repo' })
    expect(parseRepo('  owner/repo.git ')).toEqual({ owner: 'owner', repo: 'repo' })
  })

  it('rejects anything ambiguous rather than guessing', () => {
    for (const bad of ['repo', 'a/b/c', '']) {
      expect(() => parseRepo(bad)).toThrow(/owner\/repo/)
    }
  })
})

describe('redaction', () => {
  it('strips tokens from anything heading for a log', () => {
    expect(redact('failed with ghp_abcdefghijklmnopqrstuvwxyz012345')).toBe('failed with [REDACTED]')
    expect(redact('{"token": "s3cret-value"}')).toContain('[REDACTED]')
    expect(redact('Authorization: Bearer x')).not.toContain('Bearer x')
  })
})

describe('issues', () => {
  it('creates an issue with labels', async () => {
    const fake = new FakeGitHub()
    const issue = await forge(fake).createIssue({ title: 'Do a thing', body: 'details', labels: ['agent'] })
    expect(issue.number).toBe(1)
    expect(issue.labels).toEqual(['agent'])
  })

  it('excludes pull requests from the issue list', async () => {
    // GitHub returns PRs from the issues endpoint. A pipeline that forgets to filter treats
    // its own agent's pull request as a brand-new task.
    const fake = new FakeGitHub()
    fake.addIssue({ title: 'A real task' })
    fake.addPull({ number: 99 })

    const issues = await forge(fake).listIssues()
    expect(issues.map((i) => i.title)).toEqual(['A real task'])
  })

  it('filters by label', async () => {
    const fake = new FakeGitHub()
    fake.addIssue({ title: 'wanted', labels: [{ name: 'agent' }] })
    fake.addIssue({ title: 'ignored' })
    expect((await forge(fake).listIssues({ labels: ['agent'] })).map((i) => i.title)).toEqual(['wanted'])
  })

  it('returns null for a missing issue rather than throwing', async () => {
    expect(await forge(new FakeGitHub()).getIssue(404)).toBeNull()
  })

  it('treats removing an absent label as success', async () => {
    // The caller wants the label gone; it already is.
    const fake = new FakeGitHub()
    fake.addIssue({ title: 'x' })
    await expect(forge(fake).setLabels(1, [], ['never-existed'])).resolves.toBeUndefined()
  })

  it('adds and removes labels', async () => {
    const fake = new FakeGitHub()
    fake.addIssue({ title: 'x', labels: [{ name: 'old' }] })
    await forge(fake).setLabels(1, ['new'], ['old'])
    expect((await forge(fake).getIssue(1))?.labels).toEqual(['new'])
  })
})

describe('linked pull requests', () => {
  it('finds a pull request through the link, not the branch name', async () => {
    // Agents name branches however they like, so branch matching is unreliable. The linked-PR
    // relationship is the only dependable signal, and it exists only in GraphQL.
    const fake = new FakeGitHub()
    fake.addIssue({ title: 'task' })
    fake.addPull({ number: 7, closesIssue: 1, head: { ref: 'copilot/fix-abc123' } })

    const prs = await forge(fake).linkedPullRequests(1)
    expect(prs).toHaveLength(1)
    expect(prs[0]?.number).toBe(7)
    expect(prs[0]?.branch).toBe('copilot/fix-abc123')
  })

  it('returns nothing when no pull request references the issue', async () => {
    const fake = new FakeGitHub()
    fake.addIssue({ title: 'task' })
    fake.addPull({ number: 7 })
    expect(await forge(fake).linkedPullRequests(1)).toEqual([])
  })
})

describe('review feedback', () => {
  const review = (over: Partial<Parameters<typeof reviewToFeedback>[0][number]> = {}) => ({
    id: 1,
    author: 'human',
    state: 'CHANGES_REQUESTED' as const,
    body: 'Use the shared helper.',
    submittedAt: '2026-01-01T00:00:00Z',
    ...over,
  })

  it('turns a change request into feedback', () => {
    const fb = reviewToFeedback([review()], [], { round: 1 })
    expect(fb?.body).toContain('Use the shared helper.')
    expect(fb?.source).toBe('human')
    expect(fb?.round).toBe(1)
  })

  it('ignores bot reviews, which would otherwise loop forever', () => {
    // A pipeline treating its own review bot as human feedback never terminates, and it is not
    // obvious from the outside that it is doing so.
    const fb = reviewToFeedback([review({ author: 'github-actions[bot]' })], [], { round: 1 })
    expect(fb).toBeNull()
  })

  it('ignores a configured agent login', () => {
    const fb = reviewToFeedback([review({ author: 'Copilot' })], [], { round: 1, botLogins: ['Copilot'] })
    expect(fb).toBeNull()
  })

  it('carries inline comments through as per-file items', () => {
    const fb = reviewToFeedback([], [
      { id: 1, author: 'human', body: 'rename this', path: 'src/a.ts', line: 12, createdAt: '' },
    ], { round: 2 })
    expect(fb?.items).toEqual([{ file: 'src/a.ts', line: 12, body: 'rename this' }])
  })

  it('returns nothing when a review only approves', () => {
    const fb = reviewToFeedback([review({ state: 'APPROVED', body: 'nice' })], [], { round: 1 })
    expect(fb).toBeNull()
  })
})

describe('TokenClient', () => {
  const makeResponse = (status: number, body: unknown, headers: Record<string, string> = {}) =>
    new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json', ...headers },
    })

  it('retries a GET on a server error', async () => {
    let calls = 0
    const client = new TokenClient({
      token: 't',
      maxAttempts: 3,
      sleep: async () => {},
      fetchImpl: async () => {
        calls += 1
        return calls < 3 ? makeResponse(503, {}) : makeResponse(200, { ok: true })
      },
    })
    await expect(client.rest('GET', 'x')).resolves.toEqual({ ok: true })
    expect(calls).toBe(3)
  })

  it('never retries a POST, which would duplicate comments', async () => {
    let calls = 0
    const client = new TokenClient({
      token: 't',
      fetchImpl: async () => {
        calls += 1
        return makeResponse(503, {})
      },
    })
    await expect(client.rest('POST', 'x', {})).rejects.toThrow(GitHubApiError)
    expect(calls).toBe(1)
  })

  it('honours retry-after on a rate limit', async () => {
    let calls = 0
    const client = new TokenClient({
      token: 't',
      maxAttempts: 2,
      sleep: async () => {},
      fetchImpl: async () => {
        calls += 1
        return calls === 1 ? makeResponse(429, {}, { 'retry-after': '0' }) : makeResponse(200, { ok: true })
      },
    })
    await expect(client.rest('GET', 'x')).resolves.toEqual({ ok: true })
  })

  it('redacts the response body in the error it throws', async () => {
    const client = new TokenClient({
      token: 't',
      fetchImpl: async () => makeResponse(401, 'bad token ghp_abcdefghijklmnopqrstuvwxyz012345'),
    })
    await expect(client.rest('GET', 'x')).rejects.toThrow(/REDACTED/)
  })

  it('surfaces GraphQL errors rather than returning undefined data', async () => {
    const client = new TokenClient({
      token: 't',
      fetchImpl: async () => makeResponse(200, { errors: [{ message: 'Field does not exist' }] }),
    })
    await expect(client.graphql('query {}')).rejects.toThrow(/Field does not exist/)
  })
})

describe('reading every page', () => {
  /*
   * `pullRequestFiles` paginated and carried a comment explaining why a truncated list is
   * unacceptable for anything feeding a decision. The two endpoints directly below it — the
   * reviews and comments that become the agent's correction instructions — read one page and
   * stopped. GitHub returns these oldest-first, so the comments silently dropped were the
   * newest ones: exactly the feedback the agent was supposed to address.
   */
  const many = (n: number) => Array.from({ length: n }, (_, i) => i + 1)

  it('collects reviews beyond the first page', async () => {
    const fake = new FakeGitHub()
    fake.addPull({ number: 7 })
    fake.reviews.set(
      7,
      many(150).map((i) => ({
        id: i,
        user: { login: 'alice' },
        state: 'COMMENTED',
        body: `review ${i}`,
        submitted_at: '2026-01-01T00:00:00Z',
      })),
    )

    const reviews = await forge(fake).listReviews(7)
    expect(reviews).toHaveLength(150)
    expect(reviews.at(-1)?.body).toBe('review 150')
  })

  it('collects review comments beyond the first page', async () => {
    const fake = new FakeGitHub()
    fake.addPull({ number: 7 })
    fake.reviewComments.set(
      7,
      many(150).map((i) => ({
        id: i,
        user: { login: 'alice' },
        body: `comment ${i}`,
        path: 'src/a.ts',
        line: i,
        created_at: '2026-01-01T00:00:00Z',
      })),
    )

    const comments = await forge(fake).listReviewComments(7)
    expect(comments).toHaveLength(150)
    expect(comments.at(-1)?.body).toBe('comment 150')
  })

  it('collects files beyond the first page', async () => {
    const fake = new FakeGitHub()
    fake.addPull({ number: 7, files: many(250).map((i) => `src/f${i}.ts`) })

    expect(await forge(fake).pullRequestFiles(7)).toHaveLength(250)
  })

  it('refuses to report a partial list rather than truncating', async () => {
    // The ceiling is a backstop against an unbounded loop, and it has to be loud: a scope
    // check handed a short list reports a clean verdict, not a smaller one.
    const fake = new FakeGitHub()
    fake.addPull({ number: 7, files: many(3_100).map((i) => `src/f${i}.ts`) })

    await expect(forge(fake).pullRequestFiles(7)).rejects.toThrow(/refusing to report a partial list/)
  })
})

describe('a repository that has been renamed', () => {
  /*
   * Renaming a GitHub organisation leaves a redirect behind. Reads follow it silently, so
   * everything looks configured correctly — preflight passes, the task is fetched, the gates
   * run. The write does not follow it, so creating the issue comes back `HTTP 307`, which was
   * the entire error the user saw after every other step reported success.
   *
   * This is what a real run hit: an organisation had been renamed, so the old owner still
   * resolved for reads and refused every write.
   */
  class RedirectingGitHub extends FakeGitHub {
    override async rest<T>(method: string, path: string, body?: unknown): Promise<T> {
      if (method !== 'GET') throw new GitHubApiError('gh: HTTP 307', 0, path)
      if (/^repos\/[^/]+\/[^/]+$/.test(path)) return { full_name: 'newowner/newname' } as T
      return super.rest<T>(method as never, path, body)
    }
  }

  it('names where the repository moved to, instead of reporting HTTP 307', async () => {
    const forge = new GitHubForge(new RedirectingGitHub(), { owner: 'oldowner', repo: 'oldname' })

    await expect(forge.createIssue({ title: 'T', body: 'b' })).rejects.toThrow(
      /oldowner\/oldname has moved to newowner\/newname/,
    )
  })

  it('says what to do about it', async () => {
    const forge = new GitHubForge(new RedirectingGitHub(), { owner: 'oldowner', repo: 'oldname' })
    const err = await forge
      .createIssue({ title: 'T', body: 'b' })
      .then(() => null)
      .catch((e: Error) => e)

    expect(err?.message).toMatch(/CTXMUX_REPO/)
    // The detail that makes the failure make sense: reads worked, writes did not.
    expect(err?.message).toMatch(/Reads follow the redirect but writes do not/)
  })

  it('leaves an ordinary failure alone', async () => {
    // Only a redirect is reinterpreted; everything else keeps its own message.
    const fake = new FakeGitHub()
    fake.failNextCalls = 1
    const forge = new GitHubForge(fake, { owner: 'o', repo: 'r' })

    await expect(forge.createIssue({ title: 'T', body: 'b' })).rejects.not.toThrow(/has moved/)
  })
})

describe('fetching a pull request diff', () => {
  /*
   * The API ignores a `.diff` suffix on the path and answers with the pull request's JSON.
   * `rest<string>` then asserted that object was a string, because a generic nobody checks
   * will describe an object as anything you like — and it reached `test-integrity`, where the
   * run died on `diff.split is not a function` after the agent had finished and the
   * dependencies had been installed.
   */
  class JsonInsteadOfDiff extends FakeGitHub {
    override async rest<T>(method: string, path: string, body?: unknown): Promise<T> {
      if (/\/pulls\/\d+\.diff$/.test(path)) {
        return { url: 'https://api.github.com/...', id: 4384681347 } as T
      }
      return super.rest<T>(method as never, path, body)
    }
  }

  it('never returns anything but a string', async () => {
    const forge = new GitHubForge(new JsonInsteadOfDiff(), { owner: 'o', repo: 'r' })
    const diff = await forge.pullRequestDiff(781)

    expect(typeof diff).toBe('string')
    expect(() => diff.split('\n')).not.toThrow()
  })

  it('asks for the diff media type when the client can', async () => {
    // The difference is the Accept header, not the path.
    const asked: Array<{ path: string; accept: string }> = []
    class WithRaw extends FakeGitHub {
      async raw(path: string, accept: string): Promise<string> {
        asked.push({ path, accept })
        return 'diff --git a/a.ts b/a.ts\n+one\n'
      }
    }

    const forge = new GitHubForge(new WithRaw(), { owner: 'o', repo: 'r' })
    const diff = await forge.pullRequestDiff(781)

    expect(asked).toEqual([{ path: 'repos/o/r/pulls/781', accept: 'application/vnd.github.diff' }])
    expect(diff).toContain('diff --git')
  })

  it('reports no diff rather than failing, since it feeds no decision', async () => {
    // Unlike the file list, which pullRequestFiles refuses to guess at.
    class Broken extends FakeGitHub {
      async raw(): Promise<string> {
        throw new GitHubApiError('Not Found', 404, 'x')
      }
    }
    const forge = new GitHubForge(new Broken(), { owner: 'o', repo: 'r' })
    expect(await forge.pullRequestDiff(781)).toBe('')
  })
})
