import { promises as fs } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ContextModel } from '@contextmux/context'
import {
  asGuidance,
  clusterSignals,
  extractSignals,
  globsFor,
  learn,
  Ledger,
  propose,
  signalsFromReview,
  similarity,
  terms,
  type Signal,
} from '../src/index.js'
import type { Run } from '@contextmux/core'

const signal = (over: Partial<Signal> = {}): Signal => ({
  kind: 'review',
  text: 'use the shared helper',
  source: { runId: 'run-1', taskId: 'T-1' },
  files: [],
  at: Date.now(),
  ...over,
})

const emptyContext: ContextModel = {
  rules: [],
  skills: [],
  agents: [],
  commands: [],
  mcp: [],
}

describe('terms', () => {
  it('strips code, paths and urls so the same point clusters across different files', () => {
    // Two reviewers making the same point about different files must cluster together;
    // leaving identifiers in guarantees they never will.
    const a = terms('In `src/a.ts` you should use the shared date helper')
    const b = terms('In src/widgets/b.tsx please use the shared date helper')
    expect(similarity(a, b)).toBeGreaterThan(0.7)
  })

  it('drops stopwords and stems crudely', () => {
    const t = terms('You should be testing the naming')
    expect(t.has('test')).toBe(true)
    expect(t.has('nam')).toBe(true)
    expect(t.has('should')).toBe(false)
  })
})

describe('similarity', () => {
  it('does not punish a short comment for being short', () => {
    // Jaccard scores "use the shared helper" against a paragraph about the same point near
    // zero — and those are exactly the two that should cluster.
    const short = terms('use the shared helper')
    const long = terms(
      'I think here you would be better served by using the shared helper that already ' +
        'exists in the helpers directory rather than writing another one inline',
    )
    expect(similarity(short, long)).toBeGreaterThan(0.5)
  })

  it('is zero for unrelated text', () => {
    expect(similarity(terms('use the shared helper'), terms('bump the dependency version'))).toBe(0)
  })
})

describe('clustering', () => {
  it('surfaces what recurred across tasks, not what happened recently', () => {
    // The central bet: a point made across several tasks is a convention nobody wrote down.
    const signals = [
      signal({ text: 'use the shared date helper', source: { runId: 'r1', taskId: 'T-1' } }),
      signal({ text: 'please use the shared date helper here', source: { runId: 'r2', taskId: 'T-2' } }),
      signal({ text: 'bump the version', source: { runId: 'r3', taskId: 'T-3' } }),
    ]
    const clusters = clusterSignals(signals)
    expect(clusters).toHaveLength(1)
    expect(clusters[0]?.taskCount).toBe(2)
  })

  it('ignores a point made repeatedly on a single task', () => {
    // Three comments in one review is one person's opinion about one change, not a convention.
    const signals = [
      signal({ text: 'use the shared helper', source: { runId: 'r1', taskId: 'T-1' } }),
      signal({ text: 'use the shared helper please', source: { runId: 'r1', taskId: 'T-1' } }),
      signal({ text: 'really, use the shared helper', source: { runId: 'r1', taskId: 'T-1' } }),
    ]
    expect(clusterSignals(signals)).toHaveLength(0)
  })

  it('keeps the same id for the same lesson across invocations', () => {
    // Otherwise a rejected lesson returns wearing a new face.
    const build = () =>
      clusterSignals([
        signal({ text: 'use the shared date helper', source: { runId: 'r1', taskId: 'T-1' } }),
        signal({ text: 'use the shared date helper', source: { runId: 'r2', taskId: 'T-2' } }),
      ])
    expect(build()[0]?.id).toBe(build()[0]?.id)
  })

  it('picks the clearest phrasing as the headline', () => {
    // A reviewer who took one line had already distilled the point.
    const clusters = clusterSignals([
      signal({
        text: 'I would strongly suggest that you consider using the shared helper here instead',
        source: { runId: 'r1', taskId: 'T-1' },
      }),
      signal({ text: 'use the shared helper', source: { runId: 'r2', taskId: 'T-2' } }),
    ])
    expect(clusters[0]?.representative).toBe('use the shared helper')
  })

  it('ranks by how widely a point recurred', () => {
    const signals = [
      ...['T-1', 'T-2', 'T-3'].map((taskId) =>
        signal({ text: 'add a test for the new branch', source: { runId: taskId, taskId } }),
      ),
      ...['T-4', 'T-5'].map((taskId) =>
        signal({ text: 'rename this variable clearly', source: { runId: taskId, taskId } }),
      ),
    ]
    const clusters = clusterSignals(signals)
    expect(clusters[0]?.taskCount).toBe(3)
  })
})

describe('signal extraction', () => {
  it('takes informative gate failures and skips the rest', () => {
    // "in-flight cap reached" says nothing generalisable about working in this codebase.
    const run = {
      id: 'run-1',
      task: { id: 'T-1' },
      feedbackRound: 0,
      gateOutcomes: [
        { gate: 'path-scope', verdict: 'reject', reason: 'changed package.json' },
        { gate: 'in-flight-cap', verdict: 'reject', reason: '3 runs already in flight' },
        { gate: 'quality-gate', verdict: 'pass' },
      ],
    } as Run

    const signals = extractSignals(run)
    expect(signals).toHaveLength(1)
    expect(signals[0]?.source.gate).toBe('path-scope')
  })

  it('splits inline review comments into separate signals', () => {
    // A blob covering four unrelated points clusters with nothing.
    const signals = signalsFromReview(
      { id: 'run-1', task: { id: 'T-1' } },
      {
        source: 'a-human',
        body: 'A few things',
        items: [
          { file: 'src/a.ts', body: 'use the shared helper' },
          { file: 'src/b.ts', body: 'add a test for this branch' },
        ],
      },
    )
    expect(signals).toHaveLength(3)
    expect(signals.filter((s) => s.files.length === 1)).toHaveLength(2)
  })
})

describe('phrasing', () => {
  it('turns a complaint about one change into a standing instruction', () => {
    // "you changed package.json" tells an agent in a different context nothing.
    const guidance = asGuidance("3 file(s) changed outside the task's scope: package.json")
    expect(guidance).toContain('Change only the files the task requires')
  })

  it('turns a failing command into an instruction to run it', () => {
    expect(asGuidance('`pnpm test` failed with exit code 1')).toContain('Run `pnpm test` before finishing')
  })

  it('keeps a reviewer’s own words when no template fits', () => {
    // A paraphrase that is occasionally wrong about what was meant is worse than clumsy prose.
    expect(asGuidance('prefer named exports')).toBe('Prefer named exports.')
  })

  it('adds a search instruction to duplication feedback', () => {
    expect(asGuidance('this duplicates the existing helper')).toContain('Search for an existing implementation')
  })
})

describe('scoping', () => {
  it('scopes to directories the evidence points at', () => {
    expect(globsFor(['src/api/a.ts', 'src/api/b.ts'])).toEqual(['src/api/**'])
  })

  it('does not scope when the evidence is everywhere', () => {
    // A rule scoped to eight directories is not scoped, and reads as noise.
    expect(globsFor(['a/x.ts', 'b/x.ts', 'c/x.ts', 'd/x.ts'])).toEqual([])
  })
})

describe('proposals', () => {
  const recurring = (text: string, tasks = ['T-1', 'T-2']) =>
    clusterSignals(tasks.map((taskId) => signal({ text, source: { runId: taskId, taskId } })))

  it('amends the skill a lesson belongs to rather than creating a new file', async () => {
    // Appending a file per lesson reproduces the unbounded sediment this replaces.
    const context: ContextModel = {
      ...emptyContext,
      skills: [
        {
          name: 'find-before-writing',
          description: 'Use before creating a new helper — search for an existing implementation first.',
          globs: [],
          resources: [],
          body: 'Search for an existing helper before writing a new one.',
        },
      ],
    }
    const result = await propose(
      recurring('check the selectors directory before writing a new selector'),
      { context },
    )
    expect(result[0]?.kind).toBe('amend-skill')
    expect(result[0]?.target).toBe('find-before-writing')
    expect(result[0]?.path).toContain('skills/find-before-writing/SKILL.md')
    // The amendment keeps the original guidance and adds to it.
    expect(result[0]?.content).toContain('Search for an existing helper before writing a new one.')
    expect(result[0]?.content).toContain('Learned from review')
  })

  it('creates a scoped rule when nothing matches', async () => {
    const clusters = clusterSignals(
      ['T-1', 'T-2'].map((taskId) =>
        signal({
          text: 'always validate input at the boundary',
          source: { runId: taskId, taskId },
          files: ['src/api/handler.ts'],
        }),
      ),
    )
    const result = await propose(clusters, { context: emptyContext })
    expect(result[0]?.kind).toBe('new-rule')
    expect(result[0]?.globs).toEqual(['src/api/**'])
    expect(result[0]?.content).toContain('src/api/**')
  })

  it('does not propose something the context already says', async () => {
    // Nagging about guidance that is already in force is how a tool stops being read.
    const context: ContextModel = {
      ...emptyContext,
      rules: [
        {
          name: 'scope',
          description: 'Scope discipline',
          globs: [],
          alwaysApply: true,
          priority: 50,
          body: 'Prefer named exports.',
        },
      ],
    }
    const result = await propose(recurring('prefer named exports'), { context })
    expect(result).toHaveLength(0)
  })

  it('carries the evidence, so a reviewer can check the reasoning', async () => {
    const result = await propose(recurring('add a test for each new branch'), { context: emptyContext })
    expect(result[0]?.evidence.length).toBeGreaterThan(0)
    expect(result[0]?.evidence[0]?.taskId).toBe('T-1')
    expect(result[0]?.taskCount).toBe(2)
  })

  it('produces a valid file, not a fragment', async () => {
    const result = await propose(recurring('always handle the empty case'), { context: emptyContext })
    expect(result[0]?.content.startsWith('---\n')).toBe(true)
    expect(result[0]?.content).toContain('name:')
  })
})

describe('ledger', () => {
  let dir: string
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ctxmux-learn-'))
  })
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true })
  })

  it('does not inflate recurrence when the same run is harvested twice', async () => {
    // A scheduled job and a manual invocation overlapping is normal.
    const ledger = await Ledger.open(dir)
    const batch = [signal({ text: 'use the helper', source: { runId: 'r1', taskId: 'T-1' } })]
    expect(ledger.record(batch)).toBe(1)
    expect(ledger.record(batch)).toBe(0)
    expect(ledger.signals).toHaveLength(1)
  })

  it('never proposes a lesson a human rejected', async () => {
    // A tool that re-proposes what you rejected is one you stop reading.
    const ledger = await Ledger.open(dir)
    ledger.mark('L-abc', 'rejected', 'some lesson', 3, 'not our convention')
    expect(ledger.shouldPropose('L-abc')).toBe(false)
  })

  it('never proposes a lesson already applied', async () => {
    const ledger = await Ledger.open(dir)
    ledger.mark('L-abc', 'applied', 'some lesson', 3)
    expect(ledger.shouldPropose('L-abc')).toBe(false)
  })

  it('allows a decision to be revisited, since conventions change', async () => {
    const ledger = await Ledger.open(dir)
    ledger.mark('L-abc', 'rejected', 'some lesson', 3)
    expect(ledger.reconsider('L-abc')).toBe(true)
    expect(ledger.shouldPropose('L-abc')).toBe(true)
  })

  it('survives a restart', async () => {
    const first = await Ledger.open(dir)
    first.record([signal()])
    first.mark('L-1', 'applied', 'a lesson', 2)
    await first.save()

    const second = await Ledger.open(dir)
    expect(second.signals).toHaveLength(1)
    expect(second.status('L-1')).toBe('applied')
  })

  it('discards observations old enough that they were never going to recur', async () => {
    // The property that keeps context from growing with the number of merged pull requests.
    const ledger = await Ledger.open(dir)
    const old = Date.now() - 200 * 24 * 60 * 60 * 1000
    ledger.record([signal({ at: old }), signal({ text: 'recent point', source: { runId: 'r2', taskId: 'T-2' } })])
    expect(ledger.signals).toHaveLength(1)
    expect(ledger.signals[0]?.text).toBe('recent point')
  })

  it('starts fresh rather than guessing at a ledger from a future version', async () => {
    await fs.writeFile(path.join(dir, 'learn.json'), JSON.stringify({ version: 999, entries: {}, signals: [] }))
    const ledger = await Ledger.open(dir)
    expect(ledger.signals).toEqual([])
  })
})

describe('the pipeline', () => {
  let dir: string
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ctxmux-learn-pipe-'))
  })
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true })
  })

  it('turns recurring feedback into a proposal', async () => {
    const ledger = await Ledger.open(dir)
    ledger.record(
      ['T-1', 'T-2', 'T-3'].map((taskId) =>
        signal({ text: 'add a test for the new branch', source: { runId: taskId, taskId } }),
      ),
    )

    const result = await learn({ ledger, context: emptyContext })

    expect(result.proposals).toHaveLength(1)
    expect(result.proposals[0]?.taskCount).toBe(3)
    expect(result.signalsConsidered).toBe(3)
  })

  it('reports what it withheld, rather than hiding it', async () => {
    const ledger = await Ledger.open(dir)
    ledger.record(
      ['T-1', 'T-2'].map((taskId) =>
        signal({ text: 'add a test for the new branch', source: { runId: taskId, taskId } }),
      ),
    )
    const first = await learn({ ledger, context: emptyContext })
    ledger.mark(first.proposals[0]!.id, 'rejected', 'x', 2)

    const second = await learn({ ledger, context: emptyContext })
    expect(second.proposals).toHaveLength(0)
    expect(second.suppressed[0]?.status).toBe('rejected')
  })

  it('proposes nothing when nothing recurred', async () => {
    const ledger = await Ledger.open(dir)
    ledger.record([signal({ text: 'a one-off remark', source: { runId: 'r1', taskId: 'T-1' } })])
    expect((await learn({ ledger, context: emptyContext })).proposals).toHaveLength(0)
  })
})

describe('phrasing edge cases', () => {
  it('handles a multi-word command inside backticks', () => {
    // Matching to the first space caught only "pnpm" and left the sentence unrewritten.
    expect(asGuidance('`pnpm -F @app/web typecheck` failed with exit code 2')).toContain(
      'Run `pnpm -F @app/web typecheck` before finishing',
    )
  })

  it('terminates every branch, not only the fallback', () => {
    // Punctuation was applied per branch, so two of them silently produced unterminated text.
    for (const input of ['prefer named exports', 'this duplicates an existing helper', 'always guard the empty case']) {
      expect(asGuidance(input)).toMatch(/[.!?]$/)
      expect(asGuidance(input)[0]).toMatch(/[A-Z]/)
    }
  })

  it('leaves an already-terminated sentence alone', () => {
    expect(asGuidance('Prefer named exports.')).toBe('Prefer named exports.')
  })
})

describe('choosing the phrasing', () => {
  it('avoids a phrasing that only makes sense in the conversation it came from', async () => {
    // "Use the shared helper here too" is a fine review comment and a terrible rule: an agent
    // reading it in a different file has no idea what "here" refers to.
    const clusters = clusterSignals([
      signal({ text: 'please use the shared date helper here too', source: { runId: 'r1', taskId: 'T-1' } }),
      signal({
        text: 'use the shared date helper rather than inlining a new one',
        source: { runId: 'r2', taskId: 'T-2' },
      }),
    ])
    expect(clusters[0]?.representative).not.toMatch(/\bhere\b/)
    expect(clusters[0]?.representative).toContain('rather than inlining')
  })

  it('still prefers the shortest when every phrasing stands on its own', () => {
    const clusters = clusterSignals([
      signal({
        text: 'always validate the input before persisting anything to storage',
        source: { runId: 'r1', taskId: 'T-1' },
      }),
      signal({ text: 'always validate input before persisting', source: { runId: 'r2', taskId: 'T-2' } }),
    ])
    expect(clusters[0]?.representative).toBe('always validate input before persisting')
  })

  it('prefers the phrasing that leans least on context, not the shortest', () => {
    // "use the shared helper rather than inlining this" is longer than "use the shared helper
    // here too" and enormously more useful as a standing rule.
    const clusters = clusterSignals([
      signal({ text: 'please use the shared date helper here too', source: { runId: 'r1', taskId: 'T-1' } }),
      signal({
        text: 'use the shared date helper rather than inlining this',
        source: { runId: 'r2', taskId: 'T-2' },
      }),
    ])
    expect(clusters[0]?.representative).toBe('use the shared date helper rather than inlining this')
  })

  it('falls back gracefully when every phrasing leans equally on context', () => {
    // Better a clumsy lesson than none; a human reviews it either way.
    const clusters = clusterSignals([
      signal({ text: 'extract this into a helper', source: { runId: 'r1', taskId: 'T-1' } }),
      signal({ text: 'extract this into a shared helper', source: { runId: 'r2', taskId: 'T-2' } }),
    ])
    expect(clusters[0]?.representative).toBe('extract this into a helper')
  })
})

describe('naming a new rule', () => {
  const recurringLesson = (text: string) =>
    clusterSignals(
      ['T-1', 'T-2'].map((taskId) => signal({ text, source: { runId: taskId, taskId } })),
    )

  it('names it from real words, not from stems', async () => {
    // Stemming is right for clustering and wrong for reading: it turns "shared" into "shar",
    // and the filename is what appears in every compiled target.
    const result = await propose(
      recurringLesson('use the shared date helper rather than inlining a new one'),
      { context: emptyContext },
    )
    expect(result[0]?.path).not.toContain('shar-')
    expect(result[0]?.path).toContain('shared')
  })

  it('drops connectives that read as noise in a name', async () => {
    const result = await propose(
      recurringLesson('always validate the request payload rather than trusting the caller'),
      { context: emptyContext },
    )
    expect(result[0]?.path).not.toContain('rather')
    expect(result[0]?.path).not.toContain('always')
    expect(result[0]?.path).toContain('validate')
  })

  it('produces a usable name even for an unhelpful lesson', async () => {
    const result = await propose(recurringLesson('do it the way we do'), { context: emptyContext })
    expect(result[0]?.path).toMatch(/rules\/[a-z0-9-]+\.md$/)
  })
})

describe('the ledger surviving concurrency', () => {
  it('does not collide with another process writing at the same time', async () => {
    /*
     * `save` wrote to a fixed `learn.json.tmp`. `record` documents overlapping invocations as
     * normal — "a scheduled job and a manual invocation" — so two of them interleaved their
     * writes into one temporary file and renamed the result into place. What was renamed was
     * neither ledger.
     */
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ctxmux-ledger-'))

    const writers = await Promise.all(
      Array.from({ length: 8 }, async (_, i) => {
        const ledger = await Ledger.open(dir)
        ledger.mark(`lesson-${i}`, 'rejected', 'x'.repeat(20_000), 2)
        return ledger
      }),
    )
    await Promise.all(writers.map((l) => l.save()))

    // Whoever won, the file has to be a ledger rather than a splice of eight of them.
    const reread = await Ledger.open(dir)
    expect(reread.warning).toBeNull()
    expect(reread.entries.length).toBeGreaterThan(0)

    await fs.rm(dir, { recursive: true, force: true })
  })

  it('keeps an unreadable ledger instead of writing over it', async () => {
    // The only copy of every decision a human made should not vanish because a write was
    // interrupted once.
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ctxmux-ledger-'))
    await fs.writeFile(path.join(dir, 'learn.json'), '{"version":1,"entries":{', 'utf8')

    const ledger = await Ledger.open(dir)
    expect(ledger.warning).toBeTruthy()
    await expect(fs.readFile(path.join(dir, 'learn.json.corrupt'), 'utf8')).resolves.toContain('"version":1')

    await fs.rm(dir, { recursive: true, force: true })
  })
})

