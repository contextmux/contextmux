/**
 * `ctxmux run` — drive a task to a proposed change.
 *
 * This is the command the whole orchestration layer exists to serve, so it defaults to the
 * safe shape: an isolated worktree, gates on, budgets enforced, and a live account of what is
 * happening. Nothing silently touches the working tree, and nothing runs without saying so.
 */
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import {
  DEFAULT_DENY,
  DEFAULT_POLICY,
  Engine,
  FileStore,
  complexity,
  pathScope,
  noDuplicateSymbols,
  noSpeculativeAbstraction,
  noUnrequestedDependencies,
  producedChanges,
  qualityGate,
  readiness,
  testIntegrity,
  type EngineEvent,
  type Gate,
  type AgentResult,
  type Run,
  type RunState,
  type TaskSpec,
} from '@contextmux/core'
import { renderPrompt } from '@contextmux/agent-claude'
import { LocalRunner } from '@contextmux/runner-local'
import { inlineTask } from '@contextmux/tracker-file'
import { ConfigError, resolveAgent, resolveTracker, resolvePublishTarget } from '../resolve.js'
import { loadContext, writeFileAtomic } from '@contextmux/context'
import { buildIndex, detectProfile, type RepoIndex } from '@contextmux/repo'
import {
  endpointFromEnv,
  exportTrajectory,
  headersFromEnv,
  inspect as inspectTrajectory,
  Trajectory,
} from '@contextmux/trajectory'
import { buildHandoff, renderHandoff, type RenderTier } from '@contextmux/handoff'
import { bullet, c, error, heading, info, success, warn } from '../ui.js'
import { publishRun, PublishError } from '../publish.js'
import { flagBool, flagNumber, flagString, type ParsedArgs } from '../args.js'

/**
 * Write a trajectory out, keyed to the run that produced it.
 *
 * Called on every path including the failures — the runs whose recordings matter most are the
 * ones that went wrong, and those are exactly the ones an early return would skip.
 */
async function writeTrace(
  root: string,
  runId: string,
  trajectory: Trajectory,
  dryRun: boolean,
): Promise<void> {
  if (trajectory.length === 0 || dryRun) return
  const traceDir = path.join(root, '.ctxmux', 'state', 'traces')
  await writeFileAtomic(
    path.join(traceDir, `${encodeURIComponent(runId)}.json`),
    JSON.stringify(trajectory.toJSON(), null, 2),
  )
}

/**
 * Gates for this run.
 *
 * Readiness is relaxed for a task somebody typed at the prompt, and only for that. The gate
 * exists because a vague *ticket* — written by someone else, hours ago, now unreachable —
 * produces a confident change that solves the wrong problem and costs more to review than it
 * would have cost to write. None of that holds for a sentence typed a second ago by a person
 * who is still sitting there: they can read the plan, see it is wrong, and retype it.
 *
 * Applying the ticket bar to both made the entry point the help advertises —
 * `ctxmux run "add a currency formatter"` — fail every time with "no acceptance criteria found".
 * A documented path that cannot work is worse than one that does not exist.
 */
function gatesFor(task: TaskSpec, opts: { minimal?: boolean; index?: RepoIndex } = {}): Gate[] {
  const typedByHand = task.origin.tracker === 'inline'
  const gates: Gate[] = [
    readiness(typedByHand ? { minBodyChars: 12, requireAcceptanceCriteria: false } : {}),
    complexity(),
    producedChanges(),
    pathScope({ defaultDeny: DEFAULT_DENY }),
    testIntegrity(),
    qualityGate(),
  ]

  /*
   * The minimalism ladder, off unless asked for.
   *
   * These three are checkable against the diff, which is why they can be gates at all rather
   * than advice in a prompt. They are opt-in because they are the ones most likely to argue
   * with the person who filed the task — an interface they wanted, a dependency they meant to
   * add — and a gate that argues gets switched off along with the ones that were earning their
   * place.
   *
   * `no-duplicate-symbols` needs the symbol index, so it is only added when there is one.
   */
  if (opts.minimal) {
    gates.push(noUnrequestedDependencies(), noSpeculativeAbstraction())
    if (opts.index) {
      const index = opts.index
      gates.push(
        noDuplicateSymbols({
          existing: () =>
            index.files.flatMap((f) =>
              f.symbols.filter((sym) => sym.exported).map((sym) => ({ name: sym.name, file: f.path })),
            ),
        }),
      )
    }
  }

  return gates
}

function parseScope(raw: string | undefined): string[] {
  return raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : []
}

/** Render the live event stream. This is the only window a user has into an unattended run. */
function attachReporter(engine: Engine, verbose: boolean): void {
  engine.on((e: EngineEvent) => {
    switch (e.type) {
      case 'run:state':
        info(`  ${c.dim('->')} ${c.bold(e.to)} ${c.dim(`(${e.via})`)}`)
        break
      case 'gate:result': {
        const o = e.outcome
        if (o.verdict === 'pass') {
          if (verbose) bullet(`${c.green('pass')} ${o.gate}`)
        } else {
          const tag = o.verdict === 'escalate' ? c.red('escalate') : c.yellow('reject')
          bullet(`${tag} ${o.gate}: ${o.reason ?? ''}`)
          if (o.hint) info(`      ${c.dim(o.hint)}`)
        }
        break
      }
      case 'agent:dispatched':
        info(
          `  ${c.cyan('agent')} ${e.agentId}${e.round > 0 ? c.dim(` (revision round ${e.round})`) : ''} working...`,
        )
        break
      case 'agent:finished':
        info(`  ${c.cyan('agent')} ${e.status}, ${e.filesChanged} file(s) changed`)
        break
      case 'agent:progress':
        info(`  ${c.cyan('agent')} ${e.message}`)
        break
      case 'log':
        if (e.level === 'warn') warn(e.message)
        else if (verbose) info(c.dim(`  ${e.message}`))
        break
    }
  })
}

/**
 * A machine-readable summary of a finished run.
 *
 * Printed as one JSON line under `--json`, because the alternative is what the GitHub Action
 * was doing: grepping the human report for phrases like "needs a human". Every message
 * reworded for clarity silently broke a workflow that depended on it, and nothing failed
 * loudly enough to notice.
 *
 * The shape is the contract. Add fields freely; renaming or removing one is a breaking change.
 */
export interface RunSummary {
  runId: string
  taskId: string
  /** Terminal state: in_review, completed, rejected, escalated or failed. */
  state: RunState
  /** True only for the states that mean an agent produced something worth reviewing. */
  ok: boolean
  exitCode: number
  filesChanged: number
  /** Correction rounds spent before the run settled. */
  rounds: number
  attempts: number
  /** Why it ended badly, when it did. */
  reason: string | null
  /** Where the work is, when there is somewhere to look. */
  worktree: string | null
  pullRequest: string | null
  costUsd: number | null
  gates: Array<{ gate: string; verdict: string; reason?: string }>
}

function summarise(run: Run, worktree: string | null, exitCode: number): RunSummary {
  return {
    runId: run.id,
    taskId: run.task.id,
    state: run.state,
    ok: run.state === 'in_review' || run.state === 'completed',
    exitCode,
    filesChanged: run.result?.filesChanged.length ?? 0,
    rounds: run.feedbackRound,
    attempts: run.attempt,
    reason: run.terminalReason ?? null,
    worktree,
    pullRequest: run.result?.location?.prUrl ?? null,
    costUsd: run.result?.usage?.costUsd ?? null,
    gates: run.gateOutcomes.map((o) => ({
      gate: o.gate,
      verdict: o.verdict,
      ...(o.reason ? { reason: o.reason } : {}),
    })),
  }
}

/**
 * The exit code for a terminal state.
 *
 * Shared by the human report and the JSON summary so the two can never disagree — which they
 * would, eventually, if each worked it out for itself.
 */
function exitCodeFor(run: Run, dryRun: boolean): number {
  if (dryRun) return run.state === 'rejected' ? 3 : 0
  switch (run.state) {
    case 'in_review':
    case 'completed':
      return 0
    case 'rejected':
      return 3
    case 'escalated':
      return 4
    default:
      return 1
  }
}

function reportOutcome(run: Run, worktree: string | null, dryRun: boolean): number {
  if (dryRun) {
    info('')
    if (run.state === 'ready') {
      success('Dry run: gates passed and the prompt was assembled. Nothing was dispatched.')
      info(c.dim('  Re-run without --dry-run to execute, or add --verbose to see the prompt.'))
      return 0
    }
    warn(`Dry run stopped at "${run.state}".`)
    for (const o of run.gateOutcomes.filter((g) => g.verdict !== 'pass')) {
      bullet(`${o.gate}: ${o.reason ?? ''}`)
    }
    return run.state === 'rejected' ? 3 : 0
  }

  info('')
  switch (run.state) {
    case 'in_review':
      success(`Changes proposed for ${run.task.id}.`)
      break
    case 'completed':
      success(`${run.task.id} completed.`)
      break
    case 'rejected':
      warn(`${run.task.id} was not picked up.`)
      info('')
      for (const o of run.gateOutcomes.filter((g) => g.verdict !== 'pass')) {
        bullet(`${o.gate}: ${o.reason ?? ''}`)
        if (o.hint) info(`      ${c.dim(o.hint)}`)
      }
      return 3
    case 'escalated':
      error(`${run.task.id} needs a human: ${run.terminalReason ?? 'unknown reason'}`)
      return 4
    case 'failed':
      error(`${run.task.id} failed: ${run.terminalReason ?? 'unknown reason'}`)
      return 1
    default:
      warn(`${run.task.id} ended in state "${run.state}".`)
      return 1
  }

  const result = run.result
  if (result) {
    info('')
    heading('Summary')
    info(result.summary.split('\n').slice(0, 20).join('\n'))

    if (result.filesChanged.length > 0) {
      heading(`Files changed (${result.filesChanged.length})`)
      for (const f of result.filesChanged.slice(0, 25)) bullet(f)
      if (result.filesChanged.length > 25) {
        info(c.dim(`  ... and ${result.filesChanged.length - 25} more`))
      }
    }

    const u = result.usage
    if (u && (u.costUsd !== undefined || u.turns !== undefined)) {
      heading('Cost')
      bullet(
        [
          u.turns !== undefined ? `${u.turns} turn(s)` : null,
          u.outputTokens !== undefined ? `${u.outputTokens} output tokens` : null,
          u.costUsd !== undefined ? `$${u.costUsd.toFixed(4)}` : null,
        ]
          .filter(Boolean)
          .join(', '),
      )
    } else if (result.location?.prUrl) {
      /*
       * A cloud agent's spend is real, and this cannot see it.
       *
       * A driven agent's CLI prints a cost as it exits, so we have a figure. A delegated one
       * bills against the provider's own allowance — GitHub counts premium requests against an
       * organisation, and exposes nothing per issue or per pull request. Printing no Cost
       * section at all reads as free, which is the one thing it is not.
       */
      heading('Cost')
      bullet(c.dim('billed by the agent provider, which reports no per-task figure here'))
      bullet(c.dim('GitHub: Settings → Billing → Copilot, for premium request usage'))
    }
  }

  if (worktree) {
    heading('Review the change')
    bullet(`cd ${worktree} && git diff`)
    info(c.dim('  The work is in an isolated worktree; your working tree was not touched.'))
  }

  return 0
}

export async function runCommand(args: ParsedArgs): Promise<number> {
  const root = path.resolve(flagString(args, 'root') ?? process.cwd())
  const target = args.positionals.join(' ').trim()
  const dryRun = flagBool(args, 'dry-run', 'n')
  /*
   * Machine mode.
   *
   * Under `--json` stdout carries one JSON object and nothing else, so a caller can pipe it
   * straight into a parser. The progress narration is for a person watching a terminal; mixed
   * into the same stream it makes the output unparseable, which is the problem `--json` exists
   * to solve.
   */
  const asJson = flagBool(args, 'json')
  const verbose = flagBool(args, 'verbose', 'v')
  const noIsolate = flagBool(args, 'no-isolate')
  const noGates = flagBool(args, 'no-gates')
  const noRecovery = flagBool(args, 'no-recovery')
  /*
   * Publishing is opt-in, and stays that way.
   *
   * A driven agent's work exists only in a worktree, which is fine locally and fatal on a CI
   * runner — the machine is destroyed with the branch still on it. But pushing to a shared
   * remote is not something anyone should get by accident from a command they ran to see what
   * an agent would do, so it is asked for explicitly.
   */
  const openPr = flagBool(args, 'open-pr')
  /*
   * A fallback chain.
   *
   * A handoff is a retry with a different agent, so it needs no new machinery in the state
   * machine — what is new is *which* agent and *what* it is told. The chain lives here, at the
   * orchestration layer, and the state machine stays unaware that more than one agent exists.
   */
  const chain = (flagString(args, 'agents') ?? '')
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean)
  const handoffTier = (flagString(args, 'handoff-tier') ?? 'valuable') as RenderTier

  if (!target) {
    warn('Nothing to run.')
    info('')
    info('  ctxmux run T-1                      ' + c.dim('a task from .ctxmux/tasks/'))
    info('  ctxmux run "add a date helper"      ' + c.dim('an ad-hoc task'))
    info('  ctxmux run T-1 --dry-run            ' + c.dim('show the plan without spending anything'))
    return 1
  }

  // --- resolve adapters ---------------------------------------------------
  const profile = await detectProfile(root)
  const allowScope = parseScope(flagString(args, 'allow'))
  const denyScope = parseScope(flagString(args, 'deny'))

  /*
   * One trajectory per run.
   *
   * Created before the agent so it can be handed in, and written out afterwards whatever the
   * outcome — a failed run is the one whose trajectory is most worth reading.
   */
  const trajectory = new Trajectory({
    // Provisional: the task has not been resolved yet, so this is corrected below once the run
    // it belongs to has an id. A trajectory naming a run that does not exist is a recording
    // nothing can look up.
    runId: `run-${target}`,
    taskId: target,
    agentId: 'pending',
    round: 0,
    startedAt: Date.now(),
  })

  const resolveOptions = {
    root,
    trajectory,
    ...(noRecovery
      ? {}
      : {
          recovery: {
            sampleIntervalMs: flagNumber(args, 'sample-interval', {
              default: 30_000,
              min: 1_000,
            }),
            stallAfterSamples: flagNumber(args, 'stall-after', {
              default: 3,
              min: 1,
            }),
          },
        }),
    // `--agents a,b` names the chain; its first entry is also the agent that starts.
    ...(chain[0]
      ? { agent: chain[0] }
      : flagString(args, 'agent')
        ? { agent: flagString(args, 'agent')! }
        : {}),
    ...(flagString(args, 'tracker') ? { tracker: flagString(args, 'tracker')! } : {}),
    ...(flagString(args, 'repo') ? { repo: flagString(args, 'repo')! } : {}),
    ...(flagString(args, 'model') ? { model: flagString(args, 'model')! } : {}),
    isolate: !noIsolate,
    defaultQualityGate: profile.qualityGate,
    ...(allowScope.length || denyScope.length ? { scope: { allow: allowScope, deny: denyScope } } : {}),
  }

  let tracker
  let agent
  try {
    tracker = await resolveTracker(resolveOptions)
    agent = await resolveAgent(resolveOptions)
  } catch (err) {
    if (err instanceof ConfigError) {
      error(err.message)
      if (err.hint) info('    ' + c.dim(err.hint))
      return 1
    }
    throw err
  }

  /*
   * A tracker that could not answer is not a tracker with nothing to say.
   *
   * This was `.catch(() => null)`, which folded an expired token, an unreachable host and a
   * 500 into the same "no task found" as a genuine miss — and then invented an ad-hoc task
   * from the argument. Asking for ABC-1234 with a stale Jira token produced a five-character
   * task named "ABC-1234", which readiness rejected for having no description: a real error
   * reported as a badly written ticket, with the real cause discarded.
   */
  let task: TaskSpec | null
  try {
    task = await tracker.get(target)
  } catch (err) {
    error(`Could not read "${target}" from the ${tracker.id} tracker: ${(err as Error).message}`)
    if (tracker.id === 'jira') {
      info('    ' + c.dim('Check JIRA_URL, JIRA_EMAIL and JIRA_API_TOKEN, and that the ticket exists.'))
    }
    return 1
  }

  if (!task) {
    /*
     * The ad-hoc fallback belongs to the file tracker alone.
     *
     * A bare sentence is a task too, and that is the fastest way to try the tool on something
     * real. But naming a tracker and an id is a specific request: silently running a made-up
     * task called "ABC-1234" instead is not a smaller version of what was asked for.
     */
    if (tracker.id !== 'file') {
      error(`${tracker.id} has no task "${target}".`)
      info('    ' + c.dim('Check the id, and that the account you are authenticated as can see it.'))
      return 1
    }
    task = inlineTask(target, { qualityGate: profile.qualityGate })
    info(c.dim(`No task file matched "${target}"; treating it as an ad-hoc task.`))
  }

  const maxFiles = args.flags.has('max-files')
    ? flagNumber(args, 'max-files', { default: 0, min: 1 })
    : undefined
  if (allowScope.length || denyScope.length || maxFiles !== undefined) {
    task = {
      ...task,
      scope: {
        allow: allowScope.length ? allowScope : task.scope.allow,
        deny: denyScope.length ? denyScope : task.scope.deny,
        ...(maxFiles !== undefined
          ? { maxFiles }
          : task.scope.maxFiles !== undefined
            ? { maxFiles: task.scope.maxFiles }
            : {}),
      },
    }
  }

  // --- agent preflight ----------------------------------------------------
  // The trajectory was created before the task and the agent were known; name both now.
  trajectory.meta.runId = `run-${task.id}`
  trajectory.meta.taskId = task.id
  trajectory.attribute(agent.id)

  const health = await agent.preflight()
  if (!health.ok && !dryRun) {
    error(health.detail)
    return 1
  }

  // --- runner -------------------------------------------------------------
  /*
   * A delegated agent runs in the vendor's own sandbox, so a local worktree would sit empty.
   * The runner is still created — verify gates need somewhere to run the project's own
   * commands — but isolating it would only cost a checkout nobody writes to.
   */
  const verifyWorktrees: LocalRunner[] = []
  const wantsIsolation = !noIsolate && agent.capabilities.sandbox === 'caller'
  const { runner, isolated, note } = await LocalRunner.create({
    root,
    isolate: wantsIsolation,
    branch: `ctxmux/${task.id.toLowerCase()}`,
  })

  /*
   * Everything from here on happens with a worktree on disk, so it happens inside a `try`.
   *
   * The dispose below the happy path was not enough: anything that throws in between — a
   * mistyped flag, a tracker that is unreachable, a gate that explodes — skipped it and left a
   * checkout and a branch behind that nothing would ever collect. Errors are exactly when this
   * happens, so the cleanup has to be on the path errors take.
   */
  let disposed = false
  const reclaim = async () => {
    if (disposed) return
    disposed = true
    await runner.dispose().catch(() => {})
  }

  try {
    /*
     * Isolation was asked for and could not be provided.
     *
     * Warning and carrying on was not enough. Isolation is the default, so not getting it is
     * not something the user chose — and the message scrolls past seconds before a paid agent
     * starts rewriting files. The case that reaches here most often is a repository with no
     * commits, which is exactly when there is no way to undo what the agent does: the tool was
     * degrading away from safety precisely where the safety net was thinnest.
     *
     * `--no-isolate` already means "yes, work in my checkout". Requiring it here costs one flag
     * and makes the choice one somebody made.
     */
    if (note && wantsIsolation && !isolated) {
      warn(note)
      info('')
      error('Refusing to run an agent in your working tree unless you say so.')
      info('    ' + c.dim('Commit what you have, then re-run — an isolated worktree needs a commit to branch from.'))
      info('    ' + c.dim('Or pass --no-isolate to let the agent edit your checkout directly.'))
      return 1
    }
    if (note) warn(note)
    trajectory.attribute(agent.id, runner.cwd)

    // --- context and repository index --------------------------------------
    const context = await loadContext({ root }).then(
      (ctx) => ctx.model,
      () => undefined,
    )
    const index = await buildIndex(root).catch(() => undefined)

    const gates: Gate[] = noGates
      ? []
      : gatesFor(task, { minimal: flagBool(args, 'minimal'), ...(index ? { index } : {}) })

    // --- report the plan before spending anything ---------------------------
    if (!asJson) {
    heading(`Task ${task.id}`)
    bullet(task.title)
    if (task.acceptanceCriteria.length) {
      bullet(`${task.acceptanceCriteria.length} acceptance criterion/criteria`)
    }
    bullet(`tracker: ${tracker.id}`)
    bullet(`agent: ${agent.displayName} (${agent.kind})${health.ok ? '' : c.yellow(' — unavailable')}`)
    bullet(
      agent.capabilities.sandbox === 'vendor'
        ? `sandbox: provided by ${agent.displayName}`
        : isolated
          ? `isolated worktree: ${runner.cwd}`
          : c.yellow('running in your working tree'),
    )
    bullet(`gates: ${gates.length ? gates.map((g) => g.name).join(', ') : c.yellow('none')}`)
    bullet(
      noRecovery
        ? c.yellow('recovery: off')
        : agent.capabilities.sandbox === 'vendor'
          ? c.dim('recovery: unavailable — the agent runs where we cannot watch it')
          : `recovery: stop after ${flagString(args, 'stall-after') ?? '3'} samples with no progress`,
    )
    if (task.qualityGate.length) bullet(`quality gate: ${task.qualityGate.join(' && ')}`)
    if (dryRun) bullet(c.yellow('dry run: nothing will be dispatched or written'))
    }

    // --- run ----------------------------------------------------------------
    const engine = new Engine({
      agent,
      runner,
      store: new FileStore(path.join(root, '.ctxmux', 'state')),
      gates,
      tracker,
      /*
       * Verify a delegated agent's work where that work actually is.
       *
       * Its changes are on a branch in the forge, not in this checkout. Without this the
       * quality gate compiled whatever the developer happened to have open and reported the
       * verdict as the pull request's — passing over a broken change, or failing over unrelated
       * local edits, indistinguishably from a real answer.
       *
       * A fresh worktree has no dependencies, so they are installed before the gates run. That
       * is the whole point of doing it here rather than in the agent's sandbox: this machine
       * has the credentials for the private registry, and the vendor's does not.
       */
      ...(agent.kind === 'delegated'
        ? {
            verifyRunner: async (result: AgentResult) => {
              const branch = result.location?.branch
              if (!branch) return null

              const prepared = await LocalRunner.atRef({ root, ref: branch })
              verifyWorktrees.push(prepared.runner)
              if (prepared.note && !asJson) bullet(c.dim(prepared.note))

              const hasDeps = await fs
                .access(path.join(prepared.runner.cwd, 'node_modules'))
                .then(() => true, () => false)

              if (!hasDeps && profile.packageManager) {
                if (!asJson) bullet(c.dim(`installing dependencies with ${profile.packageManager}…`))
                const install = await prepared.runner.exec(
                  profile.packageManager,
                  ['install', '--frozen-lockfile'],
                  { timeoutMs: 10 * 60_000 },
                )
                if (install.code !== 0) {
                  // Returning null escalates rather than letting the gates fail for a reason
                  // that has nothing to do with the change.
                  warn(
                    `Could not install dependencies to verify the change: ` +
                      `${(install.stderr || install.stdout).trim().split('\n').slice(-3).join(' ')}`,
                  )
                  return null
                }
              }
              return prepared.runner
            },
          }
        : {}),
      renderPrompt: (t, feedback) =>
        renderPrompt({
          task: t,
          ...(context ? { context } : {}),
          ...(index ? { index } : {}),
          ...(feedback ? { feedback } : {}),
          repoBudget: flagNumber(args, 'repo-budget', {
            default: 3_000,
            min: 0,
          }),
          // A delegated agent works inside a checkout and reads the repository's own config,
          // so inlining it again both duplicates what it has and overruns the issue body.
          audience: agent.kind === 'delegated' ? 'delegated' : 'driven',
        }),
      policy: {
        ...DEFAULT_POLICY,
        ...(args.flags.has('max-rounds')
          ? {
              maxFeedbackRounds: flagNumber(args, 'max-rounds', {
                default: 2,
                min: 0,
                max: 20,
              }),
            }
          : {}),
      },
      ...(dryRun ? { dryRun: true } : {}),
    })
    if (!asJson) {
      attachReporter(engine, verbose)
      heading('Run')
    }
    let run = await engine.run(task)

    /*
     * Hand over when one agent gives up.
     *
     * The second agent gets the trajectory-derived package rather than a transcript: what was
     * tried, what failed, what is already on disk. Replaying the conversation would cost as much
     * as the first attempt and carry the reasoning that got it stuck.
     */
    const remaining = chain.slice(1)
    let activeTrajectory = trajectory

    for (const nextAgent of remaining) {
      if (run.state !== 'escalated' && run.state !== 'failed') break

      const pkg = buildHandoff({
        task,
        trajectory: activeTrajectory,
        reason: run.terminalReason ?? `ended in "${run.state}"`,
        fromAgentId: activeTrajectory.meta.agentId,
        runId: run.id,
        round: run.feedbackRound,
        ...(run.result ? { result: run.result } : {}),
        gateOutcomes: run.gateOutcomes,
      })

      heading(`Handing over to ${nextAgent}`)
      bullet(run.terminalReason?.split('\n')[0] ?? `previous agent ended in "${run.state}"`)
      if (pkg.deadEnds.length > 0) {
        bullet(`carrying ${pkg.deadEnds.length} approach(es) already ruled out`)
      }

      /*
       * A trajectory of its own for the next attempt.
       *
       * Sharing one recording across a handover produced a single merged timeline stored under
       * whichever run finished last — so `ctxmux trace` on the run that did the work found nothing,
       * and `learn` could never read the run that got furthest. Two agents made two attempts;
       * that is two recordings.
       *
       * Created before the agent is resolved, because the agent is what records into it.
       */
      const handoffTask = { ...task, id: `${task.id}-via-${nextAgent}` }
      const nextTrajectory = new Trajectory({
        runId: `run-${handoffTask.id}`,
        taskId: handoffTask.id,
        agentId: nextAgent,
        round: 0,
        startedAt: Date.now(),
      })

      let handoffAgent
      try {
        handoffAgent = await resolveAgent({
          ...resolveOptions,
          agent: nextAgent,
          trajectory: nextTrajectory,
        })
      } catch (err) {
        warn(`Could not hand over to ${nextAgent}: ${(err as Error).message}`)
        break
      }

      const health = await handoffAgent.preflight()
      if (!health.ok) {
        warn(`${nextAgent} is unavailable: ${health.detail.split('.')[0]}`)
        continue
      }

      // Write out what the previous agent did before the next one starts.
      await writeTrace(root, run.id, activeTrajectory, dryRun)

      activeTrajectory = nextTrajectory
      activeTrajectory.attribute(handoffAgent.id, runner.cwd)

      const handoffEngine = new Engine({
        agent: handoffAgent,
        runner,
        store: new FileStore(path.join(root, '.ctxmux', 'state')),
        gates,
        tracker,
        renderPrompt: () => renderHandoff(pkg, { tier: handoffTier }),
        policy: { ...DEFAULT_POLICY },
        ...(dryRun ? { dryRun: true } : {}),
      })
      attachReporter(handoffEngine, verbose)

      run = await handoffEngine.run(handoffTask)
    }

    await writeTrace(root, run.id, activeTrajectory, dryRun)

    /*
     * Publish before the worktree is reclaimed, and let a failure be a failure.
     *
     * The branch is the only copy of the agent's work. A publish step that swallowed its own
     * errors would report a green run over a destroyed result, which is the one outcome worth
     * failing loudly for.
     */
    // Worktrees made only to verify somebody else's branch. They hold no work of their own,
    // so unlike the agent's they are always reclaimed.
    for (const w of verifyWorktrees) await w.discard().catch(() => {})

    let publishFailed = false
    /*
     * Only a driven agent has anything to publish.
     *
     * A delegated one opened its own pull request from the vendor's side and never had a local
     * branch, so asking to publish would fail on "no branch of its own" — turning a flag that
     * is set unconditionally in the scaffolded workflow into a failure on every Copilot run.
     */
    const canPublish = openPr && agent.kind === 'driven'
    if (canPublish && !dryRun) {
      const branch = runner.location().branch
      try {
        const { forge, baseBranch } = await resolvePublishTarget(resolveOptions, root)
        const published = await publishRun({
          run,
          runner,
          forge,
          branch,
          baseBranch,
          agentId: agent.id,
        })
        if (run.result) {
          run.result.location = { ...(run.result.location ?? {}), prUrl: published.url, ...(branch ? { branch } : {}) }
          await new FileStore(path.join(root, '.ctxmux', 'state')).save(run.id, run)
        }
        if (!asJson) {
          heading(published.created ? 'Pull request' : 'Pull request (already open)')
          bullet(published.url)
        }
      } catch (err) {
        publishFailed = true
        if (!asJson) {
          error(
            err instanceof PublishError
              ? `Could not publish the work: ${err.message}`
              : `Could not publish the work: ${(err as Error).message}`,
          )
          if (err instanceof PublishError && err.hint) info('    ' + c.dim(err.hint))
        }
      }
    } else if (canPublish && dryRun) {
      if (!asJson) bullet(c.yellow('dry run: would push the branch and open a pull request'))
    }

    /*
     * Give the worktree back when there is nothing in it.
     *
     * A run that changed nothing — gates rejected the task, the agent refused, a dry run — still
     * left a checkout and a branch behind, and nothing ever collected them. Disposing keeps
     * anything the agent actually produced; it only reclaims the empty ones.
     */
    await reclaim()
    // Cleared by `dispose` when the worktree was reclaimed, so this is also the answer to
    // "is there still anything here to look at".
    const worktree = runner.location().worktree ?? null

    /*
     * A run whose work could not be published did not succeed.
     *
     * The gates passed and the state machine is content, so every other signal here says 0 —
     * and on a CI runner the branch that 0 refers to is about to be deleted. Exit 1 so a
     * workflow stops rather than closing the ticket over a result nobody can reach.
     */
    const outcome = asJson ? exitCodeFor(run, dryRun) : reportOutcome(run, isolated ? worktree : null, dryRun)
    const code = publishFailed && outcome === 0 ? 1 : outcome

    if (asJson) {
      // One line, on stdout, and nothing else — so a caller can pipe it straight into a parser.
      info(JSON.stringify(summarise(run, isolated ? worktree : null, code)))
      await reclaim()
      return code
    }

    const smells = activeTrajectory.length > 0 ? inspectTrajectory(activeTrajectory) : []
    if (smells.length > 0) {
      heading('What the agent did')
      for (const smell of smells) {
        const tag = smell.severity === 'block' ? c.red(smell.severity) : c.yellow(smell.severity)
        bullet(`${tag} ${smell.detail}`)
        info(`      ${c.dim(smell.advice)}`)
      }
    }

    if (activeTrajectory.length > 0 && !dryRun) {
      info('')
      info(c.dim(`  ${activeTrajectory.length} step(s) recorded — ctxmux trace ${run.id}`))

      /*
       * Export only when asked.
       *
       * Off by default and silent about it: a tool that posts your work somewhere because an
       * environment variable happened to be set is not one people should have to audit. When a
       * collector *is* configured, a failure to reach it is reported and never allowed to affect
       * the run — telemetry that can break what it observes is worse than none.
       */
      const otlp = flagString(args, 'otlp') ?? endpointFromEnv()
      if (otlp) {
        const exported = await exportTrajectory(activeTrajectory, {
          endpoint: otlp,
          headers: headersFromEnv(),
        })
        info(c.dim(`  ${exported.detail}`))
      }
    }

    return code
  } finally {
    await reclaim()
  }
}

/** `ctxmux status` — what has been run, and what is waiting on a human. */
export async function statusCommand(args: ParsedArgs): Promise<number> {
  const root = path.resolve(flagString(args, 'root') ?? process.cwd())
  const store = new FileStore(path.join(root, '.ctxmux', 'state'))
  const ids = await store.list()

  if (ids.length === 0) {
    info('No runs recorded yet.')
    info(c.dim('  Start one with `ctxmux run <task>`.'))
    return 0
  }

  const runs: Run[] = []
  for (const id of ids) {
    const loaded = (await store.load(id)) as Run | null
    if (loaded) runs.push(loaded)
  }

  const badge: Record<string, string> = {
    completed: c.green('completed'),
    in_review: c.cyan('in review'),
    escalated: c.red('needs human'),
    rejected: c.yellow('rejected'),
    failed: c.red('failed'),
  }

  heading(`Runs (${runs.length})`)
  for (const run of runs) {
    const state = badge[run.state] ?? run.state
    const cost = run.result?.usage?.costUsd
    // Right-aligned so a column of figures can be read down rather than across.
    const money = cost !== undefined ? `$${cost.toFixed(2)}`.padStart(8) : ''.padStart(8)
    info(`  ${run.task.id.padEnd(14)} ${state.padEnd(22)}${money}  ${c.dim(run.task.title.slice(0, 44))}`)
    if (run.terminalReason) info(`    ${c.dim(run.terminalReason.split('\n')[0] ?? '')}`)
  }

  /*
   * What this has cost, and what it has cost somewhere this cannot see.
   *
   * The figure was recorded on every run and shown by none of them, so the one question worth
   * asking after a week of use — what has this spent — had no answer short of reading JSON out
   * of `.ctxmux/state`.
   */
  const priced = runs.filter((r) => r.result?.usage?.costUsd !== undefined)
  const total = priced.reduce((sum, r) => sum + (r.result!.usage!.costUsd ?? 0), 0)

  /*
   * A delegated agent's spend is real and invisible here.
   *
   * Copilot runs in GitHub's cloud and bills against an organisation's premium-request
   * allowance, which no API exposes per task. Printing nothing reads as "free"; naming it
   * reads as what it is.
   */
  const delegated = runs.filter(
    (r) => r.result?.usage?.costUsd === undefined && r.result?.location?.prUrl,
  )

  if (priced.length > 0 || delegated.length > 0) {
    info('')
    if (priced.length > 0) {
      info(`${c.bold(`$${total.toFixed(2)}`)} across ${priced.length} run(s) that reported a cost.`)
    }
    if (delegated.length > 0) {
      info(
        c.dim(
          `${delegated.length} run(s) went to a cloud agent, which bills separately — ` +
            'see your provider’s usage page.',
        ),
      )
    }
  }

  const needsHuman = runs.filter((r) => r.state === 'escalated' || r.state === 'in_review')
  if (needsHuman.length > 0) {
    info('')
    info(`${needsHuman.length} run(s) waiting on you.`)
  }
  return 0
}
