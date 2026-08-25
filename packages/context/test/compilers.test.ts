import { describe, expect, it } from 'vitest'
import { COMPILERS, commonDirectory } from '../src/index.js'
import { ContextModelSchema, type LoadedContext } from '../src/schema.js'

function ctx(model: Partial<Parameters<typeof ContextModelSchema.parse>[0]>): LoadedContext {
  return {
    model: ContextModelSchema.parse(model),
    config: { targets: ['claude', 'copilot', 'cursor', 'codex'], sourceDir: '.ctxmux', provenance: true },
    root: '/repo',
    sources: [],
    warnings: [],
  }
}

const SKILL = {
  name: 'find-first',
  description: 'Use before writing a new helper.',
  globs: ['src/**'],
  resources: [],
  body: 'Search before writing.',
}

describe('every compiler', () => {
  const c = ctx({ instructions: { body: 'Be careful.' }, skills: [SKILL] })

  for (const [target, compiler] of Object.entries(COMPILERS)) {
    it(`${target}: emits files with repo-relative paths and non-empty content`, () => {
      const result = compiler.compile(c)
      expect(result.files.length).toBeGreaterThan(0)
      for (const f of result.files) {
        expect(f.path.startsWith('/')).toBe(false)
        expect(f.content.trim().length).toBeGreaterThan(0)
      }
    })

    it(`${target}: accounts for every node type in the fidelity report`, () => {
      const result = compiler.compile(c)
      const kinds = result.fidelity.map((f) => f.nodeType)
      expect(new Set(kinds)).toEqual(
        new Set(['instructions', 'rules', 'skills', 'agents', 'commands', 'mcp']),
      )
    })

    it(`${target}: any non-native representation explains what was lost`, () => {
      const result = compiler.compile(c)
      for (const note of result.fidelity) {
        if (note.fidelity !== 'native' && note.count > 0) {
          expect(note.as, `${target}/${note.nodeType} must say how it is represented`).toBeTruthy()
          expect(note.lost, `${target}/${note.nodeType} must say what is lost`).toBeTruthy()
        }
      }
    })

    it(`${target}: carries the skill description through, since it drives activation`, () => {
      const result = compiler.compile(c)
      const all = result.files.map((f) => f.content).join('\n')
      expect(all).toContain('Use before writing a new helper.')
    })
  }
})

describe('target filtering', () => {
  it('excludes nodes restricted to other targets', () => {
    const c = ctx({ skills: [{ ...SKILL, targets: ['claude'] }] })
    expect(COMPILERS.claude.compile(c).files.some((f) => f.path.includes('find-first'))).toBe(true)
    expect(COMPILERS.cursor.compile(c).files.some((f) => f.path.includes('find-first'))).toBe(false)
  })
})

describe('claude', () => {
  it('gives skills and agents native homes', () => {
    const c = ctx({
      skills: [SKILL],
      agents: [{ name: 'reviewer', description: 'Reviews.', archetype: 'any', body: 'Review it.' }],
    })
    const paths = COMPILERS.claude.compile(c).files.map((f) => f.path)
    expect(paths).toContain('.claude/skills/find-first/SKILL.md')
    expect(paths).toContain('.claude/agents/reviewer.md')
  })

  it('reports rules as degraded when they carry globs, because scoping becomes advisory', () => {
    const c = ctx({ rules: [{ name: 'r', globs: ['src/**'], alwaysApply: false, priority: 50, body: 'x' }] })
    const note = COMPILERS.claude.compile(c).fidelity.find((f) => f.nodeType === 'rules')
    expect(note?.fidelity).toBe('degraded')
  })
})

describe('copilot', () => {
  it('preserves glob scoping natively via applyTo', () => {
    const c = ctx({ rules: [{ name: 'ts', globs: ['**/*.ts'], alwaysApply: false, priority: 50, body: 'x' }] })
    const result = COMPILERS.copilot.compile(c)
    const file = result.files.find((f) => f.path === '.github/instructions/ts.instructions.md')
    expect(file?.content).toContain('applyTo: "**/*.ts"')
    expect(result.fidelity.find((f) => f.nodeType === 'rules')?.fidelity).toBe('native')
  })

  it('documents MCP as manual, since Copilot reads it from repo settings', () => {
    const c = ctx({ mcp: [{ name: 's', transport: 'stdio', command: 'x', args: [], env: {}, readOnly: true }] })
    const result = COMPILERS.copilot.compile(c)
    expect(result.fidelity.find((f) => f.nodeType === 'mcp')?.fidelity).toBe('degraded')
    const file = result.files.find((f) => f.path.includes('copilot-mcp-config'))
    expect(file?.content).toContain('repository settings')
  })

  it('warns when a server is not read-only', () => {
    const c = ctx({ mcp: [{ name: 's', transport: 'stdio', command: 'x', args: [], env: {}, readOnly: false }] })
    const file = COMPILERS.copilot.compile(c).files.find((f) => f.path.includes('copilot-mcp-config'))
    expect(file?.content).toContain('not marked read-only')
  })
})

describe('codex', () => {
  it('uses a nested AGENTS.md when a rule scopes to one directory', () => {
    const c = ctx({ rules: [{ name: 'api', globs: ['src/api/**'], alwaysApply: false, priority: 50, body: 'API rules.' }] })
    const paths = COMPILERS.codex.compile(c).files.map((f) => f.path)
    expect(paths).toContain('src/api/AGENTS.md')
  })

  it('inlines cross-cutting rules in the root file and says scoping was lost', () => {
    const c = ctx({ rules: [{ name: 'tests', globs: ['**/*.test.ts'], alwaysApply: false, priority: 50, body: 'Test rules.' }] })
    const result = COMPILERS.codex.compile(c)
    expect(result.files.map((f) => f.path)).toEqual(['AGENTS.md'])
    expect(result.fidelity.find((f) => f.nodeType === 'rules')?.lost).toContain('cross-cutting')
  })
})

describe('commonDirectory', () => {
  it('finds a shared literal prefix', () => {
    expect(commonDirectory(['src/api/**', 'src/api/*.ts'])).toBe('src/api')
  })
  it('returns null for cross-cutting patterns', () => {
    expect(commonDirectory(['**/*.test.ts'])).toBeNull()
    expect(commonDirectory(['src/a/**', 'src/b/**'])).toBeNull()
    expect(commonDirectory([])).toBeNull()
  })
})

describe('output paths stay inside the repository', () => {
  it('refuses a glob that names an absolute directory', () => {
    /*
     * A rule's globs decide where a nested AGENTS.md is written, so a glob is not only a filter
     * — it is a destination. `/etc/**` produced `/etc/AGENTS.md`, and `sync` is a routine
     * command nobody reads the output of.
     */
    expect(commonDirectory(['/etc/**'])).toBeNull()
    expect(commonDirectory(['C:/Windows/**'])).toBeNull()
  })

  it('refuses a glob that climbs out of the project', () => {
    expect(commonDirectory(['../../etc/**'])).toBeNull()
    expect(commonDirectory(['src/../../../**'])).toBeNull()
    expect(commonDirectory(['..\\..\\x/**'])).toBeNull()
  })

  it('still scopes an ordinary glob', () => {
    expect(commonDirectory(['src/api/**/*.ts'])).toBe('src/api')
    expect(commonDirectory(['src/api/**', 'src/api/*.test.ts'])).toBe('src/api')
    expect(commonDirectory(['src/**', 'test/**'])).toBeNull()
  })
})
