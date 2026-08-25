/**
 * Jira as a tracker.
 *
 * Two things this does that a hand-rolled integration usually does not:
 *
 * Transitions are resolved by *semantic* state through a configured mapping, never by
 * substring-matching a workflow name. `name.includes('progress')` works until a project has a
 * status called "In Progress Review", and then it silently moves tickets to the wrong place.
 *
 * Writes are not retried. Jira's comment and transition endpoints are not idempotent, and a
 * retry after a timeout that actually succeeded posts the comment twice — which is how
 * automation ends up shouting on a ticket.
 */
export * from './adf.js'

import { extractAcceptanceCriteria, type SemanticState, type TaskSpec, type Tracker } from '@contextmux/core'
import { adfToMarkdown, markdownToAdf, type AdfDocument } from './adf.js'

export interface JiraTransport {
  request<T = unknown>(
    method: 'GET' | 'POST' | 'PUT',
    path: string,
    body?: unknown,
  ): Promise<T>
}

export class JiraError extends Error {
  override name = 'JiraError'
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

/** Strip anything credential-shaped before it reaches a log. */
export function redactJira(text: string): string {
  return text
    .replace(/ATATT[A-Za-z0-9_\-=]{10,}/g, '[REDACTED]')
    .replace(/(["']?(?:token|password|secret|api[_-]?key)["']?\s*[:=]\s*["']?)[^"'\s,}]+/gi, '$1[REDACTED]')
}

export interface HttpJiraOptions {
  /** Base URL with no trailing slash, e.g. https://team.atlassian.net */
  baseUrl: string
  email: string
  apiToken: string
  fetchImpl?: typeof fetch
  maxAttempts?: number
  sleep?: (ms: number) => Promise<void>
}

export class HttpJira implements JiraTransport {
  private readonly auth: string
  private readonly fetchImpl: typeof fetch
  private readonly sleep: (ms: number) => Promise<void>

  constructor(private readonly opts: HttpJiraOptions) {
    this.auth = Buffer.from(`${opts.email}:${opts.apiToken}`).toString('base64')
    this.fetchImpl = opts.fetchImpl ?? fetch
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)))
  }

  async request<T>(method: 'GET' | 'POST' | 'PUT', path: string, body?: unknown): Promise<T> {
    const url = `${this.opts.baseUrl.replace(/\/$/, '')}/rest/api/3/${path}`
    // Only GET is safe to repeat. Retrying a POST duplicates comments and transitions.
    const maxAttempts = method === 'GET' ? (this.opts.maxAttempts ?? 3) : 1

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const res = await this.fetchImpl(url, {
        method,
        headers: {
          Authorization: `Basic ${this.auth}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })

      if ((res.status === 429 || res.status >= 500) && attempt < maxAttempts) {
        const retryAfter = Number(res.headers.get('retry-after'))
        await this.sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 500)
        continue
      }

      if (!res.ok) {
        throw new JiraError(`HTTP ${res.status}: ${redactJira((await res.text().catch(() => '')).slice(0, 300))}`, res.status)
      }

      if (res.status === 204) return undefined as T

      const contentType = res.headers.get('content-type') ?? ''
      if (!contentType.includes('json')) {
        // Almost always a wrong base URL landing on an HTML login page. Say that, rather than
        // letting a JSON parse error surface twelve frames away.
        throw new JiraError(
          `Jira returned ${contentType || 'a non-JSON response'}. Check the base URL has no trailing path.`,
          res.status,
        )
      }
      return (await res.json()) as T
    }

    throw new JiraError('request failed', 0)
  }
}

/** Semantic state to workflow status names, most specific first. */
export type StateMapping = Record<SemanticState, string[]>

export const DEFAULT_STATE_MAPPING: StateMapping = {
  todo: ['To Do', 'Open', 'Backlog', 'New'],
  in_progress: ['In Progress', 'In Development'],
  in_review: ['In Review', 'Code Review', 'Review'],
  done: ['Done', 'Closed', 'Resolved', 'Complete'],
  blocked: ['Blocked', 'On Hold', 'Impediment'],
}

interface JiraIssue {
  key: string
  fields: {
    summary: string
    description?: AdfDocument | null
    status?: { name: string }
    issuetype?: { name: string }
    priority?: { name: string }
    labels?: string[]
    attachment?: Array<{ filename: string; content: string }>
    [key: string]: unknown
  }
}

export interface JiraTrackerOptions {
  transport: JiraTransport
  /** JQL selecting work eligible to be picked up. */
  jql: string
  /** Workflow status names for each semantic state. */
  stateMapping?: Partial<StateMapping>
  /** Custom field holding the estimate, e.g. `customfield_10016`. */
  estimateField?: string
  /** Scope applied to every task from this project. */
  defaultScope?: { allow?: string[]; deny?: string[]; maxFiles?: number }
  defaultQualityGate?: string[]
  browseBaseUrl?: string
}

export class JiraTracker implements Tracker {
  readonly id = 'jira'
  private readonly mapping: StateMapping

  constructor(private readonly opts: JiraTrackerOptions) {
    this.mapping = { ...DEFAULT_STATE_MAPPING, ...opts.stateMapping } as StateMapping
  }

  private toSpec(issue: JiraIssue): TaskSpec {
    const { markdown, media } = adfToMarkdown(issue.fields.description ?? null)
    const estimate = this.opts.estimateField ? issue.fields[this.opts.estimateField] : undefined

    return {
      id: issue.key,
      title: issue.fields.summary,
      body: markdown,
      acceptanceCriteria: extractAcceptanceCriteria(markdown).map((text) => ({ text })),
      scope: {
        allow: this.opts.defaultScope?.allow ?? [],
        deny: this.opts.defaultScope?.deny ?? [],
        ...(this.opts.defaultScope?.maxFiles !== undefined
          ? { maxFiles: this.opts.defaultScope.maxFiles }
          : {}),
      },
      qualityGate: this.opts.defaultQualityGate ?? [],
      origin: {
        tracker: 'jira',
        id: issue.key,
        ...(this.opts.browseBaseUrl ? { url: `${this.opts.browseBaseUrl}/browse/${issue.key}` } : {}),
      },
      labels: issue.fields.labels ?? [],
      ...(typeof estimate === 'number' ? { estimate } : {}),
      ...(issue.fields.attachment?.length || media.length
        ? {
            attachments: [
              ...(issue.fields.attachment ?? []).map((a) => ({ name: a.filename, url: a.content })),
              ...media.map((m) => ({ name: m.alt })),
            ],
          }
        : {}),
    }
  }

  private fields(): string[] {
    return [
      'summary',
      'description',
      'status',
      'issuetype',
      'priority',
      'labels',
      'attachment',
      ...(this.opts.estimateField ? [this.opts.estimateField] : []),
    ]
  }

  async listReady(limit = 10): Promise<TaskSpec[]> {
    const data = await this.opts.transport.request<{ issues?: JiraIssue[] }>('POST', 'search/jql', {
      jql: this.opts.jql,
      maxResults: limit,
      fields: this.fields(),
    })
    return (data.issues ?? []).map((i) => this.toSpec(i))
  }

  async get(id: string): Promise<TaskSpec | null> {
    try {
      const issue = await this.opts.transport.request<JiraIssue>(
        'GET',
        `issue/${encodeURIComponent(id)}?fields=${this.fields().join(',')}`,
      )
      return this.toSpec(issue)
    } catch (err) {
      if (err instanceof JiraError && err.status === 404) return null
      throw err
    }
  }

  /**
   * Move a ticket by semantic state.
   *
   * Resolves against the transitions Jira actually offers from the current status, so an
   * unreachable target fails with the available options listed rather than silently doing
   * nothing — the most common way a Jira integration appears to work but does not.
   */
  /**
   * Put the account the credentials belong to on the ticket.
   *
   * Jira Cloud assigns by account id, not email, so the id is read from `myself` — which is
   * also the honest answer to "who is doing this": whoever's token it is. Cached, because it
   * cannot change within a process.
   */
  async assignToSelf(id: string): Promise<void> {
    const accountId = await this.selfAccountId()
    if (!accountId) return
    await this.opts.transport.request('PUT', `issue/${encodeURIComponent(id)}/assignee`, { accountId })
  }

  private selfId: string | null | undefined
  private async selfAccountId(): Promise<string | null> {
    if (this.selfId !== undefined) return this.selfId
    const me = await this.opts.transport
      .request<{ accountId?: string }>('GET', 'myself')
      .catch(() => null)
    this.selfId = me?.accountId ?? null
    return this.selfId
  }

  async transition(id: string, to: SemanticState): Promise<void> {
    const data = await this.opts.transport.request<{
      transitions: Array<{ id: string; name: string; to?: { name: string } }>
    }>('GET', `issue/${encodeURIComponent(id)}/transitions`)

    const wanted = this.mapping[to] ?? []
    const normalise = (s: string) => s.toLowerCase().trim()

    const match =
      data.transitions.find((t) => wanted.some((w) => normalise(t.to?.name ?? '') === normalise(w))) ??
      data.transitions.find((t) => wanted.some((w) => normalise(t.name) === normalise(w)))

    if (!match) {
      const available = data.transitions.map((t) => t.to?.name ?? t.name).join(', ')
      throw new JiraError(
        `No transition to "${to}" from the current status of ${id}. ` +
          `Wanted one of: ${wanted.join(', ')}. Available: ${available || 'none'}. ` +
          `Configure stateMapping if this project uses different status names.`,
        409,
      )
    }

    await this.opts.transport.request('POST', `issue/${encodeURIComponent(id)}/transitions`, {
      transition: { id: match.id },
    })
  }

  async comment(id: string, body: string): Promise<void> {
    await this.opts.transport.request('POST', `issue/${encodeURIComponent(id)}/comment`, {
      body: markdownToAdf(body),
    })
  }

  async setLabels(id: string, add: string[], remove: string[]): Promise<void> {
    if (add.length === 0 && remove.length === 0) return
    await this.opts.transport.request('PUT', `issue/${encodeURIComponent(id)}`, {
      update: {
        labels: [...add.map((l) => ({ add: l })), ...remove.map((l) => ({ remove: l }))],
      },
    })
  }
}

/**
 * Pull acceptance criteria out of the converted markdown.
 *
 * Shared with the file tracker in spirit but duplicated deliberately: the trackers are
 * independently publishable, and a shared helper would force a dependency between them for
 * twenty lines.
 */
// Re-exported so each tracker keeps its existing surface; the implementation is shared.
export { extractAcceptanceCriteria }
