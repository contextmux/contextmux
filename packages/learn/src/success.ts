/**
 * Compiling what worked into a reusable skill.
 *
 * The mirror of the rest of this package: failures become rules, successes become skills. Two
 * problems make the idea harder than it sounds, and both have to be answered honestly or the
 * output is confident noise.
 *
 * ## Knowing that it worked
 *
 * "This approach succeeded eighty-seven times" presumes a success signal. In coding, the real
 * one — merged, and not reverted three weeks later — arrives far too late to be useful and
 * often never arrives at all.
 *
 * But a weaker, local signal is available immediately and is arguably better: the run reached
 * review with every gate passing, no smell in its trajectory, and *no correction rounds*. That
 * last part carries most of the weight. An agent that got there after three rounds of feedback
 * demonstrates that the feedback worked, not that its approach did.
 *
 * ## Knowing what "it" was
 *
 * The tempting next step is to compile a successful trajectory into a script — the same five
 * operations, replayed deterministically. That is wrong, and wrong in an instructive way: if
 * the sequence really were deterministic, nobody would have needed an agent. Agents earn their
 * cost precisely where the steps vary with the situation.
 *
 * So what is extracted is the *shape* — explore, then change, then verify — not the calls. The
 * output is guidance about approach, which is the thing that actually generalises, and it is
 * proposed to a human like every other lesson here rather than applied.
 */
import type { GateOutcome, Run } from '@contextmux/core'
import { inspect, type Trajectory } from '@contextmux/trajectory'
import type { Step } from '@contextmux/trajectory'

/** Why a run did or did not count as an example worth learning from. */
export interface Exemplary {
  ok: boolean
  reasons: string[]
}

/**
 * Whether a run is worth learning an approach from.
 *
 * Deliberately strict. A permissive bar produces skills describing mediocre work, and a skill
 * that entrenches mediocrity is worse than no skill — it is advice, at the top of the context,
 * on every future task.
 */
export function isExemplary(run: {
  state: string
  feedbackRound: number
  attempt: number
  gateOutcomes: GateOutcome[]
}, trajectory: Trajectory): Exemplary {
  const reasons: string[] = []

  if (run.state !== 'completed' && run.state !== 'in_review') {
    reasons.push(`ended in "${run.state}"`)
  }

  /*
   * The strongest available signal, and the one doing most of the work.
   *
   * Reaching review after three corrections shows the corrections worked. It says nothing
   * about the approach the agent chose, which is the thing being extracted.
   */
  if (run.feedbackRound > 0) {
    reasons.push(`needed ${run.feedbackRound} correction round(s)`)
  }
  if (run.attempt > 0) {
    reasons.push(`took ${run.attempt + 1} attempt(s)`)
  }

  const failedGates = run.gateOutcomes.filter((o) => o.verdict !== 'pass')
  if (failedGates.length > 0) {
    reasons.push(`${failedGates.map((g) => g.gate).join(', ')} did not pass`)
  }

  // A run can pass every gate and still have got there badly.
  const smells = inspect(trajectory)
  if (smells.length > 0) {
    reasons.push(`trajectory shows ${smells.map((s) => s.name).join(', ')}`)
  }

  // Nothing to learn from a run that did no work.
  if (trajectory.of('tool').length < 2) {
    reasons.push('too few steps to describe an approach')
  }

  return { ok: reasons.length === 0, reasons }
}

/**
 * The kinds of move an agent makes.
 *
 * Coarser than tool names on purpose. `Read`, `Grep` and `Glob` are the same move — finding
 * out what is there — and a shape expressed in vendor tool names would neither recur across
 * agents nor mean anything to a reader.
 */
export type Move = 'explore' | 'change' | 'verify' | 'run'

/*
 * Only a command can verify.
 *
 * Two mistakes are easy here and both were made first. Matching "test" anywhere classifies
 * *reading* `a.test.ts` as verification, when reading a test is how an agent works out what is
 * expected of it — exploration, not checking. And treating any mutating tool as a change
 * classifies `git status` as one, because a shell can mutate even when this invocation does
 * not.
 *
 * So: what kind of tool it is decides first, and what the command says decides second.
 */
const COMMAND_TOOL = /\b(bash|shell|exec|run|command|terminal)\b/i

/** Commands that run the project's own checks. */
const VERIFY_COMMAND = /\b(test|spec|lint|typecheck|tsc|vitest|jest|pytest|check|ci)\b/i

/**
 * Commands that only look.
 *
 * `build` is deliberately absent from the verify list and irrelevant here: building is not
 * checking, and including it would classify `mkdir -p build` as verification.
 */
const READ_COMMAND = /\b(ls|cat|find|grep|rg|head|tail|status|log|diff|show|which|pwd|tree|stat)\b/i

export function moveOf(step: Step): Move | null {
  if (step.kind !== 'tool') return null

  if (COMMAND_TOOL.test(step.name)) {
    /*
     * What the command *is* outranks what it mentions.
     *
     * A shell step's summary is the command line, so testing the whole of it for a verify word
     * put `grep -n "test" src/a.ts` and `cat src/foo.test.ts` under 'verify' — the very mistake
     * the note above describes, arriving by a different route. Reading a test is how an agent
     * works out what is expected of it, and counting that as checking inverts the shape a
     * successful approach appears to have.
     *
     * The leading token is the program, so a read tool is settled before anything in its
     * arguments gets a say. `pnpm test` still verifies: `pnpm` is not a read command.
     */
    const leading = step.summary.trim().split(/[\s;|&]+/)[0] ?? ''
    if (READ_COMMAND.test(leading)) return 'explore'
    if (VERIFY_COMMAND.test(step.summary)) return 'verify'
    if (READ_COMMAND.test(step.summary)) return 'explore'
    return 'run'
  }

  const data = step.data as { mutating?: boolean } | undefined
  return data?.mutating ? 'change' : 'explore'
}

/**
 * The sequence of moves a trajectory made, with runs collapsed.
 *
 * Three reads in a row and seven reads in a row are the same approach — look before you leap —
 * and keeping the counts would split one pattern into a dozen that each occur once.
 */
export function shapeOf(trajectory: Trajectory): Move[] {
  const moves: Move[] = []
  for (const step of trajectory.all) {
    const move = moveOf(step)
    if (!move) continue
    if (moves.at(-1) !== move) moves.push(move)
  }
  return moves
}

export function shapeKey(shape: Move[]): string {
  return shape.join('>')
}

/** How an approach reads to a human. */
export function describeShape(shape: Move[]): string[] {
  const phrasing: Record<Move, string> = {
    explore: 'Read the code you are about to change, and whatever tests it',
    change: 'Make the change',
    verify: "Run the project's own checks and fix what they report",
    run: 'Run the command the task needs',
  }
  return shape.map((m) => phrasing[m])
}
