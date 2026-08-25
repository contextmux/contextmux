/**
 * Watching a run while it happens.
 *
 * The recovery idea depends on noticing trouble *during* an invocation rather than after it,
 * and that constrains what is possible. For an agent whose loop we do not own — a CLI, or a
 * vendor's cloud — we cannot inject a new plan at step 37. What we can do is observe and stop.
 *
 * That turns out to be most of the value. An agent that has been spinning for four minutes
 * costs money and produces nothing; killing it and re-dispatching with "you repeated the same
 * search five times, try a different approach" is a real recovery, and it works without owning
 * anything.
 *
 * Two signals, because they fail in different situations. Workspace sampling works for every
 * agent including ones that report nothing, but it is coarse and cannot tell thinking from
 * being stuck. Trajectory smells need a vendor that streams tool calls, but they can name what
 * went wrong. Where both are available, both run.
 */
import type { Runner } from '@contextmux/core'
import { inspect, worstSeverity, type Smell, type SmellDetector } from './smells.js'
import type { Trajectory } from './trajectory.js'

export interface StallVerdict {
  stalled: boolean
  /** Why, phrased so it can be handed to the agent as feedback. */
  reason: string
  smells: Smell[]
  /** Whether a human is needed rather than another attempt. */
  needsHuman: boolean
}

export interface MonitorOptions {
  runner: Runner
  trajectory: Trajectory
  /** How often to sample the workspace. */
  sampleIntervalMs?: number
  /**
   * Consecutive unchanged samples before calling it a stall.
   *
   * Three by default, and the interval matters more than the count: an agent can legitimately
   * read for a minute before writing anything, so sampling every ten seconds and demanding
   * three would fire on ordinary research. Thirty-second samples give it a minute and a half.
   */
  stallAfterSamples?: number
  detectors?: SmellDetector[]
  /** Called when the monitor decides to intervene. */
  onIntervene?: (verdict: StallVerdict) => void
}

export class ProgressMonitor {
  private timer: ReturnType<typeof setInterval> | null = null
  private readonly controller = new AbortController()
  private verdict: StallVerdict | null = null
  private sampling = false

  constructor(private readonly opts: MonitorOptions) {}

  /** Pass to the runner, so the monitor can stop the agent it is watching. */
  get signal(): AbortSignal {
    return this.controller.signal
  }

  get intervened(): StallVerdict | null {
    return this.verdict
  }

  start(): void {
    const interval = this.opts.sampleIntervalMs ?? 30_000
    this.timer = setInterval(() => void this.sample(), interval)
    // Never hold the process open on the monitor's account.
    this.timer.unref?.()
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  /**
   * Take one sample.
   *
   * Guarded against overlap: on a large repository a sample can take longer than the interval,
   * and letting them pile up would both distort the stagnation count and load the machine the
   * agent is working on.
   */
  async sample(): Promise<StallVerdict | null> {
    if (this.sampling || this.verdict) return this.verdict
    this.sampling = true

    try {
      const [files, diff] = await Promise.all([
        this.opts.runner.changedFiles().catch(() => [] as string[]),
        this.opts.runner.diff().catch(() => ''),
      ])
      this.opts.trajectory.observe(files, diff)

      const smells = inspect(this.opts.trajectory, this.opts.detectors)
      const severity = worstSeverity(smells)
      const stagnant = this.opts.trajectory.stagnantSamples
      const stallAfter = this.opts.stallAfterSamples ?? 3

      // A blocking smell stops the run regardless of progress: an irreversible act during a
      // failing run is not something to wait out.
      if (severity === 'block') {
        return this.intervene({
          stalled: true,
          reason: smells.filter((s) => s.severity === 'block').map((s) => s.detail).join('; '),
          smells,
          needsHuman: true,
        })
      }

      if (stagnant >= stallAfter) {
        const named = smells.filter((s) => s.severity === 'warn')
        return this.intervene({
          stalled: true,
          reason: named.length
            ? `no progress for ${stagnant} sample(s): ${named.map((s) => s.detail).join('; ')}`
            : `the workspace has not changed for ${stagnant} consecutive sample(s)`,
          smells,
          needsHuman: false,
        })
      }

      return null
    } finally {
      this.sampling = false
    }
  }

  private intervene(verdict: StallVerdict): StallVerdict {
    this.verdict = verdict
    this.opts.trajectory.intervention('stall', verdict.reason, {
      needsHuman: verdict.needsHuman,
      smells: verdict.smells.map((s) => s.name),
    })
    this.opts.onIntervene?.(verdict)
    this.stop()
    this.controller.abort()
    return verdict
  }
}

/**
 * Turn a stall into feedback the agent can act on.
 *
 * The difference between a useful recovery and an expensive one. "The run timed out" tells an
 * agent nothing it can use; "you called the same search five times with identical arguments"
 * tells it exactly what to stop doing. Naming the failure is what makes the retry worth paying
 * for.
 */
export function stallFeedback(verdict: StallVerdict, round: number): {
  round: number
  source: string
  body: string
} {
  const lines = [
    'Your previous attempt was stopped because it stopped making progress.',
    '',
    `What was observed: ${verdict.reason}`,
  ]

  if (verdict.smells.length > 0) {
    lines.push('', 'Specifically:')
    for (const smell of verdict.smells) {
      lines.push(`- ${smell.detail}`, `  ${smell.advice}`)
    }
  }

  lines.push(
    '',
    'Start from a different approach rather than resuming the previous one. If the task cannot',
    'be done as written, say so plainly instead of continuing to try.',
  )

  return { round, source: 'recovery', body: lines.join('\n') }
}
