/**
 * The harness end to end, with fake agents.
 *
 * These check the properties that make a comparison trustworthy: every entrant starts from the
 * same place, one entrant failing does not lose the others, and no entrant can see another's
 * work.
 */
import { promises as fs } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  FakeAgent,
  fakeTask,
  pathScope,
  producedChanges,
  DEFAULT_DENY,
  type CodingAgent,
} from '@contextmux/core'
import { runEval } from '../src/index.js'

const exec = promisify(execFile)
let dir: string

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ctxmux-eval-'))
  await exec('git', ['init', '-q'], { cwd: dir })
  await exec('git', ['config', 'user.email', 'a@b.c'], { cwd: dir })
  await exec('git', ['config', 'user.name', 'T'], { cwd: dir })
  await fs.mkdir(path.join(dir, 'src'), { recursive: true })
  await fs.writeFile(path.join(dir, 'src/seed.ts'), 'export const seed = 1\n')
  await exec('git', ['add', '-A'], { cwd: dir })
  await exec('git', ['commit', '-qm', 'init'], { cwd: dir })
})

afterEach(async () => {
  /*
   * Remove the worktrees the eval created.
   *
   * `git worktree prune` alone does not do it: it clears *stale* bookkeeping, not live
   * worktrees, and the directories themselves live outside the repository — under the system
   * temp directory, so that a run in one repo cannot collide with a run in another. Deleting
   * the repository left them behind, and they accumulated a dozen at a time on every run.
   *
   * Keeping a worktree that contains work is correct *product* behaviour — it is the artefact
   * a human reads the diff from. It is only litter here, where nobody is going to read it.
   */
  for (const worktree of createdWorktrees) {
    await exec('git', ['worktree', 'remove', '--force', worktree], { cwd: dir }).catch(() => {})
    await fs.rm(worktree, { recursive: true, force: true })
  }
  createdWorktrees.clear()
  await fs.rm(dir, { recursive: true, force: true })
})

/**
 * Worktrees any entrant was given, collected from what the harness reports.
 *
 * Read off `Score.worktree` rather than recomputed from the naming scheme, so the cleanup
 * follows the harness rather than duplicating one of its internals.
 */
const createdWorktrees = new Set<string>()

/** Run a comparison and remember where its entrants worked, so it can be cleaned up. */
async function evaluate(options: Parameters<typeof runEval>[0]): ReturnType<typeof runEval> {
  const result = await runEval(options)
  for (const score of result.scores) {
    if (score.worktree) createdWorktrees.add(score.worktree)
  }
  return result
}

/** An agent that writes real files into whatever worktree it is given. */
function writingAgent(id: string, files: Record<string, string>): CodingAgent {
  const agent = new FakeAgent({ responses: [{ status: 'succeeded' }] })
  Object.defineProperty(agent, 'id', { value: id })
  Object.defineProperty(agent, 'displayName', { value: id })
  const original = agent.run.bind(agent)
  agent.run = async (input) => {
    for (const [rel, content] of Object.entries(files)) {
      const abs = path.join(input.runner.cwd, rel)
      await fs.mkdir(path.dirname(abs), { recursive: true })
      await fs.writeFile(abs, content)
    }
    const out = await original(input)
    return {
      ...out,
      result: { ...out.result, filesChanged: await input.runner.changedFiles() },
    }
  }
  return agent
}

const baseOptions = (entrants: CodingAgent[]) => ({
  root: dir,
  task: fakeTask({ id: 'EV-1', scope: { allow: ['src/**'], deny: [] } }),
  entrants: entrants.map((agent) => ({ agent })),
  gates: [producedChanges(), pathScope({ defaultDeny: DEFAULT_DENY })],
  renderPrompt: (t: { title: string }) => `TASK: ${t.title}`,
})

describe('fairness', () => {
  it('gives every entrant its own worktree, branched from the same commit', async () => {
    // Sharing one would let the first agent's changes become the second's starting point,
    // which makes the comparison meaningless in a way the results do not reveal.
    const result = await evaluate(
      baseOptions([
        writingAgent('alpha', { 'src/alpha.ts': 'export const a = 1\n' }),
        writingAgent('beta', { 'src/beta.ts': 'export const b = 2\n' }),
      ]),
    )

    const worktrees = result.scores.map((s) => s.worktree)
    expect(new Set(worktrees).size).toBe(2)

    // Neither agent should be able to see the other's file.
    for (const score of result.scores) {
      const own = score.agentId === 'alpha' ? 'src/alpha.ts' : 'src/beta.ts'
      const other = score.agentId === 'alpha' ? 'src/beta.ts' : 'src/alpha.ts'
      await expect(fs.access(path.join(score.worktree!, own))).resolves.toBeUndefined()
      await expect(fs.access(path.join(score.worktree!, other))).rejects.toThrow()
    }
  })

  it('leaves the developer’s checkout untouched', async () => {
    await evaluate(baseOptions([writingAgent('alpha', { 'src/alpha.ts': 'x' })]))
    const status = await exec('git', ['status', '--porcelain'], { cwd: dir })
    expect(status.stdout.trim()).toBe('')
  })

  it('runs every entrant against the identical task', async () => {
    const a = writingAgent('alpha', { 'src/a.ts': 'x' }) as FakeAgent
    const b = writingAgent('beta', { 'src/b.ts': 'y' }) as FakeAgent
    await evaluate(baseOptions([a, b]))
    expect(a.prompts[0]).toBe(b.prompts[0])
  })
})

describe('robustness', () => {
  it('does not lose the comparison when one entrant explodes', async () => {
    const exploding = new FakeAgent({ responses: [{ status: 'succeeded' }], throwOn: [1, 2] })
    Object.defineProperty(exploding, 'id', { value: 'broken' })

    const result = await evaluate(
      baseOptions([writingAgent('good', { 'src/g.ts': 'x' }), exploding]),
    )

    expect(result.scores).toHaveLength(2)
    expect(result.scores[0]?.agentId).toBe('good')
    expect(result.scores[0]?.succeeded).toBe(true)
  })

  it('skips an entrant that is not installed, rather than scoring it as a loss', async () => {
    // Scoring an uninstalled agent zero would be a lie about how it performs.
    const unavailable = new FakeAgent({ responses: [{ status: 'succeeded' }] })
    Object.defineProperty(unavailable, 'id', { value: 'missing' })
    unavailable.preflight = async () => ({ ok: false, detail: 'binary not installed' })

    const result = await evaluate({
      ...baseOptions([writingAgent('good', { 'src/g.ts': 'x' }), unavailable]),
      skipUnavailable: true,
    })

    expect(result.scores.map((s) => s.agentId)).toEqual(['good'])
    expect(result.skipped[0]?.reason).toContain('binary not installed')
  })
})

describe('scoring a real comparison', () => {
  it('ranks a disciplined change above a sprawling one', async () => {
    const result = await evaluate(
      baseOptions([
        writingAgent('sprawler', { 'src/a.ts': 'x', 'package.json': '{}' }),
        writingAgent('disciplined', { 'src/a.ts': 'x' }),
      ]),
    )

    expect(result.scores[0]?.agentId).toBe('disciplined')
    const sprawler = result.scores.find((s) => s.agentId === 'sprawler')
    expect(sprawler?.outOfScopeFiles).toContain('package.json')
  })

  it('measures the diff it actually produced', async () => {
    const result = await evaluate(
      baseOptions([writingAgent('alpha', { 'src/new.ts': 'line one\nline two\nline three\n' })]),
    )
    expect(result.scores[0]?.diffLines).toBeGreaterThanOrEqual(3)
    expect(result.scores[0]?.filesChanged).toBe(1)
  })
})

describe('measuring rather than trusting', () => {
  it('measures the diff from the workspace even when the adapter reports none', async () => {
    // Regression: scoring trusted `result.diff`, so an adapter that omitted it scored zero
    // diff lines and ranked better for under-reporting.
    const silent = writingAgent('silent', { 'src/new.ts': 'a\nb\nc\nd\n' })
    const original = silent.kind === 'driven' ? silent.run.bind(silent) : null
    if (original) {
      ;(silent as { run: unknown }).run = async (input: Parameters<typeof original>[0]) => {
        const out = await original(input)
        // Report no diff at all, as a sparse adapter would.
        return { ...out, result: { ...out.result, diff: undefined } }
      }
    }

    const result = await evaluate(baseOptions([silent]))
    expect(result.scores[0]?.diffLines).toBeGreaterThanOrEqual(4)
  })

  it('measures the files changed even when the adapter under-reports them', async () => {
    const understating = writingAgent('understating', { 'src/a.ts': 'x', 'src/b.ts': 'y' })
    const original = understating.kind === 'driven' ? understating.run.bind(understating) : null
    if (original) {
      ;(understating as { run: unknown }).run = async (input: Parameters<typeof original>[0]) => {
        const out = await original(input)
        return { ...out, result: { ...out.result, filesChanged: ['src/a.ts'] } }
      }
    }

    const result = await evaluate(baseOptions([understating]))
    expect(result.scores[0]?.filesChanged).toBe(2)
  })
})
