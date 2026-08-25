/**
 * `ctxmux init` — scaffold a canonical source.
 *
 * The first command anyone runs, and the one whose failure mode is most annoying: writing over
 * work that is already there.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { initCommand } from '../src/commands/init.js'
import {
  argv,
  exists,
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

    expect(code).toBe(1)
    expect(text).toContain('already exists')
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

    expect(text).toContain('Before the workflow can run')
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
