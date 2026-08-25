/**
 * Local process runner, with optional git worktree isolation.
 *
 * Isolation matters more than it first appears. An agent working directly in your checkout
 * mixes its changes with yours, and a failed run leaves you to work out which edits were
 * whose. A worktree gives the agent a real, complete checkout on its own branch: the diff is
 * exactly what it did, abandoning the run is `git worktree remove`, and you can keep working
 * meanwhile.
 */
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import type { CommandResult, Runner } from '@contextmux/core'

async function git(cwd: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn('git', args, { cwd, windowsHide: true })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => (stdout += d))
    child.stderr.on('data', (d) => (stderr += d))
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }))
    child.on('error', (err) => resolve({ code: 1, stdout, stderr: String(err) }))
  })
}

/**
 * Paths contextmux writes itself during a run.
 *
 * Excluding them is not cosmetic. Run state, the index cache and the tracker's own status
 * update all land in the working tree while the agent is working, and counting them as the
 * agent's changes fails the path-scope gate on the very first verify — which spends a whole
 * correction round, and real money, asking the agent to revert files it never touched.
 */
const CTXMUX_ARTEFACTS = [
  '.ctxmux/state/',
  '.ctxmux/cache/',
  '.ctxmux/out/',
  // The tracker rewrites the task file's status while the run is in flight.
  '.ctxmux/tasks/',
]

export interface LocalRunnerOptions {
  /** Repository root. */
  root: string
  /** Extra path prefixes to ignore when reporting what changed. */
  exclude?: string[]
  /** Create a git worktree instead of running in the repository itself. */
  isolate?: boolean
  /** Branch name for an isolated run. Defaults to a generated one. */
  branch?: string
  /** Where worktrees are created. Defaults to a sibling temp directory. */
  worktreeDir?: string
  env?: Record<string, string>
  defaultTimeoutMs?: number
}

/** Locate the worktree currently checked out on a branch, if there is one. */
async function findWorktreeForBranch(root: string, branch: string): Promise<string | null> {
  const listed = await git(root, ['worktree', 'list', '--porcelain'])
  if (listed.code !== 0) return null

  let current: string | null = null
  for (const line of listed.stdout.split('\n')) {
    if (line.startsWith('worktree ')) current = line.slice('worktree '.length).trim()
    else if (line.startsWith('branch ') && current) {
      const ref = line.slice('branch '.length).trim()
      if (ref === `refs/heads/${branch}`) return current
    }
  }
  return null
}

export class LocalRunner implements Runner {
  readonly id = 'local'
  cwd: string

  private baseRef: string | null = null
  private worktreePath: string | null = null
  /*
   * The branch actually used, which is not always the one that was asked for.
   *
   * `create` defaults to a generated name when the caller does not supply one, and that name
   * only ever existed as a local. So `location()` reported no branch at all for a generated
   * run — leaving a human with a worktree path and no way to name what they were looking at —
   * and `dispose` had nothing to delete, so every such branch outlived its worktree.
   */
  private branch: string | null = null
  private disposed = false

  private isArtefact(file: string): boolean {
    const prefixes = [...CTXMUX_ARTEFACTS, ...(this.opts.exclude ?? [])]
    return prefixes.some((p) => file === p.replace(/\/$/, '') || file.startsWith(p))
  }

  private constructor(
    cwd: string,
    private readonly opts: LocalRunnerOptions,
  ) {
    this.cwd = cwd
  }

  /**
   * Create a runner.
   *
   * Isolation is requested, not guaranteed: a directory that is not a git repository, or a
   * repository with no commits, cannot host a worktree. Falling back with a clear signal beats
   * failing, but it must be visible — a caller who asked for isolation and silently did not get
   * it would have an agent editing their working tree.
   */
  static async create(opts: LocalRunnerOptions): Promise<{ runner: LocalRunner; isolated: boolean; note?: string }> {
    const root = path.resolve(opts.root)

    if (!opts.isolate) {
      const runner = new LocalRunner(root, opts)
      await runner.captureBase()
      return { runner, isolated: false }
    }

    const head = await git(root, ['rev-parse', 'HEAD'])
    if (head.code !== 0) {
      const runner = new LocalRunner(root, opts)
      await runner.captureBase()
      return {
        runner,
        isolated: false,
        note: 'isolation unavailable: not a git repository, or it has no commits — running in the working tree instead',
      }
    }

    const branch = opts.branch ?? `ctxmux/${Date.now().toString(36)}`

    /*
     * Namespace the worktree by repository, not by branch alone.
     *
     * Worktrees live in a shared temp directory, so keying them on the branch name alone means
     * two repositories running a task with the same id land on the same path — the second one
     * fails to create its worktree and silently falls back to editing the developer's
     * checkout.
     */
    const repoKey = createHash('sha1').update(root).digest('hex').slice(0, 8)
    const dir =
      opts.worktreeDir ??
      path.join(os.tmpdir(), 'ctxmux-worktrees', `${repoKey}-${branch.replace(/\//g, '-')}`)
    await fs.mkdir(path.dirname(dir), { recursive: true })

    const created = await git(root, ['worktree', 'add', '-b', branch, dir, 'HEAD'])
    if (created.code !== 0) {
      /*
       * A branch of this name already exists, which is the normal case when re-running or
       * resuming a task. Reuse its worktree rather than falling back into the developer's
       * checkout — silently putting an agent in someone's working tree because a branch name
       * collided is the worst possible failure mode here.
       */
      const existing = await findWorktreeForBranch(root, branch)
      if (existing) {
        // fall through to reuse below
        const runner = new LocalRunner(existing, opts)
        runner.worktreePath = existing
        runner.branch = branch
        runner.baseRef = head.stdout.trim()
        return { runner, isolated: true, note: `reusing the existing worktree for ${branch}` }
      }

      // A directory left behind by a previously removed worktree blocks creation. It belongs
      // to no live worktree, so clearing it is safe and keeps the run isolated.
      const stale = await fs.readdir(dir).then(
        () => true,
        () => false,
      )
      if (stale) {
        await fs.rm(dir, { recursive: true, force: true })
        await git(root, ['worktree', 'prune'])
        const retry = await git(root, ['worktree', 'add', '-B', branch, dir, 'HEAD'])
        if (retry.code === 0) {
          const runner = new LocalRunner(dir, opts)
          runner.worktreePath = dir
          runner.branch = branch
          runner.baseRef = head.stdout.trim()
          return { runner, isolated: true }
        }
      }

      const runner = new LocalRunner(root, opts)
      await runner.captureBase()
      return {
        runner,
        isolated: false,
        note: `isolation unavailable: ${created.stderr.trim() || 'git worktree add failed'} — running in the working tree instead`,
      }
    }

    const runner = new LocalRunner(dir, opts)
    runner.worktreePath = dir
    runner.branch = branch
    runner.baseRef = head.stdout.trim()
    return { runner, isolated: true }
  }

  /**
   * A runner over a branch that exists on the remote, for verifying somebody else's work.
   *
   * A delegated agent's changes live on a branch we never had. Without this the verify gates
   * ran in whatever checkout the process happened to start in — so `quality-gate` compiled the
   * developer's working tree and reported the verdict as if it were the pull request's. It
   * could pass over a broken change or fail over unrelated local edits, and neither is
   * distinguishable from a real answer.
   *
   * Detached on purpose: nothing here should ever be committed to, and a detached worktree
   * cannot be pushed from by accident.
   */
  static async atRef(opts: {
    root: string
    ref: string
    worktreeDir?: string
  }): Promise<{ runner: LocalRunner; note?: string }> {
    const root = path.resolve(opts.root)

    const fetched = await git(root, ['fetch', '--no-tags', '--depth', '1', 'origin', opts.ref])
    if (fetched.code !== 0) {
      throw new Error(
        `could not fetch "${opts.ref}" from origin: ${fetched.stderr.trim().split('\n').slice(-2).join(' ')}`,
      )
    }

    const head = await git(root, ['rev-parse', 'FETCH_HEAD'])
    if (head.code !== 0) throw new Error(`fetched "${opts.ref}" but could not resolve it`)
    const sha = head.stdout.trim()

    const repoKey = createHash('sha1').update(root).digest('hex').slice(0, 8)
    const dir =
      opts.worktreeDir ?? path.join(os.tmpdir(), 'ctxmux-verify', `${repoKey}-${sha.slice(0, 12)}`)
    await fs.mkdir(path.dirname(dir), { recursive: true })
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {})
    await git(root, ['worktree', 'prune'])

    const added = await git(root, ['worktree', 'add', '--detach', dir, sha])
    if (added.code !== 0) {
      throw new Error(`could not create a worktree at ${opts.ref}: ${added.stderr.trim()}`)
    }

    const runner = new LocalRunner(dir, { root: opts.root })
    runner.worktreePath = dir
    runner.baseRef = sha
    return { runner, note: `verifying ${opts.ref} at ${sha.slice(0, 7)}` }
  }

  /** Record where the run started, so `changedFiles` means "changed by this run". */
  private async captureBase(): Promise<void> {
    const head = await git(this.cwd, ['rev-parse', 'HEAD'])
    this.baseRef = head.code === 0 ? head.stdout.trim() : null
  }

  async exec(
    command: string,
    args: string[],
    opts: {
      timeoutMs?: number
      env?: Record<string, string>
      input?: string
      signal?: AbortSignal
      onStdoutLine?: (line: string) => void
    } = {},
  ): Promise<CommandResult> {
    if (this.disposed) throw new Error('runner has been disposed')

    const timeoutMs = opts.timeoutMs ?? this.opts.defaultTimeoutMs ?? 15 * 60_000
    const started = Date.now()

    return new Promise<CommandResult>((resolve) => {
      const child = spawn(command, args, {
        cwd: this.cwd,
        env: { ...process.env, ...this.opts.env, ...opts.env },
        windowsHide: true,
      })

      let stdout = ''
      let stderr = ''
      let timedOut = false
      let settled = false

      const finish = (code: number) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        opts.signal?.removeEventListener('abort', onAbort)
        resolve({ code, stdout, stderr, timedOut, durationMs: Date.now() - started })
      }

      const timer = setTimeout(() => {
        timedOut = true
        child.kill('SIGTERM')
        // Escalate if the process ignores SIGTERM, so a hung agent cannot pin a run forever.
        setTimeout(() => child.kill('SIGKILL'), 5_000).unref?.()
      }, timeoutMs)

      /*
       * Abort escalates the same way a timeout does.
       *
       * The monitor aborts a run precisely when the agent has stopped behaving well, which is
       * also when it is least likely to honour a polite signal. Without the escalation an
       * agent ignoring SIGTERM pins the run for the whole timeout — the exact outcome the
       * monitor exists to prevent.
       */
      const onAbort = () => {
        child.kill('SIGTERM')
        setTimeout(() => child.kill('SIGKILL'), 5_000).unref?.()
      }
      opts.signal?.addEventListener('abort', onAbort, { once: true })

      /*
       * Buffer for the caller and stream for the observer.
       *
       * Line splitting keeps a partial trailing chunk until its newline arrives — a JSON event
       * delivered across two reads would otherwise be handed over as two unparseable halves,
       * which is exactly how a naive implementation loses the tool calls it was added to see.
       */
      let pending = ''
      child.stdout.on('data', (d) => {
        const text = String(d)
        stdout += text
        if (!opts.onStdoutLine) return

        pending += text
        const lines = pending.split('\n')
        pending = lines.pop() ?? ''
        for (const line of lines) {
          if (line.trim()) {
            try {
              opts.onStdoutLine(line)
            } catch {
              // An observer that throws must never take down the run it is watching.
            }
          }
        }
      })

      child.stderr.on('data', (d) => (stderr += d))
      child.on('close', (code) => {
        // Flush whatever arrived without a trailing newline.
        if (opts.onStdoutLine && pending.trim()) {
          try {
            opts.onStdoutLine(pending)
          } catch {
            /* ignore */
          }
        }
        finish(code ?? 1)
      })
      child.on('error', (err) => {
        stderr += `\n${(err as NodeJS.ErrnoException).code === 'ENOENT' ? `command not found: ${command}` : String(err)}`
        finish(127)
      })

      /*
       * Close stdin, always, and never let it throw.
       *
       * Two separate failures live here. A child that exits before reading — a CLI rejecting
       * its arguments — makes the write raise EPIPE, and an `error` on a stream with no
       * listener is an unhandled event that takes the whole process down, killing the
       * orchestrator over a misspelled flag.
       *
       * And leaving stdin open when there is nothing to send is not neutral: a CLI that reads
       * stdin waits for an EOF that never comes, so the run burns its entire timeout doing
       * nothing at all.
       */
      child.stdin.on('error', () => {
        /* the child is gone; its exit code is the outcome that matters */
      })
      if (opts.input !== undefined) child.stdin.write(opts.input)
      child.stdin.end()
    })
  }

  /**
   * Files changed since the run started.
   *
   * Includes untracked files: a new file the agent created is very much a change, and omitting
   * it would let a scope gate miss the most obvious violation there is.
   */
  async changedFiles(): Promise<string[]> {
    const tracked = await git(this.cwd, ['diff', '--name-only', 'HEAD'])
    const untracked = await git(this.cwd, ['ls-files', '--others', '--exclude-standard'])
    const staged = await git(this.cwd, ['diff', '--name-only', '--cached'])

    const files = new Set<string>()
    for (const out of [tracked.stdout, untracked.stdout, staged.stdout]) {
      for (const line of out.split('\n')) {
        const f = line.trim()
        if (f) files.add(f)
      }
    }

    // An agent that commits its work leaves a clean tree, so also diff against the base.
    if (this.baseRef) {
      const sinceBase = await git(this.cwd, ['diff', '--name-only', `${this.baseRef}..HEAD`])
      for (const line of sinceBase.stdout.split('\n')) {
        const f = line.trim()
        if (f) files.add(f)
      }
    }

    return [...files].filter((f) => !this.isArtefact(f)).sort()
  }

  async diff(): Promise<string> {
    // Git pathspecs, so our own bookkeeping never appears in a diff a gate or a human reads.
    const exclusions = [...CTXMUX_ARTEFACTS, ...(this.opts.exclude ?? [])].map(
      (p) => `:(exclude)${p.replace(/\/$/, '')}/**`,
    )

    const parts: string[] = []
    if (this.baseRef) {
      const committed = await git(this.cwd, ['diff', `${this.baseRef}..HEAD`, '--', '.', ...exclusions])
      if (committed.stdout.trim()) parts.push(committed.stdout)
    }
    const working = await git(this.cwd, ['diff', 'HEAD', '--', '.', ...exclusions])
    if (working.stdout.trim()) parts.push(working.stdout)

    // Untracked files never appear in `git diff`; include them so review and the
    // test-integrity gate see the whole change.
    const untracked = await git(this.cwd, ['ls-files', '--others', '--exclude-standard'])
    for (const file of untracked.stdout.split('\n').map((l) => l.trim()).filter(Boolean)) {
      if (this.isArtefact(file)) continue
      const shown = await git(this.cwd, ['diff', '--no-index', '/dev/null', file])
      if (shown.stdout.trim()) parts.push(shown.stdout)
    }

    return parts.join('\n')
  }

  /** Where the work ended up, for reporting back to a human. */
  location(): { branch?: string; worktree?: string } {
    return {
      ...(this.branch ? { branch: this.branch } : {}),
      ...(this.worktreePath ? { worktree: this.worktreePath } : {}),
    }
  }

  /**
   * Dispose.
   *
   * Deliberately does *not* remove a worktree that contains work. The whole point of isolation
   * is that a human can inspect what the agent did; deleting it on the way out would throw
   * away the artefact the run existed to produce.
   *
   * A worktree that was reclaimed is cleared from `location()`, so a caller can tell afterwards
   * whether there is still anything to point a human at. Sending someone to `cd` into a
   * directory that has just been removed is worse than saying nothing.
   */
  async dispose(): Promise<void> {
    this.disposed = true
    if (!this.worktreePath) return

    const changed = await this.changedFiles().catch(() => [])
    if (changed.length > 0) return

    await git(this.opts.root, ['worktree', 'remove', '--force', this.worktreePath])
    if (this.branch) await git(this.opts.root, ['branch', '-D', this.branch])
    this.worktreePath = null
    this.branch = null
  }

  /**
   * Remove the worktree unconditionally, discarding any work in it.
   *
   * The branch goes too. Removing only the worktree left every commit reachable, so "discard"
   * discarded nothing that mattered and the branch accumulated on the next run.
   */
  async discard(): Promise<void> {
    this.disposed = true
    if (!this.worktreePath) return
    await git(this.opts.root, ['worktree', 'remove', '--force', this.worktreePath])
    if (this.branch) await git(this.opts.root, ['branch', '-D', this.branch])
    this.worktreePath = null
    this.branch = null
  }
}
