import type { Target } from '@contextmux/context'

/**
 * What a check is allowed to know about the repository.
 *
 * Deliberately a plain value rather than a directory to read. Every check in `static.ts` is a
 * pure function of (model, facts), which is what makes them testable without a fixture tree on
 * disk — and what will let the L1 judges reuse the same inputs later.
 */
export interface RepoFacts {
  /** Every tracked file, relative to the repository root, forward slashes. */
  files: string[]
  /** The targets this repository actually compiles to, from `config.targets`. */
  targets: readonly Target[]
}

/**
 * How much a finding should interrupt you.
 *
 * `error` means the node does not work: it compiles to nothing, or reaches no target. `warning`
 * means it works but almost certainly not as intended. `suggestion` is a judgement call, and
 * being wrong about one should cost the reader a second, not a debate.
 */
export type Severity = 'error' | 'warning' | 'suggestion'

export interface Suggestion {
  /** Stable identifier, so a finding can be referred to and suppressed. */
  check: string
  severity: Severity
  /** Where it was found, in the shape `rules/scope-discipline`. */
  where: string
  /** What is wrong. One sentence, specific enough to act on without opening the file. */
  message: string
  /** What to do about it. Never "consider" — say the thing. */
  fix: string
}
