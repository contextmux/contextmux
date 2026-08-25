/**
 * State stores.
 *
 * `applyOnce` and `acquireLease` are the two primitives that make duplicate delivery and
 * concurrent execution survivable. They are separated from the state machine deliberately:
 * the machine is written so that attempting a transition twice is harmless, and the store
 * makes sure the *effects* of that transition happen exactly once.
 */
import { randomUUID } from 'node:crypto'
import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import type { StateStore } from './adapters.js'
import { writeFileAtomic } from './fsx.js'

/** In-memory store. The default for one-shot local runs, and the basis of the simulator. */
export class MemoryStore implements StateStore {
  private readonly runs = new Map<string, unknown>()
  private readonly applied = new Set<string>()
  private readonly leases = new Map<string, number>()

  async load(runId: string): Promise<unknown | null> {
    return this.runs.get(runId) ?? null
  }

  async save(runId: string, value: unknown): Promise<void> {
    this.runs.set(runId, value)
  }

  async list(): Promise<string[]> {
    return [...this.runs.keys()]
  }

  async forgetApplied(runId: string): Promise<number> {
    let removed = 0
    for (const key of [...this.applied]) {
      if (key.startsWith(`${runId}:`)) {
        this.applied.delete(key)
        removed += 1
      }
    }
    return removed
  }

  async applyOnce(key: string, fn: () => Promise<void>): Promise<boolean> {
    if (this.applied.has(key)) return false
    // Mark before running: a crash mid-effect must not cause a retry to re-apply a
    // non-idempotent side effect such as posting the same comment twice.
    this.applied.add(key)
    await fn()
    return true
  }

  async acquireLease(runId: string, ttlMs: number): Promise<{ held: boolean; release: () => Promise<void> }> {
    const now = Date.now()
    const existing = this.leases.get(runId)
    if (existing !== undefined && existing > now) {
      return { held: false, release: async () => {} }
    }
    this.leases.set(runId, now + ttlMs)
    return {
      held: true,
      release: async () => {
        this.leases.delete(runId)
      },
    }
  }
}

/**
 * Filesystem store, for runs that outlive a process.
 *
 * Leases use exclusive file creation (`wx`), which is atomic on every platform we target, so
 * two processes cannot both believe they hold one.
 */
export class FileStore implements StateStore {
  constructor(private readonly dir: string) {}

  private runPath(runId: string): string {
    return path.join(this.dir, 'runs', `${encodeURIComponent(runId)}.json`)
  }

  /** Legacy single-file record, still read so an existing installation is not re-applied. */
  private legacyAppliedPath(): string {
    return path.join(this.dir, 'applied.json')
  }

  /**
   * One marker file per key.
   *
   * Keys contain path separators and arrows, so they are hashed rather than used as filenames.
   * The key itself is written inside, which keeps `ls` unhelpful but a `grep` conclusive.
   */
  private appliedMarkerPath(key: string): string {
    const digest = createHash('sha256').update(key).digest('hex').slice(0, 32)
    return path.join(this.dir, 'applied', `${digest}.key`)
  }

  private leasePath(runId: string): string {
    return path.join(this.dir, 'leases', `${encodeURIComponent(runId)}.lease`)
  }

  async load(runId: string): Promise<unknown | null> {
    try {
      return JSON.parse(await fs.readFile(this.runPath(runId), 'utf8'))
    } catch {
      return null
    }
  }

  async save(runId: string, value: unknown): Promise<void> {
    // Write-then-rename, so a crash cannot leave a half-written run file behind.
    await writeFileAtomic(this.runPath(runId), JSON.stringify(value, null, 2))
  }

  async list(): Promise<string[]> {
    try {
      const files = await fs.readdir(path.join(this.dir, 'runs'))
      return files.filter((f) => f.endsWith('.json')).map((f) => decodeURIComponent(f.replace(/\.json$/, '')))
    } catch {
      return []
    }
  }

  private async legacyApplied(): Promise<Set<string>> {
    try {
      return new Set(JSON.parse(await fs.readFile(this.legacyAppliedPath(), 'utf8')) as string[])
    } catch {
      return new Set()
    }
  }

  /**
   * Claim a key, exactly once, across processes.
   *
   * Exclusive file creation rather than a read-modify-write of one JSON file. The shared-file
   * version had two failure modes that both end in a duplicated side effect: two workers that
   * read before either writes lose one of the entries, and a write torn by a crash leaves
   * unparseable JSON, which reads back as *nothing has been applied* — so every comment, label
   * and transition replays.
   *
   * Marking before running is deliberate and unchanged: a crash midway through a non-idempotent
   * effect must not let a retry perform it twice.
   */
  async forgetApplied(runId: string): Promise<number> {
    const dir = path.join(this.dir, 'applied')
    let names: string[]
    try {
      names = await fs.readdir(dir)
    } catch {
      return 0
    }

    // The filename is a digest, so the key has to be read from inside — which is exactly why
    // `applyOnce` writes it there.
    const prefix = `${runId}:`
    let removed = 0
    for (const name of names) {
      const file = path.join(dir, name)
      const contents = await fs.readFile(file, 'utf8').catch(() => '')
      if (contents.startsWith(prefix)) {
        await fs.rm(file, { force: true }).catch(() => {})
        removed += 1
      }
    }
    return removed
  }

  async applyOnce(key: string, fn: () => Promise<void>): Promise<boolean> {
    const marker = this.appliedMarkerPath(key)
    await fs.mkdir(path.dirname(marker), { recursive: true })

    try {
      await fs.writeFile(marker, key, { flag: 'wx' })
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err
      return false
    }

    // An installation written by an older version keeps its record in one file. Honour it, so
    // upgrading does not replay every effect of every run still in flight.
    if ((await this.legacyApplied()).has(key)) return false

    await fn()
    return true
  }

  /**
   * Take a lease, or report that someone else holds it.
   *
   * Each lease carries an owner token, which answers the two questions a bare expiry cannot.
   *
   * Taking over an expired lease is not atomic — two processes can both find it expired and
   * both write. So the winner is decided by *reading back*: whoever's token survives holds it.
   * If neither does, both stand down and the next attempt takes it, which is the safe
   * direction for that race to fail in.
   *
   * And release only removes a lease this process still owns. Deleting unconditionally means a
   * worker whose lease expired mid-run deletes its successor's on the way out, leaving the run
   * unprotected while two processes work in it.
   */
  async acquireLease(runId: string, ttlMs: number): Promise<{ held: boolean; release: () => Promise<void> }> {
    const p = this.leasePath(runId)
    await fs.mkdir(path.dirname(p), { recursive: true })

    const owner = `${process.pid}-${randomUUID()}`
    const record = () => JSON.stringify({ owner, expires: Date.now() + ttlMs })

    const release = async () => {
      const current = await readLease(p)
      if (current?.owner === owner) await fs.rm(p, { force: true })
    }
    const notHeld = { held: false, release: async () => {} }

    try {
      await fs.writeFile(p, record(), { flag: 'wx' })
      return { held: true, release }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err
    }

    const existing = await readLease(p)
    // Unreadable means it was being released as we looked; not expired means it is live.
    if (!existing || existing.expires >= Date.now()) return notHeld

    await fs.writeFile(p, record(), 'utf8')
    const settled = await readLease(p)
    return settled?.owner === owner ? { held: true, release } : notHeld
  }
}

interface LeaseRecord {
  owner: string
  expires: number
}

/** Read a lease file, tolerating the single-number format written by earlier versions. */
async function readLease(p: string): Promise<LeaseRecord | null> {
  let raw: string
  try {
    raw = await fs.readFile(p, 'utf8')
  } catch {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<LeaseRecord>
    if (typeof parsed.owner === 'string' && typeof parsed.expires === 'number') {
      return { owner: parsed.owner, expires: parsed.expires }
    }
  } catch {
    /* fall through to the legacy format */
  }

  const expires = Number(raw)
  // An unowned lease from an older version: honour its expiry, and let whoever takes it over
  // replace it with an owned one.
  return Number.isFinite(expires) ? { owner: '', expires } : null
}
