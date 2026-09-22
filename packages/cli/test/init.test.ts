/**
 * `ctxmux init` — scaffold a canonical source.
 *
 * The first command anyone runs, and the one whose failure mode is most annoying: writing over
 * work that is already there.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { initCommand } from '../src/commands/init.js'
import { remainingSetup } from '../src/workflows.js'
import {
  argv,
  exists,
  initGit,
  initGitWithRemote,
  list,
  makeRepo,
  read,
  removeRepo,
  runCli,
  writeAll,
} from './helpers.js'

let root: string
beforeEach(async () => {
  root = await makeRepo({
    'package.json': JSON.stringify({
      name: 'fixture',
      packageManager: 'pnpm@9.0.0',
      scripts: { test: 'vitest run', typecheck: 'tsc -b' },
      devDependencies: { vitest: '^2.0.0', react: '^18.0.0' },
    }),
    'pnpm-lock.yaml': 'lockfileVersion: 9\n',
    'src/index.ts': 'export const x = 1\n',
  })
})
afterEach(() => removeRepo(root))

describe('init', () => {
  it('scaffolds a canonical source that loads', async () => {
    const { code, text } = await runCli(initCommand, argv(root, 'init'))

    expect(code).toBe(0)
    expect(await exists(root, '.ctxmux/instructions.md')).toBe(true)
    expect(await list(root, '.ctxmux/rules')).toContain('scope-discipline.md')
    expect(await list(root, '.ctxmux/skills')).toContain('find-before-writing')
    expect(text).toContain('file(s) written')
  })

  it('writes the toolchain it detected into the instructions', async () => {
    // The whole point of detecting rather than asking: an agent told to run `npm test` in a
    // pnpm workspace fails silently, and that is the single most common way these setups break.
    await runCli(initCommand, argv(root, 'init'))
    const instructions = await read(root, '.ctxmux/instructions.md')

    expect(instructions).toContain('pnpm install --frozen-lockfile')
    expect(instructions).toContain('pnpm@9.0.0')
    // The commands an agent must run before finishing, named as the project names them.
    expect(instructions).toContain('pnpm run typecheck')
    expect(instructions).toContain('pnpm run test')
  })

  it('reports what it detected before writing anything', async () => {
    const { text } = await runCli(initCommand, argv(root, 'init'))

    expect(text).toContain('pnpm@9.0.0')
    expect(text).toContain('React')
  })

  it('refuses to touch an existing .ctxmux/ without being told to', async () => {
    await writeAll(root, { '.ctxmux/instructions.md': 'MINE\n' })

    const { code, text } = await runCli(initCommand, argv(root, 'init'))

    // Already set up is the outcome this command exists to produce, so it is not a failure —
    // exiting 1 broke `ctxmux init && ctxmux run ...`, which is an ordinary thing to write.
    expect(code).toBe(0)
    expect(text).toContain('already set up')
    expect(await read(root, '.ctxmux/instructions.md')).toBe('MINE\n')
  })

  it('fills in what is missing under --force, and still leaves your files alone', async () => {
    await writeAll(root, { '.ctxmux/instructions.md': 'MINE\n' })

    const { code } = await runCli(initCommand, argv(root, 'init --force'))

    expect(code).toBe(0)
    // The one that existed is untouched; the rest arrive.
    expect(await read(root, '.ctxmux/instructions.md')).toBe('MINE\n')
    expect(await exists(root, '.ctxmux/rules/scope-discipline.md')).toBe(true)
  })

  it('says so when there is no quality gate to find', async () => {
    const bare = await makeRepo({ 'package.json': '{"name":"bare"}' })
    try {
      const { code, text } = await runCli(initCommand, argv(bare, 'init'))
      expect(code).toBe(0)
      expect(text).not.toContain('quality gate:')
    } finally {
      await removeRepo(bare)
    }
  })
})

describe('gitignore', () => {
  it('adds the paths contextmux writes while it works', async () => {
    /*
     * Without this the first `ctxmux run` leaves run records full of absolute worktree paths
     * staged for commit, and the person who notices is whoever reviews the pull request.
     */
    await runCli(initCommand, argv(root, 'init'))
    const ignore = await read(root, '.gitignore')

    expect(ignore).toContain('.ctxmux/state/')
    expect(ignore).toContain('.ctxmux/cache/')
  })

  it('appends to a .gitignore that already exists rather than replacing it', async () => {
    await writeAll(root, { '.gitignore': 'node_modules/\ndist/\n' })

    await runCli(initCommand, argv(root, 'init'))
    const ignore = await read(root, '.gitignore')

    expect(ignore).toContain('node_modules/')
    expect(ignore).toContain('dist/')
    expect(ignore).toContain('.ctxmux/state/')
  })

  it('does not stack duplicates when run again', async () => {
    await runCli(initCommand, argv(root, 'init'))
    await runCli(initCommand, argv(root, 'init --force'))

    const ignore = await read(root, '.gitignore')
    expect(ignore.match(/\.ctxmux\/state\//g)).toHaveLength(1)
  })

  it('mentions it in the output only when it changed something', async () => {
    const first = await runCli(initCommand, argv(root, 'init'))
    expect(first.text).toContain('.gitignore')

    const second = await runCli(initCommand, argv(root, 'init --force'))
    expect(second.text).not.toContain('added .ctxmux/state/')
  })
})

describe('workflows', () => {
  it('scaffolds them when there is a remote to run against', async () => {
    /*
     * They used to be example files you copied and edited — the friction `init` exists to
     * remove, and a file that arrived looking configured while carrying `src/**` and a JQL
     * matching a label nobody uses.
     */
    await initGitWithRemote(root)

    const { code } = await runCli(initCommand, argv(root, 'init'))

    expect(code).toBe(0)
    expect(await exists(root, '.github/workflows/ctxmux-run.yml')).toBe(true)
    expect(await exists(root, '.github/workflows/ctxmux-review.yml')).toBe(true)
  })

  it('scaffolds nothing when there is no remote', async () => {
    // Nothing to run a workflow against, so writing one would be clutter.
    const { code } = await runCli(initCommand, argv(root, 'init'))

    expect(code).toBe(0)
    expect(await exists(root, '.github/workflows/ctxmux-run.yml')).toBe(false)
  })

  it('leaves them out when asked', async () => {
    await initGitWithRemote(root)

    await runCli(initCommand, argv(root, 'init --no-workflows'))

    expect(await exists(root, '.github/workflows/ctxmux-run.yml')).toBe(false)
    expect(await exists(root, '.ctxmux/instructions.md')).toBe(true)
  })

  it('arrives inert, so it is a proposal rather than something already running', async () => {
    /*
     * The reason scaffolding these by default is defensible at all: nothing happens until
     * somebody sets a repository variable, so the file is something to read in a diff.
     */
    await initGitWithRemote(root)
    await runCli(initCommand, argv(root, 'init'))

    const workflow = await read(root, '.github/workflows/ctxmux-run.yml')
    expect(workflow).toContain("if: vars.CTXMUX_ENABLED == 'true'")
    expect(workflow).toContain('does nothing until you set')
  })

  it('scaffolds a check workflow that needs no kill switch, because it can only ever report', async () => {
    // Unlike run and review, check spends nothing and writes nothing — gating it the same way
    // would mean the one workflow that can never do harm is also the one nobody has turned on.
    await initGitWithRemote(root)
    await runCli(initCommand, argv(root, 'init'))

    expect(await exists(root, '.github/workflows/ctxmux-check.yml')).toBe(true)
    const workflow = await read(root, '.github/workflows/ctxmux-check.yml')
    expect(workflow).not.toContain('CTXMUX_ENABLED')
    expect(workflow).toContain('command: check')
    expect(workflow).toContain('--strict')
  })

  it('uses the layout it detected rather than a guess', async () => {
    await writeAll(root, {
      'pnpm-workspace.yaml': 'packages:\n  - "packages/*"\n  - "apps/*"\n',
      'packages/api/package.json': '{"name":"@acme/api"}',
      'apps/web/package.json': '{"name":"@acme/web"}',
    })
    await initGitWithRemote(root)

    await runCli(initCommand, argv(root, 'init'))
    const workflow = await read(root, '.github/workflows/ctxmux-run.yml')

    expect(workflow).toContain("allow: 'apps/**,packages/**'")
    expect(workflow).not.toContain("allow: 'src/**")
  })

  it('pairs the two workflows so the review half can find the run', async () => {
    // Getting this wrong is the failure that goes green while doing nothing.
    await initGitWithRemote(root)
    await runCli(initCommand, argv(root, 'init'))

    for (const f of ['ctxmux-run.yml', 'ctxmux-review.yml']) {
      expect(await read(root, `.github/workflows/${f}`), f).toContain("share-state: 'true'")
    }
  })

  it('never overwrites a workflow that is already there', async () => {
    // It carries repository write permissions and a token; that deserves more caution than
    // the generated context files, not less.
    await initGitWithRemote(root)
    await writeAll(root, { '.github/workflows/ctxmux-run.yml': '# mine\n' })

    await runCli(initCommand, argv(root, 'init --force'))

    expect(await read(root, '.github/workflows/ctxmux-run.yml')).toBe('# mine\n')
  })

  it('says what still has to be set up', async () => {
    await initGitWithRemote(root)

    const { text } = await runCli(initCommand, argv(root, 'init'))

    expect(text).toContain('Before the run and review workflows can work')
    expect(text).toContain('CTXMUX_TOKEN')
    expect(text).toContain('CTXMUX_ENABLED')
  })
})

describe('init as the only command you need', () => {
  it('imports the agent config already there, rather than burying it', async () => {
    /*
     * `init` scaffolded and `import` read — two entry points, and a decision the reader had to
     * make before they could start. Choosing wrong put a generic starter pack over their real
     * rules.
     */
    const repo = await makeRepo({
      'package.json': '{"name":"x","packageManager":"pnpm@10.0.0"}',
      '.github/copilot-instructions.md': '# House rules\n\nUse the shared helpers.\n',
    })

    const { text } = await runCli(initCommand, argv(repo, 'init --no-workflows'))

    expect(text).toContain('Imported')
    expect(await read(repo, '.ctxmux/instructions.md')).toContain('Use the shared helpers')
    await removeRepo(repo)
  })

  it('records only the agents the repository actually uses', async () => {
    // Generating CLAUDE.md and AGENTS.md for a Copilot-only team adds files nobody asked for
    // to a repository, from a command they ran to tidy it up.
    const repo = await makeRepo({
      'package.json': '{"name":"x","packageManager":"pnpm@10.0.0"}',
      '.github/copilot-instructions.md': '# House rules\n\nUse the shared helpers.\n',
    })

    await runCli(initCommand, argv(repo, 'init --no-workflows'))

    expect(JSON.parse(await read(repo, '.ctxmux/config.json')).targets).toEqual(['copilot'])
    expect(await exists(repo, 'CLAUDE.md')).toBe(false)
    expect(await exists(repo, 'AGENTS.md')).toBe(false)
    await removeRepo(repo)
  })

  it('compiles, so that finishing means finished', async () => {
    // Leaving this to a second command ended with nothing generated and a repository that
    // looked configured but was not.
    const repo = await makeRepo({ 'package.json': '{"name":"x","packageManager":"pnpm@10.0.0"}' })

    const { text } = await runCli(initCommand, argv(repo, 'init --no-workflows'))

    expect(text).toContain('Compiled to')
    expect(await exists(repo, 'CLAUDE.md')).toBe(true)
    await removeRepo(repo)
  })

  it('writes the agent and tracker so no flag is needed next time', async () => {
    const repo = await makeRepo({ 'package.json': '{"name":"x","packageManager":"pnpm@10.0.0"}' })

    await runCli(initCommand, argv(repo, 'init --no-workflows'))

    const config = JSON.parse(await read(repo, '.ctxmux/config.json'))
    expect(config.agent).toBeTruthy()
    expect(config.tracker).toBeTruthy()
    await removeRepo(repo)
  })

  it('asks nothing when there is nobody to answer', async () => {
    /*
     * Tests have no TTY, and neither does CI. A setup command that blocks on a keystroke
     * nobody is there to press is worse than one that never asked — and it would hang this
     * suite rather than fail it.
     */
    const repo = await makeRepo({ 'package.json': '{"name":"x","packageManager":"pnpm@10.0.0"}' })

    const { code, text } = await runCli(initCommand, argv(repo, 'init --no-workflows'))

    expect(code).toBe(0)
    expect(text).not.toContain('choose')
    await removeRepo(repo)
  })

  it('does not read its own output back in on a forced re-run', async () => {
    // The generated .github/instructions/*.md would import as rules that collide with the
    // rules they were compiled from, and sync fails outright.
    const repo = await makeRepo({ 'package.json': '{"name":"x","packageManager":"pnpm@10.0.0"}' })

    await runCli(initCommand, argv(repo, 'init --no-workflows'))
    const { code } = await runCli(initCommand, argv(repo, 'init --force --no-workflows'))

    expect(code).toBe(0)
    await removeRepo(repo)
  })
})

describe('running init twice', () => {
  it('is not a failure, so it can be chained', async () => {
    /*
     * `ctxmux init && ctxmux run ...` is an ordinary thing to write, and an ordinary thing to
     * run twice. Exiting 1 the second time broke the chain over a repository that was already
     * in exactly the state the command exists to produce. `git init` says so and exits 0.
     */
    const repo = await makeRepo({ 'package.json': '{"name":"x","packageManager":"pnpm@10.0.0"}' })

    const first = await runCli(initCommand, argv(repo, 'init --no-workflows'))
    const second = await runCli(initCommand, argv(repo, 'init --no-workflows'))

    expect(first.code).toBe(0)
    expect(second.code).toBe(0)
    expect(second.text).toContain('already set up')
    await removeRepo(repo)
  })

  it('still leaves what is there alone', async () => {
    // Idempotent means "does nothing", not "does it again".
    const repo = await makeRepo({ 'package.json': '{"name":"x","packageManager":"pnpm@10.0.0"}' })
    await runCli(initCommand, argv(repo, 'init --no-workflows'))
    await writeAll(repo, { '.ctxmux/instructions.md': 'MINE\n' })

    await runCli(initCommand, argv(repo, 'init --no-workflows'))

    expect(await read(repo, '.ctxmux/instructions.md')).toBe('MINE\n')
    await removeRepo(repo)
  })
})

/**
 * `init --advise`, and the automatic review on the import path.
 *
 * The distinction being protected is between a review nobody asked for and one somebody did.
 * A freshly scaffolded starter pack is clean by construction, so advising after it is noise —
 * but an imported CLAUDE.md is exactly where a stale path or a dead glob is hiding.
 */
describe('init --advise', () => {
  /** Somebody's existing config, with two real problems in it. */
  const EXISTING: Record<string, string> = {
    'CLAUDE.md': '# Project conventions\n\nAlways mirror src/legacy/handlers.ts when adding an endpoint.\n',
    '.cursor/rules/style.mdc': [
      '---',
      'description: Style',
      'globs: ["app/**/*.tsx"]',
      '---',
      'Never mirror the handlers file; it is being deleted.',
      '',
    ].join('\n'),
  }

  it('prints a clean advise summary after a scaffold that has nothing wrong with it', async () => {
    await initGit(root)
    const { text } = await runCli(initCommand, argv(root, 'init'))

    expect(text).toContain('advise: clean')
    expect(text).not.toContain('to look at')
  })

  it('reviews imported config without being asked, because that is where the problems are', async () => {
    await writeAll(root, EXISTING)
    await initGit(root)
    const { code, text } = await runCli(initCommand, argv(root, 'init'))

    expect(code).toBe(0)
    expect(text).toContain('src/legacy/handlers.ts')
    expect(text).toContain('app/**/*.tsx')
  })

  it('reviews a repository that is already set up, rather than only saying so', async () => {
    await writeAll(root, EXISTING)
    await initGit(root)
    await runCli(initCommand, argv(root, 'init'))

    const { code, text } = await runCli(initCommand, argv(root, 'init --advise'))

    expect(code).toBe(0)
    expect(text).toContain('already set up')
    expect(text).toContain('src/legacy/handlers.ts')
  })

  it('answers a requested review even when there is nothing wrong', async () => {
    await initGit(root)
    await runCli(initCommand, argv(root, 'init'))

    const { text } = await runCli(initCommand, argv(root, 'init --advise'))

    // Silence here is indistinguishable from a flag that did nothing.
    expect(text).toContain('Nothing to say')
  })

  it('still exits zero when the review finds things', async () => {
    await writeAll(root, EXISTING)
    await initGit(root)
    const { code } = await runCli(initCommand, argv(root, 'init --advise'))

    expect(code).toBe(0)
  })
})

/**
 * The list of what still has to be done before a workflow can run.
 *
 * The first place most people meet any of these names, so a bare `CTXMUX_TOKEN is not set`
 * leaves them with a string and no next step.
 */
describe('setting up without a terminal', () => {
  it('honours CTXMUX_AGENT, so a Copilot repository can be scripted', async () => {
    await initGitWithRemote(root)
    process.env['CTXMUX_AGENT'] = 'copilot'
    try {
      const { text } = await runCli(initCommand, argv(root, 'init --yes'))
      expect(text).toContain('through copilot')
    } finally {
      delete process.env['CTXMUX_AGENT']
    }
  })

  it('falls back rather than writing an agent nobody has', async () => {
    await initGitWithRemote(root)
    process.env['CTXMUX_AGENT'] = 'not-an-agent'
    try {
      const { text } = await runCli(initCommand, argv(root, 'init --yes'))
      // config.json is read by every later command; a typo there fails far from its cause.
      expect(text).toContain('through claude')
    } finally {
      delete process.env['CTXMUX_AGENT']
    }
  })
})

describe('before the workflow can run', () => {
  it('says what each thing is, not just what it is called', () => {
    const steps = remainingSetup({ tracker: 'jira', hasRemote: true } as never)
    const token = steps.find((s) => s.what.startsWith('CTXMUX_TOKEN'))

    expect(token?.what).toContain('open pull requests')
    expect(token?.what).toContain('cannot be the built-in GITHUB_TOKEN')
  })

  it('says where a value comes from, not only that a secret needs setting', () => {
    // `gh secret set` prompts for a value it cannot create. A step that stops at the command
    // leaves somebody at a prompt with nothing to paste.
    const steps = remainingSetup({ tracker: 'jira', hasRemote: true, agent: 'claude' } as never)

    expect(steps.find((s) => s.what.startsWith('CTXMUX_TOKEN'))?.how).toContain('Fine-grained tokens')
    expect(steps.find((s) => s.what.startsWith('JIRA_API_TOKEN'))?.how).toContain('id.atlassian.com')
    expect(steps.find((s) => s.what.startsWith('ANTHROPIC_API_KEY'))?.how).toContain('console.anthropic.com')
  })

  it('gives a command that sets it', () => {
    const steps = remainingSetup({ tracker: 'jira', hasRemote: true } as never)

    for (const step of steps) expect(step.how.length).toBeGreaterThan(10)
    expect(steps.find((s) => s.what.startsWith('CTXMUX_ENABLED'))?.how).toContain('gh variable set')
  })

  it('asks for the Jira credentials only when the tracker is Jira', () => {
    const jira = remainingSetup({ tracker: 'jira', hasRemote: true } as never)
    const file = remainingSetup({ tracker: 'file', hasRemote: true } as never)

    expect(jira.some((s) => s.what.startsWith('JIRA_API_TOKEN'))).toBe(true)
    expect(file.some((s) => s.what.startsWith('JIRA'))).toBe(false)
  })

  it('treats the Jira site as a variable rather than a secret', () => {
    const steps = remainingSetup({ tracker: 'jira', hasRemote: true } as never)
    const url = steps.find((s) => s.what.startsWith('JIRA_URL'))

    // Readable in logs and the UI, which is what makes a wrong one findable.
    expect(url?.how).toContain('gh variable set')
    expect(url?.what).toContain('Not secret')
  })

  it('marks what is already configured instead of asserting it is missing', () => {
    const steps = remainingSetup(
      { tracker: 'jira', hasRemote: true } as never,
      new Set(['CTXMUX_TOKEN', 'JIRA_URL']),
    )

    expect(steps.find((s) => s.what.startsWith('CTXMUX_TOKEN'))?.done).toBe(true)
    expect(steps.find((s) => s.what.startsWith('JIRA_EMAIL'))?.done).toBe(false)
  })

  it('asks to enable Copilot only when Copilot is the agent', () => {
    const copilot = remainingSetup({ tracker: 'file', hasRemote: true, agent: 'copilot' } as never)
    const claude = remainingSetup({ tracker: 'file', hasRemote: true, agent: 'claude' } as never)

    expect(copilot.some((s) => s.what.includes('Copilot coding agent'))).toBe(true)
    expect(claude.some((s) => s.what.includes('Copilot coding agent'))).toBe(false)
  })

  it('asks for agent credentials when the agent runs on the runner', () => {
    const claude = remainingSetup({ tracker: 'file', hasRemote: true, agent: 'claude' } as never)
    const copilot = remainingSetup({ tracker: 'file', hasRemote: true, agent: 'copilot' } as never)

    // Copilot brings its own environment; a driven agent does not.
    expect(claude.some((s) => s.what.startsWith('ANTHROPIC_API_KEY'))).toBe(true)
    expect(copilot.some((s) => s.what.startsWith('ANTHROPIC_API_KEY'))).toBe(false)
  })

  it('asks for no credentials at all for a locally hosted model', () => {
    const local = remainingSetup({ tracker: 'file', hasRemote: true, agent: 'local' } as never)

    expect(local.some((s) => s.what.startsWith('ANTHROPIC_API_KEY'))).toBe(false)
    expect(local.some((s) => s.what.includes('Copilot coding agent'))).toBe(false)
  })

  it('claims nothing about the step it cannot check', () => {
    const steps = remainingSetup(
      { tracker: 'file', hasRemote: true, agent: 'copilot' } as never,
      new Set(['CTXMUX_TOKEN']),
    )
    const copilot = steps.find((s) => s.what.includes('Copilot coding agent'))

    // There is no API for this one, so `done` stays undefined rather than guessing false.
    expect(copilot?.done).toBeUndefined()
    expect(copilot?.how).toContain('no command')
  })
})


describe('init --compiler-only', () => {
  it('skips workflows and omits agent/tracker from config', async () => {
    await initGitWithRemote(root)
    const { code, text } = await runCli(initCommand, argv(root, 'init --compiler-only'))
    expect(code).toBe(0)
    expect(await exists(root, '.github/workflows/ctxmux-run.yml')).toBe(false)
    const config = JSON.parse(await read(root, '.ctxmux/config.json'))
    expect(config.targets?.length).toBeGreaterThan(0)
    expect(config.agent).toBeUndefined()
    expect(config.tracker).toBeUndefined()
    expect(text).not.toContain('Before the run and review workflows can work')
  })

  it('always prints an advise summary', async () => {
    await initGit(root)
    const { text } = await runCli(initCommand, argv(root, 'init --compiler-only'))
    expect(text).toMatch(/advise: clean|to look at/)
  })
})


describe('narrower targets', () => {
  it('does not default to all four targets when nothing is on disk', async () => {
    const repo = await makeRepo({ 'package.json': '{"name":"x","packageManager":"pnpm@10.0.0"}' })
    await runCli(initCommand, argv(repo, 'init --no-workflows'))
    const targets = JSON.parse(await read(repo, '.ctxmux/config.json')).targets
    expect(targets).not.toEqual(['claude', 'copilot', 'cursor', 'codex'])
    expect(targets.length).toBe(1)
    await removeRepo(repo)
  })

  it('detects cursor from .cursor/ without import provenance', async () => {
    const repo = await makeRepo({
      'package.json': '{"name":"x","packageManager":"pnpm@10.0.0"}',
      '.cursor/rules/style.mdc': '---\ndescription: Style\n---\nUse tabs.\n',
    })
    await runCli(initCommand, argv(repo, 'init --no-workflows'))
    expect(JSON.parse(await read(repo, '.ctxmux/config.json')).targets).toEqual(['cursor'])
    await removeRepo(repo)
  })
})
