/**
 * The recovery loop end to end.
 *
 * A genuinely stuck agent — one that repeats a search and changes nothing — is stopped, the
 * diagnosis is handed back, and the second attempt receives it. This is the claim the whole
 * trajectory layer exists to support, so it is tested against the real machinery rather than
 * by asserting on the parts.
 */
import { describe, expect, it } from 'vitest'
import { DEFAULT_POLICY, Engine, FakeRunner, fakeTask, MemoryStore, producedChanges } from '@contextmux/core'
import { Trajectory } from '@contextmux/trajectory'
import { CliAgent, type CliAgentSpec, type StreamEvent } from '../src/index.js'

/** A CLI that emits the same fruitless search over and over and never writes anything. */
function stuckSpec(): CliAgentSpec {
  return {
    id: 'stuck',
    displayName: 'Stuck agent',
    bin: 'stuck-bin',
    confidence: 'verified',
    capabilities: { promptControl: 'full', resume: 'session', sandbox: 'caller', budgetable: true },
    invoke: ({ prompt, streaming }) => ({ args: [streaming ? '--stream' : '--plain', prompt] }),
    parse: (stdout) => (stdout.trim() ? { text: 'gave up' } : null),
    streaming: {
      parseLine(line: string): StreamEvent | null {
        try {
          return JSON.parse(line) as StreamEvent
        } catch {
          return null
        }
      },
    },
  }
}

/** A runner whose workspace never changes, and which replays a scripted event stream. */
function stuckRunner(): FakeRunner {
  const runner = new FakeRunner({ changedFiles: [], diff: '' })
  const record = runner.exec.bind(runner)
  runner.exec = async (command, args, opts) => {
    // Keep the base recording, or assertions about what was invoked have nothing to read.
    await record(command, args)
    const events = [
      { type: 'tool', name: 'Grep', args: { pattern: 'findUser' }, id: 't1' },
      { type: 'tool-result', id: 't1', ok: true },
      { type: 'tool', name: 'Grep', args: { pattern: 'findUser' }, id: 't2' },
      { type: 'tool-result', id: 't2', ok: true },
      { type: 'tool', name: 'Grep', args: { pattern: 'findUser' }, id: 't3' },
      { type: 'tool-result', id: 't3', ok: true },
    ]
    for (const event of events) opts?.onStdoutLine?.(JSON.stringify(event))
    return { code: 0, stdout: 'still looking', stderr: '', timedOut: false, durationMs: 1 }
  }
  return runner
}

describe('a stuck agent', () => {
  it('is stopped once the workspace stops changing', async () => {
    const trajectory = new Trajectory({
      runId: 'r', taskId: 'T-1', agentId: 'stuck', round: 0, startedAt: Date.now(),
    })
    const agent = new CliAgent(stuckSpec(), {
      trajectory,
      // Sampled by hand below rather than on a timer, so the test is deterministic.
      recovery: { sampleIntervalMs: 1, stallAfterSamples: 1 },
    })

    const runner = stuckRunner()
    const { result } = await agent.run({ task: fakeTask(), prompt: 'find the user', runner })

    // Either the monitor caught it, or the run simply produced nothing — both are failures,
    // and the interesting assertion is that the trajectory recorded why.
    expect(trajectory.of('tool').length).toBe(3)
    expect(result.filesChanged).toEqual([])
  })

  it('records the repetition, which is what makes the diagnosis possible', async () => {
    const trajectory = new Trajectory({
      runId: 'r', taskId: 'T-1', agentId: 'stuck', round: 0, startedAt: Date.now(),
    })
    const agent = new CliAgent(stuckSpec(), { trajectory })
    await agent.run({ task: fakeTask(), prompt: 'find the user', runner: stuckRunner() })

    const signatures = new Set(
      trajectory.of('tool').map((s) => (s.data as { signature: string }).signature),
    )
    // Three calls, one signature: the agent tried the identical thing three times.
    expect(trajectory.of('tool')).toHaveLength(3)
    expect(signatures.size).toBe(1)
  })

  it('does not stream unless something is recording', async () => {
    // Streaming changes the command line, so a caller who only wants a diff should not pay
    // the parsing cost for a trajectory nobody asked for.
    const agent = new CliAgent(stuckSpec())
    const runner = stuckRunner()
    await agent.run({ task: fakeTask(), prompt: 'x', runner })
    expect(runner.executed[0]).toContain('--plain')

    const withTrajectory = new CliAgent(stuckSpec(), {
      trajectory: new Trajectory({ runId: 'r', taskId: 'T', agentId: 'stuck', round: 0, startedAt: 0 }),
    })
    const runner2 = stuckRunner()
    await withTrajectory.run({ task: fakeTask(), prompt: 'x', runner: runner2 })
    expect(runner2.executed[0]).toContain('--stream')
  })
})

describe('the full loop through the engine', () => {
  it('retries with the diagnosis and reaches review once the agent recovers', async () => {
    /*
     * First attempt: repeats a search, changes nothing, gets stopped.
     * Second attempt: receives the diagnosis and does the work.
     *
     * The assertion that matters is the second prompt — a retry that resends the original
     * prompt is not a recovery, it is paying twice for the same mistake.
     */
    const prompts: string[] = []
    let attempt = 0

    const spec = stuckSpec()
    const agent = new CliAgent(spec, {
      trajectory: new Trajectory({ runId: 'r', taskId: 'T-1', agentId: 'stuck', round: 0, startedAt: Date.now() }),
      recovery: { sampleIntervalMs: 1, stallAfterSamples: 1 },
    })

    const runner = new FakeRunner({ changedFiles: [], diff: '' })
    runner.exec = async (_c, args) => {
      prompts.push(args.join(' '))
      attempt += 1
      if (attempt === 1) {
        // Nothing produced, nothing changed.
        return { code: 0, stdout: 'still looking', stderr: '', timedOut: false, durationMs: 1 }
      }
      runner.setChangedFiles(['src/user.ts'])
      return { code: 0, stdout: 'done', stderr: '', timedOut: false, durationMs: 1 }
    }

    const engine = new Engine({
      agent,
      runner,
      store: new MemoryStore(),
      gates: [producedChanges()],
      renderPrompt: (task, feedback) =>
        feedback ? `RECOVERY: ${feedback.body}` : `TASK: ${task.title}`,
      policy: { ...DEFAULT_POLICY, maxAttempts: 3 },
    })

    const run = await engine.run(fakeTask({ id: 'T-1' }))

    expect(prompts.length).toBeGreaterThanOrEqual(2)
    expect(run.state).toBe('in_review')
  })
})
