/**
 * `ctxmux plan` — get a task ready for an agent, and stop before running anything.
 *
 * Two different jobs share this command because they are the same shape from the outside:
 * "make sure the ticket an agent will see is ready", then stop for a human to look at it.
 *
 * 1. Originate a task from a rough description. `run` reads a task that already exists;
 *    nothing before this command could create one from inside contextmux.
 *
 *      ctxmux plan "add a currency formatter" --tracker github
 *      ...review and edit the issue on github.com...
 *      ctxmux run 42 --tracker github --agent codex --model o3
 *
 * 2. Bridge an existing task to GitHub before naming an agent to run it. Once `--agent` is on
 *    the command, the intent is to run this next — and a GitHub issue is the review surface
 *    every run reports back to regardless of which agent does the work (`--open-pr`, `status`,
 *    `trace`), which is reason enough to bridge for a driven agent too, not only for Copilot,
 *    whose coding agent has no other way to receive a task at all — it only exists as a GitHub
 *    issue assignment, so for Copilot bridging is not a convenience but the only path there is.
 *
 *      ctxmux plan PDC-1234 --tracker jira --agent codex
 *      ...review the issue that just opened on GitHub, correct anything it got wrong...
 *      ctxmux run <that issue number> --tracker github --agent codex
 *
 * The bridged issue is not a copy of the source ticket's body — it is the same rendered
 * artefact `renderPrompt` builds for a real `run` (repository map, acceptance criteria
 * restated under their own heading, the working agreement, the same audience-specific
 * framing a delegated agent gets). Reviewing anything less would be reviewing a different,
 * friendlier document than the one an agent is actually handed.
 *
 * Which job runs is decided by whether the argument names a task the tracker already has.
 * Nothing here touches the working tree, spends a coding agent's budget, or opens a worktree —
 * bridging opens exactly one GitHub issue and assigns nobody, starts nothing, against it.
 */
import * as path from 'node:path'
import { loadContext } from '@contextmux/context'
import { buildIndex } from '@contextmux/repo'
import { renderPrompt } from '@contextmux/prompt'
import { c, error, info, success, warn } from '../ui.js'
import { flagNumber, flagString, type ParsedArgs } from '../args.js'
import { ConfigError, resolveTracker, type ResolveOptions } from '../resolve.js'
import { judgeFor } from './advise.js'
import { bridgeLabel } from '../bridge.js'

/**
 * What a GitHub issue body holds. Matches `CopilotAgent`'s own limit exactly, because bridging
 * always lands on a GitHub issue regardless of which agent it is for — the ceiling is GitHub's,
 * not Copilot's.
 */
const MAX_ISSUE_BODY = 65_536

/**
 * Agents with no interface but assignment.
 *
 * Used only to skip drafting: asking one of these a question, the way `judgeFor` does for
 * `claude`/`codex`, fails every time by construction — Copilot's coding agent has no interface
 * that answers anything, only one that takes an assignment. Bridging itself does not consult
 * this set — naming any agent bridges, because a GitHub issue is where every run's review
 * surface lives, not only Copilot's.
 */
const DELEGATED_AGENTS = new Set(['copilot'])

function parseList(raw: string | undefined): string[] {
  return raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : []
}

/** The first line of a rough description, the same way an ad-hoc `run` task titles itself. */
function titleFrom(description: string): string {
  return description.split('\n')[0]!.slice(0, 100)
}

/**
 * Expand a rough sentence into a fuller ticket, using an agent read-only.
 *
 * Asked for markdown under headings `extractAcceptanceCriteria` already recognises, so the
 * criteria it writes are exactly as usable to the readiness gate as ones a human typed by hand
 * — the drafting step should not produce a ticket that reads worse than the sentence it started
 * from.
 */
async function draft(description: string, agentName: string, model: string | undefined): Promise<string> {
  const judge = judgeFor(agentName, model)
  const prompt = [
    'Turn the following one-line request into a clear task description for a coding agent that',
    'has not seen this conversation. Write markdown with exactly these sections:',
    '',
    '## Description',
    '(a few sentences: what to change and why, inferred from the request)',
    '',
    '## Acceptance Criteria',
    '(a bullet list of concrete, checkable statements — what must be true when this is done)',
    '',
    'Do not write any code, and do not add sections beyond these two.',
    '',
    `Request: ${description}`,
  ].join('\n')

  return judge.ask(prompt)
}

export async function planCommand(args: ParsedArgs): Promise<number> {
  const root = path.resolve(flagString(args, 'root') ?? process.cwd())
  const target = args.positionals.join(' ').trim()

  if (!target) {
    error('Nothing to plan.')
    info('')
    info('  ctxmux plan "add a currency formatting helper" --tracker github')
    info('  ctxmux plan PDC-1234 --tracker jira --agent copilot')
    info('')
    info(c.dim('  Creates or bridges a task and stops — review it, then `ctxmux run` it when ready.'))
    return 1
  }

  const resolveOptions: ResolveOptions = {
    root,
    isolate: false,
    defaultQualityGate: [],
    ...(flagString(args, 'tracker') ? { tracker: flagString(args, 'tracker')! } : {}),
    ...(flagString(args, 'repo') ? { repo: flagString(args, 'repo')! } : {}),
  }

  let tracker
  try {
    tracker = await resolveTracker(resolveOptions)
  } catch (err) {
    if (err instanceof ConfigError) {
      error(err.message)
      if (err.hint) info('    ' + c.dim(err.hint))
      return 1
    }
    throw err
  }

  const agentName = flagString(args, 'agent')
  const model = flagString(args, 'model')

  // Whether `target` already names something the tracker has, not whatever it happens to read
  // as. A hand-typed sentence is not an id, and asking a real tracker about one is exactly what
  // `run` already does before falling back — mirrored here rather than assumed away.
  let existing
  try {
    existing = await tracker.get(target)
  } catch (err) {
    error(`Could not read "${target}" from the ${tracker.id} tracker: ${(err as Error).message}`)
    if (tracker.id === 'jira') {
      info('    ' + c.dim('Check JIRA_URL, JIRA_EMAIL and JIRA_API_TOKEN, and that the ticket exists.'))
    }
    return 1
  }

  if (existing) {
    // Bridging is not Copilot-specific: naming any agent means you intend to run this next, and
    // a GitHub issue is the review surface every agent's run reports back to (`--open-pr`,
    // status, trace). Naming none means there is nothing yet to bridge for.
    const needsBridge = Boolean(agentName) && tracker.id !== 'github'

    if (!needsBridge) {
      info(`${c.bold(existing.id)} already exists on the ${tracker.id} tracker.`)
      info(c.dim('  Nothing to plan — it is ready to run:'))
      info(`  ctxmux run ${existing.id} --tracker ${tracker.id}${agentName ? ` --agent ${agentName}` : ''}`)
      return 0
    }

    let github
    try {
      github = await resolveTracker({ ...resolveOptions, tracker: 'github' })
    } catch (err) {
      if (err instanceof ConfigError) {
        error(err.message)
        if (err.hint) info('    ' + c.dim(err.hint))
        return 1
      }
      throw err
    }

    // The same artefact a real `run` would build, not the source ticket's raw body — a
    // repository map, acceptance criteria restated under their own heading, and framing
    // specific to whether the agent named is delegated or driven. Errors degrade to
    // undefined rather than failing the bridge: a run without the repository map is a worse
    // run, not a reason to refuse one.
    const context = await loadContext({ root }).then((ctx) => ctx.model, () => undefined)
    const index = await buildIndex(root).catch(() => undefined)
    const audience = agentName && DELEGATED_AGENTS.has(agentName) ? 'delegated' : 'driven'

    const body = renderPrompt({
      task: existing,
      ...(context ? { context } : {}),
      ...(index ? { index } : {}),
      repoBudget: flagNumber(args, 'repo-budget', { default: 3_000, min: 0 }),
      audience,
    })

    if (body.length > MAX_ISSUE_BODY) {
      error(
        `The rendered artefact for ${existing.id} is ${body.length.toLocaleString()} characters, ` +
          `and a GitHub issue body holds ${MAX_ISSUE_BODY.toLocaleString()}.`,
      )
      info('    ' + c.dim('Narrow the task\'s scope, or lower --repo-budget, so less of the repository is described in it.'))
      return 1
    }

    let bridged
    try {
      bridged = await github.create!({
        title: existing.title,
        body,
        // Carries where this came from onto the issue itself — the one place both ends of the
        // bridge are guaranteed to be able to read it back from later. `run` looks for it when
        // this issue's work concludes, to report the outcome to the ticket this started from.
        labels: [...existing.labels, bridgeLabel(tracker.id, existing.id)],
      })
    } catch (err) {
      error(`Could not open a GitHub issue for ${existing.id}: ${(err as Error).message}`)
      return 1
    }

    // Non-fatal: the bridge already succeeded and is fully usable without this. A source
    // tracker a human cannot currently write to — a token that expired since `plan` started —
    // is not a reason to lose the issue that was just opened.
    await tracker
      .comment(existing.id, `Bridged to GitHub for review: ${bridged.origin.url ?? `#${bridged.id}`}`)
      .catch((err: unknown) => {
        warn(`Bridged, but could not link back from ${existing.id} on ${tracker.id}: ${(err as Error).message}`)
      })

    success(`Bridged ${c.bold(existing.id)} (${tracker.id}) to ${c.bold(bridged.id)} on GitHub.`)
    if (bridged.origin.url) info('    ' + bridged.origin.url)
    info('')
    info(c.dim('  Review the mirrored issue, then when it is ready:'))
    info(`  ctxmux run ${bridged.id} --tracker github --agent ${agentName}`)
    return 0
  }

  // No existing task by that name: originate one from the description, on the tracker asked for.
  if (!tracker.create) {
    error(`The ${tracker.id} tracker cannot create tasks.`)
    info('    ' + c.dim('Use --tracker github or --tracker jira, or write a file under .ctxmux/tasks yourself.'))
    return 1
  }

  const description = target
  let body = description

  // A delegated agent has no interface to ask a question through — drafting with one would
  // only fail, loudly, for no benefit. Skip it rather than reporting a failure nobody caused.
  if (agentName && !DELEGATED_AGENTS.has(agentName)) {
    info(c.dim(`Drafting with ${agentName}...`))
    try {
      body = await draft(description, agentName, model)
    } catch (err) {
      error(`Could not draft with ${agentName}: ${(err as Error).message}`)
      info('    ' + c.dim('Planning without a draft; pass no --agent to skip drafting on purpose.'))
      body = description
    }
  }

  const labels = parseList(flagString(args, 'labels'))
  const title = flagString(args, 'title') ?? titleFrom(description)

  let created
  try {
    created = await tracker.create({
      title,
      body,
      ...(labels.length ? { labels } : {}),
    })
  } catch (err) {
    error(`Could not create a task on the ${tracker.id} tracker: ${(err as Error).message}`)
    if (tracker.id === 'jira') {
      info('    ' + c.dim('Check JIRA_PROJECT_KEY names a project the credentials can file issues in.'))
    }
    return 1
  }

  success(`Created ${c.bold(created.id)} on the ${tracker.id} tracker.`)
  if (created.origin.url) info('    ' + created.origin.url)
  info('')
  info(c.dim('  Review it, edit it if it is not right, then when it is ready:'))
  info(`  ctxmux run ${created.id} --tracker ${tracker.id}${agentName ? ` --agent ${agentName}` : ''}`)
  return 0
}
