import { buildIndex, buildMap, detectProfile, renderProfile } from '@contextmux/repo'
import { bullet, c, heading, info, warn } from '../ui.js'
import { flagBool, flagNumber, flagString, type ParsedArgs } from '../args.js'

export async function mapCommand(args: ParsedArgs): Promise<number> {
  const root = flagString(args, 'root') ?? process.cwd()
  const budget = flagNumber(args, 'budget', { default: 4_000, min: 100 })
  const symbols = flagString(args, 'symbols')?.split(',').map((s) => s.trim()).filter(Boolean)
  const paths = flagString(args, 'paths')?.split(',').map((s) => s.trim()).filter(Boolean)
  const noCache = flagBool(args, 'no-cache')
  const showProfile = flagBool(args, 'profile')
  const text = args.positionals.join(' ')

  if (!Number.isFinite(budget) || budget <= 0) {
    warn('--budget must be a positive number of tokens.')
    return 1
  }

  if (showProfile) {
    const profile = await detectProfile(root)
    info(renderProfile(profile))
    return 0
  }

  if (!text && !symbols && !paths) {
    warn('Nothing to search for.')
    info('')
    info('  ctxmux map "add a date formatting helper"')
    info('  ctxmux map --symbols "use*,*Selector" --budget 2000')
    info('  ctxmux map --profile')
    return 1
  }

  const started = Date.now()
  const index = await buildIndex(root, { noCache })
  const indexMs = Date.now() - started

  const result = buildMap(index, {
    ...(text ? { text } : {}),
    ...(symbols ? { symbols } : {}),
    ...(paths ? { paths } : {}),
    budget,
  })

  info(result.text)

  heading('Index')
  bullet(`${index.files.length} file(s) indexed, ${index.skipped} skipped, ${indexMs}ms`)
  if (index.truncated) {
    // A partial index answers "nothing similar exists" just as confidently as a complete one.
    warn(`The index stopped at the file ceiling, so this map covers only part of the repository.`)
    info('    ' + c.dim('Raise it with --max-files, or narrow the map with --paths.'))
  }
  bullet(`${result.totalCandidates} candidate(s) matched, ${result.files.length} rendered, ${result.omitted} omitted`)
  bullet(`~${result.estimatedTokens} tokens of ${budget} budget`)
  if (index.git.commitCounts.size === 0) {
    info('    ' + c.dim('No git history available — recency and co-change ranking are inactive.'))
  }
  return 0
}
