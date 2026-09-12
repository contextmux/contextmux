import { PERSONAS, PERSONA_VERSION, type Persona } from './personas.js'
import { phrases } from './static.js'
import type { Judge } from './judge.js'

/**
 * A rule a persona thinks this repository should have.
 *
 * Shaped so it can become a file under `.ctxmux/rules/` without further interpretation, but
 * deliberately not a `Rule`: nothing here has been agreed to yet.
 */
export interface Proposal {
  name: string
  description: string
  globs: string[]
  body: string
  /** Which personas arrived at this independently. The only quality signal available for free. */
  from: string[]
}

/** What the personas are told about the repository they are writing rules for. */
export interface RepoFactsForGeneration {
  packageManager: string
  languages: string[]
  frameworks: string[]
  qualityGate: string[]
  isMonorepo: boolean
  /** A sample of real paths, so proposals can name real places. */
  sampleFiles: string[]
}

export interface GenerateResult {
  proposals: Proposal[]
  /** Personas that failed or returned nothing usable, with why. */
  silent: { persona: string; reason: string }[]
}

export const GENERATION_VERSION = PERSONA_VERSION

/**
 * Ask every persona, then keep what more than one of them arrived at.
 *
 * The synthesis is deliberately arithmetic rather than another model call. PromptTide's
 * roundtable ends with a "Brain" that merges the voices, which costs as much again and hides
 * the one signal worth having: whether four people given different concerns independently
 * reached the same rule. Counting that is free, reproducible, and a better ranking than a
 * model's summary of itself.
 */
export async function generate(
  facts: RepoFactsForGeneration,
  judge: Judge,
  opts: { personas?: Persona[]; limit?: number } = {},
): Promise<GenerateResult> {
  const personas = opts.personas ?? PERSONAS
  const limit = opts.limit ?? 8

  // In parallel: they do not depend on each other, and serially this is four round trips.
  const answers = await Promise.all(
    personas.map(async (persona) => {
      try {
        const text = await judge.ask(buildPersonaPrompt(persona, facts))
        return { persona, proposals: parseProposals(text, persona.id) }
      } catch (e) {
        return { persona, proposals: [], reason: e instanceof Error ? e.message : String(e) }
      }
    }),
  )

  const silent = answers
    .filter((a) => a.proposals.length === 0)
    .map((a) => ({ persona: a.persona.id, reason: a.reason ?? 'proposed nothing' }))

  return { proposals: synthesise(answers.flatMap((a) => a.proposals), limit), silent }
}

/**
 * Merge proposals that are about the same thing, and rank by how many voices reached them.
 *
 * Two proposals count as one when their bodies share more than one distinctive two-word phrase.
 * One is too weak for this: "never edit the generated files" and "always run the generated
 * files check" share `generated files` while being different rules, and merging them loses one
 * of them silently. Requiring two is the difference between agreeing and sharing vocabulary.
 */
const AGREEMENT = 2

function overlap(a: Set<string>, b: Set<string>): number {
  let n = 0
  for (const phrase of a) if (b.has(phrase)) n++
  return n
}

export function synthesise(all: Proposal[], limit: number): Proposal[] {
  const groups: Proposal[][] = []
  for (const proposal of all) {
    const mine = phrases(proposal.body)
    const existing = groups.find((g) => g.some((other) => overlap(mine, phrases(other.body)) >= AGREEMENT))
    if (existing) existing.push(proposal)
    else groups.push([proposal])
  }

  const ranked = groups
    .map((group) => {
      // The longest body in a group is usually the most specific, and specificity is the thing
      // these rules are short of. Personas are listed in a stable order so the output does not
      // reshuffle between runs.
      const best = [...group].sort((a, b) => b.body.length - a.body.length)[0] as Proposal
      return { ...best, from: [...new Set(group.flatMap((g) => g.from))].sort() }
    })
    .sort((a, b) => b.from.length - a.from.length || a.name.localeCompare(b.name))
    .slice(0, limit)

  return unique(ranked)
}

/**
 * Make the slugs distinct, because they become filenames.
 *
 * Two voices can arrive at unrelated rules and give them the same obvious name — `style`,
 * `testing` — and the merge above only joins proposals that say the same thing, not ones that
 * happen to agree on a title. Left alone, the second rule is written to a path the first just
 * occupied and reported back as "already there, left alone", which is both a lost rule and a
 * sentence that means something else entirely.
 */
function unique(proposals: Proposal[]): Proposal[] {
  const taken = new Set<string>()
  return proposals.map((p) => {
    if (!taken.has(p.name)) {
      taken.add(p.name)
      return p
    }
    let n = 2
    while (taken.has(`${p.name}-${n}`)) n++
    taken.add(`${p.name}-${n}`)
    return { ...p, name: `${p.name}-${n}` }
  })
}

export function buildPersonaPrompt(persona: Persona, facts: RepoFactsForGeneration): string {
  const lines = [
    persona.stance,
    '',
    'You are writing standing instructions for coding agents working in this repository. Every',
    'rule you propose will be read on every task, before the agent sees the task.',
    '',
    'What this repository is:',
    `- package manager: ${facts.packageManager}`,
  ]
  if (facts.languages.length) lines.push(`- languages: ${facts.languages.join(', ')}`)
  if (facts.frameworks.length) lines.push(`- stack: ${facts.frameworks.join(', ')}`)
  if (facts.qualityGate.length) lines.push(`- validated by: ${facts.qualityGate.join(' && ')}`)
  if (facts.isMonorepo) lines.push('- a monorepo')
  if (facts.sampleFiles.length) lines.push(`- some real paths: ${facts.sampleFiles.slice(0, 40).join(', ')}`)

  lines.push(
    '',
    persona.brief,
    '',
    'Propose at most four rules. Fewer is better. Each one must be specific to this repository:',
    'a rule that would read identically in any other project is not worth proposing.',
    '',
    'Answer with JSON and nothing else:',
    '',
    '{"rules":[{"name":"kebab-case-slug","description":"one line on when it applies",' +
      '"globs":["src/**"],"body":"the instruction, in one or two sentences"}]}',
    '',
    'Leave `globs` empty for a rule that applies everywhere. Return {"rules":[]} if you have',
    'nothing worth saying.',
  )
  return lines.join('\n')
}

/** Read proposals out of one persona's answer. Anything malformed is dropped, not repaired. */
export function parseProposals(answer: string, from: string): Proposal[] {
  const json = extractObject(answer)
  const raw = (json as { rules?: unknown } | null)?.rules
  if (!Array.isArray(raw)) return []

  const out: Proposal[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const r = item as Record<string, unknown>
    const name = typeof r['name'] === 'string' ? slug(r['name']) : null
    const body = typeof r['body'] === 'string' ? r['body'].trim() : null
    const description = typeof r['description'] === 'string' ? r['description'].trim() : ''
    if (!name || !body) continue
    const globs = Array.isArray(r['globs']) ? r['globs'].filter((g): g is string => typeof g === 'string') : []
    out.push({ name, description, globs, body, from: [from] })
  }
  return out
}

/** `.ctxmux/rules/` filenames are slugs, and a model will not always send one. */
function slug(raw: string): string | null {
  const s = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return s.length > 0 ? s : null
}

/** The first balanced `{...}` that parses. Shared shape with the judge's reader. */
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
