/**
 * Atlassian Document Format to markdown.
 *
 * ADF is a nested node tree, and the usual shortcut — walk it collecting `text` nodes — throws
 * away every piece of structure that mattered: the list that was the acceptance criteria, the
 * table that was the test matrix, the code block that was the expected output. An agent given
 * the flattened version has to guess at requirements that were perfectly clear in Jira.
 *
 * Attachments get particular care. For UI work a screenshot is frequently the entire
 * specification, and rendering it as `[image]` silently discards the requirement.
 */

export interface AdfNode {
  type: string
  text?: string
  content?: AdfNode[]
  attrs?: Record<string, unknown>
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
}

export interface AdfDocument {
  type: 'doc'
  version: number
  content?: AdfNode[]
}

export interface ConvertResult {
  markdown: string
  /** Media referenced in the document, so the caller can fetch and re-host them. */
  media: Array<{ id: string; alt: string }>
}

function applyMarks(text: string, marks: AdfNode['marks']): string {
  if (!marks?.length) return text
  let out = text
  for (const mark of marks) {
    switch (mark.type) {
      case 'strong':
        out = `**${out}**`
        break
      case 'em':
        out = `_${out}_`
        break
      case 'code':
        out = `\`${out}\``
        break
      case 'strike':
        out = `~~${out}~~`
        break
      case 'link': {
        const href = mark.attrs?.['href']
        if (typeof href === 'string') out = `[${out}](${href})`
        break
      }
    }
  }
  return out
}

class Converter {
  readonly media: ConvertResult['media'] = []

  /** Render a node's children as inline text. */
  private inline(nodes: AdfNode[] | undefined): string {
    if (!nodes) return ''
    return nodes.map((n) => this.node(n, 0, true)).join('')
  }

  private listItems(node: AdfNode, depth: number, ordered: boolean): string {
    const indent = '  '.repeat(depth)
    return (node.content ?? [])
      .map((item, index) => {
        const marker = ordered ? `${index + 1}.` : '-'
        // A list item holds blocks. The first sits on the marker line; the rest are indented
        // under it, which is what keeps a nested list nested instead of flattening.
        const blocks = (item.content ?? []).map((child) => this.node(child, depth + 1, false).trim())
        const [head = '', ...rest] = blocks
        const tail = rest.filter(Boolean).map((b) =>
          b.split('\n').map((line) => `${indent}  ${line}`).join('\n'),
        )
        return [`${indent}${marker} ${head}`, ...tail].join('\n')
      })
      .join('\n')
  }

  node(node: AdfNode, depth = 0, inline = false): string {
    switch (node.type) {
      case 'doc':
        return (node.content ?? []).map((n) => this.node(n, depth)).filter(Boolean).join('\n\n')

      case 'text':
        return applyMarks(node.text ?? '', node.marks)

      case 'hardBreak':
        return '\n'

      case 'paragraph':
        return this.inline(node.content)

      case 'heading': {
        const level = Number(node.attrs?.['level'] ?? 3)
        return `${'#'.repeat(Math.min(Math.max(level, 1), 6))} ${this.inline(node.content)}`
      }

      case 'bulletList':
        return this.listItems(node, depth, false)

      case 'orderedList':
        return this.listItems(node, depth, true)

      case 'listItem':
        return (node.content ?? []).map((n) => this.node(n, depth)).join('\n')

      case 'taskList':
        return (node.content ?? []).map((n) => this.node(n, depth)).join('\n')

      case 'taskItem': {
        const done = node.attrs?.['state'] === 'DONE'
        return `${'  '.repeat(depth)}- [${done ? 'x' : ' '}] ${this.inline(node.content)}`
      }

      case 'codeBlock': {
        const language = typeof node.attrs?.['language'] === 'string' ? node.attrs['language'] : ''
        const code = (node.content ?? []).map((n) => n.text ?? '').join('')
        return `\`\`\`${language}\n${code}\n\`\`\``
      }

      case 'blockquote':
        return (node.content ?? [])
          .map((n) => this.node(n, depth))
          .join('\n\n')
          .split('\n')
          .map((line) => `> ${line}`)
          .join('\n')

      case 'rule':
        return '---'

      case 'table': {
        const rows = (node.content ?? []).map((row) =>
          (row.content ?? []).map((cell) =>
            (cell.content ?? []).map((n) => this.node(n, depth)).join(' ').replace(/\|/g, '\\|').trim(),
          ),
        )
        if (rows.length === 0) return ''
        const [header = [], ...body] = rows
        return [
          `| ${header.join(' | ')} |`,
          `| ${header.map(() => '---').join(' | ')} |`,
          ...body.map((r) => `| ${r.join(' | ')} |`),
        ].join('\n')
      }

      case 'panel': {
        const kind = String(node.attrs?.['panelType'] ?? 'info').toUpperCase()
        const inner = (node.content ?? []).map((n) => this.node(n, depth)).join('\n\n')
        return `> **${kind}**\n${inner.split('\n').map((l) => `> ${l}`).join('\n')}`
      }

      case 'media': {
        const id = String(node.attrs?.['id'] ?? '')
        const alt = String(node.attrs?.['alt'] ?? node.attrs?.['title'] ?? 'attachment')
        if (id) this.media.push({ id, alt })
        // Named explicitly, so a reader can tell an image was part of the spec even if the
        // pipeline could not fetch it.
        return `![${alt}](attachment:${id})`
      }

      case 'mediaSingle':
      case 'mediaGroup':
        return (node.content ?? []).map((n) => this.node(n, depth)).join('\n')

      case 'inlineCard':
      case 'blockCard': {
        const url = node.attrs?.['url']
        return typeof url === 'string' ? `<${url}>` : ''
      }

      case 'mention':
        return `@${node.attrs?.['text'] ?? node.attrs?.['id'] ?? 'someone'}`

      case 'emoji':
        return String(node.attrs?.['text'] ?? node.attrs?.['shortName'] ?? '')

      case 'status':
        return `\`${node.attrs?.['text'] ?? ''}\``

      case 'date': {
        const ts = Number(node.attrs?.['timestamp'])
        return Number.isFinite(ts) ? new Date(ts).toISOString().slice(0, 10) : ''
      }

      default:
        // Unknown node types keep their children rather than vanishing. ADF gains node types
        // over time, and dropping one silently loses a requirement.
        return node.content ? (node.content ?? []).map((n) => this.node(n, depth, inline)).join(inline ? '' : '\n') : ''
    }
  }
}

export function adfToMarkdown(doc: AdfDocument | AdfNode | null | undefined): ConvertResult {
  if (!doc || typeof doc !== 'object') return { markdown: '', media: [] }
  const converter = new Converter()
  const markdown = converter.node(doc as AdfNode).replace(/\n{3,}/g, '\n\n').trim()
  return { markdown, media: converter.media }
}

/**
 * Markdown to ADF, for writing comments back to Jira.
 *
 * Deliberately not a general markdown parser — it handles the shapes contextmux actually emits:
 * gate summaries (a bullet list), the hint under a failing gate (a fenced block of real test
 * output), and prose. Everything else degrades to a paragraph.
 *
 * It exists because the previous version joined every line of a comment into one, which turned
 * the single most valuable thing this tool posts — the output of the test that failed — into an
 * unreadable line of literal backticks. The converter in the other direction is written
 * specifically to preserve that structure; doing the opposite on the way out was the same
 * mistake, facing the other way.
 */
export function markdownToAdf(text: string): AdfDocument {
  const content = blocks(text.replace(/\r\n/g, '\n').split('\n'))
  return { type: 'doc', version: 1, content: content.length ? content : [{ type: 'paragraph' }] }
}

/**
 * Parse lines into ADF blocks.
 *
 * Recursive, because a list item holds blocks rather than text — and the block that matters is
 * the fenced one. A gate reports its failure as a bullet with the command's real output
 * indented beneath it, so treating an item's continuation lines as flat text is exactly the
 * case that has to work.
 */
function blocks(lines: string[]): AdfNode[] {
  const out: AdfNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]!

    if (!line.trim()) {
      i += 1
      continue
    }

    // Fenced code: taken verbatim to the closing fence, or to the end if it never comes.
    const fence = /^\s*```(\S*)\s*$/.exec(line)
    if (fence) {
      const language = fence[1] ?? ''
      const body: string[] = []
      i += 1
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i]!)) {
        body.push(lines[i]!)
        i += 1
      }
      i += 1 // past the closing fence
      out.push({
        type: 'codeBlock',
        ...(language ? { attrs: { language } } : {}),
        content: [{ type: 'text', text: dedent(body).join('\n') }],
      })
      continue
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      out.push({
        type: 'heading',
        attrs: { level: heading[1]!.length },
        content: inlineNodes(heading[2]!),
      })
      i += 1
      continue
    }

    if (isBullet(line)) {
      const items: AdfNode[] = []
      while (i < lines.length && isBullet(lines[i]!)) {
        const own = [stripBullet(lines[i]!)]
        i += 1
        // Anything indented under the marker belongs to this item, fences included.
        while (i < lines.length && isContinuation(lines[i]!) && !isBullet(lines[i]!)) {
          own.push(lines[i]!)
          i += 1
        }
        items.push({ type: 'listItem', content: blocks(dedentAfterFirst(own)) })
      }
      out.push({ type: 'bulletList', content: items })
      continue
    }

    // Prose: everything up to a blank line, keeping its line breaks.
    const para: string[] = []
    while (
      i < lines.length &&
      lines[i]!.trim() &&
      !isBullet(lines[i]!) &&
      !/^\s*```/.test(lines[i]!) &&
      !/^#{1,6}\s/.test(lines[i]!)
    ) {
      para.push(lines[i]!)
      i += 1
    }
    if (para.length) out.push({ type: 'paragraph', content: inlineNodes(para.join('\n')) })
  }

  return out
}

/** The item's own text keeps its position; its continuation lines lose the shared indent. */
function dedentAfterFirst(lines: string[]): string[] {
  const [first = '', ...rest] = lines
  return [first, ...dedent(rest)]
}

const isBullet = (line: string): boolean => /^\s*[-*+]\s+/.test(line)
const isContinuation = (line: string): boolean => /^\s+\S/.test(line)
const stripBullet = (line: string): string => line.replace(/^\s*[-*+]\s+/, '')

/** Remove the indentation shared by every line, so an indented fence keeps its own shape. */
function dedent(lines: string[]): string[] {
  const widths = lines
    .filter((l) => l.trim())
    .map((l) => l.length - l.trimStart().length)
  const shared = widths.length ? Math.min(...widths) : 0
  return lines.map((l) => l.slice(shared))
}

/**
 * Inline text with its marks, and real line breaks.
 *
 * ADF has no newline inside a text node — a literal one is dropped by the renderer — so each
 * break becomes a `hardBreak`. That is the difference between a stack trace being readable and
 * being one long line.
 */
function inlineNodes(text: string): AdfNode[] {
  const out: AdfNode[] = []
  const lines = text.split('\n')

  lines.forEach((line, index) => {
    if (index > 0) out.push({ type: 'hardBreak' })
    out.push(...markedText(line))
  })

  return out
}

/** The inline syntax this tool emits: `code`, **strong**, _em_ and links. */
const INLINE = /(`[^`]+`|\*\*[^*]+\*\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/

function markedText(line: string): AdfNode[] {
  const out: AdfNode[] = []

  for (const piece of line.split(INLINE)) {
    if (!piece) continue

    if (piece.startsWith('`') && piece.endsWith('`') && piece.length > 2) {
      out.push({ type: 'text', text: piece.slice(1, -1), marks: [{ type: 'code' }] })
    } else if (piece.startsWith('**') && piece.endsWith('**') && piece.length > 4) {
      out.push({ type: 'text', text: piece.slice(2, -2), marks: [{ type: 'strong' }] })
    } else if (piece.startsWith('_') && piece.endsWith('_') && piece.length > 2) {
      out.push({ type: 'text', text: piece.slice(1, -1), marks: [{ type: 'em' }] })
    } else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(piece)
      if (link) {
        out.push({
          type: 'text',
          text: link[1]!,
          marks: [{ type: 'link', attrs: { href: link[2]! } }],
        })
      } else {
        out.push({ type: 'text', text: piece })
      }
    }
  }

  return out.length ? out : [{ type: 'text', text: '' }]
}
