/**
 * `ctxmux import` — build a canonical source from the agent config a repo already has.
 *
 * Adoption is the whole battle here. Nobody hand-authors `.ctxmux/` to try a tool, so what
 * this command does with a messy existing setup decides whether the tool gets used at all.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { importCommand } from '../src/commands/import.js'
import { argv, exists, list, makeRepo, read, removeRepo, runCli, writeAll } from './helpers.js'

let root: string
beforeEach(async () => {
  root = await makeRepo()
})
afterEach(() => removeRepo(root))

describe('import', () => {
  it('pulls instructions, rules, skills and commands into one place', async () => {
    await writeAll(root, {
      'CLAUDE.md': '# House rules\n\nAlways run the tests.\n',
      '.github/instructions/api.instructions.md':
        '---\napplyTo: "src/api/**"\ndescription: API conventions\n---\n\nUse the shared client.\n',
      '.cursor/rules/010-naming.mdc':
        '---\ndescription: Naming\nglobs: "src/**/*.ts"\n---\n\nUse descriptive names.\n',
      '.claude/skills/write-tests/SKILL.md':
        '---\nname: write-tests\ndescription: How to write tests here\n---\n\nOne assertion per behaviour.\n',
      '.claude/commands/review.md': '---\ndescription: Review a diff\n---\n\nRead the diff.\n',
    })

    const { code, text } = await runCli(importCommand, argv(root, 'import'))

    expect(code).toBe(0)
    expect(await exists(root, '.ctxmux/instructions.md')).toBe(true)
    expect(await list(root, '.ctxmux/rules')).toEqual(['api.md', 'naming.md'])
    expect(await list(root, '.ctxmux/skills')).toEqual(['write-tests'])
    expect(await list(root, '.ctxmux/commands')).toEqual(['review.md'])
    // Provenance is reported, so a reader can see what came from where.
    expect(text).toContain('CLAUDE.md')
  })

  it('keeps both instruction files when two disagree, rather than picking one', async () => {
    /*
     * Guessing a winner here produces context that is subtly wrong in a way nobody notices
     * until an agent does something strange. Both are kept, attributed, and flagged.
     */
    await writeAll(root, {
      'CLAUDE.md': 'Prefer tabs.\n',
      '.github/copilot-instructions.md': 'Prefer spaces.\n',
    })

    const { code, text } = await runCli(importCommand, argv(root, 'import'))
    const merged = await read(root, '.ctxmux/instructions.md')

    expect(code).toBe(0)
    expect(merged).toContain('Prefer tabs.')
    expect(merged).toContain('Prefer spaces.')
    expect(merged).toContain('imported from CLAUDE.md')
    expect(text).toContain('merged 2 instruction files')
  })

  it('does not re-import its own generated output', async () => {
    // Otherwise import and sync form a loop that grows the file on every pass.
    await writeAll(root, {
      'CLAUDE.md': '<!-- ctxmux:begin ctxmux:hash=abcdef123456 -->\n\nGenerated.\n\n<!-- ctxmux:end -->\n',
    })

    const { code, text } = await runCli(importCommand, argv(root, 'import'))

    expect(code).toBe(1)
    expect(text).toContain('contextmux-generated')
  })

  it('writes nothing under --dry-run', async () => {
    await writeAll(root, { 'CLAUDE.md': 'Rules.\n' })

    const { code, text } = await runCli(importCommand, argv(root, 'import --dry-run'))

    expect(code).toBe(0)
    expect(text).toContain('would be written')
    expect(await exists(root, '.ctxmux/instructions.md')).toBe(false)
  })

  it('never overwrites a canonical source that is already there', async () => {
    await writeAll(root, {
      'CLAUDE.md': 'From Claude.\n',
      '.ctxmux/instructions.md': 'MINE\n',
    })

    const { code, text } = await runCli(importCommand, argv(root, 'import'))

    expect(code).toBe(0)
    expect(await read(root, '.ctxmux/instructions.md')).toBe('MINE\n')
    expect(text).toContain('already existed')
  })

  it('says what to do instead when there is nothing to import', async () => {
    const { code, text } = await runCli(importCommand, argv(root, 'import'))

    expect(code).toBe(1)
    expect(text).toContain('no existing agent configuration')
    expect(text).toContain('ctxmux init')
  })

  it('reports a rule it had to skip rather than dropping it silently', async () => {
    // Two sources slugging to one name: the writer would skip the second with nothing said.
    await writeAll(root, {
      '.github/instructions/api.instructions.md': '---\napplyTo: "**"\n---\n\nFirst.\n',
      '.github/instructions/api.md': '---\napplyTo: "**"\n---\n\nSecond.\n',
    })

    const { code, text } = await runCli(importCommand, argv(root, 'import'))

    expect(code).toBe(0)
    expect(text).toContain('was already imported')
    expect(await list(root, '.ctxmux/rules')).toEqual(['api.md'])
  })

  it('marks every imported MCP server read-only, and says why', async () => {
    await writeAll(root, {
      '.mcp.json': JSON.stringify({ mcpServers: { db: { command: './bin/db-mcp' } } }),
    })

    const { code, text } = await runCli(importCommand, argv(root, 'import'))
    const mcp = JSON.parse(await read(root, '.ctxmux/mcp.json')) as {
      servers: Record<string, { readOnly: boolean }>
    }

    expect(code).toBe(0)
    expect(mcp.servers['db']?.readOnly).toBe(true)
    expect(text).toContain('should not hold write-capable tools')
  })
})
