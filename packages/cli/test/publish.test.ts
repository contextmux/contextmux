/**
 * Publishing a driven agent's work.
 *
 * These run against a real repository with a real remote, because every interesting failure
 * here is a git failure: nothing committed, nothing ahead of the base, a branch that already
 * has a pull request. A double would answer all of those the way the code hopes.
 */
import { execFile } from 'node:child_process'
import { promises as fs } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { promisify } from 'node:util'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createRun, fakeTask, type Run } from '@contextmux/core'
import { FakeGitHub, GitHubForge } from '@contextmux/forge-github'
import { LocalRunner } from '@contextmux/runner-local'
import { publishRun, PublishError, pullRequestBody } from '../src/publish.js'

const exec = promisify(execFile)

let origin: string
let work: string

async function git(cwd: string, args: string[]) {
  return exec('git', args, { cwd })
}

beforeEach(async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'ctxmux-publish-'))
  origin = path.join(base, 'origin.git')
  work = path.join(base, 'work')

  await fs.mkdir(origin, { recursive: true })
  await git(origin, ['init', '--bare', '-q', '-b', 'main'])

  await fs.mkdir(work, { recursive: true })
  await git(work, ['init', '-q', '-b', 'main'])
  await git(work, ['config', 'user.email', 'a@b.c'])
  await git(work, ['config', 'user.name', 'Test'])
  await fs.writeFile(path.join(work, 'seed.txt'), 'seed\n')
  await git(work, ['add', '-A'])
  await git(work, ['commit', '-qm', 'init'])
  await git(work, ['remote', 'add', 'origin', origin])
  await git(work, ['push', '-q', '-u', 'origin', 'main'])
})

afterEach(async () => {
  await fs.rm(path.dirname(origin), { recursive: true, force: true })
})

function runFor(over: Partial<Run> = {}): Run {
  const run = createRun(fakeTask({ id: 'T-7', title: 'Add a currency formatter' }))
  run.state = 'in_review'
  run.gateOutcomes = [
    { gate: 'path-scope', verdict: 'pass' },
    { gate: 'quality-gate', verdict: 'pass' },
  ]
  run.result = { status: 'succeeded', filesChanged: ['src/money.ts'], summary: 'done' }
  return { ...run, ...over }
}

const forgeFor = (fake: FakeGitHub) => new GitHubForge(fake, { owner: 'o', repo: 'r' })

describe('publishing what a driven agent produced', () => {
  it('commits, pushes and opens a pull request', async () => {
    /*
     * The gap this closes: a driven agent's output lives in a worktree, and on a CI runner the
     * machine is destroyed when the job ends. The run reported success, the gates reported
     * success, and nothing existed afterwards.
     */
    const { runner } = await LocalRunner.create({ root: work, isolate: true, branch: 'ctxmux/t-7' })
    await fs.writeFile(path.join(runner.cwd, 'src-money.ts'), 'export const f = 1\n')

    const fake = new FakeGitHub()
    const result = await publishRun({
      run: runFor(),
      runner,
      forge: forgeFor(fake),
      branch: 'ctxmux/t-7',
      baseBranch: 'main',
      agentId: 'claude',
    })

    expect(result.created).toBe(true)
    expect(result.url).toContain('/pull/')

    // The branch really is on the remote, not merely claimed to be.
    const remote = await git(origin, ['branch', '--format=%(refname:short)'])
    expect(remote.stdout).toContain('ctxmux/t-7')
  })

  it('commits work the agent left unstaged', async () => {
    // Most agents do not commit. Pushing without committing publishes an empty branch, which
    // looks exactly like the agent having produced nothing.
    const { runner } = await LocalRunner.create({ root: work, isolate: true, branch: 'ctxmux/t-8' })
    await fs.writeFile(path.join(runner.cwd, 'new.ts'), 'export const x = 1\n')

    const fake = new FakeGitHub()
    await publishRun({
      run: runFor(),
      runner,
      forge: forgeFor(fake),
      branch: 'ctxmux/t-8',
      baseBranch: 'main',
      agentId: 'claude',
    })

    const files = await git(origin, ['ls-tree', '-r', '--name-only', 'ctxmux/t-8'])
    expect(files.stdout).toContain('new.ts')
  })

  it('returns the existing pull request when the branch already has one', async () => {
    // Re-running a task is ordinary. GitHub answers the second create with a 422 naming the
    // branch but not the pull request, so reporting it verbatim calls a successful re-publish
    // an error.
    const { runner } = await LocalRunner.create({ root: work, isolate: true, branch: 'ctxmux/t-9' })
    await fs.writeFile(path.join(runner.cwd, 'a.ts'), 'export const a = 1\n')

    const fake = new FakeGitHub()
    const forge = forgeFor(fake)
    const args = {
      run: runFor(),
      runner,
      forge,
      branch: 'ctxmux/t-9',
      baseBranch: 'main',
      agentId: 'claude',
    }

    const first = await publishRun(args)
    await fs.writeFile(path.join(runner.cwd, 'b.ts'), 'export const b = 2\n')
    const second = await publishRun(args)

    expect(first.created).toBe(true)
    expect(second.created).toBe(false)
    expect(second.number).toBe(first.number)
  })

  it('refuses when the run had no branch of its own', async () => {
    // Publishing pushes to a shared remote. Doing that from the developer's own checkout,
    // because the run was not isolated, is not a thing to do quietly.
    const { runner } = await LocalRunner.create({ root: work })
    await expect(
      publishRun({
        run: runFor(),
        runner,
        forge: forgeFor(new FakeGitHub()),
        branch: undefined,
        baseBranch: 'main',
        agentId: 'claude',
      }),
    ).rejects.toBeInstanceOf(PublishError)
  })

  it('refuses when nothing survived to a commit', async () => {
    // The agent reported changes and the gates passed, but the branch is identical to the
    // base. Opening an empty pull request would be worse than saying so.
    const { runner } = await LocalRunner.create({ root: work, isolate: true, branch: 'ctxmux/t-10' })

    await expect(
      publishRun({
        run: runFor(),
        runner,
        forge: forgeFor(new FakeGitHub()),
        branch: 'ctxmux/t-10',
        baseBranch: 'main',
        agentId: 'claude',
      }),
    ).rejects.toThrow(/nothing on this branch/)
  })
})

describe('what the pull request says', () => {
  it('carries the task, the gates and the files', () => {
    const body = pullRequestBody(runFor(), 'main', 'claude')
    expect(body).toContain('T-7')
    expect(body).toContain('`path-scope`')
    expect(body).toContain('`src/money.ts`')
    expect(body).toContain('An agent wrote this')
  })

  it('names a failing gate rather than only the passing ones', () => {
    const run = runFor()
    run.gateOutcomes = [{ gate: 'test-integrity', verdict: 'escalate', reason: 'a test was skipped' }]
    expect(pullRequestBody(run, 'main', 'claude')).toContain('a test was skipped')
  })
})
