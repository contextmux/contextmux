/**
 * The engine.
 *
 * All the I/O lives here, and nothing else does. It drives the pure reducer: feed it an event,
 * take the effects it returns, execute them through adapters, feed back whatever those
 * produce. That loop is the whole design — the interesting policy stays in `machine.ts` where
 * it can be tested without a filesystem, and this file stays boring on purpose.
 *
 * Every effect that touches the outside world runs under `applyOnce`, keyed by the transition
 * that produced it. Redelivering an event, resuming after a crash, or two workers racing on
 * the same run cannot post a comment twice or dispatch an agent twice.
 */
import type {
  CodingAgent,
  DelegatedAgent,
  DrivenAgent,
  Notifier,
  Runner,
  StateStore,
  Tracker,
} from './adapters.js'
import { EventBus, type EngineEvent } from './events.js'
import { allPassed, runPreflight, runVerify, type Gate } from './gates.js'
import {
  createRun,
  reduce,
  TERMINAL,
  taskFingerprint,
  type Effect,
  type Run,
  type RunEvent,
  type RunPolicy,
} from './machine.js'
import type { AgentResult, Feedback, TaskSpec } from './task.js'
import { DEFAULT_POLICY } from './machine.js'

export interface EngineOptions {
  /**
   * Optional, because a caller that only submits events — a webhook handler recording a
   * review — has no agent to configure and should not be made to invent one. Attempting a
   * dispatch without it fails with a message that says exactly that.
   */
  agent?: CodingAgent
  /** Optional for the same reason; only verify gates and driven agents need it. */
  runner?: Runner
  /**
   * Where the verify gates should run, given what the agent produced.
   *
   * A driven agent leaves its work in the runner it was handed, so the default — that same
   * runner — is right. A delegated one leaves it on a branch in the forge, and verifying in
   * whatever checkout this process started in compiles the wrong code entirely: on a real run
   * `quality-gate` would have reported a verdict on the developer's working tree while calling
   * it the pull request's.
   *
   * Returning null means verification is not possible, which escalates. That is deliberate:
   * the alternative is a gate that passes because it could not look.
   */
  verifyRunner?: (result: AgentResult) => Promise<Runner | null>
  store: StateStore
  gates: Gate[]
  tracker?: Tracker
  notifiers?: Notifier[]
  policy?: RunPolicy
  bus?: EventBus
  /** Compose the prompt handed to a driven agent. */
  renderPrompt: (task: TaskSpec, feedback?: Feedback) => Promise<string> | string
  /** Report side effects without performing them. */
  dryRun?: boolean
  /** How long a single run may hold its lease. */
  leaseTtlMs?: number
  /**
   * Wait for a delegated agent to finish rather than returning while it works.
   *
   * On by default so `ctxmux run` behaves the same whichever archetype is configured. A
   * long-lived service that reacts to webhooks sets this false and drives the run through
   * `submit` instead of holding a process open.
   */
  waitForDelegated?: boolean
  /** Ceiling on how long to wait for a delegated agent before giving up on it. */
  delegatedTimeoutMs?: number
  /** Lease held while submitting a single event. Short by design — see `submit`. */
  submitLeaseTtlMs?: number
  signal?: AbortSignal
}

export interface SubmitResult {
  run: Run | null
  /** False when the event changed nothing, with `reason` saying why. */
  applied: boolean
  reason?: string
}

export class Engine {
  readonly bus: EventBus

  constructor(private readonly opts: EngineOptions) {
    this.bus = opts.bus ?? new EventBus()
  }

  on(listener: (e: EngineEvent) => void): () => void {
    return this.bus.on(listener)
  }

  /**
   * Drive a task to a terminal state.
   *
   * The lease is held for the whole run rather than per transition. A run owns a runner and,
   * when isolated, a git worktree; letting a second process interleave transitions against
   * the same working directory would corrupt both.
   */
  async run(task: TaskSpec, opts: { inFlight?: number } = {}): Promise<Run> {
    const existing = (await this.opts.store.load(`run-${task.id}`)) as Run | null

    /*
     * A finished run is only final for the task it judged.
     *
     * `rejected` is terminal, and a rejection at preflight means the task was not ready — so
     * the remedy is to fix the task and try again. But the stored run held the task as it was,
     * and re-running adopted that copy wholesale: the ticket could be corrected in Jira and the
     * run would keep returning the old verdict forever, with the freshly fetched task printed
     * in the header beside a rejection reason that no longer applied.
     *
     * A mid-flight run keeps its stored task regardless, because resuming one is what makes
     * crash recovery cheap and swapping the task underneath it would lose the work.
     */
    const supersededByEdit =
      existing !== null && TERMINAL.has(existing.state) && taskFingerprint(existing.task) !== taskFingerprint(task)

    let run = existing !== null && !supersededByEdit ? existing : createRun(task, this.opts.policy ?? DEFAULT_POLICY)

    if (supersededByEdit) {
      /*
       * Forget what the previous incarnation applied.
       *
       * Effect markers are keyed by run id, and the id is reused — so without this the fresh
       * run silently skips every effect its predecessor performed. The visible symptom is a
       * tracker left where the failed run put it: a ticket moved to blocked on escalation
       * stayed blocked, while the new run reported that it had moved it to in progress.
       */
      const forgotten = await this.opts.store.forgetApplied(`run-${task.id}`)
      this.bus.emit({
        type: 'log',
        level: 'info',
        message:
          `${task.id} has changed since it was ${existing!.state}; starting a fresh run` +
          (forgotten > 0 ? ` (${forgotten} recorded effect(s) reset)` : ''),
      })
    }

    if (TERMINAL.has(run.state)) {
      /*
       * Loud, because it looks like nothing happened.
       *
       * At info level this was invisible by default, so a re-run printed a verdict with no
       * indication that the gates had not been consulted — which is indistinguishable from
       * them having been consulted and agreed.
       */
      this.bus.emit({
        type: 'log',
        level: 'warn',
        message:
          `${run.id} already finished (${run.state}) and the task is unchanged, so nothing was re-evaluated. ` +
          `Change the task, or delete .ctxmux/state/runs/${run.id}.json to start over.`,
      })
      return run
    }

    const lease = await this.opts.store.acquireLease(run.id, this.opts.leaseTtlMs ?? 30 * 60_000)
    if (!lease.held) {
      this.bus.emit({
        type: 'log',
        level: 'warn',
        message: `${run.id} is already being processed by another worker`,
      })
      return run
    }

    this.bus.emit({ type: 'run:started', runId: run.id, taskId: task.id, title: task.title })

    try {
      // Kick off from wherever the run currently is. A fresh run gates first; anything else
      // re-enters at its own state, which is what makes crash recovery cheap. States that owe
      // no further work — awaiting a human review, for instance — simply ignore `resumed`.
      let pending: RunEvent | null =
        run.state === 'discovered'
          ? await this.preflight(run, opts.inFlight ?? 0)
          : { type: 'resumed' }

      while (pending !== null) {
        if (this.opts.signal?.aborted) {
          pending = { type: 'cancelled', reason: 'aborted by caller' }
        }

        const before = run
        const { run: next, effects, applied } = reduce(run, pending)
        run = next

        if (applied) {
          const last = run.history[run.history.length - 1]
          if (last) {
            this.bus.emit({
              type: 'run:state',
              runId: run.id,
              from: last.from,
              to: last.to,
              via: last.event,
            })
          }
        }

        pending = await this.executeEffects(run, effects, before)

        if (TERMINAL.has(run.state)) break

        /*
         * A delegated agent leaves the run parked in `working` with nothing to feed back. Poll
         * it here so `ctxmux run` behaves identically whichever archetype is configured; a
         * webhook-driven service turns this off and resumes through `submit` instead.
         */
        if (
          pending === null &&
          run.state === 'working' &&
          this.opts.agent?.kind === 'delegated' &&
          this.opts.waitForDelegated !== false &&
          !this.opts.dryRun
        ) {
          pending = await this.observeDelegated(this.opts.agent, run)
        }
      }

      /*
       * A dry run leaves nothing behind, including this.
       *
       * The record written here was terminal, and a terminal record short-circuits the next
       * invocation — so `--dry-run` produced a verdict, said it had written nothing, and then
       * that verdict became the permanent answer for the task.
       */
      if (!this.opts.dryRun) await this.opts.store.save(run.id, run)
      this.bus.emit({
        type: 'run:finished',
        runId: run.id,
        state: run.state,
        ...(run.terminalReason ? { reason: run.terminalReason } : {}),
      })
      return run
    } finally {
      await lease.release()
    }
  }

  private async preflight(run: Run, inFlight: number): Promise<RunEvent> {
    const outcomes = await runPreflight(this.opts.gates, { task: run.task, inFlight })
    for (const outcome of outcomes) {
      this.bus.emit({ type: 'gate:result', runId: run.id, phase: 'preflight', outcome })
    }
    return allPassed(outcomes)
      ? { type: 'preflight_passed', outcomes }
      : { type: 'preflight_failed', outcomes }
  }

  /**
   * Execute the effects of one transition.
   *
   * Returns the next event to feed back, when an effect produces one. Only agent dispatch and
   * verification do; everything else is a side effect with no consequence for the machine.
   */
  private async executeEffects(run: Run, effects: Effect[], before: Run): Promise<RunEvent | null> {
    let nextEvent: RunEvent | null = null

    for (const effect of effects) {
      // Key on the transition that produced this effect, not on the effect alone: the same
      // effect type recurs legitimately across rounds, and keying too broadly would suppress
      // the second one.
      const key = `${run.id}:${before.state}->${run.state}:${run.attempt}.${run.feedbackRound}:${effect.type}`

      this.bus.emit({ type: 'run:effect', runId: run.id, effect: effect.type })

      switch (effect.type) {
        case 'persist':
          // A dry run says it writes nothing, and this was the one effect that did not check.
          // The record it left behind was terminal, so the next real invocation short-circuited
          // on a verdict the user had been told was hypothetical.
          if (!this.opts.dryRun) await this.opts.store.save(run.id, run)
          break

        case 'tracker_transition':
          await this.once(key, async () => {
            if (this.opts.dryRun) return
            await this.opts.tracker?.transition(run.task.origin.id, effect.to)
          })
          break

        case 'mark_ready_for_review':
          await this.once(key, async () => {
            if (this.opts.dryRun) return
            const agent = this.opts.agent
            if (agent?.kind !== 'delegated' || !agent.markReady || !run.handleRef) return
            const url = await agent.markReady({ ref: run.handleRef, agentId: agent.id })
            if (url) {
              this.bus.emit({ type: 'log', level: 'info', message: `marked ready for review: ${url}` })
            }
          })
          break

        case 'tracker_assign':
          await this.once(key, async () => {
            if (this.opts.dryRun) return
            // Optional on the interface, and a tracker without assignees simply does not have
            // it — that is not a failure worth reporting.
            await this.opts.tracker?.assignToSelf?.(run.task.origin.id)
          })
          break

        case 'tracker_comment':
          await this.once(key, async () => {
            if (this.opts.dryRun) return
            await this.opts.tracker?.comment(run.task.origin.id, effect.body)
          })
          break

        case 'tracker_label':
          await this.once(key, async () => {
            if (this.opts.dryRun) return
            await this.opts.tracker?.setLabels(run.task.origin.id, effect.add, effect.remove)
          })
          break

        case 'notify':
          await this.once(key, async () => {
            if (this.opts.dryRun) return
            for (const n of this.opts.notifiers ?? []) {
              await n.send({ level: effect.level, title: effect.title, body: effect.body, runId: run.id })
            }
          })
          break

        case 'dispatch_agent': {
          /*
           * Deliberately not wrapped in `applyOnce`.
           *
           * Dispatch is guarded by the run's own state instead: a run only reaches this effect
           * from a state that is genuinely awaiting an agent, and the lease stops two workers
           * racing. Keying it durably would also block the case that matters most — a run
           * resumed after a crash, whose previous dispatch produced no recorded result and
           * must be redone.
           */
          nextEvent = await this.dispatch(run, effect.feedback)
          break
        }

        case 'run_verify_gates': {
          if (!this.opts.runner) {
            // Silently passing would let unverified work reach review, which is worse than
            // stopping: the gates are the reason the change is trustworthy.
            nextEvent = {
              type: 'verify_failed',
              outcomes: [
                {
                  gate: 'runner',
                  verdict: 'escalate',
                  reason: 'no runner is configured, so the change could not be verified',
                  hint: 'Configure `runner` on the engine, or verify this change by hand.',
                },
              ],
            }
            break
          }
          /*
           * Ask where this result should be verified before assuming it is here.
           *
           * A failure to prepare that place is an escalation, not a pass — a gate that could
           * not look at the change has not approved it.
           */
          let verifyIn: Runner = this.opts.runner
          if (this.opts.verifyRunner) {
            let resolved: Runner | null = null
            let failure: string | null = null
            try {
              resolved = await this.opts.verifyRunner(effect.result)
            } catch (err) {
              failure = (err as Error).message
            }
            if (!resolved) {
              nextEvent = {
                type: 'verify_failed',
                outcomes: [
                  {
                    gate: 'verify-workspace',
                    verdict: 'escalate',
                    reason: `the change could not be prepared for verification${failure ? `: ${failure}` : ''}`,
                    hint: 'Nothing was checked. Review this change by hand rather than treating it as verified.',
                  },
                ],
              }
              break
            }
            verifyIn = resolved
          }

          const outcomes = await runVerify(this.opts.gates, {
            task: run.task,
            result: effect.result,
            runner: verifyIn,
          })
          for (const outcome of outcomes) {
            this.bus.emit({ type: 'gate:result', runId: run.id, phase: 'verify', outcome })
          }
          nextEvent = allPassed(outcomes)
            ? { type: 'verify_passed', outcomes }
            : { type: 'verify_failed', outcomes }
          break
        }

        case 'dispose_runner':
          // Left to the caller: the working tree usually needs to outlive the run so a human
          // can inspect what the agent did.
          break
      }
    }

    return nextEvent
  }

  private async once(key: string, fn: () => Promise<void>): Promise<boolean> {
    return this.opts.store.applyOnce(key, fn)
  }

  private async dispatch(run: Run, feedback?: Feedback): Promise<RunEvent | null> {
    const agent = this.opts.agent
    if (!agent) {
      return {
        type: 'agent_failed',
        error:
          'this run needs an agent, but the engine was created without one. ' +
          'Configure `agent` if you intend to dispatch work, not only record events.',
      }
    }

    const prompt = await this.opts.renderPrompt(run.task, feedback)

    if (agent.kind === 'delegated') {
      return this.dispatchDelegated(agent, run, prompt, feedback)
    }

    const driven = agent as DrivenAgent
    const runner = this.opts.runner
    if (!runner) {
      // A driven agent runs inside a sandbox we provide. Without one there is nowhere for the
      // work to happen, and pretending otherwise would produce an empty "success".
      return {
        type: 'agent_failed',
        error:
          `${driven.displayName} runs in a sandbox this engine provides, but no runner is ` +
          'configured. Set `runner` on the engine.',
      }
    }

    this.bus.emit({
      type: 'agent:dispatched',
      runId: run.id,
      agentId: driven.id,
      round: run.feedbackRound,
    })

    if (this.opts.dryRun) {
      /*
       * Stop here rather than inventing a result.
       *
       * Feeding a synthetic change through the verify gates produces confident, wrong output —
       * a fabricated filename fails path-scope, which drives a correction loop and ends in a
       * fake escalation. A dry run should exercise exactly what costs nothing (gating, prompt
       * assembly) and then say plainly where it stopped.
       */
      this.bus.emit({
        type: 'agent:progress',
        runId: run.id,
        message: `would dispatch ${driven.id} with a ${prompt.length}-character prompt`,
      })
      this.bus.emit({ type: 'log', level: 'info', message: `--- prompt preview ---\n${prompt}` })
      return null
    }

    try {
      const { result, handle } = await driven.run({
        task: run.task,
        prompt,
        runner,
        ...(feedback ? { feedback } : {}),
        ...(run.handleRef ? { resumeFrom: { ref: run.handleRef, agentId: driven.id } } : {}),
        ...(this.opts.signal ? { signal: this.opts.signal } : {}),
      })

      this.bus.emit({
        type: 'agent:finished',
        runId: run.id,
        status: result.status,
        filesChanged: result.filesChanged.length,
      })

      run.handleRef = handle.ref

      if (result.status === 'refused') {
        return { type: 'agent_refused', reason: result.error ?? result.summary }
      }
      if (result.status === 'failed') {
        return {
          type: 'agent_failed',
          error: result.error ?? 'agent reported failure',
          ...(result.recovery ? { recovery: result.recovery } : {}),
        }
      }
      return { type: 'agent_succeeded', result }
    } catch (err) {
      return { type: 'agent_failed', error: (err as Error).message }
    }
  }

  /**
   * Hand work to a vendor's cloud.
   *
   * A revision round is a `nudge` on the existing handle rather than a fresh delegation:
   * delegating again would create a second artefact, and the vendor would work on the task
   * twice in parallel.
   */
  private async dispatchDelegated(
    agent: DelegatedAgent,
    run: Run,
    prompt: string,
    feedback?: Feedback,
  ): Promise<RunEvent | null> {
    this.bus.emit({
      type: 'agent:dispatched',
      runId: run.id,
      agentId: agent.id,
      round: run.feedbackRound,
    })

    if (this.opts.dryRun) {
      this.bus.emit({
        type: 'agent:progress',
        runId: run.id,
        message: `would delegate to ${agent.id} with a ${prompt.length}-character artefact`,
      })
      this.bus.emit({ type: 'log', level: 'info', message: `--- prompt preview ---\n${prompt}` })
      return null
    }

    try {
      if (feedback && run.handleRef) {
        await agent.nudge({ ref: run.handleRef, agentId: agent.id }, feedback)
        return { type: 'agent_started', handleRef: run.handleRef }
      }

      const handle = await agent.delegate({ task: run.task, prompt })
      run.handleRef = handle.ref
      return { type: 'agent_started', handleRef: handle.ref }
    } catch (err) {
      return { type: 'agent_failed', error: (err as Error).message }
    }
  }

  /**
   * Poll a delegated agent until it produces a result.
   *
   * Backs off up to the adapter's own interval, because vendors differ by orders of magnitude
   * in how long they take — polling a cloud agent every second for twenty minutes is rude to
   * the API and tells you nothing you would not learn a minute later.
   */
  private async observeDelegated(agent: DelegatedAgent, run: Run): Promise<RunEvent> {
    const timeoutMs = this.opts.delegatedTimeoutMs ?? 45 * 60_000
    const maxInterval = agent.pollIntervalMs ?? 20_000
    const started = Date.now()
    // Bound the first interval by the adapter's own cadence too. An adapter that declares it
    // can be polled quickly should not sit through a fixed opening delay it never asked for.
    let interval = Math.min(2_000, maxInterval)
    let observations = 0

    while (Date.now() - started < timeoutMs) {
      if (this.opts.signal?.aborted) {
        return { type: 'cancelled', reason: 'aborted while waiting for the agent' }
      }

      await new Promise((resolve) => setTimeout(resolve, interval))
      interval = Math.min(Math.round(interval * 1.6), maxInterval)
      observations += 1

      let result
      try {
        result = await agent.observe({ ref: run.handleRef ?? '', agentId: agent.id })
      } catch (err) {
        // A transient API failure is not the agent failing. Keep waiting; the timeout is the
        // backstop.
        this.bus.emit({
          type: 'log',
          level: 'warn',
          message: `observation ${observations} failed: ${(err as Error).message}`,
        })
        continue
      }

      if (!result) {
        this.bus.emit({
          type: 'agent:progress',
          runId: run.id,
          message: `still working (${Math.round((Date.now() - started) / 1000)}s)`,
        })
        continue
      }

      this.bus.emit({
        type: 'agent:finished',
        runId: run.id,
        status: result.status,
        filesChanged: result.filesChanged.length,
      })

      if (result.status === 'refused') {
        return { type: 'agent_refused', reason: result.error ?? result.summary }
      }
      if (result.status === 'failed') {
        return {
          type: 'agent_failed',
          error: result.error ?? 'agent reported failure',
          ...(result.recovery ? { recovery: result.recovery } : {}),
        }
      }
      return { type: 'agent_succeeded', result }
    }

    return { type: 'timed_out', afterMs: Date.now() - started }
  }

  /**
   * Feed an external event — a human review, a webhook — into an existing run.
   *
   * Returns whether the event was actually applied. Returning the unchanged run on its own
   * would let a caller report success when another worker held the lease and nothing happened,
   * which is the kind of silent no-op that makes automation impossible to trust.
   */
  async submit(runId: string, event: RunEvent): Promise<SubmitResult> {
    const stored = (await this.opts.store.load(runId)) as Run | null
    if (!stored) return { run: null, applied: false, reason: `no run named "${runId}"` }

    /*
     * Size the lease to what this event will actually do.
     *
     * Most events are fast, and a long lease on a fast operation only widens the window in
     * which a crashed process wedges the run — a CLI killed by a closed pipe is an ordinary way
     * for that to happen. But some events are not fast: `review_changes_requested` dispatches
     * an agent, which runs for minutes. Holding a sixty-second lease across that hands the run
     * to a second worker while the first is still working in it.
     *
     * The reducer is pure, so asking it what this event leads to costs nothing and commits to
     * nothing.
     */
    const dispatches = reduce(stored, event).effects.some((e) => e.type === 'dispatch_agent')
    const ttl = dispatches
      ? (this.opts.leaseTtlMs ?? 30 * 60_000)
      : (this.opts.submitLeaseTtlMs ?? 60_000)

    const lease = await this.opts.store.acquireLease(runId, ttl)
    if (!lease.held) {
      return {
        run: stored,
        applied: false,
        reason: 'another worker is processing this run; the event was not applied',
      }
    }

    try {
      let run = stored
      let pending: RunEvent | null = event
      let applied = false

      while (pending !== null) {
        const before = run
        const { run: next, effects, applied: didApply } = reduce(run, pending)
        run = next
        if (didApply) applied = true
        pending = await this.executeEffects(run, effects, before)
        if (TERMINAL.has(run.state)) break
      }

      if (!this.opts.dryRun) await this.opts.store.save(run.id, run)
      return {
        run,
        applied,
        // An event that does not apply in the current state is ordinary traffic — a redelivery
        // arriving after the run moved on — but the caller should still know it changed nothing.
        ...(applied ? {} : { reason: `a ${event.type} event does not apply to a run in "${stored.state}"` }),
      }
    } finally {
      await lease.release()
    }
  }
}
