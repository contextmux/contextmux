/**
 * Rendering a comparison.
 *
 * Two audiences: a terminal, where the ranking should be readable at a glance, and markdown,
 * for pasting somewhere a decision gets made. Both show what was measured rather than a single
 * composite number — a score out of ten hides exactly the trade-off a reader needs to see,
 * which is that the cheapest agent touched four files nobody asked it to.
 */
import type { EvalResult, Score } from './score.js'

function ms(value: number): string {
  return value < 1000 ? `${value}ms` : `${(value / 1000).toFixed(1)}s`
}

function cost(value: number | null): string {
  return value === null ? '—' : `$${value.toFixed(3)}`
}

function verdict(score: Score): string {
  if (score.weakenedTests) return 'disqualified'
  if (score.succeeded) return score.outOfScopeFiles.length > 0 ? 'passed, out of scope' : 'passed'
  if (score.state === 'rejected') return 'rejected by gates'
  if (score.state === 'escalated') return 'needs a human'
  // A run that stopped before dispatch was never attempted, so calling it a failure would be
  // a report about something that did not happen.
  if (score.state === 'ready' || score.state === 'discovered') return 'not attempted'
  return 'failed'
}

export function renderTable(result: EvalResult): string {
  const rows = result.scores.map((s, i) => ({
    rank: s.weakenedTests || !s.succeeded ? '—' : String(i + 1),
    agent: s.agentName,
    verdict: verdict(s),
    quality: s.qualityPassed ? 'pass' : 'fail',
    scope: s.outOfScopeFiles.length === 0 ? 'clean' : `${s.outOfScopeFiles.length} outside`,
    files: String(s.filesChanged),
    diff: String(s.diffLines),
    rounds: String(s.rounds),
    time: ms(s.durationMs),
    cost: cost(s.costUsd),
  }))

  const headers = ['#', 'agent', 'verdict', 'tests', 'scope', 'files', 'diff', 'rounds', 'time', 'cost']
  const keys = ['rank', 'agent', 'verdict', 'quality', 'scope', 'files', 'diff', 'rounds', 'time', 'cost'] as const

  const widths = keys.map((key, i) =>
    Math.max(headers[i]!.length, ...rows.map((r) => r[key].length)),
  )

  const line = (cells: string[]) =>
    cells.map((cell, i) => cell.padEnd(widths[i]!)).join('  ').trimEnd()

  const out = [line(headers), line(widths.map((w) => '-'.repeat(w)))]
  for (const row of rows) out.push(line(keys.map((k) => row[k])))

  return out.join('\n')
}

export function renderDetails(result: EvalResult): string {
  const out: string[] = []

  for (const score of result.scores) {
    const lines: string[] = []
    if (score.notes.length) lines.push(...score.notes.map((n) => `  - ${n}`))
    if (score.outOfScopeFiles.length) {
      lines.push(`  - touched: ${score.outOfScopeFiles.slice(0, 5).join(', ')}`)
    }
    if (score.error) lines.push(`  - ${score.error.split('\n')[0]}`)
    if (score.worktree) lines.push(`  - review: cd ${score.worktree} && git diff`)
    if (lines.length) out.push(`${score.agentName}:`, ...lines)
  }

  for (const skip of result.skipped) {
    out.push(`${skip.agentName}: skipped — ${skip.reason}`)
  }

  return out.join('\n')
}

export function renderMarkdown(result: EvalResult): string {
  const out: string[] = [
    `# Agent comparison: ${result.task.title}`,
    '',
    `Task \`${result.task.id}\` · ${result.scores.length} agent(s) · ${ms(result.durationMs)} total`,
    '',
    '| # | Agent | Verdict | Tests | Scope | Files | Diff lines | Rounds | Time | Cost |',
    '| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: |',
  ]

  result.scores.forEach((s, i) => {
    out.push(
      `| ${s.weakenedTests || !s.succeeded ? '—' : i + 1} | ${s.agentName} | ${verdict(s)} | ` +
        `${s.qualityPassed ? 'pass' : 'fail'} | ` +
        `${s.outOfScopeFiles.length === 0 ? 'clean' : `${s.outOfScopeFiles.length} outside`} | ` +
        `${s.filesChanged} | ${s.diffLines} | ${s.rounds} | ${ms(s.durationMs)} | ${cost(s.costUsd)} |`,
    )
  })

  if (result.skipped.length > 0) {
    out.push('', '## Not run', '')
    for (const skip of result.skipped) out.push(`- **${skip.agentName}** — ${skip.reason}`)
  }

  const notable = result.scores.filter((s) => s.notes.length > 0)
  if (notable.length > 0) {
    out.push('', '## Notes', '')
    for (const score of notable) {
      out.push(`- **${score.agentName}**: ${score.notes.join('; ')}`)
    }
  }

  out.push(
    '',
    '## How this was measured',
    '',
    'Every agent received the identical task, the identical gates and its own worktree branched',
    'from the same commit. Scores come from the artefact each produced — whether the project’s',
    'own tests passed, which files were touched, how large the diff is — not from a model',
    'judging another model.',
    '',
    'Ranking puts correctness first: an attempt whose tests fail does not place above one that',
    'passes, however small its diff. Weakening existing tests disqualifies outright, because a',
    'suite that has been quietly loosened is worse than one that fails honestly.',
  )

  return out.join('\n') + '\n'
}
