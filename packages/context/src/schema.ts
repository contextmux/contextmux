/**
 * The canonical context model.
 *
 * Source of truth is deliberately the *richest* available format — markdown with YAML
 * frontmatter, directory-per-skill with bundled resources — because it is a strict superset
 * of every target's native format. Compiling downward is tractable; compiling upward is
 * invention.
 */
import { z } from 'zod'

/** Targets we can compile to. */
export const TARGETS = ['claude', 'copilot', 'cursor', 'codex'] as const
export type Target = (typeof TARGETS)[number]

const slug = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be kebab-case (a-z, 0-9, hyphens)')

/**
 * Tool lists appear both ways in the wild: Claude writes `tools: Read, Grep` as a
 * comma-separated string, other formats use a YAML sequence. Accept both rather than making
 * the importer — and every hand-author — remember which one this schema wants.
 */
const toolList = z
  .preprocess(
    (v) => (typeof v === 'string' ? v.split(',').map((t) => t.trim()).filter(Boolean) : v),
    z.array(z.string()),
  )
  .optional()

/**
 * Provenance for content that came from somewhere else.
 *
 * Written under an `x-ctxmux-` prefix in frontmatter and lifted into this field on load.
 * The schemas are strict so that a typo surfaces immediately rather than silently dropping
 * configuration — but that same strictness rejects the attribution a pack installer needs to
 * write. A reserved namespace resolves both: unknown *bare* keys are still errors, while
 * anything under the prefix is carried through untouched.
 */
export const ProvenanceSchema = z.record(z.string()).optional()
export type Provenance = z.infer<typeof ProvenanceSchema>

/** Prefix marking a frontmatter key as provenance rather than configuration. */
export const PROVENANCE_PREFIX = 'x-ctxmux-'

/** Restricts a node to a subset of targets. Absent means "all targets". */
const targetFilter = z.array(z.enum(TARGETS)).nonempty().optional()

/**
 * A repo-map query attached to a skill or rule. When the node activates, the indexer
 * resolves this into a token-budgeted slice of the repository.
 *
 * This is the join between the context layer and the repo layer: skills stay small and
 * portable, and the repo map makes them specific to the codebase they land in.
 */
export const RepoQuerySchema = z
  .object({
    /** Symbol name patterns; `*` wildcards allowed (e.g. "use*", "*Selector"). */
    symbols: z.array(z.string()).optional(),
    /** Restrict the search to these path globs. */
    paths: z.array(z.string()).optional(),
    /** Free-text terms ranked lexically against symbol names, paths and doc comments. */
    terms: z.array(z.string()).optional(),
    /** Hard token ceiling for the resolved slice. Required by design — see PLAN §5.2. */
    budget: z.number().int().positive().max(50_000).default(1500),
  })
  .strict()
export type RepoQuery = z.infer<typeof RepoQuerySchema>

/** Global, always-on guidance. Compiles to the root instruction file of each target. */
export const InstructionsSchema = z
  .object({
    body: z.string(),
    targets: targetFilter,
  })
  .strict()
export type Instructions = z.infer<typeof InstructionsSchema>

/**
 * Path-scoped guidance. Every target supports this concept, which makes rules the most
 * portable node type — they survive compilation to all four targets without degradation.
 */
export const RuleSchema = z
  .object({
    name: slug,
    description: z.string().min(1).max(500).optional(),
    /** Glob patterns this rule applies to. Empty means repo-wide. */
    globs: z.array(z.string()).default([]),
    /** Force inclusion regardless of globs. */
    alwaysApply: z.boolean().default(false),
    /** Higher wins when targets impose an ordering or a size ceiling. */
    priority: z.number().int().min(0).max(100).default(50),
    targets: targetFilter,
    provenance: ProvenanceSchema,
    body: z.string(),
  })
  .strict()
export type Rule = z.infer<typeof RuleSchema>

/**
 * A named, description-activated capability. Skills are the unit of distribution: they carry
 * an activation description, can bundle resources, and degrade cleanly into rules. Rules
 * cannot degrade upward into skills, which is why starter content should be authored here.
 */
export const SkillSchema = z
  .object({
    name: slug,
    /** Drives activation. The single most important field — targets match against it. */
    description: z.string().min(1).max(1024),
    globs: z.array(z.string()).default([]),
    /** Optional slice of the repository to pull in when this skill activates. */
    repoQuery: RepoQuerySchema.optional(),
    /** Files bundled alongside SKILL.md, relative to the skill directory. */
    resources: z.array(z.string()).default([]),
    /** Tools this skill expects to be available; advisory for targets that can enforce it. */
    tools: toolList,
    targets: targetFilter,
    provenance: ProvenanceSchema,
    body: z.string(),
  })
  .strict()
export type Skill = z.infer<typeof SkillSchema>

/**
 * A named role with tool and model constraints. Maps to Claude subagents and Copilot custom
 * agents natively; degrades to a custom mode or a command elsewhere.
 */
export const AgentSchema = z
  .object({
    name: slug,
    description: z.string().min(1).max(1024),
    /** Allowed tool names. Absent means "inherit whatever the host allows". */
    tools: toolList,
    model: z.string().optional(),
    /** Which execution archetype this role is written for. See PLAN §3.1. */
    archetype: z.enum(['delegated', 'driven', 'any']).default('any'),
    targets: targetFilter,
    body: z.string(),
  })
  .strict()
export type Agent = z.infer<typeof AgentSchema>

/** A reusable prompt, invoked explicitly by a human. */
export const CommandSchema = z
  .object({
    name: slug,
    description: z.string().min(1).max(500),
    /** Named arguments interpolated into the body as {name}. */
    args: z.array(z.string()).default([]),
    targets: targetFilter,
    body: z.string(),
  })
  .strict()
export type Command = z.infer<typeof CommandSchema>

/** An MCP server declaration, normalised across the four targets' config dialects. */
export const McpServerSchema = z
  .object({
    name: slug,
    transport: z.enum(['stdio', 'http', 'sse']).default('stdio'),
    command: z.string().optional(),
    args: z.array(z.string()).default([]),
    url: z.string().url().optional(),
    /**
     * Environment for the server, as *references* rather than values.
     *
     * `{ "GITHUB_TOKEN": "${GITHUB_TOKEN}" }`, never the token itself. This file is compiled
     * out to `.mcp.json`, `.cursor/mcp.json`, a Codex TOML fragment and a Copilot
     * configuration document — so a literal here does not stay in one place, it becomes five,
     * one of which exists specifically to be reviewed in version control.
     *
     * Not rejected by the schema, because a repository that already has one should still load
     * rather than break. `isEnvReference` is what the loader, the importer and `doctor` use to
     * make it loud instead.
     */
    env: z.record(z.string()).default({}),
    /**
     * Read-only servers are safe to expose to agents processing untrusted ticket text.
     * Defaults to true: opting *in* to write access should be a deliberate act.
     */
    readOnly: z.boolean().default(true),
    targets: targetFilter,
  })
  .strict()
  .refine((s) => (s.transport === 'stdio' ? !!s.command : !!s.url), {
    message: 'stdio servers need `command`; http/sse servers need `url`',
  })
export type McpServer = z.infer<typeof McpServerSchema>

/** The whole canonical model, as loaded from a `.ctxmux/` directory. */
export const ContextModelSchema = z
  .object({
    instructions: InstructionsSchema.optional(),
    rules: z.array(RuleSchema).default([]),
    skills: z.array(SkillSchema).default([]),
    agents: z.array(AgentSchema).default([]),
    commands: z.array(CommandSchema).default([]),
    mcp: z.array(McpServerSchema).default([]),
  })
  .strict()
export type ContextModel = z.infer<typeof ContextModelSchema>

export const ConfigSchema = z
  .object({
    /** Which targets `sync` writes. */
    targets: z.array(z.enum(TARGETS)).nonempty().default(['claude', 'copilot', 'cursor', 'codex']),
    /**
     * Which agent and tracker this repository normally uses.
     *
     * A team that always runs Copilot against Jira should not have to remember two flags on
     * every invocation, or keep them in one person's shell profile where nobody else can see
     * them. Both stay overridable — a one-off `--agent claude` still wins — but the repository's
     * normal choice belongs in the repository, where it can be reviewed in a diff.
     */
    agent: z.string().optional(),
    tracker: z.string().optional(),
    /** Directory holding the canonical model, relative to the repo root. */
    sourceDir: z.string().default('.ctxmux'),
    /** Emit provenance headers on generated files. Disabling makes drift undetectable. */
    provenance: z.boolean().default(true),
  })
  .strict()
export type Config = z.infer<typeof ConfigSchema>

/** Everything a compiler needs: the model plus the config it was loaded under. */
export interface LoadedContext {
  model: ContextModel
  config: Config
  root: string
  /** Absolute path of every file that contributed, for cache invalidation and diagnostics. */
  sources: string[]
  /** Non-fatal problems found during load. Surfaced by the CLI, never silently dropped. */
  warnings: import('./errors.js').Diagnostic[]
}

/**
 * Does this environment value name a variable rather than carry its contents?
 *
 * `${VAR}`, `$VAR` and an empty string all defer to the runtime. Anything else is a literal,
 * and a literal in an MCP declaration is very often a credential.
 */
export function isEnvReference(value: string): boolean {
  return value.trim() === '' || /^\$\{?[A-Za-z_][A-Za-z0-9_]*\}?$/.test(value.trim())
}

/** Keys whose values are literals rather than references. Keys only — never the values. */
export function literalEnvKeys(env: Record<string, string>): string[] {
  return Object.entries(env)
    .filter(([, value]) => !isEnvReference(value))
    .map(([key]) => key)
}
