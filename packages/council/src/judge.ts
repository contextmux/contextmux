import type { ContextModel } from '@contextmux/context'
import { CRITERIA, criteriaFor, RUBRIC_VERSION, type Criterion, type Depth, type JudgeContext } from './criteria.js'
import type { Suggestion } from './types.js'

/**
 * Something that can answer a question about text.
 *
 * An interface rather than an implementation, and council depends on no agent package. The
 * concrete judge is wired by whoever already resolved an agent — which keeps this layer
 * testable without spending money, and keeps the cost of being wrong about a prompt down to
 * editing one string.
 */
export interface Judge {
  /** A name for the record, so a cached answer says who produced it. */
  id: string
  ask(prompt: string): Promise<string>
}

export interface CritiqueOptions {
  depth: Depth
  context: JudgeContext
  /** Answers kept from a previous run, keyed as `cacheKey` returns. */
  cache?: Map<string, Suggestion[]>
  /**
   * What the free checks already found.
   *
   * Told to the judge so it does not report the same thing again. The static layer and the
   * `consistent` criterion overlap by design — both look for rules that disagree — and without
   * this a reader is shown one problem twice, once as a warning and once as a suggestion, which
   * is precisely the noise this whole layer exists to reduce.
   */
  known?: Suggestion[]
}

export interface CritiqueResult {
  findings: Suggestion[]
  /** Nodes whose answers came from the cache rather than the judge. */
  reused: number
  /** Nodes actually sent. The number that costs money. */
  asked: number
  /**
   * Size of the request, so a caller can say what it is about to spend.
   *
   * There is deliberately no ceiling on the whole prompt, only on one body. Truncating the set
   * would review some of somebody's rules and stay silent about which — worse than an expensive
   * request they were told about.
   */
  promptChars: number
}

/**
 * A judgement is about one body, under one rubric, at one depth.
 *
 * Keyed on the body rather than the node name so that renaming a rule does not re-ask, and
 * editing one does. `RUBRIC_VERSION` is in the key because a changed question invalidates every
 * previous answer — without it the cache serves verdicts nobody would reach today.
 */
export function cacheKey(body: string, depth: Depth, setHash?: string): string {
  return `${RUBRIC_VERSION}:${depth}:${hash(body)}${setHash ? `:${setHash}` : ''}`
}

/**
 * Drop the one overlap the prompt asks a judge to avoid but cannot be relied on to.
 *
 * `consistent` and the static `contradiction` check ask the same question — do these two rules
 * disagree — so a rule caught by both is one problem reported twice, at two severities. The
 * prompt says not to repeat prior findings, and a model will mostly comply; mostly is not a
 * property worth shipping when the deterministic version is three lines.
 *
 * Deliberately narrow. Only that pair, and only on the same rule: a rule can have a
 * contradiction and an unrelated problem, and dropping the second would be worse than printing
 * the first twice.
 */
function withoutRepeats(findings: Suggestion[], known: Suggestion[]): Suggestion[] {
  const alreadyContradicting = new Set(
    known.filter((k) => k.check === 'contradiction').map((k) => k.where),
  )
  if (alreadyContradicting.size === 0) return findings
  return findings.filter((f) => !(f.check === 'consistent' && alreadyContradicting.has(f.where)))
}

/** A judge asked about several criteria at once will sometimes say the same thing twice. */
function dedupe(findings: Suggestion[]): Suggestion[] {
  const seen = new Set<string>()
  return findings.filter((f) => {
    const k = `${f.where}\u0000${f.check}\u0000${f.message}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/** FNV-1a. Not cryptographic — this only has to notice that a body changed. */
function hash(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

interface Node {
  where: string
  body: string
  description?: string
}

function nodesOf(model: ContextModel): Node[] {
  const out: Node[] = []
  if (model.instructions?.body.trim()) out.push({ where: 'instructions', body: model.instructions.body })
  for (const r of model.rules) if (r.body.trim()) out.push({ where: `rules/${r.name}`, body: r.body, description: r.description })
  for (const s of model.skills) if (s.body.trim()) out.push({ where: `skills/${s.name}`, body: s.body, description: s.description })
  return out
}

/**
 * Ask a judge what is wrong with the rules.
 *
 * Everything goes in one request. Per-node calls would give cleaner attribution and cost as many
 * times more, and the `consistent` criterion needs to see the whole set anyway — a judge cannot
 * say two rules pull against each other while looking at one of them.
 */
export async function critique(
  model: ContextModel,
  judge: Judge,
  opts: CritiqueOptions,
): Promise<CritiqueResult> {
  const criteria = criteriaFor(opts.depth)
  if (criteria.length === 0) return { findings: [], reused: 0, asked: 0, promptChars: 0 }

  const nodes = nodesOf(model)
  if (nodes.length === 0) return { findings: [], reused: 0, asked: 0, promptChars: 0 }

  /*
   * A relational criterion is a fact about a pair, so it cannot be answered from a cache keyed
   * on one rule. Sending only the rules that changed would ask a judge whether a rule conflicts
   * with rules it was never shown, and it would dutifully answer no.
   *
   * So when one is in play the key covers every body, not just this one. A change to any rule
   * changes the key for all of them, so the whole set is re-asked together and the judge always
   * sees every rule it is being asked to compare.
   */
  const relational = criteria.some((c) => c.relational)
  const setHash = relational ? hash(nodes.map((n) => n.body).join('\u0000')) : undefined

  const cache = opts.cache
  const cached: Suggestion[] = []
  const fresh: Node[] = []
  for (const node of nodes) {
    const hit = cache?.get(cacheKey(node.body, opts.depth, setHash))
    if (hit) cached.push(...hit)
    else fresh.push(node)
  }
  if (fresh.length === 0) return { findings: cached, reused: nodes.length, asked: 0, promptChars: 0 }

  const prompt = buildPrompt(fresh, criteria, opts.context, opts.known)
  const answer = await judge.ask(prompt)
  const findings = withoutRepeats(
    dedupe(parseFindings(answer, new Set(fresh.map((n) => n.where)))),
    opts.known ?? [],
  )

  if (cache) {
    // Every node asked about is recorded, including the ones with nothing wrong. Otherwise a
    // clean rule is re-sent on every run and the cache only ever helps the broken ones.
    for (const node of fresh) {
      cache.set(
        cacheKey(node.body, opts.depth, setHash),
        findings.filter((f) => f.where === node.where),
      )
    }
  }

  return {
    findings: [...cached, ...findings],
    reused: nodes.length - fresh.length,
    asked: fresh.length,
    promptChars: prompt.length,
  }
}

/**
 * A rule long enough to matter here is already a finding.
 *
 * Without a ceiling the prompt is however long the rules are, and forty verbose rules produced
 * an eighty-kilobyte request — paid for on every run, and at panel depth several times over. A
 * rule past this length is not one an agent reads carefully either.
 */
const BODY_LIMIT = 1500

function clip(body: string): string {
  if (body.length <= BODY_LIMIT) return body
  return `${body.slice(0, BODY_LIMIT)}\n[...${body.length - BODY_LIMIT} more characters, not shown]`
}

export function buildPrompt(
  nodes: Node[],
  criteria: Criterion[],
  context: JudgeContext,
  known: Suggestion[] = [],
): string {
  const lines: string[] = [
    'You are reviewing the standing instructions a repository gives its coding agents.',
    '',
    'Every rule below is read by an agent on every task, before it sees the task. They share a',
    'context window with the work itself, so a rule that says nothing costs something.',
    '',
    `This repository compiles to: ${context.targets.join(', ')}.`,
  ]
  if (context.sampleFiles.length > 0) {
    lines.push(`Some real paths in it: ${context.sampleFiles.slice(0, 40).join(', ')}.`)
  }
  lines.push('', 'Judge each rule against these questions:', '')
  for (const c of criteria) {
    lines.push(`- ${c.id}: ${c.question}`)
    lines.push(`  ${c.rationale}`)
  }
  lines.push(
    '',
    'The rules:',
    '',
    ...nodes.map((n) =>
      [`### ${n.where}`, n.description ? `description: ${n.description}` : '', clip(n.body), '']
        .filter(Boolean)
        .join('\n'),
    ),
    '',
    ...(known.length > 0
      ? [
          'Already reported by checks that ran before you. Do not repeat any of these:',
          ...known.slice(0, 30).map((k) => `- ${k.where}: ${k.message}`),
          '',
        ]
      : []),
    'Report only rules that genuinely fail one of the questions. A rule that is merely plain is',
    'fine; plain rules are the good kind. Reporting nothing is a correct answer and a common one.',
    '',
    'Answer with JSON and nothing else, in this shape:',
    '',
    '{"findings":[{"where":"rules/example","criterion":"actionable","message":"one sentence on what is wrong","fix":"one sentence on what to do"}]}',
    '',
    'Use `where` values exactly as they appear above. Omit any rule you have nothing to say about.',
  )
  return lines.join('\n')
}

/**
 * Read findings out of a judge's answer.
 *
 * Tolerant of the wrapping — models put JSON inside prose and inside fences — and strict about
 * the contents. A finding naming a rule that was not sent is dropped rather than reported: it
 * means the judge invented one, and passing that through would be worse than losing a real
 * finding alongside it.
 */
export function parseFindings(answer: string, known: Set<string>): Suggestion[] {
  const json = extractObject(answer)
  if (!json) return []
  const raw = (json as { findings?: unknown }).findings
  if (!Array.isArray(raw)) return []

  const out: Suggestion[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const f = item as Record<string, unknown>
    const where = typeof f['where'] === 'string' ? f['where'] : null
    const message = typeof f['message'] === 'string' ? f['message'].trim() : null
    const fix = typeof f['fix'] === 'string' ? f['fix'].trim() : null
    /*
     * Only a criterion this rubric defines.
     *
     * A judge asked for `criterion` will sometimes answer with something else, and a model that
     * returns "empty-body" produces a finding wearing the name of a static check — the same
     * label a reader has learned means "this compiles to nothing", at a severity that says the
     * opposite. Anything unrecognised becomes `judged`, which claims nothing.
     */
    const named = typeof f['criterion'] === 'string' ? f['criterion'] : ''
    const criterion = KNOWN_CRITERIA.has(named) ? named : 'judged'
    if (!where || !message || !fix) continue
    if (!known.has(where)) continue
    out.push({ check: criterion, severity: 'suggestion', where, message, fix })
  }
  return out.sort((a, b) => a.where.localeCompare(b.where) || a.check.localeCompare(b.check))
}

const KNOWN_CRITERIA = new Set(CRITERIA.map((c) => c.id))

/** The first balanced `{...}` that parses. Handles fences, prose, and trailing chatter. */
function extractObject(text: string): unknown {
  const start = text.indexOf('{')
  if (start < 0) return null
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1))
        } catch {
          return null
        }
      }
    }
  }
  return null
}
