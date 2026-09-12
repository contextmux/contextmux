import type { Target } from '@contextmux/context'

/**
 * What a judge is asked to look for.
 *
 * These are written for coding rules, not for prompts. A rule is a standing instruction that
 * every agent reads on every task, so the questions that matter are whether it can be followed,
 * whether anyone could tell if it was, and whether it earns the space it takes up in a context
 * window it shares with everything else.
 *
 * Data rather than code on purpose: the set can be read in one screen and argued with, and
 * `RUBRIC_VERSION` below makes a change to it invalidate every cached answer.
 */
export interface Criterion {
  id: string
  /** Put to the judge as a yes/no question about one rule. */
  question: string
  /** Why it matters, so the judge knows what a bad answer looks like. */
  rationale: string
  /** The cheapest depth that can decide it. */
  minDepth: Depth
  /**
   * Whether answering it requires seeing the other rules.
   *
   * A relational criterion cannot be cached per rule: whether one rule pulls against another is
   * a fact about the pair, and it changes when either of them does. Marking it here is what
   * stops the cache from quietly sending a judge a single rule and asking whether it conflicts
   * with rules it was not shown.
   */
  relational?: boolean
}

/**
 * How hard to look.
 *
 * `static` needs no model at all and is what `inspect()` already does. `single` asks one judge.
 * `panel` asks several and keeps only what they agree on, which costs several times as much and
 * is worth it only when the answer is going to be argued with.
 */
export type Depth = 'static' | 'single' | 'panel'

export const DEPTHS: Depth[] = ['static', 'single', 'panel']

/**
 * Bump when the criteria change in a way that would change an answer.
 *
 * Cached judgements carry this. Without it, editing a question below leaves every previous
 * answer in place and the cache quietly serves verdicts nobody would reach today.
 */
export const RUBRIC_VERSION = '1.0.0'

export const CRITERIA: Criterion[] = [
  {
    id: 'actionable',
    question: 'Does this say what to do, rather than only describing how things are?',
    rationale:
      'An agent cannot follow a description. "The project uses a compiler" tells it nothing; ' +
      '"compile before committing" does. This is the most common way a rule ends up inert.',
    minDepth: 'single',
  },
  {
    id: 'checkable',
    question: 'Could a reviewer tell from a diff whether this was followed?',
    rationale:
      'A rule nobody can check is a preference, and it will be ignored without anyone noticing. ' +
      '"Keep functions small" cannot be checked; "no function longer than the screen it is read on" ' +
      'can be argued about, which is already better.',
    minDepth: 'single',
  },
  {
    id: 'earns-its-place',
    question:
      'Does this tell a competent agent something it would not already do by default?',
    rationale:
      'Every rule is read on every task and costs context that something else could have used. ' +
      '"Write clean code", "add tests", "handle errors" are already defaults. A rule that restates ' +
      'one is worse than absent: it dilutes the rules that carry real information.',
    minDepth: 'single',
  },
  {
    id: 'grounded',
    question: 'Does this match how the repository actually works?',
    rationale:
      'Rules outlive the code they were written about. A rule naming a framework that was ' +
      'replaced, or a directory that moved, sends an agent somewhere that no longer exists.',
    minDepth: 'panel',
  },
  {
    id: 'consistent',
    question: 'Does this sit comfortably beside the other rules, or does it pull against one?',
    relational: true,
    rationale:
      'Two rules that disagree make an agent pick, and it will pick differently each time. ' +
      'The static layer catches only the blatant cases — opposite directives about the same ' +
      'phrase — and most real tension is subtler than that.',
    minDepth: 'panel',
  },
]

/** The criteria a given depth can actually decide. */
export function criteriaFor(depth: Depth): Criterion[] {
  if (depth === 'static') return []
  if (depth === 'single') return CRITERIA.filter((c) => c.minDepth === 'single')
  return CRITERIA
}

/** Everything a judge needs to know about the repository to answer `grounded`. */
export interface JudgeContext {
  targets: readonly Target[]
  /** A sample of real paths, so "does this match the repository" has something to check. */
  sampleFiles: string[]
}
