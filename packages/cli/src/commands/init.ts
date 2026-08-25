import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { detectTargets, importContext, sync, writeFileAtomic } from '@contextmux/context'
import { detectProfile } from '@contextmux/repo'
import { bullet, c, heading, info, success, warn } from '../ui.js'
import { flagBool, flagString, type ParsedArgs } from '../args.js'
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


/** Which tracker this repository will resolve, so the workflow names the right one. */
function detectTracker(): string {
  if (process.env['JIRA_URL']?.trim()) return 'jira'
  if (process.env['GITHUB_REPOSITORY']?.trim() || process.env['CTXMUX_REPO']?.trim()) return 'github'
  return 'file'
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

export async function initCommand(args: ParsedArgs): Promise<number> {
  const root = flagString(args, 'root') ?? process.cwd()
  const force = flagBool(args, 'force', 'f')

  const dir = path.join(root, '.ctxmux')
  const already = await fs
    .access(dir)
    .then(() => true)
    .catch(() => false)

  if (already && !force) {
    warn('.ctxmux/ already exists — leaving it alone.')
    info('    ' + c.dim('Re-run with --force to add any starter files that are missing.'))
    info('    ' + c.dim('`ctxmux sync` compiles what is already there.'))
    return 1
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
  const detected = imported ? detectTargets(imported.provenance) : []
  const askable = interactive() && !flagBool(args, 'yes', 'y')

  let targets = detected.length > 0 ? detected : ['claude', 'copilot', 'cursor', 'codex']
  let agent = 'claude'
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
        targets,
      )
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
    info('')
    warn('Before the workflow can run:')
    for (const item of remainingSetup(ctx)) bullet(item)
  }

  info('')
  info('Next:')
  info('  ' + c.bold('ctxmux run "add a date helper" --dry-run') + c.dim('   see what it would do, for free'))
  info('  ' + c.bold('ctxmux doctor') + c.dim('                              check for anything that will fail silently'))
  return 0
}
