/**
 * Trajectory smells.
 *
 * The idea worth keeping from "predict whether an action will fail" is that the *path* to an
 * action carries more information than the action does. Deleting a file is not risky; deleting
 * a file the agent never read, after a tool call whose result it misread, is.
 *
 * What is deliberately absent is a probability. A number like "3.2% chance of failure" implies
 * calibration, calibration needs thousands of labelled outcomes, and a fresh install has none —
 * so the figure would be either generic enough to be useless here or invented. Worse, a
 * miscalibrated score teaches people to click through warnings, which costs more than having
 * no warning at all.
 *
 * These are named patterns instead. Each one can be explained in a sentence, argued with, and
 * switched off. That is a lower ceiling than a trained risk model and a far higher floor.
 */
import type { Step } from './steps.js'
import type { Trajectory } from './trajectory.js'
import type { ToolStepData } from './steps.js'

export type Severity = 'note' | 'warn' | 'block'

export interface Smell {
  name: string
  severity: Severity
  /** What was observed, in the order it happened. */
  detail: string
  /** What it suggests doing. Every smell must be actionable or it is noise. */
  advice: string
  /** Steps that produced it, so a reader can check rather than trust. */
  evidence: number[]
}

export interface SmellDetector {
  name: string
  inspect(trajectory: Trajectory): Smell | null
}

const toolData = (step: Step): ToolStepData | undefined =>
  step.kind === 'tool' ? (step.data as unknown as ToolStepData) : undefined

/**
 * The same call, again and again.
 *
 * The most common way an agent gets stuck: a tool returns something unexpected, the agent does
 * not update its model of the world, and retries verbatim. Distinct from a legitimate retry
 * because the arguments are byte-identical.
 */
export function repeatedCall(opts: { threshold?: number } = {}): SmellDetector {
  const threshold = opts.threshold ?? 3
  return {
    name: 'repeated-call',
    inspect(trajectory) {
      const counts = new Map<string, Step[]>()
      for (const step of trajectory.all) {
        const data = toolData(step)
        if (!data) continue
        const list = counts.get(data.signature) ?? []
        list.push(step)
        counts.set(data.signature, list)
      }

      for (const [, steps] of counts) {
        if (steps.length < threshold) continue
        // Only interesting if it is still happening; an early retry that later succeeded is
        // just an agent recovering, which is what we want it to do.
        const recent = trajectory.recent(12)
        if (!recent.includes(steps[steps.length - 1]!)) continue

        return {
          name: 'repeated-call',
          severity: 'warn',
          detail: `\`${steps[0]!.name}\` called ${steps.length} times with identical arguments (${steps[0]!.summary})`,
          advice:
            'The agent is not learning from the result. Change the approach rather than the ' +
            'arguments — a different tool, or gathering more context first.',
          evidence: steps.map((s) => s.seq),
        }
      }
      return null
    },
  }
}

/**
 * Committing without looking.
 *
 * A write to a file the agent never read is a guess about that file's contents. Sometimes a
 * correct guess — creating a new file is exactly this — so the detector only fires when the
 * file already existed, which is the case where being wrong destroys work.
 */
export function writeBeforeRead(): SmellDetector {
  return {
    name: 'write-before-read',
    inspect(trajectory) {
      /*
       * When each file was first read, not merely whether it ever was.
       *
       * `readFiles()` documents itself as being "in order, for checking whether it looked
       * before it leapt", and this collapsed it into a Set — so a file the agent overwrote
       * blindly at step 3 and read at step 9 counted as read, and the smell never fired. The
       * risk being described is fixed at the moment of the write; a later read does not undo
       * it.
       */
      const firstRead = new Map<string, number>()
      for (const step of trajectory.all) {
        const data = toolData(step)
        if (!data || data.mutating) continue
        for (const file of step.files ?? []) {
          if (!firstRead.has(file)) firstRead.set(file, step.seq)
        }
      }

      // Keyed by step, because one step touching three unread files is one offence with three
      // files — pushing the step once per file reported the step count as a file count and
      // produced evidence like [7, 7, 7].
      const offenders = new Map<number, Step>()
      const blind: string[] = []

      for (const step of trajectory.all) {
        const data = toolData(step)
        // `existed` is set by the recorder when it can tell; absent means unknown, and
        // guessing "it existed" would fire on every newly created file.
        if (!data?.mutating || data.existed !== true) continue
        for (const file of step.files ?? []) {
          const readAt = firstRead.get(file)
          if (readAt !== undefined && readAt < step.seq) continue
          offenders.set(step.seq, step)
          blind.push(file)
        }
      }

      if (blind.length === 0) return null
      return {
        name: 'write-before-read',
        severity: 'warn',
        detail: `${blind.length} existing file(s) modified without being read first: ${blind
          .slice(0, 3)
          .join(', ')}`,
        advice:
          'Modifying a file whose contents the agent has not seen is a guess. Read it before ' +
          'changing it, or the change may silently drop work that was already there.',
        evidence: [...offenders.keys()].sort((a, b) => a - b),
      }
    },
  }
}

/**
 * Acting on an error it did not resolve.
 *
 * A failed tool call followed immediately by a mutating one, with no intervening read, means
 * the agent decided what the failure meant without checking. This is the trajectory shape
 * behind most confidently-wrong changes.
 */
export function actedOnUnresolvedError(): SmellDetector {
  return {
    name: 'acted-on-unresolved-error',
    inspect(trajectory) {
      const steps = trajectory.all
      for (let i = 0; i < steps.length - 1; i++) {
        const data = toolData(steps[i]!)
        if (!data || data.ok !== false) continue

        // Look ahead a little: an agent that reads something before acting has done the right
        // thing, however briefly.
        for (let j = i + 1; j < Math.min(i + 4, steps.length); j++) {
          const next = toolData(steps[j]!)
          if (!next) continue
          if (!next.mutating) break // it investigated first
          return {
            name: 'acted-on-unresolved-error',
            severity: 'warn',
            detail:
              `\`${steps[i]!.name}\` failed (${data.error ?? 'no detail'}), then ` +
              `\`${steps[j]!.name}\` changed something without investigating`,
            advice:
              'The agent interpreted a failure without verifying its interpretation. Have it ' +
              'establish why the call failed before acting on what it assumes the failure meant.',
            evidence: [steps[i]!.seq, steps[j]!.seq],
          }
        }
      }
      return null
    },
  }
}

/**
 * An irreversible act inside a run that is going badly.
 *
 * Severity `block` rather than `warn`: the point of noticing is to stop it. An agent that has
 * been thrashing and then reaches for a migration or a force-push has earned a human.
 */
export function irreversibleWhileStruggling(): SmellDetector {
  /*
   * Spelled out with their inflections, because `\b` and a prefix do not combine.
   *
   * This list was written as prefixes — `migrat`, `charge` — but a trailing `\b` demands a
   * non-word character next, and no English word ends at `migrat`. The pattern therefore
   * matched none of the words it names in the form anyone writes them: not "migration", not
   * "deploying", not "dropping the users table". The one detector whose job is to stop
   * unrecoverable work fired only on the bare imperative.
   *
   * The endings are enumerated rather than `\w*` so that `dropdown`, `eavesdropping`,
   * `deployable` and `sendmail` stay out. This severity stops a run and asks for a human, so a
   * false positive is expensive.
   */
  const IRREVERSIBLE =
    /\b(?:migrat(?:e|es|ed|ing|ion|ions)|drop(?:s|ped|ping)?|truncat(?:e|es|ed|ing|ion)|force.?push(?:es|ed|ing)?|rm\s+-rf|publish(?:es|ed|ing)?|deploy(?:s|ed|ing|ment|ments)?|charg(?:e|es|ed|ing)|send(?:s|ing)?|sent)\b/i
  return {
    name: 'irreversible-while-struggling',
    inspect(trajectory) {
      const struggling =
        trajectory.stagnantSamples >= 2 ||
        trajectory.of('tool').filter((s) => toolData(s)?.ok === false).length >= 3

      if (!struggling) return null

      const risky = trajectory
        .of('tool')
        .filter((s) => IRREVERSIBLE.test(`${s.name} ${s.summary}`))

      if (risky.length === 0) return null
      return {
        name: 'irreversible-while-struggling',
        severity: 'block',
        detail: `an irreversible operation (${risky.at(-1)!.summary}) during a run that was already failing`,
        advice:
          'Nothing here can be undone by restoring files. Stop and have a human confirm before ' +
          'this proceeds.',
        evidence: risky.map((s) => s.seq),
      }
    },
  }
}

/**
 * Talking rather than working.
 *
 * An agent producing message after message without touching a tool has usually lost the thread
 * — it is reasoning in circles about a decision it will not make.
 */
export function allTalkNoAction(opts: { threshold?: number } = {}): SmellDetector {
  const threshold = opts.threshold ?? 5
  return {
    name: 'all-talk-no-action',
    inspect(trajectory) {
      const recent = trajectory.recent(threshold * 2).filter((s) => s.kind === 'message' || s.kind === 'tool')
      if (recent.length < threshold) return null

      const tail = recent.slice(-threshold)
      if (tail.some((s) => s.kind === 'tool')) return null

      return {
        name: 'all-talk-no-action',
        severity: 'warn',
        detail: `${threshold} consecutive messages with no tool call`,
        advice:
          'The agent is deliberating rather than acting. Narrow the task, or state the decision ' +
          'it is stuck on so it does not have to make it.',
        evidence: tail.map((s) => s.seq),
      }
    },
  }
}

export const DEFAULT_DETECTORS: SmellDetector[] = [
  repeatedCall(),
  writeBeforeRead(),
  actedOnUnresolvedError(),
  irreversibleWhileStruggling(),
  allTalkNoAction(),
]

export function inspect(trajectory: Trajectory, detectors = DEFAULT_DETECTORS): Smell[] {
  const found: Smell[] = []
  for (const detector of detectors) {
    const smell = detector.inspect(trajectory)
    if (smell) found.push(smell)
  }
  // Most serious first: a reader should not have to scan past three notes to find the blocker.
  const order: Record<Severity, number> = { block: 0, warn: 1, note: 2 }
  return found.sort((a, b) => order[a.severity] - order[b.severity])
}

export function worstSeverity(smells: Smell[]): Severity | null {
  if (smells.some((s) => s.severity === 'block')) return 'block'
  if (smells.some((s) => s.severity === 'warn')) return 'warn'
  return smells.length > 0 ? 'note' : null
}
