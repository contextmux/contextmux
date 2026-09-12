import { describe, expect, it } from 'vitest'
import {
  buildPrompt,
  cacheKey,
  criteriaFor,
  critique,
  parseFindings,
  RUBRIC_VERSION,
  type Judge,
  type Suggestion,
} from '@contextmux/council'
import type { ContextModel, Rule } from '@contextmux/context'

const CONTEXT = { targets: ['claude', 'copilot'] as const, sampleFiles: ['src/index.ts'] }

function rule(over: Partial<Rule> = {}): Rule {
  return { name: 'a', globs: [], alwaysApply: false, priority: 50, body: 'Always return early.', ...over } as Rule
}
function model(over: Partial<ContextModel> = {}): ContextModel {
  return { rules: [], skills: [], agents: [], commands: [], mcp: [], ...over } as ContextModel
}

/** A judge that returns whatever it was handed, and records what it was asked. */
function fake(answer: string): Judge & { prompts: string[] } {
  const prompts: string[] = []
  return { id: 'fake', prompts, ask: async (p) => (prompts.push(p), answer) }
}

const ONE = JSON.stringify({
  findings: [{ where: 'rules/a', criterion: 'actionable', message: 'Describes without instructing.', fix: 'Say what to do.' }],
})

describe('depth', () => {
  it('asks nothing at all at the static depth, where there is no judge to pay', async () => {
    const judge = fake(ONE)
    const r = await critique(model({ rules: [rule()] }), judge, { depth: 'static', context: CONTEXT })

    expect(r.findings).toEqual([])
    expect(judge.prompts).toHaveLength(0)
  })

  it('puts fewer questions to a single judge than to a panel', () => {
    expect(criteriaFor('single').length).toBeLessThan(criteriaFor('panel').length)
    expect(criteriaFor('static')).toEqual([])
  })

  it('only asks a panel the questions that need one', () => {
    const single = criteriaFor('single').map((c) => c.id)
    expect(single).not.toContain('grounded')
    expect(criteriaFor('panel').map((c) => c.id)).toContain('grounded')
  })
})

describe('asking', () => {
  it('sends every rule in one request rather than one each', async () => {
    const judge = fake('{"findings":[]}')
    await critique(
      model({ rules: [rule({ name: 'a' }), rule({ name: 'b' }), rule({ name: 'c' })] }),
      judge,
      { depth: 'single', context: CONTEXT },
    )

    expect(judge.prompts).toHaveLength(1)
    for (const n of ['rules/a', 'rules/b', 'rules/c']) expect(judge.prompts[0]).toContain(n)
  })

  it('does not ask when there is nothing to ask about', async () => {
    const judge = fake(ONE)
    const r = await critique(model(), judge, { depth: 'single', context: CONTEXT })

    expect(judge.prompts).toHaveLength(0)
    expect(r.asked).toBe(0)
  })

  it('tells the judge that saying nothing is a correct answer', () => {
    const p = buildPrompt([{ where: 'rules/a', body: 'x' }], criteriaFor('single'), CONTEXT)
    expect(p).toContain('Reporting nothing is a correct answer')
  })
})

describe('the cache', () => {
  it('does not re-ask about a body it has already judged', async () => {
    const cache = new Map<string, Suggestion[]>()
    const m = model({ rules: [rule()] })
    const first = fake(ONE)
    await critique(m, first, { depth: 'single', context: CONTEXT, cache })

    const second = fake(ONE)
    const r = await critique(m, second, { depth: 'single', context: CONTEXT, cache })

    expect(second.prompts).toHaveLength(0)
    expect(r.reused).toBe(1)
    expect(r.findings).toHaveLength(1)
  })

  it('remembers that a rule was fine, so clean rules stop costing anything', async () => {
    const cache = new Map<string, Suggestion[]>()
    const m = model({ rules: [rule()] })
    await critique(m, fake('{"findings":[]}'), { depth: 'single', context: CONTEXT, cache })

    const again = fake('{"findings":[]}')
    const r = await critique(m, again, { depth: 'single', context: CONTEXT, cache })

    expect(again.prompts).toHaveLength(0)
    expect(r.reused).toBe(1)
  })

  it('asks again when the body changed, and not when only the name did', async () => {
    const cache = new Map<string, Suggestion[]>()
    await critique(model({ rules: [rule({ name: 'a' })] }), fake(ONE), { depth: 'single', context: CONTEXT, cache })

    const renamed = fake('{"findings":[]}')
    await critique(model({ rules: [rule({ name: 'renamed' })] }), renamed, { depth: 'single', context: CONTEXT, cache })
    expect(renamed.prompts).toHaveLength(0)

    const edited = fake('{"findings":[]}')
    await critique(model({ rules: [rule({ body: 'Something else entirely.' })] }), edited, { depth: 'single', context: CONTEXT, cache })
    expect(edited.prompts).toHaveLength(1)
  })

  it('invalidates on a rubric change, so old answers cannot outlive the question', () => {
    expect(cacheKey('body', 'single')).toContain(RUBRIC_VERSION)
    expect(cacheKey('body', 'single')).not.toBe(cacheKey('body', 'panel'))
  })
})

describe('reading the answer', () => {
  const known = new Set(['rules/a'])

  it('finds the json inside a fenced block', () => {
    const out = parseFindings('Sure:\n```json\n' + ONE + '\n```\nHope that helps.', known)
    expect(out).toHaveLength(1)
    expect(out[0]?.where).toBe('rules/a')
  })

  it('survives an answer that is not json at all', () => {
    expect(parseFindings('I could not do that.', known)).toEqual([])
  })

  it('survives json that is broken', () => {
    expect(parseFindings('{"findings":[{"where":', known)).toEqual([])
  })

  it('drops a finding about a rule that was never sent, rather than inventing one', () => {
    const invented = JSON.stringify({
      findings: [{ where: 'rules/ghost', criterion: 'actionable', message: 'm', fix: 'f' }],
    })
    expect(parseFindings(invented, known)).toEqual([])
  })

  it('drops a finding with nothing to act on', () => {
    const partial = JSON.stringify({ findings: [{ where: 'rules/a', message: 'm' }] })
    expect(parseFindings(partial, known)).toEqual([])
  })

  it('is not confused by an unbalanced brace inside a string', () => {
    // A balanced `{x}` proves nothing: a scanner that ignores strings still reaches depth zero
    // in the same place. A lone `{` is what separates the two.
    const tricky = '{"findings":[{"where":"rules/a","criterion":"c","message":"a { alone","fix":"f"}]}'
    expect(parseFindings(tricky, known)[0]?.message).toBe('a { alone')
  })

  it('is not confused by a brace that closes early inside a string', () => {
    const tricky = '{"findings":[{"where":"rules/a","criterion":"c","message":"a } alone","fix":"f"}]}'
    expect(parseFindings(tricky, known)[0]?.message).toBe('a } alone')
  })

  it('marks everything a judge says as a suggestion, never an error', () => {
    // A model's opinion is not the same kind of fact as "this compiles to nothing".
    expect(parseFindings(ONE, known).every((f) => f.severity === 'suggestion')).toBe(true)
  })
})
