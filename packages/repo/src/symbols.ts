/**
 * Symbol extraction.
 *
 * Deliberately regex-based rather than AST-based. The repo map is a *retrieval aid*, not a
 * compiler: a symbol that is occasionally mis-attributed costs a little ranking accuracy,
 * while a tree-sitter dependency costs native builds on every install and roughly an order of
 * magnitude in indexing time. Coverage and speed matter more than precision here.
 *
 * The seam is deliberate — `extractSymbols` can be swapped for an AST implementation per
 * language without any caller changing.
 */

export type SymbolKind =
  | 'function' | 'class' | 'interface' | 'type' | 'const'
  | 'component' | 'hook' | 'enum' | 'struct' | 'trait' | 'module'

export interface SymbolRef {
  name: string
  kind: SymbolKind
  line: number
  exported: boolean
  /** Leading doc comment, trimmed and truncated — the highest-value ranking text available. */
  doc?: string
}

interface Pattern {
  re: RegExp
  kind: SymbolKind
  nameGroup: number
  exportedGroup?: number
}

const TS_PATTERNS: Pattern[] = [
  { re: /^(export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/, kind: 'function', nameGroup: 2, exportedGroup: 1 },
  { re: /^(export\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/, kind: 'class', nameGroup: 2, exportedGroup: 1 },
  { re: /^(export\s+)?interface\s+([A-Za-z_$][\w$]*)/, kind: 'interface', nameGroup: 2, exportedGroup: 1 },
  { re: /^(export\s+)?type\s+([A-Za-z_$][\w$]*)\s*[=<]/, kind: 'type', nameGroup: 2, exportedGroup: 1 },
  { re: /^(export\s+)?enum\s+([A-Za-z_$][\w$]*)/, kind: 'enum', nameGroup: 2, exportedGroup: 1 },
  { re: /^(export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*[:=]/, kind: 'const', nameGroup: 2, exportedGroup: 1 },
]

const PY_PATTERNS: Pattern[] = [
  { re: /^def\s+([A-Za-z_][\w]*)/, kind: 'function', nameGroup: 1 },
  { re: /^class\s+([A-Za-z_][\w]*)/, kind: 'class', nameGroup: 1 },
]

const GO_PATTERNS: Pattern[] = [
  { re: /^func\s+(?:\([^)]*\)\s*)?([A-Za-z_][\w]*)/, kind: 'function', nameGroup: 1 },
  { re: /^type\s+([A-Za-z_][\w]*)\s+struct/, kind: 'struct', nameGroup: 1 },
  { re: /^type\s+([A-Za-z_][\w]*)\s+interface/, kind: 'interface', nameGroup: 1 },
]

const RUST_PATTERNS: Pattern[] = [
  { re: /^(pub\s+)?(?:async\s+)?fn\s+([A-Za-z_][\w]*)/, kind: 'function', nameGroup: 2, exportedGroup: 1 },
  { re: /^(pub\s+)?struct\s+([A-Za-z_][\w]*)/, kind: 'struct', nameGroup: 2, exportedGroup: 1 },
  { re: /^(pub\s+)?enum\s+([A-Za-z_][\w]*)/, kind: 'enum', nameGroup: 2, exportedGroup: 1 },
  { re: /^(pub\s+)?trait\s+([A-Za-z_][\w]*)/, kind: 'trait', nameGroup: 2, exportedGroup: 1 },
]

const JVM_PATTERNS: Pattern[] = [
  { re: /^(?:public\s+|private\s+|internal\s+)?(?:final\s+|abstract\s+|data\s+|open\s+)?class\s+([A-Za-z_][\w]*)/, kind: 'class', nameGroup: 1 },
  { re: /^(?:public\s+|private\s+)?interface\s+([A-Za-z_][\w]*)/, kind: 'interface', nameGroup: 1 },
  { re: /^(?:public\s+|private\s+|internal\s+)?fun\s+([A-Za-z_][\w]*)/, kind: 'function', nameGroup: 1 },
]

const RUBY_PATTERNS: Pattern[] = [
  { re: /^def\s+([A-Za-z_][\w?!]*)/, kind: 'function', nameGroup: 1 },
  { re: /^class\s+([A-Z][\w]*)/, kind: 'class', nameGroup: 1 },
  { re: /^module\s+([A-Z][\w]*)/, kind: 'module', nameGroup: 1 },
]

interface LanguageSpec {
  patterns: Pattern[]
  /**
   * Whether to consider only declarations at column zero.
   *
   * True where the meaningful unit is genuinely top-level: a nested closure in TypeScript or
   * a helper defined inside a function is noise in a map. False for languages whose primary
   * units live inside a class or impl block, where skipping indented lines would leave only
   * the type names and none of the behaviour.
   */
  topLevelOnly: boolean
}

const BY_EXT: Record<string, LanguageSpec> = {
  '.ts': { patterns: TS_PATTERNS, topLevelOnly: true },
  '.tsx': { patterns: TS_PATTERNS, topLevelOnly: true },
  '.js': { patterns: TS_PATTERNS, topLevelOnly: true },
  '.jsx': { patterns: TS_PATTERNS, topLevelOnly: true },
  '.mjs': { patterns: TS_PATTERNS, topLevelOnly: true },
  '.cjs': { patterns: TS_PATTERNS, topLevelOnly: true },
  '.py': { patterns: PY_PATTERNS, topLevelOnly: true },
  '.go': { patterns: GO_PATTERNS, topLevelOnly: true },
  '.rs': { patterns: RUST_PATTERNS, topLevelOnly: false },
  '.java': { patterns: JVM_PATTERNS, topLevelOnly: false },
  '.kt': { patterns: JVM_PATTERNS, topLevelOnly: false },
  '.kts': { patterns: JVM_PATTERNS, topLevelOnly: false },
  '.rb': { patterns: RUBY_PATTERNS, topLevelOnly: false },
}

export function supportsSymbols(ext: string): boolean {
  return ext in BY_EXT
}

/**
 * React components and hooks are worth distinguishing from plain functions: "is there
 * already a hook for this" is one of the most common duplication questions in a frontend
 * codebase, and kind-aware ranking answers it far better than a name match alone.
 */
function refineKind(name: string, kind: SymbolKind, ext: string): SymbolKind {
  if (ext !== '.tsx' && ext !== '.jsx' && ext !== '.ts' && ext !== '.js') return kind
  if (kind !== 'function' && kind !== 'const') return kind
  if (/^use[A-Z]/.test(name)) return 'hook'
  if (/^[A-Z]/.test(name) && (ext === '.tsx' || ext === '.jsx')) return 'component'
  return kind
}

/** Pull the doc comment immediately above a declaration, if there is one. */
function docAbove(lines: string[], index: number): string | undefined {
  let i = index - 1
  const collected: string[] = []
  // Skip decorators and blank lines between the comment and the declaration.
  while (i >= 0 && (lines[i]!.trim() === '' || lines[i]!.trim().startsWith('@'))) i--
  if (i < 0) return undefined

  if (lines[i]!.trim().endsWith('*/')) {
    while (i >= 0) {
      const line = lines[i]!.trim()
      collected.unshift(line.replace(/^\/\*\*?|\*\/$|^\*\s?/g, '').trim())
      if (line.startsWith('/*')) break
      i--
    }
  } else {
    while (i >= 0) {
      const line = lines[i]!.trim()
      if (!line.startsWith('//') && !line.startsWith('#')) break
      collected.unshift(line.replace(/^\/\/\s?|^#\s?/, '').trim())
      i--
    }
  }

  let doc = collected.filter(Boolean).join(' ').trim()
  // Section-divider banners ("// --- helpers ---------") are formatting, not documentation,
  // and they rank as noise if treated as prose.
  doc = doc.replace(/-{3,}/g, ' ').replace(/={3,}/g, ' ').replace(/\s+/g, ' ').trim()
  const letters = doc.replace(/[^A-Za-z]/g, '').length
  if (!doc || letters < 8 || letters / doc.length < 0.5) return undefined
  return doc.length > 240 ? doc.slice(0, 240) + '…' : doc
}

export function extractSymbols(content: string, ext: string): SymbolRef[] {
  const spec = BY_EXT[ext]
  if (!spec) return []
  const { patterns, topLevelOnly } = spec

  const lines = content.split('\n')
  const symbols: SymbolRef[] = []

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!
    if (topLevelOnly && /^\s/.test(raw)) continue
    const line = raw.trimStart()
    // A cheap guard: most lines cannot start a declaration.
    if (line.length === 0 || line.startsWith('//') || line.startsWith('*')) continue

    for (const p of patterns) {
      const m = p.re.exec(line)
      if (!m) continue
      const name = m[p.nameGroup]
      if (!name) continue
      const exported = p.exportedGroup ? Boolean(m[p.exportedGroup]) : true
      const doc = docAbove(lines, i)
      symbols.push({
        name,
        kind: refineKind(name, p.kind, ext),
        line: i + 1,
        exported,
        ...(doc ? { doc } : {}),
      })
      break
    }
  }

  // Deduplicate: an overloaded function or a re-declared const should appear once.
  const seen = new Set<string>()
  return symbols.filter((s) => {
    const key = `${s.name}:${s.kind}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
