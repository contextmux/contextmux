import { describe, expect, it } from 'vitest'
import { renderPrompt } from '../src/prompt.js'
import { ClaudeAgent } from '../src/index.js'
import { fakeTask, runAgentContract, type TaskSpec } from '@contextmux/core'
import type { ContextModel } from '@contextmux/context'

const context: ContextModel = {
  instructions: { body: 'Use strict TypeScript everywhere.' },
  rules: [
    { name: 'scope', description: 'Stay in scope', globs: [], alwaysApply: true, priority: 80, body: 'Change only what is needed.' },
    { name: 'graphql', description: 'GraphQL rules', globs: ['src/graphql/**'], alwaysApply: false, priority: 50, body: 'Co-locate resolvers.' },
  ],
  skills: [
    { name: 'currency-formatting', description: 'Use when formatting currency values.', globs: [], resources: [], body: 'Use Intl.NumberFormat.' },
    { name: 'database-migrations', description: 'Use when writing a database migration.', globs: [], resources: [], body: 'Always write a down migration.' },
  ],
  agents: [],
  commands: [],
  mcp: [],
}

describe('task rendering', () => {
  it('leads with the task and its acceptance criteria', () => {
    const out = renderPrompt({ task: fakeTask() })
    expect(out).toContain('# Task: Add a currency formatting helper')
    expect(out).toContain('## Acceptance criteria')
    expect(out).toContain('A helper formats a number and currency code')
  })

  it('states scope as an enforced constraint, not a polite request', () => {
    const task = fakeTask({ scope: { allow: ['src/**'], deny: ['src/legacy/**'], maxFiles: 3 } })
    const out = renderPrompt({ task })
    expect(out).toContain('You may modify only')
    expect(out).toContain('`src/**`')
    expect(out).toContain('must not modify')
    expect(out).toContain('at most 3 file(s)')
    // Telling the agent the boundary is checked is what makes staying inside it the cheap option.
    expect(out).toContain('checked automatically')
  })

  it('omits the scope section entirely when there are no boundaries', () => {
    expect(renderPrompt({ task: fakeTask() })).not.toContain('## Scope')
  })

  it('includes the quality gate commands', () => {
    const out = renderPrompt({ task: fakeTask({ qualityGate: ['pnpm test', 'pnpm lint'] }) })
    expect(out).toContain('pnpm test')
    expect(out).toContain('pnpm lint')
  })

  it('always states the working agreement', () => {
    const out = renderPrompt({ task: fakeTask() })
    expect(out).toContain('Do not ask for confirmation')
    expect(out).toContain('your implementation is wrong')
  })
})

describe('context selection', () => {
  it('includes project instructions and always-apply rules', () => {
    const out = renderPrompt({ task: fakeTask(), context })
    expect(out).toContain('Use strict TypeScript everywhere.')
    expect(out).toContain('Change only what is needed.')
  })

  it('selects only skills relevant to the task', () => {
    // A wall of unrelated guidance costs tokens and dilutes attention.
    const out = renderPrompt({ task: fakeTask(), context })
    expect(out).toContain('Use Intl.NumberFormat')
    expect(out).not.toContain('Always write a down migration')
  })

  it('caps how many skills are included', () => {
    const many: ContextModel = {
      ...context,
      skills: Array.from({ length: 10 }, (_, i) => ({
        name: `currency-skill-${i}`,
        description: 'Use when formatting currency values.',
        globs: [],
        resources: [],
        body: `SKILL_BODY_${i}`,
      })),
    }
    const out = renderPrompt({ task: fakeTask(), context: many, maxSkills: 2 })
    const included = Array.from({ length: 10 }).filter((_, i) => out.includes(`SKILL_BODY_${i}`))
    expect(included).toHaveLength(2)
  })

  it('keeps all rules when the task declares no scope, rather than dropping guidance', () => {
    const out = renderPrompt({ task: fakeTask(), context })
    expect(out).toContain('Co-locate resolvers.')
  })

  it('works with no context at all', () => {
    expect(() => renderPrompt({ task: fakeTask() })).not.toThrow()
  })
})

describe('revision rounds', () => {
  it('leads with the feedback so the correction is the first thing read', () => {
    const out = renderPrompt({
      task: fakeTask(),
      feedback: { round: 2, source: 'verify-gates', body: 'You changed package.json.' },
    })
    expect(out.indexOf('# Revision round 2')).toBeLessThan(out.indexOf('# Task:'))
    expect(out).toContain('You changed package.json.')
  })

  it('tells the agent not to undo work that was not criticised', () => {
    const out = renderPrompt({
      task: fakeTask(),
      feedback: { round: 1, source: 'reviewer', body: 'fix X' },
    })
    expect(out).toContain('do not revert')
  })

  it('renders per-file review comments', () => {
    const out = renderPrompt({
      task: fakeTask(),
      feedback: {
        round: 1,
        source: 'reviewer',
        body: 'see comments',
        items: [{ file: 'src/a.ts', line: 12, body: 'use the shared helper' }],
      },
    })
    expect(out).toContain('src/a.ts:12 — use the shared helper')
  })
})

describe('ClaudeAgent contract', () => {
  runAgentContract(
    { it, expect: expect as never },
    {
      // A binary that does not exist, so the contract exercises the failure path without
      // spending a token. An adapter must report that cleanly rather than throwing.
      setup: () => ({ agent: new ClaudeAgent({ bin: 'definitely-not-claude-xyz' }) }),
    },
  )
})

describe('embedded documents', () => {
  const headings = (text: string) => text.split('\n').filter((l) => /^#{1,6} /.test(l))

  /** A context carrying one instructions body, everything else empty. */
  const withInstructions = (body: string): ContextModel => ({
    instructions: { body },
    rules: [],
    skills: [],
    agents: [],
    commands: [],
    mcp: [],
  })

  it('files a document below the heading it was filed under', () => {
    /*
     * Instructions, rules and skills are written as standalone files, so each opens with its
     * own `#` title. Dropped in verbatim that title outranks the task's — the agent reads a
     * document whose most prominent heading is "Project conventions" rather than the thing it
     * was asked to do, and the section boundaries stop meaning anything.
     */
    const prompt = renderPrompt({
      task: fakeTask(),
      context: withInstructions('# House rules\n\n## Style\n\nTabs.'),
    })

    // Exactly one H1, and it is the task.
    expect(headings(prompt).filter((h) => /^# /.test(h))).toHaveLength(1)
    expect(prompt).toContain('### House rules')
    expect(prompt).toContain('#### Style')
  })

  it('leaves a # inside a fenced block alone', () => {
    // A `#` at the start of a line in a code block is a shell comment, not a heading.
    const prompt = renderPrompt({
      task: fakeTask(),
      context: withInstructions('# Setup\n\n```bash\n# install first\npnpm install\n```'),
    })

    expect(prompt).toContain('# install first')
    expect(prompt).not.toContain('#### install first')
  })

  it('does not push a heading past level six', () => {
    const prompt = renderPrompt({
      task: fakeTask(),
      context: withInstructions('###### Already deep\n\nText.'),
    })

    expect(prompt).toContain('###### Already deep')
    expect(prompt).not.toContain('####### ')
  })

  it('demotes a rule and a skill body too', () => {
    const prompt = renderPrompt({ task: fakeTask(), context })

    expect(headings(prompt).filter((h) => /^# /.test(h))).toHaveLength(1)
  })
})

describe('choosing which skills to include', () => {
  const picked = (task: TaskSpec, skills: ContextModel['skills']) => {
    const prompt = renderPrompt({ task, context: { ...context, skills } })
    return [...prompt.matchAll(/^### ([a-z-]+)$/gm)].map((m) => m[1])
  }

  const skill = (name: string, description: string, body = 'Body.') => ({
    name,
    description,
    globs: [],
    resources: [],
    body,
  })

  it('does not let a verbose description crowd out a precise one', () => {
    /*
     * The score was a raw count of matching terms, so a skill won by describing itself at
     * length. A pack whose skills each run to eight hundred characters displaced the
     * repository's own three-line skills on every task, whatever the task was.
     */
    const precise = skill('currency', 'Use when formatting currency values.')
    const verbose = skill(
      'everything',
      'Use for any coding task at all: writing code, adding code, changing code, refactoring ' +
        'code, fixing code, reviewing code, designing code, formatting values, currency, ' +
        'numbers, dates, tests, builds, dependencies, abstractions and anything else.',
    )

    const order = picked(fakeTask({ title: 'Format a currency value' }), [verbose, precise])
    expect(order[0]).toBe('currency')
  })

  it('matches whole words, not substrings', () => {
    // `code` used to hit inside `encoded` and `decoder`, so nearly everything scored.
    const decoder = skill('decoding', 'Use when working with an encoded payload or a decoder.')

    expect(picked(fakeTask({ title: 'Write clean code', body: 'Keep it tidy.' }), [decoder]))
      .not.toContain('decoding')
  })

  it('still includes a skill the task genuinely names', () => {
    const migrations = skill('migrations', 'Use when writing a database migration.')

    expect(picked(fakeTask({ title: 'Add a database migration for orders' }), [migrations]))
      .toContain('migrations')
  })
})

describe('attachments the agent cannot open', () => {
  it('names them and says plainly that they are unreadable', () => {
    /*
     * The body arrives carrying `![screenshot.png](attachment:abc)`, because discarding a
     * screenshot would discard the specification — for UI work the picture is frequently the
     * whole requirement. But the link needs Jira credentials the agent does not have, so an
     * unexplained dangling reference invites it to imagine what the picture showed.
     */
    const task = fakeTask({
      title: 'Throw-in button stays active after a foul throw-in',
      body: 'Expected behaviour:\n\nThe button is inactive.\n\n![shot.png](attachment:abc123)',
      attachments: [{ name: 'image-20260818-145555.png', url: 'https://jira/attachment/abc123' }],
    })

    const prompt = renderPrompt({ task })

    expect(prompt).toContain('image-20260818-145555.png')
    expect(prompt).toContain('cannot see')
    expect(prompt).toContain('Do not guess at what they show')
  })

  it('says nothing about attachments when there are none', () => {
    // A section that appears on every task is a section the agent learns to skip.
    const prompt = renderPrompt({ task: fakeTask({ body: 'A perfectly ordinary task body.' }) })
    expect(prompt).not.toContain('Attachments')
  })
})

describe('an artefact for an agent that reads the repository itself', () => {
  const heavy = () => ({
    instructions: { name: 'instructions', body: '# House style\n\n' + 'Prose about conventions. '.repeat(2_000) },
    rules: Array.from({ length: 12 }, (_, i) => ({
      name: `rule-${i}`,
      description: `Rule ${i}`,
      globs: ['src/**'],
      body: '# A rule\n\n' + 'Detailed guidance. '.repeat(1_000),
    })),
    skills: [],
    agents: [],
    mcp: { servers: [] },
  })

  it('points a delegated agent at the files instead of inlining them', () => {
    /*
     * Copilot's coding agent works inside a checkout and honours
     * `.github/copilot-instructions.md` and `.github/instructions/**`, which contextmux
     * compiled for it. Inlining them again duplicated what it already had — and on a real
     * board produced a 151,604-character artefact against GitHub's 65,536 issue-body limit, so
     * the run would have failed at the create call, after preflight reported everything fine.
     */
    const context = heavy() as never
    const task = fakeTask({ scope: { allow: ['src/**'], deny: [] } })

    const driven = renderPrompt({ task, context, audience: 'driven' })
    const delegated = renderPrompt({ task, context, audience: 'delegated' })

    expect(driven.length).toBeGreaterThan(65_536)
    expect(delegated.length).toBeLessThan(65_536)
    expect(delegated).toContain('.github/copilot-instructions.md')
    expect(delegated).toContain('.github/instructions/')
  })

  it('still carries the task, its criteria and its scope', () => {
    // What is dropped is the part the agent can read for itself. The task cannot be read from
    // anywhere else.
    const task = fakeTask({
      title: 'Throw-in button stays active',
      acceptanceCriteria: [{ text: 'the button is inactive once resolved' }],
      scope: { allow: ['apps/ssc/**'], deny: [] },
    })

    const delegated = renderPrompt({ task, context: heavy() as never, audience: 'delegated' })

    expect(delegated).toContain('Throw-in button stays active')
    expect(delegated).toContain('the button is inactive once resolved')
    expect(delegated).toContain('apps/ssc/**')
  })

  it('defaults to inlining, because a driven agent has nothing else', () => {
    const context = heavy() as never
    expect(renderPrompt({ task: fakeTask(), context })).toContain('House style')
  })
})

describe('who runs the checks', () => {
  const task = () =>
    fakeTask({ qualityGate: ['pnpm run typecheck', 'pnpm run lint'] })

  it('asks a driven agent to verify, because it can', () => {
    const prompt = renderPrompt({ task: task(), audience: 'driven' })
    expect(prompt).toContain('Run these and fix every failure')
    expect(prompt).toContain('pnpm run typecheck')
  })

  it('tells a delegated agent not to, because it cannot', () => {
    /*
     * On a real ticket this instruction cost about twenty of thirty-six turns. The agent tried
     * pnpm, then npm, then hunted for a vitest binary, then tried to install twice — against a
     * private registry its sandbox has no credentials for and no route to. It had made the
     * correct change by turn fifteen.
     */
    const prompt = renderPrompt({ task: task(), audience: 'delegated' })

    expect(prompt).not.toContain('Run these and fix every failure')
    expect(prompt).toContain('Do not install dependencies')
    // The commands still appear, so the agent knows what it will be judged against.
    expect(prompt).toContain('pnpm run typecheck')
    expect(prompt).toContain('run for you once you finish')
  })

  it('bounds the search for a way around a failure, for either kind', () => {
    // The expensive failure is not one command failing, it is the seven escalating attempts
    // to get around it.
    for (const audience of ['driven', 'delegated'] as const) {
      const prompt = renderPrompt({ task: task(), audience })
      expect(prompt, audience).toContain('Try at most twice')
      expect(prompt, audience).toContain('Do not reach for a different package')
    }
  })

  it('says nothing about checks when the task has none', () => {
    const prompt = renderPrompt({ task: fakeTask({ qualityGate: [] }), audience: 'delegated' })
    expect(prompt).not.toContain('Verification happens outside')
    expect(prompt).not.toContain('Before you finish')
  })
})
