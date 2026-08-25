/**
 * Publishing a driven agent's work.
 *
 * A delegated agent opens its own pull request — that is what delegating means. A driven one
 * never does: it is handed a worktree, it edits files, and the run ends. Locally that is fine,
 * because the worktree is still there for a human to look at. On a CI runner it is not: the
 * machine is destroyed when the job finishes, and the work goes with it. The run reports
 * success, the gates report success, and nothing exists afterwards.
 *
 * So this is the missing half of `Jira -> pull request` for every agent that is not Copilot.
 * It is deliberately a separate step rather than something the engine does: pushing a branch
 * to a shared remote is not a side effect anybody should get without asking for it.
 */
import type { GitHubForge, ForgePullRequest } from '@contextmux/forge-github'
import { GitHubApiError } from '@contextmux/forge-github'
import type { Run, Runner } from '@contextmux/core'

export interface PublishResult {
  url: string
  number: number
  /** False when a pull request for this branch already existed, which a re-run is. */
  created: boolean
}

/** Raised when the work cannot be published, so the caller can fail loudly rather than exit 0. */
export class PublishError extends Error {
  constructor(
    message: string,
    readonly hint?: string,
  ) {
    super(message)
    this.name = 'PublishError'
  }
}

const AGENT_IDENTITY = ['-c', 'user.name=contextmux', '-c', 'user.email=contextmux@users.noreply.github.com']

async function git(runner: Runner, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const res = await runner.exec('git', args, { timeoutMs: 120_000 })
  return { code: res.code, stdout: res.stdout, stderr: res.stderr }
}

/**
 * Commit whatever the agent left in the working tree.
 *
 * Agents are inconsistent about this: some commit as they go, most leave everything unstaged.
 * Pushing without committing publishes an empty branch, which is worse than failing — it looks
 * like the agent produced nothing.
 */
async function commitIfDirty(runner: Runner, run: Run, agentId: string): Promise<boolean> {
  const status = await git(runner, ['status', '--porcelain'])
  if (status.code !== 0) {
    throw new PublishError(`could not read the worktree state: ${status.stderr.trim()}`)
  }
  if (!status.stdout.trim()) return false

  const add = await git(runner, ['add', '-A'])
  if (add.code !== 0) throw new PublishError(`could not stage the changes: ${add.stderr.trim()}`)

  // An identity only when the environment has none. A runner usually does not, and a commit
  // that fails on missing config after the agent has already done the work is a poor trade.
  const configured = await git(runner, ['config', 'user.email'])
  const identity = configured.code === 0 && configured.stdout.trim() ? [] : AGENT_IDENTITY

  const message = `${run.task.id} ${run.task.title}\n\nProduced by ${agentId} under contextmux gates.`
  const commit = await git(runner, [...identity, 'commit', '-m', message])
  if (commit.code !== 0) throw new PublishError(`could not commit the changes: ${commit.stderr.trim()}`)
  return true
}

/** What the pull request says, beyond the diff. */
export function pullRequestBody(run: Run, baseBranch: string, agentId: string): string {
  const lines: string[] = []
  const origin = run.task.origin

  lines.push(run.task.body.trim() || '_No description on the task._', '')
  lines.push('---', '')
  lines.push(`Produced by \`${agentId}\` for **${run.task.id}**`)
  if (origin?.url) lines.push(`Task: ${origin.url}`)
  lines.push(`Base: \`${baseBranch}\``, '')

  const gates = run.gateOutcomes ?? []
  if (gates.length > 0) {
    lines.push('### Gates', '')
    for (const gate of gates) {
      const mark = gate.verdict === 'pass' ? '✅' : gate.verdict === 'reject' ? '❌' : '⚠️'
      lines.push(`- ${mark} \`${gate.gate}\`${gate.reason ? ` — ${gate.reason.split('\n')[0]}` : ''}`)
    }
    lines.push('')
  }

  const files = run.result?.filesChanged ?? []
  if (files.length > 0) {
    lines.push(`### Files changed (${files.length})`, '')
    for (const file of files.slice(0, 25)) lines.push(`- \`${file}\``)
    if (files.length > 25) lines.push(`- _…and ${files.length - 25} more_`)
    lines.push('')
  }

  lines.push(
    '> An agent wrote this. The gates above checked the diff it produced, not the reasoning',
    '> behind it — review it as you would any other change.',
  )
  return lines.join('\n')
}

/**
 * Push the run's branch and open a pull request for it.
 *
 * Every failure here throws. The work exists only in a worktree that a CI runner is about to
 * destroy, so a publish that quietly does not happen is the worst available outcome: a green
 * job, a closed ticket, and nothing to show for either.
 */
export async function publishRun(input: {
  run: Run
  runner: Runner
  forge: GitHubForge
  /** The branch the agent's work is on. Absent when the run was not isolated. */
  branch: string | undefined
  baseBranch: string
  agentId: string
  draft?: boolean
}): Promise<PublishResult> {
  const { run, runner, forge, baseBranch, branch, agentId } = input

  if (!branch) {
    throw new PublishError(
      'this run has no branch of its own to publish.',
      'Publishing pushes a branch to the remote, so the run has to be isolated. Drop --no-isolate.',
    )
  }
  if (branch === baseBranch) {
    throw new PublishError(
      `the run is on \`${baseBranch}\`, which is the branch it would target.`,
      'Publishing needs somewhere to open the pull request from.',
    )
  }

  await commitIfDirty(runner, run, agentId)

  const ahead = await git(runner, ['rev-list', '--count', `${baseBranch}..HEAD`])
  if (ahead.code === 0 && ahead.stdout.trim() === '0') {
    throw new PublishError(
      'there is nothing on this branch that is not already on the base.',
      'The agent reported changes, but none of them survived to a commit.',
    )
  }

  const push = await git(runner, ['push', '--force-with-lease', '-u', 'origin', `${branch}:${branch}`])
  if (push.code !== 0) {
    throw new PublishError(
      `could not push \`${branch}\`: ${push.stderr.trim().split('\n').slice(-3).join(' ')}`,
      'The token needs `contents: write` on this repository.',
    )
  }

  const title = `${run.task.id} ${run.task.title}`
  const body = pullRequestBody(run, baseBranch, agentId)

  let pr: ForgePullRequest
  try {
    pr = await forge.createPullRequest({
      title,
      head: branch,
      base: baseBranch,
      body,
      ...(input.draft !== undefined ? { draft: input.draft } : {}),
    })
    return { url: pr.url, number: pr.number, created: true }
  } catch (err) {
    /*
     * A duplicate is not a failure. Re-running a task pushes to the same branch, and GitHub
     * answers the second create with a 422 naming the branch but not the pull request — so
     * reporting that verbatim would call a successful re-publish an error.
     */
    if (err instanceof GitHubApiError && err.status === 422) {
      const existing = await forge.findPullRequestByBranch(branch).catch(() => null)
      if (existing) return { url: existing.url, number: existing.number, created: false }
    }
    throw new PublishError(
      `pushed \`${branch}\`, but could not open a pull request: ${(err as Error).message}`,
      'The branch is on the remote, so the work is not lost — open the pull request by hand.',
    )
  }
}
