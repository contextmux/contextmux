import { describe, expect, it } from 'vitest'
import {
  buildPersonaPrompt,
  generate,
  parseProposals,
  PERSONAS,
  synthesise,
  type Judge,
  type Persona,
  type Proposal,
} from '@contextmux/council'

const FACTS = {
  packageManager: 'pnpm',
  languages: ['typescript'],
  frameworks: ['vitest'],
  qualityGate: ['pnpm test'],
  isMonorepo: true,
  sampleFiles: ['packages/core/src/index.ts'],
}

function rules(...bodies: { name: string; body: string }[]): string {
  return JSON.stringify({ rules: bodies.map((b) => ({ ...b, description: 'd', globs: [] })) })
}

/** Answers per persona id, so each voice can be given a different reply. */
function fake(byPersona: Record<string, string>, fallback = '{"rules":[]}'): Judge & { asked: string[] } {
  const asked: string[] = []
  return {
    id: 'fake',
    asked,
    async ask(prompt: string) {
      const who = PERSONAS.find((p) => prompt.startsWith(p.stance))
      asked.push(who?.id ?? 'unknown')
      return byPersona[who?.id ?? ''] ?? fallback
    },
  }
}

const proposal = (over: Partial<Proposal> = {}): Proposal => ({
  name: 'a', description: 'd', globs: [], body: 'Never edit generated output by hand.', from: ['reviewer'], ...over,
})

describe('asking the personas', () => {
  it('asks every voice, and asks them at the same time', async () => {
    const judge = fake({})
    await generate(FACTS, judge)

    expect(judge.asked.sort()).toEqual(PERSONAS.map((p) => p.id).sort())
  })

  it('gives each voice its own standing rather than one shared prompt', () => {
    const prompts = PERSONAS.map((p) => buildPersonaPrompt(p, FACTS))
    expect(new Set(prompts).size).toBe(PERSONAS.length)
  })

  it('tells every voice that proposing nothing is allowed', () => {
    for (const p of PERSONAS) {
      expect(buildPersonaPrompt(p, FACTS)).toContain('nothing worth saying')
    }
  })

  it('describes the repository it is writing rules for', () => {
    const p = buildPersonaPrompt(PERSONAS[0] as Persona, FACTS)
    expect(p).toContain('pnpm')
    expect(p).toContain('packages/core/src/index.ts')
    expect(p).toContain('monorepo')
  })

  it('survives one voice failing, and says which', async () => {
    const judge: Judge = {
      id: 'flaky',
      async ask(prompt) {
        if (prompt.startsWith(PERSONAS[0]!.stance)) throw new Error('rate limited')
        return rules({ name: 'x', body: 'Never edit generated output by hand.' })
      },
    }
    const out = await generate(FACTS, judge)

    expect(out.proposals.length).toBeGreaterThan(0)
    expect(out.silent.find((s) => s.persona === PERSONAS[0]!.id)?.reason).toContain('rate limited')
  })
})

describe('synthesis', () => {
  it('ranks what several voices reached independently above what one did', () => {
    const shared = 'Never edit generated output by hand; it is overwritten.'
    const out = synthesise(
      [
        // Named so that alphabetical order disagrees with support order — otherwise this
        // passes whether or not support is what ranks them.
        proposal({ name: 'aaa-solo', body: 'Always run the linter before pushing anything.', from: ['newcomer'] }),
        proposal({ name: 'zzz-agreed', body: shared, from: ['reviewer'] }),
        proposal({ name: 'zzz-agreed', body: shared + ' Regenerate instead.', from: ['maintainer'] }),
      ],
      8,
    )

    expect(out[0]?.name).toBe('zzz-agreed')
    expect(out[0]?.from).toEqual(['maintainer', 'reviewer'])
  })

  it('keeps the more specific wording when two voices agree', () => {
    const out = synthesise(
      [
        proposal({ body: 'Never edit generated output by hand.', from: ['a'] }),
        proposal({ body: 'Never edit generated output by hand; regenerate it from source.', from: ['b'] }),
      ],
      8,
    )

    expect(out).toHaveLength(1)
    expect(out[0]?.body).toContain('regenerate it from source')
  })

  it('does not merge two rules that share one phrase but say different things', () => {
    const out = synthesise(
      [
        proposal({ name: 'one', body: 'Never edit the generated files by hand.', from: ['a'] }),
        proposal({ name: 'two', body: 'Always run the generated files check in CI.', from: ['b'] }),
      ],
      8,
    )

    expect(out).toHaveLength(2)
  })

  it('does not merge two rules that merely share a common word', () => {
    const out = synthesise(
      [
        proposal({ name: 'one', body: 'Never edit the generated directory.', from: ['a'] }),
        proposal({ name: 'two', body: 'Always use a temporary directory in tests.', from: ['b'] }),
      ],
      8,
    )

    expect(out).toHaveLength(2)
  })

  it('caps how many it returns, keeping the best supported', () => {
    // Genuinely unrelated bodies. An earlier version of this used a shared sentence frame, and
    // every one of them merged into a single group — which was the fixture's fault, not the
    // code's, but it hid whether the cap worked at all.
    const subjects = [
      'Never commit lockfile changes without running install first.',
      'Always regenerate the schema after editing the migration.',
      'Prefer the workspace protocol when adding an internal package.',
      'Do not import from a dist directory; use the source entry point.',
      'Run typecheck before opening a pull request here.',
      'Keep fixtures beside the test that uses them.',
      'Name environment variables with the CTXMUX prefix.',
      'Avoid top-level await in files the bundler processes.',
    ]
    const many = subjects.map((body, i) => proposal({ name: `r${i}`, body, from: ['a'] }))
    expect(synthesise(many, 5)).toHaveLength(5)
    expect(synthesise(many, 20)).toHaveLength(subjects.length)
  })

  it('orders the same input the same way twice', () => {
    const input = [proposal({ name: 'b' }), proposal({ name: 'a', body: 'Always run the linter first.' })]
    expect(synthesise(input, 8)).toEqual(synthesise(input, 8))
  })
})

describe('reading a proposal', () => {
  it('turns a title into a filename slug', () => {
    const out = parseProposals(JSON.stringify({ rules: [{ name: 'Do Not Edit Generated!', body: 'b' }] }), 'x')
    expect(out[0]?.name).toBe('do-not-edit-generated')
  })

  it('drops a rule with no body to act on', () => {
    expect(parseProposals(JSON.stringify({ rules: [{ name: 'a' }] }), 'x')).toEqual([])
  })

  it('drops a name that slugs to nothing', () => {
    expect(parseProposals(JSON.stringify({ rules: [{ name: '!!!', body: 'b' }] }), 'x')).toEqual([])
  })

  it('ignores globs that are not strings rather than failing', () => {
    const out = parseProposals(JSON.stringify({ rules: [{ name: 'a', body: 'b', globs: ['src/**', 7, null] }] }), 'x')
    expect(out[0]?.globs).toEqual(['src/**'])
  })

  it('survives an answer that is prose', () => {
    expect(parseProposals('I would suggest keeping things simple.', 'x')).toEqual([])
  })

  it('records which voice proposed it', () => {
    const out = parseProposals(rules({ name: 'a', body: 'Some instruction.' }), 'minimalist')
    expect(out[0]?.from).toEqual(['minimalist'])
  })
})
