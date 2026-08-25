/**
 * Git as a data source.
 *
 * Two reasons to shell out to git rather than reimplement it: `git ls-files` gives exact
 * gitignore semantics for free (a hand-rolled matcher is always subtly wrong), and the commit
 * graph carries recency and co-change signals that no static analysis can produce.
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const exec = promisify(execFile)

async function git(root: string, args: string[]): Promise<string> {
  /*
   * `core.quotePath=false`, or the two commands below disagree about what a file is called.
   *
   * `ls-files -z` emits raw bytes, but `log --name-only` C-quotes anything non-ASCII by
   * default: the same file arrives as `café.ts` from one and `"caf\303\251.ts"` from the
   * other. Nothing ever joined those two spellings, so every file with an accent in its name
   * had no commit count, no last-touched date and no co-change edges — it simply ranked last
   * in the map, and told the agent it was unimportant.
   */
  const { stdout } = await exec('git', ['-c', 'core.quotePath=false', ...args], {
    cwd: root,
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  })
  return stdout
}

export async function isGitRepo(root: string): Promise<boolean> {
  try {
    await git(root, ['rev-parse', '--git-dir'])
    return true
  } catch {
    return false
  }
}

/** Tracked files, honouring .gitignore exactly. Returns null outside a git repo. */
export async function listTrackedFiles(root: string): Promise<string[] | null> {
  try {
    const out = await git(root, ['ls-files', '-z', '--cached', '--exclude-standard'])
    return out.split('\0').filter(Boolean)
  } catch {
    return null
  }
}

export interface GitSignals {
  /** path → number of commits touching it in the window. */
  commitCounts: Map<string, number>
  /** path → most recent commit timestamp (unix seconds). */
  lastTouched: Map<string, number>
  /** path → paths that changed in the same commits, with co-occurrence counts. */
  coChange: Map<string, Map<string, number>>
}

const EMPTY: GitSignals = {
  commitCounts: new Map(),
  lastTouched: new Map(),
  coChange: new Map(),
}

/**
 * Recency and co-change over the last `maxCommits` commits.
 *
 * Co-change is the highest-signal cheap heuristic available: files that historically change
 * together are usually the files a new change will need to touch together, and it captures
 * couplings that no import graph shows — a component and its test, a reducer and its
 * selector, a schema and its migration.
 */
export async function collectGitSignals(root: string, maxCommits = 400): Promise<GitSignals> {
  let raw: string
  try {
    raw = await git(root, [
      'log',
      `-n${maxCommits}`,
      '--pretty=format:%x00%ct',
      '--name-only',
      '--no-merges',
    ])
  } catch {
    return EMPTY
  }

  const signals: GitSignals = {
    commitCounts: new Map(),
    lastTouched: new Map(),
    coChange: new Map(),
  }

  for (const chunk of raw.split('\0')) {
    if (!chunk.trim()) continue
    const lines = chunk.split('\n')
    const ts = Number(lines[0]?.trim())
    const files = lines.slice(1).map((l) => l.trim()).filter(Boolean)
    if (!Number.isFinite(ts) || files.length === 0) continue

    for (const f of files) {
      signals.commitCounts.set(f, (signals.commitCounts.get(f) ?? 0) + 1)
      const prev = signals.lastTouched.get(f) ?? 0
      if (ts > prev) signals.lastTouched.set(f, ts)
    }

    // Sprawling commits (a lint sweep, a dependency bump) say nothing about coupling and
    // would otherwise dominate the co-change graph with n^2 noise.
    if (files.length > 25) continue

    for (const a of files) {
      const row = signals.coChange.get(a) ?? new Map<string, number>()
      for (const b of files) {
        if (a === b) continue
        row.set(b, (row.get(b) ?? 0) + 1)
      }
      signals.coChange.set(a, row)
    }
  }

  return signals
}
