/**
 * Finding what recurred.
 *
 * The central idea of this whole package. A pipeline that injects the most *recent* feedback
 * into every prompt is optimising for the wrong thing: recency says nothing about importance,
 * and it means a one-off remark from last Tuesday outranks a convention the team has restated
 * six times. It also grows without bound — every merged pull request adds sediment, and the
 * signal-to-noise ratio of the context falls monotonically.
 *
 * Recurrence is the better signal. Something a reviewer said once might be a preference;
 * something said across four unrelated tasks is a convention nobody wrote down, and writing it
 * down is exactly what this package is for.
 *
 * Similarity is measured lexically. It is not clever, and it does not need to be: reviewers
 * asking for the same thing tend to use the same words, and a clustering step nobody can
 * predict produces proposals nobody trusts.
 */
import { createHash } from 'node:crypto'
import type { Signal } from './signals.js'

/** Words too common to distinguish one piece of feedback from another. */
const STOPWORDS = new Set([
  'the', 'this', 'that', 'these', 'those', 'and', 'but', 'for', 'with', 'from', 'into',
  'you', 'your', 'should', 'would', 'could', 'please', 'can', 'will', 'need', 'needs',
  'are', 'was', 'were', 'has', 'have', 'had', 'not', 'use', 'using', 'used', 'here',
  'there', 'when', 'where', 'what', 'which', 'why', 'how', 'its', 'it', 'a', 'an', 'is',
  'be', 'been', 'to', 'of', 'in', 'on', 'at', 'by', 'or', 'as', 'if', 'we', 'do', 'does',
])

/**
 * Reduce text to comparable terms.
 *
 * Code fragments and file paths are stripped first. Two reviewers making the same point about
 * different files should cluster together, and leaving the identifiers in guarantees they
 * never will.
 */
export function terms(text: string): Set<string> {
  const cleaned = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/[\w./-]+\.[a-z]{2,4}\b/gi, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .toLowerCase()
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')

  const out = new Set<string>()
  for (const raw of cleaned.split(/[^a-z0-9]+/)) {
    if (raw.length < 3 || STOPWORDS.has(raw)) continue
    // Crude stemming, enough to make "tests"/"test" and "naming"/"name" agree.
    out.add(raw.replace(/(ing|ed|es|s)$/, ''))
  }
  return out
}

/** Overlap between two term sets, as a fraction of the smaller one. */
export function similarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let shared = 0
  for (const term of a) if (b.has(term)) shared += 1
  /*
   * Divided by the smaller set rather than the union.
   *
   * Jaccard punishes a short, precise comment for being short — "use the shared helper" against
   * a three-paragraph review of the same point scores near zero, and those are exactly the two
   * that should cluster.
   */
  return shared / Math.min(a.size, b.size)
}

export interface Cluster {
  /** Stable identity, derived from content so the same lesson keeps its id across runs. */
  id: string
  /** The clearest phrasing seen, used as the lesson's headline. */
  representative: string
  signals: Signal[]
  /** Distinct tasks this arose on — the real measure of recurrence. */
  taskCount: number
  /** Paths mentioned across the cluster, for scoping the eventual rule. */
  files: string[]
  kinds: Set<Signal['kind']>
}

/**
 * Content-derived id, so a lesson keeps its identity across invocations.
 *
 * A real digest rather than a rolling hash, because this id is what the ledger records a
 * decision against. Two unrelated lessons colliding would mean declining one silently declines
 * the other — a lesson a person never saw, suppressed forever, with nothing to show why.
 */
function clusterId(termSet: Set<string>): string {
  const signature = [...termSet].sort().slice(0, 12).join('-')
  return `L-${createHash('sha256').update(signature).digest('base64url').slice(0, 10)}`
}

export interface ClusterOptions {
  /** Overlap above which two signals are the same point. */
  threshold?: number
  /**
   * Distinct tasks a point must appear on to count as recurring.
   *
   * Two, by default. One is an anecdote; requiring three means a real convention waits months
   * to be noticed on a small team.
   */
  minTasks?: number
}

export function clusterSignals(signals: Signal[], opts: ClusterOptions = {}): Cluster[] {
  const threshold = opts.threshold ?? 0.5
  const minTasks = opts.minTasks ?? 2

  const buckets: Array<{ termSet: Set<string>; signals: Signal[] }> = []

  for (const signal of signals) {
    const termSet = terms(signal.text)
    if (termSet.size === 0) continue

    const match = buckets.find((b) => similarity(b.termSet, termSet) >= threshold)
    if (match) {
      match.signals.push(signal)
      // Keep only terms the whole bucket shares, so a cluster stays about one thing rather
      // than drifting as loosely-related feedback accretes onto it.
      for (const term of [...match.termSet]) if (!termSet.has(term)) match.termSet.delete(term)
    } else {
      buckets.push({ termSet, signals: [signal] })
    }
  }

  return buckets
    .map((bucket) => {
      const tasks = new Set(bucket.signals.map((s) => s.source.taskId))
      const files = [...new Set(bucket.signals.flatMap((s) => s.files))]
      return {
        id: clusterId(bucket.termSet),
        representative: pickRepresentative(bucket.signals.map((s) => s.text)),
        signals: bucket.signals,
        taskCount: tasks.size,
        files,
        kinds: new Set(bucket.signals.map((s) => s.kind)),
      }
    })
    .filter((c) => c.taskCount >= minTasks)
    .sort((a, b) => b.taskCount - a.taskCount || b.signals.length - a.signals.length)
}

/**
 * Words that only mean something in the situation they were said in.
 *
 * "Use the shared helper here too" is a perfectly good review comment and a terrible rule: an
 * agent reading it in a different file has no idea what "here" refers to. Deictic phrasing is
 * the most common way a distilled lesson comes out sounding like a fragment of a conversation.
 */
const DEICTIC = /\b(here|there|this|that|these|those|too|also|again|instead|it)\b/gi

/** How many context-dependent words a phrasing leans on. */
function deicticCount(text: string): number {
  return (text.match(DEICTIC) ?? []).length
}

/**
 * Choose the phrasing that will read best as standing guidance.
 *
 * Shortest is a good default — a reviewer who made the point in one line had already distilled
 * it — but only among phrasings that stand on their own. A short comment full of "here" and
 * "this" is short precisely because it leaned on context that no longer exists.
 *
 * When every candidate leans on context, prefer the one that leans least rather than the one
 * that is shortest: "use the shared helper rather than inlining this" is longer than "use the
 * shared helper here too" and enormously more useful as a rule.
 */
export function pickRepresentative(texts: string[]): string {
  return [...texts].sort((a, b) => {
    const byContext = deicticCount(a) - deicticCount(b)
    return byContext !== 0 ? byContext : a.length - b.length
  })[0]!
}
