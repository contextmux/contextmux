/**
 * GitHub as a forge: issues, pull requests, reviews.
 *
 * "Forge" is separated from "tracker" because they are not the same job even when they are the
 * same product. A tracker holds the work item a human wrote; a forge holds the artefact an
 * agent is handed and the pull request it produces. Conflating them is what makes a Jira→GitHub
 * pipeline impossible to express.
 */
export * from './client.js'
export * from './testing.js'

import type { Feedback } from '@contextmux/core'
import { GitHubApiError, type GitHubClient } from './client.js'

export interface RepoRef {
  owner: string
  repo: string
}

/** Whether a failure is GitHub telling us the repository lives somewhere else now. */
function isRedirect(err: unknown): boolean {
  const status = (err as { status?: number }).status
  if (status === 301 || status === 307 || status === 308) return true
  // The `gh` client reports the exit status rather than the HTTP one, so the code is only in
  // the message it printed.
  return /HTTP 30[178]\b/.test((err as Error)?.message ?? '')
}

export function parseRepo(value: string): RepoRef {
  const m = /^([^/\s]+)\/([^/\s]+?)(?:\.git)?$/.exec(value.trim())
  if (!m) throw new GitHubApiError(`Not a valid repository: "${value}". Expected "owner/repo".`, 0, 'parse')
  return { owner: m[1]!, repo: m[2]! }
}

export interface ForgeIssue {
  number: number
  nodeId: string
  title: string
  body: string
  state: 'open' | 'closed'
  labels: string[]
  url: string
  assignees: string[]
  updatedAt: string
}

export interface ForgePullRequest {
  number: number
  nodeId: string
  title: string
  body: string
  state: 'open' | 'closed'
  merged: boolean
  draft: boolean
  author: string
  url: string
  branch: string
  changedFiles: number
  /** Last modification, which is how a caller tells new work from work it has already seen. */
  updatedAt: string
  /**
   * Who has been asked to review.
   *
   * The completion signal for a delegated agent. Copilot's coding agent leaves its pull
   * request as a draft when it finishes and requests a review from whoever assigned the issue
   * — it never marks its own work ready. A caller waiting for the draft flag to clear waits
   * forever.
   */
  requestedReviewers: string[]
}

export interface ForgeReview {
  id: number
  author: string
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED' | 'PENDING'
  body: string
  submittedAt: string
}

export interface ForgeReviewComment {
  id: number
  author: string
  body: string
  path: string
  line: number | null
  createdAt: string
}

interface RawIssue {
  number: number
  node_id: string
  title: string
  body: string | null
  state: 'open' | 'closed'
  labels: Array<{ name: string } | string>
  html_url: string
  assignees?: Array<{ login: string }>
  updated_at: string
  pull_request?: unknown
}

interface RawPullRequest {
  number: number
  node_id: string
  title: string
  body: string | null
  state: 'open' | 'closed'
  merged?: boolean
  draft?: boolean
  user: { login: string }
  html_url: string
  head: { ref: string }
  changed_files?: number
  updated_at: string
  requested_reviewers?: Array<{ login: string }>
}

/**
 * `merged`, `draft` and `changed_files` are optional here on purpose.
 *
 * The create endpoint's response omits fields the read endpoint always carries, and a mapper
 * that assumed them produced `undefined` where a boolean was declared — which reads as `false`
 * at every call site and is indistinguishable from a real answer.
 */
function toPullRequest(raw: RawPullRequest): ForgePullRequest {
  return {
    number: raw.number,
    nodeId: raw.node_id,
    title: raw.title,
    body: raw.body ?? '',
    state: raw.state,
    merged: raw.merged ?? false,
    draft: raw.draft ?? false,
    author: raw.user.login,
    url: raw.html_url,
    branch: raw.head.ref,
    changedFiles: raw.changed_files ?? 0,
    updatedAt: raw.updated_at,
    requestedReviewers: (raw.requested_reviewers ?? []).map((r) => r.login),
  }
}

function toIssue(raw: RawIssue): ForgeIssue {
  return {
    number: raw.number,
    nodeId: raw.node_id,
    title: raw.title,
    body: raw.body ?? '',
    state: raw.state,
    labels: raw.labels.map((l) => (typeof l === 'string' ? l : l.name)),
    url: raw.html_url,
    assignees: (raw.assignees ?? []).map((a) => a.login),
    updatedAt: raw.updated_at,
  }
}

export class GitHubForge {
  readonly id = 'github'

  constructor(
    private readonly client: GitHubClient,
    readonly ref: RepoRef,
  ) {}

  /**
   * Every request, with a redirect turned into an answer.
   *
   * Renaming a GitHub organisation leaves a redirect behind. Reads follow it silently, so
   * everything looks configured correctly — `gh api repos/old/name` returns the repository,
   * preflight passes, the task is fetched. Writes do not follow it: creating the issue comes
   * back `HTTP 307`, which is all the user sees, after every other step has reported success.
   *
   * The canonical name is knowable, because the redirect that broke the write also makes the
   * read work. So it is looked up and named.
   */
  private async rest<T>(method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<T> {
    try {
      return await this.client.rest<T>(method, path, body)
    } catch (err) {
      if (!isRedirect(err) || method === 'GET') throw err
      const moved = await this.canonicalName().catch(() => null)
      throw new GitHubApiError(
        `${this.ref.owner}/${this.ref.repo} has moved${moved ? ` to ${moved}` : ''}. ` +
          'Reads follow the redirect but writes do not, which is why everything up to this point worked. ' +
          `Set CTXMUX_REPO${moved ? ` to ${moved}` : ' to the new owner/name'}, or pass --repo.`,
        307,
        path,
      )
    }
  }

  /** The repository's current owner/name, resolved through the redirect a read follows. */
  private async canonicalName(): Promise<string | null> {
    const raw = await this.client.rest<{ full_name?: string }>('GET', this.base)
    return raw?.full_name ?? null
  }

  private get base(): string {
    return `repos/${this.ref.owner}/${this.ref.repo}`
  }

  // --- issues -------------------------------------------------------------

  async createIssue(input: { title: string; body: string; labels?: string[] }): Promise<ForgeIssue> {
    const raw = await this.rest<RawIssue>('POST', `${this.base}/issues`, {
      title: input.title,
      body: input.body,
      ...(input.labels?.length ? { labels: input.labels } : {}),
    })
    return toIssue(raw)
  }

  async getIssue(number: number): Promise<ForgeIssue | null> {
    try {
      return toIssue(await this.client.rest<RawIssue>('GET', `${this.base}/issues/${number}`))
    } catch (err) {
      if (err instanceof GitHubApiError && err.status === 404) return null
      throw err
    }
  }

  /**
   * Issues carrying a label, excluding pull requests.
   *
   * GitHub's issues endpoint returns pull requests too, which is a long-standing trap: a
   * caller that forgets to filter ends up treating its own agent's PR as a new task.
   */
  async listIssues(opts: { labels?: string[]; state?: 'open' | 'closed' | 'all'; limit?: number } = {}): Promise<ForgeIssue[]> {
    const params = new URLSearchParams({
      state: opts.state ?? 'open',
      per_page: String(Math.min(opts.limit ?? 30, 100)),
    })
    if (opts.labels?.length) params.set('labels', opts.labels.join(','))
    const raw = await this.client.rest<RawIssue[]>('GET', `${this.base}/issues?${params}`)
    return raw.filter((r) => !r.pull_request).map(toIssue)
  }

  async comment(issueNumber: number, body: string): Promise<void> {
    await this.rest('POST', `${this.base}/issues/${issueNumber}/comments`, { body })
  }

  async setLabels(issueNumber: number, add: string[], remove: string[]): Promise<void> {
    if (add.length > 0) {
      await this.rest('POST', `${this.base}/issues/${issueNumber}/labels`, { labels: add })
    }
    for (const label of remove) {
      try {
        await this.rest('DELETE', `${this.base}/issues/${issueNumber}/labels/${encodeURIComponent(label)}`)
      } catch (err) {
        // Removing a label that is not there is the desired end state, not a failure.
        if (!(err instanceof GitHubApiError && err.status === 404)) throw err
      }
    }
  }

  async closeIssue(number: number, reason: 'completed' | 'not_planned' = 'completed'): Promise<void> {
    await this.rest('PATCH', `${this.base}/issues/${number}`, {
      state: 'closed',
      state_reason: reason,
    })
  }

  // --- pull requests ------------------------------------------------------

  /**
   * Pull requests that would close an issue.
   *
   * Deliberately GraphQL: matching by branch name or title is how hand-rolled pipelines get
   * this wrong, because agents name branches however they like. The linked-PR relationship is
   * the only reliable signal, and it is not exposed over REST.
   */
  async linkedPullRequests(issueNumber: number): Promise<ForgePullRequest[]> {
    const data = await this.client.graphql<{
      repository: {
        issue: {
          closedByPullRequestsReferences: {
            nodes: Array<{
              number: number
              id: string
              title: string
              body: string | null
              state: string
              merged: boolean
              isDraft: boolean
              url: string
              headRefName: string
              changedFiles: number
              updatedAt: string
              author: { login: string } | null
              reviewRequests: { nodes: Array<{ requestedReviewer: { login?: string } | null }> } | null
            }>
          } | null
        } | null
      } | null
    }>(
      `query($owner: String!, $repo: String!, $number: Int!) {
        repository(owner: $owner, name: $repo) {
          issue(number: $number) {
            closedByPullRequestsReferences(first: 10, includeClosedPrs: true) {
              nodes {
                number id title body state merged isDraft url headRefName changedFiles updatedAt
                author { login }
                reviewRequests(first: 20) { nodes { requestedReviewer { ... on User { login } } } }
              }
            }
          }
        }
      }`,
      { owner: this.ref.owner, repo: this.ref.repo, number: issueNumber },
    )

    const nodes = data?.repository?.issue?.closedByPullRequestsReferences?.nodes ?? []
    return nodes.map((n) => ({
      number: n.number,
      nodeId: n.id,
      title: n.title,
      body: n.body ?? '',
      state: n.state === 'OPEN' ? 'open' : 'closed',
      merged: n.merged,
      draft: n.isDraft,
      author: n.author?.login ?? 'unknown',
      url: n.url,
      branch: n.headRefName,
      changedFiles: n.changedFiles,
      updatedAt: n.updatedAt,
      requestedReviewers: (n.reviewRequests?.nodes ?? [])
        .map((r) => r.requestedReviewer?.login)
        .filter((login): login is string => Boolean(login)),
    }))
  }

  async getPullRequest(number: number): Promise<ForgePullRequest | null> {
    try {
      return toPullRequest(await this.client.rest<RawPullRequest>('GET', `${this.base}/pulls/${number}`))
    } catch (err) {
      if (err instanceof GitHubApiError && err.status === 404) return null
      throw err
    }
  }

  /**
   * Open a pull request for work that already exists on a branch.
   *
   * A delegated agent opens its own; a driven one does not, because it only ever had a working
   * tree. Without this its output lived on a branch in a temporary worktree and nothing ever
   * published it — which on a CI runner meant the work was destroyed with the machine.
   */
  async createPullRequest(input: {
    title: string
    head: string
    base: string
    body: string
    draft?: boolean
  }): Promise<ForgePullRequest> {
    const raw = await this.rest<RawPullRequest>('POST', `${this.base}/pulls`, {
      title: input.title,
      head: input.head,
      base: input.base,
      body: input.body,
      ...(input.draft !== undefined ? { draft: input.draft } : {}),
    })
    return toPullRequest(raw)
  }

  /**
   * Every file a pull request touches.
   *
   * Fully paginated (see `paginate`), because this list is what a scope check reads and a
   * truncated deny-list check reports a clean verdict rather than a smaller one.
   */
  async pullRequestFiles(number: number): Promise<string[]> {
    const raw = await this.paginate<{ filename: string }>(
      `${this.base}/pulls/${number}/files`,
      `pull request #${number} changes`,
    )
    return raw.map((f) => f.filename)
  }

  /**
   * Read every page, or refuse.
   *
   * Shared because the reasoning is the same wherever it applies, and because it was applied in
   * one place and forgotten in two. A truncated list does not report a smaller answer — it
   * reports a clean one, which is the wrong direction for anything feeding a decision to be
   * wrong in. The page ceiling is a backstop against an unbounded loop, and it says so rather
   * than returning what it managed to collect.
   */
  private async paginate<T>(path: string, what: string, maxPages = 30): Promise<T[]> {
    const out: T[] = []
    const join = path.includes('?') ? '&' : '?'

    for (let page = 1; page <= maxPages; page++) {
      const raw = await this.client.rest<T[]>('GET', `${path}${join}per_page=100&page=${page}`)
      out.push(...raw)
      if (raw.length < 100) return out
    }

    throw new GitHubApiError(
      `${what} more than ${maxPages * 100} items; refusing to report a partial list`,
      0,
      path,
    )
  }

  /**
   * The open pull request for a branch, if there is one.
   *
   * Re-running a task is ordinary — a workflow re-dispatched, a run resumed — and the second
   * attempt pushes to the same branch. GitHub answers a duplicate create with a 422 whose
   * message names the branch but not the pull request, so without this a re-run reports a
   * failure for work that was published perfectly well the first time.
   */
  async findPullRequestByBranch(branch: string): Promise<ForgePullRequest | null> {
    const head = encodeURIComponent(`${this.ref.owner}:${branch}`)
    const raw = await this.client.rest<RawPullRequest[]>(
      'GET',
      `${this.base}/pulls?head=${head}&state=open&per_page=1`,
    )
    return raw.length > 0 ? toPullRequest(raw[0]!) : null
  }

  /**
   * The unified diff for a pull request.
   *
   * Requested by media type, not by a `.diff` suffix on the path. The API ignores the suffix
   * and answers with the pull request's JSON — which `rest<string>` then asserted was a string,
   * because a generic nobody checks will describe an object as anything you like. That object
   * reached `test-integrity`, and the run died on `diff.split is not a function` after the
   * agent had finished and the dependencies had been installed.
   *
   * The type is checked on the way out for the same reason: this is the boundary where a wrong
   * shape stops being detectable.
   */
  async pullRequestDiff(number: number): Promise<string> {
    try {
      const raw = this.client.raw
        ? await this.client.raw(`${this.base}/pulls/${number}`, 'application/vnd.github.diff')
        : await this.client.rest<unknown>('GET', `${this.base}/pulls/${number}.diff`)
      return typeof raw === 'string' ? raw : ''
    } catch {
      // A diff is a convenience for reading, not an input to a decision — unlike the file
      // list, which `pullRequestFiles` refuses to guess at.
      return ''
    }
  }

  async listReviews(number: number): Promise<ForgeReview[]> {
    const raw = await this.paginate<{
      id: number
      user: { login: string }
      state: ForgeReview['state']
      body: string | null
      submitted_at: string
    }>(`${this.base}/pulls/${number}/reviews`, `pull request #${number} has`)
    return raw.map((r) => ({
      id: r.id,
      author: r.user.login,
      state: r.state,
      body: r.body ?? '',
      submittedAt: r.submitted_at,
    }))
  }

  async listReviewComments(number: number): Promise<ForgeReviewComment[]> {
    const raw = await this.paginate<{
      id: number
      user: { login: string }
      body: string
      path: string
      line: number | null
      created_at: string
    }>(`${this.base}/pulls/${number}/comments`, `pull request #${number} has`)
    return raw.map((c) => ({
      id: c.id,
      author: c.user.login,
      body: c.body,
      path: c.path,
      line: c.line,
      createdAt: c.created_at,
    }))
  }

  async commentOnPullRequest(number: number, body: string): Promise<void> {
    // Pull requests are issues as far as the comments endpoint is concerned.
    await this.comment(number, body)
  }

  async markReadyForReview(nodeId: string): Promise<void> {
    await this.client.graphql(
      `mutation($id: ID!) { markPullRequestReadyForReview(input: { pullRequestId: $id }) { clientMutationId } }`,
      { id: nodeId },
    )
  }
}

/**
 * Turn a pull request's human review into agent feedback.
 *
 * Bot authors are excluded. A pipeline that treats its own review bot's comments as human
 * feedback loops forever, and it is not obvious from the outside that it is doing so.
 */
export function reviewToFeedback(
  reviews: ForgeReview[],
  comments: ForgeReviewComment[],
  opts: { round: number; botLogins?: string[] },
): Feedback | null {
  const bots = new Set([...(opts.botLogins ?? []), 'github-actions[bot]'].map((b) => b.toLowerCase()))
  const isHuman = (login: string) => !bots.has(login.toLowerCase()) && !login.endsWith('[bot]')

  const changeRequests = reviews.filter((r) => r.state === 'CHANGES_REQUESTED' && isHuman(r.author))
  const humanComments = comments.filter((c) => isHuman(c.author))

  if (changeRequests.length === 0 && humanComments.length === 0) return null

  const bodies = changeRequests.map((r) => r.body).filter(Boolean)
  return {
    round: opts.round,
    source: changeRequests[0]?.author ?? humanComments[0]?.author ?? 'reviewer',
    body: bodies.join('\n\n') || 'Changes were requested on the pull request.',
    ...(humanComments.length
      ? {
          items: humanComments.map((c) => ({
            file: c.path,
            ...(c.line !== null ? { line: c.line } : {}),
            body: c.body,
          })),
        }
      : {}),
  }
}
