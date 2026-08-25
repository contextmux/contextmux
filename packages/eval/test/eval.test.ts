import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DENY,
  FakeRunner,
  fakeTask,
  pathScope,
  type GateOutcome,
  type TaskSpec,
} from '@contextmux/core'
import {
  countDiffLines,
  outOfScope,
  rank,
  renderMarkdown,
  renderTable,
  scoreAttempt,
  type Attempt,
  type EvalResult,
  type Score,
} from '../src/index.js'

const attempt = (over: Partial<Attempt> = {}): Attempt => ({
  agentId: 'a',
  agentName: 'Agent A',
  result: { status: 'succeeded', filesChanged: ['src/a.ts'], summary: 'done' },
  gateOutcomes: [{ gate: 'quality-gate', verdict: 'pass' }],
  rounds: 0,
  durationMs: 1000,
  state: 'in_review',
  ...over,
})

const score = (over: Partial<Score> = {}): Score => ({
  agentId: 'a',
  agentName: 'A',
  succeeded: true,
  qualityPassed: true,
  outOfScopeFiles: [],
  filesChanged: 2,
  diffLines: 20,
  rounds: 0,
  durationMs: 1000,
  costUsd: 0.1,
  weakenedTests: false,
  state: 'in_review',
  notes: [],
  ...over,
})

describe('measurement', () => {
  it('counts added and removed lines, ignoring diff headers', () => {
    const diff = ['--- a/x.ts', '+++ b/x.ts', '@@ -1 +1,2 @@', '-old line', '+new line', '+another'].join('\n')
    expect(countDiffLines(diff)).toBe(3)
  })

  it('reports nothing for an empty diff', () => {
    expect(countDiffLines(undefined)).toBe(0)
    expect(countDiffLines('')).toBe(0)
  })

  it('finds files the task did not permit', () => {
    const task = fakeTask({ scope: { allow: ['src/**'], deny: ['src/legacy/**'] } })
    expect(outOfScope(task, ['src/a.ts', 'docs/x.md', 'src/legacy/old.ts'])).toEqual([
      'docs/x.md',
      'src/legacy/old.ts',
    ])
  })

  it('treats an unscoped task as permitting everything', () => {
    expect(outOfScope(fakeTask(), ['anything.ts'])).toEqual([])
  })
})

describe('scoring', () => {
  const task = fakeTask({ scope: { allow: ['src/**'], deny: [] } })

  it('records a clean pass', () => {
    const s = scoreAttempt(task, attempt())
    expect(s.succeeded).toBe(true)
    expect(s.qualityPassed).toBe(true)
    expect(s.outOfScopeFiles).toEqual([])
    expect(s.notes).toEqual([])
  })

  it('notes out-of-scope changes without discarding the attempt', () => {
    const s = scoreAttempt(
      task,
      attempt({ result: { status: 'succeeded', filesChanged: ['src/a.ts', 'package.json'], summary: '' } }),
    )
    expect(s.outOfScopeFiles).toEqual(['package.json'])
    expect(s.notes.join(' ')).toContain('outside the task scope')
  })

  it('marks a weakened test suite', () => {
    const outcomes: GateOutcome[] = [{ gate: 'test-integrity', verdict: 'escalate', reason: 'removed assertion' }]
    const s = scoreAttempt(task, attempt({ gateOutcomes: outcomes }))
    expect(s.weakenedTests).toBe(true)
    expect(s.notes.join(' ')).toContain('weakened existing tests')
  })

  it('says when the quality gate never ran, rather than implying it passed', () => {
    const s = scoreAttempt(task, attempt({ gateOutcomes: [] }))
    expect(s.qualityPassed).toBe(false)
    expect(s.notes.join(' ')).toContain('quality gate did not run')
  })

  it('records a refusal as its own outcome', () => {
    const s = scoreAttempt(
      task,
      attempt({
        result: { status: 'refused', filesChanged: [], summary: 'no', error: 'ambiguous' },
        state: 'escalated',
      }),
    )
    expect(s.succeeded).toBe(false)
    expect(s.notes.join(' ')).toContain('declined the task')
  })

  it('handles an attempt that produced nothing at all', () => {
    const s = scoreAttempt(task, attempt({ result: null, state: 'failed', error: 'binary missing' }))
    expect(s.filesChanged).toBe(0)
    expect(s.costUsd).toBeNull()
    expect(s.error).toBe('binary missing')
  })
})

describe('ranking', () => {
  it('puts correctness above a small diff', () => {
    // A tidy wrong answer is not better than a correct one.
    const ranked = rank([
      score({ agentName: 'tidy but wrong', succeeded: false, qualityPassed: false, diffLines: 3 }),
      score({ agentName: 'correct', succeeded: true, qualityPassed: true, diffLines: 200 }),
    ])
    expect(ranked[0]?.agentName).toBe('correct')
  })

  it('disqualifies a weakened test suite outright', () => {
    // A suite quietly loosened is worse than one that fails honestly: the failure announces
    // itself, the loosening does not.
    const ranked = rank([
      score({ agentName: 'cheated', weakenedTests: true, succeeded: true, diffLines: 1, rounds: 0 }),
      score({ agentName: 'failed honestly', succeeded: false, qualityPassed: false }),
    ])
    expect(ranked[0]?.agentName).toBe('failed honestly')
  })

  it('prefers staying in scope over a smaller diff', () => {
    const ranked = rank([
      score({ agentName: 'sprawled', outOfScopeFiles: ['package.json'], diffLines: 10 }),
      score({ agentName: 'disciplined', outOfScopeFiles: [], diffLines: 60 }),
    ])
    expect(ranked[0]?.agentName).toBe('disciplined')
  })

  it('prefers fewer review rounds over a smaller diff', () => {
    // A human's attention is scarcer than lines of diff.
    const ranked = rank([
      score({ agentName: 'needed help', rounds: 2, diffLines: 10 }),
      score({ agentName: 'first time', rounds: 0, diffLines: 40 }),
    ])
    expect(ranked[0]?.agentName).toBe('first time')
  })

  it('uses cost only as a late tiebreak', () => {
    const ranked = rank([
      score({ agentName: 'cheap', costUsd: 0.01, rounds: 2 }),
      score({ agentName: 'costly', costUsd: 2.0, rounds: 0 }),
    ])
    expect(ranked[0]?.agentName).toBe('costly')
  })

  it('does not reward an agent for reporting no cost at all', () => {
    const ranked = rank([
      score({ agentName: 'unknown cost', costUsd: null }),
      score({ agentName: 'known cost', costUsd: 0.5 }),
    ])
    expect(ranked[0]?.agentName).toBe('known cost')
  })
})

describe('reporting', () => {
  const result: EvalResult = {
    task: fakeTask(),
    scores: rank([
      score({ agentName: 'Claude Code', rounds: 0, diffLines: 24, costUsd: 0.4 }),
      score({ agentName: 'Cursor', succeeded: false, qualityPassed: false, state: 'escalated' }),
      score({ agentName: 'Codex', outOfScopeFiles: ['package.json'], notes: ['1 file(s) outside the task scope'] }),
    ]),
    skipped: [{ agentId: 'copilot', agentName: 'Copilot', reason: 'not enabled on this repository' }],
    startedAt: 0,
    durationMs: 90_000,
  }

  it('renders an aligned table', () => {
    const table = renderTable(result)
    const lines = table.split('\n')
    expect(lines[0]).toContain('agent')
    expect(table).toContain('Claude Code')
    expect(table).toContain('$0.400')
  })

  it('does not rank an attempt that failed', () => {
    expect(renderTable(result)).toMatch(/—\s+Cursor/)
  })

  it('shows what was measured rather than a single composite number', () => {
    // A score out of ten hides the trade-off a reader needs: that the cheapest agent touched
    // files nobody asked it to.
    const md = renderMarkdown(result)
    for (const column of ['Tests', 'Scope', 'Diff lines', 'Rounds', 'Cost']) {
      expect(md).toContain(column)
    }
    expect(md).not.toMatch(/\bscore: \d+\/10\b/)
  })

  it('reports entrants that could not run', () => {
    expect(renderMarkdown(result)).toContain('not enabled on this repository')
  })

  it('explains the method, so the numbers can be argued with', () => {
    const md = renderMarkdown(result)
    expect(md).toContain('How this was measured')
    expect(md).toContain('not from a model')
  })

  it('renders with a single entrant and with none', () => {
    const single: EvalResult = { ...result, scores: [score()], skipped: [] }
    expect(() => renderTable(single)).not.toThrow()
    const empty: EvalResult = { ...result, scores: [], skipped: [] }
    expect(() => renderTable(empty)).not.toThrow()
    expect(() => renderMarkdown(empty)).not.toThrow()
  })
})

describe('verdict honesty', () => {
  it('does not call an unattempted run a failure', () => {
    // A dry run stops before dispatch. Reporting "failed" would be a claim about something
    // that never happened.
    const planned: EvalResult = {
      task: fakeTask(),
      scores: [score({ agentName: 'Claude Code', succeeded: false, qualityPassed: false, state: 'ready' })],
      skipped: [],
      startedAt: 0,
      durationMs: 100,
    }
    expect(renderTable(planned)).toContain('not attempted')
    expect(renderTable(planned)).not.toContain('failed')
  })

  it('distinguishes rejected, escalated and failed', () => {
    for (const [state, expected] of [
      ['rejected', 'rejected by gates'],
      ['escalated', 'needs a human'],
      ['failed', 'failed'],
    ] as const) {
      const r: EvalResult = {
        task: fakeTask(),
        scores: [score({ succeeded: false, state })],
        skipped: [],
        startedAt: 0,
        durationMs: 1,
      }
      expect(renderTable(r)).toContain(expected)
    }
  })
})

describe('scoring against the same rule the gate applies', () => {
  it('counts a default-denied file as out of scope even with no explicit scope', () => {
    /*
     * `ctxmux eval` builds its gates with `pathScope({ defaultDeny: DEFAULT_DENY })` and then
     * scored with a rule that did not include it. An agent that edited `package.json` on a task
     * with no explicit scope was rejected by the gate and reported as "scope: clean" in the same
     * table — the one place a comparison must not disagree with the thing it is comparing.
     */
    const task = fakeTask()
    expect(task.scope.allow).toEqual([])
    expect(task.scope.deny).toEqual([])

    expect(outOfScope(task, ['package.json'])).toEqual(['package.json'])
    expect(outOfScope(task, ['src/ordinary.ts'])).toEqual([])
  })

  it('agrees with pathScope on the same change', () => {
    const task = fakeTask()
    const files = ['src/a.ts', 'package.json']

    const gate = pathScope({ defaultDeny: DEFAULT_DENY })
    const outcome = gate.verify!({
      task,
      result: { status: 'succeeded', filesChanged: files, summary: '' },
      runner: new FakeRunner(),
    } as never)

    expect(outOfScope(task, files).length > 0).toBe(
      (outcome as { verdict: string }).verdict !== 'pass',
    )
  })
})
