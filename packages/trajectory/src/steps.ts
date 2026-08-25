/**
 * What an agent actually did, step by step.
 *
 * contextmux has always recorded state transitions *between* agent invocations. The inside of
 * an invocation was a black box: the agent went in, a diff came out, and everything in
 * between — which files it read, which commands it ran, how many times it tried the same
 * thing — was lost.
 *
 * That gap is why recovery, risk analysis, handoff and skill extraction all stalled at the
 * design stage. Each of them is a question about the *path*, not the outcome:
 *
 *   - recovery: is this agent making progress, or repeating itself?
 *   - risk: did it verify the assumption before acting on it?
 *   - handoff: what has already been tried, so the next agent does not retry it?
 *   - skills: which sequence of moves keeps working?
 *
 * How much detail is available depends on the vendor. A CLI that emits a structured event
 * stream gives real tool calls; one that prints a summary at exit gives nothing. So the
 * recorder degrades: where tool calls are visible it records them, and where they are not it
 * samples the workspace instead. A coarse trajectory still answers "is anything happening",
 * which is the question that matters most.
 */

import { createHash } from 'node:crypto'

export type StepKind =
  /** The agent was handed work. */
  | 'dispatch'
  /** A tool call the vendor reported. */
  | 'tool'
  /** The agent's own words. */
  | 'message'
  /** A workspace sample taken while the agent worked. */
  | 'observation'
  /** A gate verdict. */
  | 'gate'
  /** Human or automated feedback delivered to the agent. */
  | 'feedback'
  /** The harness intervened. */
  | 'intervention'
  /** The invocation ended. */
  | 'result'

export interface Step {
  /** Monotonic within a trajectory. */
  seq: number
  at: number
  kind: StepKind
  /** Tool name, gate name, or a short label. */
  name: string
  /** One line, for reading. Never the full payload. */
  summary: string
  /**
   * Structured payload, kept small on purpose.
   *
   * A trajectory that stores every file an agent read becomes larger than the repository. The
   * recorder keeps what is needed to answer questions about the path — identities, counts,
   * hashes — and leaves the contents where they already live.
   */
  data?: Record<string, unknown>
  /** Files touched at this step, when known. */
  files?: string[]
}

export interface ToolStepData {
  /** Whether the call changed anything, which is what progress detection needs. */
  mutating: boolean
  /** Stable digest of the arguments, for spotting repetition. */
  signature: string
  ok?: boolean
  error?: string
  /**
   * Whether the files this call touched were already on disk.
   *
   * Absent means the recorder could not tell. The distinction matters because writing a file
   * that does not exist yet is creation — ordinary, and nothing to warn about — while writing
   * one that does, without having read it, is a guess that can destroy work.
   */
  existed?: boolean
}

export interface ObservationData {
  /** Digest of the workspace, so two samples can be compared without storing it. */
  workspaceHash: string
  filesChanged: number
  /** Samples since anything last changed. */
  stagnantFor: number
}

/**
 * Classify a tool by whether it changes the world.
 *
 * The distinction that matters for every consumer of a trajectory: reads are how an agent
 * gathers evidence, writes are how it commits to a belief. A long run of reads is research; a
 * write with no reads before it is a guess.
 *
 * Names vary by vendor, so this matches on shape rather than on an allow-list — an unknown
 * tool called `delete_records` should be treated as mutating even though no vendor here has
 * ever emitted it.
 */
/*
 * Word lists, with inflections spelled out.
 *
 * Explicit forms rather than stem-prefix matching: prefixes are clever and wrong in both
 * directions — `drop` would classify `get_dropdown_options` as destructive, and `migrate`
 * would still miss `migration`. A list that can be read and corrected beats a rule that has to
 * be reasoned about.
 */
const MUTATING_WORDS = new Set([
  'write', 'writes', 'edit', 'edits', 'create', 'creates', 'update', 'updates',
  'delete', 'deletes', 'remove', 'removes', 'move', 'moves', 'rename', 'renames',
  'patch', 'apply', 'install', 'run', 'exec', 'bash', 'shell', 'commit', 'commits',
  'push', 'migrate', 'migration', 'migrations', 'drop', 'insert', 'inserts',
  'truncate', 'deploy', 'publish', 'set', 'add', 'append',
])

const READING_WORDS = new Set([
  'read', 'reads', 'get', 'list', 'lists', 'search', 'grep', 'find', 'glob',
  'view', 'inspect', 'show', 'fetch', 'query', 'status', 'diff', 'log', 'logs',
  'describe', 'check', 'count', 'exists',
])

/**
 * Split a tool name into words.
 *
 * Regex word boundaries are wrong here, and quietly so: `\b` treats underscore as a word
 * character, so `\bdelete\b` does not match `delete_customer_records` — and snake_case is the
 * dominant convention for MCP tools. A destructive tool silently classified as harmless is the
 * worst possible direction for that mistake to go.
 */
export function toolWords(name: string): string[] {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase())
}

export function isMutating(toolName: string): boolean {
  const words = toolWords(toolName)
  const readAt = words.findIndex((w) => READING_WORDS.has(w))
  const mutateAt = words.findIndex((w) => MUTATING_WORDS.has(w))

  if (mutateAt === -1) return false
  if (readAt === -1) return true

  /*
   * Whichever comes first wins.
   *
   * Tool names read left to right as verb-then-object: `show_migration_status` inspects, and
   * `run_and_read_output` acts. Taking the leading verb matches how the names were written.
   */
  return mutateAt < readAt
}

/*
 * A real digest, not a rolling hash.
 *
 * These two look like internal bookkeeping and are not. A workspace digest that collides reads
 * as "nothing changed", and three of those in a row stop a *working* agent and charge for the
 * retry — so the cost of a collision is paid in money and in a correct run thrown away. A
 * 32-bit accumulator over arbitrary diff text is not a defensible margin for that, and
 * `node:crypto` is a builtin, so the safer version costs nothing this project was trying to
 * save.
 */
function digest(text: string): string {
  return createHash('sha256').update(text).digest('base64url').slice(0, 22)
}

/** Stable digest of a tool call, so the same call twice looks the same. */
export function signatureOf(toolName: string, args: unknown): string {
  const normalised = JSON.stringify(args, (_key, value) =>
    typeof value === 'string' && value.length > 200 ? `${value.slice(0, 200)}…` : value,
  )
  return digest(`${toolName}:${normalised ?? ''}`)
}

/**
 * Digest of a workspace state, for comparing two samples.
 *
 * Over the whole diff rather than a four-kilobyte prefix. Truncating meant two samples were
 * compared on their opening pages, so an agent working steadily below that line looked
 * motionless — and being killed for making progress is the one outcome the stall detector must
 * never produce.
 */
export function hashWorkspace(files: string[], diff: string): string {
  return digest(`${[...files].sort().join('|')}::${diff}`)
}
