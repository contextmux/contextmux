import { describe, expect, it } from 'vitest'
import {
  allPassed,
  complexity,
  inFlightCap,
  optIn,
  pathScope,
  producedChanges,
  qualityGate,
  readiness,
  runPreflight,
  runVerify,
  testIntegrity,
  DEFAULT_DENY,
} from '../src/gates.js'
import { globsOverlap, matchGlob } from '../src/glob.js'
import { FakeRunner, fakeTask } from '../src/testing.js'
import type { AgentResult } from '../src/task.js'

const res = (over: Partial<AgentResult> = {}): AgentResult => ({
  status: 'succeeded',
  filesChanged: [],
  summary: '',
  ...over,
})

describe('glob matching', () => {
  it('a single star does not cross a path separator', () => {
    expect(matchGlob('src/*.ts', 'src/a.ts')).toBe(true)
    expect(matchGlob('src/*.ts', 'src/nested/a.ts')).toBe(false)
  })

  it('double star crosses directories', () => {
    expect(matchGlob('src/**/*.ts', 'src/a/b/c.ts')).toBe(true)
    expect(matchGlob('**/*.test.ts', 'deep/nested/x.test.ts')).toBe(true)
    expect(matchGlob('**/*.test.ts', 'x.test.ts')).toBe(true)
  })

  it('supports brace alternation, which the default deny list relies on', () => {
    expect(matchGlob('**/*.config.{ts,js,mjs,cjs}', 'vite.config.ts')).toBe(true)
    expect(matchGlob('**/*.config.{ts,js,mjs,cjs}', 'packages/a/tsup.config.js')).toBe(true)
    expect(matchGlob('**/*.config.{ts,js,mjs,cjs}', 'src/config.tsx')).toBe(false)
  })

  it('escapes regex metacharacters in literals', () => {
    expect(matchGlob('a.b.ts', 'a.b.ts')).toBe(true)
    expect(matchGlob('a.b.ts', 'axbxts')).toBe(false)
  })

  it('matches the default deny list against real config paths', () => {
    for (const file of ['package.json', 'pnpm-lock.yaml', '.github/workflows/ci.yml', 'tsconfig.json']) {
      expect(DEFAULT_DENY.some((p) => matchGlob(p, file)), file).toBe(true)
    }
    expect(DEFAULT_DENY.some((p) => matchGlob(p, 'src/app.ts'))).toBe(false)
  })
})

describe('opt-in', () => {
  it('refuses anything not explicitly labelled', async () => {
    const gate = optIn({ label: 'agent-ok' })
    const out = await gate.preflight!({ task: fakeTask(), inFlight: 0 })
    expect(out.verdict).toBe('reject')
    expect(out.hint).toContain('agent-ok')
  })

  it('accepts a labelled task', async () => {
    const gate = optIn({ label: 'agent-ok' })
    const out = await gate.preflight!({ task: fakeTask({ labels: ['agent-ok'] }), inFlight: 0 })
    expect(out.verdict).toBe('pass')
  })
})

describe('readiness', () => {
  it('accepts a short task that has explicit acceptance criteria', async () => {
    // Criteria are worth more than length: they are what the work is checked against.
    const task = fakeTask({ body: 'Rename the button label to "Continue".'.padEnd(45, ' ') })
    const out = await readiness().preflight!({ task, inFlight: 0 })
    expect(out.verdict).toBe('pass')
  })

  it('rejects a vague task and says exactly what is missing', async () => {
    const task = fakeTask({ body: 'fix the bug', acceptanceCriteria: [] })
    const out = await readiness().preflight!({ task, inFlight: 0 })
    expect(out.verdict).toBe('reject')
    expect(out.reason).toContain('11 characters')
    expect(out.hint).toContain('Acceptance criteria')
  })

  it('rejects a long task with no criteria when they are required', async () => {
    const task = fakeTask({ body: 'x'.repeat(500), acceptanceCriteria: [] })
    expect((await readiness().preflight!({ task, inFlight: 0 })).verdict).toBe('reject')
  })

  it('can be configured not to require criteria', async () => {
    const task = fakeTask({ body: 'x'.repeat(500), acceptanceCriteria: [] })
    const gate = readiness({ requireAcceptanceCriteria: false })
    expect((await gate.preflight!({ task, inFlight: 0 })).verdict).toBe('pass')
  })
})

describe('in-flight cap', () => {
  it('allows work under the cap and blocks at it', async () => {
    const gate = inFlightCap({ max: 2 })
    expect((await gate.preflight!({ task: fakeTask(), inFlight: 1 })).verdict).toBe('pass')
    expect((await gate.preflight!({ task: fakeTask(), inFlight: 2 })).verdict).toBe('reject')
  })
})

describe('complexity', () => {
  it('rejects a large refactor with a high estimate', async () => {
    const task = fakeTask({ title: 'Refactor the auth module', estimate: 8 })
    const out = await complexity().preflight!({ task, inFlight: 0 })
    expect(out.verdict).toBe('reject')
    expect(out.reason).toContain('refactor')
    expect(out.hint).toContain('Split')
  })

  it('accepts ordinary work', async () => {
    expect((await complexity().preflight!({ task: fakeTask(), inFlight: 0 })).verdict).toBe('pass')
  })
})

describe('path scope', () => {
  const runner = new FakeRunner()

  it('rejects a change outside the allowed paths', async () => {
    const task = fakeTask({ scope: { allow: ['src/**'], deny: [] } })
    const out = await pathScope().verify!({
      task,
      result: res({ filesChanged: ['src/a.ts', 'docs/readme.md'] }),
      runner,
    })
    expect(out.verdict).toBe('reject')
    expect(out.reason).toContain('docs/readme.md')
    expect(out.reason).not.toContain('src/a.ts')
  })

  it('denies config files by default even with no explicit scope', async () => {
    // An unrequested edit to a manifest is how a small task quietly becomes a risky one.
    const out = await pathScope({ defaultDeny: DEFAULT_DENY }).verify!({
      task: fakeTask(),
      result: res({ filesChanged: ['src/a.ts', 'package.json'] }),
      runner,
    })
    expect(out.verdict).toBe('reject')
    expect(out.reason).toContain('package.json')
  })

  it('enforces a file-count ceiling', async () => {
    const task = fakeTask({ scope: { allow: [], deny: [], maxFiles: 2 } })
    const out = await pathScope().verify!({
      task,
      result: res({ filesChanged: ['a.ts', 'b.ts', 'c.ts'] }),
      runner,
    })
    expect(out.verdict).toBe('reject')
    expect(out.reason).toContain('limit is 2')
  })

  it('passes a well-behaved change', async () => {
    const task = fakeTask({ scope: { allow: ['src/**'], deny: [] } })
    const out = await pathScope({ defaultDeny: DEFAULT_DENY }).verify!({
      task,
      result: res({ filesChanged: ['src/a.ts', 'src/nested/b.ts'] }),
      runner,
    })
    expect(out.verdict).toBe('pass')
  })
})

describe('produced changes', () => {
  it('rejects a success that changed nothing', async () => {
    // A "completed" run containing no work looks fine on a dashboard and is worse than a failure.
    const out = await producedChanges().verify!({
      task: fakeTask(),
      result: res({ filesChanged: [] }),
      runner: new FakeRunner(),
    })
    expect(out.verdict).toBe('reject')
  })
})

describe('quality gate', () => {
  it('runs the project commands and passes when they succeed', async () => {
    const runner = new FakeRunner({ commands: { 'pnpm test': { code: 0 } } })
    const task = fakeTask({ qualityGate: ['pnpm test'] })
    const out = await qualityGate().verify!({ task, result: res(), runner })
    expect(out.verdict).toBe('pass')
    expect(runner.executed).toEqual(['pnpm test'])
  })

  it('returns the failure output verbatim, since that is the feedback the agent needs', async () => {
    const runner = new FakeRunner({
      commands: { 'pnpm test': { code: 1, stdout: 'FAIL src/a.test.ts\n  expected 2 got 3' } },
    })
    const task = fakeTask({ qualityGate: ['pnpm test'] })
    const out = await qualityGate().verify!({ task, result: res(), runner })
    expect(out.verdict).toBe('reject')
    expect(out.hint).toContain('expected 2 got 3')
  })

  it('stops at the first failing command', async () => {
    const runner = new FakeRunner({
      commands: { 'pnpm typecheck': { code: 1 }, 'pnpm test': { code: 0 } },
    })
    const task = fakeTask({ qualityGate: ['pnpm typecheck', 'pnpm test'] })
    await qualityGate().verify!({ task, result: res(), runner })
    expect(runner.executed).toEqual(['pnpm typecheck'])
  })

  it('passes when no commands are configured', async () => {
    const out = await qualityGate().verify!({
      task: fakeTask({ qualityGate: [] }),
      result: res(),
      runner: new FakeRunner(),
    })
    expect(out.verdict).toBe('pass')
  })
})

describe('test integrity', () => {
  it('ignores changes that do not touch tests', async () => {
    const out = await testIntegrity().verify!({
      task: fakeTask(),
      result: res({ filesChanged: ['src/a.ts'] }),
      runner: new FakeRunner(),
    })
    expect(out.verdict).toBe('pass')
  })

  it('escalates a removed assertion rather than asking the agent to fix it', async () => {
    // An agent told to "fix" a flagged test change may simply disguise it better.
    const diff = ['--- a/src/a.test.ts', '+++ b/src/a.test.ts', '-  expect(total).toBe(3)'].join('\n')
    const out = await testIntegrity().verify!({
      task: fakeTask(),
      result: res({ filesChanged: ['src/a.test.ts'], diff }),
      runner: new FakeRunner(),
    })
    expect(out.verdict).toBe('escalate')
    expect(out.reason).toContain('removed assertion')
  })

  it('flags a skipped test', async () => {
    const diff = ['--- a/src/a.test.ts', '+++ b/src/a.test.ts', '+  it.skip("does the thing", () => {})'].join('\n')
    const out = await testIntegrity().verify!({
      task: fakeTask(),
      result: res({ filesChanged: ['src/a.test.ts'], diff }),
      runner: new FakeRunner(),
    })
    expect(out.verdict).toBe('escalate')
    expect(out.reason).toContain('weakened test')
  })

  it('allows tests that were genuinely added', async () => {
    const diff = ['+++ b/src/a.test.ts', '+  it("handles zero", () => {', '+    expect(f(0)).toBe(0)', '+  })'].join('\n')
    const out = await testIntegrity().verify!({
      task: fakeTask(),
      result: res({ filesChanged: ['src/a.test.ts'], diff }),
      runner: new FakeRunner(),
    })
    expect(out.verdict).toBe('pass')
  })
})

describe('running gate sets', () => {
  it('collects every outcome rather than stopping at the first failure', async () => {
    const gates = [readiness(), complexity(), inFlightCap({ max: 0 })]
    const outcomes = await runPreflight(gates, {
      task: fakeTask({ body: 'x', acceptanceCriteria: [] }),
      inFlight: 5,
    })
    expect(outcomes).toHaveLength(3)
    expect(outcomes.filter((o) => o.verdict === 'reject')).toHaveLength(2)
    expect(allPassed(outcomes)).toBe(false)
  })

  it('skips gates that do not implement the requested phase', async () => {
    const outcomes = await runVerify([readiness(), producedChanges()], {
      task: fakeTask(),
      result: res({ filesChanged: ['a.ts'] }),
      runner: new FakeRunner(),
    })
    expect(outcomes.map((o) => o.gate)).toEqual(['produced-changes'])
  })
})

describe('complexity thresholds', () => {
  it('accepts a single strong signal', async () => {
    const big = fakeTask({ estimate: 8 })
    expect((await complexity().preflight!({ task: big, inFlight: 0 })).verdict).toBe('pass')
    const refactor = fakeTask({ title: 'Refactor the date helper' })
    expect((await complexity().preflight!({ task: refactor, inFlight: 0 })).verdict).toBe('pass')
  })

  it('rejects when two strong signals combine', async () => {
    const task = fakeTask({ title: 'Migrate the auth module', estimate: 8 })
    expect((await complexity().preflight!({ task, inFlight: 0 })).verdict).toBe('reject')
  })
})

describe('regressions', () => {
  it('denies config files at any depth, not only at the repository root', async () => {
    /*
     * The whole deny list was anchored to the root. In a workspace — which is the shape most
     * projects reaching for this tool have — `packages/api/package.json` matched nothing, so
     * the rule that reads as the strictest here protected the one manifest an agent is least
     * likely to touch and none of the ones it actually reaches for.
     */
    const gate = pathScope({ defaultDeny: DEFAULT_DENY })
    const nested = [
      'packages/api/package.json',
      'apps/web/tsconfig.json',
      'services/worker/pnpm-lock.yaml',
      'packages/ui/.env.local',
    ]

    for (const file of nested) {
      const outcome = await gate.verify!({
        task: fakeTask(),
        result: res({ filesChanged: [file] }),
        runner: new FakeRunner(),
      })
      expect(outcome.verdict, file).toBe('reject')
    }
  })

  it('still denies the same files at the root', async () => {
    const gate = pathScope({ defaultDeny: DEFAULT_DENY })
    const outcome = await gate.verify!({
      task: fakeTask(),
      result: res({ filesChanged: ['package.json'] }),
      runner: new FakeRunner(),
    })
    expect(outcome.verdict).toBe('reject')
  })

  it('does not deny ordinary source files that merely look like config', async () => {
    const gate = pathScope({ defaultDeny: DEFAULT_DENY })
    const outcome = await gate.verify!({
      task: fakeTask(),
      result: res({ filesChanged: ['src/package.ts', 'src/env.ts', 'docs/tsconfig.md'] }),
      runner: new FakeRunner(),
    })
    expect(outcome.verdict).toBe('pass')
  })

  it('reads the diff from the runner when the agent reports an empty one', async () => {
    // `??` treats an empty string as a real answer, so an adapter reporting `diff: ''` while
    // naming changed test files had its integrity check inspect nothing at all — and pass.
    const runner = new FakeRunner({
      diff: '-  expect(total).toBe(3)\n+  // TODO\n',
    })
    const outcome = await testIntegrity().verify!({
      task: fakeTask(),
      result: res({ filesChanged: ['src/a.test.ts'], diff: '' }),
      runner,
    })

    expect(outcome.verdict).toBe('escalate')
    expect(outcome.reason).toContain('removed assertion')
  })
})

describe('test integrity and refactoring', () => {
  const verify = (diff: string) =>
    testIntegrity().verify!({
      task: fakeTask(),
      result: res({ filesChanged: ['src/a.test.ts'], diff }),
      runner: new FakeRunner(),
    })

  it('does not treat a moved test as a deleted one', async () => {
    /*
     * Extracting a shared fixture shifts every test below it, and a line-based diff renders
     * that as the test being deleted and an identical one appearing. This escalated an
     * ordinary refactor to a human on the first real change the gate ever saw — and a gate
     * that fires on tidying up is one people switch off.
     */
    const diff = [
      '--- a/src/a.test.ts',
      '+++ b/src/a.test.ts',
      "-  it('drops the least necessary tier first', () => {",
      '-    const big = buildHandoff({ task })',
      '+  const big = () => buildHandoff({ task })',
      '+',
      "+  it('drops the least necessary tier first', () => {",
      '+    expect(render(big())).toContain("Task")',
    ].join('\n')

    expect((await verify(diff)).verdict).toBe('pass')
  })

  it('still catches an assertion that was removed and not replaced', async () => {
    const diff = [
      '--- a/src/a.test.ts',
      '+++ b/src/a.test.ts',
      '-    expect(total).toBe(3)',
      '+    // TODO: work out why this broke',
    ].join('\n')

    const outcome = await verify(diff)
    expect(outcome.verdict).toBe('escalate')
    expect(outcome.reason).toContain('removed assertion')
  })

  it('still catches a test that was deleted outright', async () => {
    const diff = [
      '--- a/src/a.test.ts',
      '+++ b/src/a.test.ts',
      "-  it('rejects a negative amount', () => {",
      '-    expect(() => charge(-1)).toThrow()',
      '-  })',
    ].join('\n')

    expect((await verify(diff)).verdict).toBe('escalate')
  })

  it('is not fooled by re-indentation alone', async () => {
    // Wrapping a block in a new `describe` re-indents everything inside it.
    const diff = [
      '--- a/src/a.test.ts',
      '+++ b/src/a.test.ts',
      "-  it('rejects a negative amount', () => {",
      "+    it('rejects a negative amount', () => {",
    ].join('\n')

    expect((await verify(diff)).verdict).toBe('pass')
  })

  it('still catches a test that was skipped rather than fixed', async () => {
    const diff = [
      '--- a/src/a.test.ts',
      '+++ b/src/a.test.ts',
      "-  it('rejects a negative amount', () => {",
      "+  it.skip('rejects a negative amount', () => {",
    ].join('\n')

    const outcome = await verify(diff)
    expect(outcome.verdict).toBe('escalate')
    expect(outcome.reason).toContain('weakened test')
  })
})

describe('globsOverlap', () => {
  /*
   * Deciding whether a path-scoped rule applies to a task whose scope is itself a glob. No
   * files exist at that point, so the question is about the patterns.
   *
   * The old test took the rule's literal prefix and called `startsWith` on it. Any glob
   * beginning with a star has an empty prefix, so it matched everything — and `packages/`
   * matched a task scoped to per-package tests for a rule about per-package tsconfig files.
   */
  it('sees an overlap where one genuinely exists', () => {
    expect(globsOverlap('**/*.test.ts', 'src/**')).toBe(true) // src/a.test.ts
    expect(globsOverlap('src/api/**', 'src/**')).toBe(true)
    expect(globsOverlap('src/**/*.ts', 'src/api/**')).toBe(true)
    expect(globsOverlap('tsconfig.json', 'tsconfig.json')).toBe(true)
    expect(globsOverlap('packages/*/tsconfig*.json', 'packages/*/**')).toBe(true)
  })

  it('proves disjointness where the literals cannot agree', () => {
    expect(globsOverlap('docs/**', 'src/**')).toBe(false)
    expect(globsOverlap('tsconfig.json', 'package.json')).toBe(false)
    // A wildcard that cannot actually match the literal beside it is not a match.
    expect(globsOverlap('packages/*/tsconfig*.json', 'packages/*/test/**')).toBe(false)
  })

  it('does not let a one-segment pattern match a deeper one', () => {
    // `*.md` describes a path of one segment; `src/**` needs at least two.
    expect(globsOverlap('*.md', 'src/**')).toBe(false)
  })

  it('gives up honestly once ** is involved', () => {
    // `**` absorbs any number of segments, so nothing after it can be proved disjoint. Erring
    // towards including a rule costs a few hundred characters; dropping one loses guidance the
    // author expected to be in force.
    expect(globsOverlap('**/anything', 'docs/**')).toBe(true)
    expect(globsOverlap('docs/**', '**/whatever')).toBe(true)
  })

  it('is symmetric', () => {
    for (const [a, b] of [
      ['docs/**', 'src/**'],
      ['**/*.test.ts', 'src/**'],
      ['packages/*/tsconfig*.json', 'packages/*/test/**'],
      ['*.md', 'src/**'],
    ]) {
      expect(globsOverlap(a!, b!), `${a} vs ${b}`).toBe(globsOverlap(b!, a!))
    }
  })
})

describe('tests neutralised rather than skipped', () => {
  const diff = (line: string) =>
    ['--- a/src/a.test.ts', '+++ b/src/a.test.ts', line].join('\n')

  const verify = async (line: string) =>
    testIntegrity().verify!({
      task: fakeTask(),
      result: { status: 'succeeded', filesChanged: ['src/a.test.ts'], summary: '', diff: diff(line) },
      runner: new FakeRunner(),
    } as never)

  it.each([
    '+  it.only("a", () => {',
    '+describe.only("suite", () => {',
    '+  test.only("x", async () => {',
    '+xit("a", () => {',
    '+xdescribe("s", () => {',
    '+  it.failing("a", () => {',
  ])('escalates on %j', async (line) => {
    /*
     * Skipping one test removes one test. `describe.only` stops every *other* test running, so
     * the suite goes green covering almost nothing and the quality gate reports a pass — which
     * is the outcome this gate exists to prevent. It was checking only `.skip` and `.todo`.
     */
    expect((await verify(line)).verdict).toBe('escalate')
  })

  it.each([
    '+  it("only when logged in", () => {',
    '+  const onlyOne = items[0]',
    '+  it("skips empty rows", () => {',
  ])('says nothing about %j', async (line) => {
    // The words appear in ordinary test names constantly; this must not fire on them.
    expect((await verify(line)).verdict).toBe('pass')
  })
})
