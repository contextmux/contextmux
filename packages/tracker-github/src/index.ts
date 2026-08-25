/**
 * GitHub Issues as a tracker.
 *
 * Deliberately separate from the forge even though both talk to GitHub. A tracker holds the
 * work a human wrote; a forge holds the artefact an agent is handed. Keeping them apart is
 * what lets a Jira ticket drive a GitHub pull request — the interesting configuration, and
 * one you cannot express if the two are the same object.
 *
 * Semantic state has no native home on an issue, so it is carried in labels. That is visible,
 * greppable and needs no extra infrastructure.
 */
import { extractAcceptanceCriteria, type SemanticState, type TaskSpec, type Tracker } from '@contextmux/core'
import { GitHubForge, type GitHubClient, type RepoRef } from '@contextmux/forge-github'

export const STATE_LABELS: Record<SemanticState, string> = {
  todo: 'state:todo',
  in_progress: 'state:in-progress',
  in_review: 'state:in-review',
  done: 'state:done',
  blocked: 'state:blocked',
}

export interface GitHubTrackerOptions {
  client: GitHubClient
  repo: RepoRef
  /** Only issues carrying this label are eligible. Opt-in by construction. */
  label?: string
  defaultScope?: { allow?: string[]; deny?: string[]; maxFiles?: number }
  defaultQualityGate?: string[]
}

/**
 * An issue number, or null when the id is not one.
 *
 * `Number.isFinite(Number(id))` was the guard, and `Number('')` is `0` — so an empty or
 * whitespace id passed validation and addressed issue #0, turning a misconfigured task into a
 * live API call against the wrong thing. Issue numbers are positive integers; nothing else is
 * one.
 */
function issueNumber(id: string): number | null {
  if (!/^\d+$/.test(id.trim())) return null
  const n = Number(id.trim())
  return n > 0 ? n : null
}

export class GitHubTracker implements Tracker {
  readonly id = 'github'
  private readonly forge: GitHubForge

  constructor(private readonly opts: GitHubTrackerOptions) {
    this.forge = new GitHubForge(opts.client, opts.repo)
  }

  private toSpec(issue: {
    number: number
    title: string
    body: string
    labels: string[]
    url: string
  }): TaskSpec {
    const id = String(issue.number)
    return {
      id,
      title: issue.title,
      body: issue.body,
      acceptanceCriteria: extractAcceptanceCriteria(issue.body).map((text) => ({ text })),
      scope: {
        allow: this.opts.defaultScope?.allow ?? [],
        deny: this.opts.defaultScope?.deny ?? [],
        ...(this.opts.defaultScope?.maxFiles !== undefined
          ? { maxFiles: this.opts.defaultScope.maxFiles }
          : {}),
      },
      qualityGate: this.opts.defaultQualityGate ?? [],
      origin: { tracker: 'github', id, url: issue.url },
      // State labels are bookkeeping, not user intent, so they do not reach gate decisions.
      labels: issue.labels.filter((l) => !l.startsWith('state:')),
    }
  }

  async listReady(limit = 10): Promise<TaskSpec[]> {
    const labels = this.opts.label ? [this.opts.label] : []
    const issues = await this.forge.listIssues({ labels, state: 'open', limit: limit * 2 })
    return issues
      // Anything already in flight is not ready to start again.
      .filter((i) => !i.labels.some((l) => l.startsWith('state:') && l !== STATE_LABELS.todo))
      .slice(0, limit)
      .map((i) => this.toSpec(i))
  }

  async get(id: string): Promise<TaskSpec | null> {
    const number = issueNumber(id)
    if (number === null) return null
    const issue = await this.forge.getIssue(number)
    return issue ? this.toSpec(issue) : null
  }

  async transition(id: string, to: SemanticState): Promise<void> {
    const number = issueNumber(id)
    if (number === null) return
    const target = STATE_LABELS[to]
    const stale = Object.values(STATE_LABELS).filter((l) => l !== target)
    await this.forge.setLabels(number, [target], stale)

    // A done task should not stay open; leaving it is how a board fills with finished work.
    if (to === 'done') await this.forge.closeIssue(number, 'completed')
  }

  async comment(id: string, body: string): Promise<void> {
    const number = issueNumber(id)
    if (number !== null) await this.forge.comment(number, body)
  }

  async setLabels(id: string, add: string[], remove: string[]): Promise<void> {
    const number = issueNumber(id)
    if (number !== null) await this.forge.setLabels(number, add, remove)
  }
}

// Re-exported so each tracker keeps its existing surface; the implementation is shared.
export { extractAcceptanceCriteria }
