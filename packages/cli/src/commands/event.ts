/**
 * `ctxmux event` — feed a forge webhook into a run.
 *
 * The bridge between "a human reviewed the pull request" and "the agent gets another round".
 * Reads a GitHub event payload — the JSON an Action already has on disk — normalises it,
 * coalesces the burst, and submits one event to the run.
 *
 * Every delivery is deduped durably, so a redelivery does not consume a revision round.
 */
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { renderPrompt } from '@contextmux/agent-claude'
import {
  DEFAULT_POLICY,
  Engine,
  FeedbackCoalescer,
  FileStore,
  type Run,
  type WebhookEvent,
} from '@contextmux/core'
import { detectProfile } from '@contextmux/repo'
import { LocalRunner } from '@contextmux/runner-local'
import { bullet, c, error, heading, info, success, warn } from '../ui.js'
import { flagBool, flagString, type ParsedArgs } from '../args.js'
import { ConfigError, resolveAgent, resolveTracker } from '../resolve.js'

/** Logins whose activity is never human feedback. */
const DEFAULT_BOTS = ['Copilot', 'copilot-swe-agent[bot]', 'github-copilot[bot]', 'github-actions[bot]']

interface GitHubEventPayload {
  action?: string
  review?: { state?: string; body?: string | null; user?: { login?: string } }
  comment?: { body?: string | null; user?: { login?: string }; path?: string; line?: number | null }
  issue?: { number?: number; pull_request?: unknown }
  pull_request?: { number?: number; title?: string; merged?: boolean; state?: string }
  repository?: { full_name?: string }
}

/**
 * Normalise a GitHub payload into webhook events.
 *
 * Returns an array because one payload can legitimately describe several things; returning a
 * single event would silently drop the rest.
 */
export function normalizeGitHubEvent(
  eventName: string,
  payload: GitHubEventPayload,
  runId: string,
  receivedAt = Date.now(),
): WebhookEvent[] {
  const events: WebhookEvent[] = []

  if (eventName === 'pull_request_review' && payload.review) {
    const state = payload.review.state?.toLowerCase()
    events.push({
      kind: 'review_submitted',
      runId,
      actor: payload.review.user?.login ?? 'unknown',
      body: payload.review.body ?? '',
      state:
        state === 'approved' ? 'approved' : state === 'changes_requested' ? 'changes_requested' : 'commented',
      receivedAt,
    })
  }

  if (eventName === 'pull_request_review_comment' && payload.comment) {
    events.push({
      kind: 'review_comment',
      runId,
      actor: payload.comment.user?.login ?? 'unknown',
      body: payload.comment.body ?? '',
      ...(payload.comment.path ? { file: payload.comment.path } : {}),
      ...(payload.comment.line != null ? { line: payload.comment.line } : {}),
      receivedAt,
    })
  }

  if (eventName === 'issue_comment' && payload.comment) {
    // Only comments on pull requests are review feedback. A comment on the task issue itself
    // is a human talking to a human.
    if (payload.issue?.pull_request) {
      events.push({
        kind: 'issue_comment',
        runId,
        actor: payload.comment.user?.login ?? 'unknown',
        body: payload.comment.body ?? '',
        receivedAt,
      })
    }
  }

  if (eventName === 'pull_request' && payload.action === 'closed' && payload.pull_request) {
    events.push({
      kind: payload.pull_request.merged ? 'pr_merged' : 'pr_closed',
      runId,
      actor: 'system',
      receivedAt,
    })
  }

  return events
}

export async function eventCommand(args: ParsedArgs): Promise<number> {
  const root = path.resolve(flagString(args, 'root') ?? process.cwd())
  const dryRun = flagBool(args, 'dry-run', 'n')

  // Empty means unset: an Action that exports these conditionally leaves them blank rather
  // than absent, and a blank event name is not something to try to process.
  const eventName = flagString(args, 'event') || process.env['GITHUB_EVENT_NAME'] || undefined
  const payloadPath = flagString(args, 'payload') || process.env['GITHUB_EVENT_PATH'] || undefined
  const runId = flagString(args, 'run')

  if (!eventName || !payloadPath) {
    warn('Nothing to process.')
    info('')
    info('  ctxmux event --event pull_request_review --payload ./event.json --run run-T-1')
    info(c.dim('  Inside a GitHub Action, GITHUB_EVENT_NAME and GITHUB_EVENT_PATH are used automatically.'))
    return 1
  }

  let payload: GitHubEventPayload
  try {
    payload = JSON.parse(await fs.readFile(payloadPath, 'utf8')) as GitHubEventPayload
  } catch (err) {
    error(`Could not read the event payload at ${payloadPath}: ${(err as Error).message}`)
    return 1
  }

  const store = new FileStore(path.join(root, '.ctxmux', 'state'))

  /*
   * Without an explicit run, find the one this pull request belongs to.
   *
   * By pull request URL, and only by that. The obvious shortcut — comparing the number against
   * `handleRef` — is a category error: for a delegated agent the handle is the *issue* number,
   * and GitHub numbers issues and pull requests from one sequence, so issue 42 and pull request
   * 42 both exist in any busy repository. Matching on it delivers a reviewer's feedback to
   * somebody else's run, which is worse than not finding one at all.
   */
  let targetRun = runId
  if (!targetRun) {
    const prNumber = payload.pull_request?.number ?? payload.issue?.number
    const matches: string[] = []

    if (prNumber !== undefined) {
      for (const id of await store.list()) {
        const run = (await store.load(id)) as Run | null
        if (run?.result?.location?.prUrl?.endsWith(`/pull/${prNumber}`)) matches.push(id)
      }
    }

    if (matches.length > 1) {
      error(`${matches.length} runs claim pull request #${prNumber}: ${matches.join(', ')}.`)
      info('    ' + c.dim('Say which one with --run <id>.'))
      return 1
    }
    targetRun = matches[0]
  }

  if (!targetRun) {
    /*
     * Exit non-zero, because in CI this is almost always a real failure.
     *
     * Run state lives in `.ctxmux/state/`, which is gitignored — so a workflow reacting to a
     * review runs in a fresh checkout and finds nothing the workflow that dispatched the agent
     * wrote. Reporting success there meant the job went green on every review while the
     * feedback reached nobody, forever, with nothing red to notice.
     *
     * `--if-no-run ignore` restores the quiet behaviour for a caller that genuinely expects
     * events about runs it does not own.
     */
    if (flagString(args, 'if-no-run') === 'ignore') {
      info('No run matches this event; nothing to do.')
      return 0
    }

    error(`No run here owns pull request #${payload.pull_request?.number ?? payload.issue?.number}.`)
    info('')
    info('    ' + c.dim('Run state lives in .ctxmux/state/, which is not committed — so a workflow'))
    info('    ' + c.dim('reacting to a review cannot see what the workflow that started the run wrote.'))
    info('    ' + c.dim('Fetch it first with `ctxmux state pull`, name the run with --run <id>,'))
    info('    ' + c.dim('or pass --if-no-run ignore if events about other runs are expected.'))
    return 1
  }

  const existing = (await store.load(targetRun)) as Run | null
  if (!existing) {
    warn(`Run "${targetRun}" is not recorded here.`)
    return 1
  }

  const coalescer = new FeedbackCoalescer({
    botLogins: DEFAULT_BOTS,
    currentRound: () => existing.feedbackRound,
  })

  const normalized = normalizeGitHubEvent(eventName, payload, targetRun)
  let accepted = 0
  for (const event of normalized) {
    if (coalescer.add(event)) accepted += 1
  }

  heading('Event')
  bullet(`${eventName}${payload.action ? `.${payload.action}` : ''} -> ${targetRun}`)
  bullet(`${normalized.length} normalised, ${accepted} accepted`)

  if (accepted === 0) {
    info('')
    success('Nothing actionable (bot activity, or an empty comment).')
    return 0
  }

  // A single Action run sees one delivery, so drain rather than wait for a window that will
  // never close in this process.
  const coalesced = coalescer.flush(Date.now(), { force: true })

  if (coalesced.length === 0) {
    success('Nothing actionable after coalescing.')
    return 0
  }

  for (const item of coalesced) {
    heading(
      item.event.type === 'review_approved'
        ? 'Approved'
        : item.event.type === 'cancelled'
          ? 'Closed'
          : 'Changes requested',
    )
    if (item.merged > 1) bullet(`${item.merged} deliveries folded into one`)

    if (dryRun) {
      bullet(c.yellow('dry run: not submitted'))
      continue
    }

    /*
     * Dedupe durably, keyed on content rather than delivery id.
     *
     * A forge redelivering the same review sends a fresh delivery id, so keying on that would
     * let a redelivery consume a revision round — the exact fan-out failure this path exists
     * to prevent, arriving by a different route.
     */
    let applied = false
    await store.applyOnce(`webhook:${item.dedupeKey}`, async () => {
      applied = true
    })

    if (!applied) {
      bullet(c.dim('already handled (redelivery)'))
      continue
    }

    /*
     * Only a revision round needs an agent.
     *
     * Requesting changes means delivering them to the agent, so one is required there: without
     * it the engine reports that it cannot dispatch by failing the run, which would turn every
     * review into an escalation. An approval or a closed pull request dispatches nothing —
     * `EngineOptions.agent` is optional for exactly this caller — and resolving one anyway made
     * a merge notification fail on a repository that had no agent configured.
     */
    const needsAgent = item.event.type === 'review_changes_requested'

    let engine: Engine
    try {
      const profile = await detectProfile(root)
      const resolveOptions = {
        root,
        ...(flagString(args, 'agent') ? { agent: flagString(args, 'agent')! } : {}),
        ...(flagString(args, 'tracker') ? { tracker: flagString(args, 'tracker')! } : {}),
        ...(flagString(args, 'repo') ? { repo: flagString(args, 'repo')! } : {}),
        isolate: false,
        defaultQualityGate: profile.qualityGate,
      }
      const agent = needsAgent ? await resolveAgent(resolveOptions) : undefined

      /*
       * A driven agent needs somewhere to work, and it should be the worktree this run
       * already has. Starting a fresh one would make the agent re-derive everything it did
       * on the previous round, and the reviewer's comments refer to code that only exists
       * there.
       */
      const runner =
        agent?.capabilities.sandbox === 'caller'
          ? (
              await LocalRunner.create({
                root,
                isolate: true,
                branch: `ctxmux/${existing.task.id.toLowerCase()}`,
                ...(existing.result?.location?.worktree
                  ? { worktreeDir: existing.result.location.worktree }
                  : {}),
              })
            ).runner
          : undefined

      engine = new Engine({
        ...(agent ? { agent } : {}),
        ...(runner ? { runner } : {}),
        tracker: await resolveTracker(resolveOptions),
        store,
        // Gates re-run on the next result, not on the review itself.
        gates: [],
        renderPrompt: (task, feedback) =>
          renderPrompt({ task, ...(feedback ? { feedback } : {}) }),
        policy: DEFAULT_POLICY,
        // Hand off and return; a short-lived Action must not sit waiting for a cloud agent.
        waitForDelegated: false,
      })
    } catch (err) {
      if (err instanceof ConfigError) {
        error(err.message)
        if (err.hint) info('    ' + c.dim(err.hint))
        return 1
      }
      throw err
    }

    const outcome = await engine.submit(targetRun, item.event)
    if (outcome.applied) {
      bullet(`run is now ${c.bold(outcome.run?.state ?? 'unknown')}`)
    } else {
      // Never report success for something that changed nothing.
      warn(outcome.reason ?? 'the event was not applied')
    }
  }

  return 0
}
