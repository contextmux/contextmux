/**
 * The minimalism gates.
 *
 * Ponytail's ladder is a prompt, and a prompt is advice an agent can ignore. These are the
 * rungs that can be checked against the diff it actually produced.
 */
import { describe, expect, it } from 'vitest'
import {
  minimalismGates,
  noDuplicateSymbols,
  noSpeculativeAbstraction,
  noUnrequestedDependencies,
} from '../src/gates-minimal.js'
import { FakeRunner, fakeTask } from '../src/testing.js'
import type { AgentResult } from '../src/task.js'

const res = (over: Partial<AgentResult> = {}): AgentResult => ({
  status: 'succeeded',
  filesChanged: [],
  summary: '',
  ...over,
})

const ctx = (result: AgentResult, task = fakeTask()) => ({ task, result, runner: new FakeRunner() })

describe('unrequested dependencies', () => {
  const diffAdding = (name: string) =>
    ['--- a/package.json', '+++ b/package.json', `+    "${name}": "^1.0.0",`].join('\n')

  it('rejects a dependency the task never mentioned', async () => {
    // The ladder's fifth rung inverted: if something installed would have done, adding a new
    // one was avoidable.
    const out = await noUnrequestedDependencies().verify!(
      ctx(res({ filesChanged: ['package.json'], diff: diffAdding('date-fns') })),
    )
    expect(out.verdict).toBe('reject')
    expect(out.reason).toContain('date-fns')
    expect(out.hint).toContain('already installed')
  })

  it('allows a dependency the task asked for by name', async () => {
    // "Add stripe checkout" mentions stripe, so adding stripe is requested.
    const task = fakeTask({ title: 'Add stripe checkout', body: 'Integrate stripe for payments.' })
    const out = await noUnrequestedDependencies().verify!(
      ctx(res({ filesChanged: ['package.json'], diff: diffAdding('stripe') }), task),
    )
    expect(out.verdict).toBe('pass')
  })

  it('strips a scope when matching against the task text', async () => {
    const task = fakeTask({ title: 'Use tanstack query', body: 'Adopt query for data fetching.' })
    const out = await noUnrequestedDependencies().verify!(
      ctx(res({ filesChanged: ['package.json'], diff: diffAdding('@tanstack/query') }), task),
    )
    expect(out.verdict).toBe('pass')
  })

  it('ignores manifest fields that are not dependencies', async () => {
    const diff = ['--- a/package.json', '+++ b/package.json', '+  "version": "1.1.0",'].join('\n')
    const out = await noUnrequestedDependencies().verify!(ctx(res({ filesChanged: ['package.json'], diff })))
    expect(out.verdict).toBe('pass')
  })

  it('passes when no manifest was touched at all', async () => {
    const out = await noUnrequestedDependencies().verify!(ctx(res({ filesChanged: ['src/a.ts'] })))
    expect(out.verdict).toBe('pass')
  })

  it('says so rather than guessing when a manifest changed but no diff is available', async () => {
    const out = await noUnrequestedDependencies().verify!(ctx(res({ filesChanged: ['package.json'] })))
    expect(out.verdict).toBe('reject')
    expect(out.reason).toContain('no diff was available')
  })

  it('handles non-JavaScript manifests', async () => {
    const diff = ['--- a/requirements.txt', '+++ b/requirements.txt', '+requests==2.31.0'].join('\n')
    const out = await noUnrequestedDependencies().verify!(ctx(res({ filesChanged: ['requirements.txt'], diff })))
    expect(out.verdict).toBe('reject')
    expect(out.reason).toContain('requests')
  })
})

describe('duplicate symbols', () => {
  const existing = [{ name: 'formatDate', file: 'src/helpers/date.ts' }]

  it('rejects a new function that already exists elsewhere', async () => {
    // The ladder's second rung: is it already in this codebase?
    const diff = ['--- a/src/util.ts', '+++ b/src/util.ts', '+export function formatDate(d) {'].join('\n')
    const out = await noDuplicateSymbols({ existing: () => existing }).verify!(
      ctx(res({ filesChanged: ['src/util.ts'], diff })),
    )
    expect(out.verdict).toBe('reject')
    expect(out.reason).toContain('src/helpers/date.ts')
    expect(out.hint).toContain('Reuse the existing one')
  })

  it('allows a genuinely new name', async () => {
    const diff = ['--- a/src/util.ts', '+++ b/src/util.ts', '+export function formatDuration(d) {'].join('\n')
    const out = await noDuplicateSymbols({ existing: () => existing }).verify!(
      ctx(res({ filesChanged: ['src/util.ts'], diff })),
    )
    expect(out.verdict).toBe('pass')
  })

  it('does not flag a redeclaration in the file being edited', async () => {
    // Rewriting a function in its own file is ordinary work, not duplication.
    const diff = ['--- a/src/helpers/date.ts', '+++ b/src/helpers/date.ts', '+export function formatDate(d) {'].join('\n')
    const out = await noDuplicateSymbols({ existing: () => existing }).verify!(
      ctx(res({ filesChanged: ['src/helpers/date.ts'], diff })),
    )
    expect(out.verdict).toBe('pass')
  })

  it('does not flag against a file the agent also changed', async () => {
    // Moving a function counts as one change, not a collision with itself.
    const diff = ['--- a/src/util.ts', '+++ b/src/util.ts', '+export function formatDate(d) {'].join('\n')
    const out = await noDuplicateSymbols({ existing: () => existing }).verify!(
      ctx(res({ filesChanged: ['src/util.ts', 'src/helpers/date.ts'], diff })),
    )
    expect(out.verdict).toBe('pass')
  })

  it('works for languages other than TypeScript', async () => {
    const diff = ['--- a/app/util.py', '+++ b/app/util.py', '+def format_date(d):'].join('\n')
    const out = await noDuplicateSymbols({
      existing: () => [{ name: 'format_date', file: 'app/helpers.py' }],
    }).verify!(ctx(res({ filesChanged: ['app/util.py'], diff })))
    expect(out.verdict).toBe('reject')
  })
})

describe('speculative abstraction', () => {
  const interfaceDiff = (implementers: string[]) =>
    [
      '--- a/src/store.ts',
      '+++ b/src/store.ts',
      '+export interface Store {',
      ...implementers.map((name) => `+export class ${name} implements Store {`),
    ].join('\n')

  it('rejects an interface introduced with one implementation', async () => {
    // A layer added on speculation, in the same change that added its only user.
    const out = await noSpeculativeAbstraction().verify!(
      ctx(res({ filesChanged: ['src/store.ts'], diff: interfaceDiff(['MemoryStore']) })),
    )
    expect(out.verdict).toBe('reject')
    expect(out.hint).toContain('when a second implementation actually arrives')
  })

  it('allows one introduced with two', async () => {
    const out = await noSpeculativeAbstraction().verify!(
      ctx(res({ filesChanged: ['src/store.ts'], diff: interfaceDiff(['MemoryStore', 'FileStore']) })),
    )
    expect(out.verdict).toBe('pass')
  })

  it('allows it when the task asked for an abstraction', async () => {
    // The exemption that keeps the gate from arguing with the person who filed the task.
    const task = fakeTask({ title: 'Add a plugin interface for storage backends' })
    const out = await noSpeculativeAbstraction().verify!(
      ctx(res({ filesChanged: ['src/store.ts'], diff: interfaceDiff(['MemoryStore']) }), task),
    )
    expect(out.verdict).toBe('pass')
  })

  it.each([
    'Make the storage layer extensible',
    'Add a pluggable backend for storage',
    'Support several adapters for storage',
    'Add plugins for storage backends',
    'Define interfaces for the storage layer',
  ])('allows it when the task said %j', async (title) => {
    /*
     * The exemption list was written with `extensib` and `pluggab` as prefixes, but the
     * trailing `\b` requires a non-word character next — so neither matched the words anyone
     * actually writes. Being an exemption, a miss rejects work the human explicitly asked for,
     * which is the expensive direction for this gate to be wrong in.
     */
    const out = await noSpeculativeAbstraction().verify!(
      ctx(res({ filesChanged: ['src/store.ts'], diff: interfaceDiff(['MemoryStore']) }), fakeTask({ title })),
    )
    expect(out.verdict).toBe('pass')
  })

  it('still rejects one nobody asked for', async () => {
    // The exemption has to stay narrow, or the gate becomes decorative.
    const out = await noSpeculativeAbstraction().verify!(
      ctx(res({ filesChanged: ['src/store.ts'], diff: interfaceDiff(['MemoryStore']) }), fakeTask({ title: 'Fix the login redirect' })),
    )
    expect(out.verdict).toBe('reject')
  })

  it('says nothing about an interface that already existed', async () => {
    // An interface with one implementer that has been there a year is somebody's design, and
    // reopening that argument is not this gate's business.
    const diff = ['--- a/src/a.ts', '+++ b/src/a.ts', '+export class Thing implements ExistingStore {'].join('\n')
    const out = await noSpeculativeAbstraction().verify!(ctx(res({ filesChanged: ['src/a.ts'], diff })))
    expect(out.verdict).toBe('pass')
  })
})

describe('the set', () => {
  it('runs without a symbol index, since two of three beats none', async () => {
    expect(minimalismGates().map((g) => g.name)).toEqual([
      'no-unrequested-dependencies',
      'no-speculative-abstraction',
    ])
  })

  it('adds the duplicate check when an index is available', async () => {
    expect(minimalismGates({ existing: () => [] }).map((g) => g.name)).toContain('no-duplicate-symbols')
  })

  it('every gate is a verify gate — none of this is checkable before the work exists', () => {
    for (const gate of minimalismGates({ existing: () => [] })) {
      expect(gate.verify).toBeTruthy()
      expect(gate.preflight).toBeUndefined()
    }
  })
})

describe('reading the change', () => {
  const emptyResult = (over: Record<string, unknown> = {}) => ({
    status: 'succeeded' as const,
    filesChanged: ['src/a.ts'],
    summary: '',
    diff: '',
    ...over,
  })

  it('falls back to the workspace when the agent reports no diff', async () => {
    /*
     * `result.diff ?? ''` treats an empty string as an answer, so an adapter that does not
     * populate `diff` had these gates inspect nothing and pass. A check that silently checks
     * nothing is worse than one switched off — the run reports that it ran.
     */
    const runner = new FakeRunner({
      diff: '+++ b/src/a.ts\n+export function formatDate(d: Date) { return d.toISOString() }\n',
    })

    const outcome = await noDuplicateSymbols({
      existing: () => [{ name: 'formatDate', file: 'src/dates.ts' }],
    }).verify!({ task: fakeTask(), result: emptyResult(), runner })

    expect(outcome.verdict).toBe('reject')
    expect(outcome.reason).toContain('formatDate')
  })

  it('checks a manifest change it can now see', async () => {
    const runner = new FakeRunner({
      diff: '+++ b/package.json\n+    "date-fns": "^3.0.0",\n',
    })

    const outcome = await noUnrequestedDependencies().verify!({
      task: fakeTask(),
      result: emptyResult({ filesChanged: ['package.json'] }),
      runner,
    })

    expect(outcome.verdict).toBe('reject')
    expect(outcome.reason).toContain('date-fns')
  })

  it('still passes when there genuinely is no change to read', async () => {
    const runner = new FakeRunner({ diff: '' })
    const outcome = await noDuplicateSymbols({ existing: () => [] }).verify!({
      task: fakeTask(),
      result: emptyResult(),
      runner,
    })
    expect(outcome.verdict).toBe('pass')
  })
})
