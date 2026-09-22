/**
 * `ctxmux plan` — create a task and stop, without running anything against it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseArgs } from '../src/args.js'
import { planCommand } from '../src/commands/plan.js'
import { argv, exists, list, makeRepo, read, removeRepo, runCli, useIsolatedEnv, writeAll } from './helpers.js'

useIsolatedEnv()

let root: string
beforeEach(async () => {
  root = await makeRepo()
})
afterEach(() => removeRepo(root))

describe('ctxmux plan', () => {
  it('says what to type when given nothing', async () => {
    const { code, text } = await runCli(planCommand, argv(root, 'plan'))
    expect(code).toBe(1)
    expect(text).toContain('Nothing to plan')
  })

  it('creates a file task and reports where it landed', async () => {
    // No quotes: `argv` splits on spaces with no shell-style quoting, and `plan` reconstructs
    // its description by rejoining positionals — the same convention every other multi-word
    // command test here already uses.
    const { code, text } = await runCli(
      planCommand,
      argv(root, 'plan add a currency formatting helper'),
    )

    expect(code).toBe(0)
    expect(text).toContain('Created')
    expect(await list(root, '.ctxmux/tasks')).toEqual(['add-a-currency-formatting-helper.md'])

    const written = await read(root, '.ctxmux/tasks/add-a-currency-formatting-helper.md')
    expect(written).toContain('title: add a currency formatting helper')
    expect(written).toContain('status: todo')
    expect(written).toContain('add a currency formatting helper')
  })

  it('tells the caller how to run what it just created', async () => {
    const { text } = await runCli(planCommand, argv(root, 'plan fix the flaky test'))
    expect(text).toContain('ctxmux run fix-the-flaky-test --tracker file')
  })

  it('applies the labels it was given', async () => {
    await runCli(planCommand, argv(root, 'plan a labelled task --labels needs-triage,urgent'))
    const written = await read(root, '.ctxmux/tasks/a-labelled-task.md')
    expect(written).toMatch(/labels:\s*\n\s*-\s*needs-triage\s*\n\s*-\s*urgent/)
  })

  it('honours an explicit title over the description', async () => {
    // Built directly rather than through `argv`, which cannot express a flag value containing
    // spaces — there is no shell here to consume the quotes around one.
    //
    // The file tracker slugs the title for its filename, so an explicit title changes that too
    // — `a-proper-title.md`, not one derived from the rough sentence that was actually typed.
    const args = parseArgs(['plan', 'a', 'rough', 'sentence', '--title', 'A proper title', '--root', root])
    await runCli(planCommand, args)
    expect(await exists(root, '.ctxmux/tasks/a-proper-title.md')).toBe(true)
    const written = await read(root, '.ctxmux/tasks/a-proper-title.md')
    expect(written).toContain('title: A proper title')
  })

  it('names the valid trackers when given an unknown one', async () => {
    const { code, text } = await runCli(planCommand, argv(root, 'plan x --tracker linear'))
    expect(code).toBe(1)
    expect(text).toContain('linear')
  })

  it('says which Jira setting is missing, rather than crashing on a project-less create', async () => {
    // `create` needs to know which project to file into — unlike every other Jira operation,
    // which addresses an issue that already carries one in its key. JiraTracker.create() checks
    // for this before it ever touches the network, so no fetch needs stubbing here.
    vi.stubEnv('JIRA_URL', 'https://example.atlassian.net')
    vi.stubEnv('JIRA_EMAIL', 'a@example.com')
    vi.stubEnv('JIRA_API_TOKEN', 'stub-token-for-test')

    const { code, text } = await runCli(planCommand, argv(root, 'plan a jira task --tracker jira'))

    expect(code).toBe(1)
    expect(text).toContain('Could not create a task on the jira tracker')
    expect(text).toContain('JIRA_PROJECT_KEY')
  })

  it('gives up an agent draft rather than losing the plan entirely', async () => {
    // No `gh`/no credentials is not the scenario here — an unknown agent name is guaranteed to
    // fail the same way in CI as it does locally, without depending on what is installed.
    const { code, text } = await runCli(planCommand, argv(root, 'plan a task --agent windsurf'))
    expect(code).toBe(0)
    expect(text).toContain('Could not draft with windsurf')
    expect(await exists(root, '.ctxmux/tasks/a-task.md')).toBe(true)
  })
})

describe('ctxmux plan, given something that already exists', () => {
  it('says so and points at `run`, rather than creating a duplicate', async () => {
    await writeAll(root, { '.ctxmux/tasks/T-1.md': '---\ntitle: Already there\nstatus: todo\n---\n\nBody.' })

    const { code, text } = await runCli(planCommand, argv(root, 'plan T-1'))

    expect(code).toBe(0)
    expect(text).toContain('T-1')
    expect(text).toContain('already exists')
    expect(text).toContain('ctxmux run T-1 --tracker file')
    // No second file appeared for the same id.
    expect(await list(root, '.ctxmux/tasks')).toEqual(['T-1.md'])
  })

  it('is unaffected by a target already on GitHub — nothing to bridge to', async () => {
    // Bridging moves a task onto GitHub. One already there has nowhere further to go, whatever
    // agent is named.
    vi.stubEnv('GITHUB_TOKEN', 'stub-token-for-test')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            number: 7,
            node_id: 'issue-7',
            title: 'Already on GitHub',
            body: 'Body.',
            state: 'open',
            labels: [],
            html_url: 'https://github.com/acme/widgets/issues/7',
            assignees: [],
            updated_at: new Date().toISOString(),
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    )

    const { text } = await runCli(
      planCommand,
      argv(root, 'plan 7 --tracker github --agent codex --repo acme/widgets'),
    )

    expect(text).toContain('already exists')
    expect(text).toContain('ctxmux run 7 --tracker github --agent codex')
  })

  it('bridges to GitHub for a driven agent too — the review surface is the same either way', async () => {
    // Naming any agent means "run this next", and every run's review surface — --open-pr,
    // status, trace — lives on GitHub regardless of whether the agent doing the work is
    // delegated or driven. Bridging is not a Copilot-only accommodation.
    await writeAll(root, {
      '.ctxmux/tasks/T-1.md': '---\ntitle: Add a currency formatter\nstatus: todo\nlabels: [enhancement]\n---\n\nFormat a ratio as a percentage.',
    })
    vi.stubEnv('GITHUB_TOKEN', 'stub-token-for-test')

    const requests: Array<{ url: string; body?: string }> = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        requests.push({ url, body: init?.body as string | undefined })
        return new Response(
          JSON.stringify({
            number: 12,
            node_id: 'issue-12',
            title: 'Add a currency formatter',
            body: 'Format a ratio as a percentage.',
            state: 'open',
            labels: [{ name: 'enhancement' }],
            html_url: 'https://github.com/acme/widgets/issues/12',
            assignees: [],
            updated_at: new Date().toISOString(),
          }),
          { status: 201, headers: { 'content-type': 'application/json' } },
        )
      }),
    )

    const { code, text } = await runCli(
      planCommand,
      argv(root, 'plan T-1 --agent codex --repo acme/widgets'),
    )

    expect(code).toBe(0)
    expect(text).toContain('Bridged T-1 (file) to 12 on GitHub')
    expect(text).toContain('ctxmux run 12 --tracker github --agent codex')
    expect(requests.some((r) => r.url.endsWith('/issues') && r.body)).toBe(true)
  })

  it('bridges an existing task to GitHub when the target agent is Copilot', async () => {
    await writeAll(root, {
      '.ctxmux/tasks/PDC-1234.md':
        '---\ntitle: Fix the null qualifier bug\nstatus: todo\nlabels: [bug]\n---\n\nQualifiers sometimes read NULL as a string.',
    })
    vi.stubEnv('GITHUB_TOKEN', 'stub-token-for-test')

    const requests: Array<{ url: string; body?: string }> = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        requests.push({ url, body: init?.body as string | undefined })
        return new Response(
          JSON.stringify({
            number: 99,
            node_id: 'issue-99',
            title: 'Fix the null qualifier bug',
            body: 'Qualifiers sometimes read NULL as a string.',
            state: 'open',
            labels: [{ name: 'bug' }],
            html_url: 'https://github.com/acme/widgets/issues/99',
            assignees: [],
            updated_at: new Date().toISOString(),
          }),
          { status: 201, headers: { 'content-type': 'application/json' } },
        )
      }),
    )

    const { code, text } = await runCli(
      planCommand,
      argv(root, 'plan PDC-1234 --agent copilot --repo acme/widgets'),
    )

    expect(code).toBe(0)
    expect(text).toContain('Bridged PDC-1234 (file) to 99 on GitHub')
    expect(text).toContain('https://github.com/acme/widgets/issues/99')
    expect(text).toContain('ctxmux run 99 --tracker github --agent copilot')

    const createCall = requests.find((r) => r.url.endsWith('/issues') && r.body)
    expect(createCall).toBeTruthy()
    const sent = JSON.parse(createCall!.body!)
    expect(sent.title).toBe('Fix the null qualifier bug')
    // Plus GitHubTracker's own opt-in label ('contextmux', unless CTXMUX_LABEL says otherwise) —
    // every issue it creates carries it, so `listReady` can filter to what it manages.
    expect(sent.labels).toEqual(expect.arrayContaining(['bug', 'contextmux']))

    // The bridge only opens the mirrored issue — it must not touch the original task file, and
    // it must not assign anyone to what it just opened. That is still `run`'s job.
    expect(await read(root, '.ctxmux/tasks/PDC-1234.md')).toContain('status: todo')
  })
})
