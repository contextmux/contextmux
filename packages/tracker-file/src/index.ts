/**
 * File-based tasks.
 *
 * Tasks live as markdown with frontmatter in `.ctxmux/tasks/`. This exists for three
 * reasons: runs are testable with no external service, task specs are reviewable in a pull
 * request like any other artefact, and spec-driven development is a legitimate way to work
 * rather than only a stand-in for Jira.
 *
 * Acceptance criteria are parsed out of the body, so the same file reads naturally to a human
 * and provides the structure gates need.
 */
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { parse as parseYaml } from 'yaml'
import {
  extractAcceptanceCriteria,
  writeFileAtomic,
  type SemanticState,
  type TaskSpec,
  type Tracker,
} from '@contextmux/core'

const STATE_LABEL: Record<SemanticState, string> = {
  todo: 'todo',
  in_progress: 'in-progress',
  in_review: 'in-review',
  done: 'done',
  blocked: 'blocked',
}

interface TaskFile {
  frontmatter: Record<string, unknown>
  body: string
  filePath: string
}

async function readTaskFile(filePath: string): Promise<TaskFile | null> {
  let raw: string
  try {
    raw = await fs.readFile(filePath, 'utf8')
  } catch {
    return null
  }

  if (!raw.startsWith('---\n')) {
    return { frontmatter: {}, body: raw.trim(), filePath }
  }
  const close = raw.indexOf('\n---', 3)
  if (close === -1) return { frontmatter: {}, body: raw.trim(), filePath }

  const yamlSrc = raw.slice(4, close)
  const bodyStart = raw.indexOf('\n', close + 1)
  const body = bodyStart === -1 ? '' : raw.slice(bodyStart + 1)

  let frontmatter: Record<string, unknown> = {}
  try {
    const parsed = parseYaml(yamlSrc)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      frontmatter = parsed as Record<string, unknown>
    }
  } catch {
    /* malformed frontmatter degrades to none rather than losing the task entirely */
  }
  return { frontmatter, body: body.trim(), filePath }
}

/**
 * Pull acceptance criteria out of the prose.
 *
 * Looks for a heading whose text starts with "acceptance criteria" or "requirements", then
 * takes the list items under it. Writing them as a normal markdown list keeps the file
 * readable, which matters because a human has to write it.
 */
// Re-exported so each tracker keeps its existing surface; the implementation is shared.
export { extractAcceptanceCriteria }

/**
 * Set one frontmatter field, touching nothing else in the file.
 *
 * The edit is confined to the delimited block, which is the whole point. A multiline regex over
 * the entire file finds the *first* line beginning with the key, and in a task file that is
 * quite often a line of prose — "status: currently returns a 500" is an ordinary thing to write
 * in a bug report. Rewriting it corrupted the description, and because the real field was never
 * touched, the tracker also failed to record the state it thought it had just written.
 *
 * The surrounding text is reassembled byte for byte rather than re-serialised, so comments,
 * key order and formatting a person chose all survive.
 */
export function setFrontmatterField(raw: string, key: string, value: string): string {
  const line = `${key}: ${value}`

  if (!raw.startsWith('---\n')) return `---\n${line}\n---\n\n${raw}`

  const close = raw.indexOf('\n---', 3)
  if (close === -1) return `---\n${line}\n---\n\n${raw}`

  const front = raw.slice(4, close + 1)
  const rest = raw.slice(close + 1)
  const field = new RegExp(`^${key}:[^\\n]*$`, 'm')

  return `---\n${field.test(front) ? front.replace(field, line) : `${line}\n${front}`}${rest}`
}

function toArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String)
  if (typeof v === 'string') return v.split(',').map((s) => s.trim()).filter(Boolean)
  return []
}

export interface FileTrackerOptions {
  root: string
  /** Directory holding task files, relative to root. */
  dir?: string
  /** Quality-gate commands applied to tasks that do not specify their own. */
  defaultQualityGate?: string[]
}

export class FileTracker implements Tracker {
  readonly id = 'file'
  private readonly dir: string

  constructor(private readonly opts: FileTrackerOptions) {
    this.dir = path.resolve(opts.root, opts.dir ?? '.ctxmux/tasks')
  }

  private toSpec(file: TaskFile): TaskSpec {
    const fm = file.frontmatter
    const id = String(fm['id'] ?? path.basename(file.filePath).replace(/\.md$/, ''))
    const explicitAC = toArray(fm['acceptanceCriteria'])
    const criteria = explicitAC.length > 0 ? explicitAC : extractAcceptanceCriteria(file.body)

    const scopeRaw = (fm['scope'] ?? {}) as Record<string, unknown>

    return {
      id,
      title: String(fm['title'] ?? id),
      body: file.body,
      acceptanceCriteria: criteria.map((text) => ({ text })),
      scope: {
        allow: toArray(scopeRaw['allow']),
        deny: toArray(scopeRaw['deny']),
        ...(typeof scopeRaw['maxFiles'] === 'number' ? { maxFiles: scopeRaw['maxFiles'] } : {}),
      },
      qualityGate: toArray(fm['qualityGate']).length
        ? toArray(fm['qualityGate'])
        : (this.opts.defaultQualityGate ?? []),
      origin: { tracker: 'file', id, url: file.filePath },
      labels: toArray(fm['labels']),
      ...(typeof fm['priority'] === 'string'
        ? { priority: fm['priority'] as TaskSpec['priority'] }
        : {}),
      ...(typeof fm['estimate'] === 'number' ? { estimate: fm['estimate'] } : {}),
    }
  }

  private async files(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.dir, { withFileTypes: true })
      return entries
        .filter((e) => e.isFile() && e.name.endsWith('.md'))
        .map((e) => path.join(this.dir, e.name))
        .sort()
    } catch {
      return []
    }
  }

  async listReady(limit = 10): Promise<TaskSpec[]> {
    const specs: TaskSpec[] = []
    for (const filePath of await this.files()) {
      const file = await readTaskFile(filePath)
      if (!file) continue
      const status = String(file.frontmatter['status'] ?? 'todo')
      if (status !== 'todo') continue
      specs.push(this.toSpec(file))
      if (specs.length >= limit) break
    }
    return specs
  }

  async get(id: string): Promise<TaskSpec | null> {
    // Accept an id, a bare filename, or a path — all three are natural things to type.
    const direct = path.isAbsolute(id) ? id : path.resolve(this.opts.root, id)
    for (const candidate of [direct, `${direct}.md`, path.join(this.dir, `${id}.md`)]) {
      if (!this.withinRoot(candidate)) continue
      const file = await readTaskFile(candidate)
      if (file) return this.toSpec(file)
    }
    for (const filePath of await this.files()) {
      const file = await readTaskFile(filePath)
      if (file && String(file.frontmatter['id'] ?? '') === id) return this.toSpec(file)
    }
    return null
  }

  /** Rewrite the `status:` field in place, leaving the rest of the file untouched. */
  async transition(id: string, to: SemanticState): Promise<void> {
    const filePath = await this.resolvePath(id)
    if (!filePath) return
    const raw = await fs.readFile(filePath, 'utf8')
    await writeFileAtomic(filePath, setFrontmatterField(raw, 'status', STATE_LABEL[to]))
  }

  /** Append to a run log beside the task, so the history is reviewable in git. */
  async comment(id: string, body: string): Promise<void> {
    const filePath = await this.resolvePath(id)
    if (!filePath) return
    const logPath = filePath.replace(/\.md$/, '.log.md')
    await fs.appendFile(logPath, `\n---\n\n${body}\n`, 'utf8')
  }

  async setLabels(id: string, add: string[], remove: string[]): Promise<void> {
    const filePath = await this.resolvePath(id)
    if (!filePath) return
    const file = await readTaskFile(filePath)
    if (!file) return

    const current = new Set(toArray(file.frontmatter['labels']))
    for (const l of add) current.add(l)
    for (const l of remove) current.delete(l)

    const raw = await fs.readFile(filePath, 'utf8')
    await writeFileAtomic(filePath, setFrontmatterField(raw, 'labels', `[${[...current].join(', ')}]`))
  }

  /**
   * Whether a resolved path is inside the repository this tracker was pointed at.
   *
   * An id is a string from outside — a `--task` argument, a workflow input — and both lookups
   * below resolved it against the root, so `../../elsewhere/notes.md` addressed a file in
   * another repository entirely. On `get` that reads it; on `resolvePath` it is worse, because
   * `transition` and `setLabels` then rewrite the frontmatter of whatever they found. The
   * context writer already refuses to resolve outside the root for exactly this reason.
   */
  private withinRoot(candidate: string): boolean {
    const root = path.resolve(this.opts.root)
    const rel = path.relative(root, path.resolve(candidate))
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
  }

  private async resolvePath(id: string): Promise<string | null> {
    for (const candidate of [path.join(this.dir, `${id}.md`), path.resolve(this.opts.root, id)]) {
      if (!this.withinRoot(candidate)) continue
      try {
        await fs.access(candidate)
        return candidate
      } catch {
        /* try the next candidate */
      }
    }
    for (const filePath of await this.files()) {
      const file = await readTaskFile(filePath)
      if (file && String(file.frontmatter['id'] ?? '') === id) return filePath
    }
    return null
  }
}

/** Build a spec from a one-line description, for ad-hoc runs with no file at all. */
export function inlineTask(description: string, opts: { id?: string; qualityGate?: string[] } = {}): TaskSpec {
  const id = opts.id ?? `inline-${Date.now().toString(36)}`
  const title = description.split('\n')[0]!.slice(0, 100)
  return {
    id,
    title,
    body: description,
    acceptanceCriteria: extractAcceptanceCriteria(description).map((text) => ({ text })),
    scope: { allow: [], deny: [] },
    qualityGate: opts.qualityGate ?? [],
    origin: { tracker: 'inline', id },
    labels: [],
  }
}
