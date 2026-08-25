/**
 * `ctxmux map` — the token-budgeted repository map.
 *
 * The budget is the contract. An unbudgeted map is worse than no map: it displaces the actual
 * task from the context window, and nothing about the output says that it did.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mapCommand } from '../src/commands/map.js'
import { argv, initGit, makeRepo, removeRepo, runCli, runCliExpectingThrow } from './helpers.js'

let root: string

beforeEach(async () => {
  root = await makeRepo({
    'package.json': JSON.stringify({ name: 'fixture', packageManager: 'pnpm@9.0.0' }),
    'src/dates.ts': [
      '/** Format a date for display in the UI. */',
      'export function formatDate(d: Date): string {',
      '  return d.toISOString()',
      '}',
      '',
    ].join('\n'),
    'src/currency.ts': [
      '/** Format a currency amount for display. */',
      'export function formatCurrency(n: number): string {',
      '  return n.toFixed(2)',
      '}',
      '',
    ].join('\n'),
    'src/hooks/useCart.ts': 'export function useCart() { return null }\n',
    'docs/readme.md': 'unrelated prose\n',
  })
})
afterEach(() => removeRepo(root))

describe('map', () => {
  it('ranks the file that matches the task above the ones that do not', async () => {
    const { code, text } = await runCli(mapCommand, argv(root, 'map add a date formatting helper'))

    expect(code).toBe(0)
    expect(text).toContain('src/dates.ts')
    expect(text).toContain('formatDate')
    // Ranked, not dumped: the match comes before the unrelated file.
    expect(text.indexOf('src/dates.ts')).toBeLessThan(
      text.indexOf('src/currency.ts') === -1 ? Infinity : text.indexOf('src/currency.ts'),
    )
  })

  it('finds declarations by wildcard', async () => {
    const { code, text } = await runCli(mapCommand, argv(root, 'map --symbols use*'))

    expect(code).toBe(0)
    expect(text).toContain('useCart')
  })

  it('reports what it indexed and what it left out', async () => {
    // Truncation must never be silent — an omitted match is the thing the user needed.
    const { text } = await runCli(mapCommand, argv(root, 'map format'))

    expect(text).toContain('file(s) indexed')
    expect(text).toContain('omitted')
    expect(text).toContain('budget')
  })

  it('stays inside the budget it was given', async () => {
    const { text } = await runCli(mapCommand, argv(root, 'map format --budget 200'))

    const reported = /~(\d+) tokens of (\d+) budget/.exec(text)
    expect(reported).toBeTruthy()
    expect(Number(reported![1])).toBeLessThanOrEqual(Number(reported![2]))
  })

  it('prints the toolchain under --profile', async () => {
    const { code, text } = await runCli(mapCommand, argv(root, 'map --profile'))

    expect(code).toBe(0)
    expect(text).toContain('Project toolchain')
    expect(text).toContain('pnpm')
  })

  it('says what to type when given nothing to search for', async () => {
    const { code, text } = await runCli(mapCommand, argv(root, 'map'))

    expect(code).toBe(1)
    expect(text).toContain('Nothing to search for')
    expect(text).toContain('ctxmux map')
  })

  it('refuses a budget that is not a number rather than ignoring it', async () => {
    const err = await runCliExpectingThrow(mapCommand, argv(root, 'map format --budget abc'))
    expect(err.message).toMatch(/must be a number/)
  })

  it('says when there is no git history to rank with', async () => {
    // Recency and co-change are a large part of the ranking, so their absence is worth stating
    // rather than quietly producing a worse map.
    const { text } = await runCli(mapCommand, argv(root, 'map format'))

    expect(text).toContain('No git history available')
  })

  it('uses git history when there is some', async () => {
    await initGit(root)

    const { code, text } = await runCli(mapCommand, argv(root, 'map format --no-cache'))

    expect(code).toBe(0)
    expect(text).not.toContain('No git history available')
  })
})
