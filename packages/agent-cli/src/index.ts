/**
 * Shared machinery for CLI-driven coding agents.
 *
 * Claude Code, Cursor and Codex all work the same way when driven headlessly: spawn a binary
 * in a sandbox we provide, hand it a prompt, wait, then read the change out of the working
 * tree. Roughly eighty per cent of each adapter is that flow — budget enforcement, timeout
 * handling, refusal detection, mapping an exit code onto a result.
 *
 * The remaining twenty per cent is genuinely vendor-specific: which flags to pass, what shape
 * the output takes, how a session is resumed. Isolating that into a declarative `CliAgentSpec`
 * has a practical benefit beyond tidiness — the part most likely to drift when a vendor
 * changes its CLI is small, in one place, and correctable without touching any logic.
 */
import type {
  AgentHandle,
  AgentResult,
  Budget,
  DrivenAgent,
  Feedback,
  Runner,
  TaskSpec,
} from '@contextmux/core'
import { existsSync } from 'node:fs'
import * as path from 'node:path'
import {
  isMutating,
  ProgressMonitor,
  stallFeedback,
  Trajectory,
  type StallVerdict,
} from '@contextmux/trajectory'

/** What a vendor's CLI produced, normalised. */
export interface CliOutcome {
  /** The agent's own account of what it did. */
  text: string
  /** Session identifier, when the CLI reports one and can resume it. */
  sessionId?: string
  usage?: AgentResult['usage']
  /** True when the CLI itself reported an error, independent of exit code. */
  isError?: boolean
  /** Why it stopped, when the CLI says. `max_turns` means the change is incomplete. */
  stopReason?: string
}

export interface CliInvocation {
  /** Arguments after the binary name. */
  args: string[]
  /** Written to the process's stdin, for CLIs that take the prompt that way. */
  stdin?: string
  env?: Record<string, string>
}

/**
 * Everything that differs between vendors.
 *
 * Deliberately data rather than subclassing: a spec can be read in one screen and checked
 * against a vendor's documentation without following any control flow.
 */
export interface CliAgentSpec {
  id: string
  displayName: string
  /** Default binary name. */
  bin: string
  /**
   * How confident we are that the flags and parsing below are correct.
   *
   * `verified` means it has been run against the real CLI. `unverified` means it was written
   * from documentation and nobody has executed it here. Surfacing that in `preflight` is more
   * useful than a confident adapter that is quietly wrong.
   */
  confidence: 'verified' | 'unverified'
  capabilities: DrivenAgent['capabilities']
  /** Build the command line for a run. */
  invoke(input: {
    prompt: string
    budget?: Budget
    resumeSessionId?: string
    systemPrompt: string
    model?: string
    /** Whether the caller has isolated the workspace, which governs how permissive to be. */
    isolated: boolean
    /**
     * Whether output will be observed line by line.
     *
     * The spec builds the whole command line rather than having a caller append flags: a
     * streaming mode usually *replaces* the output format rather than adding to it, and two
     * conflicting `--output-format` flags is the kind of bug that only shows up at runtime.
     */
    streaming?: boolean
    extraArgs?: string[]
  }): CliInvocation
  /** Interpret stdout. Return null when it could not be understood. */
  parse(stdout: string, stderr: string, exitCode: number): CliOutcome | null
  /** Notes shown by `preflight`, e.g. which environment variable supplies credentials. */
  requires?: string[]
  /**
   * How to make the CLI emit events while it works, and how to read them.
   *
   * Optional because most CLIs offer nothing of the sort. Where a vendor does stream, the
   * trajectory gains real tool calls; where it does not, recovery falls back to sampling the
   * workspace — coarser, but it still answers the question that matters most, which is whether
   * anything is happening at all.
   */
  streaming?: {
    /**
     * Interpret one line of output. Return null for lines that carry nothing.
     *
     * A line may carry several events: vendors put an assistant's narration and the tool calls
     * it made in one message, and models call tools in parallel. Returning a single event meant
     * the first block won and the rest were dropped — usually the narration, because it comes
     * first, leaving the tool calls unrecorded entirely.
     */
    parseLine(line: string): StreamEvent | StreamEvent[] | null
  }
}

/** A single observable moment from a streaming CLI. */
export type StreamEvent =
  | {
      type: 'tool'
      name: string
      args?: unknown
      files?: string[]
      ok?: boolean
      error?: string
      /** Vendor's call id, when the result arrives as a separate event. */
      id?: string
    }
  | { type: 'tool-result'; id: string; ok: boolean; error?: string }
  | { type: 'message'; text: string }

/**
 * Instruction appended to every vendor's system prompt.
 *
 * A refusal has to be distinguishable from a failure: a failure is worth retrying, a refusal
 * is not — running it again produces the same judgement and pays to hear it twice. No CLI
 * reports this natively, so we ask for a marker and detect it.
 */
export const REFUSAL_INSTRUCTION = [
  'If this task cannot be completed as written — it is ambiguous in a way you cannot resolve,',
  'it asks for something unsafe, or the codebase contradicts its premise — reply with a line',
  'beginning "REFUSED:" followed by the reason, and change nothing. A clear refusal is more',
  'useful than a plausible change that solves the wrong problem.',
].join(' ')

const REFUSAL_MARKER = /^\s*(?:REFUSED|CANNOT PROCEED)\s*[:\-]/im

/** How long `--version` may take before the binary is treated as unusable. */
const PREFLIGHT_TIMEOUT_MS = 10_000

export interface CliAgentOptions {
  /** Override the binary, for a pinned install or a test double. */
  bin?: string
  /**
   * Record what the agent does, and stop it when it stops making progress.
   *
   * Off unless a trajectory is supplied, because it changes the CLI invocation (streaming
   * output) and adds periodic workspace sampling. A caller that only wants a diff should not
   * pay for either.
   */
  trajectory?: Trajectory
  /** Watch for stalls while the agent runs. Requires `trajectory`. */
  recovery?: {
    sampleIntervalMs?: number
    stallAfterSamples?: number
  }
  model?: string
  /** Whether the workspace is isolated, which governs how permissive the agent may be. */
  isolated?: boolean
  appendSystemPrompt?: string
  extraArgs?: string[]
  defaultBudget?: Budget
  env?: Record<string, string>
  /** Ceiling on the `--version` check. Exposed so the hang path can be tested in milliseconds. */
  preflightTimeoutMs?: number
}

export class CliAgent implements DrivenAgent {
  readonly kind = 'driven' as const
  readonly id: string
  readonly displayName: string
  readonly capabilities: DrivenAgent['capabilities']

  constructor(
    readonly spec: CliAgentSpec,
    protected readonly opts: CliAgentOptions = {},
  ) {
    this.id = spec.id
    this.displayName = spec.displayName
    this.capabilities = spec.capabilities
  }

  get bin(): string {
    return this.opts.bin ?? this.spec.bin
  }

  /**
   * Check the adapter can run before a task depends on it.
   *
   * Failing here costs a second. Failing later costs a run that looks like the agent could not
   * do the work, when the truth is the binary was never installed.
   */
  async preflight(): Promise<{ ok: boolean; detail: string }> {
    const { spawn } = await import('node:child_process')

    /*
     * Bounded, because `--version` is not always the trivial call it looks like.
     *
     * A CLI that is installed but not logged in can prompt, and a prompt on a pipe waits
     * forever. Preflight exists to fail in a second rather than to fail slowly, so an
     * unanswered version check is itself the answer.
     */
    const timeoutMs = this.opts.preflightTimeoutMs ?? PREFLIGHT_TIMEOUT_MS
    const version = await new Promise<{ code: number; out: string; timedOut?: boolean }>((resolve) => {
      const child = spawn(this.bin, ['--version'], { windowsHide: true })
      let out = ''
      let settled = false
      const finish = (v: { code: number; out: string; timedOut?: boolean }) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(v)
      }
      const timer = setTimeout(() => {
        child.kill('SIGKILL')
        finish({ code: 1, out, timedOut: true })
      }, timeoutMs)
      timer.unref?.()

      child.stdout.on('data', (d) => (out += d))
      child.stderr.on('data', (d) => (out += d))
      // Nothing is being sent, and a version check that sits waiting for stdin is the hang
      // this timeout exists to catch.
      child.stdin.on('error', () => {})
      child.stdin.end()
      child.on('error', () => finish({ code: 127, out }))
      child.on('close', (code) => finish({ code: code ?? 1, out }))
    })

    if (version.timedOut) {
      return {
        ok: false,
        detail:
          `\`${this.bin} --version\` did not answer within ${timeoutMs / 1000}s. ` +
          'It is usually waiting for input — check that it is logged in.',
      }
    }

    if (version.code === 127) {
      return {
        ok: false,
        detail: `\`${this.bin}\` is not on PATH. Install ${this.spec.displayName}, or set a different binary.`,
      }
    }
    if (version.code !== 0) {
      return { ok: false, detail: `\`${this.bin} --version\` exited with ${version.code}` }
    }

    const missing = (this.spec.requires ?? []).filter((name) => !process.env[name])
    if (missing.length > 0) {
      return { ok: false, detail: `${this.spec.displayName} needs ${missing.join(', ')} to be set.` }
    }

    const note =
      this.spec.confidence === 'unverified'
        ? ' — note: this adapter was written from documentation and has not been run against the real CLI here, so flags may need adjusting'
        : ''
    return { ok: true, detail: `${version.out.trim().split('\n')[0] || 'available'}${note}` }
  }

  async run(input: {
    task: TaskSpec
    prompt: string
    runner: Runner
    budget?: Budget
    feedback?: Feedback
    resumeFrom?: AgentHandle
    signal?: AbortSignal
  }): Promise<{ result: AgentResult; handle: AgentHandle }> {
    const { runner, prompt, budget, resumeFrom, signal } = input
    const timeoutMs =
      budget?.maxDurationMs ?? this.opts.defaultBudget?.maxDurationMs ?? 20 * 60_000

    const systemPrompt = [this.opts.appendSystemPrompt, REFUSAL_INSTRUCTION]
      .filter(Boolean)
      .join('\n\n')

    const wantsStream = Boolean(this.opts.trajectory && this.spec.streaming)

    const invocation = this.spec.invoke({
      prompt,
      ...(budget ?? this.opts.defaultBudget ? { budget: budget ?? this.opts.defaultBudget } : {}),
      ...(resumeFrom?.sessionId ? { resumeSessionId: resumeFrom.sessionId } : {}),
      systemPrompt,
      ...(this.opts.model ? { model: this.opts.model } : {}),
      isolated: this.opts.isolated ?? false,
      ...(wantsStream ? { streaming: true } : {}),
      ...(this.opts.extraArgs ? { extraArgs: this.opts.extraArgs } : {}),
    })

    const trajectory = this.opts.trajectory
    trajectory?.dispatch(`${this.id} invoked`, { round: input.feedback?.round ?? 0 })
    if (input.feedback) trajectory?.feedback(input.feedback.source, input.feedback.body)

    /*
     * Streaming is requested only when something is listening.
     *
     * The extra arguments change the CLI's output format, so switching them on unconditionally
     * would make every run pay a parsing cost for a trajectory nobody asked for.
     */
    const streaming = wantsStream ? this.spec.streaming! : null
    const args = invocation.args

    const monitor =
      trajectory && this.opts.recovery
        ? new ProgressMonitor({
            runner,
            trajectory,
            ...(this.opts.recovery.sampleIntervalMs !== undefined
              ? { sampleIntervalMs: this.opts.recovery.sampleIntervalMs }
              : {}),
            ...(this.opts.recovery.stallAfterSamples !== undefined
              ? { stallAfterSamples: this.opts.recovery.stallAfterSamples }
              : {}),
          })
        : null

    monitor?.start()

    // The caller's signal and the monitor's both need to stop the process, so forward whichever
    // fires first rather than making the runner understand two.
    const combined = combineSignals([signal, monitor?.signal])

    let exec
    try {
      exec = await runner.exec(this.bin, args, {
        timeoutMs,
        ...(invocation.stdin !== undefined ? { input: invocation.stdin } : {}),
        ...(invocation.env || this.opts.env ? { env: { ...this.opts.env, ...invocation.env } } : {}),
        ...(combined.signal ? { signal: combined.signal } : {}),
        ...(streaming
          ? {
              onStdoutLine: (line: string) => {
                const parsed = streaming.parseLine(line)
                if (!parsed) return
                for (const event of Array.isArray(parsed) ? parsed : [parsed]) {
                  if (event.type === 'tool') {
                    trajectory!.tool(event.name, event.args, {
                      ...(event.ok !== undefined ? { ok: event.ok } : {}),
                      ...(event.error ? { error: event.error } : {}),
                      ...(event.files?.length ? { files: event.files } : {}),
                      ...(event.id ? { id: event.id } : {}),
                      ...existedFlag(runner.cwd, event.name, event.files),
                    })
                  } else if (event.type === 'tool-result') {
                    trajectory!.resolveTool(event.id, event.ok, event.error)
                  } else {
                    trajectory!.message(event.text)
                  }
                }
              },
            }
          : {}),
      })
    } finally {
      monitor?.stop()
      combined.dispose()
    }

    // Read the change from the workspace, not from what the agent claims. An agent's own
    // account of which files it touched is a summary, and summaries drift from reality.
    const filesChanged = await runner.changedFiles()
    const diff = await runner.diff()

    const outcome = this.spec.parse(exec.stdout, exec.stderr, exec.code)

    const handle: AgentHandle = {
      ref: outcome?.sessionId ?? `${this.id}-${Date.now().toString(36)}`,
      agentId: this.id,
      ...(outcome?.sessionId ? { sessionId: outcome.sessionId } : {}),
    }

    const base = {
      filesChanged,
      ...(diff ? { diff } : {}),
      location: runner.cwd ? { worktree: runner.cwd } : {},
      ...(outcome?.usage ? { usage: outcome.usage } : {}),
      ...(handle.sessionId ? { sessionId: handle.sessionId } : {}),
    }

    /*
     * Every exit records how it ended.
     *
     * Three of these paths used to return without a `result` step, so a refused or failed run
     * produced a trajectory that simply stopped — indistinguishable from one truncated by a
     * crash. Everything downstream reads the last step to know what happened, and a recording
     * that cannot say how it ended is not evidence of anything.
     */

    /*
     * A stall is not a timeout.
     *
     * Both stop the process, but they mean different things and deserve different feedback.
     * "It ran out of time" tells an agent nothing; "you called the same search five times"
     * tells it exactly what to stop doing, and that difference is what makes the retry worth
     * paying for.
     */
    const stall = monitor?.intervened
    if (stall) {
      trajectory?.result('stalled', stall.reason, filesChanged)
      return {
        result: {
          ...base,
          status: stall.needsHuman ? 'refused' : 'failed',
          summary: stall.reason,
          error: stall.reason,
          // The diagnosis travels with the failure, so the orchestrator can retry with it.
          ...(stall.needsHuman
            ? {}
            : { recovery: stallFeedback(stall, (input.feedback?.round ?? 0) + 1) }),
        },
        handle,
      }
    }

    if (exec.timedOut) {
      trajectory?.result('timeout', 'exceeded its time budget', filesChanged)
      return {
        result: {
          ...base,
          status: 'failed',
          summary: 'The agent exceeded its time budget.',
          error: `timed out after ${timeoutMs}ms`,
        },
        handle,
      }
    }

    if (!outcome) {
      const detail = (exec.stderr || exec.stdout).trim().split('\n').slice(-15).join('\n')
      trajectory?.result('failed', 'produced no parseable result', filesChanged)
      return {
        result: {
          ...base,
          status: 'failed',
          summary: 'The agent produced no parseable result.',
          error: `exit ${exec.code}${detail ? `: ${detail}` : ''}`,
        },
        handle,
      }
    }

    if (REFUSAL_MARKER.test(outcome.text)) {
      trajectory?.result('refused', outcome.text.trim().slice(0, 200), filesChanged)
      return {
        result: {
          ...base,
          status: 'refused',
          summary: outcome.text.trim(),
          error: outcome.text.replace(REFUSAL_MARKER, '').trim().split('\n')[0] ?? 'refused',
        },
        handle,
      }
    }

    if (outcome.isError || exec.code !== 0) {
      trajectory?.result('failed', outcome.stopReason ?? `exit ${exec.code}`, filesChanged)
      return {
        result: {
          ...base,
          status: 'failed',
          summary: outcome.text.trim() || 'The agent reported an error.',
          error: outcome.stopReason ?? `exit ${exec.code}`,
        },
        handle,
      }
    }

    /*
     * Budget overrun is reported after the fact, not enforced mid-flight.
     *
     * No CLI here has a cost ceiling of its own, and killing a run partway through leaves a
     * half-finished change in the tree — which is worse than an overspend you can see and act
     * on.
     */
    const maxCost = budget?.maxCostUsd ?? this.opts.defaultBudget?.maxCostUsd
    const spent = outcome.usage?.costUsd
    if (maxCost !== undefined && spent !== undefined && spent > maxCost) {
      trajectory?.result('failed', `cost ${spent.toFixed(4)} USD exceeded the budget`, filesChanged)
      return {
        result: {
          ...base,
          status: 'failed',
          summary: outcome.text.trim(),
          error: `cost ${spent.toFixed(4)} USD exceeded the budget of ${maxCost} USD`,
        },
        handle,
      }
    }

    // Running out of turns means the change on disk is partial. Reporting success would send
    // an unfinished change to review.
    if (outcome.stopReason === 'max_turns') {
      trajectory?.result('failed', 'hit the turn limit before finishing', filesChanged)
      return {
        result: {
          ...base,
          status: 'failed',
          summary: outcome.text.trim(),
          error: 'hit the turn limit before finishing; the change on disk is incomplete',
        },
        handle,
      }
    }

    trajectory?.result('succeeded', outcome.text.trim().slice(0, 200), filesChanged)
    return {
      result: { ...base, status: 'succeeded', summary: outcome.text.trim() || 'No summary provided.' },
      handle,
    }
  }
}

/**
 * Was the file already there when the agent reached for it?
 *
 * The `write-before-read` detector needs this and nothing was supplying it, so it could not
 * fire at all — a safety check that existed only in its own tests. Vendors announce a tool call
 * before running it, so checking here is the right side of the race: an edit we are told about
 * has not happened yet.
 *
 * Only asked about mutating calls with named files, and answered only when every one of them is
 * already present. Unknown stays unknown, because guessing "it existed" would flag every file
 * an agent legitimately creates.
 */
function existedFlag(
  cwd: string | undefined,
  toolName: string,
  files: string[] | undefined,
): { existed?: boolean } {
  if (!cwd || !files?.length || !isMutating(toolName)) return {}
  try {
    return { existed: files.every((f) => existsSync(path.resolve(cwd, f))) }
  } catch {
    return {}
  }
}

/**
 * Forward whichever of several signals aborts first.
 *
 * `AbortSignal.any` exists in recent runtimes but not in every one we support, and a runner
 * that understood two signals would be a worse interface than one that understands one.
 */
function combineSignals(signals: Array<AbortSignal | undefined>): {
  signal: AbortSignal | undefined
  dispose: () => void
} {
  const present = signals.filter((s): s is AbortSignal => Boolean(s))
  if (present.length === 0) return { signal: undefined, dispose: () => {} }
  if (present.length === 1) return { signal: present[0], dispose: () => {} }

  const controller = new AbortController()
  const forward = () => controller.abort()
  const attached: AbortSignal[] = []

  for (const signal of present) {
    if (signal.aborted) {
      forward()
      break
    }
    signal.addEventListener('abort', forward, { once: true })
    attached.push(signal)
  }

  /*
   * Removable, because one of these signals usually outlives the run.
   *
   * A caller's signal belongs to the whole process, not to this invocation. `{ once: true }`
   * only cleans up on an abort that mostly never comes, so every completed run left a listener
   * behind — and a long-lived orchestrator eventually accumulates enough to be warned about by
   * Node itself.
   */
  return {
    signal: controller.signal,
    dispose: () => {
      for (const signal of attached) signal.removeEventListener('abort', forward)
    },
  }
}

export type { StallVerdict }

/** Pull the first JSON object out of output that may also contain log lines. */
export function extractJson(stdout: string): Record<string, unknown> | null {
  const trimmed = stdout.trim()
  if (!trimmed) return null

  try {
    const parsed = JSON.parse(trimmed)
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>
  } catch {
    /* fall through to line scanning */
  }

  // Some CLIs interleave progress lines with a final JSON result, so scan from the end.
  const lines = trimmed.split('\n')
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!.trim()
    if (!line.startsWith('{')) continue
    try {
      const parsed = JSON.parse(line)
      if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>
    } catch {
      /* keep scanning */
    }
  }
  return null
}

/** Concatenate the assistant text out of a stream-json transcript. */
export function textFromStream(stdout: string): string {
  const parts: string[] = []
  for (const line of stdout.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('{')) continue
    try {
      const event = JSON.parse(trimmed) as Record<string, unknown>
      const message = event['message'] as { content?: Array<{ type?: string; text?: string }> } | undefined
      for (const block of message?.content ?? []) {
        if (block.type === 'text' && block.text) parts.push(block.text)
      }
      if (typeof event['result'] === 'string') parts.push(event['result'] as string)
    } catch {
      /* not a JSON line */
    }
  }
  return parts.join('\n').trim()
}
