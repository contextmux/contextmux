import { execFile } from 'node:child_process'
import { promises as fs } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { promisify } from 'node:util'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { LocalRunner } from '../src/index.js'

const exec = promisify(execFile)
let dir: string

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ctxmux-runner-'))
  await exec('git', ['init', '-q'], { cwd: dir })
  await exec('git', ['config', 'user.email', 'a@b.c'], { cwd: dir })
  await exec('git', ['config', 'user.name', 'Test'], { cwd: dir })
  await fs.writeFile(path.join(dir, 'seed.txt'), 'seed\n')
  await exec('git', ['add', '-A'], { cwd: dir })
  await exec('git', ['commit', '-qm', 'init'], { cwd: dir })
})

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true })
})

describe('exec', () => {
  it('captures stdout and the exit code', async () => {
    const { runner } = await LocalRunner.create({ root: dir })
    const res = await runner.exec('echo', ['hello'])
    expect(res.code).toBe(0)
    expect(res.stdout.trim()).toBe('hello')
  })

  it('reports a non-zero exit rather than throwing', async () => {
    const { runner } = await LocalRunner.create({ root: dir })
    const res = await runner.exec('sh', ['-c', 'exit 3'])
    expect(res.code).toBe(3)
  })

  it('reports a missing binary usefully instead of crashing the run', async () => {
    const { runner } = await LocalRunner.create({ root: dir })
    const res = await runner.exec('definitely-not-a-real-binary-xyz', [])
    expect(res.code).toBe(127)
    expect(res.stderr).toContain('command not found')
  })

  it('kills a process that exceeds its timeout', async () => {
    const { runner } = await LocalRunner.create({ root: dir })
    const res = await runner.exec('sleep', ['10'], { timeoutMs: 150 })
    expect(res.timedOut).toBe(true)
    expect(res.durationMs).toBeLessThan(5_000)
  })

  it('runs commands in its own working directory', async () => {
    const { runner } = await LocalRunner.create({ root: dir })
    const res = await runner.exec('pwd', [])
    expect(await fs.realpath(res.stdout.trim())).toBe(await fs.realpath(runner.cwd))
  })
})

describe('change detection', () => {
  it('sees modified files', async () => {
    const { runner } = await LocalRunner.create({ root: dir })
    await fs.writeFile(path.join(dir, 'seed.txt'), 'changed\n')
    expect(await runner.changedFiles()).toContain('seed.txt')
  })

  it('sees new files, which a scope gate must not miss', async () => {
    const { runner } = await LocalRunner.create({ root: dir })
    await fs.writeFile(path.join(dir, 'brand-new.ts'), 'export const x = 1\n')
    expect(await runner.changedFiles()).toContain('brand-new.ts')
  })

  it('sees work the agent committed, not just the dirty tree', async () => {
    const { runner } = await LocalRunner.create({ root: dir })
    await fs.writeFile(path.join(dir, 'committed.ts'), 'export const y = 2\n')
    await exec('git', ['add', '-A'], { cwd: runner.cwd })
    await exec('git', ['commit', '-qm', 'agent work'], { cwd: runner.cwd })
    expect(await runner.changedFiles()).toContain('committed.ts')
  })

  it('reports nothing when nothing changed', async () => {
    const { runner } = await LocalRunner.create({ root: dir })
    expect(await runner.changedFiles()).toEqual([])
  })

  it('includes untracked files in the diff', async () => {
    const { runner } = await LocalRunner.create({ root: dir })
    await fs.writeFile(path.join(dir, 'added.ts'), 'export const z = 3\n')
    expect(await runner.diff()).toContain('export const z = 3')
  })
})

describe('worktree isolation', () => {
  it('works in a separate checkout, leaving the repository untouched', async () => {
    const { runner, isolated } = await LocalRunner.create({ root: dir, isolate: true })
    expect(isolated).toBe(true)
    expect(runner.cwd).not.toBe(dir)

    await fs.writeFile(path.join(runner.cwd, 'agent-file.ts'), 'export const a = 1\n')

    expect(await runner.changedFiles()).toContain('agent-file.ts')
    // The developer's own checkout must stay exactly as it was.
    const status = await exec('git', ['status', '--porcelain'], { cwd: dir })
    expect(status.stdout.trim()).toBe('')

    await runner.discard()
  })

  it('says so when isolation is not possible rather than silently editing the working tree', async () => {
    // Silently falling back would put an agent in the developer's checkout without them knowing.
    const plain = await fs.mkdtemp(path.join(os.tmpdir(), 'ctxmux-nogit-'))
    try {
      const { isolated, note } = await LocalRunner.create({ root: plain, isolate: true })
      expect(isolated).toBe(false)
      expect(note).toContain('isolation unavailable')
    } finally {
      await fs.rm(plain, { recursive: true, force: true })
    }
  })

  it('keeps a worktree that contains work, so a human can inspect it', async () => {
    const { runner } = await LocalRunner.create({ root: dir, isolate: true })
    const worktree = runner.cwd
    await fs.writeFile(path.join(worktree, 'result.ts'), 'export const r = 1\n')

    await runner.dispose()

    // Disposing must not throw away the artefact the run existed to produce.
    await expect(fs.access(worktree)).resolves.toBeUndefined()
    await runner.discard()
  })

  it('removes an empty worktree on dispose', async () => {
    const { runner } = await LocalRunner.create({ root: dir, isolate: true, branch: 'ctxmux/empty' })
    const worktree = runner.cwd
    await runner.dispose()
    await expect(fs.access(worktree)).rejects.toThrow()
  })
})

describe('contextmux artefacts', () => {
  it('does not report its own bookkeeping as an agent change', async () => {
    // Regression: run state, the index cache and the tracker's status write all land in the
    // tree during a run. Counting them failed the path-scope gate on the first verify and
    // spent a whole correction round asking the agent to revert files it never touched.
    const { runner } = await LocalRunner.create({ root: dir })

    await fs.mkdir(path.join(dir, '.ctxmux/state/leases'), { recursive: true })
    await fs.mkdir(path.join(dir, '.ctxmux/cache'), { recursive: true })
    await fs.mkdir(path.join(dir, '.ctxmux/tasks'), { recursive: true })
    await fs.writeFile(path.join(dir, '.ctxmux/state/applied.json'), '[]')
    await fs.writeFile(path.join(dir, '.ctxmux/state/leases/run-T-1.lease'), '1')
    await fs.writeFile(path.join(dir, '.ctxmux/cache/index.json'), '{}')
    await fs.writeFile(path.join(dir, '.ctxmux/tasks/T-1.md'), 'status: in-progress')
    await fs.writeFile(path.join(dir, 'real-change.ts'), 'export const x = 1\n')

    expect(await runner.changedFiles()).toEqual(['real-change.ts'])
  })

  it('keeps artefacts out of the diff, which gates read', async () => {
    const { runner } = await LocalRunner.create({ root: dir })
    await fs.mkdir(path.join(dir, '.ctxmux/state'), { recursive: true })
    await fs.writeFile(path.join(dir, '.ctxmux/state/applied.json'), 'BOOKKEEPING')
    await fs.writeFile(path.join(dir, 'real.ts'), 'REAL_CHANGE\n')

    const diff = await runner.diff()
    expect(diff).toContain('REAL_CHANGE')
    expect(diff).not.toContain('BOOKKEEPING')
  })

  it('honours extra exclusions', async () => {
    const { runner } = await LocalRunner.create({ root: dir, exclude: ['generated/'] })
    await fs.mkdir(path.join(dir, 'generated'), { recursive: true })
    await fs.writeFile(path.join(dir, 'generated/out.ts'), 'x')
    await fs.writeFile(path.join(dir, 'kept.ts'), 'y')
    expect(await runner.changedFiles()).toEqual(['kept.ts'])
  })
})

describe('re-running a task', () => {
  it('reuses an existing worktree instead of dropping into the working tree', async () => {
    // Silently putting an agent in the developer's checkout because a branch name collided is
    // the worst available failure mode, so a collision must resolve to the existing worktree.
    const first = await LocalRunner.create({ root: dir, isolate: true, branch: 'ctxmux/reuse' })
    expect(first.isolated).toBe(true)
    await fs.writeFile(path.join(first.runner.cwd, 'wip.ts'), 'partial work\n')

    const second = await LocalRunner.create({ root: dir, isolate: true, branch: 'ctxmux/reuse' })
    expect(second.isolated).toBe(true)
    // git reports the resolved path; macOS symlinks /var to /private/var.
    expect(await fs.realpath(second.runner.cwd)).toBe(await fs.realpath(first.runner.cwd))
    expect(second.note).toContain('reusing')
    // The partial work from the interrupted run is still there to build on.
    expect(await second.runner.changedFiles()).toContain('wip.ts')

    await second.runner.discard()
  })
})

describe('child process handling', () => {
  it('closes stdin so a command that reads it does not wait forever', async () => {
    /*
     * `spawn` gives a child an open pipe on stdin whether or not anything will be written to
     * it. A CLI that reads stdin — which is how several of them take a prompt — then waits for
     * an EOF nobody was going to send, and the run burns its whole timeout having done
     * nothing. The short timeout here is the assertion: if stdin stops being closed, this fails
     * rather than hangs.
     */
    const { runner } = await LocalRunner.create({ root: process.cwd() })
    const res = await runner.exec('cat', [], { timeoutMs: 3_000 })

    expect(res.timedOut).toBe(false)
    expect(res.code).toBe(0)
  })

  it('survives a child that exits before reading its input', async () => {
    /*
     * Writing to a process that has already gone raises EPIPE on the stream, and an `error`
     * event with no listener is an unhandled exception — so a misspelled flag, or a CLI piped
     * into something that closes early, took the orchestrator down with it.
     */
    const { runner } = await LocalRunner.create({ root: process.cwd() })
    const res = await runner.exec('head', ['-c', '1'], {
      input: 'x'.repeat(8 * 1024 * 1024),
      timeoutMs: 10_000,
    })

    expect(res.code).toBe(0)
    expect(res.stdout).toBe('x')
  })

  it('reports a command that does not exist rather than throwing', async () => {
    const { runner } = await LocalRunner.create({ root: process.cwd() })
    const res = await runner.exec('definitely-not-a-real-binary-xyz', [])

    expect(res.code).toBe(127)
    expect(res.stderr).toContain('command not found')
  })
})

describe('the branch a worktree is on', () => {
  const branches = async () =>
    (await exec('git', ['branch', '--format=%(refname:short)'], { cwd: dir })).stdout
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)

  it('is reported even when it was generated rather than supplied', async () => {
    /*
     * `create` defaults to a generated name when the caller does not supply one, and that name
     * only ever existed as a local — `location()` read `opts.branch`. A human was handed a
     * worktree path with no way to name what they were looking at.
     */
    const { runner, isolated } = await LocalRunner.create({ root: dir, isolate: true })
    expect(isolated).toBe(true)
    expect(runner.location().branch).toMatch(/^ctxmux\//)
    await runner.discard()
  })

  it('is deleted with the worktree when the run produced nothing', async () => {
    // `dispose` deleted `opts.branch`, so a generated branch outlived every worktree it was
    // ever attached to and accumulated in the repository.
    const { runner } = await LocalRunner.create({ root: dir, isolate: true })
    const branch = runner.location().branch!

    expect(await branches()).toContain(branch)
    await runner.dispose()
    expect(await branches()).not.toContain(branch)
  })

  it('is deleted by discard, which is what discarding the work means', async () => {
    // Removing only the worktree left every commit reachable from the branch, so the work was
    // not discarded at all.
    const { runner } = await LocalRunner.create({ root: dir, isolate: true })
    const branch = runner.location().branch!
    await fs.writeFile(path.join(runner.cwd, 'scratch.txt'), 'work\n')
    await exec('git', ['add', '-A'], { cwd: runner.cwd })
    await exec('git', ['commit', '-qm', 'agent work'], { cwd: runner.cwd })

    await runner.discard()
    expect(await branches()).not.toContain(branch)
  })

  it('keeps a worktree that still holds work', async () => {
    // The whole point of isolation is that a human can inspect what the agent did.
    const { runner } = await LocalRunner.create({ root: dir, isolate: true })
    const branch = runner.location().branch!
    await fs.writeFile(path.join(runner.cwd, 'scratch.txt'), 'work\n')

    await runner.dispose()
    expect(await branches()).toContain(branch)
    await runner.discard()
  })
})
