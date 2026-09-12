/**
 * `askOnce` — the read-only invocation the review commands use.
 *
 * Exercised against a real child process rather than a double, because everything that can go
 * wrong here is about process behaviour: a binary that is not there, one that exits non-zero,
 * one that never finishes, one that ignores the stdin it was handed.
 */
import { describe, expect, it } from 'vitest'
import { askOnce, type CliAgentSpec } from '../src/index.js'

/** A spec that runs a node one-liner instead of a vendor CLI. */
function nodeSpec(script: string, over: Partial<CliAgentSpec> = {}): CliAgentSpec {
  return {
    id: 'test',
    displayName: 'Test agent',
    bin: process.execPath,
    confidence: 'verified',
    capabilities: { promptControl: 'full', resume: 'none', sandbox: 'caller', budgetable: false },
    invoke: () => ({ args: [] }),
    askOnly: () => ({ args: ['-e', script] }),
    parse: () => null,
    ...over,
  } as CliAgentSpec
}

describe('askOnce', () => {
  it('returns what the process printed', async () => {
    const out = await askOnce(nodeSpec('process.stdout.write("the answer")'), { prompt: 'q' })

    expect(out).toEqual({ ok: true, text: 'the answer' })
  })

  it('refuses an agent that has not declared a read-only invocation', async () => {
    const spec = nodeSpec('')
    delete (spec as { askOnly?: unknown }).askOnly

    const out = await askOnce(spec, { prompt: 'q' })

    expect(out.ok).toBe(false)
    if (!out.ok) expect(out.reason).toContain('without also letting it edit files')
  })

  it('reports a non-zero exit with what the process complained about', async () => {
    const out = await askOnce(nodeSpec('console.error("bad flag"); process.exit(3)'), { prompt: 'q' })

    expect(out.ok).toBe(false)
    if (!out.ok) {
      expect(out.reason).toContain('exited 3')
      expect(out.reason).toContain('bad flag')
    }
  })

  it('reports a binary that is not installed rather than hanging', async () => {
    const out = await askOnce(nodeSpec(''), { prompt: 'q', bin: 'definitely-not-a-real-binary-xyz' })

    expect(out.ok).toBe(false)
    if (!out.ok) expect(out.reason).toContain('could not be started')
  })

  it('gives up on a process that never answers', async () => {
    const out = await askOnce(nodeSpec('setTimeout(() => {}, 60000)'), { prompt: 'q', timeoutMs: 300 })

    expect(out.ok).toBe(false)
    if (!out.ok) expect(out.reason).toContain('did not answer')
  })

  it('can be cancelled', async () => {
    const ctrl = new AbortController()
    const p = askOnce(nodeSpec('setTimeout(() => {}, 60000)'), { prompt: 'q', signal: ctrl.signal })
    ctrl.abort()

    expect(await p).toEqual({ ok: false, reason: 'cancelled' })
  })

  it('survives a process that exits without reading the stdin it was given', async () => {
    // A CLI that takes its prompt as an argument closes stdin unread, and writing to it raises
    // EPIPE. An unhandled error on that stream takes the whole process down.
    // The write has to outlive the child for the pipe to break: five megabytes cannot clear a
    // 64kB pipe buffer in one go, so it is still draining when the child is gone. Two hundred
    // kilobytes was not enough, and the test passed with or without the guard.
    const spec = nodeSpec('process.exit(0)')
    spec.askOnly = () => ({ args: ['-e', 'process.exit(0)'], stdin: 'x'.repeat(5_000_000) })

    const out = await askOnce(spec, { prompt: 'q' })

    expect(out.ok).toBe(true)
  })

  it('unwraps the result field when the CLI answers in a json envelope', async () => {
    const script = 'process.stdout.write(JSON.stringify({ result: "unwrapped", cost: 1 }))'
    const out = await askOnce(nodeSpec(script), { prompt: 'q' })

    expect(out).toEqual({ ok: true, text: 'unwrapped' })
  })

  it('stops a process that will not stop talking, rather than buffering it', async () => {
    // Deliberately past the ceiling. An earlier version of this test wrote three megabytes and
    // asserted the result was under five, which every implementation satisfies.
    // Written with setImmediate rather than a tight while loop: a synchronous flood blocks the
    // child on a full pipe and the test measures that instead of the ceiling.
    const script =
      'const w = () => { process.stdout.write("x".repeat(100000)); setImmediate(w) }; w()'
    const out = await askOnce(nodeSpec(script), { prompt: 'q', timeoutMs: 20_000 })

    expect(out.ok).toBe(false)
    if (!out.ok) expect(out.reason).toContain('without finishing')
  }, 20_000)

  it('keeps a large but finite answer', async () => {
    const script = 'process.stdout.write("x".repeat(500000))'
    const out = await askOnce(nodeSpec(script), { prompt: 'q' })

    expect(out.ok).toBe(true)
    if (out.ok) expect(out.text.length).toBe(500000)
  })
})
