import { askOnce, type CliAgentSpec } from '@contextmux/agent-cli'
import { CLAUDE_SPEC } from '@contextmux/agent-claude'
import { CODEX_SPEC } from '@contextmux/agent-codex'
import { critique, inspect, type Depth, type Judge, type Suggestion } from '@contextmux/council'
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
  targets: readonly import('@contextmux/context').Target[]
  /** A sample of real paths, for a judge asked whether a rule matches the repository. */
  sampleFiles: string[]
  /** False outside a git repository, where two of the checks could not run. */
  hadFileList: boolean
  /** "3 rules, 8 skills" — what was looked at. */
  checked: string
  /** The agent this repository configured, if it named one. */
  agent?: string
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
    targets: loaded.config.targets,
    sampleFiles: (tracked ?? []).slice(0, 40),
    ...(loaded.config.agent ? { agent: loaded.config.agent } : {}),
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

/** Specs that can be asked a question without also being allowed to edit. */
const JUDGES: Record<string, CliAgentSpec> = {
  claude: CLAUDE_SPEC,
  codex: CODEX_SPEC,
}

/**
 * A judge built from the agent this repository actually configured.
 *
 * It used to be Claude regardless — so a repository set up for Copilot silently spent Claude
 * credits and nobody was told. Using somebody's configured agent is the whole point of
 * configuring one, and quietly substituting a different vendor is worse than refusing.
 *
 * Copilot cannot be a judge at all. Its coding agent is delegated: you hand it a task and it
 * opens a pull request in GitHub's cloud. There is no interface that answers a question, so
 * this is a property of the product rather than a gap here.
 *
 * Cursor and the local adapters are absent for a different reason: neither has a documented way
 * to run without also being able to edit. `opencode run` looks like a question until you notice
 * it is a coding agent with a filesystem, and an agent that can only be asked something by also
 * being allowed to change things is not one to point at a repository for an opinion.
 */
export function judgeFor(agent: string | undefined, model: string | undefined): Judge {
  const name = agent ?? 'claude'
  const spec = JUDGES[name]
  if (!spec) {
    throw new Error(
      `${name} cannot be asked a question — it ${
        name === 'copilot'
          ? 'takes work and opens pull requests, and has no interface that answers one'
          : 'has no way to run without also being allowed to edit files'
      }.\n` +
        `Pass --agent with one of: ${Object.keys(JUDGES).join(', ')}, if you want to use a different agent for this.`,
    )
  }
  return {
    id: spec.id,
    async ask(prompt: string): Promise<string> {
      const out = await askOnce(spec, { prompt, ...(model ? { model } : {}) })
      if (!out.ok) throw new Error(out.reason)
      return out.text
    },
  }
}

function parseDepth(raw: string | undefined): Depth {
  if (!raw) return 'static'
  if (raw === 'static' || raw === 'single' || raw === 'panel') return raw
  throw new Error(`Unknown depth "${raw}". Use static, single or panel.`)
}

/**
 * Add a judge's findings to the free ones, or say why it could not.
 *
 * A judge that cannot be reached — no binary, no credentials, a timeout — must not take the
 * static findings down with it. Those cost nothing and are already in hand, and a run that
 * prints an error instead of them is strictly worse than one that never tried.
 */
export async function withJudge(
  staticFindings: Suggestion[],
  model: Parameters<typeof critique>[0],
  judge: Judge,
  opts: Parameters<typeof critique>[2] & { depth: Exclude<Depth, 'static'> },
): Promise<Suggestion[]> {
  try {
    const result = await critique(model, judge, { ...opts, known: staticFindings })
    return [...staticFindings, ...result.findings]
  } catch (e) {
    warn(`The ${opts.depth} review did not run: ${e instanceof Error ? e.message : String(e)}`)
    info('    ' + c.dim('Everything below is from the checks that need no model.'))
    return staticFindings
  }
}

export async function adviseCommand(args: ParsedArgs): Promise<number> {
  const root = flagString(args, 'root') ?? process.cwd()
  const json = flagBool(args, 'json')
  const depth = parseDepth(flagString(args, 'depth'))
  const { findings: staticFindings, hadFileList, checked, targets, sampleFiles, agent } = await advise(root)

  const findings =
    depth === 'static'
      ? staticFindings
      : await withJudge(staticFindings, (await loadContext({ root })).model, judgeFor(flagString(args, 'agent') ?? agent, flagString(args, 'model')), {
          depth,
          context: { targets, sampleFiles },
        })

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
