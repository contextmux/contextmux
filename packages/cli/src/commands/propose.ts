import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { writeFileAtomic } from '@contextmux/context'
import { generate, type Proposal } from '@contextmux/council'
import { loadConfig } from '@contextmux/context'
import { detectProfile, listTrackedFiles } from '@contextmux/repo'
import { bullet, c, heading, info, success, warn } from '../ui.js'
import { flagBool, flagString, type ParsedArgs } from '../args.js'
import { judgeFor } from './advise.js'

/**
 * Ask a council of agents what rules this repository should have.
 *
 * Prints by default and writes only when told to. Everything else in contextmux proposes and
 * lets a human approve, and rules that appeared in `.ctxmux/` without anyone agreeing to them
 * would be the one place the product broke its own habit — doubly so here, where what gets
 * written is then read by every agent on every task.
 */
export async function proposeCommand(args: ParsedArgs): Promise<number> {
  const root = flagString(args, 'root') ?? process.cwd()
  const write = flagBool(args, 'write')
  const json = flagBool(args, 'json')
  const limit = Number(flagString(args, 'limit') ?? '8')
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error(`--limit takes a whole number of rules, not "${flagString(args, 'limit')}".`)
  }

  const profile = await detectProfile(root)
  const tracked = await listTrackedFiles(root)

  if (!json) {
    info(c.dim('Asking four agents, each given a different thing to care about. This costs money.'))
  }

  const { proposals, silent } = await generate(
    {
      packageManager: profile.packageManager,
      languages: profile.languages,
      frameworks: profile.frameworks,
      qualityGate: profile.qualityGate,
      isMonorepo: profile.isMonorepo,
      sampleFiles: (tracked ?? []).slice(0, 40),
    },
    judgeFor(flagString(args, 'agent') ?? (await loadConfig(root).catch(() => ({ agent: undefined }))).agent, flagString(args, 'model')),
    { limit },
  )

  if (json) {
    info(JSON.stringify({ proposals, silent }, null, 2))
    return 0
  }

  for (const s of silent) warn(`${s.persona} said nothing: ${s.reason}`)

  if (proposals.length === 0) {
    info('')
    info('No rules proposed. That is a real answer — this repository may not need any written down.')
    return 0
  }

  heading('Proposed')
  for (const p of proposals) {
    // How many independent voices reached it is the only quality signal available without
    // paying again, so it goes next to the name rather than in a footnote.
    bullet(`${c.bold(p.name)}  ${c.dim(`${p.from.length} of 4: ${p.from.join(', ')}`)}`)
    if (p.globs.length > 0) info('    ' + c.dim(`applies to ${p.globs.join(', ')}`))
    for (const line of p.body.split('\n')) info('    ' + line)
    info('')
  }

  if (!write) {
    info(c.dim(`Nothing written. \`ctxmux propose --write\` puts these in .ctxmux/rules/.`))
    return 0
  }

  const written = await writeProposals(root, proposals)
  heading('Written')
  for (const w of written.wrote) bullet(w)
  for (const s of written.skipped) bullet(c.dim(`${s} — already exists, left alone`))
  info('')
  success(`${written.wrote.length} written. Read them before you run \`ctxmux sync\`.`)
  return 0
}

/**
 * Write the proposals that do not collide with something already there.
 *
 * An existing rule is never overwritten, even with --write. A generated proposal is a guess,
 * and a guess replacing something a person wrote by hand is the worst outcome this command
 * could have.
 */
export async function writeProposals(
  root: string,
  proposals: Proposal[],
): Promise<{ wrote: string[]; skipped: string[] }> {
  const dir = path.join(root, '.ctxmux', 'rules')
  await fs.mkdir(dir, { recursive: true })
  const wrote: string[] = []
  const skipped: string[] = []

  for (const p of proposals) {
    const rel = path.join('.ctxmux', 'rules', `${p.name}.md`)
    const abs = path.join(root, rel)
    const exists = await fs
      .access(abs)
      .then(() => true)
      .catch(() => false)
    if (exists) {
      skipped.push(rel)
      continue
    }
    await writeFileAtomic(abs, renderRule(p))
    wrote.push(rel)
  }
  return { wrote, skipped }
}

/** A proposal as a `.ctxmux/rules/` file, provenance included so its origin is not lost. */
export function renderRule(p: Proposal): string {
  const front = ['---', `name: ${p.name}`]
  if (p.description) front.push(`description: ${JSON.stringify(p.description)}`)
  if (p.globs.length > 0) front.push(`globs: ${JSON.stringify(p.globs)}`)
  front.push(`x-ctxmux-proposed-by: ${p.from.join(',')}`, '---', '')
  return `${front.join('\n')}${p.body.trim()}\n`
}
