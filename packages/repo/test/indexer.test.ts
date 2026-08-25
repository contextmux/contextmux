/**
 * Building the index.
 *
 * The interesting cases are about *where the file list comes from*, and they only appear
 * against a real repository — so these use one rather than a double.
 */
import { spawn } from 'node:child_process'
import { promises as fs } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildIndex } from '../src/indexer.js'

let root: string

function git(args: string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn('git', args, { cwd: root, windowsHide: true, stdio: 'ignore' })
    child.on('error', () => resolve(1))
    child.on('close', (code) => resolve(code ?? 1))
  })
}

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'ctxmux-index-'))
  await fs.mkdir(path.join(root, 'src'), { recursive: true })
  await fs.writeFile(
    path.join(root, 'src/dates.ts'),
    '/** Format a date. */\nexport function formatDate(d: Date) { return d.toISOString() }\n',
    'utf8',
  )
  await fs.writeFile(path.join(root, 'package.json'), '{"name":"fixture"}', 'utf8')
})
afterEach(() => fs.rm(root, { recursive: true, force: true }))

describe('finding the files', () => {
  it('indexes a repository that has no commits yet', async () => {
    /*
     * `git ls-files` returns nothing — successfully — in a repository with no commits and
     * nothing staged. That is the state every project is in for its first hour, and any project
     * is in while work sits untracked. Treating it as "there are no files" produced an index of
     * zero, and the map built from it told the agent that nothing similar existed and writing
     * something new was appropriate — a confident instruction to duplicate whatever was already
     * there, delivered straight into the prompt.
     */
    await git(['init', '-q', '-b', 'main'])

    const index = await buildIndex(root, { noCache: true, noGit: true })

    expect(index.files.map((f) => f.path)).toContain('src/dates.ts')
  })

  it('indexes a directory that is not a repository at all', async () => {
    const index = await buildIndex(root, { noCache: true, noGit: true })
    expect(index.files.map((f) => f.path)).toContain('src/dates.ts')
  })

  it('indexes a repository with commits', async () => {
    await git(['init', '-q', '-b', 'main'])
    await git(['config', 'user.email', 'test@example.com'])
    await git(['config', 'user.name', 'Test'])
    await git(['add', '-A'])
    await git(['commit', '-qm', 'initial'])

    const index = await buildIndex(root, { noCache: true, noGit: true })

    expect(index.files.map((f) => f.path)).toContain('src/dates.ts')
  })

  it('extracts the symbols it finds', async () => {
    const index = await buildIndex(root, { noCache: true, noGit: true })
    const file = index.files.find((f) => f.path === 'src/dates.ts')

    expect(file?.symbols.map((s) => s.name)).toContain('formatDate')
    expect(file?.symbols[0]?.doc).toContain('Format a date')
  })

  it('reuses cached symbols for a file that has not changed', async () => {
    await buildIndex(root, { noGit: true })
    const again = await buildIndex(root, { noGit: true })

    expect(again.files.find((f) => f.path === 'src/dates.ts')?.symbols).toHaveLength(1)
  })

  it('skips files it cannot extract symbols from, and counts them', async () => {
    await fs.writeFile(path.join(root, 'README.md'), '# docs\n', 'utf8')

    const index = await buildIndex(root, { noCache: true, noGit: true })

    expect(index.files.map((f) => f.path)).not.toContain('README.md')
    expect(index.skipped).toBeGreaterThan(0)
  })
})

describe('the file ceiling', () => {
  it('reports files dropped by the ceiling as skipped', async () => {
    /*
     * The limit was applied with a bare `slice` and nothing recorded it, so a repository larger
     * than the ceiling produced a partial index and reported the same clean summary as one that
     * fitted — and `find_similar` then answered "nothing similar exists" from a view of half
     * the codebase.
     */
    for (let i = 0; i < 12; i++) {
      await fs.writeFile(path.join(root, `f${i}.ts`), `export const v${i} = ${i}\n`)
    }

    const index = await buildIndex(root, { maxFiles: 5, noCache: true })
    expect(index.files.length).toBeLessThanOrEqual(5)
    expect(index.truncated).toBe(true)
  })

  it('does not claim truncation when everything fits', async () => {
    await fs.writeFile(path.join(root, 'only.ts'), 'export const v = 1\n')

    const index = await buildIndex(root, { maxFiles: 5_000, noCache: true })
    expect(index.truncated).toBe(false)
    // package.json comes from the fixture and carries no symbols, which is a reached-and-
    // rejected file rather than an unreached one.
    expect(index.skipped).toBe(1)
  })
})
