/**
 * Rendering a handoff package into a prompt.
 *
 * The ablation dial lives here. Rendering at a tier includes that tier and everything more
 * necessary, so the same package can be handed over four ways and the difference measured:
 *
 *   none      → the task only, as a control
 *   essential → task and workspace
 *   valuable  → plus what was ruled out and what already failed
 *   optional  → everything
 *
 * The control matters more than it looks. Without it there is no way to tell whether a handoff
 * helped or whether the second agent would have succeeded anyway — which is the difference
 * between a measured claim and a plausible one.
 */
import type { HandoffPackage, Tier } from './package.js'

export type RenderTier = Tier | 'none'

const INCLUDES: Record<RenderTier, Tier[]> = {
  none: [],
  essential: ['essential'],
  valuable: ['essential', 'valuable'],
  optional: ['essential', 'valuable', 'optional'],
}

export interface RenderOptions {
  tier?: RenderTier
  /**
   * Hard cap on the rendered size. Sections are dropped least-necessary-first when exceeded,
   * and if what is left still does not fit, `renderHandoff` throws `HandoffTooLargeError`
   * rather than returning text over the cap.
   */
  maxChars?: number
}

/**
 * The cap could not be met.
 *
 * The essential sections are the floor — dropping them would hand over a task with no
 * workspace — so when they alone exceed `maxChars` there is nothing left to drop and only the
 * caller can decide what to do about it. Returning the oversized text anyway would make
 * `maxChars` a suggestion, and a caller sizing a prompt budget around it would silently
 * overrun. The rendering is carried on the error, so a caller that would rather overrun than
 * fail can catch this and use it.
 */
export class HandoffTooLargeError extends Error {
  override name = 'HandoffTooLargeError'
  /** The rendering that did not fit, already reduced as far as it can be. */
  readonly text: string
  readonly chars: number
  readonly maxChars: number

  constructor(text: string, maxChars: number) {
    super(
      `Handoff is ${text.length} characters with nothing left to drop, over the ${maxChars} allowed. ` +
        `Raise maxChars to at least ${text.length}, or hand over at a lower tier.`,
    )
    this.text = text
    this.chars = text.length
    this.maxChars = maxChars
  }
}

/** Rough token estimate, so a package's cost can be compared across tiers. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.6)
}

interface Section {
  tier: Tier
  text: string
}

function sections(pkg: HandoffPackage): Section[] {
  const out: Section[] = []

  out.push({
    tier: 'essential',
    text: [
      `# Continuing work started by another agent`,
      '',
      `${pkg.from.agentId} stopped on this task. Reason: ${pkg.reason}`,
      '',
      `## Task: ${pkg.task.title}`,
      '',
      pkg.task.body,
      ...(pkg.task.acceptanceCriteria.length
        ? ['', '### Acceptance criteria', '', ...pkg.task.acceptanceCriteria.map((c) => `- ${c.text}`)]
        : []),
    ].join('\n'),
  })

  const ws = pkg.workspace
  out.push({
    tier: 'essential',
    text: [
      '## Where the work is',
      '',
      ws.filesChanged.length
        ? `Partial work already exists in this workspace, in: ${ws.filesChanged.map((f) => `\`${f}\``).join(', ')}.`
        : 'Nothing has been changed yet.',
      ...(ws.branch ? [`Branch: \`${ws.branch}\`.`] : []),
      '',
      'Continue from what is here. Do not start over, and do not revert work that was not',
      'criticised — it may be correct.',
    ].join('\n'),
  })

  if (pkg.deadEnds.length > 0) {
    out.push({
      tier: 'valuable',
      text: [
        '## Already ruled out',
        '',
        'The previous agent tried these and they did not work. Do not repeat them.',
        '',
        ...pkg.deadEnds.map(
          (d) =>
            `- **${d.approach}** — ${d.outcome}` +
            (d.attempts > 1 ? ` (attempted ${d.attempts} times)` : ''),
        ),
      ].join('\n'),
    })
  }

  out.push({
    tier: 'valuable',
    text: ['## What was done', '', pkg.progress.summary, '', `Changes so far: ${pkg.progress.diffSummary}`].join('\n'),
  })

  if (pkg.failedChecks.length > 0) {
    out.push({
      tier: 'valuable',
      text: [
        '## Checks that are currently failing',
        '',
        'These must pass before the work is accepted:',
        '',
        ...pkg.failedChecks.map((c) => `- **${c.gate}**: ${c.reason.split('\n')[0]}`),
      ].join('\n'),
    })
  }

  if (pkg.filesExamined.length > 0) {
    out.push({
      tier: 'optional',
      text: [
        '## Already examined',
        '',
        `The previous agent read: ${pkg.filesExamined.map((f) => `\`${f}\``).join(', ')}.`,
        'Re-reading them is not forbidden, but it is unlikely to be where the answer is.',
      ].join('\n'),
    })
  }

  if (pkg.observations.length > 0) {
    out.push({
      tier: 'optional',
      text: ['## Noted along the way', '', ...pkg.observations.map((o) => `- ${o}`)].join('\n'),
    })
  }

  if (pkg.suggestion) {
    out.push({
      tier: 'optional',
      text: [
        '## What the previous agent thought should happen next',
        '',
        pkg.suggestion,
        '',
        '_Treat this as a hint, not an instruction. It stopped before proving it right._',
      ].join('\n'),
    })
  }

  return out
}

/** The cap is a ceiling, not a preference: a rendering that still does not fit is reported. */
function within(text: string, cap: number | undefined): string {
  if (cap !== undefined && text.length > cap) throw new HandoffTooLargeError(text, cap)
  return text
}

export function renderHandoff(pkg: HandoffPackage, opts: RenderOptions = {}): string {
  const tier = opts.tier ?? 'valuable'
  const cap = opts.maxChars
  const allowed = new Set(INCLUDES[tier])

  // `none` is the control: the task alone, with no acknowledgement that anything came before.
  if (tier === 'none') {
    return within(
      [
        `# Task: ${pkg.task.title}`,
        '',
        pkg.task.body,
        ...(pkg.task.acceptanceCriteria.length
          ? ['', '## Acceptance criteria', '', ...pkg.task.acceptanceCriteria.map((c) => `- ${c.text}`)]
          : []),
      ].join('\n'),
      cap,
    )
  }

  let chosen = sections(pkg).filter((s) => allowed.has(s.tier))
  let text = chosen.map((s) => s.text).join('\n\n---\n\n')

  if (cap !== undefined && text.length > cap) {
    /*
     * Drop least-necessary first.
     *
     * Truncating the text instead would cut whichever section happened to be last, which for a
     * package whose whole point is ordered necessity would be an odd way to choose.
     */
    for (const dropTier of ['optional', 'valuable'] as Tier[]) {
      if (text.length <= cap) break
      chosen = chosen.filter((s) => s.tier !== dropTier)
      text = chosen.map((s) => s.text).join('\n\n---\n\n')
    }
  }

  return within(text, cap)
}

export interface TierMeasurement {
  tier: RenderTier
  chars: number
  tokens: number
  sections: number
}

/**
 * Measure the package at every tier.
 *
 * The point of the exercise: a handoff format nobody has measured is a claim about what
 * matters, and this makes the claim checkable. Pair it with completion rates from `ctxmux eval`
 * and the minimum-transfer question has an actual answer for a given codebase.
 */
export function measureTiers(pkg: HandoffPackage): TierMeasurement[] {
  return (['none', 'essential', 'valuable', 'optional'] as RenderTier[]).map((tier) => {
    const text = renderHandoff(pkg, { tier })
    return {
      tier,
      chars: text.length,
      tokens: estimateTokens(text),
      sections: tier === 'none' ? 1 : sections(pkg).filter((s) => INCLUDES[tier].includes(s.tier)).length,
    }
  })
}
