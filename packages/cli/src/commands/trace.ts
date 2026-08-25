/**
 * `ctxmux trace` — what the agent actually did.
 *
 * The run report says whether a change passed. This says how it was arrived at, which is a
 * different and often more useful question: an agent that produced the right diff by reading
 * three files is not the same as one that produced it after eleven failed attempts, even
 * though both show as passed.
 */
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import {
  endpointFromEnv,
  exportTrajectory,
  headersFromEnv,
  inspect,
  Trajectory,
  toOtlp,
  type TrajectoryData,
} from '@contextmux/trajectory'
import { bullet, c, error, heading, info, success, warn } from '../ui.js'
import { flagBool, flagNumber, flagString, type ParsedArgs } from '../args.js'

const TRACE_DIR = '.ctxmux/state/traces'

async function load(root: string, runId: string): Promise<Trajectory | null> {
  const file = path.join(root, TRACE_DIR, `${encodeURIComponent(runId)}.json`)
  try {
    return Trajectory.from(JSON.parse(await fs.readFile(file, 'utf8')) as TrajectoryData)
  } catch {
    return null
  }
}

async function list(root: string): Promise<string[]> {
  try {
    const files = await fs.readdir(path.join(root, TRACE_DIR))
    return files.filter((f) => f.endsWith('.json')).map((f) => decodeURIComponent(f.replace(/\.json$/, '')))
  } catch {
    return []
  }
}

export async function traceCommand(args: ParsedArgs): Promise<number> {
  const root = path.resolve(flagString(args, 'root') ?? process.cwd())
  const target = args.positionals[0]
  const limit = flagNumber(args, 'limit', { default: 60, min: 1 })
  const onlyTools = flagBool(args, 'tools')

  const available = await list(root)

  if (!target) {
    if (available.length === 0) {
      info('No traces recorded yet.')
      info(c.dim('  `ctxmux run` records one per run, unless --no-recovery is passed.'))
      return 0
    }
    heading(`Traces (${available.length})`)
    for (const id of available) {
      const trajectory = await load(root, id)
      if (!trajectory) continue
      const tools = trajectory.of('tool').length
      const result = trajectory.of('result').at(-1)
      bullet(`${id.padEnd(20)} ${String(trajectory.length).padStart(4)} steps, ${tools} tool call(s)  ${c.dim(result?.name ?? 'incomplete')}`)
    }
    info('')
    info(c.dim(`  ctxmux trace ${available[0]}`))
    return 0
  }

  // Accept a run id or a bare task id, since both are things a person has to hand.
  const trajectory = (await load(root, target)) ?? (await load(root, `run-${target}`))
  if (!trajectory) {
    error(`No trace for "${target}".`)
    if (available.length > 0) {
      info('')
      info('Available:')
      for (const id of available.slice(0, 10)) bullet(id)
    }
    return 1
  }

  // Export or print the payload, for sending a past run somewhere or inspecting what would be.
  const otlp = flagString(args, 'otlp') ?? (flagBool(args, 'export') ? endpointFromEnv() : undefined)
  if (flagBool(args, 'otlp-json')) {
    info(JSON.stringify(toOtlp(trajectory), null, 2))
    return 0
  }
  if (otlp) {
    const result = await exportTrajectory(trajectory, { endpoint: otlp, headers: headersFromEnv() })
    if (result.ok) success(result.detail)
    else error(result.detail)
    return result.ok ? 0 : 1
  }

  const meta = trajectory.meta
  const elapsed = meta.endedAt ? Math.round((meta.endedAt - meta.startedAt) / 1000) : null

  heading(`${meta.runId} — ${meta.agentId}`)
  bullet(`task ${meta.taskId}, round ${meta.round}`)
  bullet(
    `${trajectory.length} step(s): ${trajectory.of('tool').length} tool call(s), ` +
      `${trajectory.of('message').length} message(s)` +
      (elapsed !== null ? `, ${elapsed}s` : ''),
  )
  if (trajectory.toJSON().dropped > 0) {
    bullet(c.dim(`${trajectory.toJSON().dropped} step(s) dropped to bound the record`))
  }

  heading('Timeline')
  if (onlyTools) {
    // Just the actions, for reading a long run quickly.
    const start = meta.startedAt
    for (const step of trajectory.of('tool').slice(-limit)) {
      const at = `${Math.round((step.at - start) / 1000)}s`.padStart(6)
      const failed = (step.data as { ok?: boolean } | undefined)?.ok === false
      const name = failed ? c.red(step.name) : step.name
      info(`${at}  ${name.padEnd(20)} ${trajectory.describe(step)}`)
    }
  } else {
    info(trajectory.render({ limit }))
  }

  const smells = inspect(trajectory)
  if (smells.length === 0) {
    info('')
    success('Nothing concerning in how this was done.')
    return 0
  }

  heading('Concerns')
  for (const smell of smells) {
    const tag = smell.severity === 'block' ? c.red(smell.severity) : c.yellow(smell.severity)
    info(`  ${tag} ${c.bold(smell.name)}`)
    info(`    ${smell.detail}`)
    info(`    ${c.dim(smell.advice)}`)
    info(`    ${c.dim(`steps ${smell.evidence.slice(0, 8).join(', ')}`)}`)
  }

  if (smells.some((s) => s.severity === 'block')) {
    info('')
    warn('This run did something that cannot be undone by restoring files.')
    return 2
  }
  return 0
}
