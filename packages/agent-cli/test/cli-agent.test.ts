import { promises as fs } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { FakeRunner, fakeTask } from '@contextmux/core'
import { CliAgent, extractJson, textFromStream, REFUSAL_INSTRUCTION, type CliAgentSpec } from '../src/index.js'

/** A minimal spec, so the tests exercise the shared flow rather than any vendor. */
const spec: CliAgentSpec = {
  id: 'test-agent',
  displayName: 'Test agent',
  bin: 'test-bin',
  confidence: 'verified',
  capabilities: { promptControl: 'full', resume: 'session', sandbox: 'caller', budgetable: true },
  invoke: ({ prompt, systemPrompt, budget, resumeSessionId, isolated }) => ({
    args: [
      '--prompt', prompt,
      '--system', systemPrompt,
      ...(budget?.maxTurns ? ['--turns', String(budget.maxTurns)] : []),
      ...(resumeSessionId ? ['--resume', resumeSessionId] : []),
      ...(isolated ? ['--unattended'] : []),
    ],
  }),
  parse: (stdout) => {
    const json = extractJson(stdout)
    if (!json) return null
    return {
      text: String(json['text'] ?? ''),
      ...(json['session'] ? { sessionId: String(json['session']) } : {}),
      ...(json['cost'] !== undefined ? { usage: { costUsd: Number(json['cost']) } } : {}),
      ...(json['error'] === true ? { isError: true } : {}),
      ...(json['stop'] ? { stopReason: String(json['stop']) } : {}),
    }
  },
}

function runnerWith(stdout: string, opts: { code?: number; files?: string[]; diff?: string } = {}) {
  const runner = new FakeRunner({
    ...(opts.files ? { changedFiles: opts.files } : { changedFiles: ['src/a.ts'] }),
    ...(opts.diff ? { diff: opts.diff } : {}),
  })
  const original = runner.exec.bind(runner)
  runner.exec = async (command, args) => {
    await original(command, args)
    return { code: opts.code ?? 0, stdout, stderr: '', timedOut: false, durationMs: 5 }
  }
  return runner
}

const run = (agent: CliAgent, runner: FakeRunner, extra = {}) =>
  agent.run({ task: fakeTask(), prompt: 'do the thing', runner, ...extra })

describe('invocation', () => {
  it('passes the prompt and the system prompt through', async () => {
    const runner = runnerWith('{"text":"done"}')
    await run(new CliAgent(spec), runner)
    expect(runner.executed[0]).toContain('--prompt do the thing')
    expect(runner.executed[0]).toContain(REFUSAL_INSTRUCTION.slice(0, 40))
  })

  it('lets the caller add to the system prompt without losing the refusal instruction', async () => {
    const runner = runnerWith('{"text":"done"}')
    await run(new CliAgent(spec, { appendSystemPrompt: 'HOUSE STYLE' }), runner)
    expect(runner.executed[0]).toContain('HOUSE STYLE')
    expect(runner.executed[0]).toContain('REFUSED')
  })

  it('tells the agent it is unattended only when the workspace is isolated', async () => {
    const isolated = runnerWith('{"text":"done"}')
    await run(new CliAgent(spec, { isolated: true }), isolated)
    expect(isolated.executed[0]).toContain('--unattended')

    const shared = runnerWith('{"text":"done"}')
    await run(new CliAgent(spec, { isolated: false }), shared)
    expect(shared.executed[0]).not.toContain('--unattended')
  })

  it('resumes a session on a revision round', async () => {
    const runner = runnerWith('{"text":"fixed"}')
    await run(new CliAgent(spec), runner, {
      resumeFrom: { ref: 'x', agentId: 'test-agent', sessionId: 'session-42' },
    })
    expect(runner.executed[0]).toContain('--resume session-42')
  })

  it('applies a turn budget', async () => {
    const runner = runnerWith('{"text":"done"}')
    await run(new CliAgent(spec), runner, { budget: { maxTurns: 5 } })
    expect(runner.executed[0]).toContain('--turns 5')
  })
})

describe('results', () => {
  it('reads the change from the workspace, not from what the agent claims', async () => {
    // An agent's own account of which files it touched is a summary, and summaries drift.
    const runner = runnerWith('{"text":"I changed one file"}', {
      files: ['src/a.ts', 'src/b.ts', 'test/a.test.ts'],
    })
    const { result } = await run(new CliAgent(spec), runner)
    expect(result.filesChanged).toEqual(['src/a.ts', 'src/b.ts', 'test/a.test.ts'])
  })

  it('reports success with usage', async () => {
    const runner = runnerWith('{"text":"done","session":"s1","cost":0.42}')
    const { result, handle } = await run(new CliAgent(spec), runner)
    expect(result.status).toBe('succeeded')
    expect(result.usage?.costUsd).toBe(0.42)
    expect(handle.sessionId).toBe('s1')
  })

  it('detects a refusal and does not treat it as a failure', async () => {
    // Retrying a refusal produces the same judgement and pays to hear it twice.
    const runner = runnerWith('{"text":"REFUSED: the premise contradicts the codebase"}')
    const { result } = await run(new CliAgent(spec), runner)
    expect(result.status).toBe('refused')
    expect(result.error).toContain('premise contradicts')
  })

  it('treats a non-zero exit as a failure', async () => {
    const runner = runnerWith('{"text":"partial"}', { code: 1 })
    expect((await run(new CliAgent(spec), runner)).result.status).toBe('failed')
  })

  it('treats a self-reported error as a failure even on exit zero', async () => {
    const runner = runnerWith('{"text":"nope","error":true}')
    expect((await run(new CliAgent(spec), runner)).result.status).toBe('failed')
  })

  it('fails on unparseable output rather than inventing a result', async () => {
    const runner = runnerWith('command not found: something')
    const { result } = await run(new CliAgent(spec), runner)
    expect(result.status).toBe('failed')
    expect(result.error).toContain('command not found')
  })

  it('treats running out of turns as failure, since the change is partial', async () => {
    // Reporting success here would send an unfinished change to review.
    const runner = runnerWith('{"text":"got halfway","stop":"max_turns"}')
    const { result } = await run(new CliAgent(spec), runner)
    expect(result.status).toBe('failed')
    expect(result.error).toContain('incomplete')
  })

  it('reports a cost overrun after the fact rather than killing a run partway', async () => {
    // Killing mid-flight leaves a half-finished change, which is worse than a visible overspend.
    const runner = runnerWith('{"text":"done","cost":5.00}')
    const { result } = await run(new CliAgent(spec), runner, { budget: { maxCostUsd: 1 } })
    expect(result.status).toBe('failed')
    expect(result.error).toContain('exceeded the budget')
    expect(result.filesChanged.length).toBeGreaterThan(0)
  })

  it('reports a timeout distinctly', async () => {
    const runner = new FakeRunner({ changedFiles: [] })
    runner.exec = async () => ({ code: 143, stdout: '', stderr: '', timedOut: true, durationMs: 100 })
    const { result } = await run(new CliAgent(spec), runner)
    expect(result.error).toContain('timed out')
  })
})

describe('preflight', () => {
  it('says plainly when the binary is missing', async () => {
    const agent = new CliAgent({ ...spec, bin: 'definitely-not-installed-xyz' })
    const health = await agent.preflight()
    expect(health.ok).toBe(false)
    expect(health.detail).toContain('not on PATH')
  })

  it('reports required environment variables that are not set', async () => {
    const agent = new CliAgent({ ...spec, bin: 'node', requires: ['SOME_UNSET_KEY_XYZ'] })
    const health = await agent.preflight()
    expect(health.ok).toBe(false)
    expect(health.detail).toContain('SOME_UNSET_KEY_XYZ')
  })

  it('admits when a spec has never been run against the real CLI', async () => {
    // A confident adapter that is quietly wrong is worse than one that says it is unverified.
    const agent = new CliAgent({ ...spec, bin: 'node', confidence: 'unverified' })
    const health = await agent.preflight()
    expect(health.ok).toBe(true)
    expect(health.detail).toContain('has not been run against the real CLI')
  })
})

describe('output helpers', () => {
  it('extracts JSON from clean output', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 })
  })

  it('finds the JSON result among interleaved log lines', () => {
    const out = 'loading config...\nconnecting\n{"result":"ok"}\n'
    expect(extractJson(out)).toEqual({ result: 'ok' })
  })

  it('returns null when there is no JSON at all', () => {
    expect(extractJson('just a log line')).toBeNull()
    expect(extractJson('')).toBeNull()
  })

  it('concatenates assistant text from a stream transcript', () => {
    const stream = [
      '{"type":"assistant","message":{"content":[{"type":"text","text":"First."}]}}',
      '{"type":"assistant","message":{"content":[{"type":"text","text":"Second."}]}}',
      'not json',
    ].join('\n')
    expect(textFromStream(stream)).toBe('First.\nSecond.')
  })
})

describe('preflight', () => {
  it('reports a binary that is not installed', async () => {
    const agent = new CliAgent(spec, { bin: 'definitely-not-a-real-binary-xyz' })
    const health = await agent.preflight()

    expect(health.ok).toBe(false)
    expect(health.detail).toContain('not on PATH')
  })

  it('gives up on a binary that never answers, rather than hanging', async () => {
    /*
     * `--version` looks like the safest call there is, and mostly it is. But a CLI that is
     * installed and not logged in can prompt, and a prompt on a pipe waits forever — so the
     * check that exists to fail in a second instead never returned at all. The stub here
     * stands in for that: it ignores its arguments and outlives the check.
     */
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ctxmux-preflight-'))
    const stub = path.join(dir, 'hangs')
    await fs.writeFile(stub, '#!/bin/sh\nsleep 30\n', { mode: 0o755 })

    try {
      const agent = new CliAgent(spec, { bin: stub, preflightTimeoutMs: 300 })
      const started = Date.now()
      const health = await agent.preflight()

      expect(health.ok).toBe(false)
      expect(health.detail).toContain('did not answer')
      expect(Date.now() - started).toBeLessThan(3_000)
    } finally {
      await fs.rm(dir, { recursive: true, force: true })
    }
  })

  it('says so when an adapter has never been run against the real CLI', async () => {
    const agent = new CliAgent({ ...spec, confidence: 'unverified' }, { bin: 'echo' })
    const health = await agent.preflight()

    expect(health.ok).toBe(true)
    expect(health.detail).toContain('has not been run against the real CLI')
  })
})
