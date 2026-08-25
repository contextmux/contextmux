/**
 * The compiler contract.
 *
 * Every compiler declares up front how faithfully it can represent each canonical node type.
 * That declaration is not documentation — it drives the fidelity report, so a user can see
 * exactly what their `.ctxmux/` loses on the way to each target.
 */
import type { ContextModel, LoadedContext, Target } from '../schema.js'

/** A file a compiler wants written. Content is complete; the writer decides how to place it. */
export interface OutputFile {
  /** Path relative to the repo root. */
  path: string
  content: string
  /**
   * `full` — contextmux owns the whole file and may overwrite it.
   * `block` — contextmux owns a delimited region inside a file the user also edits.
   */
  ownership: 'full' | 'block'
  /** Skip the provenance header (JSON files, for example, cannot carry comments). */
  noProvenance?: boolean
}

export type Fidelity = 'native' | 'degraded' | 'dropped'

/** One line of the fidelity report: what happened to a node type on the way to a target. */
export interface FidelityNote {
  nodeType: 'instructions' | 'rules' | 'skills' | 'agents' | 'commands' | 'mcp'
  fidelity: Fidelity
  count: number
  /** How it was represented. Required for anything not `native`. */
  as?: string
  /** What was lost. Required for anything not `native`. */
  lost?: string
}

export interface CompileResult {
  target: Target
  files: OutputFile[]
  fidelity: FidelityNote[]
}

export interface Compiler {
  target: Target
  /** Human-readable name of the tool this produces config for. */
  displayName: string
  compile(ctx: LoadedContext): CompileResult
}

/** Nodes explicitly restricted to other targets are excluded before compilation. */
export function forTarget<T extends { targets?: readonly Target[] }>(
  items: readonly T[],
  target: Target,
): T[] {
  return items.filter((i) => !i.targets || i.targets.includes(target))
}

/** Model narrowed to a single target. */
export function narrow(model: ContextModel, target: Target) {
  return {
    instructions:
      model.instructions && (!model.instructions.targets || model.instructions.targets.includes(target))
        ? model.instructions
        : undefined,
    rules: forTarget(model.rules, target),
    skills: forTarget(model.skills, target),
    agents: forTarget(model.agents, target),
    commands: forTarget(model.commands, target),
    mcp: forTarget(model.mcp, target),
  }
}

/** Render a repoQuery as an instruction the agent can act on without contextmux at runtime. */
export function describeRepoQuery(q: {
  symbols?: string[]
  paths?: string[]
  terms?: string[]
  budget: number
}): string {
  const parts: string[] = []
  if (q.symbols?.length) parts.push(`symbols matching ${q.symbols.map((s) => `\`${s}\``).join(', ')}`)
  if (q.paths?.length) parts.push(`paths ${q.paths.map((s) => `\`${s}\``).join(', ')}`)
  if (q.terms?.length) parts.push(`terms ${q.terms.map((s) => `"${s}"`).join(', ')}`)
  if (parts.length === 0) return ''
  return (
    `> **Before writing code, search the repository for existing implementations** — ` +
    `${parts.join('; ')}. Reuse what exists instead of adding a parallel implementation. ` +
    `If the \`ctxmux-repo\` MCP server is available, call \`find_symbol\` or \`find_similar\`; ` +
    `otherwise grep for the patterns above.`
  )
}

