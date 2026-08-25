/**
 * A fake GitHub, good enough to exercise every adapter above it.
 *
 * Adapters that can only be run against a live service do not get tested, and untested
 * adapters are exactly where vendor drift hides. This models the small slice of GitHub's
 * behaviour the adapters depend on — including the parts that are easy to get wrong, like
 * pull requests appearing in the issues list.
 */
import type { GitHubClient } from './client.js'
import { GitHubApiError } from './client.js'

interface FakeIssue {
  number: number
  node_id: string
  title: string
  body: string
  state: 'open' | 'closed'
  labels: Array<{ name: string }>
  html_url: string
  assignees: Array<{ login: string }>
  updated_at: string
  pull_request?: Record<string, never>
}

export interface FakePullRequest {
  number: number
  node_id: string
  title: string
  body: string
  state: 'open' | 'closed'
  merged: boolean
  draft: boolean
  user: { login: string }
  html_url: string
  head: { ref: string }
  changed_files: number
  updated_at: string
  requested_reviewers?: Array<{ login: string }>
  files: string[]
  /** Issue this pull request would close, mirroring GitHub's linked-PR relationship. */
  closesIssue?: number
}

export class FakeGitHub implements GitHubClient {
  readonly issues = new Map<number, FakeIssue>()
  readonly pulls = new Map<number, FakePullRequest>()
  readonly comments: Array<{ number: number; body: string }> = []
  readonly reviews = new Map<number, Array<{ id: number; user: { login: string }; state: string; body: string; submitted_at: string }>>()
  readonly reviewComments = new Map<number, Array<{ id: number; user: { login: string }; body: string; path: string; line: number | null; created_at: string }>>()
  readonly graphqlCalls: Array<{ query: string; variables: Record<string, unknown>; headers: Record<string, string> }> = []
  readonly restCalls: Array<{ method: string; path: string }> = []

  /** Bots this fake repository will offer as assignable, for actor discovery. */
  suggestedActors: Array<{ __typename: string; login: string; id?: string }> = []
  /** Force the next N calls to fail, to exercise transient-failure handling. */
  failNextCalls = 0
  private nextNumber = 1

  addIssue(input: Partial<FakeIssue> & { title: string }): FakeIssue {
    const number = input.number ?? this.nextNumber++
    const issue: FakeIssue = {
      number,
      node_id: `I_${number}`,
      body: '',
      state: 'open',
      labels: [],
      html_url: `https://github.com/o/r/issues/${number}`,
      assignees: [],
      updated_at: '2026-01-01T00:00:00Z',
      ...input,
      title: input.title,
    }
    this.issues.set(number, issue)
    return issue
  }

  addPull(input: Partial<FakePullRequest> & { number: number }): FakePullRequest {
    const pr: FakePullRequest = {
      node_id: `PR_${input.number}`,
      title: 'A pull request',
      body: '',
      state: 'open',
      merged: false,
      draft: false,
      user: { login: 'Copilot' },
      html_url: `https://github.com/o/r/pull/${input.number}`,
      head: { ref: 'agent/branch' },
      changed_files: 1,
      updated_at: '2026-01-01T00:00:00Z',
      requested_reviewers: [],
      files: ['src/a.ts'],
      ...input,
    }
    this.pulls.set(pr.number, pr)
    return pr
  }

  private guard(): void {
    if (this.failNextCalls > 0) {
      this.failNextCalls -= 1
      throw new GitHubApiError('simulated transient failure', 500, 'fake')
    }
  }

  async rest<T>(method: string, path: string, body?: unknown): Promise<T> {
    this.guard()
    this.restCalls.push({ method, path })
    const [pathname, query = ''] = path.split('?')
    const params = new URLSearchParams(query)

    // POST repos/o/r/issues
    if (method === 'POST' && /\/issues$/.test(pathname!)) {
      const input = body as { title: string; body?: string; labels?: string[] }
      return this.addIssue({
        title: input.title,
        body: input.body ?? '',
        labels: (input.labels ?? []).map((name) => ({ name })),
      }) as T
    }

    // GET repos/o/r/issues?...
    if (method === 'GET' && /\/issues$/.test(pathname!)) {
      const wanted = params.get('labels')?.split(',').filter(Boolean) ?? []
      const state = params.get('state') ?? 'open'
      const all = [
        ...this.issues.values(),
        // GitHub returns pull requests from the issues endpoint. Adapters must filter them.
        ...[...this.pulls.values()].map((p) => ({
          number: p.number,
          node_id: p.node_id,
          title: p.title,
          body: p.body,
          state: p.state,
          labels: [],
          html_url: p.html_url,
          assignees: [],
          updated_at: '2026-01-01T00:00:00Z',
          pull_request: {},
        })),
      ] as FakeIssue[]
      return all.filter(
        (i) =>
          (state === 'all' || i.state === state) &&
          wanted.every((w) => i.labels.some((l) => l.name === w)),
      ) as T
    }

    const issueMatch = /\/issues\/(\d+)$/.exec(pathname!)
    if (issueMatch) {
      const number = Number(issueMatch[1])
      const issue = this.issues.get(number)
      if (!issue) throw new GitHubApiError('Not Found', 404, path)
      if (method === 'PATCH') {
        Object.assign(issue, body as object)
        return issue as T
      }
      return issue as T
    }

    const commentMatch = /\/issues\/(\d+)\/comments$/.exec(pathname!)
    if (commentMatch && method === 'POST') {
      this.comments.push({ number: Number(commentMatch[1]), body: (body as { body: string }).body })
      return undefined as T
    }

    const labelMatch = /\/issues\/(\d+)\/labels$/.exec(pathname!)
    if (labelMatch && method === 'POST') {
      const issue = this.issues.get(Number(labelMatch[1]))
      if (issue) {
        for (const name of (body as { labels: string[] }).labels) {
          if (!issue.labels.some((l) => l.name === name)) issue.labels.push({ name })
        }
      }
      return undefined as T
    }

    const labelDelete = /\/issues\/(\d+)\/labels\/(.+)$/.exec(pathname!)
    if (labelDelete && method === 'DELETE') {
      const issue = this.issues.get(Number(labelDelete[1]))
      const name = decodeURIComponent(labelDelete[2]!)
      if (!issue || !issue.labels.some((l) => l.name === name)) {
        throw new GitHubApiError('Label does not exist', 404, path)
      }
      issue.labels = issue.labels.filter((l) => l.name !== name)
      return undefined as T
    }

    /*
     * Paginate like the real thing.
     *
     * The fake used to return the whole list for every page, which made a caller that read one
     * page and a caller that read all of them indistinguishable — so a missing page loop looked
     * fully covered. Slicing here is what lets a test see the difference.
     */
    const page = Math.max(1, Number(params.get('page') ?? 1))
    const perPage = Math.max(1, Number(params.get('per_page') ?? 30))
    const paged = <U>(all: U[]): U[] => all.slice((page - 1) * perPage, page * perPage)

    // GET repos/o/r/pulls?head=owner:branch — finding a re-run's existing pull request.
    if (method === 'GET' && /\/pulls$/.test(pathname!)) {
      const head = params.get('head') ?? ''
      const branch = head.includes(':') ? head.slice(head.indexOf(':') + 1) : head
      const wanted = params.get('state') ?? 'open'
      return [...this.pulls.values()].filter(
        (p) => p.head.ref === branch && (wanted === 'all' || p.state === wanted),
      ) as T
    }

    // POST repos/o/r/pulls — a driven agent's work being published.
    if (method === 'POST' && /\/pulls$/.test(pathname!)) {
      const input = body as { title: string; head: string; base: string; body?: string; draft?: boolean }
      if (!input.head?.trim() || !input.base?.trim()) {
        throw new GitHubApiError('Validation Failed: head and base are required', 422, path)
      }
      if ([...this.pulls.values()].some((p) => p.head.ref === input.head && p.state === 'open')) {
        throw new GitHubApiError(
          `A pull request already exists for ${input.head}.`,
          422,
          path,
        )
      }
      const pr = this.addPull({
        number: this.nextNumber++,
        title: input.title,
        body: input.body ?? '',
        head: { ref: input.head },
        user: { login: 'esmaeil-abedi-dev' },
        ...(input.draft !== undefined ? { draft: input.draft } : {}),
      })
      return pr as T
    }

    const prFiles = /\/pulls\/(\d+)\/files$/.exec(pathname!)
    if (prFiles) {
      const pr = this.pulls.get(Number(prFiles[1]))
      return paged((pr?.files ?? []).map((filename) => ({ filename }))) as T
    }

    const prReviews = /\/pulls\/(\d+)\/reviews$/.exec(pathname!)
    if (prReviews) return paged(this.reviews.get(Number(prReviews[1])) ?? []) as T

    const prComments = /\/pulls\/(\d+)\/comments$/.exec(pathname!)
    if (prComments) return paged(this.reviewComments.get(Number(prComments[1])) ?? []) as T

    const prMatch = /\/pulls\/(\d+)$/.exec(pathname!)
    if (prMatch) {
      const pr = this.pulls.get(Number(prMatch[1]))
      if (!pr) throw new GitHubApiError('Not Found', 404, path)
      return pr as T
    }

    throw new GitHubApiError(`fake has no route for ${method} ${path}`, 404, path)
  }

  async graphql<T>(query: string, variables: Record<string, unknown> = {}, headers: Record<string, string> = {}): Promise<T> {
    this.guard()
    this.graphqlCalls.push({ query, variables, headers })

    if (query.includes('closedByPullRequestsReferences')) {
      const number = Number(variables['number'])
      const nodes = [...this.pulls.values()]
        .filter((p) => p.closesIssue === number)
        .map((p) => ({
          number: p.number,
          id: p.node_id,
          title: p.title,
          body: p.body,
          state: p.state === 'open' ? 'OPEN' : 'CLOSED',
          merged: p.merged,
          isDraft: p.draft,
          url: p.html_url,
          headRefName: p.head.ref,
          changedFiles: p.changed_files,
          updatedAt: p.updated_at,
          author: { login: p.user.login },
          reviewRequests: {
            nodes: (p.requested_reviewers ?? []).map((r) => ({ requestedReviewer: { login: r.login } })),
          },
        }))
      return { repository: { issue: { closedByPullRequestsReferences: { nodes } } } } as T
    }

    if (query.includes('suggestedActors')) {
      return { repository: { suggestedActors: { nodes: this.suggestedActors } } } as T
    }

    if (query.includes('replaceActorsForAssignable')) {
      const id = String(variables['assignableId'])
      const issue = [...this.issues.values()].find((i) => i.node_id === id)
      if (!issue) throw new GitHubApiError('assignable not found', 404, 'graphql')
      issue.assignees = [{ login: 'Copilot' }]
      return { replaceActorsForAssignable: { clientMutationId: null } } as T
    }

    if (query.includes('markPullRequestReadyForReview')) {
      // Actually clear the flag. Returning the stub alone made any test of this pass whether
      // or not the call did anything.
      const id = String(variables['id'] ?? '')
      const pr = [...this.pulls.values()].find((p) => p.node_id === id)
      if (!pr) throw new GitHubApiError(`no pull request with node id ${id}`, 404, 'graphql')
      pr.draft = false
      return { markPullRequestReadyForReview: { clientMutationId: null } } as T
    }

    throw new GitHubApiError('fake has no handler for this query', 404, 'graphql')
  }
}
