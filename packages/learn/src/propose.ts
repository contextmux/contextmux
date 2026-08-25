/**
 * Turning a recurring lesson into a proposed edit.
 *
 * The output is a diff against `.ctxmux/`, never a change. Context is what every agent
 * reads; letting an automated process rewrite it unsupervised is how prompts rot — slowly,
 * invisibly, and in a way nobody can attribute afterwards. A human approving a two-line diff
 * costs seconds and keeps the source of truth trustworthy.
 *
 * Where the lesson goes matters as much as what it says. Amending the skill it belongs to
 * keeps related guidance together and keeps the context bounded; appending a new file per
 * lesson reproduces exactly the unbounded sediment this package exists to replace.
 */
import {
  parseFrontmatter,
  serializeFrontmatter,
  type ContextModel,
  type Rule,
  type Skill,
} from '@contextmux/context'
import { terms, similarity, type Cluster } from './cluster.js'
import { signalKey } from './ledger.js'

export type ProposalKind = 'amend-skill' | 'amend-rule' | 'new-rule'

export interface Proposal {
  /** Stable across invocations, so a rejected proposal can stay rejected. */
  id: string
  kind: ProposalKind
  /** The lesson, in a form that reads as guidance rather than as a complaint. */
  lesson: string
  /** Where it will land, relative to the repository root. */
  path: string
  /** Existing node being amended, when there is one. */
  target?: string
  /** Distinct tasks that produced this. */
  taskCount: number
  /** The observations behind it, so a reviewer can check the reasoning. */
  evidence: Array<{ taskId: string; source: string; text: string }>
  /**
   * Identities of every observation behind this proposal.
   *
   * Distinct from `evidence`, which is a truncated sample for a human to read. These are what
   * the ledger retires once the lesson has been applied, so settled evidence stops competing
   * with fresh evidence for the retention cap.
   */
  signalKeys: string[]
  /** Globs the guidance applies to, when the evidence points at particular paths. */
  globs: string[]
  /** File content after the edit. */
  content: string
  /** File content before, absent when the file is new. */
  before?: string
}

/**
 * Phrase an observation as guidance.
 *
 * Feedback arrives as a complaint about one change — "you changed package.json", "this
 * duplicates the existing helper". A rule has to read as a standing instruction, or an agent
 * encountering it in a different context has no idea what to do. The rewrites below are
 * deliberately mechanical: a template that is occasionally clumsy is easier to review and
 * correct than a paraphrase that is occasionally wrong about what was meant.
 */
export function asGuidance(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, ' ')

  const patterns: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
    [/^\d+ file\(s\) changed outside the task's scope/i, () =>
      'Change only the files the task requires. Config files, manifests and lockfiles are out of scope unless the task says otherwise.'],
    // Commands are usually backticked and usually multi-word, so match to the closing
    // backtick rather than to the first space.
    [/^`([^`]+)`\s+failed/i, (m) =>
      `Run \`${m[1]}\` before finishing, and fix every failure it reports.`],
    [/^([^\s`]+)\s+failed/i, (m) =>
      `Run \`${m[1]}\` before finishing, and fix every failure it reports.`],
    [/test files were weakened/i, () =>
      'Never weaken a test to make a suite pass. A failing test means the implementation is wrong.'],
    [/^(?:please\s+)?(use|prefer|avoid|do not|don't|never|always)\b/i, () => trimmed],
    [/\b(already exists|duplicat|reinvent)/i, () =>
      `${trimmed} Search for an existing implementation before writing a new one.`],
  ]

  for (const [pattern, rewrite] of patterns) {
    const match = trimmed.match(pattern)
    // Normalise punctuation once, at the end, rather than in every branch. Doing it per
    // branch is how two of them silently ended up without it.
    if (match) return sentence(rewrite(match))
  }

  // Nothing matched: keep the reviewer's own words rather than inventing a paraphrase.
  return sentence(trimmed)
}

/** Capitalise and terminate, so guidance reads as an instruction wherever it came from. */
function sentence(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return trimmed
  const capitalised = trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
  return /[.!?]$/.test(capitalised) ? capitalised : `${capitalised}.`
}

/** Turn observed file paths into globs a rule can be scoped by. */
export function globsFor(files: string[]): string[] {
  const dirs = new Set<string>()
  for (const file of files) {
    const parts = file.split('/')
    if (parts.length > 1) dirs.add(`${parts.slice(0, -1).join('/')}/**`)
  }
  // A rule scoped to eight directories is not scoped at all, and reads as noise.
  return dirs.size > 0 && dirs.size <= 3 ? [...dirs] : []
}

/** The skill or rule a lesson most plausibly belongs to. */
export function findTarget(
  cluster: Cluster,
  context: ContextModel,
): { kind: 'skill'; node: Skill } | { kind: 'rule'; node: Rule } | null {
  const lessonTerms = terms(cluster.representative)
  let best: { score: number; result: ReturnType<typeof findTarget> } = { score: 0, result: null }

  for (const skill of context.skills) {
    const score = similarity(lessonTerms, terms(`${skill.name} ${skill.description} ${skill.body}`))
    if (score > best.score) best = { score, result: { kind: 'skill', node: skill } }
  }
  for (const rule of context.rules) {
    const score = similarity(lessonTerms, terms(`${rule.name} ${rule.description ?? ''} ${rule.body}`))
    if (score > best.score) best = { score, result: { kind: 'rule', node: rule } }
  }

  // Below this, "related" is wishful thinking and the lesson is better off standing alone
  // than buried in a skill it does not belong to.
  return best.score >= 0.35 ? best.result : null
}

/**
 * Words that carry no meaning in a filename.
 *
 * Distinct from the clustering stopword list: these are the connectives that survive term
 * extraction but read as noise in a name.
 */
const SLUG_NOISE = new Set([
  'rather', 'than', 'instead', 'before', 'after', 'always', 'never', 'please',
  'should', 'must', 'make', 'sure', 'this', 'that', 'here', 'there', 'when',
  'while', 'about', 'into', 'onto', 'over', 'each', 'every', 'some', 'other',
])

/**
 * Name a new rule from the lesson's own words.
 *
 * Built from the original words rather than the stemmed terms used for clustering. Stems are
 * right for comparison and wrong for reading: stemming turns "shared" into "shar", and a rule
 * called `shar-date-helper-rather` is one that neither an agent nor a human can interpret at a
 * glance — which matters, because the filename is what appears in every compiled target.
 */
function slugFor(lesson: string): string {
  const words = lesson
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !SLUG_NOISE.has(w))

  const slug = [...new Set(words)].slice(0, 4).join('-')
  return slug || 'learned-convention'
}

/**
 * A name no other lesson is using.
 *
 * `slugFor` derives a name from the lesson's own words, which is right for reading and not
 * guaranteed to be unique: two lessons about the same subject can produce the same slug, and a
 * lesson made entirely of short words has no usable words at all and falls back to a fixed
 * name. Two of those in one batch resolved to one file — the second proposal overwrote the
 * first, and both were recorded as applied, so the lost one was never raised again.
 *
 * Disambiguating with the cluster id keeps the readable name where it can be had and stays
 * stable across invocations, because the id is derived from the lesson's content rather than
 * from its position in a batch.
 */
async function uniqueName(
  base: string,
  clusterId: string,
  sourceDir: string,
  taken: Set<string>,
  read?: (path: string) => Promise<string | null>,
): Promise<string> {
  const pathFor = (name: string) => `${sourceDir}/rules/${name}.md`
  const free = async (name: string) =>
    !taken.has(pathFor(name)) && ((await read?.(pathFor(name))) ?? null) === null

  if (await free(base)) return base
  return `${base}-${clusterId.toLowerCase().replace(/^l-/, '')}`
}

const MARKER = '<!-- learned -->'

/**
 * Append guidance to an existing body, without duplicating it.
 *
 * The marker keeps learned lines together so a human can see at a glance what arrived by this
 * route rather than by hand.
 */
function appendGuidance(body: string, lesson: string): string | null {
  const existing = terms(body)
  if (similarity(terms(lesson), existing) >= 0.8) return null // already says this

  const trimmed = body.trimEnd()
  return trimmed.includes(MARKER)
    ? `${trimmed}\n- ${lesson}\n`
    : `${trimmed}\n\n${MARKER}\n\n**Learned from review:**\n\n- ${lesson}\n`
}

/**
 * Render a proposal as a real file.
 *
 * Uses the same serialiser the rest of the toolchain does, rather than interpolating values
 * into `key: value`. Hand-rolled emission was quietly unsafe in both directions: a lesson
 * containing a colon — ordinary in a review comment — produced YAML the loader then rejected,
 * so `learn --apply` broke the context it was improving. And a lesson beginning with `#`
 * parsed as a comment, so the rule loaded with its description silently null.
 */
function frontmatter(data: Record<string, unknown>, body: string): string {
  const clean = Object.fromEntries(
    Object.entries(data).filter(
      ([, v]) => v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0),
    ),
  )
  return serializeFrontmatter(clean, body)
}

export interface ProposeOptions {
  context: ContextModel
  sourceDir?: string
  /** Existing file contents, so an amendment can be rendered as a real diff. */
  read?: (path: string) => Promise<string | null>
}

export async function propose(clusters: Cluster[], opts: ProposeOptions): Promise<Proposal[]> {
  const sourceDir = opts.sourceDir ?? '.ctxmux'
  const proposals: Proposal[] = []
  /** Paths already claimed by this batch, so two lessons cannot resolve to the same file. */
  const taken = new Set<string>()

  for (const cluster of clusters) {
    const lesson = asGuidance(cluster.representative)
    const globs = globsFor(cluster.files)
    const evidence = cluster.signals.slice(0, 5).map((s) => ({
      taskId: s.source.taskId,
      source: s.source.author ?? s.source.gate ?? s.kind,
      text: s.text.length > 200 ? `${s.text.slice(0, 200)}…` : s.text,
    }))
    const signalKeys = cluster.signals.map(signalKey)

    const target = findTarget(cluster, opts.context)

    if (target) {
      const path =
        target.kind === 'skill'
          ? `${sourceDir}/skills/${target.node.name}/SKILL.md`
          : `${sourceDir}/rules/${target.node.name}.md`

      const before = (await opts.read?.(path)) ?? null
      const amended = appendGuidance(target.node.body, lesson)
      // Already covered: proposing it again would nag about something the context says.
      if (!amended) continue

      /*
       * Amend the file, not the model.
       *
       * Re-rendering from the parsed model looks equivalent and is not: the model holds the
       * fields the schema knows about, so everything else in the original frontmatter is
       * dropped on the way out. Pack provenance is the case that bites — an amended skill
       * silently loses the record of where it came from and who licensed it, which is
       * precisely the attribution that was promised when it was installed.
       *
       * So when the file is readable, its own frontmatter is preserved verbatim and only the
       * body changes. The model-derived rendering remains the fallback for a target that has
       * no file on disk.
       */
      const content = before !== null
        ? serializeFrontmatter(parseFrontmatter(before, path).data, amended)
        : target.kind === 'skill'
          ? frontmatter(
              {
                name: target.node.name,
                description: target.node.description,
                ...(target.node.globs.length ? { globs: target.node.globs } : {}),
              },
              amended,
            )
          : frontmatter(
              {
                name: target.node.name,
                ...(target.node.description ? { description: target.node.description } : {}),
                ...(target.node.globs.length ? { globs: target.node.globs } : {}),
                ...(target.node.alwaysApply ? { alwaysApply: true } : {}),
              },
              amended,
            )

      proposals.push({
        id: cluster.id,
        kind: target.kind === 'skill' ? 'amend-skill' : 'amend-rule',
        lesson,
        path,
        target: target.node.name,
        taskCount: cluster.taskCount,
        evidence,
        signalKeys,
        globs,
        content,
        ...(before !== null ? { before } : {}),
      })
      continue
    }

    // No home for it: a new rule, scoped where the evidence points.
    const name = await uniqueName(slugFor(lesson), cluster.id, sourceDir, taken, opts.read)
    taken.add(`${sourceDir}/rules/${name}.md`)
    proposals.push({
      id: cluster.id,
      kind: 'new-rule',
      lesson,
      path: `${sourceDir}/rules/${name}.md`,
      taskCount: cluster.taskCount,
      evidence,
      signalKeys,
      globs,
      content: frontmatter(
        {
          name,
          description: lesson.length > 90 ? `${lesson.slice(0, 87)}...` : lesson,
          ...(globs.length ? { globs } : {}),
        },
        `${lesson}\n\n${MARKER}\n\n_Learned from review feedback across ${cluster.taskCount} tasks._`,
      ),
    })
  }

  return proposals
}
