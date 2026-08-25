/**
 * Learning: what agents got wrong, turned into proposed edits to your context.
 *
 * The pipeline is deliberately four separable steps — observe, cluster, propose, decide — so
 * that a bad proposal can be traced to the observation that produced it, and so that no step
 * quietly does the job of another.
 */
export * from './signals.js'
export * from './cluster.js'
export * from './propose.js'
export * from './ledger.js'
export * from './compile.js'
export * from './success.js'

import type { ContextModel } from '@contextmux/context'
import { clusterSignals, type ClusterOptions } from './cluster.js'
import { findApproaches, proposeApproaches, type CompileOptions, type Exemplar } from './compile.js'
import { Ledger } from './ledger.js'
import { propose, type Proposal } from './propose.js'
import type { Signal } from './signals.js'

export interface LearnOptions {
  ledger: Ledger
  context: ContextModel
  sourceDir?: string
  cluster?: ClusterOptions
  read?: (path: string) => Promise<string | null>
  /** Include lessons a human has already decided on. Off by default. */
  includeDecided?: boolean
  /**
   * Runs that succeeded first time, for compiling approaches.
   *
   * Passed in rather than read here, because deciding which runs were exemplary needs their
   * trajectories and this package should not know where those are stored.
   */
  exemplars?: Exemplar[]
  approach?: CompileOptions
}

export interface LearnResult {
  /** Rules derived from what went wrong. */
  proposals: Proposal[]
  /** Skills derived from approaches that kept working. */
  approaches: Proposal[]
  /** Recurring lessons withheld because a human already decided about them. */
  suppressed: Array<{ id: string; lesson: string; status: string }>
  signalsConsidered: number
  exemplarsConsidered: number
}

export async function learn(opts: LearnOptions): Promise<LearnResult> {
  const signals: Signal[] = opts.ledger.signals
  const clusters = clusterSignals(signals, opts.cluster ?? {})

  const eligible = opts.includeDecided
    ? clusters
    : clusters.filter((c) => opts.ledger.shouldPropose(c.id))

  const suppressed = opts.includeDecided
    ? []
    : clusters
        .filter((c) => !opts.ledger.shouldPropose(c.id))
        .map((c) => ({
          id: c.id,
          lesson: c.representative,
          status: opts.ledger.status(c.id) ?? 'unknown',
        }))

  const proposals = await propose(eligible, {
    context: opts.context,
    ...(opts.sourceDir ? { sourceDir: opts.sourceDir } : {}),
    ...(opts.read ? { read: opts.read } : {}),
  })

  /*
   * Approaches go through the same ledger as everything else.
   *
   * A separate store would let a human reject a proposed skill and have it come back next
   * week, which is the failure that makes a tool stop being read.
   */
  const exemplars = opts.exemplars ?? []
  const patterns = findApproaches(exemplars, opts.approach ?? {}).filter(
    (p) => opts.includeDecided || opts.ledger.shouldPropose(p.id),
  )
  const approaches = proposeApproaches(patterns, opts.context, {
    ...(opts.sourceDir ? { sourceDir: opts.sourceDir } : {}),
  })

  return {
    proposals,
    approaches,
    suppressed,
    signalsConsidered: signals.length,
    exemplarsConsidered: exemplars.length,
  }
}
