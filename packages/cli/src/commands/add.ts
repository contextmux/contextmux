/**
 * `ctxmux add` — install a third-party skill pack.
 *
 * Packs are fetched into your repository, not vendored into contextmux. Bundling other people's
 * guidance into this tool would make us responsible for content we did not write and cannot
 * keep current; a shallow clone and a recorded commit gives the same convenience with none of
 * that.
 */
import { spawn } from 'node:child_process'
import { promises as fs } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import {
  applyInstall,
  installedPacks,
  planInstall,
  readPack,
  type Pack,
  type PackSource,
} from '@contextmux/context'
import { bullet, c, error, heading, info, success } from '../ui.js'
import { flagBool, flagString, type ParsedArgs } from '../args.js'

function run(bin: string, args: string[], cwd?: string): Promise<{ code: number; out: string }> {
  return new Promise((resolve) => {
    const child = spawn(bin, args, { ...(cwd ? { cwd } : {}), windowsHide: true })
    let out = ''
    child.stdout.on('data', (d) => (out += d))
    child.stderr.on('data', (d) => (out += d))
    child.on('error', () => resolve({ code: 127, out }))
    child.on('close', (code) => resolve({ code: code ?? 1, out }))
  })
}

/**
 * Turn what the user typed into something fetchable.
 *
 * Accepts the forms people actually use, rather than insisting on a URL: a local path for
 * developing a pack, `owner/repo` because that is how everyone refers to a GitHub repository,
 * and a full URL for anything else.
 */
export function resolveSpec(spec: string): { kind: 'local' | 'git'; url: string; name: string } {
  const trimmed = spec.trim()

  if (trimmed.startsWith('.') || trimmed.startsWith('/') || trimmed.startsWith('~')) {
    return { kind: 'local', url: trimmed, name: path.basename(trimmed.replace(/\/$/, '')) }
  }

  const shorthand = /^(?:github:)?([\w.-]+)\/([\w.-]+?)(?:\.git)?$/.exec(trimmed)
  if (shorthand) {
    return {
      kind: 'git',
      url: `https://github.com/${shorthand[1]}/${shorthand[2]}.git`,
      name: shorthand[2]!.toLowerCase(),
    }
  }

  if (/^https?:\/\//.test(trimmed) || trimmed.startsWith('git@')) {
    const name = trimmed.replace(/\.git$/, '').split(/[/:]/).pop() ?? 'pack'
    return { kind: 'git', url: trimmed, name: name.toLowerCase() }
  }

  throw new Error(
    `Cannot work out where "${spec}" is. Use owner/repo, a URL, or a local path.`,
  )
}

async function fetchPack(spec: string): Promise<PackSource> {
  const resolved = resolveSpec(spec)

  if (resolved.kind === 'local') {
    const dir = path.resolve(resolved.url.replace(/^~/, os.homedir()))
    await fs.access(dir)
    return { spec, dir, origin: dir }
  }

  // Shallow, because a pack's history is of no interest and cloning it is the slow part.
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'contextmux-pack-'))
  const cloned = await run('git', ['clone', '--depth', '1', '--quiet', resolved.url, dir])
  if (cloned.code !== 0) {
    throw new Error(`Could not fetch ${resolved.url}: ${cloned.out.trim().split('\n').at(-1)}`)
  }

  const rev = await run('git', ['rev-parse', '--short', 'HEAD'], dir)
  return {
    spec,
    dir,
    origin: resolved.url,
    ...(rev.code === 0 ? { commit: rev.out.trim() } : {}),
  }
}

function report(pack: Pack): void {
  heading(`${pack.name}`)
  bullet(`${pack.skills.length} skill(s) from ${pack.source.origin}`)
  if (pack.source.commit) bullet(`commit ${pack.source.commit}`)
  if (pack.license) bullet(`licence: ${pack.license}`)
  if (pack.instructions) {
    bullet(c.dim(`ships top-level guidance (${pack.instructions.length} chars) — not installed, see below`))
  }
}

export async function addCommand(args: ParsedArgs): Promise<number> {
  const root = path.resolve(flagString(args, 'root') ?? process.cwd())
  const spec = args.positionals[0]
  const dryRun = flagBool(args, 'dry-run', 'n')
  const force = flagBool(args, 'force', 'f')

  if (!spec) {
    const installed = await installedPacks(root)
    if (installed.length === 0) {
      info('No packs installed.')
      info('')
      info('  ctxmux add github:DietrichGebert/ponytail   ' + c.dim('minimal-code discipline'))
      info('  ctxmux add ./my-pack                        ' + c.dim('a local directory'))
      return 0
    }
    heading(`Installed packs (${installed.length})`)
    for (const pack of installed) {
      bullet(`${c.bold(pack.name)} — ${pack.skills.length} skill(s)${pack.commit ? ` @ ${pack.commit}` : ''}`)
      if (pack.origin) info(`      ${c.dim(pack.origin)}`)
      info(`      ${c.dim(pack.skills.join(', '))}`)
    }
    return 0
  }

  let source: PackSource
  try {
    source = await fetchPack(spec)
  } catch (err) {
    error((err as Error).message)
    return 1
  }

  const resolved = resolveSpec(spec)
  const pack = await readPack(source, flagString(args, 'name') ?? resolved.name)

  /*
   * Say what was refused, before anything is installed.
   *
   * A pack is somebody else's content, fetched and about to be written into this repository. A
   * skill whose declared name is not a plain name — a path that climbs out of the directory it
   * was meant for, say — is the one thing here worth reading before agreeing to the rest, so it
   * is reported rather than quietly corrected.
   */
  if (pack.rejected.length > 0) {
    heading('Refused')
    for (const item of pack.rejected) bullet(`${item.from} — ${item.reason}`)
    info('    ' + c.dim('A skill name becomes a directory, so it has to be a plain name.'))
  }

  if (pack.skills.length === 0) {
    error(`No skills found in ${pack.source.origin}.`)
    info(
      '    ' +
        c.dim('A pack needs skills/<name>/SKILL.md with a `description` in its frontmatter.'),
    )
    return 1
  }

  report(pack)

  const plan = await planInstall(root, pack, { force })

  heading(dryRun ? 'Would install' : 'Installing')
  for (const item of plan.install) {
    const tag =
      item.action === 'create' ? c.green('new') : item.action === 'update' ? c.yellow('update') : c.dim('ok')
    bullet(`${tag.padEnd(8)} ${item.skill.name}  ${c.dim(item.skill.description.slice(0, 60))}`)
  }

  if (plan.skipped.length > 0) {
    heading('Left alone')
    for (const item of plan.skipped) {
      bullet(`${item.name} — ${item.reason}`)
    }
    info('    ' + c.dim('Use --force to replace them.'))
  }

  if (!dryRun) {
    const written = await applyInstall(root, pack, plan)
    info('')
    if (written.length === 0) {
      success('Already up to date.')
    } else {
      success(`Installed ${written.length} skill(s) into .ctxmux/skills/.`)
    }
  }

  /*
   * A pack's top-level guidance is reported but never merged.
   *
   * Instructions are the one piece of context that is unambiguously the repository's own
   * voice, and silently prepending somebody else's ruleset to it is not an install, it is a
   * takeover. Pointing at it and letting a human decide is the honest behaviour.
   */
  if (pack.instructions) {
    heading('Not installed')
    bullet('This pack ships repo-wide instructions as well as skills.')
    info(
      '    ' +
        c.dim(
          'They were not merged into your instructions.md — that file is your project\'s own voice. ' +
            'Copy anything you want from it by hand.',
        ),
    )
  }

  info('')
  info('Next:')
  info(`  1. ${c.bold('ctxmux sync')}       ${c.dim('compile the new skills out to every agent')}`)
  info(`  2. ${c.bold('git diff')}        ${c.dim('review what was added — this is third-party content')}`)

  // Clean up the clone; the content now lives in the repository.
  if (resolved.kind === 'git') await fs.rm(source.dir, { recursive: true, force: true })

  return 0
}
