/**
 * `ctxmux state` — share run state between machines and between jobs.
 *
 * `.ctxmux/state/` holds what happened: run records, trajectories, and the ledger of
 * observations `learn` draws on. It is deliberately not committed to your branch — it records
 * absolute worktree paths and changes on every run, and putting that in the history of the
 * code would be noise in every diff.
 *
 * That local-only choice costs two things, and this command is what buys them back.
 *
 * A workflow reacting to a review runs in a *fresh checkout*. It cannot see the run that a
 * different workflow dispatched an hour earlier, so `event` finds nothing and the reviewer's
 * feedback reaches no one.
 *
 * And recurrence — the whole basis of `learn` — is measured against one person's history. Five
 * teammates each hitting the same convention once is five ledgers with one observation apiece,
 * and a lesson that is never proposed. Which is backwards for a tool about shared conventions.
 *
 * So state is synchronised through an orphan branch: no new infrastructure, no service, and it
 * works anywhere git does. Explicitly, on demand — nothing is pushed behind your back.
 */
import { spawn } from 'node:child_process'
import { promises as fs } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { bullet, c, error, heading, info, success, warn } from '../ui.js'
import { flagString, type ParsedArgs } from '../args.js'

const STATE_DIR = '.ctxmux/state'
const DEFAULT_BRANCH = 'ctxmux-state'

interface GitResult {
  code: number
  stdout: string
  stderr: string
}

function git(cwd: string, args: string[]): Promise<GitResult> {
  return new Promise((resolve) => {
    const child = spawn('git', args, { cwd, windowsHide: true })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => (stdout += d))
    child.stderr.on('data', (d) => (stderr += d))
    child.on('error', (err) => resolve({ code: 127, stdout, stderr: String(err) }))
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }))
  })
}

/** Copy a directory tree, creating what it needs. Used in both directions. */
async function copyTree(from: string, to: string): Promise<number> {
  let copied = 0
  const entries = await fs.readdir(from, { withFileTypes: true }).catch(() => [])

  for (const entry of entries) {
    const src = path.join(from, entry.name)
    const dest = path.join(to, entry.name)
    if (entry.isDirectory()) {
      await fs.mkdir(dest, { recursive: true })
      copied += await copyTree(src, dest)
    } else if (entry.isFile()) {
      await fs.mkdir(path.dirname(dest), { recursive: true })
      await fs.copyFile(src, dest)
      copied += 1
    }
  }
  return copied
}

interface StateOptions {
  root: string
  branch: string
  remote: string
}

function options(args: ParsedArgs): StateOptions {
  return {
    root: path.resolve(flagString(args, 'root') ?? process.cwd()),
    branch: flagString(args, 'branch') ?? DEFAULT_BRANCH,
    remote: flagString(args, 'remote') ?? 'origin',
  }
}

/**
 * Work on the state branch in a throwaway worktree.
 *
 * Never touches the checkout the caller is standing in: a command that quietly switched your
 * branch to synchronise some bookkeeping would be indefensible, and worse in CI where the
 * checkout is what is being built.
 */
async function inStateWorktree<T>(
  opts: StateOptions,
  fn: (dir: string, existed: boolean) => Promise<T>,
): Promise<T> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ctxmux-state-'))
  await git(opts.root, ['fetch', opts.remote, opts.branch, '--depth', '1']).catch(() => {})

  const remoteHas = (await git(opts.root, ['rev-parse', '--verify', `${opts.remote}/${opts.branch}`])).code === 0
  const localHas = (await git(opts.root, ['rev-parse', '--verify', opts.branch])).code === 0
  const existed = remoteHas || localHas

  const added = existed
    ? await git(opts.root, ['worktree', 'add', '--detach', dir, remoteHas ? `${opts.remote}/${opts.branch}` : opts.branch])
    : await git(opts.root, ['worktree', 'add', '--detach', dir])

  if (added.code !== 0) {
    await fs.rm(dir, { recursive: true, force: true })
    throw new Error(`could not prepare a worktree for "${opts.branch}": ${added.stderr.trim()}`)
  }

  try {
    return await fn(dir, existed)
  } finally {
    await git(opts.root, ['worktree', 'remove', '--force', dir]).catch(() => {})
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

export async function statePushCommand(args: ParsedArgs): Promise<number> {
  const opts = options(args)
  const local = path.join(opts.root, STATE_DIR)

  const files = await fs.readdir(local).catch(() => null)
  if (files === null || files.length === 0) {
    warn('Nothing to push — no run state here yet.')
    info('    ' + c.dim('State appears once a run has happened. Try `ctxmux run` first.'))
    return 0
  }

  return inStateWorktree(opts, async (dir, existed) => {
    // Orphan, so the state branch shares no history with the code and can never be merged
    // into it by accident.
    if (!existed) await git(dir, ['checkout', '--orphan', opts.branch])
    else await git(dir, ['checkout', '-B', opts.branch])

    await fs.rm(path.join(dir, STATE_DIR), { recursive: true, force: true })
    await fs.mkdir(path.join(dir, STATE_DIR), { recursive: true })
    const copied = await copyTree(local, path.join(dir, STATE_DIR))

    // The branch carries state and nothing else; the working tree came from a checkout.
    for (const entry of await fs.readdir(dir)) {
      if (entry === '.git' || entry === '.ctxmux') continue
      await fs.rm(path.join(dir, entry), { recursive: true, force: true })
    }

    await git(dir, ['add', '-A'])
    const status = await git(dir, ['status', '--porcelain'])
    if (!status.stdout.trim()) {
      success('Already up to date; nothing changed.')
      return 0
    }

    const commit = await git(dir, ['commit', '-m', `state: ${copied} file(s)`])
    if (commit.code !== 0) {
      error(`Could not record the state: ${commit.stderr.trim()}`)
      return 1
    }

    const pushed = await git(dir, ['push', opts.remote, `HEAD:refs/heads/${opts.branch}`])
    if (pushed.code !== 0) {
      error(`Could not push "${opts.branch}": ${pushed.stderr.trim()}`)
      info('    ' + c.dim('The token needs write access to the repository for this to work.'))
      return 1
    }

    heading('Pushed')
    bullet(`${copied} file(s) to ${opts.remote}/${opts.branch}`)
    return 0
  })
}

export async function statePullCommand(args: ParsedArgs): Promise<number> {
  const opts = options(args)
  const local = path.join(opts.root, STATE_DIR)

  return inStateWorktree(opts, async (dir, existed) => {
    if (!existed) {
      warn(`No "${opts.branch}" branch on ${opts.remote} yet.`)
      info('    ' + c.dim('It appears the first time somebody runs `ctxmux state push`.'))
      return 0
    }

    const remote = path.join(dir, STATE_DIR)
    if (!(await fs.readdir(remote).catch(() => null))) {
      warn(`"${opts.branch}" exists but carries no state.`)
      return 0
    }

    await fs.mkdir(local, { recursive: true })
    const copied = await copyTree(remote, local)

    heading('Pulled')
    bullet(`${copied} file(s) from ${opts.remote}/${opts.branch}`)
    info('')
    info(c.dim('  Merged into what was already here. `ctxmux status` shows the runs;'))
    info(c.dim('  `ctxmux learn` now sees everybody’s observations, not only yours.'))
    return 0
  })
}
