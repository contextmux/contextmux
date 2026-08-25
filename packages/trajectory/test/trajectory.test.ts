import { describe, expect, it } from 'vitest'
import { hashWorkspace, isMutating, signatureOf, Trajectory, type TrajectoryMeta } from '../src/index.js'

const meta = (): TrajectoryMeta => ({
  runId: 'run-1',
  taskId: 'T-1',
  agentId: 'claude-code',
  round: 0,
  startedAt: 1_000,
})

describe('classifying tools', () => {
  it('separates reads from writes, which every consumer depends on', () => {
    // Reads are how an agent gathers evidence; writes are how it commits to a belief.
    expect(isMutating('Write')).toBe(true)
    expect(isMutating('edit_file')).toBe(true)
    expect(isMutating('Bash')).toBe(true)
    expect(isMutating('Read')).toBe(false)
    expect(isMutating('Grep')).toBe(false)
    expect(isMutating('list_files')).toBe(false)
  })

  it('treats a read-shaped name as a read even when it contains a write word', () => {
    // `git_diff` contains "diff"; `read_and_run` should not be classified by its second half.
    expect(isMutating('git_diff')).toBe(false)
    expect(isMutating('show_migration_status')).toBe(false)
  })

  it('treats an unfamiliar destructive name as mutating', () => {
    // An allow-list would classify a tool no vendor here has emitted as harmless.
    expect(isMutating('delete_customer_records')).toBe(true)
    expect(isMutating('drop_table')).toBe(true)
  })
})

describe('signatures', () => {
  it('is identical for identical calls, which is how repetition is spotted', () => {
    expect(signatureOf('Grep', { pattern: 'foo' })).toBe(signatureOf('Grep', { pattern: 'foo' }))
  })

  it('differs when the arguments differ', () => {
    expect(signatureOf('Grep', { pattern: 'foo' })).not.toBe(signatureOf('Grep', { pattern: 'bar' }))
  })

  it('does not blow up on a huge argument', () => {
    // Bounded and constant-width, whatever went in — a signature is stored on every step, so
    // its size must not track the size of the payload it describes.
    const huge = { content: 'x'.repeat(100_000) }
    const small = { content: 'x' }

    expect(signatureOf('Write', huge).length).toBe(signatureOf('Write', small).length)
    expect(signatureOf('Write', huge).length).toBeLessThan(32)
  })
})

describe('recording', () => {
  it('numbers steps monotonically', () => {
    const t = new Trajectory(meta())
    t.dispatch('start')
    t.tool('Read', { file_path: 'a.ts' })
    t.message('thinking')
    expect(t.all.map((s) => s.seq)).toEqual([1, 2, 3])
  })

  it('describes a tool call by the argument a reader cares about', () => {
    const t = new Trajectory(meta())
    t.tool('Read', { file_path: 'src/very/deep/file.ts' })
    expect(t.all[0]?.summary).toBe('src/very/deep/file.ts')
  })

  it('truncates a long message rather than storing it whole', () => {
    const t = new Trajectory(meta())
    t.message('x'.repeat(1000))
    expect(t.all[0]!.summary.length).toBeLessThan(200)
  })

  it('drops from the middle when it grows too large, and says how many', () => {
    // The opening establishes what was asked; the tail is what is happening now. The middle of
    // a very long run is the least informative part.
    const t = new Trajectory(meta())
    for (let i = 0; i < 6_000; i++) t.tool('Read', { file_path: `f${i}.ts` })

    expect(t.length).toBeLessThanOrEqual(5_000)
    expect(t.toJSON().dropped).toBeGreaterThan(0)
    // The very first step survives.
    expect(t.all[0]?.summary).toBe('f0.ts')
    // So does the most recent.
    expect(t.all.at(-1)?.summary).toBe('f5999.ts')
  })

  it('round-trips through JSON', () => {
    const t = new Trajectory(meta())
    t.dispatch('start')
    t.tool('Write', { file_path: 'a.ts' }, { files: ['a.ts'] })
    const restored = Trajectory.from(JSON.parse(JSON.stringify(t.toJSON())))
    expect(restored.length).toBe(2)
    expect(restored.meta.runId).toBe('run-1')
  })
})

describe('workspace observation', () => {
  it('counts consecutive samples in which nothing changed', () => {
    const t = new Trajectory(meta())
    t.observe(['a.ts'], 'diff-one')
    expect(t.stagnantSamples).toBe(0)
    t.observe(['a.ts'], 'diff-one')
    expect(t.stagnantSamples).toBe(1)
    t.observe(['a.ts'], 'diff-one')
    expect(t.stagnantSamples).toBe(2)
  })

  it('resets the moment anything changes', () => {
    const t = new Trajectory(meta())
    t.observe(['a.ts'], 'diff-one')
    t.observe(['a.ts'], 'diff-one')
    t.observe(['a.ts', 'b.ts'], 'diff-two')
    expect(t.stagnantSamples).toBe(0)
  })

  it('hashes a workspace consistently regardless of file order', () => {
    expect(hashWorkspace(['a.ts', 'b.ts'], 'd')).toBe(hashWorkspace(['b.ts', 'a.ts'], 'd'))
  })

  it('distinguishes two different workspaces', () => {
    expect(hashWorkspace(['a.ts'], 'one')).not.toBe(hashWorkspace(['a.ts'], 'two'))
  })
})

describe('querying', () => {
  it('finds repeats of a call', () => {
    const t = new Trajectory(meta())
    const sig = signatureOf('Grep', { pattern: 'foo' })
    t.tool('Grep', { pattern: 'foo' })
    t.tool('Read', { file_path: 'a.ts' })
    t.tool('Grep', { pattern: 'foo' })
    expect(t.repeatsOf(sig)).toHaveLength(2)
  })

  it('reports files the agent read but not files it wrote', () => {
    const t = new Trajectory(meta())
    t.tool('Read', { file_path: 'a.ts' }, { files: ['a.ts'] })
    t.tool('Write', { file_path: 'b.ts' }, { files: ['b.ts'] })
    expect(t.readFiles()).toEqual(['a.ts'])
  })
})

describe('rendering', () => {
  it('shows elapsed time rather than wall-clock, which is what a reader wants', () => {
    const t = new Trajectory(meta())
    t.dispatch('start')
    const rendered = t.render()
    expect(rendered).toContain('dispatch')
    expect(rendered).toMatch(/\d+s/)
  })

  it('says how much it is not showing', () => {
    const t = new Trajectory(meta())
    for (let i = 0; i < 100; i++) t.tool('Read', { file_path: `f${i}.ts` })
    expect(t.render({ limit: 10 })).toContain('earlier step(s) not shown')
  })
})

describe('snake_case tool names', () => {
  it('classifies snake_case destructive tools correctly', () => {
    // Regex word boundaries treat underscore as a word character, so `\bdelete\b` never
    // matched `delete_customer_records`. A destructive tool silently classified harmless is
    // the worst direction for that mistake to go.
    for (const name of ['delete_customer_records', 'drop_table', 'edit_file', 'run_migration']) {
      expect(isMutating(name), name).toBe(true)
    }
  })

  it('classifies snake_case reads correctly', () => {
    for (const name of ['read_file', 'list_directory', 'search_code', 'get_status']) {
      expect(isMutating(name), name).toBe(false)
    }
  })

  it('lets a leading read word win a mixed name', () => {
    // `show_migration_status` is a read; `run_and_read` is not.
    expect(isMutating('show_migration_status')).toBe(false)
    expect(isMutating('list_deployed_versions')).toBe(false)
    expect(isMutating('run_and_read_output')).toBe(true)
  })

  it('handles camelCase and kebab-case too', () => {
    expect(isMutating('deleteRecords')).toBe(true)
    expect(isMutating('read-file')).toBe(false)
  })
})

describe('tool classification, hard cases', () => {
  it('catches inflected forms that a stem list would miss', () => {
    // `migrate` as a stem does not prefix-match `migration`, and prefix matching would
    // classify `get_dropdown_options` as destructive. Explicit forms avoid both.
    expect(isMutating('run_migrations')).toBe(true)
    expect(isMutating('apply_migration')).toBe(true)
    expect(isMutating('get_dropdown_options')).toBe(false)
  })

  it('resolves a mixed name by whichever verb leads', () => {
    // Tool names read verb-then-object.
    expect(isMutating('show_migration_status')).toBe(false)
    expect(isMutating('run_and_read_output')).toBe(true)
    expect(isMutating('list_deployed_versions')).toBe(false)
    expect(isMutating('update_and_list')).toBe(true)
  })

  it('treats an unclassifiable name as non-mutating', () => {
    // Nothing to go on. Guessing "destructive" would fire the risk detectors on every
    // unfamiliar tool and train people to ignore them.
    expect(isMutating('frobnicate')).toBe(false)
  })
})

describe('readability', () => {
  it('shows paths relative to the workspace, not sixty characters of temp prefix', () => {
    // A timeline where every line begins with a hashed worktree path is one nobody reads.
    const t = new Trajectory({ ...meta(), workspaceRoot: '/tmp/ctxmux-worktrees/abc123' })
    t.tool('Read', { file_path: '/tmp/ctxmux-worktrees/abc123/src/text.js' })
    expect(t.render()).toContain('src/text.js')
    expect(t.render()).not.toContain('ctxmux-worktrees')
  })

  it('handles the /private prefix macOS resolves temp paths to', () => {
    const t = new Trajectory({ ...meta(), workspaceRoot: '/tmp/wt' })
    t.tool('Read', { file_path: '/private/tmp/wt/src/a.ts' })
    expect(t.describe(t.all[0]!)).toBe('src/a.ts')
  })

  it('leaves paths alone when there is no workspace to relativise against', () => {
    const t = new Trajectory(meta())
    t.tool('Read', { file_path: '/some/absolute/path.ts' })
    expect(t.describe(t.all[0]!)).toBe('/some/absolute/path.ts')
  })

  it('records which agent it turned out to be', () => {
    // The trajectory is created before the agent is resolved, so attribution happens after.
    const t = new Trajectory({ ...meta(), agentId: 'pending' })
    t.attribute('claude-code', '/tmp/wt')
    expect(t.meta.agentId).toBe('claude-code')
    expect(t.meta.workspaceRoot).toBe('/tmp/wt')
  })
})
