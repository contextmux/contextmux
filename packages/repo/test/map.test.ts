import { describe, expect, it } from 'vitest'
import { buildMap, estimateTokens, renderMap, scoreFiles, tokenize } from '../src/map.js'
import type { RepoIndex } from '../src/indexer.js'

function index(files: Array<{ path: string; symbols: Array<{ name: string; doc?: string }> }>): RepoIndex {
  return {
    root: '/repo',
    builtAt: 0,
    skipped: 0,
    truncated: false,
    git: { commitCounts: new Map(), lastTouched: new Map(), coChange: new Map() },
    files: files.map((f) => ({
      path: f.path,
      ext: '.ts',
      bytes: 100,
      hash: 'x',
      symbols: f.symbols.map((s, i) => ({
        name: s.name,
        kind: 'function' as const,
        line: i + 1,
        exported: true,
        ...(s.doc ? { doc: s.doc } : {}),
      })),
    })),
  }
}

describe('tokenize', () => {
  it('splits camelCase into separate terms', () => {
    expect(tokenize('formatDateString')).toEqual(['format', 'date', 'string'])
  })
  it('drops stopwords and short tokens', () => {
    expect(tokenize('add the new helper for a thing')).toEqual(['new', 'helper', 'thing'])
  })
})

describe('scoreFiles', () => {
  const idx = index([
    { path: 'src/helpers/date.ts', symbols: [{ name: 'formatDate', doc: 'Formats a date.' }] },
    { path: 'src/components/Button.tsx', symbols: [{ name: 'Button' }] },
    { path: 'src/unrelated.ts', symbols: [{ name: 'zzz' }] },
  ])

  it('ranks the relevant file first', () => {
    const scored = scoreFiles(idx, { text: 'format a date', budget: 1000 })
    expect(scored[0]?.path).toBe('src/helpers/date.ts')
  })

  it('excludes files with no signal at all', () => {
    const scored = scoreFiles(idx, { text: 'format a date', budget: 1000 })
    expect(scored.map((s) => s.path)).not.toContain('src/unrelated.ts')
  })

  it('matches wildcard symbol patterns', () => {
    const scored = scoreFiles(idx, { symbols: ['format*'], budget: 1000 })
    expect(scored[0]?.path).toBe('src/helpers/date.ts')
  })

  it('honours path restrictions', () => {
    const scored = scoreFiles(idx, { text: 'format date button', paths: ['src/components'], budget: 1000 })
    expect(scored.every((s) => s.path.startsWith('src/components'))).toBe(true)
  })

  it('explains why a file was selected', () => {
    const scored = scoreFiles(idx, { text: 'format a date', budget: 1000 })
    expect(scored[0]?.reasons.length).toBeGreaterThan(0)
  })

  it('uses co-change to surface files that change alongside the seeds', () => {
    const withGit = index([
      { path: 'src/a.ts', symbols: [{ name: 'aaa' }] },
      { path: 'src/b.ts', symbols: [{ name: 'bbb' }] },
    ])
    withGit.git.coChange.set('src/seed.ts', new Map([['src/b.ts', 10]]))
    const scored = scoreFiles(withGit, { budget: 1000, seeds: ['src/seed.ts'] })
    expect(scored[0]?.path).toBe('src/b.ts')
    expect(scored[0]?.reasons).toContain('changes alongside seed files')
  })
})

describe('renderMap budget', () => {
  const many = index(
    Array.from({ length: 60 }, (_, i) => ({
      path: `src/module${i}/handler.ts`,
      symbols: [
        { name: `handleRequest${i}`, doc: 'Handles an incoming request with a long description.' },
        { name: `parseRequest${i}`, doc: 'Parses the request body into a typed structure.' },
      ],
    })),
  )

  for (const budget of [100, 300, 1000, 4000, 20000]) {
    it(`never exceeds a ${budget}-token budget`, () => {
      const map = buildMap(many, { text: 'handle parse request', budget })
      expect(map.estimatedTokens).toBeLessThanOrEqual(budget)
    })
  }

  it('degrades to a less detailed rendering rather than truncating mid-structure', () => {
    const rich = buildMap(many, { text: 'handle parse request', budget: 20000 })
    const poor = buildMap(many, { text: 'handle parse request', budget: 300 })
    expect(rich.text).toContain('function `handleRequest0`')
    expect(poor.text).not.toContain('function `handleRequest0`')
    expect(poor.estimatedTokens).toBeLessThan(rich.estimatedTokens)
  })

  it('reports omissions rather than truncating silently', () => {
    const map = buildMap(many, { text: 'handle parse request', budget: 400 })
    if (map.omitted > 0) expect(map.text).toContain('omitted')
    expect(map.totalCandidates).toBeGreaterThan(map.files.length)
  })

  it('says so plainly when the budget is too small to be useful', () => {
    const map = renderMap(
      [{ path: 'a.ts', score: 1, symbols: [], reasons: [] }],
      1,
      1,
    )
    expect(map.text).toContain('too small')
  })

  it('handles an empty result set', () => {
    const map = buildMap(index([]), { text: 'anything', budget: 1000 })
    expect(map.files).toEqual([])
  })
})

describe('estimateTokens', () => {
  it('is monotonic in length', () => {
    expect(estimateTokens('a'.repeat(360))).toBeGreaterThan(estimateTokens('a'.repeat(36)))
  })
})

describe('empty results', () => {
  it('says plainly that nothing matched instead of rendering an empty section', () => {
    const map = buildMap(index([{ path: 'src/a.ts', symbols: [{ name: 'zzz' }] }]), {
      text: 'completely unrelated query',
      budget: 1000,
    })
    expect(map.files).toEqual([])
    expect(map.text).toContain('No existing code matched')
  })
})
