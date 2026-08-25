/** Diagnostics that carry a file path, so CLI output can point at the offending file. */
export interface Diagnostic {
  level: 'error' | 'warning'
  file?: string
  message: string
  /** What the user should do about it. Every error should be actionable. */
  hint?: string
}

export function formatDiagnostics(diags: Diagnostic[]): string {
  return diags
    .map((d) => {
      const where = d.file ? `${d.file}: ` : ''
      const icon = d.level === 'error' ? 'error' : 'warning'
      const hint = d.hint ? `\n         ${d.hint}` : ''
      return `  ${icon}  ${where}${d.message}${hint}`
    })
    .join('\n')
}

export class ContextError extends Error {
  override name = 'ContextError'
  readonly diagnostics: Diagnostic[]
  /** The headline without the diagnostic detail, for callers that render them separately. */
  readonly summary: string

  constructor(message: string, diagnostics: Diagnostic[] = []) {
    /*
     * Fold the diagnostics into `message`.
     *
     * A caller using this as a library sees only `err.message`. Leaving the actionable part
     * in a side-channel field produces errors like "1 problem(s) in .ctxmux/", which says
     * nothing about what to fix.
     */
    super(diagnostics.length > 0 ? `${message}\n${formatDiagnostics(diagnostics)}` : message)
    this.summary = message
    this.diagnostics = diagnostics
  }
}
