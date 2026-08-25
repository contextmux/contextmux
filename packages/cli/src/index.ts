/** The contextmux CLI entry point. */
import { parseArgs, flagBool, UsageError } from './args.js'
import { c, error, info } from './ui.js'
import { checkCommand, reportContextError, syncCommand } from './commands/sync.js'
import { importCommand } from './commands/import.js'
import { initCommand } from './commands/init.js'
import { doctorCommand } from './commands/doctor.js'
import { mapCommand } from './commands/map.js'
import { runCommand, statusCommand } from './commands/run.js'
import { eventCommand } from './commands/event.js'
import { evalCommand } from './commands/eval.js'
import { learnCommand } from './commands/learn.js'
import { traceCommand } from './commands/trace.js'
import { addCommand } from './commands/add.js'
import { handoffCommand } from './commands/handoff.js'
import { statePullCommand, statePushCommand } from './commands/state.js'

const HELP = `
${c.bold('ctxmux')} — one context source, every coding agent

${c.bold('USAGE')}
  ctxmux <command> [options]

${c.bold('COMMANDS')}
  run             Drive a task to a proposed change, with gates and an isolated worktree
  status          Show recorded runs and what is waiting on you
  trace           Show what an agent actually did, step by step
  handoff         Show what would be transferred to another agent, and what it costs
  event           Feed a forge webhook (a review, a comment) into a run
  eval            Run one task through several agents and compare the results
  learn           Turn recurring review feedback into proposed edits to .ctxmux/
  state           Share run state between machines and jobs (push | pull)

  init            Scaffold .ctxmux/ from a starter pack, using the detected toolchain
  import          Build .ctxmux/ from existing agent config already in the repo
  add             Install a third-party skill pack
  sync            Compile .ctxmux/ to every configured agent
  check           Verify generated files are in sync; exits non-zero if not (for CI)
  doctor          Report anything that will fail silently
  map             Query the repository index and print a token-budgeted map

${c.bold('COMMON OPTIONS')}
  --root <dir>        Repository root (default: cwd)
  --targets <list>    Comma-separated: claude,copilot,cursor,codex
  -n, --dry-run       Show what would happen without writing
  -f, --force         Overwrite hand-edited generated files
  --explain           Print the fidelity report: what each target loses
  -h, --help          Show this
  -v, --version       Show version

${c.bold('RUN OPTIONS')}
  --agent <name>      claude, cursor, codex, local (driven) or copilot (delegated)
  --agents <list>     Fallback chain: hand over when one gives up
  --handoff-tier <t>  How much to transfer: none|essential|valuable|optional
  --tracker <name>    file, github or jira
  --repo <owner/repo> Repository, for github and copilot
  --allow <globs>     Paths the agent may modify (comma-separated)
  --deny <globs>      Paths it must not modify
  --max-files <n>     Ceiling on files changed
  --max-rounds <n>    Self-correction rounds before escalating (default 2)
  --open-pr           Push the branch and open a pull request for what the agent produced
  --no-isolate        Work in your checkout instead of a git worktree
  --no-gates          Disable all gates (not recommended)
  --minimal           Add the minimalism gates: no unrequested dependencies, no
                      duplicate symbols, no speculative abstraction
  --no-recovery       Do not watch for stalls or record a trace
  --stall-after <n>   Samples with no progress before stopping (default 3)
  --otlp <url>        Send the trajectory to an OTLP collector (Jaeger, Grafana, SigNoz)
  --model <name>      Model for the agent

${c.bold('EVAL OPTIONS')}
  --agents <list>     Comma-separated, or "all"
  --out <file>        Write the comparison as markdown
  --concurrent        Run agents at once (distorts wall-clock figures)

${c.bold('EXAMPLES')}
  ctxmux run T-1 --allow "src/**"
  ctxmux run ABC-1234 --tracker jira --agent copilot
  ctxmux run T-1 --agents claude,codex        ${c.dim('# hand over if the first gives up')}
  ctxmux trace T-1 --otlp-json                ${c.dim('# the OTLP payload, to pipe anywhere')}
  ctxmux run "add a currency formatter" --dry-run
  ctxmux eval T-1 --agents claude,cursor,codex --out comparison.md
  ctxmux learn                        ${c.dim('# what has recurred across runs')}
  ctxmux status
  ctxmux import && ctxmux sync --explain
  ctxmux check --strict                       ${c.dim('# in CI')}
  ctxmux map "add a currency formatter" --budget 3000
  ctxmux sync --targets claude,cursor
`

/**
 * Stamped at build time from `packages/cli/package.json`.
 *
 * This was a second copy of the version number, which is a copy that eventually disagrees:
 * `npm publish` reads package.json and `--version` read this, so the CLI could confidently
 * report a version nobody shipped. `typeof` rather than a bare reference so running straight
 * from source, where nothing defines it, still works.
 */
declare const __CTXMUX_VERSION__: string | undefined
const VERSION = typeof __CTXMUX_VERSION__ === 'string' ? __CTXMUX_VERSION__ : '0.0.0-dev'

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2))

  if (flagBool(args, 'version', 'v')) {
    info(VERSION)
    return 0
  }
  if (!args.command || flagBool(args, 'help', 'h')) {
    info(HELP.trim())
    return args.command ? 0 : 1
  }

  switch (args.command) {
    case 'init':
      return initCommand(args)
    case 'import':
      return importCommand(args)
    case 'sync':
      return syncCommand(args)
    case 'check':
      return checkCommand(args)
    case 'doctor':
      return doctorCommand(args)
    case 'map':
      return mapCommand(args)
    case 'run':
      return runCommand(args)
    case 'status':
      return statusCommand(args)
    case 'event':
      return eventCommand(args)
    case 'eval':
      return evalCommand(args)
    case 'learn':
      return learnCommand(args)
    case 'trace':
      return traceCommand(args)
    case 'add':
      return addCommand(args)
    case 'handoff':
      return handoffCommand(args)
    case 'state': {
      const verb = args.positionals[0]
      if (verb === 'push') return statePushCommand(args)
      if (verb === 'pull') return statePullCommand(args)
      error(`Usage: ctxmux state <push|pull>${verb ? ` — not "${verb}"` : ''}`)
      return 1
    }
    default:
      error(`Unknown command: ${args.command}`)
      info('')
      info(HELP.trim())
      return 1
  }
}

main()
  .then((code) => {
    process.exitCode = code
  })
  .catch((err) => {
    // A mistyped flag is a user error, not a crash. Say what was wrong with it and stop.
    if (err instanceof UsageError) {
      error(err.message)
      if (err.hint) info('    ' + c.dim(err.hint))
      process.exitCode = 2
      return
    }
    try {
      process.exitCode = reportContextError(err)
    } catch {
      error((err as Error).message)
      if (process.env['CTXMUX_DEBUG']) console.error(err)
      else info(c.dim('Set CTXMUX_DEBUG=1 for a stack trace.'))
      process.exitCode = 1
    }
  })
