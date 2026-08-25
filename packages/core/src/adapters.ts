/**
 * Adapter contracts.
 *
 * The central bet of this design: agents differ by *archetype*, not by vendor. A delegated
 * agent hands work to a vendor's cloud and observes it through webhooks; a driven agent runs
 * inside a runner you control. The orchestrator branches on capability, never on brand — if
 * it ever says `if (agent.id === 'copilot')`, the abstraction has failed.
 */
import type { AgentResult, Budget, Feedback, SemanticState, TaskSpec } from './task.js'

// ---------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------

export interface AgentCapabilities {
  /** `full` — we compose the prompt. `artifact-only` — we can only shape a handed-off artifact. */
  promptControl: 'full' | 'artifact-only'
  /** How a revision round is delivered. */
  resume: 'mention' | 'reinvoke' | 'session' | 'none'
  /** Who provides the execution environment. */
  sandbox: 'vendor' | 'caller'
  /** Whether token or cost ceilings can actually be enforced. */
  budgetable: boolean
}

export interface AgentHandle {
  /** Adapter-specific identifier for an in-flight or completed run. */
  ref: string
  agentId: string
  /** Set for driven agents that support resuming a conversation. */
  sessionId?: string
  branch?: string
  worktree?: string
}

export interface AgentBase {
  id: string
  displayName: string
  capabilities: AgentCapabilities
  /** Report whether the adapter can run at all — binary present, credentials set. */
  preflight(): Promise<{ ok: boolean; detail: string }>
}

/**
 * An agent whose loop we own. We build the prompt, provide the sandbox, enforce the budget,
 * and get the diff back directly. Far easier to test and reason about, which is why the
 * orchestration layer is built against this archetype first.
 */
export interface DrivenAgent extends AgentBase {
  kind: 'driven'
  run(input: {
    task: TaskSpec
    prompt: string
    runner: Runner
    budget?: Budget
    /** Present on revision rounds. */
    feedback?: Feedback
    /** Session to resume, when the adapter supports it. */
    resumeFrom?: AgentHandle
    signal?: AbortSignal
  }): Promise<{ result: AgentResult; handle: AgentHandle }>
}

/**
 * An agent that runs in a vendor's cloud. We shape the handed-off artifact and then observe.
 * Not implemented in v0.2 — the interface exists so the state machine is written against both
 * archetypes from the start rather than being retrofitted.
 */
export interface DelegatedAgent extends AgentBase {
  /**
   * Announce that what the agent produced is ready for a human to look at.
   *
   * Optional, because most agents have nothing to announce. Copilot's coding agent leaves its
   * pull request as a draft when it finishes — it never clears that flag itself — so a run
   * that has passed its gates still looks like work in progress to everyone reading the
   * repository. Returns where the result lives, or null when there was nothing to mark.
   */
  markReady?(handle: AgentHandle): Promise<string | null>

  kind: 'delegated'
  /**
   * Hand the work over.
   *
   * The adapter owns the mechanics of its vendor's handoff — creating an issue, assigning a
   * bot, opening a cloud task. Keeping that inside the adapter is what lets the state machine
   * stay ignorant of whether an artefact exists at all.
   */
  delegate(input: { task: TaskSpec; prompt: string }): Promise<AgentHandle>
  /** Deliver a revision round through whatever channel the vendor listens on. */
  nudge(handle: AgentHandle, feedback: Feedback): Promise<void>
  /** Current state of the delegated work. `null` means still in progress. */
  observe(handle: AgentHandle): Promise<AgentResult | null>
  /** How long to leave between observations. Vendors differ by orders of magnitude. */
  pollIntervalMs?: number
}

export type CodingAgent = DrivenAgent | DelegatedAgent

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

export interface CommandResult {
  code: number
  stdout: string
  stderr: string
  timedOut: boolean
  durationMs: number
}

/** Where commands execute. Abstracted so a driven agent can run local, in CI, or in a sandbox. */
export interface Runner {
  id: string
  /** Directory commands run in. For isolated runs this is a worktree, not the repo. */
  cwd: string
  exec(
    command: string,
    args: string[],
    opts?: {
      timeoutMs?: number
      env?: Record<string, string>
      input?: string
      signal?: AbortSignal
      /**
       * Called for each line of stdout as it arrives.
       *
       * Without this, an agent's output is only visible after it exits — which is too late to
       * notice it repeating itself, and too late to stop it. A runner that ignores this is
       * still valid; it simply cannot support intra-run recovery.
       */
      onStdoutLine?: (line: string) => void
    },
  ): Promise<CommandResult>
  /** Files changed relative to the run's starting point. */
  changedFiles(): Promise<string[]>
  diff(): Promise<string>
  /** Release any resources — remove a worktree, tear down a container. */
  dispose(): Promise<void>
}

// ---------------------------------------------------------------------------
// Tracker
// ---------------------------------------------------------------------------

export interface Tracker {
  id: string
  /** Tasks eligible to be worked on. */
  listReady(limit?: number): Promise<TaskSpec[]>
  get(id: string): Promise<TaskSpec | null>
  transition(id: string, to: SemanticState): Promise<void>
  comment(id: string, body: string): Promise<void>
  setLabels(id: string, add: string[], remove: string[]): Promise<void>
  /**
   * Put the authenticated account on the ticket, when the tracker supports it.
   *
   * A ticket being worked on by nobody is indistinguishable from one nobody has picked up, and
   * a board full of in-progress tickets with no assignee is how a team stops trusting the
   * board. The account is whoever the credentials belong to, because that is the only identity
   * a run can honestly claim.
   *
   * Optional: a tracker backed by files in the repository has no notion of an assignee.
   */
  assignToSelf?(id: string): Promise<void>
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/**
 * Durable state.
 *
 * `applyOnce` is the idempotency primitive. Webhook deliveries duplicate, processes crash
 * mid-transition, and cron overlaps — without a single place that says "this exact transition
 * already happened", a run silently double-dispatches or burns its revision budget in one pass.
 */
export interface StateStore {
  load(runId: string): Promise<unknown | null>
  save(runId: string, value: unknown): Promise<void>
  list(): Promise<string[]>
  /** Run `fn` only if `key` has not been applied before. Returns whether it ran. */
  applyOnce(key: string, fn: () => Promise<void>): Promise<boolean>
  /**
   * Forget that a run's effects were applied, so a restart may apply them again.
   *
   * Markers are keyed by run id, and a run id outlives the run: re-running a task that
   * escalated reuses it. Without this the second attempt silently skips every effect the first
   * one performed — most visibly the tracker transition, so a ticket the first run moved to
   * blocked stayed blocked while the second reported it had moved it on.
   */
  forgetApplied(runId: string): Promise<number>
  /** Exclusive lease, so two processes cannot advance the same run concurrently. */
  acquireLease(runId: string, ttlMs: number): Promise<{ held: boolean; release: () => Promise<void> }>
}

// ---------------------------------------------------------------------------
// Notifier
// ---------------------------------------------------------------------------

export interface Notifier {
  id: string
  send(event: { level: 'info' | 'warn' | 'error'; title: string; body: string; runId?: string }): Promise<void>
}
