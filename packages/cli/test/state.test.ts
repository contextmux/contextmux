/**
 * `ctxmux state` — the shared store.
 *
 * These use two real clones of a real remote, because the failure being prevented only exists
 * between machines: a workflow reacting to a review runs in a fresh checkout and cannot see
 * what the workflow that dispatched the agent wrote.
 */
import { spawn } from 'node:child_process'
import { promises as fs } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { statePullCommand, statePushCommand } from '../src/commands/state.js'
import { argv, exists, removeRepo, runCli } from './helpers.js'

let origin: string
let alice: string
let bob: string

function git(cwd: string, args: string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn('git', args, { cwd, windowsHide: true, stdio: 'ignore' })
    child.on('error', () => resolve(1))
    child.on('close', (code) => resolve(code ?? 1))
  })
}

async function identify(dir: string): Promise<void> {
  await git(dir, ['config', 'user.email', 'test@example.com'])
  await git(dir, ['config', 'user.name', 'Test'])
}

/** Write a run record, as `ctxmux run` would. */
async function recordRun(root: string, id: string): Promise<void> {
  const dir = path.join(root, '.ctxmux', 'state', 'runs')
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, `${id}.json`), JSON.stringify({ id, state: 'in_review' }), 'utf8')
}

beforeEach(async () => {
  origin = await fs.mkdtemp(path.join(os.tmpdir(), 'ctxmux-origin-'))
  await git(origin, ['init', '-q', '--bare', '-b', 'main'])

  alice = await fs.mkdtemp(path.join(os.tmpdir(), 'ctxmux-alice-'))
  await git(alice, ['init', '-q', '-b', 'main'])
  await identify(alice)
  await fs.writeFile(path.join(alice, '.gitignore'), '.ctxmux/state/\n', 'utf8')
  await fs.writeFile(path.join(alice, 'README.md'), '# fixture\n', 'utf8')
  await git(alice, ['remote', 'add', 'origin', origin])
  await git(alice, ['add', '-A'])
  await git(alice, ['commit', '-qm', 'init'])
  await git(alice, ['push', '-q', 'origin', 'main'])

  bob = await fs.mkdtemp(path.join(os.tmpdir(), 'ctxmux-bob-'))
  await git(path.dirname(bob), ['clone', '-q', origin, bob])
  await identify(bob)
})

afterEach(async () => {
  for (const d of [origin, alice, bob]) await removeRepo(d)
})

describe('state push', () => {
  it('says so rather than pushing nothing', async () => {
    const { code, text } = await runCli(statePushCommand, argv(alice, 'state push'))

    expect(code).toBe(0)
    expect(text).toContain('Nothing to push')
  })

  it('publishes run state to a branch of its own', async () => {
    await recordRun(alice, 'run-T-1')

    const { code, text } = await runCli(statePushCommand, argv(alice, 'state push'))

    expect(code).toBe(0)
    expect(text).toContain('ctxmux-state')
  })

  it('leaves the branch you are standing on alone', async () => {
    /*
     * A command that quietly switched your branch to synchronise some bookkeeping would be
     * indefensible — and worse in CI, where the checkout is the thing being built.
     */
    await recordRun(alice, 'run-T-1')
    await runCli(statePushCommand, argv(alice, 'state push'))

    const branch = await new Promise<string>((resolve) => {
      const child = spawn('git', ['branch', '--show-current'], { cwd: alice })
      let out = ''
      child.stdout.on('data', (d) => (out += d))
      child.on('close', () => resolve(out.trim()))
    })

    expect(branch).toBe('main')
    expect(await exists(alice, 'README.md')).toBe(true)
  })
})

describe('state pull', () => {
  it('says so when nobody has pushed yet', async () => {
    const { code, text } = await runCli(statePullCommand, argv(bob, 'state pull'))

    expect(code).toBe(0)
    expect(text).toContain('No "ctxmux-state" branch')
  })

  it('carries a run from one checkout to another', async () => {
    // The whole point: a fresh checkout cannot otherwise see what another job recorded.
    await recordRun(alice, 'run-T-1')
    await runCli(statePushCommand, argv(alice, 'state push'))

    expect(await exists(bob, '.ctxmux/state/runs/run-T-1.json')).toBe(false)

    const { code } = await runCli(statePullCommand, argv(bob, 'state pull'))

    expect(code).toBe(0)
    expect(await exists(bob, '.ctxmux/state/runs/run-T-1.json')).toBe(true)
  })

  it('merges rather than replacing what is already local', async () => {
    // Two people's observations have to add up, or recurrence is still measured per-person.
    await recordRun(alice, 'run-T-1')
    await runCli(statePushCommand, argv(alice, 'state push'))

    await recordRun(bob, 'run-T-9')
    await runCli(statePullCommand, argv(bob, 'state pull'))

    expect(await exists(bob, '.ctxmux/state/runs/run-T-1.json')).toBe(true)
    expect(await exists(bob, '.ctxmux/state/runs/run-T-9.json')).toBe(true)
  })

  it('round-trips through a second push', async () => {
    await recordRun(alice, 'run-T-1')
    await runCli(statePushCommand, argv(alice, 'state push'))
    await runCli(statePullCommand, argv(bob, 'state pull'))

    await recordRun(bob, 'run-T-9')
    await runCli(statePushCommand, argv(bob, 'state push'))
    await runCli(statePullCommand, argv(alice, 'state pull'))

    expect(await exists(alice, '.ctxmux/state/runs/run-T-9.json')).toBe(true)
  })
})
