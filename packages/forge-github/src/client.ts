/**
 * GitHub API access.
 *
 * The client is an interface rather than a concrete fetch call so every adapter above it can
 * be tested offline against a recorded fixture. Adapters that talk to a live service and can
 * only be exercised with real credentials do not get tested, and untested adapters are where
 * vendor drift hides.
 *
 * Two implementations ship: a token-based one for CI, and one that shells out to `gh` so a
 * developer's existing login just works with no token to create or leak.
 */
import { spawn } from 'node:child_process'

/** Run a command, optionally writing to its stdin, and collect the output. */
function run(
  bin: string,
  args: string[],
  input?: string,
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(bin, args, { windowsHide: true })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => (stdout += d))
    child.stderr.on('data', (d) => (stderr += d))
    child.on('error', (err) => resolve({ code: 127, stdout, stderr: String(err) }))
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }))
    // An unlistened `error` on stdin is an unhandled event, and `gh` exiting early on a bad
    // argument is an ordinary way to provoke one. Closing it unconditionally also stops a
    // subcommand that reads stdin from waiting on an EOF nobody was going to send.
    child.stdin.on('error', () => {})
    if (input !== undefined) child.stdin.write(input)
    child.stdin.end()
  })
}

export interface GitHubClient {
  /** REST request. `path` is relative to the API root, e.g. `repos/o/r/issues`. */
  rest<T = unknown>(
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<T>
  /**
   * A GET whose response is not JSON, such as a diff.
   *
   * Separate from `rest` because the difference is not the path, it is the `Accept` header —
   * and because the return type has to be a string rather than a `T` the caller asserts. A
   * generic that is never checked will happily describe an object as a string, which is how a
   * pull request's JSON ended up being handed to `diff.split`.
   */
  raw?(path: string, accept: string): Promise<string>
  /** GraphQL request. Some capabilities — assigning a bot — exist only here. */
  graphql<T = unknown>(query: string, variables?: Record<string, unknown>, headers?: Record<string, string>): Promise<T>
}

export class GitHubApiError extends Error {
  override name = 'GitHubApiError'
  constructor(
    message: string,
    readonly status: number,
    readonly path: string,
  ) {
    super(message)
  }
}

/** Redact anything that looks like a credential before it reaches a log. */
export function redact(text: string): string {
  return text
    // Classic tokens: ghp_, gho_, ghu_, ghs_, ghr_.
    .replace(/gh[pousr]_[A-Za-z0-9]{16,}/g, '[REDACTED]')
    // Fine-grained personal access tokens, which the pattern above does not reach — and which
    // are the ones GitHub now steers people towards, so this is the common case rather than
    // the exotic one.
    .replace(/github_pat_[A-Za-z0-9_]{20,}/g, '[REDACTED]')
    .replace(/(["']?(?:token|authorization|password|secret|key)["']?\s*[:=]\s*["']?)[^"'\s,}]+/gi, '$1[REDACTED]')
}

export interface TokenClientOptions {
  token: string
  baseUrl?: string
  /** Attempts for requests that are safe to repeat. */
  maxAttempts?: number
  fetchImpl?: typeof fetch
  /**
   * Injectable delay.
   *
   * Backoff is real time, and a suite that actually sleeps through it stops being run. Tests
   * pass a no-op and exercise the retry logic instantly.
   */
  sleep?: (ms: number) => Promise<void>
}

export class TokenClient implements GitHubClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  private readonly sleep: (ms: number) => Promise<void>

  constructor(private readonly opts: TokenClientOptions) {
    this.baseUrl = opts.baseUrl ?? 'https://api.github.com'
    this.fetchImpl = opts.fetchImpl ?? fetch
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)))
  }

  private async request<T>(
    method: string,
    url: string,
    body: unknown,
    path: string,
    idempotent: boolean,
  ): Promise<T> {
    const maxAttempts = idempotent ? (this.opts.maxAttempts ?? 3) : 1

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const res = await this.fetchImpl(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.opts.token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })

      if (res.status === 429 || (res.status >= 500 && idempotent)) {
        // Honour the server's own guidance when it gives any, rather than guessing.
        const retryAfter = Number(res.headers.get('retry-after'))
        const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 500
        if (attempt < maxAttempts) {
          await this.sleep(waitMs)
          continue
        }
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new GitHubApiError(
          `HTTP ${res.status}: ${redact(text).slice(0, 300)}`,
          res.status,
          path,
        )
      }

      if (res.status === 204) return undefined as T
      return (await res.json()) as T
    }

    // Unreachable: the final attempt either returns or throws above. Present so the function
    // has a return type the compiler can see.
    throw new GitHubApiError('request failed', 0, path)
  }

  async rest<T>(method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<T> {
    // Only GET is safe to repeat. Retrying a POST duplicates comments and issues.
    return this.request<T>(method, `${this.baseUrl}/${path}`, body, path, method === 'GET')
  }

  async raw(path: string, accept: string): Promise<string> {
    const res = await this.fetchImpl(`${this.baseUrl}/${path}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${this.opts.token}`, Accept: accept },
    })
    if (!res.ok) throw new GitHubApiError(`HTTP ${res.status}`, res.status, path)
    return res.text()
  }

  async graphql<T>(query: string, variables: Record<string, unknown> = {}, headers: Record<string, string> = {}): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl}/graphql`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.opts.token}`,
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ query, variables }),
    })

    /*
     * Check the transport before the payload.
     *
     * A 401 or a 502 does not come back in GraphQL's `errors` array — it comes back as a body
     * with no `data` at all. Reading straight through left `data` undefined, and the caller's
     * optional chaining then rendered that as an empty list. So a wrong token looked exactly
     * like "this issue has no linked pull requests", which is the most expensive way for
     * authentication to fail: silently, and with a plausible answer.
     */
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new GitHubApiError(
        `HTTP ${res.status}: ${redact(text).slice(0, 300)}`,
        res.status,
        'graphql',
      )
    }

    const json = (await res.json().catch(() => null)) as {
      data?: T
      errors?: Array<{ message: string }>
    } | null

    if (!json) throw new GitHubApiError('GraphQL response was not JSON', res.status, 'graphql')
    if (json.errors?.length) {
      throw new GitHubApiError(redact(json.errors.map((e) => e.message).join('; ')), res.status, 'graphql')
    }
    if (json.data === undefined) {
      throw new GitHubApiError('GraphQL response carried no data', res.status, 'graphql')
    }
    return json.data
  }
}

/**
 * Client backed by the `gh` CLI.
 *
 * Uses whatever login a developer already has, so trying contextmux locally needs no token
 * minted, stored or accidentally committed.
 */
export class GhCliClient implements GitHubClient {
  constructor(private readonly bin = 'gh') {}

  static async available(bin = 'gh'): Promise<{ ok: boolean; detail: string }> {
    const res = await run(bin, ['auth', 'status'])
    if (res.code === 127) return { ok: false, detail: `\`${bin}\` is not installed` }
    if (res.code !== 0) return { ok: false, detail: 'not authenticated — run `gh auth login`' }
    // `gh auth status` writes its report to stderr.
    const account = /account (\S+)/.exec(res.stdout + res.stderr)?.[1]
    return { ok: true, detail: account ? `authenticated as ${account}` : 'authenticated' }
  }

  private async run(args: string[], input?: string): Promise<string> {
    const res = await run(this.bin, args, input)
    if (res.code !== 0) {
      throw new GitHubApiError(redact(res.stderr || 'gh failed'), 0, args.join(' '))
    }
    return res.stdout
  }

  async rest<T>(method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<T> {
    const args = ['api', '--method', method, path]
    if (body !== undefined) args.push('--input', '-')
    const out = await this.run(args, body === undefined ? undefined : JSON.stringify(body))
    return out.trim() ? (JSON.parse(out) as T) : (undefined as T)
  }

  async raw(path: string, accept: string): Promise<string> {
    return this.run(['api', '-H', `Accept: ${accept}`, path])
  }

  async graphql<T>(query: string, variables: Record<string, unknown> = {}, headers: Record<string, string> = {}): Promise<T> {
    const args = ['api', 'graphql', '--input', '-']
    for (const [k, v] of Object.entries(headers)) args.push('-H', `${k}: ${v}`)
    const out = await this.run(args, JSON.stringify({ query, variables }))
    const json = JSON.parse(out) as { data?: T; errors?: Array<{ message: string }> }
    if (json.errors?.length) {
      throw new GitHubApiError(redact(json.errors.map((e) => e.message).join('; ')), 0, 'graphql')
    }
    return json.data as T
  }
}

/** Pick a client: an explicit token if present, otherwise the developer's `gh` login. */
export async function resolveClient(opts: { token?: string; baseUrl?: string } = {}): Promise<{
  client: GitHubClient
  source: string
}> {
  const token = opts.token ?? process.env['GITHUB_TOKEN'] ?? process.env['GH_TOKEN']
  if (token) {
    return {
      client: new TokenClient({ token, ...(opts.baseUrl ? { baseUrl: opts.baseUrl } : {}) }),
      source: 'GITHUB_TOKEN',
    }
  }
  const gh = await GhCliClient.available()
  if (gh.ok) return { client: new GhCliClient(), source: `gh CLI (${gh.detail})` }
  throw new GitHubApiError(
    `No GitHub credentials. Set GITHUB_TOKEN, or run \`gh auth login\`. (${gh.detail})`,
    401,
    'auth',
  )
}
