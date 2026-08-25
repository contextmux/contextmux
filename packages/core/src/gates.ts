/**
 * Gates.
 *
 * The governance layer, and the part teams reinvent badly. Two phases, because the interesting
 * checks live at opposite ends of a run:
 *
 *  - **Preflight** decides whether a task is worth attempting at all. Cheap, no agent spent.
 *  - **Verify** checks what the agent actually produced. This is where scope discipline stops
 *    being an instruction the agent may ignore and becomes a property that is enforced.
 *
 * A failing verify gate does not necessarily mean a human is needed. Most produce feedback
 * precise enough for the agent to correct itself, which is why the machine routes a verify
 * failure into a revision round rather than straight to escalation.
 */
import type { GateOutcome } from './machine.js'
import type { AgentResult, TaskSpec } from './task.js'
import type { Runner } from './adapters.js'
import { matchGlob } from './glob.js'

export interface PreflightContext {
  task: TaskSpec
  /** Runs already in flight, for cap enforcement. */
  inFlight: number
}

export interface VerifyContext {
  task: TaskSpec
  result: AgentResult
  runner: Runner
}

export interface Gate {
  name: string
  preflight?(ctx: PreflightContext): Promise<GateOutcome> | GateOutcome
  verify?(ctx: VerifyContext): Promise<GateOutcome> | GateOutcome
}

const pass = (gate: string): GateOutcome => ({ gate, verdict: 'pass' })
const reject = (gate: string, reason: string, hint?: string): GateOutcome => ({
  gate,
  verdict: 'reject',
  reason,
  ...(hint ? { hint } : {}),
})

// ---------------------------------------------------------------------------
// Preflight gates
// ---------------------------------------------------------------------------

/**
 * Opt-in.
 *
 * Automation that picks up everything by default is automation nobody trusts. A label is the
 * cheapest consent mechanism available and the easiest to revoke.
 */
export function optIn(opts: { label: string }): Gate {
  return {
    name: 'opt-in',
    preflight({ task }) {
      return task.labels.includes(opts.label)
        ? pass('opt-in')
        : reject(
            'opt-in',
            `task is not labelled "${opts.label}"`,
            `Add the "${opts.label}" label to hand this task to an agent.`,
          )
    },
  }
}

/**
 * Readiness.
 *
 * A vague task does not produce a vague change. It produces a confident change that solves the
 * wrong problem and costs more to review than it would have cost to write. Rejecting early is
 * cheaper for everyone.
 *
 * The heuristic is crude on purpose, and transparent on purpose: it states exactly why it
 * refused, so the fix is obvious. A model-based grader replaces it later.
 */
export function readiness(opts: { minBodyChars?: number; requireAcceptanceCriteria?: boolean } = {}): Gate {
  const minChars = opts.minBodyChars ?? 80
  const requireAC = opts.requireAcceptanceCriteria ?? true

  return {
    name: 'readiness',
    preflight({ task }) {
      const body = task.body.trim()
      const hasAC = task.acceptanceCriteria.length > 0

      // Explicit criteria are worth far more than length, so a short task that has them passes.
      if (hasAC && body.length >= 40) return pass('readiness')

      if (body.length < minChars && !hasAC) {
        return reject(
          'readiness',
          `description is ${body.length} characters and there are no acceptance criteria`,
          'Describe the expected behaviour, or add an "Acceptance criteria" section listing what must be true when this is done.',
        )
      }

      if (requireAC && !hasAC) {
        return reject(
          'readiness',
          'no acceptance criteria found',
          'Add an "Acceptance criteria" section. Without one there is nothing to verify the change against.',
        )
      }

      return pass('readiness')
    },
  }
}

/**
 * In-flight cap.
 *
 * Blast-radius control. Whatever else goes wrong, at most N runs are wrong at once.
 */
export function inFlightCap(opts: { max: number }): Gate {
  return {
    name: 'in-flight-cap',
    preflight({ inFlight }) {
      return inFlight < opts.max
        ? pass('in-flight-cap')
        : reject(
            'in-flight-cap',
            `${inFlight} run(s) already in flight, limit is ${opts.max}`,
            'This task will be picked up once an in-flight run finishes.',
          )
    },
  }
}

/**
 * Complexity.
 *
 * Scores what correlates with an agent producing a large, hard-to-review change. The point is
 * not to predict difficulty accurately — it is to catch tasks that should have been split,
 * before one becomes a forty-file diff nobody wants to read.
 */
export function complexity(opts: { maxScore?: number } = {}): Gate {
  /*
   * Threshold of 3, so any *two* strong signals together trigger a split.
   *
   * The scale runs 0-6 and the strong signals are worth 2 each. At 4 a large refactor with a
   * high estimate scored exactly at the limit and passed — which is the single clearest case
   * for splitting a task, so the boundary was in the wrong place.
   */
  const maxScore = opts.maxScore ?? 3
  return {
    name: 'complexity',
    preflight({ task }) {
      let score = 0
      const reasons: string[] = []
      const text = `${task.title} ${task.body}`.toLowerCase()

      if (task.estimate && task.estimate >= 5) {
        score += 2
        reasons.push(`estimate of ${task.estimate}`)
      }
      for (const word of ['refactor', 'migrat', 'rewrite', 'redesign', 'overhaul']) {
        if (text.includes(word)) {
          score += 2
          reasons.push(`mentions "${word}"`)
          break
        }
      }
      if (task.acceptanceCriteria.length > 6) {
        score += 1
        reasons.push(`${task.acceptanceCriteria.length} acceptance criteria`)
      }
      if (task.body.length > 4000) {
        score += 1
        reasons.push('very long description')
      }

      return score > maxScore
        ? reject(
            'complexity',
            `complexity score ${score} exceeds ${maxScore} (${reasons.join(', ')})`,
            'Split this into smaller tasks. Large agent changes are harder to review than to write.',
          )
        : pass('complexity')
    },
  }
}

// ---------------------------------------------------------------------------
// Verify gates
// ---------------------------------------------------------------------------

/**
 * Path scope.
 *
 * The most valuable verify gate. "Only change what the task requires" is an instruction an
 * agent can silently ignore; this makes it checkable. Config files are denied by default,
 * because an unrequested edit to a build config or a manifest is how a small task quietly
 * becomes a risky one.
 */
export function pathScope(opts: { defaultDeny?: string[] } = {}): Gate {
  const defaultDeny = opts.defaultDeny ?? []
  return {
    name: 'path-scope',
    verify({ task, result }) {
      const allow = task.scope.allow
      const deny = [...task.scope.deny, ...defaultDeny]
      const violations: string[] = []

      for (const file of result.filesChanged) {
        if (deny.some((p) => matchGlob(p, file))) {
          violations.push(`${file} (explicitly out of scope)`)
          continue
        }
        if (allow.length > 0 && !allow.some((p) => matchGlob(p, file))) {
          violations.push(`${file} (outside the allowed paths)`)
        }
      }

      if (violations.length > 0) {
        return reject(
          'path-scope',
          `${violations.length} file(s) changed outside the task's scope:\n  ${violations.join('\n  ')}`,
          `Revert those files. Allowed: ${allow.length ? allow.join(', ') : 'anything not denied'}. Denied: ${deny.join(', ') || 'none'}.`,
        )
      }

      const maxFiles = task.scope.maxFiles
      if (maxFiles !== undefined && result.filesChanged.length > maxFiles) {
        return reject(
          'path-scope',
          `${result.filesChanged.length} files changed, limit is ${maxFiles}`,
          'Reduce the change, or split the task.',
        )
      }

      return pass('path-scope')
    },
  }
}

/**
 * Quality gate.
 *
 * Runs the project's own commands — detected from the repository rather than restated by a
 * human — and feeds failures back verbatim. Test output is the highest-signal feedback
 * available and needs no translation.
 */
export function qualityGate(opts: { timeoutMs?: number } = {}): Gate {
  const timeoutMs = opts.timeoutMs ?? 10 * 60_000
  return {
    name: 'quality-gate',
    async verify({ task, runner }) {
      if (task.qualityGate.length === 0) {
        return { gate: 'quality-gate', verdict: 'pass', reason: 'no commands configured' }
      }

      for (const command of task.qualityGate) {
        const parts = command.split(/\s+/).filter(Boolean)
        const bin = parts[0]
        if (!bin) continue
        const res = await runner.exec(bin, parts.slice(1), { timeoutMs })
        if (res.code !== 0) {
          // Tail rather than head: the failure summary sits at the end of most runners' output.
          const output = `${res.stdout}\n${res.stderr}`.trim().split('\n').slice(-40).join('\n')
          return reject(
            'quality-gate',
            `\`${command}\` failed${res.timedOut ? ' (timed out)' : ` with exit code ${res.code}`}`,
            `Output:\n\`\`\`\n${output}\n\`\`\``,
          )
        }
      }
      return pass('quality-gate')
    },
  }
}

/**
 * Change presence.
 *
 * An agent reporting success while changing nothing has usually misread the task. Treating
 * that as a pass produces a "completed" run containing no work, which is worse than a failure
 * because it looks fine on a dashboard.
 */
export function producedChanges(): Gate {
  return {
    name: 'produced-changes',
    verify({ result }) {
      return result.filesChanged.length > 0
        ? pass('produced-changes')
        : reject(
            'produced-changes',
            'the agent reported success but changed no files',
            'Either the task was already satisfied, or it was misunderstood. A human should look.',
          )
    },
  }
}

/**
 * Test integrity.
 *
 * Guards the one cheat that is invisible in a green build: making a suite pass by weakening it.
 *
 * This escalates rather than requesting a correction. An agent asked to "fix" a flagged test
 * change may simply disguise it better, and the judgement of whether weakening a test was
 * legitimate is exactly the kind that belongs to a human.
 */
export function testIntegrity(opts: { testGlobs?: string[] } = {}): Gate {
  const testGlobs = opts.testGlobs ?? [
    '**/*.test.*', '**/*.spec.*', '**/test/**', '**/tests/**', '**/__tests__/**',
  ]
  return {
    name: 'test-integrity',
    async verify({ result, runner }) {
      const touchedTests = result.filesChanged.filter((f) => testGlobs.some((g) => matchGlob(g, f)))
      if (touchedTests.length === 0) return pass('test-integrity')

      // `||` rather than `??`: an adapter that reports `diff: ''` alongside changed test files
      // is contradicting itself, and inspecting the empty string would pass the gate on a
      // change nobody looked at.
      const diff = result.diff || (await runner.diff())
      const lines = diff.split('\n')
      const suspicious: string[] = []

      /*
       * A line that comes back is a move, not a removal.
       *
       * Extracting a shared fixture shifts every test below it, and a line-based diff renders
       * that as the test being deleted and an identical one appearing. Reporting it escalates
       * an ordinary refactor to a human — which happened on the first real change this gate
       * ever saw. A gate that fires on tidying up is a gate people turn off, and then it is not
       * protecting anything.
       *
       * Compared on content with whitespace collapsed, so re-indenting a test does not read as
       * deleting it either. A genuinely weakened assertion does not reappear unchanged, which
       * is the case this gate exists for.
       */
      const normalise = (body: string) => body.trim().replace(/\s+/g, ' ')
      const added = new Set(
        lines
          .filter((l) => l.startsWith('+') && !l.startsWith('+++'))
          .map((l) => normalise(l.slice(1))),
      )

      for (const line of lines) {
        if (line.startsWith('-') && !line.startsWith('---')) {
          const body = line.slice(1)
          if (added.has(normalise(body))) continue
          if (/\b(expect|assert|should)\b/.test(body)) suspicious.push(`removed assertion: ${body.trim()}`)
          else if (/\b(it|test|describe)\s*\(/.test(body)) suspicious.push(`removed test: ${body.trim()}`)
        } else if (line.startsWith('+') && !line.startsWith('+++')) {
          const body = line.slice(1)
          /*
           * `.only` belongs here as much as `.skip` does — arguably more.
           *
           * Skipping one test removes one test. Adding `describe.only` stops every *other*
           * test running, so a suite goes green while covering almost nothing, and the quality
           * gate this exists to protect reports a pass. It is also the likeliest thing to be
           * left behind by accident, which is its own reason to say so.
           *
           * `xit`/`xdescribe` are the same instruction in jest's older spelling, and
           * `.failing` inverts the assertion outright.
           */
          if (/\b(?:(?:it|test|describe)\.(?:skip|only|todo|failing)\b|x(?:it|test|describe)\s*\()/.test(body)) {
            suspicious.push(`weakened test: ${body.trim()}`)
          }
        }
      }

      if (suspicious.length > 0) {
        return {
          gate: 'test-integrity',
          verdict: 'escalate',
          reason: `test files were weakened rather than extended:\n  ${suspicious.slice(0, 10).join('\n  ')}`,
          hint: 'A failing test usually means the implementation is wrong. A human should decide whether this change was legitimate.',
        }
      }
      return pass('test-integrity')
    },
  }
}

// ---------------------------------------------------------------------------
// Running gates
// ---------------------------------------------------------------------------

/**
 * Run every gate and collect all outcomes.
 *
 * Deliberately does not stop at the first failure. Telling a user about one problem, then the
 * next one on the following run, is a bad experience — and for verify gates the agent can
 * address several failures in a single revision round.
 */
export async function runPreflight(gates: Gate[], ctx: PreflightContext): Promise<GateOutcome[]> {
  const outcomes: GateOutcome[] = []
  for (const gate of gates) {
    if (!gate.preflight) continue
    outcomes.push(await gate.preflight(ctx))
  }
  return outcomes
}

export async function runVerify(gates: Gate[], ctx: VerifyContext): Promise<GateOutcome[]> {
  const outcomes: GateOutcome[] = []
  for (const gate of gates) {
    if (!gate.verify) continue
    outcomes.push(await gate.verify(ctx))
  }
  return outcomes
}

export function allPassed(outcomes: GateOutcome[]): boolean {
  return outcomes.every((o) => o.verdict === 'pass')
}

/**
 * Config files an ordinary task has no business touching.
 *
 * Every path-shaped entry is anchored with `**\/` so it matches at any depth. A bare
 * `package.json` matches only the one at the root, which in a workspace means the entry that
 * looks like the strictest rule here protects the single file least likely to be edited and
 * none of the ones an agent actually reaches for.
 */
export const DEFAULT_DENY = [
  '**/package.json',
  '**/pnpm-lock.yaml',
  '**/package-lock.json',
  '**/yarn.lock',
  '**/bun.lockb',
  '.github/workflows/**',
  '**/tsconfig.json',
  '**/tsconfig.*.json',
  '**/*.config.{ts,js,mjs,cjs}',
  '**/.env',
  '**/.env.*',
]

/** A sensible default set. Every entry is replaceable. */
export function defaultGates(opts: { inFlightMax?: number } = {}): Gate[] {
  return [
    readiness(),
    complexity(),
    inFlightCap({ max: opts.inFlightMax ?? 3 }),
    producedChanges(),
    pathScope({ defaultDeny: DEFAULT_DENY }),
    testIntegrity(),
    qualityGate(),
  ]
}
