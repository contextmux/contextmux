/**
 * Store tests.
 *
 * `applyOnce` and `acquireLease` are the two primitives standing between "an event arrived
 * twice" and "the same comment was posted twice", so they are exercised against a real
 * filesystem rather than a double. Both had races that only appear with more than one process,
 * and a mock of the filesystem would have reproduced neither.
 */
import { promises as fs } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FileStore, MemoryStore } from '../src/store.js'

let dir: string

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ctxmux-store-'))
})
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true })
})

describe('applyOnce', () => {
  it('runs an effect once', async () => {
    const store = new FileStore(dir)
    let ran = 0
    expect(await store.applyOnce('k', async () => void ran++)).toBe(true)
    expect(await store.applyOnce('k', async () => void ran++)).toBe(false)
    expect(ran).toBe(1)
  })

  it('keeps distinct keys distinct', async () => {
    const store = new FileStore(dir)
    expect(await store.applyOnce('a', async () => {})).toBe(true)
    expect(await store.applyOnce('b', async () => {})).toBe(true)
  })

  it('claims a key exactly once when two workers race', async () => {
    /*
     * The read-modify-write version lost this. Two stores read an empty record, both added
     * their key, and the second write erased the first — so the effect ran twice, which for a
     * tracker comment means the same message posted twice with nothing to explain it.
     */
    const workers = Array.from({ length: 8 }, () => new FileStore(dir))
    let ran = 0
    const claims = await Promise.all(
      workers.map((w) => w.applyOnce('contended', async () => void ran++)),
    )

    expect(claims.filter(Boolean)).toHaveLength(1)
    expect(ran).toBe(1)
  })

  it('does not replay everything when the record is unreadable', async () => {
    // A torn write used to parse as nothing-applied, which reads as "no effect has ever run".
    const store = new FileStore(dir)
    await store.applyOnce('k', async () => {})
    await fs.writeFile(path.join(dir, 'applied.json'), '{"half-writ', 'utf8')

    expect(await store.applyOnce('k', async () => {})).toBe(false)
  })

  it('honours a record written by an older version', async () => {
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, 'applied.json'), JSON.stringify(['legacy-key']), 'utf8')
    const store = new FileStore(dir)

    let ran = 0
    expect(await store.applyOnce('legacy-key', async () => void ran++)).toBe(false)
    expect(ran).toBe(0)
  })
})

describe('leases', () => {
  it('excludes a second holder', async () => {
    const a = await new FileStore(dir).acquireLease('run-1', 60_000)
    const b = await new FileStore(dir).acquireLease('run-1', 60_000)
    expect(a.held).toBe(true)
    expect(b.held).toBe(false)
  })

  it('releases so the next worker can take it', async () => {
    const a = await new FileStore(dir).acquireLease('run-1', 60_000)
    await a.release()
    expect((await new FileStore(dir).acquireLease('run-1', 60_000)).held).toBe(true)
  })

  it('takes over a lease whose holder died', async () => {
    await new FileStore(dir).acquireLease('run-1', -1)
    expect((await new FileStore(dir).acquireLease('run-1', 60_000)).held).toBe(true)
  })

  it('grants an expired lease to at most one taker', async () => {
    await new FileStore(dir).acquireLease('run-1', -1)
    const takers = await Promise.all(
      Array.from({ length: 8 }, () => new FileStore(dir).acquireLease('run-1', 60_000)),
    )
    expect(takers.filter((t) => t.held).length).toBeLessThanOrEqual(1)
  })

  it('will not let a superseded holder delete its successor’s lease', async () => {
    /*
     * The failure this prevents: a worker's lease expires mid-run, a second worker takes over
     * and starts working, then the first finishes its own cleanup and deletes the file. The run
     * is now unprotected while someone is still inside it, and a third worker walks in.
     */
    const first = await new FileStore(dir).acquireLease('run-1', -1)
    const second = await new FileStore(dir).acquireLease('run-1', 60_000)
    expect(second.held).toBe(true)

    await first.release()

    expect((await new FileStore(dir).acquireLease('run-1', 60_000)).held).toBe(false)
  })

  it('honours the expiry recorded by an older version', async () => {
    await fs.mkdir(path.join(dir, 'leases'), { recursive: true })
    const p = path.join(dir, 'leases', `${encodeURIComponent('run-1')}.lease`)
    await fs.writeFile(p, String(Date.now() + 60_000), 'utf8')

    expect((await new FileStore(dir).acquireLease('run-1', 60_000)).held).toBe(false)
  })

  it('takes over an expired lease left by an older version', async () => {
    await fs.mkdir(path.join(dir, 'leases'), { recursive: true })
    const p = path.join(dir, 'leases', `${encodeURIComponent('run-1')}.lease`)
    await fs.writeFile(p, String(Date.now() - 1_000), 'utf8')

    expect((await new FileStore(dir).acquireLease('run-1', 60_000)).held).toBe(true)
  })
})

describe('MemoryStore', () => {
  it('behaves the same way for the cases that matter', async () => {
    const store = new MemoryStore()
    expect(await store.applyOnce('k', async () => {})).toBe(true)
    expect(await store.applyOnce('k', async () => {})).toBe(false)

    const lease = await store.acquireLease('r', 60_000)
    expect(lease.held).toBe(true)
    expect((await store.acquireLease('r', 60_000)).held).toBe(false)
    await lease.release()
    expect((await store.acquireLease('r', 60_000)).held).toBe(true)
  })

  it('round-trips a run', async () => {
    const store = new MemoryStore()
    await store.save('r', { state: 'working' })
    expect(await store.load('r')).toEqual({ state: 'working' })
    expect(await store.list()).toEqual(['r'])
  })
})

describe('forgetting what a run applied', () => {
  const both = () => [new FileStore(dir), new MemoryStore()]

  it('lets a restarted run apply its effects again', async () => {
    /*
     * Effect markers are keyed by run id, and the id is reused when a task is re-run. Without
     * this the second attempt silently skipped every effect the first performed — most visibly
     * the tracker transition, so a ticket the failed run moved to blocked stayed blocked while
     * the new run reported it had moved it on.
     */
    for (const store of both()) {
      const name = store.constructor.name
      const key = 'run-ABC-1:ready->working:0.0:tracker_transition'
      let applied = 0

      await store.applyOnce(key, async () => void applied++)
      await store.applyOnce(key, async () => void applied++)
      expect(applied, name).toBe(1)

      expect(await store.forgetApplied('run-ABC-1'), name).toBe(1)

      await store.applyOnce(key, async () => void applied++)
      expect(applied, name).toBe(2)
    }
  })

  it('leaves other runs alone', async () => {
    for (const store of both()) {
      const name = store.constructor.name
      await store.applyOnce('run-A:x:tracker_transition', async () => {})
      await store.applyOnce('run-B:x:tracker_transition', async () => {})

      expect(await store.forgetApplied('run-A'), name).toBe(1)

      let ranB = false
      await store.applyOnce('run-B:x:tracker_transition', async () => void (ranB = true))
      expect(ranB, name).toBe(false)
    }
  })

  it('reports nothing forgotten when there is nothing to forget', async () => {
    for (const store of both()) {
      expect(await store.forgetApplied('run-never-seen'), store.constructor.name).toBe(0)
    }
  })
})
