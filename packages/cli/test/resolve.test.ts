/**
 * Turning configuration into adapters.
 *
 * Every failure here has to say what to do about it: a missing token or an unavailable binary
 * should be reported as a configuration problem, not surface three layers down once a run is
 * already underway.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AGENT_NAMES, ConfigError, resolveAgent, resolveTracker } from '../src/resolve.js'
import { makeRepo, removeRepo, useIsolatedEnv } from './helpers.js'

useIsolatedEnv()

let root: string
beforeEach(async () => {
  root = await makeRepo()
})
afterEach(() => removeRepo(root))

const opts = () => ({ root, isolate: true, defaultQualityGate: [] })

describe('resolving an agent', () => {
  it('defaults to Claude Code', async () => {
    const agent = await resolveAgent(opts())
    expect(agent.id).toBe('claude-code')
  })

  it('reads the default from the environment', async () => {
    vi.stubEnv('CTXMUX_AGENT', 'cursor')
    expect((await resolveAgent(opts())).id).toBe('cursor')
  })

  it('treats an empty environment variable as unset', async () => {
    /*
     * `process.env.X ?? fallback` keeps an empty string, because `''` is not nullish — so
     * `export CTXMUX_AGENT=` produced `Unknown agent ""`. Clearing a variable by assigning
     * nothing is an ordinary thing to do in a shell and should mean what it looks like.
     */
    vi.stubEnv('CTXMUX_AGENT', '')
    expect((await resolveAgent(opts())).id).toBe('claude-code')

    vi.stubEnv('CTXMUX_TRACKER', '   ')
    expect((await resolveTracker(opts())).id).toBe('file')
  })

  it('prefers the flag over the environment', async () => {
    vi.stubEnv('CTXMUX_AGENT', 'cursor')
    expect((await resolveAgent({ ...opts(), agent: 'codex' })).id).toBe('codex')
  })

  it('names the valid agents when given an unknown one', async () => {
    const err = await resolveAgent({ ...opts(), agent: 'windsurf' }).catch((e) => e)

    expect(err).toBeInstanceOf(ConfigError)
    expect((err as ConfigError).message).toContain('windsurf')
    // The list goes in the hint, which is what the CLI prints under the message.
    expect((err as ConfigError).hint).toContain('claude')
  })

  it('constructs every agent it advertises', async () => {
    // `--agents all` iterates this list, so anything on it that cannot be built is a broken
    // promise rather than an unavailable vendor.
    vi.stubEnv('GITHUB_TOKEN', 'stub-token-for-test')

    for (const name of AGENT_NAMES) {
      const built = await resolveAgent({ ...opts(), agent: name, repo: 'o/r' })
      expect(built.id, name).toBeTruthy()
    }
  })

  it('reports missing GitHub credentials as something to configure', async () => {
    /*
     * `resolveClient` throws a `GitHubApiError`, and callers branch on `ConfigError` to decide
     * whether an agent can be skipped — so the most likely failure of all crashed the command
     * that was built to tolerate it.
     */
    vi.stubEnv('PATH', '/nonexistent')

    const err = await resolveAgent({ ...opts(), agent: 'copilot', repo: 'o/r' }).catch((e) => e)

    expect(err).toBeInstanceOf(ConfigError)
    expect((err as ConfigError).hint).toContain('gh auth login')
  })

  it('says how to name a repository when Copilot has none', async () => {
    vi.stubEnv('GITHUB_TOKEN', 'stub-token-for-test')

    const err = await resolveAgent({ ...opts(), agent: 'copilot' }).catch((e) => e)

    expect(err).toBeInstanceOf(ConfigError)
    expect((err as ConfigError).message).toContain('No repository configured')
    expect((err as ConfigError).hint).toContain('--repo')
  })
})

describe('resolving a tracker', () => {
  it('defaults to files on disk, so nothing external is needed to start', async () => {
    expect((await resolveTracker(opts())).id).toBe('file')
  })

  it('names the valid trackers when given an unknown one', async () => {
    const err = await resolveTracker({ ...opts(), tracker: 'linear' }).catch((e) => e)

    expect(err).toBeInstanceOf(ConfigError)
    expect((err as ConfigError).message).toContain('linear')
    expect((err as ConfigError).hint).toContain('file, github, jira')
  })

  it('says which Jira settings are missing rather than failing on the first request', async () => {
    const err = await resolveTracker({ ...opts(), tracker: 'jira' }).catch((e) => e)

    expect(err).toBeInstanceOf(ConfigError)
    expect((err as ConfigError).message).toMatch(/JIRA_URL|JIRA_EMAIL|JIRA_API_TOKEN/)
  })

  it('builds a Jira tracker once the settings are there', async () => {
    vi.stubEnv('JIRA_URL', 'https://example.atlassian.net')
    vi.stubEnv('JIRA_EMAIL', 'a@example.com')
    vi.stubEnv('JIRA_API_TOKEN', 'stub-token-for-test')

    expect((await resolveTracker({ ...opts(), tracker: 'jira' })).id).toBe('jira')
  })

  it('needs a repository for the GitHub tracker, and says so', async () => {
    vi.stubEnv('GITHUB_TOKEN', 'stub-token-for-test')

    const err = await resolveTracker({ ...opts(), tracker: 'github' }).catch((e) => e)

    expect(err).toBeInstanceOf(ConfigError)
    expect((err as ConfigError).hint).toContain('--repo')
  })
})

describe('the repository’s own choice of agent and tracker', () => {
  const at = (root: string, over: Record<string, unknown> = {}) => ({
    ...opts(),
    root,
    ...over,
  })

  const withConfig = (config: Record<string, unknown>) =>
    makeRepo({ '.ctxmux/config.json': JSON.stringify(config) })

  it('uses the agent the repository declares', async () => {
    /*
     * A team that always runs one agent should not have to remember a flag on every
     * invocation, or keep it in one person's shell profile where nobody else can see it.
     * `codex` rather than `claude` so a pass cannot come from the default.
     */
    const root = await withConfig({ agent: 'codex' })
    expect((await resolveAgent(at(root))).id).toBe('codex')
    await removeRepo(root)
  })

  it('lets a flag override it', async () => {
    // The repository's normal choice, not a rule: a one-off run must still be possible.
    const root = await withConfig({ agent: 'codex' })
    expect((await resolveAgent(at(root, { agent: 'claude' }))).id).toBe('claude-code')
    await removeRepo(root)
  })

  it('lets the environment override it, so CI need not edit a file', async () => {
    const root = await withConfig({ agent: 'codex' })
    vi.stubEnv('CTXMUX_AGENT', 'claude')
    expect((await resolveAgent(at(root))).id).toBe('claude-code')
    await removeRepo(root)
  })

  it('falls back to the default when the repository says nothing', async () => {
    const root = await makeRepo({})
    expect((await resolveAgent(at(root))).id).toBe('claude-code')
    await removeRepo(root)
  })

  it('does the same for the tracker', async () => {
    const root = await withConfig({ tracker: 'file' })
    expect((await resolveTracker(at(root))).id).toBe('file')
    await removeRepo(root)
  })
})
