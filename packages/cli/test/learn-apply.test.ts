/**
 * `ctxmux learn --apply` writes into the user's context directory, which makes it the one
 * command here that can destroy work. These tests drive it against a real directory rather
 * than a double, because what is being checked is what ends up on disk.
 */
import { promises as fs } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseArgs } from '../src/args.js'
import { learnCommand } from '../src/commands/learn.js'

let root: string

/** Two observations of the same point, on different tasks — enough to count as recurring. */
function ledgerWith(text: string) {
  const signal = (n: number) => ({
    kind: 'review' as const,
    text,
    source: { runId: `run-T-${n}`, taskId: `T-${n}`, author: 'reviewer' },
    files: [],
    at: Date.now(),
  })
  return JSON.stringify({ version: 1, entries: {}, signals: [signal(1), signal(2)] })
}

async function seed(text: string): Promise<void> {
  await fs.mkdir(path.join(root, '.ctxmux', 'rules'), { recursive: true })
  await fs.mkdir(path.join(root, '.ctxmux', 'state'), { recursive: true })
  await fs.writeFile(path.join(root, '.ctxmux', 'state', 'learn.json'), ledgerWith(text), 'utf8')
}

/** Several distinct points, each observed on its own pair of tasks. */
async function seedSignals(points: Array<{ text: string; tasks: string[] }>): Promise<void> {
  await fs.mkdir(path.join(root, '.ctxmux', 'rules'), { recursive: true })
  await fs.mkdir(path.join(root, '.ctxmux', 'state'), { recursive: true })
  const signals = points.flatMap((p) =>
    p.tasks.map((taskId) => ({
      kind: 'review' as const,
      text: p.text,
      source: { runId: `run-${taskId}`, taskId, author: 'reviewer' },
      files: [],
      at: Date.now(),
    })),
  )
  await fs.writeFile(
    path.join(root, '.ctxmux', 'state', 'learn.json'),
    JSON.stringify({ version: 1, entries: {}, signals }),
    'utf8',
  )
}

/** Lessons the ledger believes were written into the context. */
async function appliedLessons(): Promise<string[]> {
  const state = JSON.parse(
    await fs.readFile(path.join(root, '.ctxmux', 'state', 'learn.json'), 'utf8'),
  ) as { entries: Record<string, { status: string; lesson: string }> }
  return Object.values(state.entries)
    .filter((e) => e.status === 'applied')
    .map((e) => e.lesson)
}

const learn = (line: string) => learnCommand(parseArgs([...line.split(' '), '--root', root]))

/** Files under `.ctxmux/rules`, which is where a new lesson lands. */
async function rules(): Promise<string[]> {
  return fs.readdir(path.join(root, '.ctxmux', 'rules')).catch(() => [])
}

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'ctxmux-learn-'))
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(async () => {
  vi.restoreAllMocks()
  await fs.rm(root, { recursive: true, force: true })
})

describe('learn --apply', () => {
  it('writes a recurring lesson as a rule', async () => {
    await seed('Always use the shared currency formatter')
    expect(await learn('learn --apply')).toBe(0)

    const written = await rules()
    expect(written).toHaveLength(1)

    const content = await fs.readFile(path.join(root, '.ctxmux', 'rules', written[0]!), 'utf8')
    expect(content).toContain('currency formatter')
  })

  it('does not let one lesson silently overwrite another', async () => {
    /*
     * A new rule is named from the lesson's own words, and a lesson made entirely of short
     * words has none to use — so it falls back to a fixed name. Two such lessons in one batch
     * resolved to the same path: the second write replaced the first, while the ledger recorded
     * both as applied. The lost one was then never proposed again, because as far as the ledger
     * was concerned it had already been written down.
     */
    await seedSignals([
      { text: 'Add a tag', tasks: ['T-1', 'T-2'] },
      { text: 'Log the fee', tasks: ['T-3', 'T-4'] },
    ])
    await learn('learn --apply')

    const written = await rules()
    const contents = await Promise.all(
      written.map((f) => fs.readFile(path.join(root, '.ctxmux', 'rules', f), 'utf8')),
    )
    const joined = contents.join('\n')

    // Whatever was written, nothing that was written is a lesson that another one replaced.
    const applied = await appliedLessons()
    for (const lesson of applied) {
      expect(joined, `"${lesson}" was marked applied`).toContain(lesson.replace(/\.$/, ''))
    }
  })

  it('preserves what a person wrote when it amends their rule', async () => {
    /*
     * Amending re-rendered the file from the parsed model, so anything the schema does not
     * model — pack provenance, most importantly — was dropped on the way out. The record of
     * where an installed skill came from is exactly the attribution that was promised when it
     * was installed.
     */
    await seed('Always use the shared currency formatter')
    await fs.writeFile(
      path.join(root, '.ctxmux', 'rules', 'formatting.md'),
      [
        '---',
        'name: formatting',
        'description: How to format currency in this codebase',
        'x-ctxmux-pack: ponytail',
        'x-ctxmux-license: MIT',
        '---',
        '',
        'Use the shared currency formatter.',
        '',
      ].join('\n'),
      'utf8',
    )

    expect(await learn('learn --apply')).toBe(0)

    const after = await fs.readFile(path.join(root, '.ctxmux', 'rules', 'formatting.md'), 'utf8')
    expect(after).toContain('x-ctxmux-pack: ponytail')
    expect(after).toContain('x-ctxmux-license: MIT')
    expect(after).toContain('Use the shared currency formatter.')
  })

  it('writes a rule whose frontmatter parses', async () => {
    /*
     * Frontmatter used to be built by interpolating the lesson into `key: value`. Review
     * comments contain colons all the time, and the result was a rule file that the loader then
     * rejected — so applying a lesson broke the context it was improving.
     */
    await seed('Note: prefer the shared helper over a local copy')
    expect(await learn('learn --apply')).toBe(0)

    const [name] = await rules()
    const content = await fs.readFile(path.join(root, '.ctxmux', 'rules', name!), 'utf8')

    const { parseFrontmatter } = await import('@contextmux/context')
    const parsed = parseFrontmatter(content, name!)
    expect(parsed.data['name']).toBeTruthy()
    expect(String(parsed.data['description'])).toContain('prefer the shared helper')
  })

  it('writes nothing without --apply', async () => {
    await seed('Always use the shared currency formatter')
    expect(await learn('learn')).toBe(0)
    expect(await rules()).toEqual([])
  })

  it('does not propose a lesson that was rejected', async () => {
    await seed('Always use the shared currency formatter')
    await learn('learn')

    const state = JSON.parse(
      await fs.readFile(path.join(root, '.ctxmux', 'state', 'learn.json'), 'utf8'),
    ) as { signals: Array<{ text: string }> }
    expect(state.signals).toHaveLength(2)
  })

  it('refuses a bad --min-tasks rather than ignoring it', async () => {
    await seed('Always use the shared currency formatter')
    await expect(learn('learn --min-tasks abc')).rejects.toThrow(/must be a number/)
  })
})

describe('naming', () => {
  it('gives two lessons with no usable words distinct files', async () => {
    // Both fall back to the same generated name, so without disambiguation they compete for one
    // path and only the last one survives.
    await seedSignals([
      { text: 'Add a tag', tasks: ['T-1', 'T-2'] },
      { text: 'Log the fee', tasks: ['T-3', 'T-4'] },
    ])
    await learn('learn --apply')

    expect(await rules()).toHaveLength(2)
  })

  it('keeps the same name when the same lesson is applied again', async () => {
    // The disambiguator is derived from the lesson's content, not from its position in a batch,
    // so re-running does not scatter renamed copies of a rule that already exists.
    await seedSignals([
      { text: 'Add a tag', tasks: ['T-1', 'T-2'] },
      { text: 'Log the fee', tasks: ['T-3', 'T-4'] },
    ])
    await learn('learn --apply')
    const first = (await rules()).sort()

    await seedSignals([
      { text: 'Add a tag', tasks: ['T-1', 'T-2'] },
      { text: 'Log the fee', tasks: ['T-3', 'T-4'] },
    ])
    await learn('learn --apply')

    expect((await rules()).sort()).toEqual(first)
  })
})
