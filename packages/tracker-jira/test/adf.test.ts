import { describe, expect, it } from 'vitest'
import { adfToMarkdown, markdownToAdf, type AdfDocument } from '../src/adf.js'

const doc = (...content: unknown[]): AdfDocument => ({ type: 'doc', version: 1, content: content as never })
const text = (t: string, marks?: unknown[]) => ({ type: 'text', text: t, ...(marks ? { marks } : {}) })
const para = (...content: unknown[]) => ({ type: 'paragraph', content })
const md = (d: AdfDocument) => adfToMarkdown(d).markdown

describe('inline formatting', () => {
  it('carries marks through', () => {
    expect(md(doc(para(text('bold', [{ type: 'strong' }]))))).toBe('**bold**')
    expect(md(doc(para(text('em', [{ type: 'em' }]))))).toBe('_em_')
    expect(md(doc(para(text('x', [{ type: 'code' }]))))).toBe('`x`')
    expect(md(doc(para(text('gone', [{ type: 'strike' }]))))).toBe('~~gone~~')
  })

  it('renders links', () => {
    const out = md(doc(para(text('docs', [{ type: 'link', attrs: { href: 'https://x.test' } }]))))
    expect(out).toBe('[docs](https://x.test)')
  })

  it('joins inline runs without inserting breaks', () => {
    expect(md(doc(para(text('Hello '), text('world', [{ type: 'strong' }]))))).toBe('Hello **world**')
  })
})

describe('structure', () => {
  it('preserves headings at their level', () => {
    const out = md(doc({ type: 'heading', attrs: { level: 2 }, content: [text('Acceptance criteria')] }))
    expect(out).toBe('## Acceptance criteria')
  })

  it('preserves bullet lists, which is usually where the requirements live', () => {
    // Flattening this is how an agent loses the acceptance criteria entirely.
    const out = md(
      doc({
        type: 'bulletList',
        content: [
          { type: 'listItem', content: [para(text('first'))] },
          { type: 'listItem', content: [para(text('second'))] },
        ],
      }),
    )
    expect(out).toBe('- first\n- second')
  })

  it('numbers ordered lists', () => {
    const out = md(
      doc({
        type: 'orderedList',
        content: [
          { type: 'listItem', content: [para(text('one'))] },
          { type: 'listItem', content: [para(text('two'))] },
        ],
      }),
    )
    expect(out).toBe('1. one\n2. two')
  })

  it('keeps nested lists nested', () => {
    const out = md(
      doc({
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              para(text('outer')),
              { type: 'bulletList', content: [{ type: 'listItem', content: [para(text('inner'))] }] },
            ],
          },
        ],
      }),
    )
    expect(out).toContain('- outer')
    expect(out).toContain('  - inner')
  })

  it('renders task lists as checkboxes', () => {
    const out = md(
      doc({
        type: 'taskList',
        content: [
          { type: 'taskItem', attrs: { state: 'DONE' }, content: [text('done thing')] },
          { type: 'taskItem', attrs: { state: 'TODO' }, content: [text('todo thing')] },
        ],
      }),
    )
    expect(out).toContain('- [x] done thing')
    expect(out).toContain('- [ ] todo thing')
  })

  it('preserves code blocks with their language', () => {
    const out = md(doc({ type: 'codeBlock', attrs: { language: 'ts' }, content: [text('const x = 1')] }))
    expect(out).toBe('```ts\nconst x = 1\n```')
  })

  it('renders tables as markdown tables', () => {
    const cell = (t: string) => ({ type: 'tableCell', content: [para(text(t))] })
    const out = md(
      doc({
        type: 'table',
        content: [
          { type: 'tableRow', content: [cell('input'), cell('expected')] },
          { type: 'tableRow', content: [cell('0'), cell('zero')] },
        ],
      }),
    )
    expect(out).toBe('| input | expected |\n| --- | --- |\n| 0 | zero |')
  })

  it('escapes pipes inside table cells', () => {
    const cell = (t: string) => ({ type: 'tableCell', content: [para(text(t))] })
    const out = md(doc({ type: 'table', content: [{ type: 'tableRow', content: [cell('a|b')] }] }))
    expect(out).toContain('a\\|b')
  })

  it('renders panels with their kind', () => {
    const out = md(doc({ type: 'panel', attrs: { panelType: 'warning' }, content: [para(text('careful'))] }))
    expect(out).toContain('**WARNING**')
    expect(out).toContain('> careful')
  })

  it('renders blockquotes', () => {
    expect(md(doc({ type: 'blockquote', content: [para(text('quoted'))] }))).toBe('> quoted')
  })
})

describe('attachments', () => {
  it('names media rather than discarding it', () => {
    // For UI work a screenshot is often the whole specification. Rendering it as "[image]"
    // silently throws the requirement away.
    const result = adfToMarkdown(
      doc({
        type: 'mediaSingle',
        content: [{ type: 'media', attrs: { id: 'abc123', alt: 'expected layout' } }],
      }),
    )
    expect(result.markdown).toBe('![expected layout](attachment:abc123)')
    expect(result.media).toEqual([{ id: 'abc123', alt: 'expected layout' }])
  })
})

describe('robustness', () => {
  it('keeps the children of an unknown node type', () => {
    // ADF gains node types over time. Dropping an unrecognised one loses a requirement.
    const out = md(doc({ type: 'somethingNewIn2027', content: [para(text('still important'))] }))
    expect(out).toContain('still important')
  })

  it('handles an empty or absent document', () => {
    expect(adfToMarkdown(null).markdown).toBe('')
    expect(adfToMarkdown(undefined).markdown).toBe('')
    expect(md(doc())).toBe('')
  })

  it('renders mentions, status chips and dates readably', () => {
    expect(md(doc(para({ type: 'mention', attrs: { text: 'Ada' } })))).toBe('@Ada')
    expect(md(doc(para({ type: 'status', attrs: { text: 'BLOCKED' } })))).toBe('`BLOCKED`')
    expect(md(doc(para({ type: 'date', attrs: { timestamp: '1767225600000' } })))).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('collapses runaway blank lines', () => {
    const out = md(doc(para(text('a')), para(text('')), para(text('')), para(text('b'))))
    expect(out).not.toMatch(/\n{3}/)
  })
})

describe('markdownToAdf', () => {
  it('produces a valid document for writing comments back', () => {
    const adf = markdownToAdf('First paragraph.\n\nSecond paragraph.')
    expect(adf.type).toBe('doc')
    expect(adf.version).toBe(1)
    expect(adf.content).toHaveLength(2)
  })
})

describe('writing a comment back to Jira', () => {
  /** What the machine actually posts when a verify gate fails — a bullet with real output. */
  const GATE_COMMENT = [
    'The following checks failed. Fix them without changing anything else:',
    '',
    '- **quality-gate**: `pnpm test` failed with exit code 1',
    '  Output:',
    '  ```',
    '  FAIL src/money.test.ts',
    '    expected 3 to be 4',
    '  ```',
  ].join('\n')

  const kinds = (nodes: AdfDocument['content']) => (nodes ?? []).map((n) => n.type)

  it('keeps the failing output as a code block', () => {
    /*
     * The single most valuable thing this tool posts to a tracker. Joining every line into one
     * turned it into an unreadable string of literal backticks — the exact flattening the
     * converter in the other direction is written to avoid, done on the way out instead.
     */
    const adf = markdownToAdf(GATE_COMMENT)

    expect(kinds(adf.content)).toEqual(['paragraph', 'bulletList'])

    const item = adf.content![1]!.content![0]!
    expect(kinds(item.content)).toEqual(['paragraph', 'codeBlock'])

    const code = item.content![1]!.content![0]!.text
    expect(code).toContain('FAIL src/money.test.ts')
    // The indentation inside the block is what makes a stack trace readable.
    expect(code).toContain('  expected 3 to be 4')
  })

  it('survives a round trip through the reader', () => {
    const back = adfToMarkdown(markdownToAdf(GATE_COMMENT)).markdown

    expect(back).toContain('- **quality-gate**')
    expect(back).toContain('```')
    expect(back).toContain('FAIL src/money.test.ts')
  })

  it('turns a line break into a hardBreak rather than dropping it', () => {
    // ADF renders no newline inside a text node, so a literal one simply disappears.
    const adf = markdownToAdf('Line one\nLine two')
    const para = adf.content![0]!

    expect(kinds(para.content)).toEqual(['text', 'hardBreak', 'text'])
  })

  it('carries the inline marks this tool emits', () => {
    const adf = markdownToAdf('Run `pnpm test` and read the **output**, see [docs](https://x.dev).')
    const marks = (adf.content![0]!.content ?? [])
      .flatMap((n) => n.marks ?? [])
      .map((m) => m.type)

    expect(marks).toEqual(['code', 'strong', 'link'])
  })

  it('keeps a fenced block that stands on its own', () => {
    const adf = markdownToAdf('Before.\n\n```ts\nconst x = 1\n```\n\nAfter.')

    expect(kinds(adf.content)).toEqual(['paragraph', 'codeBlock', 'paragraph'])
    expect(adf.content![1]!.attrs?.['language']).toBe('ts')
  })

  it('does not choke on a fence that was never closed', () => {
    const adf = markdownToAdf('Output:\n```\nhalf a stack trace')

    expect(kinds(adf.content)).toEqual(['paragraph', 'codeBlock'])
    expect(adf.content![1]!.content![0]!.text).toBe('half a stack trace')
  })

  it('renders a heading as a heading', () => {
    const adf = markdownToAdf('## Summary\n\nIt worked.')

    expect(kinds(adf.content)).toEqual(['heading', 'paragraph'])
    expect(adf.content![0]!.attrs?.['level']).toBe(2)
  })

  it('always produces a document, even from nothing', () => {
    // An empty comment body is not worth throwing over, but a `doc` with no content is invalid.
    const adf = markdownToAdf('   \n\n  ')

    expect(adf.type).toBe('doc')
    expect(adf.content).toHaveLength(1)
  })
})
