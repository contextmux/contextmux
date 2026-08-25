import { ContextError, renderFidelityReport, sync, TARGETS, type Target } from '@contextmux/context'
import { bullet, c, error, heading, info, success, warn, STATUS_LABEL } from '../ui.js'
import { flagBool, flagString, type ParsedArgs } from '../args.js'

export function parseTargets(raw: string | undefined): Target[] | undefined {
  if (!raw) return undefined
  const list = raw.split(',').map((t) => t.trim()).filter(Boolean)
  const bad = list.filter((t) => !TARGETS.includes(t as Target))
  if (bad.length > 0) {
    throw new ContextError(`Unknown target(s): ${bad.join(', ')}`, [
      { level: 'error', message: `Valid targets are: ${TARGETS.join(', ')}` },
    ])
  }
  return list as Target[]
}

export async function syncCommand(args: ParsedArgs): Promise<number> {
  const dryRun = flagBool(args, 'dry-run', 'n')
  const force = flagBool(args, 'force', 'f')
  const explain = flagBool(args, 'explain')
  const targets = parseTargets(flagString(args, 'targets', 't'))
  const root = flagString(args, 'root') ?? process.cwd()

  const report = await sync({ root, targets, dryRun, force })

  for (const w of report.context.warnings) {
    warn(`${w.file ? w.file + ': ' : ''}${w.message}`)
    if (w.hint) info('    ' + c.dim(w.hint))
  }

  const byTarget = new Map<string, typeof report.records>()
  for (const r of report.records) {
    const list = byTarget.get(r.target) ?? []
    list.push(r)
    byTarget.set(r.target, list)
  }

  heading(dryRun ? 'Plan' : 'Written')
  for (const [target, records] of byTarget) {
    const changed = records.filter((r) => r.status !== 'unchanged')
    const label = changed.length === 0 ? c.dim('no changes') : `${changed.length} change(s)`
    info('  ' + c.bold(target) + '  ' + label)
    for (const r of records) {
      if (r.status === 'unchanged') continue
      const raw = STATUS_LABEL[r.status] ?? r.status
      const tag = r.status === 'drift' ? c.yellow(raw) : raw
      bullet(tag.padEnd(8) + ' ' + r.path)
    }
  }

  if (explain) {
    heading('Fidelity')
    info(renderFidelityReport(report.fidelity))
  }

  if (report.hasDrift) {
    const drifted = report.records.filter((r) => r.status === 'drift')
    heading('Skipped: hand-edited')
    for (const r of drifted) bullet(r.path)
    info('')
    warn(`${drifted.length} generated file(s) were edited by hand and were left alone.`)
    info('    ' + c.dim('Move your changes into .ctxmux/ so they survive, or re-run with --force to discard them.'))
    return 2
  }

  if (!dryRun && report.hasChanges) {
    success(`Synced ${report.records.filter((r) => r.status !== 'unchanged').length} file(s).`)
  } else if (!report.hasChanges) {
    success('Everything already up to date.')
  }

  if (!explain) {
    const degraded = report.fidelity.filter((f) => f.degradedCount > 0)
    if (degraded.length > 0) {
      info('')
      info(c.dim(`Some content was degraded for ${degraded.map((d) => d.displayName).join(', ')}. Run with --explain for details.`))
    }
  }

  return 0
}

export async function checkCommand(args: ParsedArgs): Promise<number> {
  const strict = flagBool(args, 'strict')
  const targets = parseTargets(flagString(args, 'targets', 't'))
  const root = flagString(args, 'root') ?? process.cwd()

  const report = await sync({ root, targets, dryRun: true })
  const changed = report.records.filter((r) => r.status !== 'unchanged')

  if (report.hasDrift) {
    const drifted = report.records.filter((r) => r.status === 'drift')
    error(`${drifted.length} generated file(s) have been edited by hand:`)
    for (const r of drifted) bullet(r.path)
    info('')
    info('Generated files are overwritten by `ctxmux sync`. Move these edits into .ctxmux/.')
    return 2
  }

  if (changed.length > 0) {
    error(`${changed.length} file(s) are out of date with .ctxmux/:`)
    for (const r of changed) bullet((STATUS_LABEL[r.status] ?? r.status) + ' ' + r.path)
    info('')
    info('Run `ctxmux sync` and commit the result.')
    return 1
  }

  if (strict && !report.context.config.provenance) {
    error('provenance is disabled in config, so drift cannot be detected and `check` cannot guarantee anything.')
    return 1
  }

  success('All targets are in sync with .ctxmux/.')
  return 0
}

export function reportContextError(err: unknown): number {
  if (err instanceof ContextError) {
    // `message` already folds in the diagnostics; printing both would duplicate them.
    error(err.message)
    return 1
  }
  throw err
}
