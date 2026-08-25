/**
 * Engine tests.
 *
 * These exercise the parts that only appear when the pure machine meets real effects:
 * idempotency, leases, resumption, and the routing of gate output back to the agent.
 */
import { promises as fs } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Engine } from '../src/engine.js'
import { FileStore, MemoryStore } from '../src/store.js'
import { pathScope, producedChanges, qualityGate, readiness, DEFAULT_DENY } from '../src/gates.js'
import type { Gate } from '../src/gates.js'
import {
  FakeAgent,
  FakeDelegatedAgent,
  FakeNotifier,
  FakeRunner,
  FakeTracker,
  fakeTask,
} from '../src/testing.js'
import type { EngineEvent } from '../src/events.js'
import type { RunEvent } from '../src/machine.js'
import type { TaskSpec } from '../src/task.js'

function harness(opts: {
  agent: FakeAgent
  runner?: FakeRunner
  gates?: Gate[]
  task?: TaskSpec
  store?: MemoryStore | FileStore
  dryRun?: boolean
}) {
  const runner = opts.runner ?? new FakeRunner()
  const tracker = new FakeTracker()
  const notifier = new FakeNotifier()
  const store = opts.store ?? new MemoryStore()
  const events: EngineEvent[] = []

  const engine = new Engine({
    agent: opts.agent,
    runner,
    store,
    tracker,
    notifiers: [notifier],
    gates: opts.gates ?? [],
    renderPrompt: (task, feedback) =>
      feedback ? `FIX: ${feedback.body}\n\n${task.title}` : `TASK: ${task.title}`,
    ...(opts.dryRun ? { dryRun: true } : {}),
  })
  engine.on((e) => events.push(e))

  return { engine, runner, tracker, notifier, store, events, task: opts.task ?? fakeTask() }
}

describe('happy path', () => {
  it('drives a task to review and reports it on the tracker', async () => {
    const agent = new FakeAgent({ responses: [{ status: 'succeeded' }] })
    const h = harness({ agent, gates: [producedChanges()], runner: new FakeRunner({ changedFiles: ['src/a.ts'] }) })

    const run = await h.engine.run(h.task)

    expect(run.state).toBe('in_review')
    expect(agent.dispatches).toBe(1)
    expect(h.tracker.transitions.map((t) => t.to)).toEqual(['in_progress', 'in_review'])
  })

  it('passes the rendered prompt to the agent', async () => {
    const agent = new FakeAgent({ responses: [{ status: 'succeeded' }] })
    const h = harness({ agent })
    await h.engine.run(h.task)
    expect(agent.prompts[0]).toContain('TASK: Add a currency formatting helper')
  })

  it('emits a followable event stream', async () => {
    const agent = new FakeAgent({ responses: [{ status: 'succeeded' }] })
    const h = harness({ agent })
    await h.engine.run(h.task)
    const types = h.events.map((e) => e.type)
    expect(types).toContain('run:started')
    expect(types).toContain('agent:dispatched')
    expect(types).toContain('agent:finished')
    expect(types).toContain('run:finished')
  })
})

describe('gates', () => {
  it('rejects at preflight without dispatching an agent', async () => {
    const agent = new FakeAgent({ responses: [{ status: 'succeeded' }] })
    const h = harness({
      agent,
      gates: [readiness()],
      task: fakeTask({ body: 'fix it', acceptanceCriteria: [] }),
    })

    const run = await h.engine.run(h.task)

    expect(run.state).toBe('rejected')
    expect(agent.dispatches).toBe(0)
    expect(h.tracker.comments[0]?.body).toContain('readiness')
  })

  it('sends verify-gate output back to the agent as feedback', async () => {
    // The whole point of self-correction: gate output is already precise enough to act on.
    const agent = new FakeAgent({
      responses: [
        { status: 'succeeded', filesChanged: ['src/a.ts', 'package.json'] },
        { status: 'succeeded', filesChanged: ['src/a.ts'] },
      ],
    })
    const runner = new FakeRunner({ changedFiles: ['src/a.ts', 'package.json'] })
    const h = harness({ agent, runner, gates: [pathScope({ defaultDeny: DEFAULT_DENY })] })

    // The agent "fixes" the violation on its second attempt.
    const original = agent.run.bind(agent)
    agent.run = async (input) => {
      const out = await original(input)
      runner.setChangedFiles(out.result.filesChanged)
      return out
    }

    const run = await h.engine.run(h.task)

    expect(agent.dispatches).toBe(2)
    expect(agent.feedbacks[0]?.body).toContain('package.json')
    expect(run.state).toBe('in_review')
    expect(run.feedbackRound).toBe(1)
  })

  it('runs the project quality gate through the runner', async () => {
    const agent = new FakeAgent({ responses: [{ status: 'succeeded', filesChanged: ['src/a.ts'] }] })
    const runner = new FakeRunner({
      changedFiles: ['src/a.ts'],
      commands: { 'pnpm test': { code: 0 } },
    })
    const h = harness({
      agent,
      runner,
      gates: [qualityGate()],
      task: fakeTask({ qualityGate: ['pnpm test'] }),
    })

    const run = await h.engine.run(h.task)
    expect(runner.executed).toContain('pnpm test')
    expect(run.state).toBe('in_review')
  })
})

describe('failure handling', () => {
  it('retries a failed agent, then escalates', async () => {
    const agent = new FakeAgent({ responses: [{ status: 'failed', error: 'boom' }] })
    const h = harness({ agent })

    const run = await h.engine.run(h.task)

    expect(run.state).toBe('escalated')
    expect(agent.dispatches).toBe(2)
    expect(h.notifier.sent.some((n) => n.title.includes('Escalated'))).toBe(true)
  })

  it('turns a thrown adapter error into a retry rather than a crash', async () => {
    const agent = new FakeAgent({ responses: [{ status: 'succeeded' }], throwOn: [1] })
    const h = harness({ agent })
    const run = await h.engine.run(h.task)
    expect(agent.dispatches).toBe(2)
    expect(run.state).toBe('in_review')
  })

  it('escalates a refusal without retrying', async () => {
    const agent = new FakeAgent({
      responses: [{ status: 'refused', error: 'the premise is wrong' }],
    })
    const h = harness({ agent })
    const run = await h.engine.run(h.task)
    expect(run.state).toBe('escalated')
    expect(agent.dispatches).toBe(1)
  })
})

describe('idempotency and leases', () => {
  it('does not re-dispatch or re-comment when the same run is invoked twice', async () => {
    const agent = new FakeAgent({ responses: [{ status: 'succeeded' }] })
    const h = harness({ agent })

    await h.engine.run(h.task)
    const commentsAfterFirst = h.tracker.comments.length
    await h.engine.run(h.task)

    expect(agent.dispatches).toBe(1)
    expect(h.tracker.comments).toHaveLength(commentsAfterFirst)
  })

  it('refuses to advance a run another worker holds', async () => {
    const agent = new FakeAgent({ responses: [{ status: 'succeeded' }] })
    const h = harness({ agent })

    const lease = await h.store.acquireLease(`run-${h.task.id}`, 60_000)
    expect(lease.held).toBe(true)

    const run = await h.engine.run(h.task)

    expect(agent.dispatches).toBe(0)
    expect(run.state).toBe('discovered')
    expect(h.events.some((e) => e.type === 'log' && e.message.includes('another worker'))).toBe(true)
  })

  it('takes over an expired lease so a dead worker cannot wedge a run forever', async () => {
    const store = new MemoryStore()
    const first = await store.acquireLease('run-x', 1)
    expect(first.held).toBe(true)
    await new Promise((r) => setTimeout(r, 5))
    const second = await store.acquireLease('run-x', 60_000)
    expect(second.held).toBe(true)
  })

  it('applies a keyed effect exactly once', async () => {
    const store = new MemoryStore()
    let calls = 0
    const inc = async () => {
      calls += 1
    }
    expect(await store.applyOnce('k', inc)).toBe(true)
    expect(await store.applyOnce('k', inc)).toBe(false)
    expect(calls).toBe(1)
  })
})

describe('resumption', () => {
  let dir: string
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ctxmux-engine-'))
  })
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true })
  })

  it('does not restart a run that already finished', async () => {
    const store = new FileStore(dir)
    const agent = new FakeAgent({ responses: [{ status: 'succeeded' }] })
    const h = harness({ agent, store })

    await h.engine.run(h.task)
    await h.engine.submit(`run-${h.task.id}`, { type: 'review_approved' })

    const agent2 = new FakeAgent({ responses: [{ status: 'succeeded' }] })
    const h2 = harness({ agent: agent2, store, task: h.task })
    const run = await h2.engine.run(h.task)

    expect(run.state).toBe('completed')
    expect(agent2.dispatches).toBe(0)
  })

  it('survives a process boundary via the file store', async () => {
    const agent = new FakeAgent({ responses: [{ status: 'succeeded' }] })
    const h = harness({ agent, store: new FileStore(dir) })
    await h.engine.run(h.task)

    // A fresh store object, as a new process would have.
    const reopened = new FileStore(dir)
    const loaded = (await reopened.load(`run-${h.task.id}`)) as { state: string } | null
    expect(loaded?.state).toBe('in_review')
  })

  it('writes run files atomically', async () => {
    const store = new FileStore(dir)
    await store.save('run-a', { state: 'working' })
    const files = await fs.readdir(path.join(dir, 'runs'))
    expect(files.every((f) => !f.endsWith('.tmp'))).toBe(true)
  })
})

describe('external events', () => {
  it('accepts a review decision and completes the run', async () => {
    const agent = new FakeAgent({ responses: [{ status: 'succeeded' }] })
    const h = harness({ agent })
    await h.engine.run(h.task)

    const { run, applied } = await h.engine.submit(`run-${h.task.id}`, { type: 'review_approved' })
    expect(applied).toBe(true)
    expect(run?.state).toBe('completed')
    expect(h.tracker.transitions.at(-1)?.to).toBe('done')
  })

  it('sends requested changes back to the agent', async () => {
    const agent = new FakeAgent({ responses: [{ status: 'succeeded' }] })
    const h = harness({ agent })
    await h.engine.run(h.task)

    const event: RunEvent = {
      type: 'review_changes_requested',
      feedback: { round: 1, source: 'reviewer', body: 'use the shared helper' },
    }
    const { run } = await h.engine.submit(`run-${h.task.id}`, event)

    // A driven agent's dispatch is synchronous, so the whole revision cycle — re-dispatch,
    // verify, back to review — completes within this call.
    expect(agent.dispatches).toBe(2)
    expect(agent.prompts[1]).toContain('use the shared helper')
    expect(run?.feedbackRound).toBe(1)
    expect(run?.state).toBe('in_review')
  })

  it('returns null for a run that does not exist', async () => {
    const h = harness({ agent: new FakeAgent({ responses: [{ status: 'succeeded' }] }) })
    const missing = await h.engine.submit('run-nope', { type: 'review_approved' })
    expect(missing.run).toBeNull()
    expect(missing.applied).toBe(false)
    expect(missing.reason).toContain('no run named')
  })
})

describe('dry run', () => {
  it('gates and assembles the prompt, then stops before dispatching', async () => {
    const agent = new FakeAgent({ responses: [{ status: 'succeeded' }] })
    const h = harness({ agent, dryRun: true })

    const run = await h.engine.run(h.task)

    expect(agent.dispatches).toBe(0)
    expect(h.tracker.transitions).toHaveLength(0)
    expect(h.tracker.comments).toHaveLength(0)
    // Stopping at `ready` is the honest outcome: everything free has run, nothing was spent.
    expect(run.state).toBe('ready')
  })

  it('does not fabricate a result and run verify gates against it', async () => {
    // A synthetic filename fails path-scope, drives a correction loop and ends in a fake
    // escalation — confident output describing something that never happened.
    const agent = new FakeAgent({ responses: [{ status: 'succeeded' }] })
    const h = harness({
      agent,
      dryRun: true,
      gates: [pathScope({ defaultDeny: DEFAULT_DENY }), producedChanges()],
      task: fakeTask({ scope: { allow: ['src/**'], deny: [] } }),
    })

    const run = await h.engine.run(h.task)

    expect(run.state).toBe('ready')
    expect(run.gateOutcomes.filter((o) => o.verdict !== 'pass')).toHaveLength(0)
  })

  it('previews the prompt so prompt assembly can be debugged for free', async () => {
    const agent = new FakeAgent({ responses: [{ status: 'succeeded' }] })
    const h = harness({ agent, dryRun: true })
    await h.engine.run(h.task)

    expect(h.events.some((e) => e.type === 'agent:progress' && e.message.includes('would dispatch'))).toBe(true)
    expect(h.events.some((e) => e.type === 'log' && e.message.includes('prompt preview'))).toBe(true)
  })
})

describe('crash recovery', () => {
  let dir: string
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ctxmux-crash-'))
  })
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true })
  })

  it('re-dispatches a run that died mid-agent', async () => {
    const store = new FileStore(dir)
    const task = fakeTask()

    // Simulate a process that persisted `ready` and then died before recording a result.
    await store.save(`run-${task.id}`, {
      id: `run-${task.id}`,
      task,
      state: 'ready',
      attempt: 0,
      feedbackRound: 0,
      policy: { maxFeedbackRounds: 2, maxAttempts: 2, selfCorrect: true },
      history: [],
      gateOutcomes: [],
    })

    const agent = new FakeAgent({ responses: [{ status: 'succeeded' }] })
    const h = harness({ agent, store, task })
    const run = await h.engine.run(task)

    expect(agent.dispatches).toBe(1)
    expect(run.state).toBe('in_review')
  })

  it('carries pending feedback across a restart rather than re-running the original task', async () => {
    // Losing the correction context would send the agent back at the task it already attempted,
    // silently wasting a revision round.
    const store = new FileStore(dir)
    const task = fakeTask()
    await store.save(`run-${task.id}`, {
      id: `run-${task.id}`,
      task,
      state: 'revising',
      attempt: 0,
      feedbackRound: 1,
      policy: { maxFeedbackRounds: 2, maxAttempts: 2, selfCorrect: true },
      history: [],
      gateOutcomes: [],
      pendingFeedback: { round: 1, source: 'verify-gates', body: 'you changed package.json' },
    })

    const agent = new FakeAgent({ responses: [{ status: 'succeeded' }] })
    const h = harness({ agent, store, task })
    await h.engine.run(task)

    expect(agent.feedbacks[0]?.body).toContain('package.json')
  })

  it('leaves a run awaiting human review untouched on resume', async () => {
    const store = new FileStore(dir)
    const agent = new FakeAgent({ responses: [{ status: 'succeeded' }] })
    const h = harness({ agent, store })
    await h.engine.run(h.task)
    expect(agent.dispatches).toBe(1)

    const agent2 = new FakeAgent({ responses: [{ status: 'succeeded' }] })
    const h2 = harness({ agent: agent2, store, task: h.task })
    const run = await h2.engine.run(h.task)

    expect(agent2.dispatches).toBe(0)
    expect(run.state).toBe('in_review')
  })
})

describe('delegated agents', () => {
  const delegatedHarness = (
    agent: FakeDelegatedAgent,
    opts: { gates?: Gate[]; wait?: boolean; dryRun?: boolean } = {},
  ) => {
    const runner = new FakeRunner({ changedFiles: ['src/thing.ts'] })
    const tracker = new FakeTracker()
    const store = new MemoryStore()
    const events: EngineEvent[] = []
    const engine = new Engine({
      agent,
      runner,
      store,
      tracker,
      gates: opts.gates ?? [],
      renderPrompt: (task, feedback) => (feedback ? `FIX: ${feedback.body}` : `TASK: ${task.title}`),
      delegatedTimeoutMs: 2_000,
      ...(opts.wait === false ? { waitForDelegated: false } : {}),
      ...(opts.dryRun ? { dryRun: true } : {}),
    })
    engine.on((e) => events.push(e))
    return { engine, tracker, store, events, task: fakeTask() }
  }

  it('delegates, polls, and resolves', async () => {
    const agent = new FakeDelegatedAgent({
      observations: [null, null, { status: 'succeeded', filesChanged: ['src/thing.ts'] }],
    })
    const h = delegatedHarness(agent, { gates: [producedChanges()] })

    const run = await h.engine.run(h.task)

    expect(agent.delegations).toBe(1)
    expect(agent.observations).toBeGreaterThanOrEqual(3)
    expect(run.state).toBe('in_review')
  })

  it('hands the rendered artefact to the vendor', async () => {
    const agent = new FakeDelegatedAgent({ observations: [{ status: 'succeeded' }] })
    const h = delegatedHarness(agent)
    await h.engine.run(h.task)
    expect(agent.prompts[0]).toContain('TASK: Add a currency formatting helper')
  })

  it('nudges an existing handle on a revision round instead of delegating twice', async () => {
    // Delegating again would create a second artefact and have the vendor work the task twice.
    const agent = new FakeDelegatedAgent({
      observations: [{ status: 'succeeded', filesChanged: ['src/a.ts', 'package.json'] }],
    })
    const h = delegatedHarness(agent, { gates: [pathScope({ defaultDeny: DEFAULT_DENY })] })

    await h.engine.run(h.task)

    expect(agent.delegations).toBe(1)
    expect(agent.nudges.length).toBeGreaterThan(0)
    expect(agent.nudges[0]?.body).toContain('package.json')
  })

  it('rides out a transient observation failure rather than failing the run', async () => {
    const agent = new FakeDelegatedAgent({
      observations: [{ status: 'succeeded' }],
      observeErrors: 2,
    })
    const h = delegatedHarness(agent)

    const run = await h.engine.run(h.task)

    expect(run.state).toBe('in_review')
    expect(h.events.some((e) => e.type === 'log' && e.message.includes('observation'))).toBe(true)
  })

  it('times out when the vendor never finishes', async () => {
    const agent = new FakeDelegatedAgent({ observations: [null] })
    const h = delegatedHarness(agent)

    const run = await h.engine.run(h.task)

    // A timeout is a failure, so it retries once and then escalates.
    expect(run.state).toBe('escalated')
    expect(run.terminalReason).toContain('timed out')
  })

  it('reports a failed handoff without pretending work started', async () => {
    const agent = new FakeDelegatedAgent({ observations: [], failDelegate: 'no permission to assign' })
    const h = delegatedHarness(agent)

    const run = await h.engine.run(h.task)

    expect(run.state).toBe('escalated')
    expect(run.terminalReason).toContain('no permission to assign')
  })

  it('returns while the vendor works when waiting is disabled', async () => {
    // How a webhook-driven service uses this: hand off, return, resume via `submit`.
    const agent = new FakeDelegatedAgent({ observations: [{ status: 'succeeded' }] })
    const h = delegatedHarness(agent, { wait: false })

    const run = await h.engine.run(h.task)

    expect(run.state).toBe('working')
    expect(agent.delegations).toBe(1)
    expect(agent.observations).toBe(0)
  })

  it('resolves a parked run when the result arrives as an event', async () => {
    const agent = new FakeDelegatedAgent({ observations: [{ status: 'succeeded' }] })
    const h = delegatedHarness(agent, { wait: false })
    await h.engine.run(h.task)

    const { run } = await h.engine.submit(`run-${h.task.id}`, {
      type: 'agent_succeeded',
      result: { status: 'succeeded', filesChanged: ['src/a.ts'], summary: 'done' },
    })

    expect(run?.state).toBe('in_review')
  })

  it('does not delegate on a dry run', async () => {
    const agent = new FakeDelegatedAgent({ observations: [{ status: 'succeeded' }] })
    const h = delegatedHarness(agent, { dryRun: true })

    const run = await h.engine.run(h.task)

    expect(agent.delegations).toBe(0)
    expect(run.state).toBe('ready')
  })
})

describe('submit reports honestly', () => {
  it('says the event was not applied when another worker holds the lease', async () => {
    // Returning the unchanged run on its own let a caller print "run is now in_review" when
    // nothing had happened. A CLI killed by a closed pipe leaves exactly this state behind.
    const agent = new FakeAgent({ responses: [{ status: 'succeeded' }] })
    const h = harness({ agent })
    await h.engine.run(h.task)

    const held = await h.store.acquireLease(`run-${h.task.id}`, 60_000)
    expect(held.held).toBe(true)

    const outcome = await h.engine.submit(`run-${h.task.id}`, { type: 'review_approved' })

    expect(outcome.applied).toBe(false)
    expect(outcome.reason).toContain('another worker')
    expect(outcome.run?.state).toBe('in_review')
  })

  it('says so when an event does not apply to the current state', async () => {
    const agent = new FakeAgent({ responses: [{ status: 'succeeded' }] })
    const h = harness({ agent })
    await h.engine.run(h.task)
    await h.engine.submit(`run-${h.task.id}`, { type: 'review_approved' })

    // The run is finished; a redelivered approval changes nothing.
    const outcome = await h.engine.submit(`run-${h.task.id}`, { type: 'review_approved' })

    expect(outcome.applied).toBe(false)
    expect(outcome.reason).toContain('does not apply')
  })

  it('recovers from a lease left behind by a crashed process', async () => {
    const agent = new FakeAgent({ responses: [{ status: 'succeeded' }] })
    const h = harness({ agent })
    await h.engine.run(h.task)

    // A process that died without releasing. The short TTL means recovery is quick.
    const abandoned = await h.store.acquireLease(`run-${h.task.id}`, 1)
    expect(abandoned.held).toBe(true)
    await new Promise((r) => setTimeout(r, 5))

    const outcome = await h.engine.submit(`run-${h.task.id}`, { type: 'review_approved' })
    expect(outcome.applied).toBe(true)
    expect(outcome.run?.state).toBe('completed')
  })
})

describe('submit leases', () => {
  /** A store that remembers what lease durations were asked for. */
  class RecordingStore extends MemoryStore {
    readonly ttls: number[] = []
    override async acquireLease(runId: string, ttlMs: number) {
      this.ttls.push(ttlMs)
      return super.acquireLease(runId, ttlMs)
    }
  }

  it('holds a long lease for an event that dispatches an agent', async () => {
    /*
     * Submitting was assumed to be fast, so it took a sixty-second lease. But
     * `review_changes_requested` dispatches an agent, and an agent runs for minutes: the lease
     * expired while the first worker was still working, a second took the run over, and both
     * then wrote to the same worktree.
     */
    const store = new RecordingStore()
    const agent = new FakeAgent({ responses: [{ status: 'succeeded' }] })
    const { engine } = harness({ agent, store, gates: [producedChanges()] })

    const run = await engine.run(fakeTask())
    expect(run.state).toBe('in_review')

    const before = store.ttls.length
    await engine.submit(run.id, {
      type: 'review_changes_requested',
      feedback: { round: 1, source: 'reviewer', body: 'narrow the change' },
    })

    expect(store.ttls.slice(before)).toEqual([30 * 60_000])
  })

  it('holds a short lease for an event that only records something', async () => {
    // The short lease is still right for the common case: a crashed submit should not wedge a
    // run for half an hour when nothing was going to take half an hour.
    const store = new RecordingStore()
    const agent = new FakeAgent({ responses: [{ status: 'succeeded' }] })
    const { engine } = harness({ agent, store, gates: [producedChanges()] })

    const run = await engine.run(fakeTask())
    const before = store.ttls.length
    await engine.submit(run.id, { type: 'review_approved' })

    expect(store.ttls.slice(before)).toEqual([60_000])
  })

  it('does not apply the event while merely deciding how long to hold it', async () => {
    // The sizing check reduces the event to look at its effects. The reducer is pure, so that
    // must leave no trace — a run whose lease is held elsewhere must come back untouched.
    const store = new MemoryStore()
    const agent = new FakeAgent({ responses: [{ status: 'succeeded' }] })
    const { engine } = harness({ agent, store, gates: [producedChanges()] })

    const run = await engine.run(fakeTask())
    const holder = await store.acquireLease(run.id, 60_000)
    expect(holder.held).toBe(true)

    const out = await engine.submit(run.id, { type: 'review_approved' })
    expect(out.applied).toBe(false)
    expect(((await store.load(run.id)) as { state: string }).state).toBe('in_review')
  })
})

describe('re-running a task that was already judged', () => {
  const rejecting = (): Gate => ({
    name: 'readiness',
    preflight: () => ({ gate: 'readiness', verdict: 'reject', reason: 'no acceptance criteria found' }),
  })

  it('does not write state during a dry run', async () => {
    /*
     * `persist` was the one effect with no dry-run guard, so a run the user was told wrote
     * nothing left a terminal record behind — and every later invocation short-circuited on a
     * verdict that had been presented as hypothetical.
     */
    const store = new MemoryStore()
    const engine = new Engine({
      store,
      gates: [rejecting()],
      renderPrompt: () => 'prompt',
      dryRun: true,
    })

    await engine.run(fakeTask({ id: 'T-1' }))
    expect(await store.load('run-T-1')).toBeNull()
  })

  it('starts fresh when the task has changed since it was rejected', async () => {
    /*
     * A rejection at preflight means the task was not ready, so the remedy is to fix the task.
     * The stored run held the task as it was and re-running adopted that copy wholesale, so a
     * corrected ticket kept returning the old verdict forever.
     */
    const store = new MemoryStore()
    const thin = fakeTask({ id: 'T-2', body: 'too thin', acceptanceCriteria: [] })

    const first = new Engine({ store, gates: [rejecting()], renderPrompt: () => 'p' })
    expect((await first.run(thin)).state).toBe('rejected')

    // The human adds what the gate asked for.
    const fixed = fakeTask({
      id: 'T-2',
      body: 'A description long enough to be a real one, describing the change in detail.',
      acceptanceCriteria: [{ text: 'the button is inactive once resolved' }],
    })

    const second = new Engine({ store, gates: [], renderPrompt: () => 'p' })
    const run = await second.run(fixed)

    expect(run.state).not.toBe('rejected')
    expect(run.task.acceptanceCriteria).toHaveLength(1)
  })

  it('does not re-run when the task is unchanged', async () => {
    // The other half: idempotency is the reason the short-circuit exists at all.
    const store = new MemoryStore()
    const task = fakeTask({ id: 'T-3' })

    const first = new Engine({ store, gates: [rejecting()], renderPrompt: () => 'p' })
    await first.run(task)

    let gateRan = false
    const watching: Gate = {
      name: 'readiness',
      preflight: () => {
        gateRan = true
        return { gate: 'readiness', verdict: 'pass' }
      },
    }
    const second = new Engine({ store, gates: [watching], renderPrompt: () => 'p' })
    const run = await second.run(task)

    expect(gateRan).toBe(false)
    expect(run.state).toBe('rejected')
  })
})

describe('where a delegated agent’s work gets verified', () => {
  const passing: Gate = { name: 'ok', verify: () => ({ gate: 'ok', verdict: 'pass' }) }

  it('verifies in the runner the caller nominates, not the one it started with', async () => {
    /*
     * A delegated agent's changes are on a branch in the forge, not in this checkout. Verifying
     * here compiled whatever the developer happened to have open and reported the verdict as
     * the pull request's — passing over a broken change, or failing over unrelated local edits,
     * indistinguishably from a real answer.
     */
    const wrong = new FakeRunner()
    const right = new FakeRunner()
    let verifiedIn: unknown = null

    const engine = new Engine({
      agent: new FakeAgent({ responses: [{ status: 'succeeded', filesChanged: ['a.ts'], summary: 's' }] }),
      runner: wrong,
      store: new MemoryStore(),
      gates: [
        {
          name: 'which-runner',
          verify: ({ runner }) => {
            verifiedIn = runner
            return { gate: 'which-runner', verdict: 'pass' }
          },
        },
      ],
      renderPrompt: () => 'p',
      verifyRunner: async () => right,
    })

    await engine.run(fakeTask())
    expect(verifiedIn).toBe(right)
    expect(verifiedIn).not.toBe(wrong)
  })

  it('escalates when the change cannot be prepared, rather than passing', async () => {
    // A gate that could not look at the change has not approved it. Returning null used to be
    // the tempting shortcut here; it would mean every unfetchable branch sailed through.
    const engine = new Engine({
      agent: new FakeAgent({ responses: [{ status: 'succeeded', filesChanged: ['a.ts'], summary: 's' }] }),
      runner: new FakeRunner(),
      store: new MemoryStore(),
      gates: [passing],
      renderPrompt: () => 'p',
      verifyRunner: async () => null,
    })

    const run = await engine.run(fakeTask())
    expect(run.state).toBe('escalated')
    expect(run.gateOutcomes.some((o) => o.gate === 'verify-workspace')).toBe(true)
  })

  it('reports why preparation failed', async () => {
    const engine = new Engine({
      agent: new FakeAgent({ responses: [{ status: 'succeeded', filesChanged: ['a.ts'], summary: 's' }] }),
      runner: new FakeRunner(),
      store: new MemoryStore(),
      gates: [passing],
      renderPrompt: () => 'p',
      verifyRunner: async () => {
        throw new Error('could not fetch "copilot/pdc-6543" from origin')
      },
    })

    const run = await engine.run(fakeTask())
    expect(run.gateOutcomes.find((o) => o.gate === 'verify-workspace')?.reason).toMatch(
      /could not fetch "copilot\/pdc-6543"/,
    )
  })

  it('uses its own runner when no nomination is made', async () => {
    // A driven agent leaves its work in the runner it was handed, so the default is right.
    const only = new FakeRunner()
    let verifiedIn: unknown = null

    const engine = new Engine({
      agent: new FakeAgent({ responses: [{ status: 'succeeded', filesChanged: ['a.ts'], summary: 's' }] }),
      runner: only,
      store: new MemoryStore(),
      gates: [
        {
          name: 'which-runner',
          verify: ({ runner }) => {
            verifiedIn = runner
            return { gate: 'which-runner', verdict: 'pass' }
          },
        },
      ],
      renderPrompt: () => 'p',
    })

    await engine.run(fakeTask())
    expect(verifiedIn).toBe(only)
  })
})
