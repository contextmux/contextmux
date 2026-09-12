import { inspect, type Suggestion } from '@contextmux/council'
import { loadContext } from '@contextmux/context'
import { listTrackedFiles } from '@contextmux/repo'
import { bullet, c, heading, info, success, warn } from '../ui.js'
import { flagBool, flagString, type ParsedArgs } from '../args.js'

const LABEL: Record<Suggestion['severity'], string> = {
  error: 'Does not work',
  warning: 'Probably not what you meant',
  suggestion: 'Worth a look',
}

/**
 * Review `.ctxmux/` and say what will not work, or will not be followed.
 *
 * Exits 0 even when it finds things. Suggestions are not failures, and a command that fails the
 * build over a thin skill description is one people stop running. `check` is the command that
 * exits non-zero, because drift between source and generated output really is an error.
 */
export interface Advice {
  findings: Suggestion[]
  /** False outside a git repository, where two of the checks could not run. */
  hadFileList: boolean
  /** "3 rules, 8 skills" — what was looked at. */
  checked: string
}

/**
 * Review the model on disk. Shared with `init --advise`, which needs the findings rather than
 * a rendered report and an exit code.
 */
export async function advise(root: string): Promise<Advice> {
  const loaded = await loadContext({ root })

  // null means "not a git repository", which is different from "a repository with no files".
  // Passing an empty list on purpose tells the checks to stay quiet about globs and paths
  // rather than to report every one of them as dead.
  const tracked = await listTrackedFiles(root)
  return {
    findings: inspect(loaded.model, { files: tracked ?? [], targets: loaded.config.targets }),
    hadFileList: tracked !== null,
    checked: countOf(loaded.model),
  }
}

/** Findings grouped by severity, worst first. Shared with `init --advise`. */
export function renderAdvice(findings: Suggestion[]): void {
  for (const severity of ['error', 'warning', 'suggestion'] as const) {
    const group = findings.filter((f) => f.severity === severity)
    if (group.length === 0) continue
    heading(LABEL[severity])
    for (const f of group) {
      bullet(`${c.dim(f.where)}  ${f.message}`)
      info('    ' + c.dim(f.fix))
    }
  }
}

export async function adviseCommand(args: ParsedArgs): Promise<number> {
  const root = flagString(args, 'root') ?? process.cwd()
  const json = flagBool(args, 'json')
  const { findings, hadFileList, checked } = await advise(root)

  if (json) {
    info(JSON.stringify({ findings, checked }, null, 2))
    return 0
  }

  if (findings.length === 0) {
    success('Nothing to say. Every rule reaches a target, applies to something, and agrees with the others.')
    if (!hadFileList) hintNoGit()
    return 0
  }

  renderAdvice(findings)

  const errors = findings.filter((f) => f.severity === 'error').length
  info('')
  info(
    errors > 0
      ? `${findings.length} to look at, ${errors} of which will not work at all.`
      : `${findings.length} to look at. Nothing is broken.`,
  )
  if (!hadFileList) hintNoGit()
  return 0
}

/**
 * Without git there is no file list, and the two checks that need one say nothing. Worth saying
 * out loud: a clean report means less here than it looks, and silence about that would mislead.
 */
export function hintNoGit(): void {
  warn('Not a git repository, so dead globs and stale paths were not checked.')
}

function countOf(model: { rules: unknown[]; skills: unknown[]; agents: unknown[]; commands: unknown[] }): string {
  const parts = [
    [model.rules.length, 'rule'],
    [model.skills.length, 'skill'],
    [model.agents.length, 'agent'],
    [model.commands.length, 'command'],
  ] as const
  return parts
    .filter(([n]) => n > 0)
    .map(([n, word]) => `${n} ${word}${n === 1 ? '' : 's'}`)
    .join(', ')
}
