/**
 * Fidelity reporting.
 *
 * The compilation matrix is genuinely lossy, and a tool that hides that is worse than no
 * tool: users would assume their Codex agent has the same capabilities as their Claude agent
 * and be confused when it behaves differently. `sync --explain` prints this.
 */
import type { CompileResult, FidelityNote } from './compilers/types.js'
import type { Target } from './schema.js'

export interface FidelitySummary {
  target: Target
  displayName: string
  fileCount: number
  notes: FidelityNote[]
  degradedCount: number
  droppedCount: number
}

export function summarize(results: CompileResult[], names: Record<Target, string>): FidelitySummary[] {
  return results.map((r) => ({
    target: r.target,
    displayName: names[r.target],
    fileCount: r.files.length,
    // Node types with nothing to compile are not interesting; suppress them.
    notes: r.fidelity.filter((n) => n.count > 0),
    degradedCount: r.fidelity.filter((n) => n.fidelity === 'degraded' && n.count > 0).length,
    droppedCount: r.fidelity.filter((n) => n.fidelity === 'dropped' && n.count > 0).length,
  }))
}

const ICON: Record<FidelityNote['fidelity'], string> = {
  native: '✓',
  degraded: '~',
  dropped: '✗',
}

export function renderFidelityReport(summaries: FidelitySummary[]): string {
  const out: string[] = []
  for (const s of summaries) {
    const flag =
      s.droppedCount > 0
        ? `${s.droppedCount} dropped, ${s.degradedCount} degraded`
        : s.degradedCount > 0
          ? `${s.degradedCount} degraded`
          : 'full fidelity'
    out.push(`${s.displayName}  —  ${s.fileCount} file(s), ${flag}`)
    for (const n of s.notes) {
      const head = `  ${ICON[n.fidelity]} ${n.nodeType.padEnd(12)} ${String(n.count).padStart(3)}`
      if (n.fidelity === 'native') {
        out.push(`${head}  native`)
      } else {
        out.push(`${head}  → ${n.as ?? 'unspecified'}`)
        if (n.lost) out.push(`${' '.repeat(20)}lost: ${n.lost}`)
      }
    }
    out.push('')
  }
  return out.join('\n').trimEnd()
}

/** Markdown version, for committing next to the generated output. */
export function renderFidelityMarkdown(summaries: FidelitySummary[]): string {
  const rows: string[] = [
    '| Target | Node type | Count | Fidelity | Represented as | Lost |',
    '| --- | --- | ---: | --- | --- | --- |',
  ]
  for (const s of summaries) {
    for (const n of s.notes) {
      rows.push(
        `| ${s.displayName} | ${n.nodeType} | ${n.count} | ${n.fidelity} | ${n.as ?? '—'} | ${n.lost ?? '—'} |`,
      )
    }
  }
  return rows.join('\n') + '\n'
}
