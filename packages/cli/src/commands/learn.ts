/**
 * `ctxmux learn` — turn what agents got wrong into proposed edits to your context.
 *
 * Three verbs, and the split matters. `harvest` observes finished runs. Running it bare shows
 * what recurred. `--apply` writes an approved lesson into `.ctxmux/`.
 *
 * Nothing is ever applied without a person saying so. Context is what every agent reads, and
 * an automated process editing it unsupervised is how prompts rot — gradually, invisibly, and
 * in a way nobody can attribute afterwards.
 */
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { FileStore, type Run } from '@contextmux/core'
import { loadContext, writeFileAtomic } from '@contextmux/context'
import {
  extractSignals,
  isExemplary,
  learn,
  Ledger,
  toExemplar,
  type Exemplar,
  type Proposal,
} from '@contextmux/learn'
import { Trajectory, type TrajectoryData } from '@contextmux/trajectory'
import { bullet, c, error, heading, info, success, warn } from '../ui.js'
import { flagBool, flagNumber, flagString, type ParsedArgs } from '../args.js'

const LEARN_DIR = '.ctxmux/state'

/** Show an amendment as the lines it adds, rather than as a wall of unchanged text. */
function renderChange(proposal: Proposal): string[] {
  if (!proposal.before) {
    return proposal.content
      .split('\n')
      .filter((l) => l.trim())
      .slice(0, 8)
      .map((l) => c.green(`+ ${l}`))
  }

  const before = new Set(proposal.before.split('\n'))
  return proposal.content
    .split('\n')
    .filter((line) => line.trim() && !before.has(line))
    .map((line) => c.green(`+ ${line}`))
}

async function loadTrajectory(root: string, runId: string): Promise<Trajectory | null> {
  const file = path.join(root, '.ctxmux/state/traces', `${encodeURIComponent(runId)}.json`)
  try {
    return Trajectory.from(JSON.parse(await fs.readFile(file, 'utf8')) as TrajectoryData)
  } catch {
    return null
  }
}

interface Harvest {
  recorded: number
  exemplars: Exemplar[]
  /** Runs that finished well but were not clean enough to learn an approach from. */
  nearMisses: number
}

/**
 * Read finished runs for both kinds of lesson.
 *
 * One pass, because the two signals come from the same runs: what went wrong is in the gate
 * outcomes and the feedback, what went right is in the trajectory of a run that needed
 * neither.
 */
async function harvest(root: string, ledger: Ledger): Promise<Harvest> {
  const store = new FileStore(path.join(root, LEARN_DIR))
  let recorded = 0
  let nearMisses = 0
  const exemplars: Exemplar[] = []

  for (const id of await store.list()) {
    const run = (await store.load(id)) as Run | null
    if (!run) continue

    /*
     * Only finished runs.
     *
     * A run still in flight can still change its mind, and a lesson drawn from an intermediate
     * state may be contradicted by the final result.
     */
    if (!['completed', 'in_review', 'escalated', 'rejected', 'failed'].includes(run.state)) continue

    recorded += ledger.record(extractSignals(run))

    const trajectory = await loadTrajectory(root, run.id)
    if (!trajectory) continue

    const verdict = isExemplary(run, trajectory)
    if (!verdict.ok) {
      if (run.state === 'completed' || run.state === 'in_review') nearMisses += 1
      continue
    }

    exemplars.push(
      toExemplar({
        taskId: run.task.id,
        runId: run.id,
        taskText: `${run.task.title}\n${run.task.body}`,
        trajectory,
        files: run.result?.filesChanged ?? [],
      }),
    )
  }

  return { recorded, exemplars, nearMisses }
}

export async function learnCommand(args: ParsedArgs): Promise<number> {
  const root = path.resolve(flagString(args, 'root') ?? process.cwd())
  const apply = flagBool(args, 'apply')
  const rejectId = flagString(args, 'reject')
  const reconsiderId = flagString(args, 'reconsider')
  const showAll = flagBool(args, 'all')
  const minTasks = flagNumber(args, 'min-tasks', { default: 2, min: 1 })

  const ledger = await Ledger.open(path.join(root, LEARN_DIR))
  if (ledger.warning) {
    // Starting fresh is the right recovery; doing it silently is not. This file holds the
    // lessons a human has already declined, and losing it quietly makes them all come back.
    warn(`Could not read the existing ledger: ${ledger.warning}`)
    info('    ' + c.dim('It has been kept as learn.json.corrupt. Starting from an empty ledger.'))
  }

  const context = await loadContext({ root }).then(
    (ctx) => ctx.model,
    () => null,
  )
  if (!context) {
    error('No .ctxmux/ directory here.')
    info('    ' + c.dim('Learning proposes edits to your context, so there has to be one. Run `ctxmux init`.'))
    return 1
  }

  // --- decisions ----------------------------------------------------------
  if (rejectId) {
    const found = ledger.entries.find((e) => e.id === rejectId)
    ledger.mark(rejectId, 'rejected', found?.lesson ?? rejectId, found?.taskCount ?? 0, flagString(args, 'note'))
    await ledger.save()
    success(`${rejectId} rejected. It will not be proposed again.`)
    info('    ' + c.dim(`Changed your mind later: ctxmux learn --reconsider ${rejectId}`))
    return 0
  }

  if (reconsiderId) {
    if (!ledger.reconsider(reconsiderId)) {
      warn(`No decision recorded for ${reconsiderId}.`)
      return 1
    }
    await ledger.save()
    success(`${reconsiderId} will be considered again.`)
    return 0
  }

  // --- observe ------------------------------------------------------------
  const harvested = await harvest(root, ledger)
  const result = await learn({
    ledger,
    context,
    read: (p) => fs.readFile(path.resolve(root, p), 'utf8').then((t) => t, () => null),
    cluster: { minTasks },
    includeDecided: showAll,
    exemplars: harvested.exemplars,
    approach: { minTasks },
  })

  const stats = ledger.stats()
  heading('Observations')
  bullet(`${stats.signals} recorded${harvested.recorded > 0 ? ` (${harvested.recorded} new)` : ''}`)
  bullet(
    `${harvested.exemplars.length} run(s) succeeded first time` +
      (harvested.nearMisses > 0
        ? c.dim(`, ${harvested.nearMisses} finished but needed help`)
        : ''),
  )
  bullet(`${stats.applied} lesson(s) applied, ${stats.rejected} rejected`)

  const all = [...result.proposals, ...result.approaches]

  if (all.length === 0) {
    await ledger.save()
    info('')
    if (result.suppressed.length > 0) {
      success('Nothing new. Recurring lessons you have already decided on:')
      for (const item of result.suppressed) {
        bullet(`${c.dim(item.id)} ${item.lesson.slice(0, 70)} ${c.dim(`(${item.status})`)}`)
      }
    } else if (stats.signals === 0 && harvested.exemplars.length === 0) {
      success('Nothing recorded yet.')
      info(
        '    ' +
          c.dim(
            'Lessons come from review comments and gate failures; approaches come from runs that succeeded first time.',
          ),
      )
    } else if (stats.signals === 0) {
      /*
       * Exemplary runs exist but produced nothing new, usually because their approach is
       * already written down. Saying "no feedback recorded" here would simply be untrue, and a
       * tool that misreports its own state is one people stop trusting on the things they
       * cannot check.
       */
      success(
        `Nothing new. ${harvested.exemplars.length} run(s) succeeded first time, and their approach is already captured.`,
      )
    } else {
      success(`Nothing has recurred across ${minTasks}+ tasks yet.`)
      info('    ' + c.dim('A point made once is a preference; one made repeatedly is a convention worth writing down.'))
    }
    return 0
  }

  // --- propose ------------------------------------------------------------
  if (result.proposals.length > 0) {
    heading(`${result.proposals.length} lesson(s) from what went wrong`)
  }

  for (const proposal of result.proposals) {
    info('')
    info(`${c.bold(proposal.id)}  ${c.dim(`seen across ${proposal.taskCount} tasks`)}`)
    info(`  ${proposal.lesson}`)
    info('')
    info(
      `  ${c.dim(proposal.kind === 'new-rule' ? 'new rule' : `amends ${proposal.target}`)} ${c.dim('->')} ${proposal.path}`,
    )
    for (const line of renderChange(proposal)) info(`  ${line}`)

    info('')
    info(`  ${c.dim('because:')}`)
    for (const item of proposal.evidence.slice(0, 3)) {
      info(`    ${c.dim(`${item.taskId} (${item.source}):`)} ${item.text.split('\n')[0]?.slice(0, 80)}`)
    }
  }

  if (result.approaches.length > 0) {
    heading(`${result.approaches.length} approach(es) that keep working`)
    for (const proposal of result.approaches) {
      info('')
      info(`${c.bold(proposal.id)}  ${c.dim(`succeeded first time on ${proposal.taskCount} tasks`)}`)
      info(`  ${proposal.lesson}`)
      info('')
      info(`  ${c.dim('new skill')} ${c.dim('->')} ${proposal.path}`)
      for (const line of renderChange(proposal).slice(0, 8)) info(`  ${line}`)
      info('')
      info(`  ${c.dim('because:')}`)
      for (const item of proposal.evidence.slice(0, 3)) {
        info(`    ${c.dim(`${item.taskId}:`)} ${item.text.slice(0, 70)}`)
      }
    }
  }

  if (!apply) {
    info('')
    info('Nothing has been written.')
    info(`  ${c.bold('ctxmux learn --apply')}              ${c.dim('write these into .ctxmux/')}`)
    info(`  ${c.bold('ctxmux learn --reject <id>')}        ${c.dim('decline one, permanently')}`)
    await ledger.save()
    return 0
  }

  // --- apply --------------------------------------------------------------
  heading('Applying')
  const applied: string[] = []
  let skipped = 0

  for (const proposal of all) {
    const abs = path.resolve(root, proposal.path)
    const current = await fs.readFile(abs, 'utf8').then(
      (t) => t,
      () => null,
    )

    /*
     * Refuse to write over anything this proposal did not come from.
     *
     * Two ways that used to happen, both silent. A new rule is named from the lesson's own
     * words, so it can land on the name of a rule somebody wrote by hand — and the write
     * replaced it outright. And an amendment is computed against the file as it was when the
     * proposal was made; if it changed in between, writing the precomputed content discards
     * whatever the change was.
     *
     * Neither is a case to resolve automatically. The proposal is still in the ledger, so
     * declining costs the user one re-run and never costs them their own work.
     */
    if (proposal.before === undefined && current !== null) {
      warn(`${proposal.path} already exists — left alone.`)
      info('    ' + c.dim('Rename or remove it if you want this lesson written there.'))
      skipped += 1
      continue
    }
    if (proposal.before !== undefined && current !== null && current !== proposal.before) {
      warn(`${proposal.path} changed since this was proposed — left alone.`)
      info('    ' + c.dim('Re-run `ctxmux learn` to propose it against the file as it is now.'))
      skipped += 1
      continue
    }

    await writeFileAtomic(abs, proposal.content)
    ledger.mark(proposal.id, 'applied', proposal.lesson, proposal.taskCount)
    applied.push(proposal.path)
    bullet(`${proposal.kind === 'new-rule' ? 'created' : 'amended'} ${proposal.path}`)
  }

  /*
   * Retire the evidence behind what was applied.
   *
   * Its work is done: the lesson is written into the context, and `shouldPropose` keeps it from
   * being raised again. Left in place it would go on being re-clustered and re-suppressed
   * forever, and — the part that actually costs something — go on occupying the retention cap
   * that fresh observations need.
   */
  const retired = ledger.compact(
    all.filter((p) => applied.includes(p.path)).flatMap((p) => p.signalKeys),
  )

  await ledger.save()

  info('')
  if (applied.length === 0) {
    warn(`Nothing was written; ${skipped} proposal(s) were left alone.`)
    return 1
  }
  success(
    `Wrote ${applied.length} change(s) to .ctxmux/.` +
      (skipped > 0 ? ` ${skipped} left alone.` : '') +
      (retired > 0 ? c.dim(` ${retired} observation(s) retired.`) : ''),
  )
  info('')
  info('Next:')
  info(`  1. ${c.bold('git diff .ctxmux/')}   ${c.dim('review what was written — these are proposals, not truth')}`)
  info(`  2. ${c.bold('ctxmux sync')}             ${c.dim('compile the change out to every agent')}`)
  return 0
}
