/**
 * Loader, importer and sync exercised against a real temporary repository.
 *
 * These are the tests that would have caught the duplication and false-drift bugs, so they
 * use the filesystem rather than mocks: the failure modes live in the interaction between
 * compile, write and re-read, not in any one of them.
 */
import { promises as fs } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ContextError, importContext, loadContext, parseFrontmatter, sync, writeImport } from '../src/index.js'

let dir: string

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ctxmux-test-'))
})
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true })
})

async function write(rel: string, content: string): Promise<void> {
  const abs = path.join(dir, rel)
  await fs.mkdir(path.dirname(abs), { recursive: true })
  await fs.writeFile(abs, content, 'utf8')
}

async function read(rel: string): Promise<string> {
  return fs.readFile(path.join(dir, rel), 'utf8')
}

async function exists(rel: string): Promise<boolean> {
  return fs.access(path.join(dir, rel)).then(() => true).catch(() => false)
}

describe('loader', () => {
  it('explains what to do when there is no source directory', async () => {
    await expect(loadContext({ root: dir })).rejects.toThrow(/ctxmux init|ctxmux import/)
  })

  it('collects every validation error in one pass', async () => {
    await write('.ctxmux/skills/a/SKILL.md', '---\nname: a\n---\nbody') // missing description
    await write('.ctxmux/skills/b/SKILL.md', '---\nname: b\n---\nbody') // missing description
    const err = await loadContext({ root: dir }).catch((e) => e as ContextError)
    expect(err).toBeInstanceOf(ContextError)
    expect((err as ContextError).diagnostics.length).toBeGreaterThanOrEqual(2)
  })

  it('rejects unknown frontmatter keys so typos surface immediately', async () => {
    await write('.ctxmux/rules/r.md', '---\nname: r\nglob: "src/**"\n---\nbody')
    await expect(loadContext({ root: dir })).rejects.toThrow(/glob/)
  })

  it('discovers bundled skill resources instead of requiring them to be declared', async () => {
    await write('.ctxmux/skills/s/SKILL.md', '---\nname: s\ndescription: A skill.\n---\nbody')
    await write('.ctxmux/skills/s/references/notes.md', 'notes')
    const ctx = await loadContext({ root: dir })
    expect(ctx.model.skills[0]?.resources).toEqual(['references/notes.md'])
  })

  it('warns about a skill directory with no SKILL.md rather than failing', async () => {
    await write('.ctxmux/instructions.md', 'hi')
    await fs.mkdir(path.join(dir, '.ctxmux/skills/empty'), { recursive: true })
    const ctx = await loadContext({ root: dir })
    expect(ctx.warnings.some((w) => w.message.includes('no SKILL.md'))).toBe(true)
  })

  it('accepts both mcp.json dialects', async () => {
    await write('.ctxmux/instructions.md', 'hi')
    await write('.ctxmux/mcp.json', JSON.stringify({ mcpServers: { a: { command: 'x' } } }))
    const ctx = await loadContext({ root: dir })
    expect(ctx.model.mcp[0]?.name).toBe('a')
  })
})

describe('sync', () => {
  beforeEach(async () => {
    await write('.ctxmux/instructions.md', 'Project conventions here.')
    await write(
      '.ctxmux/skills/reuse/SKILL.md',
      '---\nname: reuse\ndescription: Search before writing.\n---\nLook first.',
    )
  })

  it('is idempotent: a second sync changes nothing', async () => {
    await sync({ root: dir })
    const second = await sync({ root: dir })
    expect(second.hasChanges).toBe(false)
  })

  it('does not grow block-owned files on repeated syncs', async () => {
    // The duplication bug: a begin marker carrying a hash was never matched, so each sync
    // prepended a fresh block and the file doubled every time.
    await sync({ root: dir })
    const once = await read('CLAUDE.md')
    await sync({ root: dir })
    await sync({ root: dir })
    expect(await read('CLAUDE.md')).toBe(once)
    expect((await read('CLAUDE.md')).match(/ctxmux:begin/g)?.length).toBe(1)
  })

  it('propagates a change in the canonical source rather than calling it drift', async () => {
    await sync({ root: dir })
    await write('.ctxmux/instructions.md', 'Completely new conventions.')
    const report = await sync({ root: dir })
    expect(report.hasDrift).toBe(false)
    expect(await read('CLAUDE.md')).toContain('Completely new conventions')
  })

  it('preserves user content outside the managed block', async () => {
    await sync({ root: dir })
    await fs.appendFile(path.join(dir, 'CLAUDE.md'), '\n## My notes\n\nKeep me.\n')
    await write('.ctxmux/instructions.md', 'Changed.')
    await sync({ root: dir })
    expect(await read('CLAUDE.md')).toContain('Keep me.')
    expect(await read('CLAUDE.md')).toContain('Changed.')
  })

  it('refuses to overwrite an edit inside the managed block', async () => {
    await sync({ root: dir })
    const tampered = (await read('CLAUDE.md')).replace('Project conventions here.', 'Tampered.')
    await fs.writeFile(path.join(dir, 'CLAUDE.md'), tampered)
    await write('.ctxmux/instructions.md', 'Changed.')
    const report = await sync({ root: dir })
    expect(report.hasDrift).toBe(true)
    expect(await read('CLAUDE.md')).toContain('Tampered.')
  })

  it('overwrites a hand-edited block only with force', async () => {
    await sync({ root: dir })
    const tampered = (await read('CLAUDE.md')).replace('Project conventions here.', 'Tampered.')
    await fs.writeFile(path.join(dir, 'CLAUDE.md'), tampered)
    await write('.ctxmux/instructions.md', 'Changed.')
    const report = await sync({ root: dir, force: true })
    expect(report.records.some((r) => r.status === 'forced')).toBe(true)
    expect(await read('CLAUDE.md')).not.toContain('Tampered.')
  })

  it('writes nothing in dry-run mode', async () => {
    const report = await sync({ root: dir, dryRun: true })
    expect(report.hasChanges).toBe(true)
    expect(await exists('CLAUDE.md')).toBe(false)
  })

  it('respects an explicit target list', async () => {
    await sync({ root: dir, targets: ['claude'] })
    expect(await exists('CLAUDE.md')).toBe(true)
    expect(await exists('AGENTS.md')).toBe(false)
  })

  it('fails loudly when two nodes claim the same output path', async () => {
    // A skill and a command with the same name both compile to a Copilot prompt file.
    await write('.ctxmux/commands/reuse.md', '---\nname: reuse\ndescription: A command.\n---\nDo it.')
    await expect(sync({ root: dir, targets: ['copilot'] })).rejects.toThrow(/same output path/)
  })
})

describe('import', () => {
  it('reverse-engineers a canonical model from existing agent config', async () => {
    await write('CLAUDE.md', '# Conventions\n\nBe careful.')
    await write(
      '.github/instructions/ts.instructions.md',
      '---\napplyTo: "**/*.ts"\ndescription: TypeScript rules\n---\nUse strict types.',
    )
    await write(
      '.claude/skills/reuse/SKILL.md',
      '---\nname: reuse\ndescription: Search first.\n---\nLook before writing.',
    )
    await write('.cursor/rules/010-style.mdc', '---\ndescription: Style\nglobs: "src/**"\n---\nStyle rules.')

    const result = await importContext(dir)
    await writeImport(dir, result)

    const ctx = await loadContext({ root: dir })
    expect(ctx.model.instructions?.body).toContain('Be careful.')
    expect(ctx.model.rules.map((r) => r.name).sort()).toEqual(['style', 'ts'])
    expect(ctx.model.skills[0]?.description).toBe('Search first.')
    expect(ctx.model.rules.find((r) => r.name === 'ts')?.globs).toEqual(['**/*.ts'])
  })

  it('keeps both sources when instructions conflict, and flags them', async () => {
    await write('CLAUDE.md', 'Claude says A.')
    await write('.github/copilot-instructions.md', 'Copilot says B.')
    const result = await importContext(dir)
    const instr = result.files.find((f) => f.path.endsWith('instructions.md'))
    expect(instr?.content).toContain('Claude says A.')
    expect(instr?.content).toContain('Copilot says B.')
    expect(result.diagnostics.some((d) => d.message.includes('merged'))).toBe(true)
  })

  it('does not re-import its own generated output', async () => {
    await write('.ctxmux/instructions.md', 'Canonical source.')
    await sync({ root: dir })
    const result = await importContext(dir, '.ctxmux-2')
    const instr = result.files.find((f) => f.path.endsWith('instructions.md'))
    expect(instr).toBeUndefined()
    expect(result.diagnostics.some((d) => d.message.includes('contextmux-generated'))).toBe(true)
  })

  it('marks imported MCP servers read-only and says so', async () => {
    await write('.mcp.json', JSON.stringify({ mcpServers: { db: { command: 'db-server' } } }))
    const result = await importContext(dir)
    const mcp = result.files.find((f) => f.path.endsWith('mcp.json'))
    expect(mcp?.content).toContain('"readOnly": true')
    expect(result.diagnostics.some((d) => d.hint?.includes('untrusted'))).toBe(true)
  })

  it('never overwrites existing canonical source', async () => {
    await write('.ctxmux/instructions.md', 'Mine, hand written.')
    await write('CLAUDE.md', 'Imported content.')
    const result = await importContext(dir)
    await writeImport(dir, result)
    expect(await read('.ctxmux/instructions.md')).toBe('Mine, hand written.')
  })

  it('round-trips: import then sync reproduces equivalent content', async () => {
    await write(
      '.claude/skills/reuse/SKILL.md',
      '---\nname: reuse\ndescription: Search first.\n---\nLook before writing.',
    )
    const result = await importContext(dir)
    await writeImport(dir, result)
    await sync({ root: dir, targets: ['claude'] })
    const out = await read('.claude/skills/reuse/SKILL.md')
    expect(out).toContain('Search first.')
    expect(out).toContain('Look before writing.')
  })
})

describe('frontmatter survives provenance', () => {
  it('keeps YAML frontmatter on line 1 in every generated file', async () => {
    // Frontmatter is only frontmatter when it opens the file. A provenance comment placed
    // above it turns the block into plain text, and each target silently loses the metadata
    // it carries: Copilot's applyTo scoping, Cursor's globs, a skill's activation description.
    await write('.ctxmux/instructions.md', 'Conventions.')
    await write(
      '.ctxmux/rules/ts.md',
      '---\nname: ts\ndescription: TypeScript rules\nglobs: ["**/*.ts"]\n---\nUse strict types.',
    )
    await write(
      '.ctxmux/skills/reuse/SKILL.md',
      '---\nname: reuse\ndescription: Search before writing.\n---\nLook first.',
    )
    await sync({ root: dir })

    const generated = [
      '.github/instructions/ts.instructions.md',
      '.cursor/rules/skill-reuse.mdc',
      '.claude/skills/reuse/SKILL.md',
    ]
    for (const rel of generated) {
      const content = await read(rel)
      expect(content.startsWith('---\n'), `${rel} must open with frontmatter`).toBe(true)
      expect(content, `${rel} must still record provenance`).toContain('ctxmux:hash=')
    }
  })

  it('parses the generated frontmatter back to the values the target relies on', async () => {
    await write(
      '.ctxmux/rules/ts.md',
      '---\nname: ts\ndescription: TypeScript rules\nglobs: ["**/*.ts"]\n---\nUse strict types.',
    )
    await sync({ root: dir, targets: ['copilot'] })
    const { data } = parseFrontmatter(await read('.github/instructions/ts.instructions.md'))
    expect(data['applyTo']).toBe('**/*.ts')
    expect(data['description']).toBe('TypeScript rules')
  })

  it('still detects drift in a file whose provenance follows frontmatter', async () => {
    await write(
      '.ctxmux/rules/ts.md',
      '---\nname: ts\ndescription: R\nglobs: ["**/*.ts"]\n---\nOriginal body.',
    )
    await sync({ root: dir, targets: ['copilot'] })
    const p = '.github/instructions/ts.instructions.md'
    expect((await sync({ root: dir, targets: ['copilot'] })).hasChanges).toBe(false)

    await fs.writeFile(
      path.join(dir, p),
      (await read(p)).replace('Original body.', 'Tampered body.'),
    )
    await write(
      '.ctxmux/rules/ts.md',
      '---\nname: ts\ndescription: R\nglobs: ["**/*.ts"]\n---\nUpdated body.',
    )
    const report = await sync({ root: dir, targets: ['copilot'] })
    expect(report.hasDrift).toBe(true)
    expect(await read(p)).toContain('Tampered body.')
  })
})

describe('import produces source that sync can actually consume', () => {
  it('accepts a comma-separated tool list, which is how Claude writes it', async () => {
    // Regression: import emitted `tools` verbatim as a string while the schema demanded an
    // array, so `ctxmux import && ctxmux sync` — the entire onboarding path — failed on any repo
    // with a skill that declared tools.
    await write(
      '.claude/skills/api-testing/SKILL.md',
      '---\nname: api-testing\ndescription: Use for API tests.\nallowed-tools: Bash, Read, Grep\n---\nUse the fixtures.',
    )
    await writeImport(dir, await importContext(dir))
    const ctx = await loadContext({ root: dir })
    expect(ctx.model.skills[0]?.tools).toEqual(['Bash', 'Read', 'Grep'])
    await expect(sync({ root: dir })).resolves.toBeTruthy()
  })

  it('survives a repo carrying config for three agents at once', async () => {
    await write('CLAUDE.md', 'Prefer composition over inheritance.')
    await write('.github/copilot-instructions.md', 'Avoid any types.')
    await write(
      '.github/instructions/graphql.instructions.md',
      '---\napplyTo: "src/graphql/**/*.ts"\ndescription: GraphQL conventions\n---\nCo-locate resolvers.',
    )
    await write(
      '.claude/agents/perf.md',
      '---\nname: perf\ndescription: Reviews performance.\ntools: Read, Grep\nmodel: sonnet\n---\nLook for N+1 queries.',
    )
    await write(
      '.cursor/rules/010-style.mdc',
      '---\ndescription: Style\nglobs: src/**/*.ts\n---\nNamed exports only.',
    )

    await writeImport(dir, await importContext(dir))
    await sync({ root: dir })

    // Every piece of source content must reach every target, or portability is a claim only.
    for (const phrase of [
      'composition over inheritance',
      'Co-locate resolvers',
      'N+1 queries',
      'Named exports only',
    ]) {
      const hits: string[] = []
      for (const rel of [
        'CLAUDE.md',
        'AGENTS.md',
        'src/AGENTS.md',
        'src/graphql/AGENTS.md',
        '.github/copilot-instructions.md',
        '.github/instructions/graphql.instructions.md',
        '.github/instructions/style.instructions.md',
        '.github/agents/perf.agent.md',
        '.cursor/rules/000-project.mdc',
        '.cursor/rules/050-graphql.mdc',
        '.cursor/rules/010-style.mdc',
        '.cursor/rules/agents-reference.mdc',
        '.claude/agents/perf.md',
      ]) {
        if (await exists(rel)) {
          if ((await read(rel)).includes(phrase)) hits.push(rel)
        }
      }
      expect(hits.length, `"${phrase}" reached no target`).toBeGreaterThan(0)
    }
  })

  it('gives Codex real scoping via a nested AGENTS.md when globs share a directory', async () => {
    await write(
      '.github/instructions/api.instructions.md',
      '---\napplyTo: "src/api/**"\ndescription: API rules\n---\nValidate at the boundary.',
    )
    await writeImport(dir, await importContext(dir))
    await sync({ root: dir, targets: ['codex'] })
    expect(await read('src/api/AGENTS.md')).toContain('Validate at the boundary.')
  })
})

describe('mcp credentials never leave the file they were in', () => {
  const SECRET = 'ghp_notarealtokenbutlooksliketone'

  it('replaces a literal with a reference on import, and says which key', async () => {
    /*
     * A local `.mcp.json` quite reasonably holds real values — it is one file, on one machine.
     * `.ctxmux/mcp.json` is not: it compiles out to four more, one of them a document
     * written to be read in a pull request. Importing a literal verbatim turned one secret
     * into five copies, silently.
     */
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ctxmux-mcp-'))
    try {
      await fs.writeFile(
        path.join(dir, '.mcp.json'),
        JSON.stringify({
          mcpServers: { gh: { command: 'gh-mcp', env: { GITHUB_TOKEN: SECRET, REGION: '${AWS_REGION}' } } },
        }),
        'utf8',
      )

      const result = await importContext(dir)
      const mcp = result.files.find((f) => f.path.endsWith('mcp.json'))!

      expect(mcp.content).not.toContain(SECRET)
      expect(mcp.content).toContain('${GITHUB_TOKEN}')
      // A reference that was already a reference is left exactly as it was.
      expect(mcp.content).toContain('${AWS_REGION}')

      const said = result.diagnostics.map((d) => `${d.message} ${d.hint ?? ''}`).join('\n')
      expect(said).toContain('GITHUB_TOKEN')
      // Naming the value would put it in the terminal and the CI log as well.
      expect(said).not.toContain(SECRET)
    } finally {
      await fs.rm(dir, { recursive: true, force: true })
    }
  })

  it('warns on load when one is already there, rather than compiling it out silently', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ctxmux-mcp-'))
    try {
      await fs.mkdir(path.join(dir, '.ctxmux'), { recursive: true })
      await fs.writeFile(path.join(dir, '.ctxmux', 'instructions.md'), 'Be careful.\n', 'utf8')
      await fs.writeFile(
        path.join(dir, '.ctxmux', 'mcp.json'),
        JSON.stringify({
          servers: { gh: { transport: 'stdio', command: 'gh-mcp', env: { GITHUB_TOKEN: SECRET } } },
        }),
        'utf8',
      )

      const report = await sync({ root: dir, dryRun: true })
      const warnings = report.context.warnings.map((w) => `${w.message} ${w.hint ?? ''}`).join('\n')

      expect(warnings).toContain('GITHUB_TOKEN')
      expect(warnings).not.toContain(SECRET)
    } finally {
      await fs.rm(dir, { recursive: true, force: true })
    }
  })
})
