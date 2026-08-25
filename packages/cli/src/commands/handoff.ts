/**
 * `ctxmux handoff` — inspect what would be transferred to the next agent.
 *
 * Exists mainly so the transfer format can be argued with. The interesting question — what is
 * the *minimum* an agent needs to continue someone else's work — is answerable only if the
 * package can be measured, so this prints the cost of each tier alongside what it contains.
 */
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { FileStore, type Run } from '@contextmux/core'
import { Trajectory, type TrajectoryData } from '@contextmux/trajectory'
import { buildHandoff, measureTiers, renderHandoff, type RenderTier } from '@contextmux/handoff'
import { bullet, c, error, heading, info, success, warn } from '../ui.js'
import { flagString, type ParsedArgs } from '../args.js'

async function loadTrajectory(root: string, runId: string): Promise<Trajectory | null> {
  const file = path.join(root, '.ctxmux/state/traces', `${encodeURIComponent(runId)}.json`)
  try {
    return Trajectory.from(JSON.parse(await fs.readFile(file, 'utf8')) as TrajectoryData)
  } catch {
    return null
  }
}

export async function handoffCommand(args: ParsedArgs): Promise<number> {
  const root = path.resolve(flagString(args, 'root') ?? process.cwd())
  const target = args.positionals[0]
  const tier = (flagString(args, 'tier') ?? 'valuable') as RenderTier
  const show = flagString(args, 'render') !== undefined || flagString(args, 'tier') !== undefined

  if (!target) {
    warn('Which run?')
    info('')
    info('  ctxmux handoff run-T-1              ' + c.dim('what would be transferred'))
    info('  ctxmux handoff T-1 --tier essential ' + c.dim('render at a tier'))
    return 1
  }

  const store = new FileStore(path.join(root, '.ctxmux', 'state'))
  const run = ((await store.load(target)) ?? (await store.load(`run-${target}`))) as Run | null
  if (!run) {
    error(`No run "${target}".`)
    return 1
  }

  const trajectory =
    (await loadTrajectory(root, run.id)) ??
    new Trajectory({ runId: run.id, taskId: run.task.id, agentId: 'unknown', round: 0, startedAt: Date.now() })

  const pkg = buildHandoff({
    task: run.task,
    trajectory,
    reason: run.terminalReason ?? `run ended in "${run.state}"`,
    fromAgentId: trajectory.meta.agentId,
    runId: run.id,
    round: run.feedbackRound,
    ...(run.result ? { result: run.result } : {}),
    gateOutcomes: run.gateOutcomes,
  })

  if (show) {
    info(renderHandoff(pkg, { tier }))
    return 0
  }

  heading(`Handoff from ${pkg.from.agentId}`)
  bullet(pkg.reason)

  if (pkg.deadEnds.length > 0) {
    heading(`Already ruled out (${pkg.deadEnds.length})`)
    for (const end of pkg.deadEnds) {
      bullet(`${end.approach} — ${end.outcome}${end.attempts > 1 ? ` (${end.attempts}x)` : ''}`)
    }
  } else {
    heading('Already ruled out')
    info(c.dim('  nothing — the trajectory records no failed or repeated approach'))
  }

  if (pkg.failedChecks.length > 0) {
    heading('Still failing')
    for (const check of pkg.failedChecks) bullet(`${check.gate}: ${check.reason.split('\n')[0]}`)
  }

  heading('Work already done')
  bullet(pkg.progress.diffSummary)
  if (pkg.workspace.worktree) bullet(c.dim(pkg.workspace.worktree))

  /*
   * The measurement is the point.
   *
   * A transfer format nobody has measured is a claim about what matters. Printing what each
   * tier costs turns it into something that can be tested against completion rates.
   */
  heading('Cost by tier')
  for (const m of measureTiers(pkg)) {
    const label =
      m.tier === 'none'
        ? 'task only (control)'
        : m.tier === 'essential'
          ? 'task + workspace'
          : m.tier === 'valuable'
            ? '+ what was ruled out'
            : '+ everything else'
    info(`  ${m.tier.padEnd(10)} ${String(m.tokens).padStart(5)} tokens  ${c.dim(label)}`)
  }

  info('')
  info(`  ${c.bold('ctxmux handoff ' + target + ' --tier valuable')}  ${c.dim('see the prompt itself')}`)
  info(`  ${c.dim('Run the same task at each tier with `ctxmux eval` to find out which parts earn their cost.')}`)

  success('')
  return 0
}
