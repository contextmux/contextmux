/**
 * Run one task through several agents and compare them.
 *
 * This is the honest test of the whole design. An abstraction that leaks cannot run one
 * `TaskSpec` through four different vendors and get comparable artefacts out — the moment a
 * comparison needs per-vendor special-casing, the interface was never real.
 *
 * Fairness is the thing to protect. Every agent gets the identical task, the identical gates,
 * the identical starting commit and its own isolated worktree, and each is scored on the
 * artefact it produced rather than on what it said about it.
 */
export * from './score.js'
export * from './report.js'

import {
  DEFAULT_POLICY,
  Engine,
  MemoryStore,
  type CodingAgent,
  type EngineEvent,
  type Feedback,
  type Gate,
  type RunPolicy,
  type TaskSpec,
} from '@contextmux/core'
import { LocalRunner } from '@contextmux/runner-local'
import { rank, scoreAttempt, type Attempt, type EvalResult } from './score.js'

export interface EvalEntrant {
  agent: CodingAgent
  /** Label for the report. Defaults to the agent's display name. */
  label?: string
}

export interface EvalOptions {
  root: string
  task: TaskSpec
  entrants: EvalEntrant[]
  gates: Gate[]
  renderPrompt: (task: TaskSpec, feedback?: Feedback) => Promise<string> | string
  policy?: RunPolicy
  /**
   * Run entrants at the same time.
   *
   * Off by default. Concurrent runs contend for CPU and network, which distorts the wall-clock
   * figure — and wall-clock is one of the things being compared.
   */
  concurrent?: boolean
  /** Skip an entrant whose preflight fails, rather than scoring it as a loss. */
  skipUnavailable?: boolean
  onEvent?: (agentId: string, event: EngineEvent) => void
  dryRun?: boolean
}

async function runEntrant(
  entrant: EvalEntrant,
  opts: EvalOptions,
): Promise<Attempt> {
  const agent = entrant.agent
  const label = entrant.label ?? agent.displayName
  const started = Date.now()

  /*
   * A worktree per entrant, branched from the same commit.
   *
   * Sharing one would let the first agent's changes become the second's starting point, which
   * makes the comparison meaningless in a way that is not obvious from the results.
   */
  const { runner } = await LocalRunner.create({
    root: opts.root,
    isolate: agent.capabilities.sandbox === 'caller',
    branch: `ctxmux/eval-${opts.task.id.toLowerCase()}-${agent.id}`,
  })

  const store = new MemoryStore()
  const engine = new Engine({
    agent,
    runner,
    store,
    gates: opts.gates,
    renderPrompt: opts.renderPrompt,
    policy: opts.policy ?? DEFAULT_POLICY,
    ...(opts.dryRun ? { dryRun: true } : {}),
  })

  if (opts.onEvent) engine.on((event) => opts.onEvent!(agent.id, event))

  // A distinct id per entrant, or the shared store would treat the second run as a resume of
  // the first and skip it entirely.
  const task: TaskSpec = { ...opts.task, id: `${opts.task.id}-${agent.id}` }

  try {
    const run = await engine.run(task)

    /*
     * Measure the workspace rather than trusting the result.
     *
     * An adapter that does not populate `diff` would otherwise score zero diff lines and rank
     * *better* for it — a comparison that silently rewards under-reporting is worse than no
     * comparison. The same reasoning already governs `filesChanged` inside the agents; it
     * applies with more force here, where the numbers are the whole output.
     */
    const measuredDiff = await runner.diff().catch(() => '')
    const measuredFiles = await runner.changedFiles().catch(() => [] as string[])

    const result = run.result
      ? {
          ...run.result,
          diff: measuredDiff || run.result.diff || '',
          filesChanged: measuredFiles.length > 0 ? measuredFiles : run.result.filesChanged,
        }
      : null

    /*
     * Give back the worktrees nobody needs.
     *
     * A comparison of four agents creates four checkouts and four branches, and an entrant that
     * produced nothing leaves an empty one behind for good. `dispose` keeps anything an agent
     * actually wrote — which is the artefact the whole comparison exists to let a human read —
     * and reclaims only the rest.
     */
    await runner.dispose().catch(() => {})
    const worktree = runner.location().worktree

    return {
      agentId: agent.id,
      agentName: label,
      result,
      gateOutcomes: run.gateOutcomes,
      rounds: run.feedbackRound,
      durationMs: Date.now() - started,
      state: run.state,
      ...(run.terminalReason ? { error: run.terminalReason } : {}),
      ...(worktree && worktree !== opts.root ? { worktree } : {}),
    }
  } catch (err) {
    // One entrant blowing up must not lose the whole comparison — nor leave its checkout behind.
    await runner.dispose().catch(() => {})
    return {
      agentId: agent.id,
      agentName: label,
      result: null,
      gateOutcomes: [],
      rounds: 0,
      durationMs: Date.now() - started,
      state: 'failed',
      error: (err as Error).message,
    }
  }
}

export async function runEval(opts: EvalOptions): Promise<EvalResult> {
  const startedAt = Date.now()
  const skipped: EvalResult['skipped'] = []
  const eligible: EvalEntrant[] = []

  // Check availability up front. Discovering halfway through that an agent was never installed
  // wastes the runs already done and produces a comparison with a hole in it.
  for (const entrant of opts.entrants) {
    const health = await entrant.agent.preflight()
    if (health.ok || !opts.skipUnavailable) {
      eligible.push(entrant)
      continue
    }
    skipped.push({
      agentId: entrant.agent.id,
      agentName: entrant.label ?? entrant.agent.displayName,
      reason: health.detail,
    })
  }

  const attempts = opts.concurrent
    ? await Promise.all(eligible.map((e) => runEntrant(e, opts)))
    : await eligible.reduce<Promise<Attempt[]>>(
        async (acc, entrant) => [...(await acc), await runEntrant(entrant, opts)],
        Promise.resolve([]),
      )

  return {
    task: opts.task,
    scores: rank(attempts.map((a) => scoreAttempt(opts.task, a))),
    skipped,
    startedAt,
    durationMs: Date.now() - startedAt,
  }
}
