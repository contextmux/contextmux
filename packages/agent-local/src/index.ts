/**
 * A locally-hosted model as a coding agent.
 *
 * This exists so the whole pipeline can run at zero marginal cost. contextmux itself is free —
 * three permissive dependencies, no hosted service — but every agent it could drive until now
 * bills per token, which makes "free" true of the tool and not of using it.
 *
 * ## A local model is not a local agent
 *
 * The distinction matters and is easy to miss. Ollama runs a model; it does not read files,
 * edit them, or run tests. A coding agent needs a harness around the model that does those
 * things. So two pieces are required:
 *
 *   model runner   ollama, llama.cpp, LM Studio — serves tokens
 *   agent harness  aider, opencode — reads, edits, runs, iterates
 *
 * contextmux drives the *harness*, and the harness is pointed at the runner. Anyone expecting
 * `ollama` alone to work here will otherwise get a confusing failure, so `preflight` checks
 * for both and says which is missing.
 *
 * ## Verification status
 *
 * `unverified`: neither harness was installed on the machine where this was written, so the
 * flags come from documentation. Everything vendor-specific is confined to the specs below.
 */
import {
  CliAgent,
  type CliAgentOptions,
  type CliAgentSpec,
  type CliOutcome,
} from '@contextmux/agent-cli'

export type LocalHarness = 'aider' | 'opencode'

export interface LocalAgentOptions extends CliAgentOptions {
  /** Which harness drives the model. */
  harness?: LocalHarness
  /**
   * Model identifier, in the harness's own notation.
   *
   * Defaults to an ollama-served coding model, since that is the combination most people
   * already have and it costs nothing to run.
   */
  model?: string
  /** Where the model runner listens, for the preflight reachability check. */
  runnerUrl?: string
}

/** Default ollama endpoint, matching the one ollama itself uses. */
const DEFAULT_RUNNER_URL = 'http://localhost:11434'

/**
 * aider — Apache-2.0, and the most established free harness that edits files in place.
 *
 * Auto-commit is disabled deliberately: contextmux's runner reads the change out of the working
 * tree, and a harness that commits on its own turns one reviewable diff into a series of
 * commits nobody asked for.
 */
export const AIDER_SPEC: CliAgentSpec = {
  id: 'local-aider',
  displayName: 'Local model (aider)',
  bin: 'aider',
  confidence: 'unverified',
  capabilities: {
    promptControl: 'full',
    // aider's headless mode is one message per invocation, so a revision round re-invokes.
    resume: 'reinvoke',
    sandbox: 'caller',
    /*
     * Not budgetable, and for a happier reason than usual: a locally-hosted model has no
     * per-token cost to cap. Claiming otherwise would let a caller set a ceiling that is
     * never applied.
     */
    budgetable: false,
  },

  invoke({ prompt, systemPrompt, model, isolated, extraArgs }) {
    const args: string[] = [
      '--message',
      `${systemPrompt}\n\n---\n\n${prompt}`,
      // Unattended: never wait for a human that is not there.
      '--yes-always',
      // Leave the change in the working tree for the runner to read.
      '--no-auto-commits',
      // Plain output; the pretty renderer emits control codes that parse badly.
      '--no-pretty',
      '--no-stream',
    ]

    if (model) args.push('--model', model)
    // Without a sandbox the agent is in the developer's checkout, so it may look but not leap.
    if (!isolated) args.push('--no-auto-lint', '--dry-run')
    if (extraArgs?.length) args.push(...extraArgs)

    return { args }
  },

  parse(stdout, stderr, exitCode): CliOutcome | null {
    const text = stdout.trim()
    if (exitCode === 0 && text) return { text }
    if (exitCode !== 0) {
      const detail = (stderr || stdout).trim().split('\n').slice(-10).join('\n')
      return { text: detail || `exited with ${exitCode}`, isError: true }
    }
    return null
  },
}

/** opencode — MIT, and headless via `run`. */
export const OPENCODE_SPEC: CliAgentSpec = {
  id: 'local-opencode',
  displayName: 'Local model (opencode)',
  bin: 'opencode',
  confidence: 'unverified',
  capabilities: {
    promptControl: 'full',
    resume: 'reinvoke',
    sandbox: 'caller',
    budgetable: false,
  },

  invoke({ prompt, systemPrompt, model, extraArgs }) {
    const args = ['run', `${systemPrompt}\n\n---\n\n${prompt}`]
    if (model) args.push('--model', model)
    if (extraArgs?.length) args.push(...extraArgs)
    return { args }
  },

  parse(stdout, stderr, exitCode): CliOutcome | null {
    const text = stdout.trim()
    if (exitCode === 0 && text) return { text }
    if (exitCode !== 0) return { text: (stderr || stdout).trim().slice(-2000), isError: true }
    return null
  },
}

const SPECS: Record<LocalHarness, CliAgentSpec> = {
  aider: AIDER_SPEC,
  opencode: OPENCODE_SPEC,
}

export class LocalAgent extends CliAgent {
  private readonly runnerUrl: string

  constructor(opts: LocalAgentOptions = {}) {
    const harness = opts.harness ?? 'aider'
    super(SPECS[harness], {
      ...opts,
      model: opts.model ?? process.env['CTXMUX_LOCAL_MODEL'] ?? 'ollama/qwen2.5-coder',
    })
    this.runnerUrl = opts.runnerUrl ?? process.env['OLLAMA_HOST'] ?? DEFAULT_RUNNER_URL
  }

  /**
   * Check both halves, and say which is missing.
   *
   * "Ollama is installed but not running" is a common and genuinely confusing state: the
   * binary answers `--version`, so a check that stopped at the harness would report everything
   * fine and then fail on the first request with a connection error nobody expects.
   */
  override async preflight(): Promise<{ ok: boolean; detail: string }> {
    const harness = await super.preflight()
    if (!harness.ok) {
      return {
        ok: false,
        detail:
          `${harness.detail} A local model needs a harness as well as a runner — ollama serves ` +
          'tokens but does not read or edit files. Install aider (Apache-2.0) or opencode (MIT).',
      }
    }

    const model = this.opts.model ?? ''
    if (!model.startsWith('ollama/')) return harness

    const reachable = await fetch(`${this.runnerUrl}/api/tags`, {
      signal: AbortSignal.timeout(2_000),
    }).then(
      (r) => r.ok,
      () => false,
    )

    if (!reachable) {
      return {
        ok: false,
        detail:
          `${this.displayName} is installed, but no model runner is answering at ${this.runnerUrl}. ` +
          'Start it with `ollama serve`, and pull a model with `ollama pull qwen2.5-coder`.',
      }
    }

    return { ok: true, detail: `${harness.detail}, model ${model} via ${this.runnerUrl}` }
  }
}

export function localAgent(opts: LocalAgentOptions = {}): LocalAgent {
  return new LocalAgent(opts)
}
