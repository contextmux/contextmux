/**
 * `ctxmux propose`.
 *
 * The property worth defending is that nothing reaches `.ctxmux/` without being asked for, and
 * that nothing a person wrote is ever replaced by something a model guessed.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { renderRule, writeProposals } from '../src/commands/propose.js'
import { exists, list, makeRepo, read, removeRepo, writeAll } from './helpers.js'
import type { Proposal } from '@contextmux/council'

const proposal = (over: Partial<Proposal> = {}): Proposal => ({
  name: 'no-editing-generated',
  description: 'When touching compiled output',
  globs: ['dist/**'],
  body: 'Never edit generated output by hand; change the source and recompile.',
  from: ['reviewer', 'maintainer'],
  ...over,
})

let root: string
beforeEach(async () => {
  root = await makeRepo()
})
afterEach(() => removeRepo(root))

describe('writing', () => {
  it('writes a proposal as a rule file that carries its frontmatter', async () => {
    await writeProposals(root, [proposal()])

    const body = await read(root, '.ctxmux/rules/no-editing-generated.md')
    expect(body).toContain('name: no-editing-generated')
    expect(body).toContain('globs: ["dist/**"]')
    expect(body).toContain('Never edit generated output')
  })

  it('records which voices proposed it, so its origin is not lost', async () => {
    await writeProposals(root, [proposal()])

    expect(await read(root, '.ctxmux/rules/no-editing-generated.md')).toContain(
      'x-ctxmux-proposed-by: reviewer,maintainer',
    )
  })

  it('never replaces a rule somebody already wrote', async () => {
    await writeAll(root, { '.ctxmux/rules/no-editing-generated.md': 'mine, by hand\n' })

    const out = await writeProposals(root, [proposal()])

    expect(out.wrote).toEqual([])
    expect(out.skipped).toHaveLength(1)
    expect(await read(root, '.ctxmux/rules/no-editing-generated.md')).toBe('mine, by hand\n')
  })

  it('writes the ones that do not collide and skips the one that does', async () => {
    await writeAll(root, { '.ctxmux/rules/taken.md': 'mine\n' })

    const out = await writeProposals(root, [proposal({ name: 'taken' }), proposal({ name: 'free' })])

    expect(out.wrote).toEqual(['.ctxmux/rules/free.md'])
    expect(out.skipped).toEqual(['.ctxmux/rules/taken.md'])
  })

  it('creates the rules directory when there is not one yet', async () => {
    expect(await exists(root, '.ctxmux/rules')).toBe(false)
    await writeProposals(root, [proposal()])
    expect(await list(root, '.ctxmux/rules')).toContain('no-editing-generated.md')
  })
})

describe('rendering', () => {
  it('omits frontmatter keys that have nothing in them', () => {
    const out = renderRule(proposal({ description: '', globs: [] }))

    expect(out).not.toContain('description:')
    expect(out).not.toContain('globs:')
    expect(out).toContain('name: no-editing-generated')
  })

  it('quotes a description that would otherwise break the frontmatter', () => {
    const out = renderRule(proposal({ description: 'when: it applies, and "then" some' }))

    expect(out).toContain('description: "when: it applies, and \\"then\\" some"')
  })

  it('ends with exactly one newline, like every other rule file', () => {
    expect(renderRule(proposal({ body: 'A rule.\n\n\n' }))).toMatch(/A rule\.\n$/)
  })
})
