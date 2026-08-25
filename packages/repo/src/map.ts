/**
 * The token-budgeted repository map.
 *
 * Two rules drive every decision here:
 *
 * 1. **Budget is an input, not an afterthought.** An unbudgeted map is worse than no map — it
 *    displaces the actual task from the context window. Every render takes a hard ceiling and
 *    degrades progressively rather than truncating mid-structure.
 *
 * 2. **Rank, do not dump.** A directory listing cannot answer "does a helper for this already
 *    exist"; a ranked symbol index can. Ranking combines lexical match against the task text
 *    with git recency and co-change, which together approximate "what would an experienced
 *    contributor open first" without embeddings, an API key, or an index that goes stale.
 */
import * as path from 'node:path'
import type { RepoIndex } from './indexer.js'
import type { SymbolKind, SymbolRef } from './symbols.js'

export interface MapQuery {
  /** Free text — a ticket title and body, or a task description. */
  text?: string
  /** Symbol name patterns; `*` is a wildcard. */
  symbols?: string[]
  /** Restrict to these path prefixes or globs. */
  paths?: string[]
  /** Hard token ceiling. Required by design. */
  budget: number
  /** Files known to be relevant, used to seed co-change expansion. */
  seeds?: string[]
}

export interface ScoredFile {
  path: string
  score: number
  symbols: SymbolRef[]
  reasons: string[]
}

export interface RepoMap {
  files: ScoredFile[]
  /** Rendered markdown, guaranteed to fit the budget. */
  text: string
  estimatedTokens: number
  /** Files that matched but did not fit. Reported so truncation is never silent. */
  omitted: number
  totalCandidates: number
}

/**
 * Token estimation without a tokeniser dependency.
 *
 * ~3.6 chars/token is a reasonable average for source-code-adjacent English + identifiers.
 * We deliberately round pessimistically: overshooting the budget is a real failure, while
 * undershooting costs a little unused context.
 */
export function estimateTokens(s: string): number {
  return Math.ceil(s.length / 3.6)
}

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'when', 'then', 'should',
  'when', 'have', 'has', 'not', 'but', 'are', 'was', 'were', 'will', 'would',
  'can', 'could', 'add', 'fix', 'update', 'make', 'use', 'using', 'need', 'needs',
  'issue', 'ticket', 'bug', 'feature', 'task', 'implement', 'change', 'changes',
])

/** Split identifiers and prose into comparable lowercase terms. */
export function tokenize(s: string): string[] {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // camelCase → camel Case
    .split(/[^A-Za-z0-9]+/)
    .map((t) => t.toLowerCase())
    .filter((t) => t.length > 2 && !STOPWORDS.has(t))
}

function wildcardToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')
  return new RegExp(`^${escaped}$`, 'i')
}

function matchesPath(filePath: string, patterns: string[]): boolean {
  if (patterns.length === 0) return true
  return patterns.some((p) => {
    if (!p.includes('*')) return filePath.startsWith(p.replace(/\/$/, ''))
    const re = wildcardToRegExp(p.replace(/\*\*/g, '*'))
    return re.test(filePath) || filePath.split('/').some((seg) => re.test(seg))
  })
}

/** Kinds that answer "does this already exist" get a ranking bonus. */
const KIND_WEIGHT: Partial<Record<SymbolKind, number>> = {
  hook: 1.4,
  component: 1.3,
  function: 1.2,
  interface: 1.1,
  type: 1.1,
}

export function scoreFiles(index: RepoIndex, query: MapQuery): ScoredFile[] {
  const terms = query.text ? tokenize(query.text) : []
  const termSet = new Set(terms)
  const symbolPatterns = (query.symbols ?? []).map(wildcardToRegExp)
  const now = Date.now() / 1000

  // Document frequency, so a term appearing in every file contributes nothing.
  const df = new Map<string, number>()
  if (termSet.size > 0) {
    for (const file of index.files) {
      const seen = new Set<string>()
      for (const t of tokenize(file.path)) if (termSet.has(t)) seen.add(t)
      for (const s of file.symbols) {
        for (const t of tokenize(s.name)) if (termSet.has(t)) seen.add(t)
      }
      for (const t of seen) df.set(t, (df.get(t) ?? 0) + 1)
    }
  }
  const N = Math.max(1, index.files.length)
  const idf = (t: string) => Math.log(1 + N / (1 + (df.get(t) ?? 0)))

  // Co-change expansion from the seeds.
  const coScores = new Map<string, number>()
  for (const seed of query.seeds ?? []) {
    const row = index.git.coChange.get(seed)
    if (!row) continue
    for (const [other, count] of row) {
      coScores.set(other, (coScores.get(other) ?? 0) + count)
    }
  }
  const maxCo = Math.max(1, ...coScores.values())

  const scored: ScoredFile[] = []

  for (const file of index.files) {
    if (!matchesPath(file.path, query.paths ?? [])) continue

    let score = 0
    const reasons: string[] = []

    // --- lexical match on path ------------------------------------------
    if (termSet.size > 0) {
      let pathScore = 0
      for (const t of tokenize(file.path)) if (termSet.has(t)) pathScore += idf(t)
      if (pathScore > 0) {
        score += pathScore * 1.5
        reasons.push('path match')
      }
    }

    // --- lexical + pattern match on symbols ------------------------------
    const matched: SymbolRef[] = []
    for (const sym of file.symbols) {
      let symScore = 0
      if (symbolPatterns.some((re) => re.test(sym.name))) {
        symScore += 6
      }
      if (termSet.size > 0) {
        for (const t of tokenize(sym.name)) if (termSet.has(t)) symScore += idf(t) * 2
        if (sym.doc) {
          for (const t of tokenize(sym.doc)) if (termSet.has(t)) symScore += idf(t) * 0.5
        }
      }
      if (symScore > 0) {
        symScore *= KIND_WEIGHT[sym.kind] ?? 1
        if (sym.exported) symScore *= 1.2
        score += symScore
        matched.push(sym)
      }
    }
    if (matched.length > 0) reasons.push(`${matched.length} matching symbol(s)`)

    // --- git signals ------------------------------------------------------
    const co = coScores.get(file.path)
    if (co) {
      score += (co / maxCo) * 5
      reasons.push('changes alongside seed files')
    }

    const last = index.git.lastTouched.get(file.path)
    if (last) {
      // Recency decays over ~90 days; a file nobody has touched in a year is rarely the
      // right place to add today's feature.
      const ageDays = (now - last) / 86_400
      const recency = Math.exp(-ageDays / 90)
      if (recency > 0.05 && score > 0) {
        score += recency * 2
        if (recency > 0.5) reasons.push('recently changed')
      }
    }

    if (score > 0) {
      // Prefer files whose matched symbols are a large share of the file: a 40-symbol
      // barrel file matching once is less relevant than a 3-symbol module matching once.
      const density = matched.length / Math.max(4, file.symbols.length)
      score *= 1 + density * 0.5
      scored.push({ path: file.path, score, symbols: matched.length > 0 ? matched : file.symbols.slice(0, 3), reasons })
    }
  }

  return scored.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
}

function renderSymbol(s: SymbolRef): string {
  const doc = s.doc ? ` — ${s.doc.split('. ')[0]!.slice(0, 100)}` : ''
  return `  ${s.kind} \`${s.name}\`:${s.line}${doc}`
}

/**
 * Render within budget, degrading progressively:
 *   full symbol detail → names only → path list → directory skeleton.
 * Each stage is tried in order and the richest one that fits is used.
 */
export function renderMap(scored: ScoredFile[], budget: number, totalCandidates: number): RepoMap {
  const header = '## Relevant code in this repository\n\n'

  if (scored.length === 0) {
    // An empty section reads as "the map is broken". Say plainly that nothing matched, and
    // that this is itself useful information: nothing similar exists yet.
    const empty =
      `${header}_No existing code matched this task. Nothing similar appears to exist yet, ` +
      `so writing something new is appropriate — though it is worth trying a synonym before ` +
      `concluding that._\n`
    return { files: [], text: empty, estimatedTokens: estimateTokens(empty), omitted: 0, totalCandidates }
  }
  const footer = (omitted: number) =>
    omitted > 0 ? `\n_${omitted} further matching file(s) omitted to stay within the context budget._\n` : ''

  type Stage = (files: ScoredFile[]) => string
  const stages: Stage[] = [
    // Stage 1 — full detail.
    (files) =>
      files
        .map((f) => `**${f.path}**${f.reasons.length ? ` _(${f.reasons.join(', ')})_` : ''}\n${f.symbols.map(renderSymbol).join('\n')}`)
        .join('\n\n'),
    // Stage 2 — symbol names only.
    (files) =>
      files
        .map((f) => `**${f.path}** — ${f.symbols.map((s) => `\`${s.name}\``).join(', ')}`)
        .join('\n'),
    // Stage 3 — paths only.
    (files) => files.map((f) => `- ${f.path}`).join('\n'),
    // Stage 4 — directory skeleton.
    (files) => {
      const dirs = new Map<string, number>()
      for (const f of files) {
        const d = path.dirname(f.path)
        dirs.set(d, (dirs.get(d) ?? 0) + 1)
      }
      return [...dirs]
        .sort((a, b) => b[1] - a[1])
        .map(([d, n]) => `- ${d}/ (${n} relevant file${n === 1 ? '' : 's'})`)
        .join('\n')
    },
  ]

  for (const stage of stages) {
    // Within a stage, find the largest prefix of files that fits.
    let lo = 0
    let hi = scored.length
    let best = ''
    let bestCount = 0
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2)
      const body = stage(scored.slice(0, mid))
      const full = header + body + footer(scored.length - mid)
      if (estimateTokens(full) <= budget) {
        best = full
        bestCount = mid
        lo = mid + 1
      } else {
        hi = mid - 1
      }
    }
    // Accept this stage if it shows a useful share of the matches.
    if (bestCount >= Math.min(scored.length, 5) || (bestCount > 0 && bestCount === scored.length)) {
      return {
        files: scored.slice(0, bestCount),
        text: best,
        estimatedTokens: estimateTokens(best),
        omitted: scored.length - bestCount,
        totalCandidates,
      }
    }
  }

  // Budget too small for anything meaningful — say so rather than emitting a stub.
  const msg = `${header}_Context budget of ${budget} tokens is too small to render a useful map (${scored.length} matching files). Increase the budget or narrow the query._\n`
  return {
    files: [],
    text: msg,
    estimatedTokens: estimateTokens(msg),
    omitted: scored.length,
    totalCandidates,
  }
}

export function buildMap(index: RepoIndex, query: MapQuery): RepoMap {
  const scored = scoreFiles(index, query)
  return renderMap(scored, query.budget, scored.length)
}
