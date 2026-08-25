import { describe, expect, it } from 'vitest'
import { ContextParseError, parseFrontmatter, serializeFrontmatter } from '../src/frontmatter.js'

describe('parseFrontmatter', () => {
  it('parses frontmatter and body', () => {
    const r = parseFrontmatter('---\nname: foo\nglobs:\n  - "src/**"\n---\n\nBody text.')
    expect(r.had).toBe(true)
    expect(r.data).toEqual({ name: 'foo', globs: ['src/**'] })
    expect(r.body).toBe('Body text.')
  })

  it('treats a file without a leading delimiter as pure body', () => {
    const r = parseFrontmatter('# Heading\n\n---\n\nA horizontal rule is not frontmatter.')
    expect(r.had).toBe(false)
    expect(r.body).toContain('horizontal rule')
  })

  it('rejects an unterminated block rather than silently dropping config', () => {
    expect(() => parseFrontmatter('---\nname: foo\n\nbody', 'x.md')).toThrow(ContextParseError)
  })

  it('rejects a non-mapping frontmatter', () => {
    expect(() => parseFrontmatter('---\n- a\n- b\n---\nbody', 'x.md')).toThrow(/must be a YAML mapping/)
  })

  it('reports invalid YAML with the filename', () => {
    expect(() => parseFrontmatter('---\na: [1,\n---\nbody', 'skills/x/SKILL.md')).toThrow(
      /skills\/x\/SKILL\.md/,
    )
  })

  it('handles a BOM', () => {
    const r = parseFrontmatter('﻿---\nname: foo\n---\nbody')
    expect(r.data).toEqual({ name: 'foo' })
  })

  it('round-trips', () => {
    const data = { name: 'a-skill', description: 'Does a thing', globs: ['src/**/*.ts'] }
    const body = 'Some instructions.\n\nWith paragraphs.'
    const parsed = parseFrontmatter(serializeFrontmatter(data, body))
    expect(parsed.data).toEqual(data)
    expect(parsed.body).toBe(body)
  })

  it('omits empty frontmatter entirely rather than emitting an empty block', () => {
    expect(serializeFrontmatter({}, 'body')).toBe('body\n')
  })

  it('drops null and undefined keys', () => {
    const out = serializeFrontmatter({ a: 1, b: undefined, c: null }, 'body')
    expect(out).toContain('a: 1')
    expect(out).not.toContain('b:')
    expect(out).not.toContain('c:')
  })
})
