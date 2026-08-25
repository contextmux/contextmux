/**
 * `ctxmux doctor` — make silent failures loud.
 *
 * Every failure mode in a hand-rolled agent setup is silent: a context file in the wrong
 * place, an MCP server that cannot start, a quality gate referencing a script that does not
 * exist. Each check here corresponds to something that otherwise fails with no error at all
 * and is discovered days later by wondering why the agent ignored an instruction.
 */
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { COMPILERS, literalEnvKeys, loadContext, sync } from '@contextmux/context'
import { detectProfile } from '@contextmux/repo'
import { c, error, heading, info, success, warn } from '../ui.js'
import { flagString, type ParsedArgs } from '../args.js'
import { WORKFLOW_FEATURES, WORKFLOW_MARKER } from '../workflows.js'

interface Check {
  name: string
  status: 'pass' | 'warn' | 'fail'
  detail: string
  hint?: string
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

export async function doctorCommand(args: ParsedArgs): Promise<number> {
  const root = flagString(args, 'root') ?? process.cwd()
  const checks: Check[] = []

  // --- canonical source ---------------------------------------------------
  let ctx
  try {
    ctx = await loadContext({ root })
    const m = ctx.model
    const total = m.rules.length + m.skills.length + m.agents.length + m.commands.length
    checks.push({
      name: 'canonical source',
      status: 'pass',
      detail: `${total} node(s): ${m.rules.length} rules, ${m.skills.length} skills, ${m.agents.length} agents, ${m.commands.length} commands`,
    })
    if (total === 0 && !m.instructions) {
      checks.push({
        name: 'content',
        status: 'warn',
        detail: '.ctxmux/ exists but is empty',
        hint: 'Run `ctxmux import` to pull in existing agent config, or `ctxmux init` for a starter pack.',
      })
    }
  } catch (err) {
    checks.push({
      name: 'canonical source',
      status: 'fail',
      detail: (err as Error).message,
      hint: 'Run `ctxmux import` or `ctxmux init` first.',
    })
  }

  // --- drift --------------------------------------------------------------
  if (ctx) {
    try {
      const report = await sync({ root, dryRun: true })
      const drifted = report.records.filter((r) => r.status === 'drift')
      const stale = report.records.filter((r) => r.status !== 'unchanged' && r.status !== 'drift')
      if (drifted.length > 0) {
        checks.push({
          name: 'generated files',
          status: 'fail',
          detail: `${drifted.length} hand-edited: ${drifted.map((d) => d.path).join(', ')}`,
          hint: 'Those edits will be lost on the next sync. Move them into .ctxmux/.',
        })
      } else if (stale.length > 0) {
        checks.push({
          name: 'generated files',
          status: 'warn',
          detail: `${stale.length} out of date`,
          hint: 'Run `ctxmux sync`.',
        })
      } else {
        checks.push({ name: 'generated files', status: 'pass', detail: 'all in sync' })
      }
    } catch (err) {
      checks.push({ name: 'generated files', status: 'fail', detail: (err as Error).message })
    }
  }

  // --- toolchain ----------------------------------------------------------
  const profile = await detectProfile(root)
  if (profile.packageManager === 'unknown') {
    checks.push({
      name: 'package manager',
      status: 'warn',
      detail: 'could not be determined',
      hint: 'Add a `packageManager` field to package.json so agents install with the right tool.',
    })
  } else {
    checks.push({
      name: 'package manager',
      status: 'pass',
      detail: profile.packageManagerVersion
        ? `${profile.packageManager}@${profile.packageManagerVersion}`
        : profile.packageManager,
    })
  }

  if (profile.qualityGate.length === 0) {
    checks.push({
      name: 'quality gate',
      status: 'warn',
      detail: 'no test/lint/typecheck scripts found',
      hint: 'Agents have no way to verify their own work without these.',
    })
  } else {
    checks.push({
      name: 'quality gate',
      status: 'pass',
      detail: profile.qualityGate.join(' && '),
    })
  }

  for (const note of profile.notes) {
    checks.push({ name: 'toolchain', status: 'warn', detail: note })
  }

  // --- MCP ----------------------------------------------------------------
  if (ctx && ctx.model.mcp.length > 0) {
    const writable = ctx.model.mcp.filter((s) => !s.readOnly)
    if (writable.length > 0) {
      checks.push({
        name: 'mcp safety',
        status: 'warn',
        detail: `${writable.length} server(s) are not read-only: ${writable.map((s) => s.name).join(', ')}`,
        hint: 'An agent acting on untrusted issue or ticket text should not hold write-capable tools.',
      })
    } else {
      checks.push({
        name: 'mcp safety',
        status: 'pass',
        detail: `${ctx.model.mcp.length} server(s), all read-only`,
      })
    }

    /*
     * A credential written into the declaration rather than referenced from the environment.
     *
     * A failure, not a warning: this file compiles out to four more, one of them a document
     * written to be read in a pull request, so the value does not stay where it was put. Only
     * the key is named — printing the value would put it in the terminal and the CI log too.
     */
    const withLiterals = ctx.model.mcp
      .map((s) => ({ name: s.name, keys: literalEnvKeys(s.env) }))
      .filter((s) => s.keys.length > 0)

    if (withLiterals.length > 0) {
      checks.push({
        name: 'mcp secrets',
        status: 'fail',
        detail: withLiterals.map((s) => `${s.name}: ${s.keys.join(', ')}`).join('; '),
        hint: 'Those values are copied into every generated MCP config. Use "${VAR}" and export the variable instead.',
      })
    } else {
      checks.push({ name: 'mcp secrets', status: 'pass', detail: 'no literal values declared' })
    }

    for (const server of ctx.model.mcp) {
      if (server.transport !== 'stdio' || !server.command) continue
      // A local command that does not resolve is the single most common MCP failure, and it
      // surfaces as "the tool just isn't there" rather than as an error.
      const looksLocal = server.command.startsWith('.') || server.command.startsWith('/')
      if (looksLocal && !(await exists(path.resolve(root, server.command)))) {
        checks.push({
          name: `mcp: ${server.name}`,
          status: 'fail',
          detail: `command not found: ${server.command}`,
        })
      }
    }
  }

  // --- scaffolded workflows, and whether they have fallen behind -----------
  /*
   * Workflows are written once and never regenerated, which is the right asymmetry for a file
   * carrying repository write permissions — but it means one scaffolded a while ago will not
   * have gained inputs the Action added since. `share-state` is the one that matters: without
   * it the review workflow runs in a fresh checkout, finds no run for the pull request, and
   * the feedback reaches nobody. Nothing fails; it simply stops working.
   */
  const workflowDir = path.join(root, '.github', 'workflows')
  const workflowNames = await fs.readdir(workflowDir).catch(() => [] as string[])

  for (const name of workflowNames.filter((n) => /\.ya?ml$/.test(n))) {
    const body = await fs.readFile(path.join(workflowDir, name), 'utf8').catch(() => '')
    if (!body.includes(WORKFLOW_MARKER)) continue

    const missing = WORKFLOW_FEATURES.filter((feature) => !body.includes(feature))
    if (missing.length === 0) {
      checks.push({ name: `workflow: ${name}`, status: 'pass', detail: 'up to date' })
      continue
    }

    checks.push({
      name: `workflow: ${name}`,
      status: 'warn',
      detail: `predates ${missing.join(', ')}`,
      hint: missing.includes('share-state')
        ? 'Without share-state the review workflow cannot find the run it is meant to advance, and says nothing. Add it, or re-scaffold into a scratch directory and compare.'
        : 'Compare against a freshly scaffolded workflow.',
    })
  }

  // --- target artefacts present -------------------------------------------
  if (ctx) {
    for (const target of ctx.config.targets) {
      const compiler = COMPILERS[target]
      const result = compiler.compile(ctx)
      const missing: string[] = []
      for (const f of result.files) {
        if (!(await exists(path.resolve(root, f.path)))) missing.push(f.path)
      }
      checks.push({
        name: compiler.displayName,
        status: missing.length === 0 ? 'pass' : 'warn',
        detail:
          missing.length === 0
            ? `${result.files.length} artefact(s) present`
            : `${missing.length} missing: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '...' : ''}`,
        ...(missing.length > 0 ? { hint: 'Run `ctxmux sync`.' } : {}),
      })
    }
  }

  // --- render -------------------------------------------------------------
  heading('Diagnostics')
  for (const check of checks) {
    const line = `${check.name.padEnd(22)} ${check.detail}`
    if (check.status === 'pass') success(line)
    else if (check.status === 'warn') warn(line)
    else error(line)
    if (check.hint) info('      ' + c.dim(check.hint))
  }

  const failed = checks.filter((c2) => c2.status === 'fail').length
  const warned = checks.filter((c2) => c2.status === 'warn').length

  info('')
  if (failed > 0) {
    error(`${failed} failure(s), ${warned} warning(s).`)
    return 1
  }
  if (warned > 0) {
    warn(`${warned} warning(s), no failures.`)
    return 0
  }
  success('All checks passed.')
  return 0
}
