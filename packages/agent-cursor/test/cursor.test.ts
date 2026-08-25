import { describe, expect, it } from 'vitest'
import { runAgentContract } from '@contextmux/core'
import { CURSOR_SPEC, CursorAgent } from '../src/index.js'

const invoke = (over: Partial<Parameters<typeof CURSOR_SPEC.invoke>[0]> = {}) =>
  CURSOR_SPEC.invoke({ prompt: 'do the thing', systemPrompt: 'sys', isolated: false, ...over }).args

describe('honesty about verification', () => {
  it('declares itself unverified, so nobody debugs the wrong thing', async () => {
    // A confidently wrong adapter fails in a way that looks like the agent doing poor work.
    expect(CURSOR_SPEC.confidence).toBe('unverified')
    const health = await new CursorAgent({ bin: 'node' }).preflight()
    expect(health.detail).toContain('has not been run against the real CLI')
  })

  it('does not claim a budget it cannot enforce', () => {
    // Claiming otherwise lets a caller set a ceiling that is silently never applied.
    expect(CURSOR_SPEC.capabilities.budgetable).toBe(false)
  })
})

describe('invocation', () => {
  it('runs non-interactively with structured output', () => {
    const args = invoke()
    expect(args).toContain('--print')
    expect(args).toContain('--output-format')
  })

  it('only skips approvals when the workspace is isolated', () => {
    expect(invoke({ isolated: true })).toContain('--force')
    expect(invoke({ isolated: false })).not.toContain('--force')
  })

  it('carries the system prompt into the prompt when there is no flag for it', () => {
    const args = invoke()
    expect(args[args.length - 1]).toContain('sys')
    expect(args[args.length - 1]).toContain('do the thing')
  })

  it('resumes a session', () => {
    expect(invoke({ resumeSessionId: 'chat-9' }).join(' ')).toContain('--resume chat-9')
  })

  it('lets the output format be overridden for a future CLI version', () => {
    const agent = new CursorAgent({ outputFormat: 'stream-json' })
    const args = agent.spec.invoke({ prompt: 'p', systemPrompt: 's', isolated: false }).args
    expect(args).toContain('stream-json')
  })
})

describe('parsing', () => {
  it('reads a JSON result', () => {
    const outcome = CURSOR_SPEC.parse('{"result":"Added the helper.","session_id":"s1"}', '', 0)
    expect(outcome?.text).toBe('Added the helper.')
    expect(outcome?.sessionId).toBe('s1')
  })

  it('accepts the plausible spellings of the result field', () => {
    // Field names differ across versions; failing to find a result that is present under
    // another name would report a working run as a failure.
    for (const key of ['result', 'response', 'text']) {
      expect(CURSOR_SPEC.parse(JSON.stringify({ [key]: 'done' }), '', 0)?.text).toBe('done')
    }
  })

  it('reads a stream transcript', () => {
    const stream = [
      '{"type":"assistant","message":{"content":[{"type":"text","text":"Working."}]}}',
      '{"type":"assistant","message":{"content":[{"type":"text","text":"Done."}]}}',
    ].join('\n')
    expect(CURSOR_SPEC.parse(stream, '', 0)?.text).toBe('Working.\nDone.')
  })

  it('accepts plain text on success rather than failing a run that worked', () => {
    expect(CURSOR_SPEC.parse('I added the helper.', '', 0)?.text).toBe('I added the helper.')
  })

  it('reports stderr as an error on a non-zero exit', () => {
    const outcome = CURSOR_SPEC.parse('', 'not authenticated', 1)
    expect(outcome?.isError).toBe(true)
    expect(outcome?.text).toContain('not authenticated')
  })

  it('returns null when there is genuinely nothing', () => {
    expect(CURSOR_SPEC.parse('', '', 1)).toBeNull()
  })
})

describe('CursorAgent contract', () => {
  runAgentContract(
    { it, expect: expect as never },
    { setup: () => ({ agent: new CursorAgent({ bin: 'definitely-not-cursor-xyz' }) }) },
  )
})

describe('parse ordering', () => {
  it('does not let a transcript be swallowed by single-object extraction', () => {
    // Regression: a stream transcript's final line is itself valid JSON, so reaching for
    // "the last JSON object" first produced an object with no result field — an empty
    // success, which reads as the agent having done nothing at all.
    const stream = [
      '{"type":"assistant","message":{"content":[{"type":"text","text":"Added it."}]}}',
      '{"type":"assistant","message":{"content":[{"type":"text","text":"And tested it."}]}}',
    ].join('\n')
    const outcome = CURSOR_SPEC.parse(stream, '', 0)
    expect(outcome?.text).toBe('Added it.\nAnd tested it.')
  })

  it('still prefers a genuine single-object result', () => {
    const outcome = CURSOR_SPEC.parse('progress...\n{"result":"Done.","session_id":"s2"}', '', 0)
    expect(outcome?.text).toBe('Done.')
    expect(outcome?.sessionId).toBe('s2')
  })

  it('reports an error object that carries no result text', () => {
    const outcome = CURSOR_SPEC.parse('{"error":"rate limited"}', '', 0)
    expect(outcome?.isError).toBe(true)
    expect(outcome?.text).toContain('rate limited')
  })
})
