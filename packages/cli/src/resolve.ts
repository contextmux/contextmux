/**
 * Turning configuration into adapters.
 *
 * Kept apart from the commands so that "which tracker and which agent" is one decision made
 * in one place. Every failure here is reported with what to do about it — a missing token or
 * an unavailable binary should say so plainly, not surface as a confusing failure three
 * layers down once a run is already underway.
 */
import type { CodingAgent, Tracker } from '@contextmux/core'
import { claudeAgent } from '@contextmux/agent-claude'
import { copilotAgent } from '@contextmux/agent-copilot'
import { cursorAgent } from '@contextmux/agent-cursor'
import { codexAgent } from '@contextmux/agent-codex'
import { localAgent, type LocalHarness } from '@contextmux/agent-local'
import type { Trajectory } from '@contextmux/trajectory'
import { GitHubForge, parseRepo, resolveClient, type RepoRef } from '@contextmux/forge-github'
import { FileTracker } from '@contextmux/tracker-file'
import { GitHubTracker } from '@contextmux/tracker-github'
import { HttpJira, JiraTracker } from '@contextmux/tracker-jira'

export type AgentName = 'claude' | 'copilot' | 'cursor' | 'codex' | 'local'

/** Every agent the CLI can construct, for `--agents all` and for error messages. */
export const AGENT_NAMES: AgentName[] = ['claude', 'cursor', 'codex', 'copilot', 'local']
export type TrackerName = 'file' | 'github' | 'jira'

export interface ResolveOptions {
  root: string
  agent?: string
  tracker?: string
  repo?: string
  model?: string
  isolate: boolean
  defaultQualityGate: string[]
  /**
   * Record what the agent does, and stop it when it stops making progress.
   *
   * Only meaningful for agents whose loop runs in a sandbox we provide. A delegated agent
   * works somewhere we cannot watch, so passing one would promise a recovery that can never
   * happen.
   */
  trajectory?: Trajectory
  recovery?: { sampleIntervalMs?: number; stallAfterSamples?: number }
  scope?: { allow?: string[]; deny?: string[] }
}

export class ConfigError extends Error {
  override name = 'ConfigError'
  constructor(
    message: string,
    readonly hint?: string,
  ) {
    super(message)
  }
}

/**
 * An environment variable, treating empty as unset.
 *
 * `process.env.X ?? fallback` keeps an empty string, because `''` is not nullish — so
 * `export CTXMUX_AGENT=` produces "Unknown agent \"\"" rather than the default. Clearing a
 * variable by assigning nothing is a normal thing to do in a shell, and it should mean what it
 * looks like it means.
 */
function env(name: string): string | undefined {
  const value = process.env[name]
  return value && value.trim() ? value : undefined
}

function repoRef(opts: ResolveOptions): RepoRef {
  const value = opts.repo ?? env('CTXMUX_REPO') ?? env('GITHUB_REPOSITORY')
  if (!value) {
    throw new ConfigError(
      'No repository configured.',
      'Pass --repo owner/name, or set CTXMUX_REPO. Inside a GitHub Action, GITHUB_REPOSITORY is used automatically.',
    )
  }
  return parseRepo(value)
}

/**
 * The repository's own choice of agent and tracker, when it has one.
 *
 * Read lazily and never fatally: `resolveAgent` is called on paths that have no `.ctxmux/` at
 * all, and failing to find a config there is ordinary rather than an error.
 */
async function fromConfig(root: string, key: 'agent' | 'tracker'): Promise<string | undefined> {
  try {
    const { loadConfig } = await import('@contextmux/context')
    const config = await loadConfig(root)
    const value = config[key]
    return value && value.trim() ? value : undefined
  } catch {
    return undefined
  }
}

export async function resolveAgent(opts: ResolveOptions): Promise<CodingAgent> {
  const name = (opts.agent ?? env('CTXMUX_AGENT') ?? (await fromConfig(opts.root, 'agent')) ?? 'claude').toLowerCase()

  switch (name) {
    case 'claude':
      /*
       * `isolated` rather than an explicit permission mode: removing every prompt is only
       * defensible because the runner puts the agent in its own worktree. Stating the sandbox
       * and letting the adapter derive its own permissiveness keeps that reasoning in one
       * place, and applies it identically to every CLI-driven agent.
       */
      return claudeAgent({
        ...(opts.model ? { model: opts.model } : {}),
        isolated: opts.isolate,
        ...(opts.trajectory ? { trajectory: opts.trajectory } : {}),
        ...(opts.recovery ? { recovery: opts.recovery } : {}),
      })

    case 'cursor':
      return cursorAgent({
        ...(opts.model ? { model: opts.model } : {}),
        isolated: opts.isolate,
        ...(opts.trajectory ? { trajectory: opts.trajectory } : {}),
        ...(opts.recovery ? { recovery: opts.recovery } : {}),
      })

    case 'codex':
      return codexAgent({
        ...(opts.model ? { model: opts.model } : {}),
        isolated: opts.isolate,
        ...(opts.trajectory ? { trajectory: opts.trajectory } : {}),
        ...(opts.recovery ? { recovery: opts.recovery } : {}),
      })

    case 'local':
      /*
       * The only agent here with no per-token cost. contextmux is free to use; every other
       * adapter bills, which makes "free" true of the tool and not of running it.
       */
      return localAgent({
        ...(env('CTXMUX_LOCAL_HARNESS')
          ? { harness: env('CTXMUX_LOCAL_HARNESS') as LocalHarness }
          : {}),
        ...(opts.model ? { model: opts.model } : {}),
        isolated: opts.isolate,
        ...(opts.trajectory ? { trajectory: opts.trajectory } : {}),
        ...(opts.recovery ? { recovery: opts.recovery } : {}),
      })

    case 'copilot': {
      /*
       * Missing credentials are a configuration problem, so they have to arrive as one.
       *
       * `resolveClient` throws a `GitHubApiError`, and callers branch on `ConfigError` to
       * decide whether an agent can simply be skipped. `ctxmux eval --agents all` therefore
       * crashed on the single most likely condition — no `gh` login and no token — instead of
       * comparing the agents that *were* configured, which the code right above it says is the
       * whole reason that branch exists.
       */
      let client
      try {
        ;({ client } = await resolveClient())
      } catch (err) {
        throw new ConfigError(
          (err as Error).message,
          'Run `gh auth login`, or set GITHUB_TOKEN.',
        )
      }
      return copilotAgent({ client, repo: repoRef(opts) })
    }

    default:
      throw new ConfigError(
        `Unknown agent "${name}".`,
        `Valid agents are: ${AGENT_NAMES.join(', ')}.`,
      )
  }
}

export async function resolveTracker(opts: ResolveOptions): Promise<Tracker> {
  const name = (opts.tracker ?? env('CTXMUX_TRACKER') ?? (await fromConfig(opts.root, 'tracker')) ?? 'file').toLowerCase()

  switch (name) {
    case 'file':
      return new FileTracker({ root: opts.root, defaultQualityGate: opts.defaultQualityGate })

    case 'github': {
      const { client } = await resolveClient()
      return new GitHubTracker({
        client,
        repo: repoRef(opts),
        label: env('CTXMUX_LABEL') ?? 'contextmux',
        defaultQualityGate: opts.defaultQualityGate,
        ...(opts.scope ? { defaultScope: opts.scope } : {}),
      })
    }

    case 'jira': {
      const baseUrl = env('JIRA_URL')
      const email = env('JIRA_EMAIL')
      const apiToken = env('JIRA_API_TOKEN')
      if (!baseUrl || !email || !apiToken) {
        const missing = [
          !baseUrl && 'JIRA_URL',
          !email && 'JIRA_EMAIL',
          !apiToken && 'JIRA_API_TOKEN',
        ].filter(Boolean)
        throw new ConfigError(
          `Jira is not configured: ${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} not set.`,
          'Create an API token at id.atlassian.com and set all three.',
        )
      }
      return new JiraTracker({
        transport: new HttpJira({ baseUrl, email, apiToken }),
        jql: env('CTXMUX_JQL') ?? `labels = "contextmux" AND statusCategory != Done ORDER BY created ASC`,
        ...(env('JIRA_ESTIMATE_FIELD') ? { estimateField: env('JIRA_ESTIMATE_FIELD')! } : {}),
        defaultQualityGate: opts.defaultQualityGate,
        browseBaseUrl: baseUrl,
        ...(opts.scope ? { defaultScope: opts.scope } : {}),
      })
    }

    default:
      throw new ConfigError(`Unknown tracker "${name}".`, 'Valid trackers are: file, github, jira.')
  }
}

/**
 * Where a driven agent's work should be published, and what it should target.
 *
 * The base branch is read from the environment first: inside a workflow the checkout is
 * detached at a commit, so asking git which branch it is on answers `HEAD` — a pull request
 * against `HEAD` is rejected, and the failure arrives only after the agent has already been
 * paid for.
 */
export async function resolvePublishTarget(
  opts: ResolveOptions,
  root: string,
): Promise<{ forge: GitHubForge; baseBranch: string }> {
  const ref = repoRef(opts)
  const { client } = await resolveClient({})
  const forge = new GitHubForge(client, ref)

  const fromEnv = env('GITHUB_REF_NAME') ?? env('CTXMUX_BASE_BRANCH')
  if (fromEnv) return { forge, baseBranch: fromEnv }

  const { execFile } = await import('node:child_process')
  const { promisify } = await import('node:util')
  const exec = promisify(execFile)
  const current = await exec('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: root })
    .then((r) => r.stdout.trim())
    .catch(() => '')

  if (!current || current === 'HEAD') {
    throw new ConfigError(
      'Could not work out which branch to open the pull request against.',
      'Set CTXMUX_BASE_BRANCH, or run from a checkout that is on a branch.',
    )
  }
  return { forge, baseBranch: current }
}
