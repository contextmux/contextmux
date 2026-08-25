import { describe, expect, it } from 'vitest'
import { extractSymbols, supportsSymbols } from '../src/symbols.js'

const names = (src: string, ext: string) => extractSymbols(src, ext).map((s) => s.name)
const find = (src: string, ext: string, name: string) =>
  extractSymbols(src, ext).find((s) => s.name === name)

describe('TypeScript', () => {
  const src = `
/** Formats a date for display. */
export function formatDate(d: Date): string { return '' }

export const useThing = () => {}
export interface Config { a: string }
export type Alias = string
export class Widget {}
function internal() {}
export const Button = () => null
`
  it('finds top-level declarations', () => {
    expect(names(src, '.ts')).toEqual(
      expect.arrayContaining(['formatDate', 'useThing', 'Config', 'Alias', 'Widget', 'internal', 'Button']),
    )
  })

  it('records export status', () => {
    expect(find(src, '.ts', 'formatDate')?.exported).toBe(true)
    expect(find(src, '.ts', 'internal')?.exported).toBe(false)
  })

  it('captures the doc comment above a declaration', () => {
    expect(find(src, '.ts', 'formatDate')?.doc).toBe('Formats a date for display.')
  })

  it('classifies hooks separately, since "is there already a hook for this" is a common question', () => {
    expect(find(src, '.ts', 'useThing')?.kind).toBe('hook')
  })

  it('classifies capitalised tsx declarations as components', () => {
    expect(find(src, '.tsx', 'Button')?.kind).toBe('component')
    expect(find(src, '.ts', 'Button')?.kind).not.toBe('component')
  })

  it('ignores nested declarations, which are noise in a map', () => {
    const nested = `export function outer() {\n  function inner() {}\n}`
    expect(names(nested, '.ts')).toEqual(['outer'])
  })

  it('records line numbers', () => {
    expect(find(src, '.ts', 'formatDate')?.line).toBe(3)
  })

  it('deduplicates overloads', () => {
    const overloaded = `export function f(a: string): void\nexport function f(a: number): void\nexport function f(a: any) {}`
    expect(names(overloaded, '.ts')).toEqual(['f'])
  })

  it('drops section-divider banners, which are formatting rather than documentation', () => {
    const banner = `// --- helpers ------------------------------\nexport function help() {}`
    expect(find(banner, '.ts', 'help')?.doc).toBeUndefined()
  })

  it('captures a line-comment doc', () => {
    const src2 = `// Does a useful thing.\nexport function useful() {}`
    expect(find(src2, '.ts', 'useful')?.doc).toBe('Does a useful thing.')
  })
})

describe('other languages', () => {
  it('handles Python top-level definitions only', () => {
    const py = `def top():\n    def nested():\n        pass\nclass Thing:\n    def method(self):\n        pass`
    expect(names(py, '.py')).toEqual(['top', 'Thing'])
  })

  it('handles Go, including methods with receivers', () => {
    const go = `func Handler() {}\nfunc (s *Server) Serve() {}\ntype Config struct {}\ntype Store interface {}`
    expect(names(go, '.go')).toEqual(expect.arrayContaining(['Handler', 'Serve', 'Config', 'Store']))
  })

  it('handles Rust visibility', () => {
    const rs = `pub fn open() {}\nfn private() {}\npub struct Db {}\npub trait Store {}`
    expect(find(rs, '.rs', 'open')?.exported).toBe(true)
    expect(find(rs, '.rs', 'private')?.exported).toBe(false)
    expect(names(rs, '.rs')).toEqual(expect.arrayContaining(['Db', 'Store']))
  })

  it('handles Kotlin and Java', () => {
    expect(names('class Foo {}\nfun bar() {}', '.kt')).toEqual(expect.arrayContaining(['Foo', 'bar']))
  })

  it('keeps indented members in languages whose behaviour lives inside a class', () => {
    // Applying the top-level-only rule here would leave the type names and none of the
    // methods, which is the opposite of useful.
    const kt = `class Repo {\n    fun findAll() {}\n}`
    expect(names(kt, '.kt')).toEqual(expect.arrayContaining(['Repo', 'findAll']))
    const rs = `impl Db {\n    pub fn query() {}\n}`
    expect(names(rs, '.rs')).toContain('query')
  })

  it('returns nothing for unsupported extensions', () => {
    expect(supportsSymbols('.md')).toBe(false)
    expect(extractSymbols('# heading', '.md')).toEqual([])
  })
})
