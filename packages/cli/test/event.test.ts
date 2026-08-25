/**
 * `ctxmux event` — feed a forge webhook into a run.
 *
 * The fan-out problem is the whole reason this exists: one person submitting a review with
 * three inline comments produces four deliveries, and a pipeline that treats each as separate
 * feedback burns its escalation budget on a single click.
 */
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { eventCommand, normalizeGitHubEvent } from '../src/commands/event.js'
import {
  argv,
  makeRepo,
  removeRepo,
  runCli,
  useIsolatedEnv,
} from './helpers.js'

useIsolatedEnv()

let root: string
beforeEach(async () => {
  root = await makeRepo()
})
afterEach(() => removeRepo(root))

async function recordRun(id: string, over: Record<string, unknown> = {}): Promise<void> {
  const run = {
    id,
    task: { id: id.replace(/^run-/, ''), title: 'A task', body: '', acceptanceCriteria: [], scope: { allow: [], deny: [] }, qualityGate: [], origin: { tracker: 'file', id }, labels: [] },
    state: 'in_review',
    attempt: 0,
    feedbackRound: 0,
    policy: { maxFeedbackRounds: 2, maxAttempts: 2, selfCorrect: true },
    history: [],
    gateOutcomes: [],
    ...over,
  }
  const dir = path.join(root, '.ctxmux', 'state', 'runs')
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, `${encodeURIComponent(id)}.json`), JSON.stringify(run), 'utf8')
}

async function payloadFile(payload: unknown): Promise<string> {
  const p = path.join(root, 'event.json')
  await fs.writeFile(p, JSON.stringify(payload), 'utf8')
  return p
}

describe('normalising a GitHub payload', () => {
  it('reads a review verdict', () => {
    const events = normalizeGitHubEvent(
      'pull_request_review',
      { review: { state: 'changes_requested', body: 'narrow this', user: { login: 'alice' } } },
      'run-T-1',
    )

    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ kind: 'review_submitted', state: 'changes_requested', actor: 'alice' })
  })

  it('keeps the file and line an inline comment was anchored to', () => {
    const events = normalizeGitHubEvent(
      'pull_request_review_comment',
      { comment: { body: 'rename this', user: { login: 'alice' }, path: 'src/a.ts', line: 12 } },
      'run-T-1',
    )

    expect(events[0]).toMatchObject({ kind: 'review_comment', file: 'src/a.ts', line: 12 })
  })

  it('ignores a comment on the task issue itself', () => {
    // A comment on an issue is a human talking to a human; only comments on the pull request
    // are review feedback.
    const onIssue = normalizeGitHubEvent(
      'issue_comment',
      { comment: { body: 'thanks!', user: { login: 'alice' } }, issue: { number: 1 } },
      'run-T-1',
    )
    const onPr = normalizeGitHubEvent(
      'issue_comment',
      { comment: { body: 'please fix', user: { login: 'alice' } }, issue: { number: 1, pull_request: {} } },
      'run-T-1',
    )

    expect(onIssue).toHaveLength(0)
    expect(onPr).toHaveLength(1)
  })

  it('distinguishes a merge from a close', () => {
    expect(
      normalizeGitHubEvent('pull_request', { action: 'closed', pull_request: { number: 3, merged: true } }, 'r')[0],
    ).toMatchObject({ kind: 'pr_merged' })
    expect(
      normalizeGitHubEvent('pull_request', { action: 'closed', pull_request: { number: 3, merged: false } }, 'r')[0],
    ).toMatchObject({ kind: 'pr_closed' })
  })
})

describe('event', () => {
  it('says what to type when given neither an event nor a payload', async () => {
    const { code, text } = await runCli(eventCommand, argv(root, 'event'))

    expect(code).toBe(1)
    expect(text).toContain('ctxmux event --event')
  })

  it('reports an unreadable payload rather than throwing', async () => {
    const { code, text } = await runCli(
      eventCommand,
      argv(root, 'event --event pull_request_review --payload /nope/event.json'),
    )

    expect(code).toBe(1)
    expect(text).toContain('Could not read the event payload')
  })

  it('fails loudly when no run matches, rather than reporting success', async () => {
    /*
     * This used to exit 0. Run state lives in `.ctxmux/state/`, which is not committed — so a
     * workflow reacting to a review runs in a fresh checkout and finds nothing the workflow
     * that dispatched the agent wrote. Reporting success there meant the job went green on
     * every review while the feedback reached nobody, forever, with nothing red to notice.
     */
    const p = await payloadFile({ pull_request: { number: 7 } })

    const { code, text } = await runCli(
      eventCommand,
      argv(root, `event --event pull_request --payload ${p}`),
    )

    expect(code).toBe(1)
    expect(text).toContain('No run here owns pull request #7')
    expect(text).toContain('ctxmux state pull')
  })

  it('stays quiet when the caller says events about other runs are expected', async () => {
    const p = await payloadFile({ pull_request: { number: 7 } })

    const { code, text } = await runCli(
      eventCommand,
      argv(root, `event --event pull_request --payload ${p} --if-no-run ignore`),
    )

    expect(code).toBe(0)
    expect(text).toContain('nothing to do')
  })

  it('will not guess between two runs claiming the same pull request', async () => {
    /*
     * Matching used to compare the number against `handleRef`, which for a delegated agent is
     * the *issue* number — and GitHub numbers issues and pull requests from one sequence. A
     * reviewer's feedback could land on somebody else's run.
     */
    await recordRun('run-A', { result: { status: 'succeeded', filesChanged: [], summary: '', location: { prUrl: 'https://github.com/o/r/pull/7' } } })
    await recordRun('run-B', { result: { status: 'succeeded', filesChanged: [], summary: '', location: { prUrl: 'https://github.com/o/r/pull/7' } } })
    const p = await payloadFile({ pull_request: { number: 7 } })

    const { code, text } = await runCli(
      eventCommand,
      argv(root, `event --event pull_request --payload ${p}`),
    )

    expect(code).toBe(1)
    expect(text).toContain('2 runs claim pull request #7')
    expect(text).toContain('--run')
  })

  it('finds the run by its pull request URL', async () => {
    await recordRun('run-A', { result: { status: 'succeeded', filesChanged: [], summary: '', location: { prUrl: 'https://github.com/o/r/pull/7' } } })
    const p = await payloadFile({
      pull_request: { number: 7 },
      review: { state: 'approved', body: '', user: { login: 'alice' } },
    })

    const { text } = await runCli(
      eventCommand,
      argv(root, `event --event pull_request_review --payload ${p} --dry-run`),
    )

    expect(text).toContain('-> run-A')
  })

  it('ignores its own bot, which is how these pipelines loop forever', async () => {
    await recordRun('run-T-1')
    const p = await payloadFile({
      comment: { body: 'I have opened a pull request.', user: { login: 'copilot-swe-agent[bot]' } },
      issue: { number: 1, pull_request: {} },
    })

    const { code, text } = await runCli(
      eventCommand,
      argv(root, `event --event issue_comment --payload ${p} --run run-T-1`),
    )

    expect(code).toBe(0)
    expect(text).toContain('Nothing actionable')
  })

  it('ignores an empty comment, which is a reaction rather than feedback', async () => {
    await recordRun('run-T-1')
    const p = await payloadFile({
      comment: { body: '   ', user: { login: 'alice' } },
      issue: { number: 1, pull_request: {} },
    })

    const { code, text } = await runCli(
      eventCommand,
      argv(root, `event --event issue_comment --payload ${p} --run run-T-1`),
    )

    expect(code).toBe(0)
    expect(text).toContain('Nothing actionable')
  })

  it('folds a review and its inline comments into one round', async () => {
    await recordRun('run-T-1')
    const p = await payloadFile({
      review: { state: 'changes_requested', body: 'see comments', user: { login: 'alice' } },
      comment: { body: 'rename this', user: { login: 'alice' }, path: 'src/a.ts', line: 3 },
    })

    const { code, text } = await runCli(
      eventCommand,
      argv(root, `event --event pull_request_review --payload ${p} --run run-T-1 --dry-run`),
    )

    expect(code).toBe(0)
    expect(text).toContain('Changes requested')
    expect(text).toContain('dry run: not submitted')
  })

  it('submits an approval and moves the run on', async () => {
    await recordRun('run-T-1')
    const p = await payloadFile({ review: { state: 'approved', body: '', user: { login: 'alice' } } })

    const { code, text } = await runCli(
      eventCommand,
      argv(root, `event --event pull_request_review --payload ${p} --run run-T-1`),
    )

    expect(code).toBe(0)
    expect(text).toContain('Approved')
    expect(text).toContain('completed')
  })

  it('does not spend a second round on a redelivery of the same review', async () => {
    /*
     * Forges redeliver routinely, and each redelivery arrives with a *new* delivery id — so
     * keying on that would let one review consume every revision round the run had.
     */
    await recordRun('run-T-1')
    const p = await payloadFile({ review: { state: 'approved', body: '', user: { login: 'alice' } } })
    const line = `event --event pull_request_review --payload ${p} --run run-T-1`

    await runCli(eventCommand, argv(root, line))
    const { code, text } = await runCli(eventCommand, argv(root, line))

    expect(code).toBe(0)
    expect(text).toContain('already handled (redelivery)')
  })

  it('reports a run that is not recorded here', async () => {
    const p = await payloadFile({ review: { state: 'approved', body: '', user: { login: 'alice' } } })

    const { code, text } = await runCli(
      eventCommand,
      argv(root, `event --event pull_request_review --payload ${p} --run run-nope`),
    )

    expect(code).toBe(1)
    expect(text).toContain('not recorded here')
  })
})
