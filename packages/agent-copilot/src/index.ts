/**
 * GitHub Copilot coding agent, as a delegated agent.
 *
 * The handoff is an assignment: create an issue carrying the task, assign it to Copilot, and
 * then observe the pull request it opens. We control the artefact and nothing else — there is
 * no prompt to compose and no sandbox to provide, which is precisely what `artifact-only`
 * prompt control means.
 *
 * The assignment itself is the fragile part. It is only expressible in GraphQL, behind a
 * feature header, against a bot whose node id differs per installation. Hard-coding that id —
 * a common shortcut, because it is stable enough to look constant — produces an adapter that
 * works on the repository it was written against and silently fails everywhere else.
 */
import type {
  AgentHandle,
  AgentResult,
  DelegatedAgent,
  Feedback,
  TaskSpec,
} from '@contextmux/core'
import {
  GitHubApiError,
  GitHubForge,
  reviewToFeedback,
  type ForgePullRequest,
  type GitHubClient,
  type RepoRef,
} from '@contextmux/forge-github'

/** Logins the coding agent may appear under. Used to tell its work from a human's. */
export const COPILOT_LOGINS = ['Copilot', 'copilot-swe-agent[bot]', 'github-copilot[bot]']

/** Undocumented, and required for the assignment API to exist at all. */
const FEATURE_HEADER = { 'GraphQL-Features': 'issues_copilot_assignment_api_support' }

export interface CopilotAgentOptions {
  client: GitHubClient
  repo: RepoRef
  /** Label applied to issues this adapter creates, so they are identifiable. */
  label?: string
  /** How long to leave between observations of a cloud run. */
  pollIntervalMs?: number
}

interface SuggestedActor {
  __typename: string
  login: string
  id?: string
}

export class CopilotAgent implements DelegatedAgent {
  readonly kind = 'delegated' as const
  readonly id = 'copilot'
  readonly displayName = 'GitHub Copilot coding agent'
  readonly capabilities = {
    promptControl: 'artifact-only' as const,
    resume: 'mention' as const,
    sandbox: 'vendor' as const,
    budgetable: false,
  }
  readonly pollIntervalMs: number

  private readonly forge: GitHubForge
  private actorId: string | null = null

  /**
   * When each handle was last nudged.
   *
   * `observe` has no other way to tell "the work Copilot did" from "the work Copilot did before
   * we asked for changes" — the pull request looks identical either way. Without this, a
   * revision round resolved on the very first poll against the unchanged pull request: the
   * gates failed again on the same content, the run spent every round it had, and it escalated
   * without Copilot ever having seen the feedback.
   *
   * Held in memory, which covers the case that was broken — `ctxmux run`, where the nudge and the
   * observation happen in one process. A webhook-driven service restarts between the two and
   * falls back to the previous behaviour, so it should drive the run through `submit` rather
   * than by polling.
   */
  private readonly nudgedAt = new Map<string, number>()

  constructor(private readonly opts: CopilotAgentOptions) {
    this.forge = new GitHubForge(opts.client, opts.repo)
    this.pollIntervalMs = opts.pollIntervalMs ?? 30_000
  }

  /**
   * Resolve Copilot's assignable actor id for *this* repository.
   *
   * Discovered every time rather than cached across installations, and failing loudly when
   * absent. A hard-coded fallback would turn "Copilot is not enabled on this repository" into
   * a mutation that appears to succeed and assigns nothing.
   */
  private async resolveActorId(): Promise<string> {
    if (this.actorId) return this.actorId

    const data = await this.opts.client.graphql<{
      repository: { suggestedActors: { nodes: SuggestedActor[] } } | null
    }>(
      `query($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) {
          suggestedActors(capabilities: [CAN_BE_ASSIGNED], first: 100) {
            nodes { __typename login ... on Bot { id } }
          }
        }
      }`,
      { owner: this.opts.repo.owner, repo: this.opts.repo.repo },
      FEATURE_HEADER,
    )

    const actor = (data?.repository?.suggestedActors?.nodes ?? []).find(
      (a) => a.__typename === 'Bot' && a.login?.toLowerCase().includes('copilot') && a.id,
    )

    if (!actor?.id) {
      throw new GitHubApiError(
        'Copilot is not available as an assignee on this repository. Enable the Copilot coding ' +
          'agent in repository settings, and check the token has access to it.',
        403,
        'suggestedActors',
      )
    }

    this.actorId = actor.id
    return actor.id
  }

  async preflight(): Promise<{ ok: boolean; detail: string }> {
    try {
      const id = await this.resolveActorId()
      return { ok: true, detail: `Copilot is assignable on this repository (${id})` }
    } catch (err) {
      return { ok: false, detail: (err as Error).message }
    }
  }

  /**
   * The most a GitHub issue body will hold.
   *
   * Exceeding it is a 422 from the create call, which arrives after preflight has passed and
   * reported everything fine — so the run looks healthy right up until the one step that was
   * always going to fail. Checked here because this is the last place that knows both the
   * artefact and where it is going.
   */
  private static readonly MAX_BODY = 65_536

  async delegate(input: { task: TaskSpec; prompt: string }): Promise<AgentHandle> {
    if (input.prompt.length > CopilotAgent.MAX_BODY) {
      throw new GitHubApiError(
        `the artefact for ${input.task.id} is ${input.prompt.length.toLocaleString()} characters, and a GitHub ` +
          `issue body holds ${CopilotAgent.MAX_BODY.toLocaleString()}. Narrow the task's scope, or lower ` +
          '--repo-budget, so less of the repository is described in it.',
        422,
        'issues',
      )
    }

    const actorId = await this.resolveActorId()

    const issue = await this.forge.createIssue({
      title: `[${input.task.id}] ${input.task.title}`,
      body: input.prompt,
      labels: [this.opts.label ?? 'contextmux', `task:${input.task.id}`],
    })

    try {
      await this.opts.client.graphql(
        `mutation($assignableId: ID!, $actorIds: [ID!]!) {
          replaceActorsForAssignable(input: { assignableId: $assignableId, actorIds: $actorIds }) {
            clientMutationId
          }
        }`,
        { assignableId: issue.nodeId, actorIds: [actorId] },
        FEATURE_HEADER,
      )
    } catch (err) {
      /*
       * The issue exists but nobody is working on it. Left open it becomes an orphan that
       * looks like queued work, so close it and report the real failure — a run that fails
       * cleanly is recoverable, one that leaves debris behind is not.
       */
      await this.forge
        .comment(issue.number, `Could not assign Copilot: ${(err as Error).message}. Closing.`)
        .catch(() => {})
      await this.forge.closeIssue(issue.number, 'not_planned').catch(() => {})
      throw err
    }

    return { ref: String(issue.number), agentId: this.id }
  }

  async nudge(handle: AgentHandle, feedback: Feedback): Promise<void> {
    const issueNumber = Number(handle.ref)
    const prs = await this.forge.linkedPullRequests(issueNumber)
    const target = prs.find((p) => p.state === 'open')

    const body = [
      `@copilot Revision round ${feedback.round} — from ${feedback.source}:`,
      '',
      feedback.body,
      ...(feedback.items?.length
        ? ['', ...feedback.items.map((i) => `- \`${i.file}${i.line ? `:${i.line}` : ''}\` — ${i.body}`)]
        : []),
      '',
      'Address exactly this. Do not make unrelated changes.',
    ].join('\n')

    // Comment on the pull request when there is one; the agent watches its own PR. Falling
    // back to the issue matters when it failed before opening anything.
    await this.forge.comment(target?.number ?? issueNumber, body)

    /*
     * Read the mark off the forge's clock, not this machine's.
     *
     * `observe` compares this against `Date.parse(pr.updatedAt)`, which GitHub stamps. Storing
     * `Date.now()` compared a local clock to a remote one: a machine running a few minutes fast
     * — ordinary on a laptop that has been asleep, and not unheard of on a CI runner — makes
     * every subsequent update look older than the nudge, so `observe` returns null until real
     * time catches up and the run polls itself to death.
     *
     * Re-read after commenting rather than reusing the timestamp from above, because the
     * comment itself bumps `updated_at`. Taking it before would make our own nudge look like
     * the agent's response to it.
     */
    const after = target ? await this.forge.getPullRequest(target.number).catch(() => null) : null
    const stamp = after ? Date.parse(after.updatedAt) : NaN
    this.nudgedAt.set(handle.ref, Number.isFinite(stamp) ? stamp : Date.now())
  }

  /**
   * Has the agent produced anything yet?
   *
   * A draft pull request means work is still in progress. Treating a draft as finished is the
   * classic mistake here: it sends a half-written change to review, and the agent keeps
   * pushing to it afterwards.
   */
  async observe(handle: AgentHandle): Promise<AgentResult | null> {
    const issueNumber = Number(handle.ref)
    if (!Number.isFinite(issueNumber)) {
      return { status: 'failed', filesChanged: [], summary: '', error: `invalid handle "${handle.ref}"` }
    }

    const prs = await this.forge.linkedPullRequests(issueNumber)
    if (prs.length === 0) return null

    const pr = prs.find((p) => p.state === 'open') ?? prs[0]!

    /*
     * A draft means still working — unless a review has been requested.
     *
     * Copilot's coding agent never marks its own pull request ready. It commits, writes its
     * summary into the description, requests a review from whoever assigned the issue, and
     * leaves the draft flag set for a human to clear. Waiting for that flag is waiting for
     * something that does not happen: on a real run the agent finished in a couple of minutes
     * and the poll was still going twelve minutes later.
     *
     * The review request is the signal. Treating a draft as finished without one is the
     * mistake in the other direction — it sends half-written work to the gates while the agent
     * is still pushing to it.
     */
    if (pr.state === 'open' && pr.draft && pr.requestedReviewers.length === 0) return null

    /*
     * Still the same work we already rejected.
     *
     * A pull request that has not moved since we asked for changes is not a new result, and
     * reporting it as one runs the identical content through the identical gates and calls the
     * revision round spent.
     */
    const nudged = this.nudgedAt.get(handle.ref)
    if (nudged !== undefined && pr.state === 'open') {
      const updated = Date.parse(pr.updatedAt)
      if (!Number.isFinite(updated) || updated <= nudged) return null
      this.nudgedAt.delete(handle.ref)
    }

    if (pr.state === 'closed' && !pr.merged) {
      return {
        status: 'failed',
        filesChanged: [],
        summary: pr.body,
        error: `pull request #${pr.number} was closed without merging`,
        location: { prUrl: pr.url, branch: pr.branch },
      }
    }

    /*
     * The file list is not optional and must not be guessed at.
     *
     * It is what the scope gate checks, so swallowing a failure into an empty array reports a
     * pull request that changed nothing — which passes every path check there is. A failed
     * observation is recoverable; a clean verdict on an unread change is not.
     *
     * The diff is different: `.diff` needs a media type not every client can request, and it is
     * a convenience for reading rather than an input to a decision.
     */
    let files: string[]
    try {
      files = await this.forge.pullRequestFiles(pr.number)
    } catch (err) {
      return {
        status: 'failed',
        filesChanged: [],
        summary: pr.body || pr.title,
        error: `could not read the files changed by #${pr.number}: ${(err as Error).message}`,
        location: { prUrl: pr.url, branch: pr.branch },
      }
    }
    const diff = await this.forge.pullRequestDiff(pr.number).catch(() => '')

    return {
      status: 'succeeded',
      filesChanged: files,
      ...(diff ? { diff } : {}),
      summary: pr.body || pr.title,
      location: { prUrl: pr.url, branch: pr.branch },
    }
  }

  /** The pull request a run produced, for reporting and for review handling. */
  async pullRequestFor(handle: AgentHandle): Promise<ForgePullRequest | null> {
    const prs = await this.forge.linkedPullRequests(Number(handle.ref))
    return prs.find((p) => p.state === 'open') ?? prs[0] ?? null
  }

  /**
   * Clear the draft flag on the pull request the agent produced.
   *
   * Copilot never does this itself: it commits, requests a review, and leaves the draft set.
   * So a run whose gates have passed still reads as unfinished to everyone looking at the
   * repository — the ticket says in review, the pull request says work in progress, and the
   * reviewer it asked for cannot merge what it has written.
   *
   * Returns null rather than throwing when there is nothing to mark. A pull request that is
   * already open for review is the desired end state, not a failure, and losing a completed
   * run over it would be the wrong trade.
   */
  async markReady(handle: AgentHandle): Promise<string | null> {
    const pr = await this.pullRequestFor(handle)
    if (!pr || !pr.draft) return null
    await this.forge.markReadyForReview(pr.nodeId)
    return pr.url
  }

  /** Collect human review feedback on the run's pull request, if any has arrived. */
  async collectReviewFeedback(handle: AgentHandle, round: number): Promise<Feedback | null> {
    const pr = await this.pullRequestFor(handle)
    if (!pr) return null
    const [reviews, comments] = await Promise.all([
      this.forge.listReviews(pr.number),
      this.forge.listReviewComments(pr.number),
    ])
    return reviewToFeedback(reviews, comments, { round, botLogins: COPILOT_LOGINS })
  }
}

export function copilotAgent(opts: CopilotAgentOptions): CopilotAgent {
  return new CopilotAgent(opts)
}
