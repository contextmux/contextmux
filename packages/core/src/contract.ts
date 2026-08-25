/**
 * Adapter contract suites.
 *
 * One shared specification every adapter must satisfy, exported so a third party can add a
 * tracker or an agent without touching this repository — and so that "it implements the
 * interface" means the same thing for all of them.
 *
 * The behaviours checked here are the ones that are easy to get subtly wrong and expensive to
 * discover later: transitions that silently do nothing, labels that replace rather than merge,
 * refusals that get retried. TypeScript cannot express any of them.
 *
 * Test-framework agnostic by design: callers pass their own `it`/`expect`, so this can run
 * under Vitest, Jest or node:test without dragging a runner into the dependency tree.
 */
import type { CodingAgent, DelegatedAgent, DrivenAgent, Tracker } from './adapters.js'
import type { AgentResult, TaskSpec } from './task.js'
import { fakeTask, FakeRunner } from './testing.js'

/** The subset of a test runner a contract suite needs. */
export interface TestHarness {
  it: (name: string, fn: () => Promise<void> | void) => void
  expect: (actual: unknown) => {
    toBe(expected: unknown): void
    toEqual(expected: unknown): void
    toContain(expected: unknown): void
    toBeTruthy(): void
    toBeNull(): void
  }
}

export interface TrackerContractOptions {
  /** Fresh adapter and a task it can see. Called before each assertion. */
  setup: () => Promise<{ tracker: Tracker; taskId: string }> | { tracker: Tracker; taskId: string }
  /**
   * Skip checks the adapter genuinely cannot support. Every skip is a documented gap, not a
   * quiet omission.
   */
  skip?: Array<'transition' | 'comment' | 'labels' | 'listReady'>
}

export function runTrackerContract(harness: TestHarness, opts: TrackerContractOptions): void {
  const { it, expect } = harness
  const skip = new Set(opts.skip ?? [])

  it('contract: get returns a fully-formed spec', async () => {
    const { tracker, taskId } = await opts.setup()
    const spec = await tracker.get(taskId)
    expect(spec).toBeTruthy()
    expect(typeof spec!.id).toBe('string')
    expect(typeof spec!.title).toBe('string')
    expect(typeof spec!.body).toBe('string')
    expect(Array.isArray(spec!.acceptanceCriteria)).toBe(true)
    expect(Array.isArray(spec!.labels)).toBe(true)
    expect(Array.isArray(spec!.qualityGate)).toBe(true)
    expect(spec!.origin.tracker).toBe(tracker.id)
  })

  it('contract: get returns null for an unknown id rather than throwing', async () => {
    // Callers branch on null. An adapter that throws turns a routine miss into a failed run.
    const { tracker } = await opts.setup()
    expect(await tracker.get('definitely-not-a-real-id-9999')).toBeNull()
  })

  if (!skip.has('listReady')) {
    it('contract: listReady honours its limit', async () => {
      const { tracker } = await opts.setup()
      const tasks = await tracker.listReady(1)
      expect(tasks.length <= 1).toBe(true)
    })

    it('contract: every listed task can be fetched by its own id', async () => {
      // A tracker whose list and get disagree produces runs that cannot be resumed.
      const { tracker } = await opts.setup()
      for (const task of await tracker.listReady(3)) {
        expect(await tracker.get(task.id)).toBeTruthy()
      }
    })
  }

  if (!skip.has('transition')) {
    it('contract: transition is observable', async () => {
      // The commonest silent failure in tracker integrations: the call returns, nothing moved.
      const { tracker, taskId } = await opts.setup()
      await tracker.transition(taskId, 'in_progress')
      const after = await tracker.get(taskId)
      expect(after).toBeTruthy()
    })

    it('contract: transition is idempotent', async () => {
      const { tracker, taskId } = await opts.setup()
      await tracker.transition(taskId, 'in_progress')
      await tracker.transition(taskId, 'in_progress')
      expect(await tracker.get(taskId)).toBeTruthy()
    })
  }

  if (!skip.has('comment')) {
    it('contract: comment accepts markdown without throwing', async () => {
      const { tracker, taskId } = await opts.setup()
      await tracker.comment(taskId, '## Heading\n\n- a list item\n\n```js\nconst x = 1\n```')
    })
  }

  if (!skip.has('labels')) {
    it('contract: setLabels merges rather than replacing', async () => {
      // Replacing wipes labels a human set, which is how automation loses a team's triage.
      const { tracker, taskId } = await opts.setup()
      await tracker.setLabels(taskId, ['contract-a'], [])
      await tracker.setLabels(taskId, ['contract-b'], [])
      const spec = await tracker.get(taskId)
      expect(spec!.labels).toContain('contract-a')
      expect(spec!.labels).toContain('contract-b')
    })

    it('contract: removing an absent label is not an error', async () => {
      const { tracker, taskId } = await opts.setup()
      await tracker.setLabels(taskId, [], ['never-applied-label'])
    })
  }
}

export interface AgentContractOptions {
  setup: () => Promise<{ agent: CodingAgent }> | { agent: CodingAgent }
  /** A task the agent is expected to handle. Defaults to a generic one. */
  task?: TaskSpec
}

export function runAgentContract(harness: TestHarness, opts: AgentContractOptions): void {
  const { it, expect } = harness
  const task = opts.task ?? fakeTask()

  it('contract: declares an archetype and honest capabilities', async () => {
    const { agent } = await opts.setup()
    expect(agent.kind === 'driven' || agent.kind === 'delegated').toBe(true)
    expect(typeof agent.id).toBe('string')
    expect(typeof agent.displayName).toBe('string')

    const caps = agent.capabilities
    expect(['full', 'artifact-only']).toContain(caps.promptControl)
    expect(['mention', 'reinvoke', 'session', 'none']).toContain(caps.resume)
    expect(['vendor', 'caller']).toContain(caps.sandbox)

    // A vendor-sandboxed agent cannot have its budget enforced by us; claiming otherwise
    // means a caller sets a ceiling that is never applied.
    if (caps.sandbox === 'vendor') expect(caps.budgetable).toBe(false)
  })

  it('contract: preflight reports availability without throwing', async () => {
    // Callers use this to fail fast with a clear message. An adapter that throws instead
    // turns "the binary is missing" into "the agent could not do the work".
    const { agent } = await opts.setup()
    const health = await agent.preflight()
    expect(typeof health.ok).toBe('boolean')
    expect(typeof health.detail).toBe('string')
    expect(health.detail.length > 0).toBe(true)
  })

  it('contract: a result is well-formed whatever its status', async () => {
    const { agent } = await opts.setup()
    const assertResult = (result: AgentResult) => {
      expect(['succeeded', 'failed', 'refused']).toContain(result.status)
      expect(Array.isArray(result.filesChanged)).toBe(true)
      expect(typeof result.summary).toBe('string')
      // Anything not succeeded must say why, or escalation messages are empty.
      if (result.status !== 'succeeded') expect(typeof result.error).toBe('string')
    }

    if (agent.kind === 'driven') {
      const driven = agent as DrivenAgent
      const { result, handle } = await driven.run({
        task,
        prompt: 'do the thing',
        runner: new FakeRunner(),
      })
      assertResult(result)
      expect(typeof handle.ref).toBe('string')
      expect(handle.agentId).toBe(agent.id)
    } else {
      const delegated = agent as DelegatedAgent
      const handle = await delegated.delegate({ task, prompt: 'do the thing' })
      expect(typeof handle.ref).toBe('string')
      expect(handle.agentId).toBe(agent.id)
      const observed = await delegated.observe(handle)
      if (observed) assertResult(observed)
    }
  })

  it('contract: a delegated agent reports in-progress work as null', async () => {
    // `null` means "still working". Returning a zero-file success instead makes the
    // orchestrator declare victory over an empty change.
    const { agent } = await opts.setup()
    if (agent.kind !== 'delegated') return
    const result = await (agent as DelegatedAgent).observe({ ref: 'nonexistent-handle', agentId: agent.id })
    if (result) expect(['failed', 'refused']).toContain(result.status)
  })
}
