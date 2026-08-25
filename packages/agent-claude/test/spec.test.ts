/**
 * The Claude spec against real CLI output.
 *
 * The fixture below is genuine `claude -p --output-format json` output, captured from the
 * installed CLI. Vendor output shapes are the part of an adapter most likely to drift, and a
 * fixture recorded from reality is the only thing that catches a rename.
 */
import { describe, expect, it } from 'vitest'
import { CLAUDE_SPEC, ClaudeAgent } from '../src/index.js'

const REAL_OUTPUT = JSON.stringify({
  is_error: false,
  duration_api_ms: 1934,
  num_turns: 6,
  stop_reason: 'end_turn',
  session_id: 'e6b8935d-704a-4b30-abc8-94e61b49019e',
  total_cost_usd: 0.2243095,
  usage: {
    input_tokens: 2,
    cache_creation_input_tokens: 21625,
    cache_read_input_tokens: 15899,
    output_tokens: 1391,
  },
  permission_denials: [],
  terminal_reason: 'completed',
  subtype: 'success',
  api_error_status: null,
  result: 'Added the helper and a test.',
})

describe('parsing real output', () => {
  it('reads the fields the adapter depends on', () => {
    const outcome = CLAUDE_SPEC.parse(REAL_OUTPUT, '', 0)
    expect(outcome).toBeTruthy()
    expect(outcome!.text).toBe('Added the helper and a test.')
    expect(outcome!.sessionId).toBe('e6b8935d-704a-4b30-abc8-94e61b49019e')
    expect(outcome!.usage).toEqual({
      inputTokens: 2,
      outputTokens: 1391,
      costUsd: 0.2243095,
      turns: 6,
    })
    expect(outcome!.stopReason).toBe('end_turn')
    expect(outcome!.isError).toBeUndefined()
  })

  it('recognises a self-reported error', () => {
    const errored = JSON.stringify({ is_error: true, result: 'went wrong', subtype: 'error' })
    expect(CLAUDE_SPEC.parse(errored, '', 0)?.isError).toBe(true)
  })

  it('returns null for output that is not JSON at all', () => {
    expect(CLAUDE_SPEC.parse('command not found: claude', 'err', 127)).toBeNull()
  })

  it('tolerates missing optional fields', () => {
    const minimal = CLAUDE_SPEC.parse(JSON.stringify({ result: 'ok' }), '', 0)
    expect(minimal?.text).toBe('ok')
    expect(minimal?.usage).toBeUndefined()
  })
})

describe('invocation', () => {
  const invoke = (over: Partial<Parameters<typeof CLAUDE_SPEC.invoke>[0]> = {}) =>
    CLAUDE_SPEC.invoke({
      prompt: 'do the thing',
      systemPrompt: 'sys',
      isolated: false,
      ...over,
    }).args

  it('uses print mode with JSON output', () => {
    const args = invoke()
    expect(args[0]).toBe('-p')
    expect(args).toContain('--output-format')
    expect(args).toContain('json')
  })

  it('only removes prompting when the workspace is isolated', () => {
    // Without a worktree the agent would be editing the developer's checkout, so the guard
    // rails stay on.
    expect(invoke({ isolated: true })).toContain('bypassPermissions')
    expect(invoke({ isolated: false })).toContain('acceptEdits')
  })

  it('resumes a session rather than starting fresh', () => {
    expect(invoke({ resumeSessionId: 'abc' }).join(' ')).toContain('--resume abc')
  })

  it('passes a turn budget through', () => {
    expect(invoke({ budget: { maxTurns: 3 } }).join(' ')).toContain('--max-turns 3')
  })

  it('lets an explicit permission mode override the isolation default', () => {
    // For callers who know what they are doing and can say why.
    const agent = new ClaudeAgent({ permissionMode: 'manual', isolated: true })
    const args = agent.spec.invoke({ prompt: 'p', systemPrompt: 's', isolated: true }).args
    expect(args).toContain('manual')
    expect(args).not.toContain('bypassPermissions')
  })
})

describe('capabilities', () => {
  it('claims a caller-provided sandbox and an enforceable budget', () => {
    expect(CLAUDE_SPEC.capabilities.sandbox).toBe('caller')
    expect(CLAUDE_SPEC.capabilities.budgetable).toBe(true)
    expect(CLAUDE_SPEC.confidence).toBe('verified')
  })
})

describe('streaming', () => {
  const parse = (event: unknown) => CLAUDE_SPEC.streaming!.parseLine(JSON.stringify(event))
  const events = (event: unknown) => {
    const parsed = parse(event)
    return parsed === null ? [] : Array.isArray(parsed) ? parsed : [parsed]
  }

  it('records every block of an assistant message, in order', () => {
    /*
     * One message routinely carries narration and the tool calls that follow it. Stopping at
     * the first interesting block meant the narration won — it comes first — and the tool calls
     * were never recorded. That is not merely lost detail: a trajectory of messages with no
     * tool calls is precisely the shape the stall detector reads as an agent deliberating
     * rather than working, so a run making real progress could be stopped for it.
     */
    const parsed = events({
      type: 'assistant',
      message: {
        content: [
          { type: 'text', text: 'Let me read the file first.' },
          { type: 'tool_use', id: 'tu_1', name: 'Read', input: { file_path: '/w/src/a.ts' } },
          { type: 'tool_use', id: 'tu_2', name: 'Grep', input: { pattern: 'formatDate' } },
        ],
      },
    })

    expect(parsed.map((e) => e.type)).toEqual(['message', 'tool', 'tool'])
    expect(parsed[1]).toMatchObject({ name: 'Read', id: 'tu_1', files: ['/w/src/a.ts'] })
    expect(parsed[2]).toMatchObject({ name: 'Grep', id: 'tu_2' })
  })

  it('correlates a tool result with the call that produced it', () => {
    const parsed = events({
      type: 'user',
      message: {
        content: [{ type: 'tool_result', tool_use_id: 'tu_1', content: 'ok' }],
      },
    })

    expect(parsed).toEqual([{ type: 'tool-result', id: 'tu_1', ok: true }])
  })

  it('carries the reason a tool call failed', () => {
    // Without this every call looks successful, and the detector that matters most — acting on
    // an unresolved error — can never fire.
    const parsed = events({
      type: 'user',
      message: {
        content: [
          { type: 'tool_result', tool_use_id: 'tu_9', is_error: true, content: 'File not found' },
        ],
      },
    })

    expect(parsed[0]).toMatchObject({ type: 'tool-result', id: 'tu_9', ok: false })
    expect((parsed[0] as { error?: string }).error).toContain('File not found')
  })

  it('records several results delivered in one message', () => {
    const parsed = events({
      type: 'user',
      message: {
        content: [
          { type: 'tool_result', tool_use_id: 'tu_1', content: 'a' },
          { type: 'tool_result', tool_use_id: 'tu_2', content: 'b' },
        ],
      },
    })

    expect(parsed.map((e) => (e as { id: string }).id)).toEqual(['tu_1', 'tu_2'])
  })

  it('ignores lines that carry nothing', () => {
    expect(parse('not json')).toBeNull()
    expect(parse({ type: 'system', subtype: 'init' })).toBeNull()
    expect(parse({ type: 'assistant', message: { content: [{ type: 'text', text: '  ' }] } })).toBeNull()
  })

  it('picks the file argument out of whichever key the tool used', () => {
    const [tool] = events({
      type: 'assistant',
      message: {
        content: [{ type: 'tool_use', id: 't', name: 'NotebookEdit', input: { notebook_path: '/w/n.ipynb' } }],
      },
    })

    expect(tool).toMatchObject({ files: ['/w/n.ipynb'] })
  })
})
