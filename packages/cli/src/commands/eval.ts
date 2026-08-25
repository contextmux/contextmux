/**
 * `ctxmux eval` — run one task through several agents and compare them.
 *
 * The command exists to answer a question teams currently answer by vibes: which agent should
 * we point at this codebase. It answers it with measurements from the artefacts, in isolated
 * worktrees, from the same starting commit.
 *
 * It spends real money across several vendors at once, so it is deliberately noisy about what
 * it is about to do and defaults to sequential execution.
 */
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import {
  DEFAULT_DENY,
  DEFAULT_POLICY,
  complexity,
  pathScope,
  producedChanges,
  qualityGate,
  readiness,
  testIntegrity,
  type CodingAgent,
  type Gate,
  type TaskSpec,
} from '@contextmux/core'
import { renderPrompt } from '@contextmux/agent-claude'
import { renderDetails, renderMarkdown, renderTable, runEval } from '@contextmux/eval'
import { loadContext, writeFileAtomic } from '@contextmux/context'
import { buildIndex, detectProfile } from '@contextmux/repo'
import { inlineTask } from '@contextmux/tracker-file'
import { bullet, c, error, heading, info, success, warn } from '../ui.js'
import { flagBool, flagNumber, flagString, type ParsedArgs } from '../args.js'
import { AGENT_NAMES, ConfigError, resolveAgent, resolveTracker, type AgentName } from '../resolve.js'

function parseList(raw: string | undefined): string[] {
  return raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : []
}

export async function evalCommand(args: ParsedArgs): Promise<number> {
  const root = path.resolve(flagString(args, 'root') ?? process.cwd())
  const target = args.positionals.join(' ').trim()
  const dryRun = flagBool(args, 'dry-run', 'n')
  const concurrent = flagBool(args, 'concurrent')
  const verbose = flagBool(args, 'verbose')

  if (!target) {
    warn('Nothing to evaluate.')
    info('')
    info('  ctxmux eval T-1 --agents claude,cursor,codex')
    info('  ctxmux eval "add a date helper" --agents all --dry-run')
    info('')
    info(c.dim('  Runs the same task through each agent in its own worktree and compares the results.'))
    return 1
  }

  const requested = parseList(flagString(args, 'agents'))
  const names: AgentName[] =
    requested.length === 0 || requested[0] === 'all'
      ? AGENT_NAMES
      : (requested as AgentName[])

  // --- resolve the task ---------------------------------------------------
  const profile = await detectProfile(root)
  const allow = parseList(flagString(args, 'allow'))
  const deny = parseList(flagString(args, 'deny'))

  const resolveOptions = {
    root,
    ...(flagString(args, 'tracker') ? { tracker: flagString(args, 'tracker')! } : {}),
    ...(flagString(args, 'repo') ? { repo: flagString(args, 'repo')! } : {}),
    ...(flagString(args, 'model') ? { model: flagString(args, 'model')! } : {}),
    isolate: true,
    defaultQualityGate: profile.qualityGate,
    ...(allow.length || deny.length ? { scope: { allow, deny } } : {}),
  }

  let task: TaskSpec | null
  const agents: Array<{ agent: CodingAgent; label: string }> = []
  const unavailable: Array<{ name: string; reason: string }> = []
  try {
    const tracker = await resolveTracker(resolveOptions)
    task = await tracker.get(target).catch(() => null)
    if (!task) {
      task = inlineTask(target, { qualityGate: profile.qualityGate })
      info(c.dim(`No task matched "${target}"; treating it as an ad-hoc task.`))
    }
    if (allow.length || deny.length) {
      task = { ...task, scope: { ...task.scope, allow, deny } }
    }

    for (const name of names) {
      try {
        const agent = await resolveAgent({ ...resolveOptions, agent: name })
        agents.push({ agent, label: agent.displayName })
      } catch (err) {
        /*
         * An agent that cannot even be constructed — no repository for Copilot, no Jira
         * credentials — is skipped rather than fatal.
         *
         * `--agents all` exists for convenience, and having one unconfigurable vendor block a
         * comparison between the three that *are* configured defeats the point. The reason is
         * reported alongside the results so the gap is visible rather than silent.
         */
        if (err instanceof ConfigError) {
          unavailable.push({ name, reason: err.message })
          continue
        }
        throw err
      }
    }

    if (agents.length === 0) {
      error('None of the requested agents could be configured.')
      for (const item of unavailable) bullet(`${item.name}: ${item.reason}`)
      return 1
    }
  } catch (err) {
    if (err instanceof ConfigError) {
      error(err.message)
      if (err.hint) info('    ' + c.dim(err.hint))
      return 1
    }
    throw err
  }

  // --- gates --------------------------------------------------------------
  // Same reasoning as `run`: a comparison is almost always started from a typed sentence, and
  // holding it to the ticket bar would reject the command's own documented example.
  const gates: Gate[] = [
    readiness(
      task.origin.tracker === 'inline'
        ? { minBodyChars: 12, requireAcceptanceCriteria: false }
        : {},
    ),
    complexity(),
    producedChanges(),
    pathScope({ defaultDeny: DEFAULT_DENY }),
    testIntegrity(),
    qualityGate(),
  ]

  const context = await loadContext({ root }).then(
    (ctx) => ctx.model,
    () => undefined,
  )
  const index = await buildIndex(root).catch(() => undefined)

  // --- say what is about to happen, and what it costs ---------------------
  heading(`Comparing ${agents.length} agent(s) on ${task.id}`)
  bullet(task.title)
  for (const { agent } of agents) {
    const health = await agent.preflight()
    const note = health.ok
      ? health.detail.includes('has not been run against the real CLI')
        ? c.yellow(' (adapter unverified)')
        : ''
      : c.red(` (${health.detail.split('.')[0]})`)
    bullet(`${agent.displayName} — ${agent.kind}${note}`)
  }
  for (const item of unavailable) {
    bullet(c.dim(`${item.name} — skipped: ${item.reason}`))
  }
  bullet(concurrent ? c.yellow('running concurrently — wall-clock figures will be distorted') : 'running one at a time')
  if (dryRun) bullet(c.yellow('dry run: nothing will be dispatched'))
  else {
    info('')
    warn(`This dispatches ${agents.length} real agent run(s) and will cost money.`)
  }

  // --- run ----------------------------------------------------------------
  heading('Runs')
  const result = await runEval({
    root,
    task,
    entrants: agents.map(({ agent, label }) => ({ agent, label })),
    gates,
    renderPrompt: (t, feedback) =>
      renderPrompt({
        task: t,
        ...(context ? { context } : {}),
        ...(index ? { index } : {}),
        ...(feedback ? { feedback } : {}),
        repoBudget: flagNumber(args, 'repo-budget', { default: 3_000, min: 0 }),
      }),
    policy: {
      ...DEFAULT_POLICY,
      ...(args.flags.has('max-rounds')
        ? { maxFeedbackRounds: flagNumber(args, 'max-rounds', { default: 2, min: 0, max: 20 }) }
        : {}),
    },
    ...(concurrent ? { concurrent: true } : {}),
    skipUnavailable: true,
    ...(dryRun ? { dryRun: true } : {}),
    onEvent: (agentId, event) => {
      if (event.type === 'run:state') info(`  ${agentId.padEnd(14)} ${c.dim('->')} ${event.to}`)
      else if (event.type === 'agent:finished') {
        info(`  ${agentId.padEnd(14)} ${c.cyan(event.status)}, ${event.filesChanged} file(s)`)
      } else if (verbose && event.type === 'gate:result' && event.outcome.verdict !== 'pass') {
        info(`  ${agentId.padEnd(14)} ${c.yellow(event.outcome.gate)}: ${event.outcome.reason ?? ''}`)
      }
    },
  })

  // --- report -------------------------------------------------------------
  heading('Results')
  info(renderTable(result))

  if (unavailable.length > 0) {
    info('')
    for (const item of unavailable) {
      info(`  ${c.dim(`${item.name} was not compared: ${item.reason}`)}`)
    }
  }

  const details = renderDetails(result)
  if (details) {
    heading('Details')
    info(details)
  }

  const out = flagString(args, 'out')
  if (out) {
    const abs = path.resolve(root, out)
    await fs.mkdir(path.dirname(abs), { recursive: true })
    await writeFileAtomic(abs, renderMarkdown(result))
    info('')
    success(`Wrote the comparison to ${out}`)
  }

  const winner = result.scores.find((s) => s.succeeded && !s.weakenedTests)
  info('')
  if (winner) {
    success(`${winner.agentName} produced the best result for this task.`)
    info(c.dim('  Read the diffs before trusting the ranking — these are measurements, not judgement.'))
  } else if (result.scores.length > 0) {
    warn('No agent produced a change that passed every gate.')
  }

  // A comparison where nothing succeeded is a real answer, not a failure of the command.
  return 0
}
