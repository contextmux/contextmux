/**
 * Reverse-engineer a canonical model from the agent config files a repo already has.
 *
 * Adoption is the whole battle: nobody will hand-author `.ctxmux/` from scratch to try a
 * tool. Import has to turn an existing `.claude/` + `.github/instructions/` + `.cursor/rules/`
 * spread into something coherent in one command.
 *
 * Where two sources disagree — a repo with both `CLAUDE.md` and `copilot-instructions.md`
 * saying different things — we do not silently pick a winner. Both are kept, attributed, and
 * flagged for the user to reconcile, because guessing here produces context that is subtly
 * wrong in a way nobody notices until an agent does something strange.
 */
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { parseFrontmatter, serializeFrontmatter } from './frontmatter.js'
import { isEnvReference, type Target } from './schema.js'
import { writeFileAtomic } from './fsx.js'
import type { Diagnostic } from './errors.js'

export interface ImportedFile {
  /** Path relative to the repo root, inside the source directory. */
  path: string
  content: string
}

export interface ImportResult {
  files: ImportedFile[]
  /** Where each piece came from, for the summary the CLI prints. */
  provenance: Array<{ from: string; to: string; kind: string }>
  diagnostics: Diagnostic[]
}

async function read(p: string): Promise<string | null> {
  try {
    return await fs.readFile(p, 'utf8')
  } catch {
    return null
  }
}

async function listFiles(dir: string, filter: (n: string) => boolean): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    return entries
      .filter((e) => e.isFile() && filter(e.name))
      .map((e) => path.join(dir, e.name))
      .sort()
  } catch {
    return []
  }
}

async function listDirs(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    return entries.filter((e) => e.isDirectory()).map((e) => path.join(dir, e.name)).sort()
  } catch {
    return []
  }
}

function toSlug(s: string): string {
  const slug = s
    .toLowerCase()
    .replace(/\.(instructions|prompt|agent|mdc|md)$/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
  return slug || 'unnamed'
}

/** Cursor writes globs as a comma-separated string; Copilot uses `applyTo`. Normalise both. */
function parseGlobs(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter((g) => g && g !== '**')
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((g) => g.trim())
      .filter((g) => g && g !== '**')
  }
  return []
}

/**
 * Which agents this repository actually uses, judged by what it already has.
 *
 * `config.targets` defaults to all four, so importing a repo that only ever had
 * `.github/copilot-instructions.md` made `sync` write `CLAUDE.md`, `AGENTS.md` and
 * `.cursor/rules/` as well — three files for tools nobody there uses, added to someone's
 * repository by a tool they ran to tidy it up. Evidence of use is the honest default.
 *
 * Widening it later is one line in `config.json`; deleting files a tool added uninvited is
 * not, and the person doing it has no way to know they were safe to remove.
 */
export function detectTargets(provenance: ImportResult['provenance']): Target[] {
  const found = new Set<Target>()
  for (const { from } of provenance) {
    if (from.startsWith('.github/')) found.add('copilot')
    else if (from === 'CLAUDE.md' || from.startsWith('.claude/')) found.add('claude')
    else if (from.startsWith('.cursor/')) found.add('cursor')
    else if (from === 'AGENTS.md' || from.endsWith('/AGENTS.md')) found.add('codex')
  }
  return [...found]
}

export async function importContext(root: string, sourceDir = '.ctxmux'): Promise<ImportResult> {
  const files: ImportedFile[] = []
  const provenance: ImportResult['provenance'] = []
  const diagnostics: Diagnostic[] = []
  const rel = (p: string) => path.relative(root, p)
  const out = (p: string) => path.join(sourceDir, p)

  // --- instructions: several possible sources ----------------------------
  const instructionSources: Array<{ file: string; label: string }> = [
    { file: path.join(root, 'CLAUDE.md'), label: 'Claude Code' },
    { file: path.join(root, '.github', 'copilot-instructions.md'), label: 'GitHub Copilot' },
    { file: path.join(root, 'AGENTS.md'), label: 'Codex / AGENTS.md' },
  ]
  const found: Array<{ label: string; file: string; body: string }> = []
  for (const src of instructionSources) {
    const raw = await read(src.file)
    if (raw === null) continue
    // Skip anything contextmux itself generated, or import becomes a feedback loop.
    if (raw.includes('ctxmux:hash=') || raw.includes('ctxmux:begin')) {
      diagnostics.push({
        level: 'warning',
        file: rel(src.file),
        message: 'looks contextmux-generated — skipped to avoid re-importing our own output',
      })
      continue
    }
    const { body } = parseFrontmatter(raw, rel(src.file))
    if (body.trim()) found.push({ label: src.label, file: rel(src.file), body: body.trim() })
  }

  if (found.length === 1) {
    files.push({ path: out('instructions.md'), content: found[0]!.body + '\n' })
    provenance.push({ from: found[0]!.file, to: out('instructions.md'), kind: 'instructions' })
  } else if (found.length > 1) {
    // Keep everything, attributed. Merging by guesswork would quietly lose content.
    const merged = found
      .map((f) => `<!-- imported from ${f.file} (${f.label}) -->\n\n${f.body}`)
      .join('\n\n---\n\n')
    files.push({ path: out('instructions.md'), content: merged + '\n' })
    for (const f of found) {
      provenance.push({ from: f.file, to: out('instructions.md'), kind: 'instructions' })
    }
    diagnostics.push({
      level: 'warning',
      file: out('instructions.md'),
      message: `merged ${found.length} instruction files (${found.map((f) => f.file).join(', ')})`,
      hint: 'They may contradict each other. Review and reconcile before running `ctxmux sync`.',
    })
  }

  // --- rules: Copilot .instructions.md ------------------------------------
  for (const file of await listFiles(path.join(root, '.github', 'instructions'), (n) =>
    n.endsWith('.md'),
  )) {
    const raw = await read(file)
    if (raw === null) continue
    const { data, body } = parseFrontmatter(raw, rel(file))
    const name = toSlug(path.basename(file, '.md'))
    const globs = parseGlobs(data['applyTo'])
    const target = out(`rules/${name}.md`)

    /*
     * Two sources can slug to one name — `auth.instructions.md` and `auth.md` both become
     * `auth`. The writer skips a path that already exists, so without this the second rule
     * simply never appeared, with nothing said about it.
     */
    if (files.some((f) => f.path === target)) {
      diagnostics.push({
        level: 'warning',
        file: rel(file),
        message: `a rule named "${name}" was already imported from another source — skipped`,
        hint: 'Rename one of them, or merge the two by hand if they differ.',
      })
      continue
    }

    files.push({
      path: target,
      content: serializeFrontmatter(
        {
          name,
          ...(data['description'] ? { description: String(data['description']) } : {}),
          ...(globs.length ? { globs } : {}),
          ...(String(data['applyTo'] ?? '') === '**' ? { alwaysApply: true } : {}),
        },
        body,
      ),
    })
    provenance.push({ from: rel(file), to: target, kind: 'rule' })
  }

  // --- rules: Cursor .mdc --------------------------------------------------
  for (const file of await listFiles(path.join(root, '.cursor', 'rules'), (n) =>
    n.endsWith('.mdc') || n.endsWith('.md'),
  )) {
    const raw = await read(file)
    if (raw === null) continue
    const { data, body } = parseFrontmatter(raw, rel(file))
    const base = path.basename(file).replace(/\.(mdc|md)$/, '')
    // Cursor rules are commonly prefixed for ordering; recover the priority and drop it
    // from the name so the same rule imported twice does not produce two entries.
    const orderMatch = /^(\d{1,3})-(.*)$/.exec(base)
    const priority = orderMatch ? Math.max(0, 100 - Number(orderMatch[1])) : 50
    const name = toSlug(orderMatch ? orderMatch[2]! : base)
    const target = out(`rules/${name}.md`)

    if (files.some((f) => f.path === target)) {
      diagnostics.push({
        level: 'warning',
        file: rel(file),
        message: `a rule named "${name}" was already imported from another source — skipped`,
        hint: 'Merge the two by hand if they differ.',
      })
      continue
    }

    files.push({
      path: target,
      content: serializeFrontmatter(
        {
          name,
          ...(data['description'] ? { description: String(data['description']) } : {}),
          ...(parseGlobs(data['globs']).length ? { globs: parseGlobs(data['globs']) } : {}),
          ...(data['alwaysApply'] === true ? { alwaysApply: true } : {}),
          ...(priority !== 50 ? { priority } : {}),
        },
        body,
      ),
    })
    provenance.push({ from: rel(file), to: target, kind: 'rule' })
  }

  // --- skills: Claude .claude/skills/<name>/SKILL.md -----------------------
  for (const dir of await listDirs(path.join(root, '.claude', 'skills'))) {
    const file = path.join(dir, 'SKILL.md')
    const raw = await read(file)
    if (raw === null) continue
    const { data, body } = parseFrontmatter(raw, rel(file))
    const name = toSlug(String(data['name'] ?? path.basename(dir)))
    const target = out(`skills/${name}/SKILL.md`)

    if (files.some((f) => f.path === target)) {
      diagnostics.push({
        level: 'warning',
        file: rel(file),
        message: `a skill named "${name}" was already imported — skipped`,
        hint: 'Two skills declare the same name. Rename one before importing.',
      })
      continue
    }

    files.push({
      path: target,
      content: serializeFrontmatter(
        {
          name,
          description: String(data['description'] ?? `Imported from ${rel(file)}`),
          ...(data['allowed-tools'] ? { tools: data['allowed-tools'] } : {}),
        },
        body,
      ),
    })
    provenance.push({ from: rel(file), to: target, kind: 'skill' })

    // Copy bundled resources verbatim — they are part of the skill.
    for (const sub of ['references', 'scripts', 'assets']) {
      for (const res of await listFiles(path.join(dir, sub), () => true)) {
        const content = await read(res)
        if (content === null) continue
        files.push({ path: out(`skills/${name}/${sub}/${path.basename(res)}`), content })
      }
    }
  }

  // --- agents: Claude and Copilot -----------------------------------------
  for (const [dir, ext] of [
    [path.join(root, '.claude', 'agents'), '.md'],
    [path.join(root, '.github', 'agents'), '.md'],
  ] as const) {
    for (const file of await listFiles(dir, (n) => n.endsWith(ext))) {
      const raw = await read(file)
      if (raw === null) continue
      const { data, body } = parseFrontmatter(raw, rel(file))
      const name = toSlug(String(data['name'] ?? path.basename(file, ext)))
      const target = out(`agents/${name}.md`)
      if (files.some((f) => f.path === target)) {
        diagnostics.push({
          level: 'warning',
          file: rel(file),
          message: `an agent named "${name}" was already imported — skipped`,
        })
        continue
      }
      const tools =
        typeof data['tools'] === 'string'
          ? String(data['tools']).split(',').map((t) => t.trim()).filter(Boolean)
          : Array.isArray(data['tools'])
            ? data['tools'].map(String)
            : undefined
      files.push({
        path: target,
        content: serializeFrontmatter(
          {
            name,
            description: String(data['description'] ?? `Imported from ${rel(file)}`),
            ...(tools?.length ? { tools } : {}),
            ...(data['model'] ? { model: String(data['model']) } : {}),
          },
          body,
        ),
      })
      provenance.push({ from: rel(file), to: target, kind: 'agent' })
    }
  }

  // --- commands ------------------------------------------------------------
  for (const dir of [
    path.join(root, '.claude', 'commands'),
    path.join(root, '.cursor', 'commands'),
  ]) {
    for (const file of await listFiles(dir, (n) => n.endsWith('.md'))) {
      const raw = await read(file)
      if (raw === null) continue
      const { data, body } = parseFrontmatter(raw, rel(file))
      const name = toSlug(path.basename(file, '.md'))
      const target = out(`commands/${name}.md`)
      if (files.some((f) => f.path === target)) continue
      files.push({
        path: target,
        content: serializeFrontmatter(
          { name, description: String(data['description'] ?? `Imported from ${rel(file)}`) },
          body,
        ),
      })
      provenance.push({ from: rel(file), to: target, kind: 'command' })
    }
  }

  // --- mcp -----------------------------------------------------------------
  const mcpSources = [
    path.join(root, '.mcp.json'),
    path.join(root, '.cursor', 'mcp.json'),
    path.join(root, '.vscode', 'mcp.json'),
  ]
  const servers: Record<string, unknown> = {}
  for (const src of mcpSources) {
    const raw = await read(src)
    if (raw === null) continue
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      const map = (parsed['mcpServers'] ?? parsed['servers'] ?? {}) as Record<string, any>
      for (const [name, cfg] of Object.entries(map)) {
        if (servers[toSlug(name)]) continue

        /*
         * Copy the shape of the environment, never the contents.
         *
         * A local `.mcp.json` quite reasonably holds real values — it is one file, on one
         * machine. `.ctxmux/mcp.json` is not: it is compiled out to four more, one of them a
         * document written to be read in a pull request. Importing a literal verbatim turned
         * one secret into five copies, silently, on a command people run once and never look
         * at again.
         *
         * So a literal becomes a reference to a variable of the same name, and the user is
         * told which keys that happened to — by key, never by value.
         */
        const env: Record<string, string> = {}
        const substituted: string[] = []
        for (const [key, value] of Object.entries((cfg.env ?? {}) as Record<string, unknown>)) {
          const text = String(value)
          if (isEnvReference(text)) {
            env[key] = text
          } else {
            env[key] = `\${${key}}`
            substituted.push(key)
          }
        }

        if (substituted.length > 0) {
          diagnostics.push({
            level: 'warning',
            file: rel(src),
            message: `did not copy the value of ${substituted.join(', ')} for mcp server "${name}"`,
            hint: `Replaced with a reference. Export ${substituted.join(', ')} in the environment where the server runs.`,
          })
        }

        servers[toSlug(name)] = {
          ...(cfg.command ? { transport: 'stdio', command: cfg.command } : {}),
          ...(cfg.url ? { transport: cfg.type === 'sse' ? 'sse' : 'http', url: cfg.url } : {}),
          ...(cfg.args ? { args: cfg.args } : {}),
          ...(Object.keys(env).length ? { env } : {}),
          readOnly: true,
        }
        provenance.push({ from: rel(src), to: out('mcp.json'), kind: 'mcp' })
      }
    } catch {
      diagnostics.push({ level: 'warning', file: rel(src), message: 'not valid JSON — skipped' })
    }
  }
  if (Object.keys(servers).length > 0) {
    files.push({
      path: out('mcp.json'),
      content: JSON.stringify({ servers }, null, 2) + '\n',
    })
    diagnostics.push({
      level: 'warning',
      file: out('mcp.json'),
      message: `imported ${Object.keys(servers).length} MCP server(s), all marked readOnly: true`,
      hint: 'Verify each one. An agent processing untrusted ticket text should not hold write-capable tools.',
    })
  }

  if (files.length === 0) {
    diagnostics.push({
      level: 'warning',
      message: 'no existing agent configuration found',
      hint: 'Run `ctxmux init` to scaffold a starter .ctxmux/ directory instead.',
    })
  }

  /*
   * Record which agents this repository uses, unless it has already said.
   *
   * Only when the evidence is a proper subset: finding all four is the same as the default,
   * and writing a config that restates it adds a file for nothing.
   */
  const detected = detectTargets(provenance)
  const configPath = path.join(root, sourceDir, 'config.json')
  const configExists = await read(configPath).then((c) => c !== null)
  if (!configExists && detected.length > 0 && detected.length < 4) {
    files.push({
      path: path.join(sourceDir, 'config.json'),
      content: JSON.stringify({ targets: detected }, null, 2) + '\n',
    })
    provenance.push({
      from: detected.map((t) => `${t} config`).join(', '),
      to: `${sourceDir}/config.json`,
      kind: 'targets',
    })
  }

  return { files, provenance, diagnostics }
}

/** Write an import result to disk, refusing to clobber an existing source directory. */
export async function writeImport(
  root: string,
  result: ImportResult,
  opts: { force?: boolean; dryRun?: boolean } = {},
): Promise<string[]> {
  const written: string[] = []
  for (const file of result.files) {
    const abs = path.resolve(root, file.path)
    if (!opts.force) {
      try {
        await fs.access(abs)
        continue // never overwrite hand-authored canonical source on import
      } catch {
        /* does not exist — fine */
      }
    }
    if (!opts.dryRun) await writeFileAtomic(abs, file.content)
    written.push(file.path)
  }
  return written
}
