/**
 * YAML frontmatter parsing and serialisation.
 *
 * Deliberately strict about the opening delimiter (a file either starts with `---` on line 1
 * or has no frontmatter at all) because "almost frontmatter" is a common authoring mistake
 * that otherwise fails silently and strips a document's configuration.
 */
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'

export interface Frontmatter {
  data: Record<string, unknown>
  body: string
  /** True when a delimiter block was present, even if it parsed to an empty object. */
  had: boolean
}

const OPEN = /^---\r?\n/
const CLOSE = /\r?\n---[ \t]*(?:\r?\n|$)/

export function parseFrontmatter(raw: string, filename = '<input>'): Frontmatter {
  const text = raw.replace(/^﻿/, '')
  if (!OPEN.test(text)) return { data: {}, body: text.trim(), had: false }

  const afterOpen = text.replace(OPEN, '')
  const close = CLOSE.exec(afterOpen)
  if (!close) {
    throw new ContextParseError(
      `${filename}: frontmatter opened with "---" but never closed. Add a closing "---" line.`,
    )
  }

  const yamlSrc = afterOpen.slice(0, close.index)
  const body = afterOpen.slice(close.index + close[0].length)

  let data: unknown
  try {
    data = parseYaml(yamlSrc) ?? {}
  } catch (err) {
    throw new ContextParseError(
      `${filename}: frontmatter is not valid YAML — ${(err as Error).message}`,
    )
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new ContextParseError(`${filename}: frontmatter must be a YAML mapping.`)
  }

  return { data: data as Record<string, unknown>, body: body.trim(), had: true }
}

/** Serialise frontmatter + body. Keys are emitted in the order given, not alphabetically. */
export function serializeFrontmatter(data: Record<string, unknown>, body: string): string {
  const clean = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined && v !== null),
  )
  if (Object.keys(clean).length === 0) return `${body.trim()}\n`
  const yaml = stringifyYaml(clean, { lineWidth: 0 }).trimEnd()
  return `---\n${yaml}\n---\n\n${body.trim()}\n`
}

export class ContextParseError extends Error {
  override name = 'ContextParseError'
}
