import { describe, expect, it } from 'vitest'
import { runAgentContract } from '@contextmux/core'
import { CODEX_SPEC, CodexAgent } from '../src/index.js'

const invoke = (over: Partial<Parameters<typeof CODEX_SPEC.invoke>[0]> = {}) =>
  CODEX_SPEC.invoke({ prompt: 'do the thing', systemPrompt: 'sys', isolated: false, ...over }).args

describe('honesty about verification', () => {
  it('declares itself unverified', async () => {
    expect(CODEX_SPEC.confidence).toBe('unverified')
    const health = await new CodexAgent({ bin: 'node' }).preflight()
    expect(health.detail).toContain('has not been run against the real CLI')
  })

  it('declares reinvoke rather than session resumption', () => {
    // `codex exec` is a batch invocation, not a resumable conversation. Declaring `session`
    // would make the orchestrator assume the agent remembers the previous round.
    expect(CODEX_SPEC.capabilities.resume).toBe('reinvoke')
  })
})

describe('invocation', () => {
  it('uses headless exec with structured output', () => {
    const args = invoke()
    expect(args[0]).toBe('exec')
    expect(args).toContain('--json')
  })

  it('confines writes to the workspace only when one is isolated', () => {
    // Full access is never selected automatically.
    expect(invoke({ isolated: true }).join(' ')).toContain('--sandbox workspace-write')
    expect(invoke({ isolated: false }).join(' ')).toContain('--sandbox read-only')
    expect(invoke({ isolated: true })).not.toContain('danger-full-access')
  })

  it('lets a caller choose the sandbox deliberately', () => {
    const agent = new CodexAgent({ sandbox: 'danger-full-access' })
    const args = agent.spec.invoke({ prompt: 'p', systemPrompt: 's', isolated: true }).args
    expect(args).toContain('danger-full-access')
  })
})

describe('parsing', () => {
  it('keeps the last agent message from an event stream', () => {
    const stream = [
      '{"type":"task_started"}',
      '{"type":"agent_message","message":"Reading the code."}',
      '{"type":"agent_message","message":"Added the helper and a test."}',
      '{"type":"token_usage","usage":{"input_tokens":100,"output_tokens":50}}',
    ].join('\n')
    const outcome = CODEX_SPEC.parse(stream, '', 0)
    expect(outcome?.text).toBe('Added the helper and a test.')
    expect(outcome?.usage).toEqual({ inputTokens: 100, outputTokens: 50 })
  })

  it('flags an error event in the stream', () => {
    const stream = [
      '{"type":"agent_message","message":"partial"}',
      '{"type":"error","message":"rate limited"}',
    ].join('\n')
    expect(CODEX_SPEC.parse(stream, '', 0)?.isError).toBe(true)
  })

  it('reads a single JSON object as the alternative shape', () => {
    const outcome = CODEX_SPEC.parse('{"last_agent_message":"Finished."}', '', 0)
    expect(outcome?.text).toBe('Finished.')
  })

  it('accepts plain text on success', () => {
    expect(CODEX_SPEC.parse('Finished the change.', '', 0)?.text).toBe('Finished the change.')
  })

  it('surfaces stderr on a non-zero exit', () => {
    expect(CODEX_SPEC.parse('', 'auth required', 1)?.isError).toBe(true)
  })

  it('ignores malformed lines in the stream', () => {
    const stream = 'not json\n{"type":"agent_message","message":"ok"}\n{broken'
    expect(CODEX_SPEC.parse(stream, '', 0)?.text).toBe('ok')
  })
})

describe('CodexAgent contract', () => {
  runAgentContract(
    { it, expect: expect as never },
    { setup: () => ({ agent: new CodexAgent({ bin: 'definitely-not-codex-xyz' }) }) },
  )
})
