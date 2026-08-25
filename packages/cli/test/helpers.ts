/**
 * Shared scaffolding for the command tests.
 *
 * Commands are exercised end to end against a real temporary directory rather than through
 * mocks. What a command *does* is almost entirely filesystem effects and an exit code, and a
 * mocked filesystem would assert that the code calls the functions it calls — which is the one
 * thing already obvious from reading it.
 */
import { spawn } from 'node:child_process'
import { promises as fs } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { afterEach, beforeEach, vi } from 'vitest'
import { parseArgs, type ParsedArgs } from '../src/args.js'

/** A temporary directory laid out with the files a test needs. */
export async function makeRepo(files: Record<string, string> = {}): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ctxmux-cli-'))
  await writeAll(root, files)
  return root
}

export async function writeAll(root: string, files: Record<string, string>): Promise<void> {
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(root, rel)
    await fs.mkdir(path.dirname(abs), { recursive: true })
    await fs.writeFile(abs, content, 'utf8')
  }
}

export async function removeRepo(root: string): Promise<void> {
  await fs.rm(root, { recursive: true, force: true })
}

export async function read(root: string, rel: string): Promise<string> {
  return fs.readFile(path.join(root, rel), 'utf8')
}

export async function exists(root: string, rel: string): Promise<boolean> {
  return fs.access(path.join(root, rel)).then(
    () => true,
    () => false,
  )
}

export async function list(root: string, rel: string): Promise<string[]> {
  return fs.readdir(path.join(root, rel)).then(
    (f) => f.sort(),
    () => [],
  )
}

/** Turn a command line into parsed args, with `--root` pointed at the fixture. */
export function argv(root: string, line: string): ParsedArgs {
  return parseArgs([...line.split(' ').filter(Boolean), '--root', root])
}

export interface Captured {
  /** Everything written to stdout and stderr, in order. */
  lines: string[]
  /** Joined, for `toContain` on output that wraps across calls. */
  text: string
}

/**
 * Run a command with its output captured rather than printed.
 *
 * Both streams are collected because the commands deliberately split them — `error` writes to
 * stderr so a CI job can separate a failure from a report — and a test asserting on a message
 * should not have to know which one it went to.
 */
export async function runCli(
  command: (args: ParsedArgs) => Promise<number>,
  args: ParsedArgs,
): Promise<{ code: number } & Captured> {
  const lines: string[] = []
  const collect = (...parts: unknown[]) => {
    lines.push(parts.map(String).join(' '))
  }
  const log = vi.spyOn(console, 'log').mockImplementation(collect)
  const err = vi.spyOn(console, 'error').mockImplementation(collect)

  try {
    const code = await command(args)
    return { code, lines, text: lines.join('\n') }
  } finally {
    log.mockRestore()
    err.mockRestore()
  }
}

/** As `runCli`, but for a command expected to throw — a usage error, say. */
export async function runCliExpectingThrow(
  command: (args: ParsedArgs) => Promise<number>,
  args: ParsedArgs,
): Promise<Error> {
  const log = vi.spyOn(console, 'log').mockImplementation(() => {})
  const err = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    await command(args)
    throw new Error('expected the command to throw, but it returned')
  } catch (e) {
    return e as Error
  } finally {
    log.mockRestore()
    err.mockRestore()
  }
}

function git(root: string, args: string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn('git', args, { cwd: root, windowsHide: true, stdio: 'ignore' })
    child.on('error', () => resolve(1))
    child.on('close', (code) => resolve(code ?? 1))
  })
}

/**
 * Make the fixture a real git repository with one commit.
 *
 * Needed by anything that isolates work into a worktree, and by the parts of the repo index
 * that read history. Identity is set locally so the test does not depend on the machine
 * having a global git config.
 */
export async function initGit(root: string): Promise<void> {
  await git(root, ['init', '-q', '-b', 'main'])
  await git(root, ['config', 'user.email', 'test@example.com'])
  await git(root, ['config', 'user.name', 'Test'])
  await git(root, ['add', '-A'])
  await git(root, ['commit', '-qm', 'initial'])
}

/**
 * A git repository with no commits.
 *
 * Not a contrived state: it is what every project looks like for its first hour, and what one
 * looks like whenever the work has not been committed yet.
 */
export async function initGitWithoutCommit(root: string): Promise<void> {
  await git(root, ['init', '-q', '-b', 'main'])
  await git(root, ['config', 'user.email', 'test@example.com'])
  await git(root, ['config', 'user.name', 'Test'])
}

/** A repository with a remote, which is what makes a workflow worth scaffolding. */
export async function initGitWithRemote(root: string): Promise<void> {
  await initGitWithoutCommit(root)
  await git(root, ['remote', 'add', 'origin', 'https://github.com/acme/web.git'])
}

/** A minimal but valid canonical source, for commands that need one to exist. */
export const MINIMAL_CONTEXT: Record<string, string> = {
  '.ctxmux/instructions.md': 'Be careful and change only what the task requires.\n',
  '.ctxmux/rules/scope.md': [
    '---',
    'name: scope',
    'description: Stay inside the files the task names',
    '---',
    '',
    'Change only the files the task requires.',
    '',
  ].join('\n'),
}

/**
 * Every environment variable the CLI consults, cleared for the duration of a suite.
 *
 * Without this the tests read the machine they run on. `GITHUB_REPOSITORY` is set on every
 * GitHub Actions runner, so a test asserting that Copilot cannot be configured passes locally
 * and fails in CI — which is the least useful place to find out.
 */
const CLI_ENV = [
  'CTXMUX_AGENT',
  'CTXMUX_TRACKER',
  'CTXMUX_REPO',
  'CTXMUX_LABEL',
  'CTXMUX_JQL',
  'CTXMUX_LOCAL_HARNESS',
  'GITHUB_REPOSITORY',
  'GITHUB_EVENT_NAME',
  'GITHUB_EVENT_PATH',
  'GITHUB_TOKEN',
  'GH_TOKEN',
  'JIRA_URL',
  'JIRA_EMAIL',
  'JIRA_API_TOKEN',
  'JIRA_ESTIMATE_FIELD',
  'CTXMUX_DEBUG',
  'OTEL_EXPORTER_OTLP_ENDPOINT',
  'OTEL_EXPORTER_OTLP_TRACES_ENDPOINT',
  'OTEL_EXPORTER_OTLP_HEADERS',
]

/** Call at the top level of a suite that resolves adapters or reads the environment. */
export function useIsolatedEnv(): void {
  beforeEach(() => {
    // `undefined` removes it; an empty string would still be *set*, which is a different
    // thing entirely and one the CLI now distinguishes.
    for (const key of CLI_ENV) vi.stubEnv(key, undefined)
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })
}
