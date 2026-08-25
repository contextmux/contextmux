/**
 * Cursor as a driven agent.
 *
 * ## Verification status
 *
 * This spec is marked `unverified`: the `cursor-agent` binary is not installed on the machine
 * where it was written, so the flags and output shape below come from documentation rather
 * than from observed behaviour. `preflight` says so out loud.
 *
 * That admission matters more than it might appear. An adapter that is confidently wrong
 * fails in a way that looks like the agent doing poor work, and the wrong thing gets debugged.
 * Everything vendor-specific is confined to the spec below, so correcting it means editing a
 * handful of declarative lines rather than any control flow — and the shared machinery in
 * `@contextmux/agent-cli` is already exercised by the verified Claude adapter.
 */
import {
  CliAgent,
  extractJson,
  textFromStream,
  type CliAgentOptions,
  type CliAgentSpec,
  type CliOutcome,
} from '@contextmux/agent-cli'

export interface CursorAgentOptions extends CliAgentOptions {
  /** Force the output format, if a future CLI version changes the default. */
  outputFormat?: 'json' | 'stream-json' | 'text'
}

export const CURSOR_SPEC: CliAgentSpec = {
  id: 'cursor',
  displayName: 'Cursor Agent',
  bin: 'cursor-agent',
  confidence: 'unverified',
  capabilities: {
    promptControl: 'full',
    resume: 'session',
    sandbox: 'caller',
    /*
     * Not budgetable.
     *
     * Nothing observed here reports per-run cost, and claiming otherwise would let a caller
     * set a ceiling that is silently never applied — worse than having no ceiling, because
     * they would believe they had one.
     */
    budgetable: false,
  },

  invoke({ prompt, resumeSessionId, systemPrompt, model, isolated, extraArgs }) {
    const args: string[] = ['--print', '--output-format', 'json']

    if (model) args.push('--model', model)

    /*
     * Only skip approvals when the workspace is isolated. Without a worktree the agent is
     * editing the developer's own checkout, and removing every prompt there is not a
     * trade-off anyone chose.
     */
    if (isolated) args.push('--force')

    if (resumeSessionId) args.push('--resume', resumeSessionId)
    if (extraArgs?.length) args.push(...extraArgs)

    /*
     * The system prompt is prepended to the user prompt rather than passed as a flag, because
     * no dedicated flag is documented. If one exists, moving it is a one-line change here.
     */
    args.push(`${systemPrompt}\n\n---\n\n${prompt}`)

    return { args }
  },

  parse(stdout, stderr, exitCode): CliOutcome | null {
    /*
     * Order matters here, and getting it wrong is subtle.
     *
     * A stream transcript's final line is itself a valid JSON object, so reaching for
     * "the last JSON object" first swallows the transcript and yields an object with no
     * result field — an empty success, which reads as the agent having done nothing. Extract
     * the single-object form first but only accept it if it actually carries text, then fall
     * through to the transcript.
     */
    const json = extractJson(stdout)

    if (json) {
      // Field names differ across versions, so accept the plausible spellings rather than
      // failing to find a result that is present under another name.
      const text =
        (typeof json['result'] === 'string' && json['result']) ||
        (typeof json['response'] === 'string' && json['response']) ||
        (typeof json['text'] === 'string' && json['text']) ||
        ''

      if (text) {
        const usageRaw = json['usage'] as Record<string, unknown> | undefined
        const usage = {
          ...(typeof usageRaw?.['input_tokens'] === 'number' ? { inputTokens: usageRaw['input_tokens'] } : {}),
          ...(typeof usageRaw?.['output_tokens'] === 'number' ? { outputTokens: usageRaw['output_tokens'] } : {}),
        }
        return {
          text,
          ...(typeof json['session_id'] === 'string'
            ? { sessionId: json['session_id'] }
            : typeof json['chatId'] === 'string'
              ? { sessionId: json['chatId'] }
              : {}),
          ...(Object.keys(usage).length ? { usage } : {}),
          ...(json['is_error'] === true || json['error'] ? { isError: true } : {}),
        }
      }

      // A JSON object with no recognisable result, but an explicit error, is still a signal.
      if (json['is_error'] === true || json['error']) {
        return { text: String(json['error'] ?? 'the agent reported an error'), isError: true }
      }
    }

    // A stream transcript is the documented alternative shape.
    const streamed = textFromStream(stdout)
    if (streamed) return { text: streamed }

    // Plain text on success is still a usable result; refusing it would fail a run that
    // actually worked just because the output format was not what we expected.
    if (exitCode === 0 && stdout.trim()) return { text: stdout.trim() }

    if (exitCode !== 0 && stderr.trim()) return { text: stderr.trim(), isError: true }

    return null
  },
}

export class CursorAgent extends CliAgent {
  constructor(opts: CursorAgentOptions = {}) {
    const spec = opts.outputFormat
      ? {
          ...CURSOR_SPEC,
          invoke: (input: Parameters<CliAgentSpec['invoke']>[0]) => {
            const built = CURSOR_SPEC.invoke(input)
            const args = [...built.args]
            const at = args.indexOf('--output-format')
            if (at >= 0) args[at + 1] = opts.outputFormat!
            return { ...built, args }
          },
        }
      : CURSOR_SPEC
    super(spec, opts)
  }
}

export function cursorAgent(opts: CursorAgentOptions = {}): CursorAgent {
  return new CursorAgent(opts)
}
