/**
 * The handoff package.
 *
 * The question this exists to answer: *what is the minimum information needed to transfer a
 * task between agents without transferring context?*
 *
 * The naive answer is "everything" — replay the whole conversation into the next agent. That
 * works and is useless: it costs as much as the original attempt, it carries the failed
 * reasoning that got the first agent stuck, and it does not fit for a long run. The naive
 * opposite — hand over only the task — is worse, because the second agent repeats the first
 * one's dead ends at full price.
 *
 * What is actually worth transferring is *negative knowledge*: what has already been ruled
 * out. That is the part a fresh agent cannot reconstruct and the part that is expensive to
 * rediscover, and it is exactly the part a conversation transcript buries.
 *
 * So the package is built from the trajectory rather than the transcript, and it is **tiered**
 * — every field is labelled with how necessary it is thought to be. That turns the research
 * question into something measurable: run the same handoff at each tier and see where task
 * completion falls off. A format with an ablation dial can be argued with; one without is just
 * an assertion.
 */
import type { AgentResult, GateOutcome, TaskSpec } from '@contextmux/core'
import type { Trajectory } from '@contextmux/trajectory'

/**
 * How necessary a piece of the package is believed to be.
 *
 * These are hypotheses, not measurements. They are declared so an experiment can falsify them.
 */
export type Tier =
  /** Without this the receiving agent cannot start. */
  | 'essential'
  /** Without this it starts, but repeats work the first agent already did. */
  | 'valuable'
  /** Helps, but the agent could rediscover it cheaply. */
  | 'optional'

export interface DeadEnd {
  /** What was tried. */
  approach: string
  /** Why it did not work, in whatever detail is available. */
  outcome: string
  /** How many times it was attempted. Repetition is itself information. */
  attempts: number
}

export interface HandoffPackage {
  version: 1
  /** Why the transfer is happening. */
  reason: string
  from: { agentId: string; runId: string; round: number }

  // --- essential ---------------------------------------------------------
  /** The task, unchanged. Without it there is nothing to do. */
  task: TaskSpec
  /** Where the work is, so the next agent continues rather than restarts. */
  workspace: { branch?: string; worktree?: string; filesChanged: string[] }

  // --- valuable ----------------------------------------------------------
  /**
   * What has already been ruled out.
   *
   * The part a fresh agent cannot reconstruct and the most expensive to rediscover.
   */
  deadEnds: DeadEnd[]
  /** Work already done that should not be redone or reverted. */
  progress: { summary: string; diffSummary: string }
  /** Checks that already failed, so the next agent knows what it must satisfy. */
  failedChecks: Array<{ gate: string; reason: string }>

  // --- optional ----------------------------------------------------------
  /** Files the first agent read. Saves rediscovery, cheap to redo. */
  filesExamined: string[]
  /** What the first agent believed it should do next. */
  suggestion?: string
  /** Constraints discovered along the way, not present in the task. */
  observations: string[]
}

/** Which fields belong to which tier, so a rendering can be ablated. */
export const TIERS: Record<keyof Omit<HandoffPackage, 'version' | 'reason' | 'from'>, Tier> = {
  task: 'essential',
  workspace: 'essential',
  deadEnds: 'valuable',
  progress: 'valuable',
  failedChecks: 'valuable',
  filesExamined: 'optional',
  suggestion: 'optional',
  observations: 'optional',
}

export interface BuildOptions {
  task: TaskSpec
  trajectory: Trajectory
  reason: string
  fromAgentId: string
  runId: string
  round: number
  result?: AgentResult | null
  gateOutcomes?: GateOutcome[]
}

/**
 * Extract what was tried and did not work.
 *
 * Two sources, because agents fail in two ways. A tool call that returned an error is an
 * explicit dead end. A call repeated with identical arguments is an implicit one — the agent
 * did not recognise it as a failure, which is precisely why the next agent needs telling.
 */
export function extractDeadEnds(trajectory: Trajectory): DeadEnd[] {
  const ends = new Map<string, DeadEnd>()

  for (const step of trajectory.of('tool')) {
    const data = step.data as { ok?: boolean; error?: string; signature?: string } | undefined
    if (!data?.signature) continue

    if (data.ok === false) {
      const key = `fail:${data.signature}`
      const existing = ends.get(key)
      if (existing) existing.attempts += 1
      else {
        ends.set(key, {
          approach: `${step.name}: ${step.summary}`,
          outcome: data.error ?? 'failed',
          attempts: 1,
        })
      }
    }
  }

  // Repetition without an explicit failure: the agent kept asking and kept not getting what it
  // needed. Three is the point at which it stops looking like an ordinary retry.
  const bySignature = new Map<string, { name: string; summary: string; count: number }>()
  for (const step of trajectory.of('tool')) {
    const data = step.data as { signature?: string; ok?: boolean } | undefined
    if (!data?.signature || data.ok === false) continue
    const entry = bySignature.get(data.signature) ?? { name: step.name, summary: step.summary, count: 0 }
    entry.count += 1
    bySignature.set(data.signature, entry)
  }
  for (const [signature, entry] of bySignature) {
    if (entry.count < 3) continue
    ends.set(`repeat:${signature}`, {
      approach: `${entry.name}: ${entry.summary}`,
      outcome: 'tried repeatedly without getting anywhere',
      attempts: entry.count,
    })
  }

  return [...ends.values()].sort((a, b) => b.attempts - a.attempts)
}

/**
 * A one-line-per-file summary of the change.
 *
 * The full diff is deliberately not carried: it is large, it is already on disk in the
 * worktree the next agent inherits, and duplicating it into the prompt is the "transfer
 * everything" mistake in miniature.
 */
export function summariseDiff(diff: string): string {
  if (!diff.trim()) return 'no changes yet'

  const perFile = new Map<string, { added: number; removed: number }>()
  let current: string | null = null

  /*
   * Both halves of the file header are read, because a deletion names the file on neither the
   * line you would expect nor in the form you would expect: it is `--- a/gone.ts` followed by
   * `+++ /dev/null`. Watching only the `+++` line meant a deleted file was never opened, and
   * every one of its removed lines was counted against whichever file preceded it.
   */
  let removedFile: string | null = null

  for (const line of diff.split('\n')) {
    const from = /^--- (?:a\/(.+)|\/dev\/null)$/.exec(line)
    if (from) {
      removedFile = from[1]?.trim() ?? null
      continue
    }

    const to = /^\+\+\+ (?:b\/(.+)|\/dev\/null)$/.exec(line)
    if (to) {
      current = to[1]?.trim() ?? removedFile
      /*
       * Accumulate, because one file can head more than one section.
       *
       * `LocalRunner.diff()` concatenates the committed diff, the working-tree diff and each
       * untracked file, so a file the agent committed and then edited again appears twice.
       * Resetting on the second header threw away the first tally: an agent that committed
       * thirty lines and then touched one more was reported to the next agent as having
       * changed a single line, which invites it to redo the work.
       */
      if (current && !perFile.has(current)) perFile.set(current, { added: 0, removed: 0 })
      continue
    }

    if (!current) continue
    const stats = perFile.get(current)!
    if (line.startsWith('+') && !line.startsWith('+++')) stats.added += 1
    else if (line.startsWith('-') && !line.startsWith('---')) stats.removed += 1
  }

  if (perFile.size === 0) return 'changes present but not attributable to files'
  return [...perFile]
    .map(([file, s]) => `${file} (+${s.added}/-${s.removed})`)
    .join(', ')
}

/**
 * What the first agent thought should happen next.
 *
 * Its last message, which is where an agent that is giving up usually says what it would try.
 * Carried as a hint rather than an instruction: it stopped before proving it right, and a
 * confident wrong suggestion is worse than none — it can send the second agent down the same
 * path that defeated the first.
 */
function extractSuggestion(trajectory: Trajectory): string | undefined {
  const last = trajectory.of('message').at(-1)?.summary?.trim()
  if (!last || last.length < 20) return undefined
  return last
}

/** Things the first agent learned that the task did not say. */
function extractObservations(trajectory: Trajectory): string[] {
  const out: string[] = []
  for (const step of trajectory.of('message')) {
    const text = step.summary
    // Statements about the codebase, not narration of intent. Crude, and deliberately so:
    // a cleverer filter would need a model, and a model in the handoff path is a second
    // agent's worth of cost to save a paragraph.
    if (/\b(?:turns out|actually|note that|the codebase|existing|already has|there is no)\b/i.test(text)) {
      out.push(text)
    }
  }
  return out.slice(0, 5)
}

export function buildHandoff(opts: BuildOptions): HandoffPackage {
  const { trajectory, result } = opts

  return {
    version: 1,
    reason: opts.reason,
    from: { agentId: opts.fromAgentId, runId: opts.runId, round: opts.round },

    task: opts.task,
    workspace: {
      ...(result?.location?.branch ? { branch: result.location.branch } : {}),
      ...(result?.location?.worktree ? { worktree: result.location.worktree } : {}),
      filesChanged: result?.filesChanged ?? [],
    },

    deadEnds: extractDeadEnds(trajectory),
    progress: {
      summary: result?.summary?.split('\n').slice(0, 5).join('\n') ?? 'nothing reported',
      diffSummary: summariseDiff(result?.diff ?? ''),
    },
    failedChecks: (opts.gateOutcomes ?? [])
      .filter((o) => o.verdict !== 'pass')
      .map((o) => ({ gate: o.gate, reason: o.reason ?? 'failed' })),

    filesExamined: [...new Set(trajectory.readFiles())].slice(0, 30),
    ...(extractSuggestion(trajectory) ? { suggestion: extractSuggestion(trajectory)! } : {}),
    observations: extractObservations(trajectory),
  }
}
