/**
 * Harvesting what actually went wrong.
 *
 * A signal is an observation about a completed run — a reviewer asked for something, a gate
 * refused something, the agent needed three attempts. Facts, not conclusions. The distillation
 * into a lesson happens later, and separating the two matters: a bad conclusion drawn from
 * good observations can be re-derived, but observations thrown away are gone.
 */
import type { Run } from '@contextmux/core'

export type SignalKind =
  /** A human asked for a change on the pull request. */
  | 'review'
  /** A verify gate refused the work. */
  | 'gate'
  /** The agent needed correcting before it got there. */
  | 'correction'

export interface Signal {
  kind: SignalKind
  /** What was said or checked, in the words it was said in. */
  text: string
  /** Where it came from, so a proposal can cite its evidence. */
  source: { runId: string; taskId: string; gate?: string; author?: string }
  /** Files it concerned, when the feedback was anchored to any. */
  files: string[]
  /** When the run finished, for reporting rather than for ranking. */
  at: number
}

/** Gates whose failures say nothing generalisable about how to work in this codebase. */
const UNINFORMATIVE_GATES = new Set(['in-flight-cap', 'produced-changes', 'readiness', 'complexity'])

/**
 * Pull signals out of a finished run.
 *
 * Only terminal runs are harvested. A run still in flight can still change its mind, and
 * learning from an intermediate state teaches lessons the final result contradicts.
 */
export function extractSignals(run: Run): Signal[] {
  const signals: Signal[] = []
  const at = Date.now()
  const source = { runId: run.id, taskId: run.task.id }

  for (const outcome of run.gateOutcomes) {
    if (outcome.verdict === 'pass') continue
    if (UNINFORMATIVE_GATES.has(outcome.gate)) continue

    const text = [outcome.reason, outcome.hint].filter(Boolean).join(' ')
    if (!text.trim()) continue

    signals.push({
      kind: 'gate',
      text,
      source: { ...source, gate: outcome.gate },
      files: filesFromText(text),
      at,
    })
  }

  /*
   * Revision rounds are recorded even when the specific feedback is gone.
   *
   * The count alone is evidence: a task that consistently needs two rounds is telling you
   * something about the task or the context, even when nobody wrote down what.
   */
  if (run.feedbackRound > 0 && run.pendingFeedback) {
    signals.push({
      kind: 'correction',
      text: run.pendingFeedback.body,
      source: { ...source, author: run.pendingFeedback.source },
      files: run.pendingFeedback.items?.map((i) => i.file) ?? [],
      at,
    })
  }

  return signals
}

/** Build signals from review feedback recorded against a run. */
export function signalsFromReview(
  run: Pick<Run, 'id'> & { task: { id: string } },
  feedback: { source: string; body: string; items?: Array<{ file: string; body: string }> },
): Signal[] {
  const signals: Signal[] = []
  const at = Date.now()
  const source = { runId: run.id, taskId: run.task.id, author: feedback.source }

  if (feedback.body.trim()) {
    signals.push({
      kind: 'review',
      text: feedback.body.trim(),
      source,
      files: feedback.items?.map((i) => i.file) ?? [],
      at,
    })
  }

  // Inline comments are separate signals: each is about one thing, which makes them far more
  // useful for clustering than a single blob covering four unrelated points.
  for (const item of feedback.items ?? []) {
    if (!item.body.trim()) continue
    signals.push({ kind: 'review', text: item.body.trim(), source, files: [item.file], at })
  }

  return signals
}

/**
 * Paths mentioned in free text, so a lesson can be scoped to where it applies.
 *
 * Capped, because a comment quoting a stack trace names dozens of files and none of them are
 * what the reviewer was talking about.
 */
export function filesFromText(text: string): string[] {
  const matches = text.match(/[\w./-]+\.[a-z]{2,4}\b/gi) ?? []
  return [...new Set(matches)].slice(0, 10)
}

