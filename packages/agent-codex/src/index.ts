/**
 * Codex as a driven agent.
 *
 * ## Verification status
 *
 * Marked `unverified` for the same reason as the Cursor adapter: the `codex` binary is not
 * installed where this was written, so the flags below come from documentation rather than
 * observation. `preflight` reports that rather than implying confidence it does not have.
 *
 * Codex's headless mode is `codex exec`, which is closer to a batch tool than a conversation:
 * it takes a prompt, works, and prints a transcript. That shapes two decisions below —
 * resumption and sandbox policy.
 */
import {
  CliAgent,
  extractJson,
  type CliAgentOptions,
  type CliAgentSpec,
  type CliOutcome,
} from '@contextmux/agent-cli'

export interface CodexAgentOptions extends CliAgentOptions {
  /**
   * Sandbox policy passed to the CLI.
   *
   * Defaults are derived from whether the caller isolated the workspace, on the same reasoning
   * used everywhere else here: full write access is defensible in a throwaway worktree and not
   * in someone's checkout.
   */
  sandbox?: 'read-only' | 'workspace-write' | 'danger-full-access'
}

export const CODEX_SPEC: CliAgentSpec = {
  id: 'codex',
  displayName: 'Codex',
  bin: 'codex',
  confidence: 'unverified',
  capabilities: {
    promptControl: 'full',
    /*
     * `codex exec` is a batch invocation rather than a resumable conversation, so a revision
     * round re-invokes with the feedback rather than continuing a session. Declaring
     * `reinvoke` is what makes the orchestrator hand over the full context each time instead
     * of assuming the agent remembers the previous round.
     */
    resume: 'reinvoke',
    sandbox: 'caller',
    budgetable: false,
  },

  invoke({ prompt, systemPrompt, model, isolated, extraArgs }) {
    const args: string[] = ['exec', '--json']

    if (model) args.push('--model', model)

    // `workspace-write` confines writes to the working directory, which is the worktree when
    // the caller isolated one. Full access is never selected automatically.
    args.push('--sandbox', isolated ? 'workspace-write' : 'read-only')

    if (extraArgs?.length) args.push(...extraArgs)

    // No documented flag for an additional system prompt, so it leads the user prompt.
    args.push(`${systemPrompt}\n\n---\n\n${prompt}`)

    return { args }
  },

  parse(stdout, stderr, exitCode): CliOutcome | null {
    /*
     * `--json` emits a JSONL event stream, so the useful content is spread across lines rather
     * than sitting in one object. Walk it and keep the last agent message, which is the
     * summary of what was done.
     */
    let lastMessage = ''
    let sawError = false
    const usage: { inputTokens?: number; outputTokens?: number } = {}

    for (const line of stdout.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('{')) continue
      try {
        const event = JSON.parse(trimmed) as Record<string, unknown>
        const type = String(event['type'] ?? event['msg'] ?? '')

        if (type.includes('agent_message') || type === 'message') {
          const message = event['message'] ?? event['text'] ?? event['content']
          if (typeof message === 'string') lastMessage = message
        }
        if (type.includes('error')) sawError = true

        const tokens = event['token_usage'] ?? event['usage']
        if (tokens && typeof tokens === 'object') {
          const t = tokens as Record<string, unknown>
          if (typeof t['input_tokens'] === 'number') usage.inputTokens = t['input_tokens']
          if (typeof t['output_tokens'] === 'number') usage.outputTokens = t['output_tokens']
        }
      } catch {
        /* not an event line */
      }
    }

    if (lastMessage) {
      return {
        text: lastMessage,
        ...(Object.keys(usage).length ? { usage } : {}),
        ...(sawError ? { isError: true } : {}),
      }
    }

    // A single JSON object is the documented alternative shape.
    const json = extractJson(stdout)
    if (json) {
      const text =
        (typeof json['last_agent_message'] === 'string' && json['last_agent_message']) ||
        (typeof json['result'] === 'string' && json['result']) ||
        ''
      if (text) return { text, ...(json['error'] ? { isError: true } : {}) }
    }

    // Plain text on success is still usable; rejecting it would fail a run that worked.
    if (exitCode === 0 && stdout.trim()) return { text: stdout.trim() }
    if (exitCode !== 0 && stderr.trim()) return { text: stderr.trim(), isError: true }

    return null
  },
}

export class CodexAgent extends CliAgent {
  constructor(opts: CodexAgentOptions = {}) {
    const spec = opts.sandbox
      ? {
          ...CODEX_SPEC,
          invoke: (input: Parameters<CliAgentSpec['invoke']>[0]) => {
            const built = CODEX_SPEC.invoke(input)
            const args = [...built.args]
            const at = args.indexOf('--sandbox')
            if (at >= 0) args[at + 1] = opts.sandbox!
            return { ...built, args }
          },
        }
      : CODEX_SPEC
    super(spec, opts)
  }
}

export function codexAgent(opts: CodexAgentOptions = {}): CodexAgent {
  return new CodexAgent(opts)
}
