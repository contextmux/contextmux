/** Builds and caches the symbol index. */
import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { collectGitSignals, listTrackedFiles, type GitSignals } from './git.js'
import { extractSymbols, supportsSymbols, type SymbolRef } from './symbols.js'
import { isIgnoredFile, walk } from './walk.js'

export interface FileEntry {
  path: string
  ext: string
  bytes: number
  symbols: SymbolRef[]
  /** Content hash, so an unchanged file is never re-parsed. */
  hash: string
}

export interface RepoIndex {
  root: string
  files: FileEntry[]
  git: GitSignals
  builtAt: number
  /** Files seen but not parsed, with the reason. Keeps "why is X missing" answerable. */
  skipped: number
  /**
   * Whether the file ceiling cut the repository short.
   *
   * Distinct from `skipped`, which counts files reached and rejected. This says the index does
   * not cover the whole repository, so an answer like "nothing similar exists" is drawn from a
   * partial view and must not be stated as fact.
   */
  truncated: boolean
}

const MAX_FILE_BYTES = 512 * 1024
/**
 * Bump whenever symbol extraction changes.
 *
 * Cache entries are keyed by file content, so a change to the *extractor* is invisible to
 * them: unchanged files keep returning symbols parsed by the old logic. This version is the
 * only invalidation signal for that case.
 */
const CACHE_VERSION = 2

interface CacheShape {
  version: number
  entries: Record<string, { hash: string; symbols: SymbolRef[]; bytes: number }>
}

async function loadCache(root: string): Promise<CacheShape> {
  try {
    const raw = await fs.readFile(path.join(root, '.ctxmux', 'cache', 'index.json'), 'utf8')
    const parsed = JSON.parse(raw) as CacheShape
    if (parsed.version === CACHE_VERSION) return parsed
  } catch {
    /* cold cache */
  }
  return { version: CACHE_VERSION, entries: {} }
}

async function saveCache(root: string, cache: CacheShape): Promise<void> {
  try {
    const dir = path.join(root, '.ctxmux', 'cache')
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, 'index.json'), JSON.stringify(cache), 'utf8')
  } catch {
    // A cache write failure must never fail the command it was speeding up.
  }
}

export interface IndexOptions {
  /** Skip reading and writing the on-disk cache. */
  noCache?: boolean
  /** Skip git log analysis, which is the slowest part on large repos. */
  noGit?: boolean
  maxFiles?: number
}

export async function buildIndex(root: string, opts: IndexOptions = {}): Promise<RepoIndex> {
  const maxFiles = opts.maxFiles ?? 20_000

  /*
   * git ls-files gives exact gitignore semantics; the walker is the fallback.
   *
   * Empty counts as no answer, not as an empty repository. `git ls-files` returns nothing —
   * successfully — in a repository with no commits and nothing staged, which is the state every
   * project is in for its first hour and any project is in while work sits untracked. Taking
   * that literally produced an index of zero files, and the map built from it told the agent
   * "nothing similar appears to exist yet, so writing something new is appropriate" about a
   * codebase full of code. That is worse than no map: it is a confident instruction to
   * duplicate whatever is already there, and it goes into the prompt.
   */
  let paths = await listTrackedFiles(root)
  let truncated = false
  if (paths === null || paths.length === 0) {
    const walked = await walk(root, maxFiles)
    paths = walked.files
    truncated = walked.truncated
  }
  paths = paths.filter((p) => !isIgnoredFile(path.basename(p)))

  /*
   * Truncation counts as skipped, because it is.
   *
   * The ceiling was applied with a bare `slice` and nothing recorded it, so a repository larger
   * than the limit produced an index covering part of itself and reported the same clean
   * summary as one that fitted. Everything downstream — the map, `find_similar`, the
   * "nothing similar exists" answer — then spoke with full confidence about a partial view.
   */
  let skipped = Math.max(0, paths.length - maxFiles)
  if (skipped > 0) {
    paths = paths.slice(0, maxFiles)
    truncated = true
  }

  const cache = opts.noCache ? { version: CACHE_VERSION, entries: {} } : await loadCache(root)
  const nextCache: CacheShape = { version: CACHE_VERSION, entries: {} }
  const files: FileEntry[] = []

  for (const rel of paths) {
    const ext = path.extname(rel)
    if (!supportsSymbols(ext)) {
      skipped++
      continue
    }
    const abs = path.join(root, rel)
    let stat
    try {
      stat = await fs.stat(abs)
    } catch {
      skipped++
      continue
    }
    if (stat.size > MAX_FILE_BYTES) {
      skipped++
      continue
    }

    let content: string
    try {
      content = await fs.readFile(abs, 'utf8')
    } catch {
      skipped++
      continue
    }

    const hash = createHash('sha1').update(content).digest('hex').slice(0, 16)
    const cached = cache.entries[rel]
    const symbols = cached && cached.hash === hash ? cached.symbols : extractSymbols(content, ext)

    nextCache.entries[rel] = { hash, symbols, bytes: stat.size }
    files.push({ path: rel, ext, bytes: stat.size, symbols, hash })
  }

  if (!opts.noCache) await saveCache(root, nextCache)

  const git = opts.noGit
    ? { commitCounts: new Map(), lastTouched: new Map(), coChange: new Map() }
    : await collectGitSignals(root)

  return { root, files, git, builtAt: Date.now(), skipped, truncated }
}
