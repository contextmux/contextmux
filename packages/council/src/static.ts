import { globToRegExp, globsOverlap } from '@contextmux/core'
import type { Agent, Command, ContextModel, Rule, Skill, Target } from '@contextmux/context'
import type { RepoFacts, Suggestion } from './types.js'

/**
 * Checks that need no model, no network and no money.
 *
 * Everything here is decidable by reading the context model against the file list, which means
 * it is right every time rather than usually. That is the whole reason this layer exists first:
 * an advisor that is occasionally wrong gets ignored, and then the expensive layers behind it
 * never get read either.
 *
 * The bar for adding a check here is that a false positive should be close to impossible. Where
 * a rule of thumb would be needed instead, it belongs in a judge, not in this file.
 *
 * A "this rule describes but never instructs" check was written for this layer and removed
 * again. Deciding it needs to tell an instruction from a description, and a vocabulary list
 * cannot: it accused a skill whose every instruction — `Grep the repo`, `add the prefix`,
 * `pull the ceiling from the comment` — used verbs the list did not contain. Widening the list
 * moves the goalposts rather than fixing the method. It is the first thing worth handing to a
 * judge, where being occasionally unsure is allowed.
 */

/**
 * A path-shaped token in prose: at least one slash, and a file extension or a known directory
 * ending. Deliberately narrow — `src/**` and `foo/bar` are excluded, because a glob is not a
 * claim that a file exists and a bare two-word slash is usually "and/or", not a path.
 */
const PATH_LIKE = /(?:^|[\s`'"(])((?:[\w.-]+\/){1,}[\w.-]+\.[a-z]{1,5})(?=[\s`'".,;:)]|$)/gi

/** Opposing polarity, for the contradiction check. */
const POSITIVE = /\b(?:always|must|should|prefer|use)\b/i
const NEGATIVE = /\b(?:never|must not|should not|do not|don't|avoid)\b/i

type Node = { targets?: readonly Target[] }

function normalise(body: string): string {
  return body.replace(/\s+/g, ' ').trim().toLowerCase()
}

/** The targets a node actually reaches, given what the repository compiles. */
function reachedTargets(node: Node, configured: readonly Target[]): Target[] {
  if (!node.targets || node.targets.length === 0) return [...configured]
  return configured.filter((t) => node.targets?.includes(t))
}

function checkEmptyBody(where: string, body: string): Suggestion[] {
  if (body.trim().length > 0) return []
  return [
    {
      check: 'empty-body',
      severity: 'error',
      where,
      message: 'The body is empty, so this compiles to nothing.',
      fix: 'Write the guidance, or delete the file. An empty node is invisible in every target.',
    },
  ]
}

function checkNeverCompiles(where: string, node: Node, facts: RepoFacts): Suggestion[] {
  // No configured targets means the caller did not tell us, not that nothing compiles. Saying
  // "restricted to none, none of which this repository compiles" about every node is worse
  // than staying quiet, and it is what an empty RepoFacts used to produce.
  if (facts.targets.length === 0) return []
  if (reachedTargets(node, facts.targets).length > 0) return []
  const asked = node.targets?.join(', ') ?? 'none'
  return [
    {
      check: 'never-compiles',
      severity: 'error',
      where,
      message: `Restricted to ${asked}, none of which this repository compiles.`,
      fix: `Add one of ${asked} to targets in .ctxmux/config.json, or widen this node's targets. As it stands it reaches nothing.`,
    },
  ]
}

function checkGlobsIgnored(where: string, rule: Rule): Suggestion[] {
  if (!rule.alwaysApply || rule.globs.length === 0) return []
  return [
    {
      check: 'globs-ignored',
      severity: 'warning',
      where,
      message: 'alwaysApply is set, so the globs are dead configuration.',
      fix: 'Drop alwaysApply to scope this to the globs, or delete the globs to say plainly that it is repo-wide.',
    },
  ]
}

function checkGlobsMatchNothing(where: string, globs: string[], facts: RepoFacts): Suggestion[] {
  if (globs.length === 0 || facts.files.length === 0) return []
  // Compile each pattern once. `matchesAny` rebuilds the regex on every call, which turns
  // this into one compilation per file per glob on a repository of any size.
  const dead = globs.filter((g) => {
    const re = globToRegExp(g)
    return !facts.files.some((f) => re.test(f))
  })
  if (dead.length === 0) return []
  const all = dead.length === globs.length
  return [
    {
      check: 'globs-match-nothing',
      severity: 'warning',
      where,
      message: `${all ? 'No glob' : `${dead.length} of ${globs.length} globs`} matches any file: ${dead.join(', ')}.`,
      fix: all
        ? 'Nothing activates this. Fix the pattern, or delete the node if what it described is gone.'
        : `Remove the dead patterns, or correct them: ${dead.join(', ')}.`,
    },
  ]
}

function checkDanglingPaths(where: string, body: string, facts: RepoFacts): Suggestion[] {
  if (facts.files.length === 0) return []
  const seen = new Set<string>()
  for (const m of body.matchAll(PATH_LIKE)) {
    const p = m[1]
    if (!p || facts.files.includes(p) || looksLikeDomain(p)) continue
    seen.add(p)
  }
  if (seen.size === 0) return []
  const all = [...seen]
  // Cap the list. A node referencing twenty dead paths produces a line nobody reads, and the
  // count carries the severity better than the enumeration does.
  const paths = all.slice(0, 5)
  const rest = all.length - paths.length
  return [
    {
      check: 'dangling-path',
      severity: 'warning',
      where,
      message: `Refers to ${all.length === 1 ? 'a path that no longer exists' : `${all.length} paths that no longer exist`}: ${paths.join(', ')}${rest > 0 ? `, and ${rest} more` : ''}.`,
      fix: 'Point at where the code moved, or drop the reference. An agent asked to look there will find nothing and guess.',
    },
  ]
}

/**
 * Whether a path-shaped token is really a host name.
 *
 * `contextmux.dev/guide.html` is shaped exactly like a repository path but is a URL somebody
 * wrote without a scheme. Repository paths almost never carry a dot in their first segment —
 * and the ones that do, like `.github/`, start with it.
 */
function looksLikeDomain(p: string): boolean {
  const first = p.slice(0, p.indexOf('/'))
  return first.includes('.') && !first.startsWith('.')
}

function checkWeakActivation(where: string, skill: Skill): Suggestion[] {
  const d = skill.description.trim()
  if (d.length >= 60 && ACTIVATION_CUE.test(d)) return []
  return [
    {
      check: 'weak-activation',
      severity: 'suggestion',
      where,
      message: 'The description is what decides whether this skill ever activates, and this one is thin.',
      fix: 'Say when to use it, in the words someone would actually type. Descriptions that only name the topic do not fire.',
    },
  ]
}

/**
 * Evidence that a description says when to fire, not merely what the skill is about.
 *
 * Several equally good forms exist and the check must accept all of them: prose ("use when
 * ..."), a labelled trigger list ("Trigger: ..."), slash commands, and quoted phrases a user
 * would type. Requiring one phrasing rejects well-written descriptions, which is a worse
 * failure here than missing a weak one — advice nobody trusts does not get read.
 */
const ACTIVATION_CUE = /\b(?:when|use|if|trigger(?:s|ed)?|says?|asks?|invoke[sd]?)\b|\/[a-z][\w-]+|["'\u201c][^"'\u201d]{4,}["'\u201d]/i

/** Two nodes saying the same thing, where editing one leaves the other stale. */
function checkDuplicates(nodes: { where: string; body: string }[]): Suggestion[] {
  const byBody = new Map<string, string[]>()
  for (const n of nodes) {
    const key = normalise(n.body)
    if (key.length < 40) continue // too short to be meaningfully "the same rule"
    const seen = byBody.get(key)
    if (seen) seen.push(n.where)
    else byBody.set(key, [n.where])
  }
  const out: Suggestion[] = []
  for (const group of byBody.values()) {
    if (group.length < 2) continue
    // One finding for the group, not one per member. Twenty-eight copies of the same rule used
    // to yield twenty-eight findings, each listing the other twenty-seven — quadratic prose
    // about a single problem, which buries every other finding in the report.
    const [first, ...rest] = [...group].sort()
    const shown = rest.slice(0, 4)
    const more = rest.length - shown.length
    out.push({
      check: 'duplicate-body',
      severity: 'warning',
      where: first as string,
      message: `Identical to ${shown.join(', ')}${more > 0 ? `, and ${more} more` : ''}.`,
      fix: 'Keep one. Two copies drift, and then agents get told two different things by files that used to agree.',
    })
  }
  return out
}

/**
 * Opposing directives about the same subject, in nodes whose scopes overlap.
 *
 * Conservative on purpose: it fires only when one body is positive and the other negative about
 * a shared, specific noun. Real contradictions are worth catching; a checker that cries wolf
 * about every "prefer X" next to an "avoid Y" is worse than nothing.
 */
function checkContradictions(rules: { where: string; rule: Rule }[]): Suggestion[] {
  // Collected per rule, then reported once. A rule that disagrees with fifty others is one
  // problem with that rule, not fifty findings — and emitting fifty buries everything else.
  const against = new Map<string, { with: string[]; subject: string }>()
  for (let i = 0; i < rules.length; i++) {
    for (let j = i + 1; j < rules.length; j++) {
      const a = rules[i]
      const b = rules[j]
      if (!a || !b) continue
      if (!scopesOverlap(a.rule, b.rule)) continue
      const shared = sharedSubject(a.rule.body, b.rule.body)
      if (!shared) continue
      // Polarity is judged in the sentence that mentions the subject, not across the whole
      // body. "Never use barrel exports" contains both a negative and the word `use`, so a
      // body-wide test reads it as saying two things at once and finds no disagreement.
      const pa = polarityAbout(a.rule.body, shared)
      const pb = polarityAbout(b.rule.body, shared)
      if (!pa || !pb || pa === pb) continue
      const entry = against.get(a.where)
      if (entry) entry.with.push(b.where)
      else against.set(a.where, { with: [b.where], subject: shared })
    }
  }

  const out: Suggestion[] = []
  for (const [where, { with: others, subject }] of against) {
    const shown = others.slice(0, 3)
    const more = others.length - shown.length
    out.push({
      check: 'contradiction',
      severity: 'warning',
      where,
      message: `Says the opposite of ${shown.join(', ')}${more > 0 ? `, and ${more} more` : ''} about "${subject}", and their scopes overlap.`,
      fix: 'Decide which one is true and delete the other, or scope them so they cannot both apply.',
    })
  }
  return out
}

/** Sentence-ish fragments. Good enough to keep a directive with its subject. */
function sentences(body: string): string[] {
  return body
    .split(/(?<=[.!?;])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * Whether the rule is for or against the subject, read from the clause that names it.
 *
 * The subject's two words are looked for separately rather than as an adjacent pair, because
 * `phrases` drops function words when building them: "always run the linter" yields `run
 * linter`, which never appears literally in the sentence it came from. Matching the phrase as
 * written found only subjects whose words happened to be adjacent, and silently missed the rest.
 */
function polarityAbout(body: string, subject: string): 'for' | 'against' | null {
  const words = subject.split(' ').map((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'))
  for (const sentence of sentences(body)) {
    if (!words.every((w) => w.test(sentence))) continue
    // Negation first: "never use X" is against X, even though it contains "use".
    if (NEGATIVE.test(sentence)) return 'against'
    if (POSITIVE.test(sentence)) return 'for'
  }
  return null
}

/** Repo-wide rules overlap everything; otherwise a shared glob is required. */
function scopesOverlap(a: Rule, b: Rule): boolean {
  const aWide = a.alwaysApply || a.globs.length === 0
  const bWide = b.alwaysApply || b.globs.length === 0
  if (aWide || bWide) return true
  // `src/**` and `src/**/*.ts` overlap without being equal, and string equality misses every
  // such pair — which is most of them, since people rarely write the same pattern twice.
  return a.globs.some((g) => b.globs.some((h) => globsOverlap(g, h)))
}

/**
 * A phrase both bodies talk about, or null when they merely share vocabulary.
 *
 * The evidence has to be a two-word phrase, not a shared noun. A single word is far too weak:
 * "do not point them at the same directory" and "use a real temporary directory" share
 * `directory` and opposing polarity while having nothing to do with each other, which is
 * exactly the false accusation this check must not make. "barrel exports" appearing in both is
 * evidence; "directory" appearing in both is a coincidence of English.
 */
function sharedSubject(a: string, b: string): string | null {
  const shared = phrases(a)
  for (const phrase of phrases(b)) if (shared.has(phrase)) return phrase
  return null
}

/**
 * Adjacent content-word pairs, with function words excluded entirely.
 *
 * Both words have to carry meaning. Allowing one function word makes overlapping windows of the
 * same span count separately — "the generated files" yields both `the generated` and
 * `generated files`, so a single shared phrase looks like two agreements. Requiring two content
 * words means each shared phrase is counted once, which is what a caller comparing counts
 * assumes it is getting.
 */
export function phrases(body: string): Set<string> {
  const words = (body.toLowerCase().match(/\b[a-z][a-z+-]{2,}\b/g) ?? []).filter((w) => !STOP.has(w))
  const out = new Set<string>()
  for (let i = 0; i + 1 < words.length; i++) {
    const first = words[i]
    const second = words[i + 1]
    if (!first || !second) continue
    out.add(`${first} ${second}`)
  }
  return out
}

/**
 * Words that never identify what a rule is about.
 *
 * Both the long connectives and the short function words: the short ones matter most, because
 * they are what glue two unrelated phrases into an apparent agreement.
 */
const STOP = new Set([
  'about', 'after', 'again', 'against', 'because', 'before', 'being', 'between', 'could',
  'every', 'first', 'other', 'should', 'their', 'there', 'these', 'thing', 'those', 'under',
  'until', 'where', 'which', 'while', 'would', 'always', 'never', 'avoid', 'prefer',
  'and', 'are', 'but', 'for', 'from', 'has', 'have', 'into', 'its', 'not', 'now', 'one',
  'only', 'out', 'own', 'same', 'that', 'the', 'them', 'then', 'they', 'this', 'was', 'were',
  'when', 'with', 'you', 'your', 'must', 'can', 'any', 'all', 'per', 'via', 'here', 'some',
])

/**
 * Review a context model without spending anything.
 *
 * Findings are ordered by severity, then by where they were found, so the output reads the same
 * way twice and a diff of two runs shows what changed rather than what was reshuffled.
 */
export function inspect(model: ContextModel, facts: RepoFacts): Suggestion[] {
  const out: Suggestion[] = []
  const bodies: { where: string; body: string }[] = []
  const rules: { where: string; rule: Rule }[] = []

  for (const rule of model.rules) {
    const where = `rules/${rule.name}`
    out.push(...checkEmptyBody(where, rule.body))
    if (rule.body.trim().length > 0) {
      out.push(...checkDanglingPaths(where, rule.body, facts))
      bodies.push({ where, body: rule.body })
      rules.push({ where, rule })
    }
    out.push(...checkNeverCompiles(where, rule, facts))
    out.push(...checkGlobsIgnored(where, rule))
    out.push(...checkGlobsMatchNothing(where, rule.globs, facts))
  }

  for (const skill of model.skills) {
    const where = `skills/${skill.name}`
    out.push(...checkEmptyBody(where, skill.body))
    if (skill.body.trim().length > 0) {
      out.push(...checkDanglingPaths(where, skill.body, facts))
      bodies.push({ where, body: skill.body })
    }
    out.push(...checkNeverCompiles(where, skill, facts))
    out.push(...checkGlobsMatchNothing(where, skill.globs, facts))
    out.push(...checkWeakActivation(where, skill))
  }

  // Agents and commands are nodes too. They were invisible to every check here at first,
  // which meant an agent restricted to a target the repository does not compile — the exact
  // thing `never-compiles` exists to catch — went unreported.
  for (const agent of model.agents) {
    const where = `agents/${agent.name}`
    out.push(...checkEmptyBody(where, agent.body))
    out.push(...checkNeverCompiles(where, agent, facts))
    if (agent.body.trim().length > 0) {
      out.push(...checkDanglingPaths(where, agent.body, facts))
      bodies.push({ where, body: agent.body })
    }
  }

  for (const command of model.commands) {
    const where = `commands/${command.name}`
    out.push(...checkEmptyBody(where, command.body))
    out.push(...checkNeverCompiles(where, command, facts))
    if (command.body.trim().length > 0) {
      out.push(...checkDanglingPaths(where, command.body, facts))
      bodies.push({ where, body: command.body })
    }
  }

  if (model.instructions) {
    out.push(...checkEmptyBody('instructions', model.instructions.body))
    if (model.instructions.body.trim().length > 0) {
      out.push(...checkDanglingPaths('instructions', model.instructions.body, facts))
    }
  }

  out.push(...checkDuplicates(bodies))
  out.push(...checkContradictions(rules))

  const rank: Record<string, number> = { error: 0, warning: 1, suggestion: 2 }
  return out.sort(
    (x, y) =>
      (rank[x.severity] ?? 3) - (rank[y.severity] ?? 3) ||
      x.where.localeCompare(y.where) ||
      x.check.localeCompare(y.check),
  )
}
