/**
 * The ledger.
 *
 * Two jobs, both of which the append-a-file-per-pull-request approach gets wrong.
 *
 * It remembers rejections. A lesson a human has already declined must not come back next week
 * wearing the same face — a tool that re-proposes what you rejected is one you stop reading,
 * and a tool you stop reading may as well not exist.
 *
 * And it keeps observations bounded. Signals accumulate as evidence, but old ones are pruned
 * once they have either produced a lesson or failed to recur for long enough to suggest they
 * ever will. The context does not grow with the number of merged pull requests, which is the
 * property that makes this sustainable rather than merely tidy.
 */
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { writeFileAtomic } from '@contextmux/core'
import type { Signal } from './signals.js'

export type LessonStatus = 'proposed' | 'applied' | 'rejected'

export interface LedgerEntry {
  id: string
  status: LessonStatus
  lesson: string
  /** Distinct tasks seen at the time of the last decision. */
  taskCount: number
  updatedAt: number
  /** Why a human declined, when they said. */
  note?: string
}

export interface LedgerState {
  version: number
  entries: Record<string, LedgerEntry>
  /** Observations not yet distilled into a lesson. */
  signals: Signal[]
}

const VERSION = 1

/** Discard observations older than this once they have not recurred. */
const SIGNAL_TTL_MS = 90 * 24 * 60 * 60 * 1000

/** Hard ceiling on retained observations, whatever their age. */
const MAX_SIGNALS = 2_000

export class Ledger {
  private state: LedgerState = { version: VERSION, entries: {}, signals: [] }

  /**
   * Set when an existing ledger could not be read, so a caller can say so.
   *
   * Starting fresh is the right recovery, but doing it silently is not: this file is where a
   * human's rejections live, and losing them without a word means the lessons they declined
   * quietly come back.
   */
  private loadError: string | null = null

  constructor(private readonly file: string) {}

  static async open(dir: string): Promise<Ledger> {
    const ledger = new Ledger(path.join(dir, 'learn.json'))
    await ledger.load()
    return ledger
  }

  private async load(): Promise<void> {
    let raw: string
    try {
      raw = await fs.readFile(this.file, 'utf8')
    } catch {
      return /* no ledger yet, which is the ordinary first run */
    }

    try {
      const parsed = JSON.parse(raw) as LedgerState
      // A ledger from a future version is not something to guess at; starting fresh loses
      // history but never corrupts it.
      if (parsed.version === VERSION) {
        this.state = parsed
        return
      }
      this.loadError = `ledger is version ${parsed.version}, this build reads version ${VERSION}`
    } catch (err) {
      this.loadError = (err as Error).message
    }

    /*
     * Keep the unreadable file rather than writing over it.
     *
     * The next `save` renames a fresh ledger into place, so without this the only copy of every
     * decision a human ever made is gone — and the most likely way to get here is two
     * invocations overlapping, which is a transient problem with a recoverable file.
     */
    await fs.rename(this.file, `${this.file}.corrupt`).catch(() => {})
  }

  /** Why an existing ledger could not be read, if it could not. */
  get warning(): string | null {
    return this.loadError
  }

  /**
   * Persist.
   *
   * Through the shared atomic write, whose temporary file is named per process. This wrote to a
   * fixed `learn.json.tmp`, so two invocations overlapping — which `record` documents as
   * normal, "a scheduled job and a manual invocation" — interleaved their writes into one
   * temporary file and renamed the result into place. Every human decision in it was then
   * unreadable, and `load` discarded them without a word.
   */
  async save(): Promise<void> {
    await writeFileAtomic(this.file, JSON.stringify(this.state, null, 2))
  }

  /**
   * Record observations.
   *
   * Duplicates are dropped by run and text: harvesting the same run twice is normal — a
   * scheduled job and a manual invocation overlapping — and must not inflate a lesson's
   * apparent recurrence.
   */
  record(signals: Signal[]): number {
    const seen = new Set(this.state.signals.map(signalKey))
    let added = 0

    for (const signal of signals) {
      const key = signalKey(signal)
      if (seen.has(key)) continue
      seen.add(key)
      this.state.signals.push(signal)
      added += 1
    }

    this.prune()
    return added
  }

  private prune(): void {
    const cutoff = Date.now() - SIGNAL_TTL_MS
    this.state.signals = this.state.signals.filter((s) => s.at >= cutoff)
    if (this.state.signals.length > MAX_SIGNALS) {
      // Keep the newest, since older observations have already had their chance to recur.
      this.state.signals = this.state.signals.slice(-MAX_SIGNALS)
    }
  }

  get signals(): Signal[] {
    return this.state.signals
  }

  get entries(): LedgerEntry[] {
    return Object.values(this.state.entries).sort((a, b) => b.updatedAt - a.updatedAt)
  }

  status(id: string): LessonStatus | null {
    return this.state.entries[id]?.status ?? null
  }

  /** Whether a lesson should be shown, given what a human has already decided about it. */
  shouldPropose(id: string): boolean {
    const status = this.state.entries[id]?.status
    return status !== 'applied' && status !== 'rejected'
  }

  mark(id: string, status: LessonStatus, lesson: string, taskCount: number, note?: string): void {
    this.state.entries[id] = {
      id,
      status,
      lesson,
      taskCount,
      updatedAt: Date.now(),
      ...(note ? { note } : {}),
    }
  }

  /**
   * Forget a decision, so the lesson can be proposed again.
   *
   * Rejections should be durable, not permanent. A team's conventions change, and a lesson
   * declined a year ago may be exactly right now.
   */
  reconsider(id: string): boolean {
    if (!this.state.entries[id]) return false
    delete this.state.entries[id]
    return true
  }

  /**
   * Drop observations that have already produced an applied lesson.
   *
   * Takes the observations themselves, keyed exactly as `record` dedupes them. The previous
   * version took lesson ids and compared them against `taskId:runId`, which never matched
   * anything — so the pruning this class documents as one of its two jobs did not happen, and
   * settled evidence competed with fresh evidence for the retention cap for as long as the
   * ledger lived.
   */
  compact(appliedSignalKeys: string[]): number {
    const settled = new Set(appliedSignalKeys)
    if (settled.size === 0) return 0
    const before = this.state.signals.length
    // Keep evidence for lessons still under consideration; discard what is settled.
    this.state.signals = this.state.signals.filter((s) => !settled.has(signalKey(s)))
    return before - this.state.signals.length
  }

  stats(): { signals: number; proposed: number; applied: number; rejected: number } {
    const entries = Object.values(this.state.entries)
    return {
      signals: this.state.signals.length,
      proposed: entries.filter((e) => e.status === 'proposed').length,
      applied: entries.filter((e) => e.status === 'applied').length,
      rejected: entries.filter((e) => e.status === 'rejected').length,
    }
  }
}

/** How an observation is identified — one key, used for both dedupe and pruning. */
export function signalKey(signal: Signal): string {
  return `${signal.source.runId}:${signal.text}`
}
