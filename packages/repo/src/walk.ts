/** Filesystem walking for repos where `git ls-files` is unavailable. */
import { promises as fs } from 'node:fs'
import * as path from 'node:path'

const DEFAULT_IGNORES = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', 'coverage', '.next', '.nuxt',
  '.turbo', '.cache', 'vendor', 'target', '__pycache__', '.venv', 'venv',
  '.pytest_cache', '.mypy_cache', '.gradle', 'Pods', 'DerivedData', '.svelte-kit',
])

/** Files that are generated or vendored carry no design information worth indexing. */
const IGNORED_SUFFIXES = [
  '.min.js', '.min.css', '.map', '.lock', '.snap', '.d.ts',
  '-lock.json', '-lock.yaml',
]

export function isIgnoredFile(name: string): boolean {
  return IGNORED_SUFFIXES.some((s) => name.endsWith(s))
}

/**
 * Walk the tree, and say so when the ceiling cut it short.
 *
 * The caller cannot tell a repository of exactly `maxFiles` files from one of ten times that
 * otherwise, and the difference matters: everything downstream speaks with full confidence
 * about whatever the index contains, including "nothing similar exists".
 *
 * One past the ceiling is collected so that hitting it is detectable, then dropped.
 */
export async function walk(
  root: string,
  maxFiles = 20_000,
): Promise<{ files: string[]; truncated: boolean }> {
  const results: string[] = []
  const ceiling = maxFiles + 1

  async function recurse(dir: string, depth: number): Promise<void> {
    if (results.length >= ceiling || depth > 12) return
    let entries
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (results.length >= ceiling) return
      if (entry.name.startsWith('.') && entry.name !== '.github') continue
      if (DEFAULT_IGNORES.has(entry.name)) continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await recurse(full, depth + 1)
      } else if (entry.isFile() && !isIgnoredFile(entry.name)) {
        results.push(path.relative(root, full))
      }
    }
  }

  await recurse(root, 0)
  const truncated = results.length > maxFiles
  return { files: results.sort().slice(0, maxFiles), truncated }
}
