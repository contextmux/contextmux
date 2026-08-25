/**
 * In-memory fakes and a simulator.
 *
 * The point is to make orchestration behaviour testable at unit-test speed. Scenarios that
 * would otherwise need a tracker, a real agent, network calls and hundreds of lines of CI YAML
 * become a few lines here and run in milliseconds — so the policy that actually matters gets
 * exercised on every commit rather than in production.
 */
import type {
  AgentHandle,
  CommandResult,
  DelegatedAgent,
  DrivenAgent,
  Notifier,
  Runner,
  Tracker,
} from './adapters.js'
import type { AgentResult, Feedback, SemanticState, TaskSpec } from './task.js'

// ---------------------------------------------------------------------------

export interface FakeAgentScript {
  /** Result for each successive dispatch. The last entry repeats once exhausted. */
  responses: Array<Partial<AgentResult> & { status: AgentResult['status'] }>
  /** Throw on the nth dispatch (1-based), to exercise the failure path. */
  throwOn?: number[]
}

export class FakeAgent implements DrivenAgent {
  readonly kind = 'driven' as const
  readonly id = 'fake'
  readonly displayName = 'Fake agent'
  readonly capabilities = {
    promptControl: 'full' as const,
    resume: 'session' as const,
    sandbox: 'caller' as const,
    budgetable: true,
  }

  /** Every prompt received, so tests can assert on what was actually asked. */
  readonly prompts: string[] = []
  readonly feedbacks: Feedback[] = []
  dispatches = 0

  constructor(private readonly script: FakeAgentScript) {}

  async preflight(): Promise<{ ok: boolean; detail: string }> {
    return { ok: true, detail: 'fake' }
  }

  async run(input: {
    task: TaskSpec
    prompt: string
    runner: Runner
    feedback?: Feedback
  }): Promise<{ result: AgentResult; handle: AgentHandle }> {
    this.dispatches += 1
    this.prompts.push(input.prompt)
    if (input.feedback) this.feedbacks.push(input.feedback)

    if (this.script.throwOn?.includes(this.dispatches)) {
      throw new Error(`fake agent exploded on dispatch ${this.dispatches}`)
    }

    const idx = Math.min(this.dispatches - 1, this.script.responses.length - 1)
    const spec = this.script.responses[idx]!

    return {
      result: {
        filesChanged: spec.filesChanged ?? ['src/thing.ts'],
        summary: spec.summary ?? 'did the thing',
        ...spec,
      },
      handle: { ref: `fake-${this.dispatches}`, agentId: this.id },
    }
  }
}

// ---------------------------------------------------------------------------

export interface FakeDelegatedScript {
  /**
   * Observations to return in order. `null` means "still working", so a script of
   * `[null, null, {…}]` exercises the polling path without waiting for real time to pass.
   */
  observations: Array<(Partial<AgentResult> & { status: AgentResult['status'] }) | null>
  failDelegate?: string
  /** Fail this many observations before the script starts, to exercise transient errors. */
  observeErrors?: number
}

export class FakeDelegatedAgent implements DelegatedAgent {
  readonly kind = 'delegated' as const
  readonly id = 'fake-delegated'
  readonly displayName = 'Fake delegated agent'
  readonly capabilities = {
    promptControl: 'artifact-only' as const,
    resume: 'mention' as const,
    sandbox: 'vendor' as const,
    budgetable: false,
  }
  /** Poll fast so tests do not spend real seconds waiting. */
  readonly pollIntervalMs = 1

  readonly prompts: string[] = []
  readonly nudges: Feedback[] = []
  delegations = 0
  observations = 0
  private errorsLeft: number

  constructor(private readonly script: FakeDelegatedScript) {
    this.errorsLeft = script.observeErrors ?? 0
  }

  async preflight(): Promise<{ ok: boolean; detail: string }> {
    return { ok: true, detail: 'fake' }
  }

  async delegate(input: { task: TaskSpec; prompt: string }): Promise<AgentHandle> {
    if (this.script.failDelegate) throw new Error(this.script.failDelegate)
    this.delegations += 1
    this.prompts.push(input.prompt)
    return { ref: `issue-${this.delegations}`, agentId: this.id }
  }

  async nudge(_handle: AgentHandle, feedback: Feedback): Promise<void> {
    this.nudges.push(feedback)
    // A nudge restarts the work, so the observation script replays from the top.
    this.observations = 0
  }

  async observe(): Promise<AgentResult | null> {
    if (this.errorsLeft > 0) {
      this.errorsLeft -= 1
      throw new Error('transient API failure')
    }
    const idx = Math.min(this.observations, this.script.observations.length - 1)
    this.observations += 1
    const spec = this.script.observations[idx]
    if (!spec) return null
    return {
      filesChanged: spec.filesChanged ?? ['src/thing.ts'],
      summary: spec.summary ?? 'did the thing',
      ...spec,
    }
  }
}

// ---------------------------------------------------------------------------

export interface FakeRunnerOptions {
  /** Exit codes keyed by the command line, for driving quality-gate outcomes. */
  commands?: Record<string, { code: number; stdout?: string; stderr?: string }>
  changedFiles?: string[]
  diff?: string
}

/** Options a real runner accepts, so the fake can be substituted without narrowing. */
type ExecOptions = Parameters<Runner['exec']>[2]

export class FakeRunner implements Runner {
  readonly id = 'fake'
  cwd = '/fake'
  readonly executed: string[] = []
  disposed = false

  constructor(private opts: FakeRunnerOptions = {}) {}

  /** Change what the runner reports, to simulate an agent editing files between rounds. */
  setChangedFiles(files: string[]): void {
    this.opts = { ...this.opts, changedFiles: files }
  }

  setCommand(line: string, res: { code: number; stdout?: string; stderr?: string }): void {
    this.opts = { ...this.opts, commands: { ...this.opts.commands, [line]: res } }
  }

  /**
   * Run a scripted command.
   *
   * Takes the full option set the `Runner` interface declares, rather than the two arguments it
   * happened to use. A double that quietly drops a parameter is not a double of that interface:
   * `onStdoutLine` could never be exercised through it, so every test that needed streaming had
   * to replace the method wholesale — and nothing caught the divergence, because a narrower
   * signature is a legal implementation and the tests were not typechecked.
   *
   * Scripted stdout is delivered line by line when an observer is supplied, which is what a
   * real runner does and what recovery depends on seeing.
   */
  async exec(command: string, args: string[], opts: ExecOptions = {}): Promise<CommandResult> {
    const line = [command, ...args].join(' ')
    this.executed.push(line)
    const spec = this.opts.commands?.[line] ?? { code: 0 }
    const stdout = spec.stdout ?? ''

    if (opts?.onStdoutLine) {
      for (const outputLine of stdout.split('\n')) {
        if (outputLine.trim()) opts.onStdoutLine(outputLine)
      }
    }

    return {
      code: spec.code,
      stdout,
      stderr: spec.stderr ?? '',
      timedOut: false,
      durationMs: 1,
    }
  }

  async changedFiles(): Promise<string[]> {
    return this.opts.changedFiles ?? []
  }

  async diff(): Promise<string> {
    return this.opts.diff ?? ''
  }

  async dispose(): Promise<void> {
    this.disposed = true
  }
}

// ---------------------------------------------------------------------------

export class FakeTracker implements Tracker {
  readonly id = 'fake'
  readonly transitions: Array<{ id: string; to: SemanticState }> = []
  readonly comments: Array<{ id: string; body: string }> = []
  readonly labelChanges: Array<{ id: string; add: string[]; remove: string[] }> = []

  constructor(private readonly tasks: TaskSpec[] = []) {}

  async listReady(limit = 10): Promise<TaskSpec[]> {
    return this.tasks.slice(0, limit)
  }

  async get(id: string): Promise<TaskSpec | null> {
    return this.tasks.find((t) => t.id === id) ?? null
  }

  async transition(id: string, to: SemanticState): Promise<void> {
    this.transitions.push({ id, to })
  }

  async comment(id: string, body: string): Promise<void> {
    this.comments.push({ id, body })
  }

  async setLabels(id: string, add: string[], remove: string[]): Promise<void> {
    this.labelChanges.push({ id, add, remove })
  }
}

export class FakeNotifier implements Notifier {
  readonly id = 'fake'
  readonly sent: Array<{ level: string; title: string; body: string }> = []

  async send(event: { level: 'info' | 'warn' | 'error'; title: string; body: string }): Promise<void> {
    this.sent.push(event)
  }
}

// ---------------------------------------------------------------------------

/** Build a task that passes the default gates, so tests only state what they care about. */
export function fakeTask(overrides: Partial<TaskSpec> = {}): TaskSpec {
  const id = overrides.id ?? 'TASK-1'
  return {
    id,
    title: 'Add a currency formatting helper',
    body:
      'The checkout summary shows raw numbers. Add a helper that formats a value as a ' +
      'currency string using the active locale, and use it in the summary component.',
    acceptanceCriteria: [
      { text: 'A helper formats a number and currency code into a localised string' },
      { text: 'The checkout summary uses it' },
    ],
    scope: { allow: [], deny: [] },
    qualityGate: [],
    origin: { tracker: 'fake', id },
    labels: [],
    ...overrides,
  }
}
