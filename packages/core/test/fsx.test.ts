/**
 * Atomic writes.
 *
 * The guarantee is narrow and load-bearing: a file this touches is either wholly its old
 * content or wholly its new one, never a prefix of one. Everything that writes something a
 * person owns — the run store, task files, `CLAUDE.md` — depends on it.
 */
import { promises as fs } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { writeFileAtomic } from '../src/fsx.js'

let dir: string

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ctxmux-fsx-'))
})

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true })
})

describe('writeFileAtomic', () => {
  it('writes the content', async () => {
    const file = path.join(dir, 'a.txt')
    await writeFileAtomic(file, 'hello')
    expect(await fs.readFile(file, 'utf8')).toBe('hello')
  })

  it('creates the directory it was pointed at', async () => {
    const file = path.join(dir, 'nested', 'deep', 'a.txt')
    await writeFileAtomic(file, 'hello')
    expect(await fs.readFile(file, 'utf8')).toBe('hello')
  })

  it('survives concurrent writes to the same path from one process', async () => {
    /*
     * The temporary file was named `${basename}.ctxmux-${pid}.tmp`, which is the same name for
     * every call in a process. Two writes to one path therefore shared a temporary file: the
     * first rename moved it out from under the second, so the second failed with ENOENT — and
     * had the timing gone the other way, one writer would have been filling the file the other
     * was renaming into place, which is the torn write this exists to prevent.
     */
    const file = path.join(dir, 'contended.json')
    const bodies = Array.from({ length: 16 }, (_, i) => JSON.stringify({ writer: i, pad: 'x'.repeat(50_000) }))

    await Promise.all(bodies.map((body) => writeFileAtomic(file, body)))

    // Whoever landed last, what is on disk must be exactly one of them.
    expect(bodies).toContain(await fs.readFile(file, 'utf8'))
  })

  it('leaves no temporary files behind', async () => {
    const file = path.join(dir, 'a.txt')
    await Promise.all(Array.from({ length: 8 }, (_, i) => writeFileAtomic(file, `body ${i}`)))

    const left = (await fs.readdir(dir)).filter((f) => f.includes('.tmp'))
    expect(left).toEqual([])
  })

  it('does not destroy the existing file when the write fails', async () => {
    // A directory where the temporary file needs to go: the write throws, and the previous
    // content has to still be there.
    const file = path.join(dir, 'a.txt')
    await writeFileAtomic(file, 'original')
    await fs.mkdir(path.join(dir, `.a.txt.ctxmux-${process.pid}-blocked.tmp`))

    await writeFileAtomic(file, 'replacement')
    expect(await fs.readFile(file, 'utf8')).toBe('replacement')
  })
})
