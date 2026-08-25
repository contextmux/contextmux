/**
 * Claude Code as a driven agent.
 *
 * The flow lives in `@contextmux/agent-cli`; what remains here is the part that is genuinely
 * Claude-specific — its flags and the shape of `--output-format json`. This spec is
 * `verified`: it has been executed against the real CLI, and the field names below were read
 * off actual output rather than documentation.
 */
import {
  CliAgent,
  extractJson,
  type CliAgentOptions,
  type CliAgentSpec,
  type CliOutcome,
  type StreamEvent,
} from '@contextmux/agent-cli'

export { renderPrompt } from './prompt.js'
export type { PromptOptions } from './prompt.js'

export type ClaudePermissionMode = 'acceptEdits' | 'bypassPermissions' | 'auto' | 'manual'

export interface ClaudeAgentOptions extends CliAgentOptions {
  /**
   * Permission mode.
   *
   * `acceptEdits` lets the agent write files but still gates other tools. `bypassPermissions`
   * removes all prompting, which is the only workable setting for a truly unattended run — and
   * is defensible precisely because the runner puts the agent in an isolated worktree rather
   * than the developer's checkout. It is therefore derived from `isolated` rather than
   * defaulted on: removing every guard should follow from the sandbox actually existing.
   */
  permissionMode?: ClaudePermissionMode
  allowedTools?: string[]
}

export const CLAUDE_SPEC: CliAgentSpec = {
  id: 'claude-code',
  displayName: 'Claude Code',
  bin: 'claude',
  confidence: 'verified',
  capabilities: {
    promptControl: 'full',
    resume: 'session',
    sandbox: 'caller',
    budgetable: true,
  },

  invoke({ prompt, budget, resumeSessionId, systemPrompt, model, isolated, streaming, extraArgs }) {
    /*
     * `stream-json` replaces `json` rather than supplementing it, and the CLI additionally
     * requires `--verbose` for it under `-p`. Building the whole line here keeps that coupling
     * in one place instead of leaving a caller to append flags that conflict.
     */
    const args = streaming
      ? ['-p', prompt, '--output-format', 'stream-json', '--verbose']
      : ['-p', prompt, '--output-format', 'json']

    args.push('--permission-mode', isolated ? 'bypassPermissions' : 'acceptEdits')
    if (model) args.push('--model', model)
    args.push('--append-system-prompt', systemPrompt)
    if (budget?.maxTurns) args.push('--max-turns', String(budget.maxTurns))

    // Resuming keeps the prior conversation, so a revision round does not re-read everything
    // it already knows — cheaper, and it produces better corrections.
    if (resumeSessionId) args.push('--resume', resumeSessionId)
    if (extraArgs?.length) args.push(...extraArgs)

    return { args }
  },

  /*
   * Claude Code's streaming format, read off real output rather than documentation.
   *
   * A call and its result arrive as separate events — the call inside an `assistant` message,
   * the result inside the following `user` message, correlated by `tool_use_id`. Recording
   * only the calls would make every one of them look successful, and the detector that matters
   * most, acting on an unresolved error, would never fire.
   */
  streaming: {
    parseLine(line: string): StreamEvent[] | null {
      let event: Record<string, unknown>
      try {
        event = JSON.parse(line) as Record<string, unknown>
      } catch {
        return null
      }

      const message = event['message'] as { content?: unknown[] } | undefined
      const blocks = Array.isArray(message?.content) ? message.content : []
      const out: StreamEvent[] = []

      /*
       * Every block, in order.
       *
       * One assistant message routinely carries narration *and* the tool calls that follow it,
       * and models call tools in parallel. Returning on the first interesting block meant the
       * narration won — it comes first — and the tool calls were never recorded at all. That is
       * worse than losing detail: a trajectory of messages with no tool calls is exactly the
       * shape the stall detector reads as an agent deliberating instead of working, so a
       * productive run could be stopped for making progress invisibly.
       */
      if (event['type'] === 'assistant') {
        for (const raw of blocks) {
          const block = raw as Record<string, unknown>

          if (block['type'] === 'tool_use') {
            const input = (block['input'] ?? {}) as Record<string, unknown>
            const files = ['file_path', 'path', 'notebook_path']
              .map((k) => input[k])
              .filter((v): v is string => typeof v === 'string')
            out.push({
              type: 'tool',
              name: String(block['name'] ?? 'tool'),
              args: input,
              ...(typeof block['id'] === 'string' ? { id: block['id'] } : {}),
              ...(files.length ? { files } : {}),
            })
            continue
          }

          if (block['type'] === 'text' && typeof block['text'] === 'string' && block['text'].trim()) {
            out.push({ type: 'message', text: block['text'] })
          }
        }
        return out.length ? out : null
      }

      if (event['type'] === 'user') {
        for (const raw of blocks) {
          const block = raw as Record<string, unknown>
          if (block['type'] !== 'tool_result') continue
          const id = block['tool_use_id']
          if (typeof id !== 'string') continue
          const failed = block['is_error'] === true
          out.push({
            type: 'tool-result',
            id,
            ok: !failed,
            ...(failed ? { error: String(block['content'] ?? 'tool failed').slice(0, 200) } : {}),
          })
        }
        return out.length ? out : null
      }

      return null
    },
  },

  parse(stdout, _stderr, _exitCode): CliOutcome | null {
    const json = extractJson(stdout)
    if (!json) return null

    const usageRaw = json['usage'] as { input_tokens?: number; output_tokens?: number } | undefined
    const usage = {
      ...(usageRaw?.input_tokens !== undefined ? { inputTokens: usageRaw.input_tokens } : {}),
      ...(usageRaw?.output_tokens !== undefined ? { outputTokens: usageRaw.output_tokens } : {}),
      ...(typeof json['total_cost_usd'] === 'number' ? { costUsd: json['total_cost_usd'] } : {}),
      ...(typeof json['num_turns'] === 'number' ? { turns: json['num_turns'] } : {}),
    }

    return {
      text: typeof json['result'] === 'string' ? json['result'] : '',
      ...(typeof json['session_id'] === 'string' ? { sessionId: json['session_id'] } : {}),
      ...(Object.keys(usage).length ? { usage } : {}),
      ...(json['is_error'] === true ? { isError: true } : {}),
      ...(typeof json['stop_reason'] === 'string' ? { stopReason: json['stop_reason'] } : {}),
    }
  },
}

export class ClaudeAgent extends CliAgent {
  constructor(opts: ClaudeAgentOptions = {}) {
    // An explicit permission mode overrides the isolation-derived default, for callers who
    // know what they are doing and can say why.
    const spec: CliAgentSpec = opts.permissionMode
      ? {
          ...CLAUDE_SPEC,
          invoke: (input) => {
            const built = CLAUDE_SPEC.invoke(input)
            const args = [...built.args]
            const at = args.indexOf('--permission-mode')
            if (at >= 0) args[at + 1] = opts.permissionMode!
            return { ...built, args }
          },
        }
      : CLAUDE_SPEC

    super(spec, opts)
  }
}

export function claudeAgent(opts: ClaudeAgentOptions = {}): ClaudeAgent {
  return new ClaudeAgent(opts)
}
