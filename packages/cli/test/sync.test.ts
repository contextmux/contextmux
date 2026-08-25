/**
 * `ctxmux sync` and `ctxmux check`.
 *
 * `check` is designed to be wired into CI, where the exit code is the entire contract — so the
 * codes are asserted as carefully as the output.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { checkCommand, parseTargets, syncCommand } from '../src/commands/sync.js'
import {
  argv,
  exists,
  makeRepo,
  MINIMAL_CONTEXT,
  read,
  removeRepo,
  runCli,
  writeAll,
} from './helpers.js'

/** A fully-owned generated file: contextmux writes all of it, so drift protection applies. */
const RULE_FILE = '.github/instructions/scope.instructions.md'

let root: string
beforeEach(async () => {
  root = await makeRepo(MINIMAL_CONTEXT)
})
afterEach(() => removeRepo(root))

describe('sync', () => {
  it('compiles the canonical source out to every target', async () => {
    const { code } = await runCli(syncCommand, argv(root, 'sync'))

    expect(code).toBe(0)
    expect(await exists(root, 'CLAUDE.md')).toBe(true)
    expect(await exists(root, 'AGENTS.md')).toBe(true)
    expect(await exists(root, '.github/copilot-instructions.md')).toBe(true)
    expect(await exists(root, '.cursor/rules')).toBe(true)
  })

  it('writes nothing under --dry-run', async () => {
    const { code, text } = await runCli(syncCommand, argv(root, 'sync --dry-run'))

    expect(code).toBe(0)
    expect(text).toContain('Plan')
    expect(await exists(root, 'CLAUDE.md')).toBe(false)
  })

  it('is a no-op the second time', async () => {
    await runCli(syncCommand, argv(root, 'sync'))
    const { code, text } = await runCli(syncCommand, argv(root, 'sync'))

    expect(code).toBe(0)
    expect(text).toContain('already up to date')
  })

  it('compiles only the targets asked for', async () => {
    const { code } = await runCli(syncCommand, argv(root, 'sync --targets claude'))

    expect(code).toBe(0)
    expect(await exists(root, 'CLAUDE.md')).toBe(true)
    expect(await exists(root, 'AGENTS.md')).toBe(false)
  })

  it('keeps what a person wrote outside the managed block', async () => {
    await runCli(syncCommand, argv(root, 'sync'))
    const claude = await read(root, 'CLAUDE.md')
    await writeAll(root, { 'CLAUDE.md': claude + '\n## My own section\n\nHand written.\n' })

    const { code } = await runCli(syncCommand, argv(root, 'sync'))

    expect(code).toBe(0)
    expect(await read(root, 'CLAUDE.md')).toContain('Hand written.')
  })

  it('refuses to overwrite a hand-edited generated file, and exits 2', async () => {
    /*
     * The exit code matters: a `sync` in CI that quietly discarded somebody's edits would be
     * indistinguishable from one that had nothing to do.
     */
    await runCli(syncCommand, argv(root, 'sync'))
    await writeAll(root, { [RULE_FILE]: 'edited by hand\n' })

    const { code, text } = await runCli(syncCommand, argv(root, 'sync'))

    expect(code).toBe(2)
    expect(text).toContain('hand-edited')
    expect(await read(root, RULE_FILE)).toBe('edited by hand\n')
  })

  it('discards them when --force says to, and says which', async () => {
    await runCli(syncCommand, argv(root, 'sync'))
    await writeAll(root, { [RULE_FILE]: 'edited by hand\n' })

    const { code } = await runCli(syncCommand, argv(root, 'sync --force'))

    expect(code).toBe(0)
    expect(await read(root, RULE_FILE)).not.toBe('edited by hand\n')
  })

  it('leaves a file it did not write alone, even with no provenance to compare', async () => {
    /*
     * `detectDrift` has nothing to compare against when a file carries no provenance, and that
     * used to fall straight through to an overwrite — so a hand-written prompt file was
     * destroyed the first time a skill happened to share its name. The report called it an
     * `update`, which is exactly what it looks like when the file really was ours.
     */
    await writeAll(root, { [RULE_FILE]: 'mine, written by hand, never generated\n' })

    const { code, text } = await runCli(syncCommand, argv(root, 'sync'))

    expect(code).toBe(2)
    expect(await read(root, RULE_FILE)).toBe('mine, written by hand, never generated\n')
    expect(text).toContain('hand-edited')
  })

  it('merges into a co-owned file rather than replacing it', async () => {
    // Block-owned files — CLAUDE.md, AGENTS.md, copilot-instructions.md — are the ones a person
    // legitimately shares with us, so an existing one is wrapped, not refused.
    await writeAll(root, { '.github/copilot-instructions.md': 'Notes I wrote earlier.\n' })

    const { code } = await runCli(syncCommand, argv(root, 'sync'))
    const after = await read(root, '.github/copilot-instructions.md')

    expect(code).toBe(0)
    expect(after).toContain('Notes I wrote earlier.')
    expect(after).toContain('ctxmux:begin')
  })

  it('prints what each target loses under --explain', async () => {
    const { text } = await runCli(syncCommand, argv(root, 'sync --explain'))

    expect(text).toContain('Fidelity')
    // Codex has no skill mechanism, so something must be reported as degraded or dropped.
    expect(text).toMatch(/degraded|dropped|full fidelity/)
  })
})

describe('check', () => {
  it('exits 1 when the generated files are out of date', async () => {
    const { code, text } = await runCli(checkCommand, argv(root, 'check'))

    expect(code).toBe(1)
    expect(text).toContain('out of date')
    expect(text).toContain('ctxmux sync')
  })

  it('exits 0 once they are in sync', async () => {
    await runCli(syncCommand, argv(root, 'sync'))

    const { code, text } = await runCli(checkCommand, argv(root, 'check'))

    expect(code).toBe(0)
    expect(text).toContain('in sync')
  })

  it('exits 2 on a hand-edited file, distinct from merely being stale', async () => {
    await runCli(syncCommand, argv(root, 'sync'))
    await writeAll(root, { [RULE_FILE]: 'edited\n' })

    const { code, text } = await runCli(checkCommand, argv(root, 'check'))

    expect(code).toBe(2)
    expect(text).toContain('edited by hand')
  })

  it('refuses to vouch for anything when provenance is switched off', async () => {
    // Without provenance there is no way to detect drift, so `check` cannot guarantee what it
    // exists to guarantee. Passing anyway would be the lie.
    await writeAll(root, { '.ctxmux/config.json': JSON.stringify({ provenance: false }) })
    await runCli(syncCommand, argv(root, 'sync'))

    const { code, text } = await runCli(checkCommand, argv(root, 'check --strict'))

    expect(code).toBe(1)
    expect(text).toContain('provenance is disabled')
  })
})

describe('target names', () => {
  it('accepts the known targets', () => {
    expect(parseTargets('claude,cursor')).toEqual(['claude', 'cursor'])
    expect(parseTargets(undefined)).toBeUndefined()
  })

  it('rejects an unknown one by name', () => {
    expect(() => parseTargets('claude,windsurf')).toThrow(/windsurf/)
  })
})
