import { describe, expect, it } from 'vitest'
import { runTrackerContract } from '@contextmux/core'
import { HttpJira, JiraError, JiraTracker, redactJira, type JiraTransport } from '../src/index.js'

/** A fake Jira holding just enough behaviour to exercise the adapter. */
class FakeJira implements JiraTransport {
  readonly calls: Array<{ method: string; path: string; body?: unknown }> = []
  readonly comments: unknown[] = []
  /** Who the ticket is assigned to, by account id. */
  assignee: string | null = null
  accountId = 'acct-12345'
  labels: string[] = ['agent-ok']
  status = 'To Do'
  /** Transitions this project offers, deliberately including a confusable name. */
  transitions = [
    { id: '11', name: 'Start work', to: { name: 'In Progress' } },
    { id: '21', name: 'Send to review', to: { name: 'In Progress Review' } },
    { id: '31', name: 'Ready for review', to: { name: 'In Review' } },
    { id: '41', name: 'Complete', to: { name: 'Done' } },
  ]

  async request<T>(method: 'GET' | 'POST' | 'PUT', path: string, body?: unknown): Promise<T> {
    this.calls.push({ method, path, body })

    if (path === 'search/jql') {
      return { issues: [this.issue()] } as T
    }
    if (path === 'myself') {
      return { accountId: this.accountId } as T
    }
    if (/^issue\/[^/]+\/assignee$/.test(path)) {
      this.assignee = (body as { accountId: string }).accountId
      return undefined as T
    }
    if (/^issue\/[^/]+\/transitions$/.test(path)) {
      if (method === 'GET') return { transitions: this.transitions } as T
      const id = (body as { transition: { id: string } }).transition.id
      this.status = this.transitions.find((t) => t.id === id)?.to.name ?? this.status
      return undefined as T
    }
    if (/^issue\/[^/]+\/comment$/.test(path)) {
      this.comments.push(body)
      return undefined as T
    }
    if (/^issue\/[^/]+$/.test(path) && method === 'PUT') {
      const update = (body as { update: { labels: Array<{ add?: string; remove?: string }> } }).update
      for (const op of update.labels) {
        if (op.add && !this.labels.includes(op.add)) this.labels.push(op.add)
        if (op.remove) this.labels = this.labels.filter((l) => l !== op.remove)
      }
      return undefined as T
    }
    if (path.startsWith('issue/')) {
      const key = decodeURIComponent(path.slice('issue/'.length).split('?')[0]!)
      if (key !== 'ABC-1') throw new JiraError('Issue does not exist', 404)
      return this.issue() as T
    }
    throw new JiraError(`no route for ${method} ${path}`, 404)
  }

  private issue() {
    return {
      key: 'ABC-1',
      fields: {
        summary: 'Add a percentage helper',
        status: { name: this.status },
        labels: [...this.labels],
        customfield_10016: 3,
        description: {
          type: 'doc',
          version: 1,
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'Ratios are shown raw.' }] },
            { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Acceptance criteria' }] },
            {
              type: 'bulletList',
              content: [
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A helper exists' }] }] },
                { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'It is tested' }] }] },
              ],
            },
          ],
        },
      },
    }
  }
}

const trackerFor = (transport: FakeJira) =>
  new JiraTracker({
    transport,
    jql: 'project = PDC AND labels = "agent-ok"',
    estimateField: 'customfield_10016',
    browseBaseUrl: 'https://team.atlassian.net',
  })

describe('JiraTracker contract', () => {
  runTrackerContract(
    { it, expect: expect as never },
    { setup: () => ({ tracker: trackerFor(new FakeJira()), taskId: 'ABC-1' }) },
  )
})

describe('JiraTracker behaviour', () => {
  it('converts the description and extracts acceptance criteria', async () => {
    const spec = await trackerFor(new FakeJira()).get('ABC-1')
    expect(spec?.body).toContain('## Acceptance criteria')
    expect(spec?.acceptanceCriteria.map((c) => c.text)).toEqual(['A helper exists', 'It is tested'])
  })

  it('reads the estimate from the configured custom field', async () => {
    expect((await trackerFor(new FakeJira()).get('ABC-1'))?.estimate).toBe(3)
  })

  it('records a browsable origin url', async () => {
    expect((await trackerFor(new FakeJira()).get('ABC-1'))?.origin.url).toBe(
      'https://team.atlassian.net/browse/ABC-1',
    )
  })

  it('matches a transition by its target status, not by substring', async () => {
    // Substring matching picks "In Progress Review" for `in_progress`, which is how tickets
    // silently end up in the wrong column.
    const jira = new FakeJira()
    await trackerFor(jira).transition('ABC-1', 'in_progress')
    expect(jira.status).toBe('In Progress')
  })

  it('reaches In Review without being confused by a similar name', async () => {
    const jira = new FakeJira()
    await trackerFor(jira).transition('ABC-1', 'in_review')
    expect(jira.status).toBe('In Review')
  })

  it('fails loudly when no transition reaches the target, listing what is available', async () => {
    // Silently doing nothing is the classic Jira integration bug: it looks like it works.
    const jira = new FakeJira()
    jira.transitions = [{ id: '99', name: 'Park', to: { name: 'Parked' } }]
    await expect(trackerFor(jira).transition('ABC-1', 'done')).rejects.toThrow(/Available: Parked/)
  })

  it('honours a project-specific state mapping', async () => {
    const jira = new FakeJira()
    jira.transitions = [{ id: '77', name: 'Begin', to: { name: 'Doing' } }]
    const tracker = new JiraTracker({
      transport: jira,
      jql: 'x',
      stateMapping: { in_progress: ['Doing'] },
    })
    await tracker.transition('ABC-1', 'in_progress')
    expect(jira.status).toBe('Doing')
  })

  it('merges labels rather than replacing them', async () => {
    const jira = new FakeJira()
    await trackerFor(jira).setLabels('ABC-1', ['needs-human'], [])
    expect(jira.labels).toEqual(['agent-ok', 'needs-human'])
  })

  it('writes comments as ADF, which is what the API accepts', async () => {
    const jira = new FakeJira()
    await trackerFor(jira).comment('ABC-1', 'A note.')
    expect(jira.comments[0]).toMatchObject({ body: { type: 'doc', version: 1 } })
  })
})

describe('HttpJira', () => {
  const response = (status: number, body: unknown, headers: Record<string, string> = {}) =>
    new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json', ...headers },
    })

  it('retries a GET but never a write', async () => {
    // Retrying a POST after a timeout that actually succeeded posts the comment twice.
    let gets = 0
    let posts = 0
    const jira = new HttpJira({
      baseUrl: 'https://x.atlassian.net',
      email: 'a@b.c',
      apiToken: 't',
      maxAttempts: 3,
      sleep: async () => {},
      fetchImpl: async (_url, init) => {
        if ((init as RequestInit).method === 'GET') {
          gets += 1
          return gets < 3 ? response(500, {}) : response(200, { ok: true })
        }
        posts += 1
        return response(500, {})
      },
    })

    await expect(jira.request('GET', 'issue/X')).resolves.toEqual({ ok: true })
    expect(gets).toBe(3)
    await expect(jira.request('POST', 'issue/X/comment', {})).rejects.toThrow(JiraError)
    expect(posts).toBe(1)
  })

  it('explains a non-JSON response instead of failing to parse it', async () => {
    // Nearly always a wrong base URL landing on an HTML login page.
    const jira = new HttpJira({
      baseUrl: 'https://x.atlassian.net/wiki',
      email: 'a@b.c',
      apiToken: 't',
      fetchImpl: async () =>
        new Response('<html>login</html>', { status: 200, headers: { 'content-type': 'text/html' } }),
    })
    await expect(jira.request('GET', 'issue/X')).rejects.toThrow(/base URL/)
  })

  it('redacts credentials from errors', () => {
    expect(redactJira('token ATATT3xFfGF0abcdefghij')).toContain('[REDACTED]')
    expect(redactJira('{"api_key": "hunter2"}')).toContain('[REDACTED]')
  })
})

describe('claiming the ticket', () => {
  it('assigns it to whoever the credentials belong to', async () => {
    /*
     * A ticket in progress with no assignee is indistinguishable from one nobody has picked
     * up, and a board full of those is how a team stops trusting the board. Jira Cloud assigns
     * by account id rather than email, so the id comes from `myself` — which is also the only
     * identity a run can honestly claim.
     */
    const fake = new FakeJira()
    const tracker = new JiraTracker({ transport: fake, jql: 'project = PDC' })

    await tracker.assignToSelf('ABC-6543')

    expect(fake.assignee).toBe('acct-12345')
    expect(fake.calls.some((c) => c.method === 'PUT' && c.path.endsWith('/assignee'))).toBe(true)
  })

  it('looks the account up once, however many tickets it claims', async () => {
    // It cannot change within a process, and a lookup per ticket is a request per ticket.
    const fake = new FakeJira()
    const tracker = new JiraTracker({ transport: fake, jql: 'project = PDC' })

    await tracker.assignToSelf('ABC-1')
    await tracker.assignToSelf('ABC-2')

    expect(fake.calls.filter((c) => c.path === 'myself')).toHaveLength(1)
  })

  it('does nothing rather than failing when the account cannot be read', async () => {
    // Losing a dispatched run over an assignee would be the wrong trade.
    const fake = new FakeJira()
    fake.accountId = ''
    const tracker = new JiraTracker({ transport: fake, jql: 'project = PDC' })

    await expect(tracker.assignToSelf('ABC-1')).resolves.toBeUndefined()
    expect(fake.assignee).toBeNull()
  })
})
