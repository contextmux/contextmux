/**
 * Recency and co-change.
 *
 * These signals decide what the repo map puts in front of an agent, and they are joined by
 * path against the tracked-file list. A path that does not join is not a smaller signal — it
 * is a file the map says nobody has ever touched.
 */
import { spawn } from 'node:child_process'
import { promises as fs } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { collectGitSignals, listTrackedFiles } from '../src/git.js'

let root: string

function git(args: string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn('git', args, { cwd: root, windowsHide: true, stdio: 'ignore' })
    child.on('error', () => resolve(1))
    child.on('close', (code) => resolve(code ?? 1))
  })
}

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'ctxmux-gitsig-'))
  await git(['init', '-q'])
  await git(['config', 'user.email', 'a@b.c'])
  await git(['config', 'user.name', 'Test'])
})

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true })
})

describe('non-ascii paths', () => {
  it('keys signals the same way the tracked-file list names them', async () => {
    /*
     * `ls-files -z` emits raw bytes; `log --name-only` C-quotes anything non-ASCII unless it is
     * told not to. The same file arrived as `café.ts` from one and `"caf\303\251.ts"` from the
     * other, and nothing joined those spellings — so every file with an accent in its name had
     * no commit count, no last-touched date and no co-change edges, and ranked last in the map
     * as a file nobody had ever touched.
     */
    await fs.writeFile(path.join(root, 'café.ts'), 'export const a = 1\n')
    await fs.writeFile(path.join(root, 'naïve.ts'), 'export const b = 2\n')
    await git(['add', '-A'])
    await git(['commit', '-qm', 'one'])

    const tracked = await listTrackedFiles(root)
    const signals = await collectGitSignals(root)

    expect(tracked).toContain('café.ts')
    for (const file of tracked ?? []) {
      expect(signals.commitCounts.get(file)).toBe(1)
      expect(signals.lastTouched.get(file)).toBeGreaterThan(0)
    }
    // And nothing is filed under the escaped spelling.
    expect([...signals.commitCounts.keys()].some((k) => k.includes('\\3'))).toBe(false)
  })

  it('records co-change between them', async () => {
    await fs.writeFile(path.join(root, 'café.ts'), 'a\n')
    await fs.writeFile(path.join(root, 'plain.ts'), 'b\n')
    await git(['add', '-A'])
    await git(['commit', '-qm', 'together'])

    const signals = await collectGitSignals(root)
    expect(signals.coChange.get('café.ts')?.get('plain.ts')).toBe(1)
    expect(signals.coChange.get('plain.ts')?.get('café.ts')).toBe(1)
  })
})
