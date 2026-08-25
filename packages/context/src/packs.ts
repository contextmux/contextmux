/**
 * Third-party skill packs.
 *
 * A pack is somebody else's `.ctxmux`-shaped content — skills, rules, instructions — that
 * you pull into your own. The first real one is ponytail
 * (github.com/DietrichGebert/ponytail, MIT), whose `skills/<name>/SKILL.md` layout happens to
 * be exactly the canonical format, which is less of a coincidence than it looks: the format
 * follows Claude Code's, and so does theirs.
 *
 * Two rules shape the design.
 *
 * Nothing is vendored into contextmux. A pack is fetched into *your* repository, recorded with
 * its source, licence and commit, and updated on demand. Bundling other people's guidance into
 * this tool would make us responsible for content we did not write and cannot keep current.
 *
 * And a pack never silently overwrites your own work. Installed skills are marked, so an
 * update can replace what came from the pack while leaving anything you wrote or edited
 * alone — the same reasoning as the sync writer, applied to a different kind of authorship.
 */
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { parseFrontmatter, serializeFrontmatter } from './frontmatter.js'
import { writeFileAtomic } from './fsx.js'

export interface PackSource {
  /** What the user typed. */
  spec: string
  /** Resolved location on disk after fetching. */
  dir: string
  /** Where it came from, for the record. */
  origin: string
  /** Commit, when the source was a git repository. */
  commit?: string
}

export interface PackSkill {
  name: string
  description: string
  body: string
  /** Path relative to the pack root, for reporting. */
  from: string
  license?: string
  homepage?: string
}

export interface Pack {
  name: string
  source: PackSource
  skills: PackSkill[]
  /** Top-level guidance, if the pack ships any. */
  instructions?: string
  license?: string
  /** Content refused while reading, and why. Never silent — a pack is somebody else's code. */
  rejected: Array<{ from: string; reason: string }>
}

/**
 * A name that is safe to use as a path segment.
 *
 * Mirrors the canonical schema's slug, and enforced here because a pack never passes through
 * that schema. This is the load-bearing check in the whole file: a skill's declared name
 * becomes a directory under `.ctxmux/skills/`, and again under `.claude/skills/` when it is
 * compiled. `path.join` resolves `..` rather than rejecting it, so a name of
 * `../../../../evil` in a fetched pack's frontmatter wrote a file outside the repository
 * entirely — on a command whose whole purpose is to run someone else's content.
 */
const SAFE_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Marker written into installed files, so an update knows what it owns. */
export const PACK_FIELD = 'x-ctxmux-pack'

/**
 * Where a pack's skills live.
 *
 * Checked in order. `skills/` is the convention; the rest are where packs written for a
 * specific host end up putting them.
 */
const SKILL_DIRS = ['skills', '.claude/skills', '.ctxmux/skills', '.openclaw/skills']

/** Files a pack might use for top-level guidance, most canonical first. */
const INSTRUCTION_FILES = ['AGENTS.md', 'CLAUDE.md', '.github/copilot-instructions.md']

async function readIfExists(p: string): Promise<string | null> {
  try {
    return await fs.readFile(p, 'utf8')
  } catch {
    return null
  }
}

async function listDirs(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    return entries.filter((e) => e.isDirectory() && !e.name.startsWith('.')).map((e) => e.name).sort()
  } catch {
    return []
  }
}

/** Read a fetched pack off disk. */
export async function readPack(source: PackSource, nameHint?: string): Promise<Pack> {
  const skills: PackSkill[] = []
  const rejected: Pack['rejected'] = []
  let skillRoot: string | null = null

  for (const candidate of SKILL_DIRS) {
    const dir = path.join(source.dir, candidate)
    const entries = await listDirs(dir)
    if (entries.length === 0) continue
    skillRoot = candidate

    for (const entry of entries) {
      const file = path.join(dir, entry, 'SKILL.md')
      const raw = await readIfExists(file)
      if (raw === null) continue

      const from = `${candidate}/${entry}/SKILL.md`
      const { data, body } = parseFrontmatter(raw, from)

      /*
       * The declared name is used only if it is safe to put in a path; otherwise the directory
       * it was found in stands in, because a directory entry cannot contain a separator. A name
       * that is neither is refused rather than sanitised — a traversal in a skill name is not a
       * typo, and quietly repairing it would hide that the pack tried.
       */
      const declared = String(data['name'] ?? entry)
      const name = SAFE_NAME.test(declared)
        ? declared
        : SAFE_NAME.test(entry)
          ? entry
          : null

      if (name === null) {
        rejected.push({ from, reason: `neither "${declared}" nor "${entry}" is a usable name` })
        continue
      }
      if (name !== declared) {
        rejected.push({
          from,
          reason: `declared the name "${declared}", which is not a plain name — using "${entry}" instead`,
        })
      }

      const description = String(data['description'] ?? '')
      if (!description) continue // a skill with no activation description cannot be selected

      skills.push({
        name,
        description,
        body,
        from: `${candidate}/${entry}/SKILL.md`,
        ...(data['license'] ? { license: String(data['license']) } : {}),
        ...(data['homepage'] ? { homepage: String(data['homepage']) } : {}),
      })
    }
    break
  }

  let instructions: string | undefined
  for (const candidate of INSTRUCTION_FILES) {
    const raw = await readIfExists(path.join(source.dir, candidate))
    if (raw === null) continue
    const { body } = parseFrontmatter(raw, candidate)
    if (body.trim()) {
      instructions = body.trim()
      break
    }
  }

  const licenseFile = await readIfExists(path.join(source.dir, 'LICENSE'))
  const license =
    skills.find((s) => s.license)?.license ??
    (licenseFile ? (licenseFile.split('\n')[0]?.trim() || undefined) : undefined)

  return {
    name: nameHint ?? path.basename(source.dir),
    source,
    skills,
    rejected,
    ...(instructions ? { instructions } : {}),
    ...(license ? { license } : {}),
    ...(skillRoot ? {} : {}),
  }
}

export interface InstallPlan {
  /** Skills that will be written. */
  install: Array<{ skill: PackSkill; path: string; action: 'create' | 'update' | 'unchanged' }>
  /** Skills skipped because you wrote or edited them. */
  skipped: Array<{ name: string; path: string; reason: string }>
}

/**
 * Work out what installing would do, without doing it.
 *
 * A skill already present and *not* marked as belonging to this pack is yours — either you
 * wrote it or you edited what the pack installed. Either way an update must not take it back.
 */
export async function planInstall(
  root: string,
  pack: Pack,
  opts: { sourceDir?: string; force?: boolean } = {},
): Promise<InstallPlan> {
  const sourceDir = opts.sourceDir ?? '.ctxmux'
  const plan: InstallPlan = { install: [], skipped: [] }

  for (const skill of pack.skills) {
    const rel = path.join(sourceDir, 'skills', skill.name, 'SKILL.md')
    const existing = await readIfExists(path.resolve(root, rel))

    if (existing === null) {
      plan.install.push({ skill, path: rel, action: 'create' })
      continue
    }

    const { data, body } = parseFrontmatter(existing, rel)
    const owner = data[PACK_FIELD]

    if (owner !== pack.name && !opts.force) {
      plan.skipped.push({
        name: skill.name,
        path: rel,
        reason: owner ? `belongs to the "${owner}" pack` : 'you wrote or edited this one',
      })
      continue
    }

    plan.install.push({
      skill,
      path: rel,
      action: body.trim() === skill.body.trim() ? 'unchanged' : 'update',
    })
  }

  return plan
}

/** Render a pack skill as canonical source, stamped with where it came from. */
export function renderPackSkill(pack: Pack, skill: PackSkill): string {
  return serializeFrontmatter(
    {
      name: skill.name,
      description: skill.description,
      [PACK_FIELD]: pack.name,
      'x-ctxmux-source': pack.source.origin,
      ...(pack.source.commit ? { 'x-ctxmux-commit': pack.source.commit } : {}),
      ...(skill.license ?? pack.license ? { 'x-ctxmux-license': skill.license ?? pack.license } : {}),
      ...(skill.homepage ? { 'x-ctxmux-homepage': skill.homepage } : {}),
    },
    skill.body,
  )
}

export async function applyInstall(root: string, pack: Pack, plan: InstallPlan): Promise<string[]> {
  const written: string[] = []
  const base = path.resolve(root)

  for (const item of plan.install) {
    if (item.action === 'unchanged') continue
    const abs = path.resolve(base, item.path)

    // The names were checked on the way in; this checks the result on the way out. Two cheap
    // guards around content fetched from someone else's repository is the right number.
    if (!abs.startsWith(base + path.sep)) {
      throw new Error(`refusing to install "${item.path}" — it resolves outside ${root}.`)
    }

    await writeFileAtomic(abs, renderPackSkill(pack, item.skill))
    written.push(item.path)
  }
  return written
}

/** Packs currently installed, read back from what they stamped. */
export async function installedPacks(
  root: string,
  sourceDir = '.ctxmux',
): Promise<Array<{ name: string; origin?: string; commit?: string; skills: string[] }>> {
  const byPack = new Map<string, { name: string; origin?: string; commit?: string; skills: string[] }>()
  const dir = path.resolve(root, sourceDir, 'skills')

  for (const entry of await listDirs(dir)) {
    const raw = await readIfExists(path.join(dir, entry, 'SKILL.md'))
    if (raw === null) continue
    const { data } = parseFrontmatter(raw, entry)
    const name = data[PACK_FIELD]
    if (typeof name !== 'string') continue

    const record = byPack.get(name) ?? {
      name,
      ...(typeof data['x-ctxmux-source'] === 'string' ? { origin: data['x-ctxmux-source'] } : {}),
      ...(typeof data['x-ctxmux-commit'] === 'string' ? { commit: data['x-ctxmux-commit'] } : {}),
      skills: [],
    }
    record.skills.push(entry)
    byPack.set(name, record)
  }

  return [...byPack.values()]
}
