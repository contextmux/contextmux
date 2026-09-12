import { describe, expect, it } from 'vitest'
import { inspect, type RepoFacts } from '@contextmux/council'
import type { ContextModel, Rule, Skill } from '@contextmux/context'

const FACTS: RepoFacts = {
  files: ['src/index.ts', 'src/util.ts', 'test/index.test.ts', 'README.md'],
  targets: ['claude', 'copilot'],
}

function rule(over: Partial<Rule> = {}): Rule {
  return {
    name: 'a-rule',
    globs: [],
    alwaysApply: false,
    priority: 50,
    body: 'Always return early rather than nesting.',
    ...over,
  } as Rule
}

function skill(over: Partial<Skill> = {}): Skill {
  return {
    name: 'a-skill',
    description: 'Use when writing a new test, or when an existing test needs an assertion added.',
    globs: [],
    resources: [],
    tools: [],
    body: 'Write the assertion first.',
    ...over,
  } as Skill
}

function model(over: Partial<ContextModel> = {}): ContextModel {
  return { rules: [], skills: [], agents: [], commands: [], mcp: [], ...over } as ContextModel
}

const checks = (s: { check: string }[]) => s.map((x) => x.check)

describe('a node that cannot work', () => {
  it('reports an empty body as an error, because it compiles to nothing', () => {
    const found = inspect(model({ rules: [rule({ body: '   \n  ' })] }), FACTS)
    expect(checks(found)).toContain('empty-body')
    expect(found.find((f) => f.check === 'empty-body')?.severity).toBe('error')
  })

  it('reports a node restricted to targets the repository does not compile', () => {
    const found = inspect(model({ rules: [rule({ targets: ['cursor'] })] }), FACTS)
    const f = found.find((x) => x.check === 'never-compiles')
    expect(f?.severity).toBe('error')
    expect(f?.message).toContain('cursor')
  })

  it('says nothing when the restriction still reaches one configured target', () => {
    const found = inspect(model({ rules: [rule({ targets: ['cursor', 'claude'] })] }), FACTS)
    expect(checks(found)).not.toContain('never-compiles')
  })

  it('treats an absent target filter as every target, not as none', () => {
    const found = inspect(model({ rules: [rule({ targets: undefined })] }), FACTS)
    expect(checks(found)).not.toContain('never-compiles')
  })
})

describe('scoping that does not do what it looks like', () => {
  it('reports globs that alwaysApply has quietly overridden', () => {
    const found = inspect(
      model({ rules: [rule({ alwaysApply: true, globs: ['src/**'] })] }),
      FACTS,
    )
    expect(checks(found)).toContain('globs-ignored')
  })

  it('leaves alwaysApply alone when there are no globs to ignore', () => {
    const found = inspect(model({ rules: [rule({ alwaysApply: true, globs: [] })] }), FACTS)
    expect(checks(found)).not.toContain('globs-ignored')
  })

  it('reports a glob that matches no file in the repository', () => {
    const found = inspect(model({ rules: [rule({ globs: ['lib/**/*.ts'] })] }), FACTS)
    const f = found.find((x) => x.check === 'globs-match-nothing')
    expect(f?.message).toContain('lib/**/*.ts')
    expect(f?.fix).toContain('Nothing activates this')
  })

  it('distinguishes some dead globs from all of them', () => {
    const found = inspect(
      model({ rules: [rule({ globs: ['src/**', 'lib/**'] })] }),
      FACTS,
    )
    const f = found.find((x) => x.check === 'globs-match-nothing')
    expect(f?.message).toContain('1 of 2')
    expect(f?.fix).not.toContain('Nothing activates this')
  })

  it('says nothing about globs when the file list is unknown', () => {
    const found = inspect(
      model({ rules: [rule({ globs: ['lib/**'] })] }),
      { files: [], targets: ['claude'] },
    )
    expect(checks(found)).not.toContain('globs-match-nothing')
  })
})

describe('references that have rotted', () => {
  it('reports a path in the body that no longer exists', () => {
    const found = inspect(
      model({ rules: [rule({ body: 'Always follow the shape in src/legacy/old.ts here.' })] }),
      FACTS,
    )
    const f = found.find((x) => x.check === 'dangling-path')
    expect(f?.message).toContain('src/legacy/old.ts')
  })

  it('says nothing about a path that is really there', () => {
    const found = inspect(
      model({ rules: [rule({ body: 'Always follow the shape in src/util.ts here.' })] }),
      FACTS,
    )
    expect(checks(found)).not.toContain('dangling-path')
  })

  it('does not mistake a glob for a claim that a file exists', () => {
    const found = inspect(model({ rules: [rule({ body: 'Always keep src/**/*.ts small.' })] }), FACTS)
    expect(checks(found)).not.toContain('dangling-path')
  })

  it('does not mistake a bare domain for a repository path', () => {
    const found = inspect(
      model({ rules: [rule({ body: 'Always read the guide at contextmux.dev/guide.html first.' })] }),
      FACTS,
    )
    expect(checks(found)).not.toContain('dangling-path')
  })

  it('still reports a dotted directory, which is a real path', () => {
    const found = inspect(
      model({ rules: [rule({ body: 'Always mirror .github/workflows/gone.yml here.' })] }),
      FACTS,
    )
    expect(checks(found)).toContain('dangling-path')
  })

  it('agrees with itself about singular and plural', () => {
    const one = inspect(model({ rules: [rule({ body: 'Always see src/gone.ts for this.' })] }), FACTS)
    expect(one.find((f) => f.check === 'dangling-path')?.message).toContain('a path that no longer exists')
  })

  it('caps a long list of dead paths, keeping the count', () => {
    const body =
      'Always see ' + Array.from({ length: 9 }, (_, i) => `src/gone${i}.ts`).join(', ') + '.'
    const f = inspect(model({ rules: [rule({ body })] }), FACTS).find(
      (x) => x.check === 'dangling-path',
    )
    expect(f?.message).toContain('9 paths that no longer exist')
    expect(f?.message).toContain('and 4 more')
    expect(f?.message.length).toBeLessThan(160)
  })

  it('does not mistake and/or for a path', () => {
    const found = inspect(
      model({ rules: [rule({ body: 'Always handle the read and/or write case.' })] }),
      FACTS,
    )
    expect(checks(found)).not.toContain('dangling-path')
  })
})

describe('rules an agent cannot act on', () => {
  it('reports a skill description too thin to ever activate', () => {
    const found = inspect(model({ skills: [skill({ description: 'Testing helper.' })] }), FACTS)
    expect(checks(found)).toContain('weak-activation')
  })

  it('accepts a trigger list, which is a different phrasing of the same thing', () => {
    // Regression: the first version of this check demanded the words when/use/if, and so
    // rejected a real skill in this repository whose description lists `Trigger:` phrases.
    const found = inspect(
      model({
        skills: [
          skill({
            description:
              'Show the measured impact as a compact scoreboard, from the benchmark medians. Trigger: /gain, "show impact", "what does it save".',
          }),
        ],
      }),
      FACTS,
    )
    expect(checks(found)).not.toContain('weak-activation')
  })

  it('accepts a description that says when to reach for it', () => {
    const found = inspect(model({ skills: [skill()] }), FACTS)
    expect(checks(found)).not.toContain('weak-activation')
  })
})

describe('two nodes that disagree', () => {
  const long =
    'Always reach for the standard library before adding a dependency to this repository.'

  it('reports the same body appearing twice, naming the other one', () => {
    const found = inspect(
      model({ rules: [rule({ name: 'one', body: long }), rule({ name: 'two', body: long })] }),
      FACTS,
    )
    const dupes = found.filter((f) => f.check === 'duplicate-body')
    // One finding for the group, not one per member.
    expect(dupes).toHaveLength(1)
    expect(dupes[0]?.where).toBe('rules/one')
    expect(dupes[0]?.message).toContain('rules/two')
  })

  it('reports a large duplicate group once, not once per member', () => {
    const body = 'Always reach for the standard library before adding a dependency here.'
    const found = inspect(
      model({ rules: Array.from({ length: 28 }, (_, i) => rule({ name: `r${i}`, body })) }),
      FACTS,
    )
    const dupes = found.filter((f) => f.check === 'duplicate-body')
    expect(dupes).toHaveLength(1)
    expect(dupes[0]?.message).toContain('and 23 more')
    expect(dupes[0]?.message.length).toBeLessThan(120)
  })

  it('ignores two short bodies that merely resemble each other', () => {
    const found = inspect(
      model({ rules: [rule({ name: 'one', body: 'Use tabs.' }), rule({ name: 'two', body: 'Use tabs.' })] }),
      FACTS,
    )
    expect(checks(found)).not.toContain('duplicate-body')
  })

  it('reports opposite directives about the same subject in overlapping scopes', () => {
    const found = inspect(
      model({
        rules: [
          rule({ name: 'a', body: 'Always use barrel exports in this package.' }),
          rule({ name: 'b', body: 'Never use barrel exports; they defeat tree shaking.' }),
        ],
      }),
      FACTS,
    )
    const f = found.find((x) => x.check === 'contradiction')
    expect(f?.message).toContain('barrel')
    expect(f?.message).toContain('rules/b')
  })

  it('sees overlapping globs that are not string-identical', () => {
    const found = inspect(
      model({
        rules: [
          rule({ name: 'a', globs: ['src/**'], body: 'Always use barrel exports here.' }),
          rule({ name: 'b', globs: ['src/**/*.ts'], body: 'Never use barrel exports here.' }),
        ],
      }),
      FACTS,
    )
    expect(checks(found)).toContain('contradiction')
  })

  it('reports a rule that disagrees with many others once, not once per pair', () => {
    const found = inspect(
      model({
        rules: [
          rule({ name: 'a', body: 'Never use barrel exports anywhere.' }),
          ...Array.from({ length: 20 }, (_, i) =>
            rule({ name: `b${i}`, body: `Always use barrel exports in module${i}.` }),
          ),
        ],
      }),
      FACTS,
    )
    const c = found.filter((f) => f.check === 'contradiction')
    expect(c).toHaveLength(1)
    expect(c[0]?.message).toContain('and 17 more')
  })

  it('stays quiet when the two rules cannot both apply', () => {
    const found = inspect(
      model({
        rules: [
          rule({ name: 'a', globs: ['src/**'], body: 'Always use barrel exports here.' }),
          rule({ name: 'b', globs: ['docs/**'], body: 'Never use barrel exports here.' }),
        ],
      }),
      FACTS,
    )
    expect(checks(found)).not.toContain('contradiction')
  })

  it('does not treat a shared common noun as a shared subject', () => {
    // Both mention "directory" with opposing polarity and have nothing to do with each other.
    // This pair is from this repository, and an earlier version accused it of contradicting.
    const found = inspect(
      model({
        rules: [
          rule({ name: 'a', body: 'Do not point them at the same directory.' }),
          rule({ name: 'b', body: 'Use a real temporary directory rather than mocking the filesystem.' }),
        ],
      }),
      FACTS,
    )
    expect(checks(found)).not.toContain('contradiction')
  })

  it('stays quiet when both rules agree', () => {
    const found = inspect(
      model({
        rules: [
          rule({ name: 'a', body: 'Always use barrel exports in this package.' }),
          rule({ name: 'b', body: 'Always use barrel exports, for consistency.' }),
        ],
      }),
      FACTS,
    )
    expect(checks(found)).not.toContain('contradiction')
  })
})

describe('nodes that are not rules or skills', () => {
  it('checks agents, which were invisible to every check at first', () => {
    const found = inspect(
      model({ agents: [{ name: 'reviewer', description: 'x', tools: [], archetype: 'any', targets: ['cursor'], body: 'Review it.' } as never] }),
      FACTS,
    )
    const f = found.find((x) => x.check === 'never-compiles')
    expect(f?.where).toBe('agents/reviewer')
  })

  it('checks commands too', () => {
    const found = inspect(
      model({ commands: [{ name: 'ship', description: 'x', args: [], body: '  ' } as never] }),
      FACTS,
    )
    expect(found.find((x) => x.check === 'empty-body')?.where).toBe('commands/ship')
  })
})

describe('inputs the caller did not fill in', () => {
  it('says nothing about targets when none were supplied, rather than condemning every node', () => {
    // An empty target list means "not told", not "compiles nowhere". This used to report a
    // never-compiles error on every node, reading "Restricted to none".
    const found = inspect(model({ rules: [rule()] }), { files: ['src/index.ts'], targets: [] })
    expect(checks(found)).not.toContain('never-compiles')
  })
})

describe('the report itself', () => {
  it('is ordered by severity, so the things that do not work come first', () => {
    const found = inspect(
      model({
        rules: [
          rule({ name: 'vague', globs: ['nope/**'] }),
          rule({ name: 'broken', body: '' }),
        ],
      }),
      FACTS,
    )
    expect(found[0]?.severity).toBe('error')
  })

  it('is stable across runs, so a diff shows changes rather than reshuffling', () => {
    const m = model({
      rules: [rule({ name: 'b', body: '' }), rule({ name: 'a', globs: ['nope/**'] })],
    })
    expect(inspect(m, FACTS)).toEqual(inspect(m, FACTS))
  })

  it('finds nothing to say about a model that is fine', () => {
    const found = inspect(
      model({
        rules: [rule({ globs: ['src/**'], body: 'Never import from dist; it is generated.' })],
        skills: [skill()],
      }),
      FACTS,
    )
    expect(found).toEqual([])
  })
})
