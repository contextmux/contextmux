/**
 * The agent-neutral unit of work.
 *
 * Every adapter renders a TaskSpec into its own native form: a prompt for a driven agent, an
 * issue body for a delegated one. Nothing vendor-specific belongs here — the moment a field
 * exists because Copilot needs it, portability is a claim rather than a property.
 */

/** Where a task came from, so results can be reported back to the right place. */
export interface TaskOrigin {
  /** Adapter that produced it: 'file', 'jira', 'github', 'inline'. */
  tracker: string
  /** Stable identifier within that tracker. */
  id: string
  url?: string
}

export interface AcceptanceCriterion {
  text: string
}

/** Boundaries the agent must not cross. Enforced by verify gates, not trust. */
export interface TaskScope {
  /** Globs the agent may modify. Empty means the whole repository. */
  allow: string[]
  /** Globs the agent must not modify, even when inside `allow`. */
  deny: string[]
  /** Hard ceiling on files changed. Catches runaway refactors early. */
  maxFiles?: number
}

export interface TaskSpec {
  /** Stable id for this task, used as the idempotency root for every transition. */
  id: string
  title: string
  /** The task in prose, already normalised out of whatever markup the tracker used. */
  body: string
  acceptanceCriteria: AcceptanceCriterion[]
  scope: TaskScope
  /** Commands that must pass before the work is considered done. */
  qualityGate: string[]
  origin: TaskOrigin
  /** Free-form labels carried through from the tracker for gate decisions. */
  labels: string[]
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  /** Estimate in whatever unit the tracker uses; feeds complexity scoring. */
  estimate?: number
  /** Attachments referenced by the task — often the actual specification for UI work. */
  attachments?: Array<{ name: string; url?: string; localPath?: string }>
}

/** Semantic tracker states. Adapters map these to whatever a given project calls them. */
export type SemanticState = 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked'

/** What an agent produced. Uniform across archetypes. */
export interface AgentResult {
  status: 'succeeded' | 'failed' | 'refused'
  /** Files the agent changed, repo-relative. */
  filesChanged: string[]
  /** Unified diff, when the runner could produce one. */
  diff?: string
  /** The agent's own account of what it did. */
  summary: string
  /** Where the work lives: a branch, a worktree, a PR. */
  location?: { branch?: string; worktree?: string; prUrl?: string }
  /** Consumed budget, when the adapter can measure it. */
  usage?: { inputTokens?: number; outputTokens?: number; costUsd?: number; turns?: number }
  /** Populated on failure — the reason, not a stack trace. */
  error?: string
  /** Opaque handle for resuming this agent on a later revision round. */
  sessionId?: string
  /**
   * Why a run was stopped, and what the next attempt should do differently.
   *
   * Set by the harness rather than the agent — an agent that noticed it was stuck would have
   * stopped being stuck. Carrying it here lets the orchestrator retry with a diagnosis instead
   * of resending the prompt that already failed.
   */
  recovery?: Feedback
}

export interface Budget {
  maxTokens?: number
  maxCostUsd?: number
  maxTurns?: number
  maxDurationMs?: number
}

/** Human or automated feedback that sends the agent back for another round. */
export interface Feedback {
  round: number
  /** Who or what raised it, for the audit trail. */
  source: string
  body: string
  /** Specific file/line comments, when the source can produce them. */
  items?: Array<{ file: string; line?: number; body: string }>
}

/*
 * Reading acceptance criteria out of a ticket.
 *
 * One implementation, because there were three identical ones — file, GitHub and Jira each
 * carried a byte-for-byte copy, so widening what counts as a criterion meant remembering to do
 * it three times, and a tracker that drifted would fail readiness for reasons peculiar to
 * itself.
 */

/**
 * Headings that introduce what must be true when the work is done.
 *
 * `expected behaviour` and its spellings are here because a bug report's expectation *is* its
 * acceptance criterion. Requiring the literal phrase "acceptance criteria" rejected tickets
 * like "Actual: the button stays active. Expected: the button is inactive." — which is a
 * better-specified change than most tickets that carry the formal heading, and is what the
 * majority of real bug reports look like.
 */
const CRITERIA_SECTION =
  /^(?:acceptance criteria|acceptance|requirements?|done when|definition of done|expected behaviours?|expected behaviors?|expected results?|expected outcomes?|expected)\b/

/**
 * The label a line introduces a section with, or null when it is ordinary content.
 *
 * Three shapes, because trackers render them differently and a ticket is written by a person:
 * a markdown heading, a line that is only bold text, and a short line that is only a label and
 * a colon. Jira in particular turns "Expected behaviour:" into any of the three depending on
 * how it was typed.
 */
function sectionLabel(line: string): string | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  const heading = /^#{1,6}\s+(.+)$/.exec(trimmed)
  if (heading) return normaliseLabel(heading[1]!)

  const bold = /^\*\*(.+?)\*\*:?$/.exec(trimmed)
  if (bold) return normaliseLabel(bold[1]!)

  // A short line that is nothing but a label and a colon. Bounded in length and restricted to
  // words, so a sentence that happens to end in a colon is not mistaken for a heading.
  if (trimmed.length <= 60 && /^[A-Za-z][A-Za-z /]*:$/.test(trimmed)) {
    return normaliseLabel(trimmed.slice(0, -1))
  }
  return null
}

function normaliseLabel(text: string): string {
  return text.toLowerCase().replace(/[*_`#]/g, '').replace(/:$/, '').trim()
}

/**
 * Acceptance criteria from a ticket body.
 *
 * Prose counts. The section was previously read for list items only, so a heading followed by
 * one plain sentence — the ordinary way to state an expectation — yielded nothing and the
 * readiness gate reported a ticket with no criteria at all.
 */
export function extractAcceptanceCriteria(body: string): string[] {
  const lines = body.split('\n')
  const items: string[] = []
  const prose: string[] = []
  let inSection = false

  for (const line of lines) {
    const label = sectionLabel(line)
    if (label !== null) {
      // A new section always ends the previous one, whether or not it is another we want.
      inSection = CRITERIA_SECTION.test(label)
      continue
    }
    if (!inSection) continue

    const item = /^\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s*)?(.+)$/.exec(line)
    if (item) items.push(clean(item[1]!))
    else if (line.trim()) prose.push(line.trim())
  }

  // A list is the more precise statement, so it wins outright. Prose is the fallback for a
  // section that simply says what should happen.
  if (items.length > 0) return items
  if (prose.length === 0) return []
  return [clean(prose.join(' '))]
}

function clean(text: string): string {
  return text.replace(/[*_]/g, '').trim()
}
