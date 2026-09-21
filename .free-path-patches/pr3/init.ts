import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { detectTargets, importContext, sync, writeFileAtomic } from '@contextmux/context'
import { detectProfile } from '@contextmux/repo'
import { bullet, c, heading, info, success, warn } from '../ui.js'
import { flagBool, flagString, type ParsedArgs } from '../args.js'
import { advise, hintNoGit, renderAdvice } from './advise.js'
import { interactive, selectMany, selectOne } from '../prompt.js'
import { starterFiles } from '../starter.js'
import { remainingSetup, workflowFiles } from '../workflows.js'
import { spawn } from 'node:child_process'


/** Paths contextmux writes while it works, which belong to a machine rather than a repository. */
const GITIGNORE_STANZA = [
  '# contextmux — run state and the index cache are local, not shared',
  '.ctxmux/state/',
  '.ctxmux/cache/',
]

/**
 * Add the ignore lines, without taking over the file.
 *
 * Appended rather than written, because `.gitignore` almost always exists already and belongs
 * to the project. Skipped entirely if the entries are there, so running `init --force` twice
 * does not stack duplicates.
 *
 * Without this, the first `ctxmux run` leaves run records full of absolute worktree paths
 * staged for commit, and the person who notices is whoever reviews the pull request.
 */
async function ensureGitignore(root: string): Promise<boolean> {
  const file = path.join(root, '.gitignore')
  const existing = await fs.readFile(file, 'utf8').catch(() => '')
  if (existing.includes('.ctxmux/state/')) return false

  const body = existing.trimEnd()
  await writeFileAtomic(file, `${body ? `${body}\n\n` : ''}${GITIGNORE_STANZA.join('\n')}\n`)
  return true
}


/**
 * Which agent will run tasks, before anybody is asked.
 *
 * Reads the same variable `run` does, so `CTXMUX_AGENT=copilot ctxmux init --yes` sets up a
 * Copilot repository rather than quietly writing Claude into the config. The tracker beside
 * this has always been detected from the environment; the agent was hardcoded, which left no
 * way to script setup for anything but the default.
 *
 * An unrecognised value falls back rather than being written through: config.json is read by
 * every later command, and a typo there fails somewhere much further from its cause.
 */
function detectAgent(): string {
  const named = process.env['CTXMUX_AGENT']?.trim()
  return named && AGENTS.includes(named) ? named : 'claude'
}

const AGENTS = ['claude', 'copilot', 'cursor', 'codex', 'local']

/** Which tracker this repository will resolve, so the workflow names the right one. */
function detectTracker(): string {
  if (process.env['JIRA_URL']?.trim()) return 'jira'
  if (process.env['GITHUB_REPOSITORY']?.trim() || process.env['CTXMUX_REPO']?.trim()) return 'github'
  return 'file'
}

/**
 * Secrets and variables already configured on the repository.
 *
 * Best effort through `gh`, which most people setting this up already have. Returns an empty
 * set when it is missing or not logged in — and the caller must treat that as "unknown" rather
 * than "unset", because telling somebody to set a secret they set last week is how a checklist
 * stops being read.
 */
async function configuredNames(root: string): Promise<Set<string>> {
  const read = (args: string[]): Promise<string> =>
    new Promise((resolve) => {
      const child = spawn('gh', args, { cwd: root, windowsHide: true })
      let out = ''
      child.stdout.on('data', (d) => (out += d))
      child.on('error', () => resolve(''))
      child.on('close', (code) => resolve(code === 0 ? out : ''))
    })

  const [secrets, variables] = await Promise.all([
    read(['secret', 'list', '--json', 'name', '-q', '.[].name']),
    read(['variable', 'list', '--json', 'name', '-q', '.[].name']),
  ])
  return new Set(
    `${secrets}\n${variables}`
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean),
  )
}

/** Whether there is a remote to run a workflow against. Without one there is nothing to scaffold. */
function hasGitRemote(root: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('git', ['remote'], { cwd: root, windowsHide: true })
    let out = ''
    child.stdout.on('data', (d) => (out += d))
    child.on('error', () => resolve(false))
    child.on('close', () => resolve(out.trim().length > 0))
  })
}

/**
 * Report on the model that is now on disk.
 *
 * Silent on a clean result only when nobody asked. `init` already prints a lot and a line
 * confirming that a freshly written starter pack is fine is not worth the reader's attention —
 * but somebody who typed `--advise` cannot tell that silence apart from a flag that did
 * nothing, so they get an answer either way.
 */
async function reviewWhatIsThere(root: string, asked: boolean): Promise<void> {
  const { findings, hadFileList } = await advise(root)
  if (findings.length === 0) {
    if (asked) {
      info('')
      success('Nothing to say about the rules themselves.')
      if (!hadFileList) hintNoGit()
    }
    return
  }
  renderAdvice(findings)
  info('')
  info(c.dim(`${findings.length} thing(s) to look at. \`ctxmux advise\` shows this again.`))
  if (!hadFileList) hintNoGit()
}

export async function initCommand(args: ParsedArgs): Promise<number> {
  const root = flagString(args, 'root') ?? process.cwd()
  const force = flagBool(args, 'force', 'f')
  const wantAdvice = flagBool(args, 'advise')

  const dir = path.join(root, '.ctxmux')
  const already = await fs
    .access(dir)
    .then(() => true)
    .catch(() => false)

  if (already && !force) {
    /*
     * Already set up is the outcome this command exists to produce, so it is not a failure.
     *
     * Exiting 1 broke `ctxmux init && ctxmux run ...`, which is an ordinary thing to write and
     * an ordinary thing to run twice. `git init` on an existing repository says so and exits 0
     * for the same reason.
     */
    info('.ctxmux/ is already set up — leaving it alone.')
    info('    ' + c.dim('`ctxmux sync` compiles what is there. --force adds any starter files that are missing.'))
    // Reviewing what is already there is the one thing still worth doing on this path, and it
    // is why somebody would type `init --advise` at a repository that is set up.
    if (wantAdvice) await reviewWhatIsThere(root, true)
    return 0
  }

  const profile = await detectProfile(root)

  heading('Detected')
  bullet(`package manager: ${profile.packageManager}${profile.packageManagerVersion ? '@' + profile.packageManagerVersion : ''}`)
  if (profile.nodeVersion) bullet(`node: ${profile.nodeVersion}`)
  if (profile.languages.length) bullet(`languages: ${profile.languages.join(', ')}`)
  if (profile.frameworks.length) bullet(`stack: ${profile.frameworks.join(', ')}`)
  if (profile.isMonorepo) bullet(`monorepo: ${profile.workspaces.length} workspace(s)`)
  if (profile.qualityGate.length) bullet(`quality gate: ${profile.qualityGate.join(' && ')}`)

  for (const note of profile.notes) {
    info('')
    warn(note)
  }

  /*
   * Existing agent config wins over a starter pack.
   *
   * `init` and `import` were two entry points and a decision the reader had to make before
   * they could start — one they cannot make without already knowing the tool, and getting it
   * wrong buries their real rules under a generic template. The repository can be asked
   * instead.
   */
  /*
   * Only on the first run. `--force` means "add the starter files that are missing", not
   * "read everything back in".
   *
   * Importing on a repository that already has a `.ctxmux/` reads in the files this command
   * generated last time — `.github/instructions/*.md` come back as rules that collide with the
   * rules they were compiled from, and sync fails with "two nodes compile to the same output
   * path". The round trip has to happen once, on the way in, or not at all.
   */
  const imported = already ? null : await importContext(root).catch(() => null)
  const foundExisting = (imported?.provenance.length ?? 0) > 0

  const written: string[] = []

  if (foundExisting && imported) {
    for (const file of imported.files) {
      await writeFileAtomic(path.join(root, file.path), file.content)
      written.push(file.path)
    }
    heading('Imported')
    for (const p of imported.provenance.slice(0, 8)) bullet(`${p.from} -> ${p.to}`)
    if (imported.provenance.length > 8) {
      info(c.dim(`    ...and ${imported.provenance.length - 8} more`))
    }
  }

  for (const file of foundExisting ? [] : starterFiles(profile)) {
    const abs = path.join(root, file.path)
    const exists = await fs
      .access(abs)
      .then(() => true)
      .catch(() => false)
    if (exists) continue
    await writeFileAtomic(abs, file.content)
    written.push(file.path)
  }

  /*
   * Ask only what the repository cannot answer.
   *
   * Detection settles the targets whenever there was config to import, so the question is
   * skipped rather than asked with the answer already in it. What is left is genuinely a
   * choice: which agent does the work, and where the work comes from.
   *
   * Skipped entirely without a terminal — a pipe, a CI runner, `--yes`. A setup command that
   * blocks on a keystroke nobody is there to press is worse than one that never asked.
   */
  const detected = await detectTargets(root)
  const askable = interactive() && !flagBool(args, 'yes', 'y')

  // No evidence → one target (the agent we would run), not all four. Interactive
  // multi-select starts empty so the user opts in rather than opting out.
  const fallbackOne = ((): string[] => {
    const a = detectAgent()
    return a === 'local' ? ['claude'] : a === 'copilot' || a === 'cursor' || a === 'codex' || a === 'claude' ? [a] : ['claude']
  })()
  let targets = detected.length > 0 ? detected : fallbackOne
  let agent = detectAgent()
  let tracker = detectTracker()

  if (askable) {
    if (detected.length === 0) {
      targets = await selectMany(
        'Which agents should get your rules?',
        [
          { value: 'claude', label: 'Claude Code', note: 'CLAUDE.md' },
          { value: 'copilot', label: 'GitHub Copilot', note: '.github/copilot-instructions.md' },
          { value: 'cursor', label: 'Cursor', note: '.cursor/rules/' },
          { value: 'codex', label: 'Codex', note: 'AGENTS.md' },
        ],
        [],
      )
      if (targets.length === 0) targets = fallbackOne
    }

    agent = await selectOne(
      'Which agent should run tasks?',
      [
        { value: 'claude', label: 'Claude Code', note: 'runs here, needs ANTHROPIC_API_KEY' },
        { value: 'copilot', label: 'GitHub Copilot', note: 'runs in GitHub, opens its own PR' },
        { value: 'codex', label: 'Codex', note: 'runs here' },
        { value: 'cursor', label: 'Cursor', note: 'runs here' },
      ],
      targets.includes('copilot') && !targets.includes('claude') ? 'copilot' : 'claude',
    )

    tracker = await selectOne(
      'Where do tasks come from?',
      [
        { value: 'file', label: 'Markdown files in the repo', note: '.ctxmux/tasks/' },
        { value: 'github', label: 'GitHub issues', note: 'needs gh auth or GITHUB_TOKEN' },
        { value: 'jira', label: 'Jira', note: 'needs JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN' },
      ],
      tracker,
    )
  }

  // Written whatever route got here, so a later run needs none of these flags.
  await writeFileAtomic(
    path.join(root, '.ctxmux', 'config.json'),
    JSON.stringify({ targets, agent, tracker }, null, 2) + '\n',
  )
  if (!written.includes('.ctxmux/config.json')) written.push('.ctxmux/config.json')

  const ignored = await ensureGitignore(root)

  /*
   * Workflows are part of being ready, not an advanced extra.
   *
   * They arrive inert — the kill switch is unset, so nothing runs until somebody says so —
   * which makes them a proposal in a diff rather than something that starts acting the moment
   * it lands. Same as the starter rules and skills beside them.
   *
   * Never overwritten. A file carrying repository write permissions and a token deserves more
   * caution than the generated context files, not less.
   */
  const ctx = {
    profile,
    tracker,
    agent,
    hasRemote: await hasGitRemote(root),
  }

  const workflows: string[] = []
  if (!flagBool(args, 'no-workflows')) {
    for (const file of workflowFiles(ctx)) {
      const abs = path.join(root, file.path)
      if (await fs.access(abs).then(() => true, () => false)) continue
      await writeFileAtomic(abs, file.content)
      workflows.push(file.path)
    }
  }

  /*
   * Compile, so that finishing means finished.
   *
   * Leaving this to a second command meant `init` ended with nothing generated and a repository
   * that looked configured but was not. "Everything ready" has to include the output.
   */
  const report = await sync({ root, targets: targets as never })
  const generated = report.records.filter((r) => r.status === 'created' || r.status === 'updated')

  heading('Created')
  for (const p of written) bullet(p)
  for (const p of workflows) bullet(p)
  if (ignored) bullet(`.gitignore ${c.dim('(added .ctxmux/state/ and .ctxmux/cache/)')}`)

  if (generated.length > 0) {
    heading(`Compiled to ${targets.join(', ')}`)
    for (const r of generated.slice(0, 10)) bullet(r.path)
    if (generated.length > 10) info(c.dim(`    ...and ${generated.length - 10} more`))
  }

  info('')
  success(
    `${written.length + workflows.length} file(s) written, ${generated.length} compiled. ` +
      `Tasks will run through ${c.bold(agent)} from ${c.bold(tracker)}.`,
  )

  if (report.records.some((r) => r.status === 'drift')) {
    info('')
    warn('Some generated files were edited by hand and were left alone.')
    info('    ' + c.dim('Move those edits into .ctxmux/ so they survive, or re-run sync with --force.'))
  }

  if (workflows.length > 0) {
    const configured = await configuredNames(root)
    const steps = remainingSetup(ctx, configured)
    const outstanding = steps.filter((s) => s.done !== true)

    info('')
    if (outstanding.length === 0) {
      success('Everything the workflow needs is already set.')
    } else {
      warn('Before the workflow can run:')
      for (const step of outstanding) {
        info('')
        bullet(step.what)
        info('    ' + c.bold(step.how))
      }
      if (configured.size > 0 && outstanding.length < steps.length) {
        info('')
        info(c.dim(`${steps.length - outstanding.length} already set, not shown.`))
      }
    }
  }

  /*
   * Always review what landed; the report is silent unless there is something to say.
   *
   * This was once gated on having imported existing config, on the theory that the starter pack
   * is clean by construction and advising after it is noise. It is not: a starter rule whose
   * globs match nothing in this particular repository is worth hearing about, and the gate
   * suppressed exactly that. Since the check needs no network and costs nothing, the gate
   * bought nothing and hid a real case.
   */
  await reviewWhatIsThere(root, wantAdvice)

  info('')
  info('Next:')
  info('  ' + c.bold('ctxmux run "add a date helper" --dry-run') + c.dim('   see what it would do, for free'))
  info('  ' + c.bold('ctxmux doctor') + c.dim('                              check for anything that will fail silently'))
  return 0
}
