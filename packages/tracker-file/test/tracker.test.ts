import { promises as fs } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { runTrackerContract } from '@contextmux/core'
import { extractAcceptanceCriteria, FileTracker, inlineTask } from '../src/index.js'

let dir: string
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ctxmux-tracker-'))
})
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true })
})

async function task(name: string, content: string): Promise<void> {
  const p = path.join(dir, '.ctxmux/tasks', name)
  await fs.mkdir(path.dirname(p), { recursive: true })
  await fs.writeFile(p, content, 'utf8')
}

describe('acceptance criteria extraction', () => {
  it('reads a list under an acceptance criteria heading', () => {
    const body = [
      'Some background.',
      '',
      '## Acceptance criteria',
      '- The helper formats a number',
      '- The summary uses it',
      '',
      '## Notes',
      '- not a criterion',
    ].join('\n')
    expect(extractAcceptanceCriteria(body)).toEqual([
      'The helper formats a number',
      'The summary uses it',
    ])
  })

  it('accepts the headings people actually write', () => {
    for (const heading of ['## Requirements', '### Done when', '# Acceptance']) {
      expect(extractAcceptanceCriteria(`${heading}\n- a thing`)).toEqual(['a thing'])
    }
  })

  it('handles checkboxes and numbered lists', () => {
    const body = '## Acceptance criteria\n- [ ] first\n- [x] second\n1. third'
    expect(extractAcceptanceCriteria(body)).toEqual(['first', 'second', 'third'])
  })

  it('returns nothing when there is no such section', () => {
    expect(extractAcceptanceCriteria('Just prose.\n\n- a bullet')).toEqual([])
  })
})

describe('FileTracker', () => {
  it('reads a task file into a spec', async () => {
    await task(
      'T-1.md',
      [
        '---',
        'id: T-1',
        'title: Add a formatter',
        'status: todo',
        'labels: [agent-ok]',
        'estimate: 2',
        'scope:',
        '  allow: ["src/**"]',
        '  deny: ["src/legacy/**"]',
        '  maxFiles: 5',
        'qualityGate: ["pnpm test"]',
        '---',
        '',
        'Format currency values.',
        '',
        '## Acceptance criteria',
        '- A helper exists',
      ].join('\n'),
    )

    const tracker = new FileTracker({ root: dir })
    const spec = await tracker.get('T-1')

    expect(spec?.title).toBe('Add a formatter')
    expect(spec?.labels).toEqual(['agent-ok'])
    expect(spec?.scope).toEqual({ allow: ['src/**'], deny: ['src/legacy/**'], maxFiles: 5 })
    expect(spec?.qualityGate).toEqual(['pnpm test'])
    expect(spec?.acceptanceCriteria.map((c) => c.text)).toEqual(['A helper exists'])
    expect(spec?.estimate).toBe(2)
  })

  it('lists only tasks that are ready to start', async () => {
    await task('a.md', '---\nid: a\nstatus: todo\n---\nA')
    await task('b.md', '---\nid: b\nstatus: done\n---\nB')
    await task('c.md', '---\nid: c\nstatus: in-progress\n---\nC')

    const ready = await new FileTracker({ root: dir }).listReady()
    expect(ready.map((t) => t.id)).toEqual(['a'])
  })

  it('falls back to the filename when no id is declared', async () => {
    await task('no-id.md', 'Just a body.')
    expect((await new FileTracker({ root: dir }).get('no-id'))?.id).toBe('no-id')
  })

  it('applies a default quality gate when the task does not specify one', async () => {
    await task('t.md', '---\nid: t\n---\nBody')
    const tracker = new FileTracker({ root: dir, defaultQualityGate: ['pnpm test'] })
    expect((await tracker.get('t'))?.qualityGate).toEqual(['pnpm test'])
  })

  it('degrades to a bodyless spec rather than losing a task with broken frontmatter', async () => {
    await task('bad.md', '---\nid: [unclosed\n---\nStill has a body.')
    const spec = await new FileTracker({ root: dir }).get('bad')
    expect(spec).not.toBeNull()
    expect(spec?.body).toContain('Still has a body.')
  })

  it('updates status in place, leaving the rest of the file alone', async () => {
    await task('t.md', '---\nid: t\nstatus: todo\ntitle: Keep me\n---\n\nBody text.')
    const tracker = new FileTracker({ root: dir })
    await tracker.transition('t', 'in_review')

    const raw = await fs.readFile(path.join(dir, '.ctxmux/tasks/t.md'), 'utf8')
    expect(raw).toContain('status: in-review')
    expect(raw).toContain('title: Keep me')
    expect(raw).toContain('Body text.')
  })

  it('adds a status field to a file that has none', async () => {
    await task('t.md', '---\nid: t\n---\nBody')
    await new FileTracker({ root: dir }).transition('t', 'done')
    expect(await fs.readFile(path.join(dir, '.ctxmux/tasks/t.md'), 'utf8')).toContain('status: done')
  })

  it('writes comments to a log beside the task, so history is reviewable in git', async () => {
    await task('t.md', '---\nid: t\n---\nBody')
    const tracker = new FileTracker({ root: dir })
    await tracker.comment('t', 'first note')
    await tracker.comment('t', 'second note')

    const log = await fs.readFile(path.join(dir, '.ctxmux/tasks/t.log.md'), 'utf8')
    expect(log).toContain('first note')
    expect(log).toContain('second note')
  })

  it('merges labels rather than replacing them', async () => {
    await task('t.md', '---\nid: t\nlabels: [keep]\n---\nBody')
    const tracker = new FileTracker({ root: dir })
    await tracker.setLabels('t', ['needs-human'], [])

    const spec = await tracker.get('t')
    expect(spec?.labels.sort()).toEqual(['keep', 'needs-human'])
  })

  it('resolves a task by path as well as by id', async () => {
    await task('T-9.md', '---\nid: T-9\n---\nBody')
    const tracker = new FileTracker({ root: dir })
    expect((await tracker.get('.ctxmux/tasks/T-9.md'))?.id).toBe('T-9')
  })
})

describe('inlineTask', () => {
  it('builds a runnable spec from a sentence', () => {
    const spec = inlineTask('Add a helper that formats dates')
    expect(spec.title).toBe('Add a helper that formats dates')
    expect(spec.origin.tracker).toBe('inline')
  })

  it('picks up criteria written inline', () => {
    const spec = inlineTask('Do a thing\n\n## Acceptance criteria\n- it works')
    expect(spec.acceptanceCriteria.map((c) => c.text)).toEqual(['it works'])
  })
})

describe('FileTracker contract', () => {
  runTrackerContract(
    { it, expect: expect as never },
    {
      setup: async () => {
        await task('C-1.md', '---\nid: C-1\ntitle: Contract task\nstatus: todo\nlabels: [seed]\n---\n\nBody.')
        return { tracker: new FileTracker({ root: dir }), taskId: 'C-1' }
      },
    },
  )
})

describe('frontmatter edits', () => {
  it('does not rewrite a line of prose that happens to start with the key', async () => {
    /*
     * A multiline regex over the whole file finds the first line beginning with `status:`, and
     * in a bug report that is very often a sentence. The description was rewritten to
     * `status: in-progress`, and because the real field was never touched, the run's state was
     * not recorded either — a corrupted task and a lost transition from one edit.
     */
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ctxmux-tasks-'))
    const file = path.join(dir, 'T-1.md')
    await fs.writeFile(
      file,
      [
        '---',
        'id: T-1',
        'title: Fix the health endpoint',
        '---',
        '',
        '## Problem',
        '',
        'status: currently returns a 500 when the database is unreachable.',
        '',
      ].join('\n'),
      'utf8',
    )

    const tracker = new FileTracker({ root: dir, dir: '.' })
    await tracker.transition('T-1', 'in_progress')

    const after = await fs.readFile(file, 'utf8')
    expect(after).toContain('status: currently returns a 500 when the database is unreachable.')
    expect(after).toContain('status: in-progress')

    const reread = await tracker.get('T-1')
    expect(reread?.title).toBe('Fix the health endpoint')

    await fs.rm(dir, { recursive: true, force: true })
  })

  it('updates the field in place when it is already there', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ctxmux-tasks-'))
    const file = path.join(dir, 'T-2.md')
    await fs.writeFile(file, '---\nid: T-2\nstatus: todo\n---\n\nBody.\n', 'utf8')

    const tracker = new FileTracker({ root: dir, dir: '.' })
    await tracker.transition('T-2', 'done')

    const after = await fs.readFile(file, 'utf8')
    expect(after).toContain('status: done')
    expect(after).not.toContain('status: todo')
    // Everything a person wrote is still there, byte for byte.
    expect(after).toContain('id: T-2')
    expect(after).toContain('Body.')

    await fs.rm(dir, { recursive: true, force: true })
  })

  it('keeps labels out of the body too', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ctxmux-tasks-'))
    const file = path.join(dir, 'T-3.md')
    await fs.writeFile(
      file,
      '---\nid: T-3\n---\n\nThe CSS has `labels: none` set, which is the bug.\n',
      'utf8',
    )

    const tracker = new FileTracker({ root: dir, dir: '.' })
    await tracker.setLabels('T-3', ['agent-ready'], [])

    const after = await fs.readFile(file, 'utf8')
    expect(after).toContain('The CSS has `labels: none` set, which is the bug.')
    expect(after).toContain('labels: [agent-ready]')

    await fs.rm(dir, { recursive: true, force: true })
  })
})

describe('ids that point outside the repository', () => {
  it('will not read a task file from outside the root', async () => {
    /*
     * An id is a string from outside — a `--task` argument, a workflow_dispatch input — and
     * both lookups resolved it against the root, so `../outside.md` addressed a file in a
     * different repository. The context writer already refuses to resolve outside the root.
     */
    const outside = path.join(path.dirname(dir), `outside-${path.basename(dir)}.md`)
    await fs.writeFile(outside, '---\nid: SNEAK\nstatus: todo\n---\n\nSomebody else.\n', 'utf8')

    const tracker = new FileTracker({ root: dir })
    expect(await tracker.get(`../${path.basename(outside)}`)).toBeNull()
    expect(await tracker.get(outside)).toBeNull()

    await fs.rm(outside, { force: true })
  })

  it('will not rewrite a file outside the root', async () => {
    // Worse than reading: `transition` and `setLabels` rewrite the frontmatter of whatever
    // `resolvePath` hands back.
    const outside = path.join(path.dirname(dir), `outside-${path.basename(dir)}.md`)
    const original = '---\nid: SNEAK\nstatus: todo\n---\n\nSomebody else.\n'
    await fs.writeFile(outside, original, 'utf8')

    const tracker = new FileTracker({ root: dir })
    await tracker.transition(`../${path.basename(outside)}`, 'done')
    await tracker.setLabels(`../${path.basename(outside)}`, ['hijacked'], [])

    expect(await fs.readFile(outside, 'utf8')).toBe(original)
    await fs.rm(outside, { force: true })
  })

  it('still finds a task inside the root', async () => {
    await task('T-9.md', '---\nid: T-9\nstatus: todo\n---\n\n# Real task\n')
    const tracker = new FileTracker({ root: dir })
    expect((await tracker.get('T-9'))?.id).toBe('T-9')
  })
})
