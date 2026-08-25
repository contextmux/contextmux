/**
 * Scoring an agent's attempt.
 *
 * Every metric here is measured, not judged. Using a model to grade another model's output
 * is convenient and produces numbers that move for reasons nobody can explain — and a
 * comparison nobody trusts is worse than no comparison, because it still gets quoted.
 *
 * So: did the tests pass, did it stay in scope, how large is the diff, how many rounds did it
 * need, what did it cost. All of those are facts about the artefact.
 */
import { DEFAULT_DENY, matchGlob, type AgentResult, type GateOutcome, type TaskSpec } from '@contextmux/core'

export interface Attempt {
  agentId: string
  agentName: string
  result: AgentResult | null
  gateOutcomes: GateOutcome[]
  /** Revision rounds consumed before the attempt settled. */
  rounds: number
  durationMs: number
  /** Terminal state of the run that produced this attempt. */
  state: string
  error?: string
  /** Where the work is, so a human can read the diff. */
  worktree?: string
}

export interface Score {
  agentId: string
  agentName: string
  /** Did it produce a change that passed every gate? */
  succeeded: boolean
  /** Project test/lint/typecheck commands passed. */
  qualityPassed: boolean
  /** Files it changed that the task did not permit. */
  outOfScopeFiles: string[]
  filesChanged: number
  /** Added plus removed lines, as a proxy for how much there is to review. */
  diffLines: number
  rounds: number
  durationMs: number
  costUsd: number | null
  /** Whether it weakened tests to pass — always disqualifying. */
  weakenedTests: boolean
  state: string
  error?: string
  worktree?: string
  notes: string[]
}

export function countDiffLines(diff: string | undefined): number {
  if (!diff) return 0
  let count = 0
  for (const line of diff.split('\n')) {
    if ((line.startsWith('+') && !line.startsWith('+++')) || (line.startsWith('-') && !line.startsWith('---'))) {
      count += 1
    }
  }
  return count
}

/**
 * Files a change touched that the task did not permit.
 *
 * Includes `DEFAULT_DENY`, because the `path-scope` gate does — `ctxmux eval` builds its gates
 * with `pathScope({ defaultDeny: DEFAULT_DENY })` and then scored against a different rule. An
 * agent that edited `package.json` on a task with no explicit scope was rejected by the gate
 * and simultaneously reported as "scope: clean", which is the one place a comparison must not
 * disagree with the thing it is comparing.
 */
export function outOfScope(task: TaskSpec, files: string[], defaultDeny = DEFAULT_DENY): string[] {
  const { allow } = task.scope
  const deny = [...task.scope.deny, ...defaultDeny]
  return files.filter((file) => {
    if (deny.some((p) => matchGlob(p, file))) return true
    return allow.length > 0 && !allow.some((p) => matchGlob(p, file))
  })
}

export function scoreAttempt(task: TaskSpec, attempt: Attempt): Score {
  const result = attempt.result
  const files = result?.filesChanged ?? []
  const notes: string[] = []

  const gate = (name: string) => attempt.gateOutcomes.find((o) => o.gate === name)
  const qualityOutcome = gate('quality-gate')
  const integrityOutcome = gate('test-integrity')

  const qualityPassed = qualityOutcome ? qualityOutcome.verdict === 'pass' : false
  const weakenedTests = integrityOutcome?.verdict === 'escalate'

  if (!qualityOutcome) notes.push('quality gate did not run')
  if (weakenedTests) notes.push('weakened existing tests')
  if (result?.status === 'refused') notes.push('declined the task')

  const scope = outOfScope(task, files)
  if (scope.length > 0) notes.push(`${scope.length} file(s) outside the task scope`)

  return {
    agentId: attempt.agentId,
    agentName: attempt.agentName,
    succeeded: attempt.state === 'in_review' || attempt.state === 'completed',
    qualityPassed,
    outOfScopeFiles: scope,
    filesChanged: files.length,
    diffLines: countDiffLines(result?.diff),
    rounds: attempt.rounds,
    durationMs: attempt.durationMs,
    costUsd: result?.usage?.costUsd ?? null,
    weakenedTests,
    state: attempt.state,
    ...(attempt.error ? { error: attempt.error } : {}),
    ...(attempt.worktree ? { worktree: attempt.worktree } : {}),
    notes,
  }
}

/**
 * Rank attempts.
 *
 * Correctness dominates everything: an attempt whose tests fail is not better than one that
 * passes, however small its diff. Weakening tests disqualifies outright rather than costing
 * points, because a suite that has been quietly loosened is worse than a failing one — the
 * failure at least announces itself.
 *
 * Below that, fewer review rounds beats a smaller diff, because a human's attention is the
 * scarcer resource. Cost is the last tiebreak: it is real, but a cheap wrong answer is not a
 * bargain.
 */
export function rank(scores: Score[]): Score[] {
  return [...scores].sort((a, b) => {
    if (a.weakenedTests !== b.weakenedTests) return a.weakenedTests ? 1 : -1
    if (a.succeeded !== b.succeeded) return a.succeeded ? -1 : 1
    if (a.qualityPassed !== b.qualityPassed) return a.qualityPassed ? -1 : 1
    if (a.outOfScopeFiles.length !== b.outOfScopeFiles.length) {
      return a.outOfScopeFiles.length - b.outOfScopeFiles.length
    }
    if (a.rounds !== b.rounds) return a.rounds - b.rounds
    if (a.diffLines !== b.diffLines) return a.diffLines - b.diffLines
    const aCost = a.costUsd ?? Number.POSITIVE_INFINITY
    const bCost = b.costUsd ?? Number.POSITIVE_INFINITY
    if (aCost !== bCost) return aCost - bCost
    return a.durationMs - b.durationMs
  })
}

/** The outcome of a comparison. Defined here, beside the scores it holds, so that renderers
 * depend on scoring rather than on the harness that produced it. */
export interface EvalResult {
  task: TaskSpec
  scores: Score[]
  /** Entrants that could not run at all, and why. */
  skipped: Array<{ agentId: string; agentName: string; reason: string }>
  startedAt: number
  durationMs: number
}
