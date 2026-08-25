import { importContext, writeImport } from '@contextmux/context'
import { bullet, c, heading, info, success, warn } from '../ui.js'
import { flagBool, flagString, type ParsedArgs } from '../args.js'

export async function importCommand(args: ParsedArgs): Promise<number> {
  const root = flagString(args, 'root') ?? process.cwd()
  const dryRun = flagBool(args, 'dry-run', 'n')
  const force = flagBool(args, 'force', 'f')

  const result = await importContext(root)

  if (result.files.length === 0) {
    for (const d of result.diagnostics) {
      warn(d.message)
      if (d.hint) info('    ' + c.dim(d.hint))
    }
    return 1
  }

  const written = await writeImport(root, result, { force, dryRun })
  const skipped = result.files.length - written.length

  heading(dryRun ? 'Would import' : 'Imported')
  const byKind = new Map<string, number>()
  for (const p of result.provenance) {
    byKind.set(p.kind, (byKind.get(p.kind) ?? 0) + 1)
  }
  const plural = (kind: string, n: number) =>
    n === 1 || kind.endsWith('s') ? kind : `${kind}s`
  for (const [kind, count] of byKind) bullet(`${count} ${plural(kind, count)}`)

  heading('Sources')
  const seen = new Set<string>()
  for (const p of result.provenance) {
    if (seen.has(p.from)) continue
    seen.add(p.from)
    bullet(`${p.from} ${c.dim('->')} ${p.to}`)
  }

  if (result.diagnostics.length > 0) {
    heading('Review these')
    for (const d of result.diagnostics) {
      warn(`${d.file ? d.file + ': ' : ''}${d.message}`)
      if (d.hint) info('    ' + c.dim(d.hint))
    }
  }

  if (skipped > 0) {
    info('')
    warn(`${skipped} file(s) already existed in .ctxmux/ and were left alone. Use --force to replace them.`)
  }

  info('')
  if (dryRun) {
    success(`${written.length} file(s) would be written. Re-run without --dry-run to apply.`)
  } else {
    success(`Wrote ${written.length} file(s) to .ctxmux/.`)
    info('')
    info('Next: review the imported content, then run ' + c.bold('ctxmux sync --explain'))
    info(c.dim('       to see how it compiles to each agent and what each one loses.'))
  }
  return 0
}
