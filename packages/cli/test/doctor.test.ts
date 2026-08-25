/**
 * `ctxmux doctor` — make silent failures loud.
 *
 * Every check here corresponds to something that otherwise fails with no error at all, so the
 * test for each one is: does it actually say something when that condition holds.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { doctorCommand } from '../src/commands/doctor.js'
import { syncCommand } from '../src/commands/sync.js'
import {
  argv,
  makeRepo,
  MINIMAL_CONTEXT,
  removeRepo,
  runCli,
  writeAll,
} from './helpers.js'

let root: string
afterEach(() => removeRepo(root))

const PACKAGE_JSON = JSON.stringify({
  name: 'fixture',
  packageManager: 'pnpm@9.0.0',
  scripts: { test: 'vitest run' },
})

describe('doctor', () => {
  beforeEach(async () => {
    root = await makeRepo({ ...MINIMAL_CONTEXT, 'package.json': PACKAGE_JSON })
  })

  it('fails when there is no canonical source at all', async () => {
    const bare = await makeRepo({ 'package.json': PACKAGE_JSON })
    try {
      const { code, text } = await runCli(doctorCommand, argv(bare, 'doctor'))

      expect(code).toBe(1)
      expect(text).toContain('canonical source')
      expect(text).toContain('ctxmux import')
    } finally {
      await removeRepo(bare)
    }
  })

  it('warns that generated files are out of date, without failing', async () => {
    // Stale is a chore; hand-edited is a problem. They are reported differently on purpose.
    const { code, text } = await runCli(doctorCommand, argv(root, 'doctor'))

    expect(code).toBe(0)
    expect(text).toContain('out of date')
    expect(text).toContain('ctxmux sync')
  })

  it('fails when a generated file has been edited by hand', async () => {
    await runCli(syncCommand, argv(root, 'sync'))
    await writeAll(root, { '.github/instructions/scope.instructions.md': 'edited\n' })

    const { code, text } = await runCli(doctorCommand, argv(root, 'doctor'))

    expect(code).toBe(1)
    expect(text).toContain('hand-edited')
  })

  it('passes once everything is in sync', async () => {
    await runCli(syncCommand, argv(root, 'sync'))

    const { code, text } = await runCli(doctorCommand, argv(root, 'doctor'))

    expect(code).toBe(0)
    expect(text).toContain('all in sync')
  })

  it('reports the toolchain it found', async () => {
    const { text } = await runCli(doctorCommand, argv(root, 'doctor'))

    expect(text).toContain('pnpm@9.0.0')
    expect(text).toContain('pnpm run test')
  })

  it('warns when there is no way for an agent to check its own work', async () => {
    const noScripts = await makeRepo({
      ...MINIMAL_CONTEXT,
      'package.json': JSON.stringify({ name: 'x' }),
    })
    try {
      const { text } = await runCli(doctorCommand, argv(noScripts, 'doctor'))

      expect(text).toContain('quality gate')
      expect(text).toContain('verify their own work')
    } finally {
      await removeRepo(noScripts)
    }
  })

  it('warns about an MCP server that can write', async () => {
    /*
     * The reason this check exists: an agent acting on text somebody else wrote — an issue, a
     * ticket — holding a tool that can change things is the whole prompt-injection surface.
     */
    await writeAll(root, {
      '.ctxmux/mcp.json': JSON.stringify({
        servers: { db: { transport: 'stdio', command: 'db-mcp', readOnly: false } },
      }),
    })

    const { text } = await runCli(doctorCommand, argv(root, 'doctor'))

    expect(text).toContain('not read-only')
    expect(text).toContain('untrusted issue or ticket text')
  })

  it('fails on a local MCP command that does not resolve', async () => {
    // The single most common MCP failure, and it surfaces as "the tool just isn't there".
    await writeAll(root, {
      '.ctxmux/mcp.json': JSON.stringify({
        servers: { local: { transport: 'stdio', command: './bin/missing', readOnly: true } },
      }),
    })

    const { code, text } = await runCli(doctorCommand, argv(root, 'doctor'))

    expect(code).toBe(1)
    expect(text).toContain('command not found')
  })

  it('reports which target artefacts are missing', async () => {
    const { text } = await runCli(doctorCommand, argv(root, 'doctor'))

    expect(text).toMatch(/Claude Code\s+\d+ missing/)
  })
})

describe('mcp credentials', () => {
  beforeEach(async () => {
    root = await makeRepo({ ...MINIMAL_CONTEXT, 'package.json': PACKAGE_JSON })
  })

  it('fails on a credential written into the declaration', async () => {
    /*
     * A failure rather than a warning: this file compiles out to four more, one of them a
     * document written to be read in a pull request, so the value does not stay where it was
     * put.
     */
    const secret = 'ghp_notarealtokenbutlooksliketone'
    await writeAll(root, {
      '.ctxmux/mcp.json': JSON.stringify({
        servers: { gh: { transport: 'stdio', command: 'gh-mcp', env: { GITHUB_TOKEN: secret } } },
      }),
    })

    const { code, text } = await runCli(doctorCommand, argv(root, 'doctor'))

    expect(code).toBe(1)
    expect(text).toContain('mcp secrets')
    expect(text).toContain('GITHUB_TOKEN')
    // Printing the value would put it in the terminal and the CI log too.
    expect(text).not.toContain(secret)
  })

  it('passes when the value is referenced rather than written', async () => {
    await writeAll(root, {
      '.ctxmux/mcp.json': JSON.stringify({
        servers: {
          gh: { transport: 'stdio', command: 'gh-mcp', env: { GITHUB_TOKEN: '${GITHUB_TOKEN}' } },
        },
      }),
    })

    const { text } = await runCli(doctorCommand, argv(root, 'doctor'))

    expect(text).toContain('no literal values declared')
  })
})
