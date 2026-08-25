# contextmux

**Turn a ticket into a reviewed pull request, under rules the agent cannot ignore.**
**And write those rules once, for whichever coding agents you use.**

```bash
ctxmux run ABC-1234 --tracker jira --agent copilot
```

It reads the ticket, refuses it if there is nothing to verify a change against, hands it to an
agent, and then checks what came back — not what the agent said it did:

| Guarantee | What it means |
| --- | --- |
| **Path scope** | Which files this task may touch. Checked against the diff, not the prompt. |
| **Test integrity** | It cannot make the suite pass by deleting or skipping the test. |
| **Quality gate** | Your project's own test, lint and typecheck commands, run on the result. |
| **Readiness** | A task too vague to attempt is refused before an agent is spent on it. |
| **Isolation** | The agent works in a git worktree. Your checkout is never touched. |
| **Escalation** | Refusals, repeated failures and weakened tests go to a person, not round the loop. |

A failing check goes back to the agent as feedback — with the actual compiler output, not a
summary. Bounded, then escalated to you.

A ticket can come from Jira, a GitHub issue, a markdown file in the repo, or nothing at all:

```bash
ctxmux run "add a date helper"
```

## The rules it enforces come from one place

Those rules are the agent config you already have — `CLAUDE.md`,
`.github/copilot-instructions.md`, `.cursor/rules/`, `AGENTS.md` — read into a single source and
compiled back out to whichever of them you actually use.

```bash
ctxmux init       # reads what is already there, compiles it back out
```

If your team only uses Copilot, `init` notices and only writes Copilot files. Nothing is
generated for tools you do not use.

This half stands alone: no key, no agent, no cost — it only touches files.

→ **[Getting started](#getting-started)** · [Run a task](#path-b--run-a-task) · [How compiling works](#how-the-compiling-works)

---

## Getting started

Requires **Node 22+**. Install, then one command. Nothing spent, fully reversible.

### 1. Install it

```bash
npm install -g contextmux     # or: pnpm add -g contextmux
ctxmux --version
```

Or run it without installing anything:

```bash
npx contextmux --help
```

<details>
<summary>From source</summary>

```bash
git clone https://github.com/contextmux/contextmux
cd contextmux && pnpm install && pnpm build
pnpm bundle                   # one portable file, no node_modules

alias ctxmux='node ~/contextmux/packages/action/dist/ctxmux.mjs'
```

The bundle is the same single file the [GitHub Action](#running-tasks-from-a-workflow) runs, so
it needs nothing installed beside it.
</details>

### 2. Point it at a project, on a branch you can throw away

```bash
cd ~/your-project
git checkout -b ctxmux-trial
```

### 3. Run one command

```bash
ctxmux init
```

That is the whole setup. It reads the agent config you already have — `CLAUDE.md`,
`.github/instructions/**`, `.cursor/rules/`, `AGENTS.md` — into `.ctxmux/`, or scaffolds a
starter pack if there is none. It detects your package manager and test commands, asks which
agent should run tasks and where tasks come from, writes that to `.ctxmux/config.json`, and
compiles everything out.

```
Detected
  - package manager: pnpm@10.33.0
  - quality gate: pnpm run typecheck && pnpm run lint

Imported
  - .github/copilot-instructions.md -> .ctxmux/instructions.md
  - .github/instructions/hooks.instructions.md -> .ctxmux/rules/hooks.md
    ...and 14 more

Which agent should run tasks?
  > 1) Claude Code       runs here, needs ANTHROPIC_API_KEY
    2) GitHub Copilot    runs in GitHub, opens its own PR

  choose [1]:

OK  7 file(s) written, 19 compiled. Tasks will run through claude from file.
```

It only asks what it cannot work out. Finding Copilot config already there settles which agents
to generate for, so that question is skipped — and **nothing is generated for tools you do not
use**. Pressing enter takes the answer it already worked out.

Without a terminal — a pipe, a CI runner, `--yes` — it asks nothing and uses what it detected.

### 4. See what it did

```bash
ctxmux doctor            # anything that will fail silently
ctxmux sync --explain    # what each agent cannot represent
```

### 5. Undo it, or keep it

```bash
git checkout . && git clean -fd      # as if nothing happened
```

That is the whole context compiler, and for most people it is the whole tool. To hand a task to
an agent under gates, carry on to [Path B](#path-b--run-a-task).

---

## How the compiling works

```
        .ctxmux/           ← the one place you write things down
            │
      ctxmux sync
            │
   ┌────────┼─────────┬───────────┐
   ▼        ▼         ▼           ▼
CLAUDE.md  .github/  .cursor/  AGENTS.md    ← generated; never edited by hand
```

Each target wants the same rules in a different file and a different dialect, and not all of
them can express the same things. Where a tool genuinely cannot — Codex has no way to activate
a skill on demand, so every skill sits in its context all the time — contextmux says so rather
than pretending the four are equivalent. `sync --explain` prints exactly what each one loses.

Generated files are never edited by hand: contextmux writes a provenance header, notices if you
edit inside it, and refuses to overwrite your work rather than silently discarding it.

---

## What you just did, and what is left

| Half | What it needs | What you get |
| --- | --- | --- |
| **The context compiler** *(done)* | nothing. No key, no agent, no cost | one source of rules, compiled to the agents you use |
| **The task runner** | an agent, and a key or a Copilot seat | a ticket driven to a proposed change, under gates |

The second builds on the first: the rules you just compiled are what the agent is held to. It is
also optional — plenty of people want only the compiler, and stopping here is a complete use of
the tool.

---

## Path B — Run a task

Everything here is reversible. The agent works in a git worktree, never your checkout, and
`--dry-run` spends nothing.

### 1. A branch to try it on

```bash
git checkout -b ctxmux-trial
```

### 2. See what would happen, for free

```bash
ctxmux run "add a helper that formats a ratio as a percentage" \
  --dry-run --allow 'src/**'
```

`--dry-run` fetches the task, runs the preflight gates and assembles the prompt, then stops
before dispatching. Nothing is written and no agent is paid.

Use it to check three things: that the task passes **readiness**, that `--allow` covers the
files the change needs, and — with `--verbose` — that the prompt looks sane.

### 3. Run it

```bash
ctxmux run "add a helper that formats a ratio as a percentage" --allow 'src/**'
```

```
Run
  -> ready (preflight_passed)
  agent claude-code working...
  agent succeeded, 3 file(s) changed
  -> proposed (agent_succeeded)
  - reject path-scope: 1 file(s) changed outside the task's scope:
      package.json (explicitly out of scope)
  -> revising (verify_failed)
  agent claude-code (revision round 1) working...
  -> in_review (verify_passed)
```

The work is in a worktree. `ctxmux run` prints the path; `cd` there and `git diff` to read it.

### 4. See what it cost and what it did

```bash
ctxmux status          # every run, with a cost per run and a total
ctxmux trace T-1       # the steps the agent took, and any smells in them
```

### 5. Undo everything

```bash
git worktree list                      # the run's worktree, if it kept one
rm -rf .ctxmux/state                   # run records, leases, effect markers
git checkout . && git clean -fd
```

`.ctxmux/state/` is gitignored, so none of it was ever going to be committed.

---

## Choosing an agent

| Agent | Runs where | Needs | Opens a pull request |
| --- | --- | --- | --- |
| `claude` | your machine, in a worktree | `ANTHROPIC_API_KEY` | with `--open-pr` |
| `copilot` | GitHub's cloud | the coding agent enabled, plus `CTXMUX_REPO` | itself |
| `cursor`, `codex`, `local` | your machine | the vendor's CLI on `PATH` | with `--open-pr` |

`ctxmux run` defaults to `claude`. Pick another with `--agent`.

### Claude, and the other CLI agents

```bash
export ANTHROPIC_API_KEY='...'
ctxmux run T-1 --agent claude
```

They work in an isolated worktree on your machine, so they can install dependencies and run
your tests. Add `--open-pr` to push the branch and open a pull request when it finishes —
without it the work stays in the worktree for you to look at.

> Only the Claude adapter has been run against its real CLI. `cursor`, `codex` and `local` were
> written from documentation, and `preflight` says so rather than failing in a way that looks
> like the agent doing poor work.

### GitHub Copilot

```bash
export CTXMUX_REPO=owner/name          # not inferred from your git remote
ctxmux run T-1 --agent copilot
```

Two prerequisites the CLI cannot supply for you:

**The coding agent must be assignable on the repository.** It needs a Copilot plan that includes
it. Check before you spend anything:

```bash
gh api graphql -H "GraphQL-Features: issues_copilot_assignment_api_support" -f query='
query { repository(owner: "OWNER", name: "NAME") {
  suggestedActors(capabilities: [CAN_BE_ASSIGNED], first: 20) { nodes { __typename login } } } }'
```

A `Bot` named `copilot-swe-agent` in the result means you are good. That is the exact call
`preflight` makes.

**`CTXMUX_REPO` must be the repository's current name.** If an organisation was renamed, GitHub
serves reads through a redirect that writes do not follow — so everything looks configured until
the first write fails. contextmux now names the new owner when that happens.

Copilot works in GitHub's sandbox, which usually cannot install a private project's
dependencies. It is not asked to: contextmux runs your test and lint commands itself, against
the branch Copilot pushed, and hands back any failures as feedback.

---

## Choosing a tracker

| Tracker | Where tasks live | Needs |
| --- | --- | --- |
| `file` *(default)* | `.ctxmux/tasks/*.md` in the repo | nothing |
| `github` | GitHub issues | `gh auth login`, or `GITHUB_TOKEN` |
| `jira` | a Jira project | three environment variables |

A bare sentence is a task too — `ctxmux run "add a date helper"` needs no file at all.

### Jira

```bash
export JIRA_URL='https://your-site.atlassian.net'   # the site root, nothing after it
export JIRA_EMAIL='you@example.com'
export JIRA_API_TOKEN='...'                          # id.atlassian.com → Security → API tokens

ctxmux run ABC-1234 --tracker jira --dry-run
```

`JIRA_URL` is the **site root only**. Paste a board URL like
`https://site.atlassian.net/jira/software/c/projects/ABC/boards/42` and every request goes to
the wrong place.

Start with `--dry-run`. It reads the ticket, converts its description, extracts the acceptance
criteria and runs the gates — without dispatching anything. That exercises the whole Jira path
for free.

---

## When it stops

contextmux stops rather than guessing. Each of these is a decision, not a crash.

### `reject readiness: no acceptance criteria found`

The ticket does not say what "done" means, so nothing could verify the change. Add a section
under any of these headings, followed by a list or a sentence:

```
## Acceptance criteria     ## Expected behaviour     ## Requirements
## Done when               ## Definition of done     ## Expected result
```

A bug report's **Expected behaviour** counts — that is its acceptance criterion.

### `reject path-scope: N file(s) changed outside the task's scope`

The agent touched something `--allow` did not cover, or something in the built-in deny list
(lockfiles, CI config, `package.json`). Widen `--allow`, or leave it — a rejection here is the
gate doing its job.

### `escalated — needs a human`

Repeated failures, a refusal, or a weakened test. contextmux will not loop on it. `ctxmux status`
shows why; the tracker gets a `needs-human` label and a comment.

### `already finished (rejected) and the task is unchanged`

A run of that task already reached a terminal state. Change the task — fixing what a gate
complained about counts — or clear the record:

```bash
rm .ctxmux/state/runs/run-<TASK>.json
```

### `agent still working` for a long time

For a cloud agent, look at the pull request. If it has committed and requested a review, it has
finished. If nothing has appeared after several minutes, check the agent's own job log on the
repository's Actions tab.

---

## The three things it does

### 1. Compiles one source to the targets you use

```
.ctxmux/
  instructions.md         # global, always-on
  rules/*.md              # path-scoped, by glob
  skills/<name>/SKILL.md  # description-activated, with bundled resources
  agents/<name>.md        # named roles with tool and model constraints
  commands/<name>.md      # reusable prompts
  mcp.json                # MCP servers
```

| Canonical | Claude Code | Copilot | Cursor | Codex |
| --- | --- | --- | --- | --- |
| instructions | `CLAUDE.md` | `.github/copilot-instructions.md` | `.cursor/rules/` | `AGENTS.md` |
| rules | sections | `.github/instructions/*` (`applyTo:`) | `*.mdc` (`globs:`) | nested `AGENTS.md` |
| skills | native | prompt files ⚠ | glob-scoped rules ⚠ | inlined ⚠ |
| agents | native | `.github/agents/*` | reference only ⚠ | inlined ⚠ |
| mcp | `.mcp.json` | repo settings ⚠ | `.cursor/mcp.json` | `~/.codex/config.toml` ⚠ |

⚠ means lossy — and `sync --explain` prints exactly what degraded and why:

```
Codex  —  2 file(s), 1 degraded
  ✓ instructions   1  native
  ~ skills         2  → sections in AGENTS.md
                    lost: no activation mechanism and no progressive disclosure — every
                          skill body is always in context, which spends tokens on skills
                          that are not relevant
```

Four vendors are not equivalent. A matrix of green checkmarks that lies is worse than no tool.

### 2. Never destroys your edits

Generated files carry a provenance header and a content hash. Hand-edit one and `sync` refuses
to overwrite it:

```
!   1 generated file(s) were edited by hand and were left alone.
    Move your changes into .ctxmux/ so they survive, or re-run with --force to discard them.
```

Files you co-own — `CLAUDE.md`, `AGENTS.md` — get a managed block, and everything outside it
is preserved verbatim, so you can add your own sections freely.

A file contextmux did not write is never replaced, even when it has no provenance to compare
against. `check` exits non-zero on drift, so CI catches it.

### 3. Runs tasks under policy

```bash
ctxmux run T-1
```

The run is a pure state machine with no I/O, so when it escalates, and after how many rounds,
is settled by tests rather than by hoping.

Gates run at two moments. **Preflight** decides whether the task is worth attempting at all —
so a vague one is refused before an agent is spent on it. **Verify** runs against what the agent
actually produced, and a failure goes back to it as feedback rather than to you: bounded, then
escalated.

Isolation is not best-effort: if a worktree cannot be created, contextmux refuses to run rather
than quietly editing your checkout.

---

## Commands

| Command | What it does |
| --- | --- |
| `ctxmux init` | Set the repository up: import or scaffold, configure, compile |
| `ctxmux import` | Just the import step, without the rest of `init` |
| `ctxmux sync` | Compile to every configured target |
| `ctxmux check` | Verify generated files are current; non-zero exit if not |
| `ctxmux doctor` | Report what will fail silently |
| `ctxmux map` | Query the repository index |
| `ctxmux run` | Drive a task to a proposed change, under gates |
| `ctxmux status` | Show recorded runs and what is waiting on you |
| `ctxmux trace` | Show what an agent actually did, step by step |
| `ctxmux event` | Feed a forge webhook (a review, a comment) into a run |
| `ctxmux eval` | Run one task through several agents and compare the results |
| `ctxmux learn` | Turn recurring review feedback into proposed edits to `.ctxmux/` |
| `ctxmux add` | Install a third-party skill pack |
| `ctxmux handoff` | Show what would be transferred to another agent, and what it costs |
| `ctxmux state` | Share run state between machines and jobs (`push` \| `pull`) |

Common flags: `--targets claude,cursor`, `--dry-run`, `--force`, `--explain`, `--root <dir>`.

### `.ctxmux/config.json`

`init` writes it; nothing else has to be remembered on the command line afterwards.

```json
{
  "targets": ["copilot"],
  "agent": "copilot",
  "tracker": "jira"
}
```

| Field | What it does |
| --- | --- |
| `targets` | Which agents `sync` generates for. Files are written for these and no others. |
| `agent` | Which agent `run` uses when `--agent` is not given. |
| `tracker` | Where `run` looks for a task when `--tracker` is not given. |
| `provenance` | Emit headers on generated files. Turning it off makes drift undetectable. |

Precedence is **flag → environment → config → default**, so a one-off `--agent claude` still
wins, and CI can override with `CTXMUX_AGENT` without editing a file.

`ctxmux run --json` prints one JSON object describing the finished run — state, files changed,
correction rounds, gate verdicts, pull request URL, cost — and nothing else on stdout. That is
what the GitHub Action reads, so a workflow never has to parse a human report.

### In CI

```yaml
- run: ctxmux check --strict
```

Exit codes: `0` in sync, `1` out of date, `2` a generated file was hand-edited.

### Running tasks from a workflow

`ctxmux init` scaffolds both workflows when the repository has a remote — filled in from what
it detected, not from a template you have to correct:

```
Created
  - .github/workflows/ctxmux-run.yml
  - .github/workflows/ctxmux-review.yml

Before the workflow can run:
  - CTXMUX_TOKEN is not set as a repository secret
  - the Copilot coding agent is not enabled on this repository
  - CTXMUX_ENABLED is unset, so nothing runs — set it to 'true' when you are ready
```

They arrive **inert**. Every job is guarded by `if: vars.CTXMUX_ENABLED == 'true'`, so the files
are a proposal to read in a diff rather than something that starts acting the moment they land,
and the kill switch is a repository variable — stopping it never means editing a workflow.

`--no-workflows` skips them, and nothing is scaffolded without a remote.

They are written once and never regenerated: a file carrying repository write permissions and a
token deserves more caution than the generated context files, not less. Which means one
scaffolded a while ago can fall behind, so `doctor` says when it has:

```
!   workflow: ctxmux-review.yml predates share-state
      Without share-state the review workflow cannot find the run it is meant to advance,
      and says nothing.
```

### Sharing run state

`.ctxmux/state/` — run records, trajectories, and the ledger `learn` draws on — is deliberately
not committed to your branch. It changes on every run and records absolute paths.

That costs two things, and `ctxmux state` buys them back:

```bash
ctxmux state push      # publish to a branch of its own
ctxmux state pull      # merge in what everyone else recorded
```

**A workflow reacting to a review runs in a fresh checkout.** It cannot see the run a different
workflow dispatched an hour ago, so `event` finds nothing and the feedback reaches no one — and
without this, silently. Set `share-state: 'true'` on the Action and it pulls before and pushes
after.

**And recurrence is otherwise measured per-person.** Five teammates each hitting the same
convention once is five ledgers with one observation apiece, and a lesson `learn` never
proposes. Pull first and it counts across the team, which is the point.

---

## Tasks

Tasks are markdown with frontmatter in `.ctxmux/tasks/`, reviewable like any other artefact:

```markdown
---
id: T-1
title: Add a percentage formatting helper
status: todo
scope:
  allow: ["src/**", "test/**"]
  maxFiles: 3
---

The dashboard shows raw ratios. Add a helper that formats one as a percentage.

## Acceptance criteria

- A `formatPercent` helper returns a locale-formatted percentage string
- It accepts an optional decimal count, defaulting to 1
- Tests cover a normal value, zero, and a custom decimal count
```

No tracker required — that is the default. `ctxmux run "add a date helper"` also works, for
trying something without writing a file first.

For teams that do have one, tracker, forge and agent compose independently:

```bash
ctxmux run ABC-1234 --tracker jira   --agent copilot --repo acme/web
ctxmux run 412      --tracker github --agent claude
ctxmux run T-1      --tracker file   --agent claude --allow "src/**"
```

A Jira ticket driving a Copilot pull request is the interesting configuration, and one you
cannot express if tracker and forge are the same object.

---

## Understanding your repository

`ctxmux init` detects the toolchain and writes it into the context, so agents stop running the
wrong commands:

```
- Install: pnpm install --frozen-lockfile
- Package manager: pnpm@10.0.0 — do not use any other

Before finalising any change, run all of these and fix every failure:
  pnpm run typecheck
  pnpm run test
```

An agent sandbox that runs `npm install` against a pnpm workspace fails every quality gate
before it starts, and fails silently. Detecting the toolchain removes the whole class.

`ctxmux map` builds a symbol-level index and returns a **token-budgeted**, ranked view of the
code relevant to a task, combining name and doc matches with git recency and co-change:

```bash
ctxmux map "add a currency formatter" --budget 3000
```

```
**src/helpers/format.ts** (3 matching symbols, recently changed)
  function `formatCurrency`:14 — Formats a value in the given currency.
  function `formatNumber`:31 — Locale-aware number formatting.
```

A directory listing cannot answer "does a helper for this already exist". A symbol index can,
and that question is the single most common defect in generated code.

Budget is a required input. Over budget the map degrades — full symbol detail, then names
only, then paths, then a directory skeleton — rather than truncating mid-structure. Omissions
are always reported.

`@contextmux/mcp-repo` exposes the same index as MCP tools — `repo_map`, `find_symbol`,
`find_similar`, `where_is`, `project_profile` — read-only by construction, because an agent
acting on untrusted issue text should not hold a tool that can change anything.

**How each agent gets it differs, and the difference matters.** A driven agent (Claude, Cursor,
Codex) reads `.mcp.json` or `.cursor/mcp.json` from the repository, so `sync` is enough.
Copilot's coding agent reads MCP configuration from **repository settings**, not from a file —
so `sync` writes `.github/copilot-mcp-config.md` for you to paste in, and until you do, Copilot
works from the repo map baked into the issue body at dispatch and from its own tools. That
snapshot is real and useful; it is not the same as being able to query the index mid-task.

---

## Beyond the basics

<details>
<summary><b>Comparing agents on the same task</b></summary>

```bash
ctxmux eval T-1 --agents claude,cursor,codex --out comparison.md
```

```
#  agent        verdict  tests  scope  files  diff  rounds  time   cost
-  -----------  -------  -----  -----  -----  ----  ------  -----  ------
1  Claude Code  passed   pass   clean  2      22    0       36.0s  $0.176
```

Every agent gets the identical task, the identical gates, and its own worktree branched from
the same commit. Scores come from the artefact each produced — whether your tests passed,
which files it touched, how large the diff is — never from a model judging another model.

Ranking puts correctness first. Weakening existing tests disqualifies outright, because a
suite that has been quietly loosened is worse than one that fails honestly. Cost is the last
tiebreak: a cheap wrong answer is not a bargain.
</details>

<details>
<summary><b>Recovery, not just retries</b></summary>

An agent that gets stuck at step 37 does not announce it. It calls the same search a fourth
time and eventually produces something confident and wrong. A plain retry re-sends the prompt
that already failed.

contextmux records what the agent *did*, not only what it produced:

```
$ ctxmux trace T-1

run-T-1 — claude-code
  - 19 step(s): 12 tool call(s), 3 message(s), 152s

Timeline
    7s  tool   Read   packages/handoff/src/render.ts
   83s  tool   Edit   packages/handoff/src/render.ts
  129s  tool   Bash   pnpm run test 2>&1 | tail -30

OK  Nothing concerning in how this was done.
```

While a run is in flight the harness samples the workspace and watches the tool stream. When
progress stops it kills the agent and retries **with the diagnosis attached** — not "the run
timed out" but *"you called the same search five times with identical arguments"*.

It looks for named, deterministic patterns — no risk score, no training set:

| Smell | Why it matters |
| --- | --- |
| `repeated-call` | The agent isn't learning from the result. The commonest way a run dies. |
| `write-before-read` | Modifying a file it never read is a guess, and a wrong guess drops work. |
| `acted-on-unresolved-error` | A failure it interpreted without checking. |
| `irreversible-while-struggling` | A migration during a failing run. **Blocks.** |
| `all-talk-no-action` | Deliberating instead of acting. |

There is deliberately no "3.2% chance of failure". Calibration needs thousands of labelled
outcomes, a fresh install has none, and a miscalibrated score teaches people to click through
warnings.

Trajectories export as OpenTelemetry spans, so Jaeger, Grafana Tempo or SigNoz can display
them — without the OTel SDK, since OTLP over HTTP is a documented wire format that `fetch`
covers. Off unless configured; no egress unless you ask for it.

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 ctxmux run T-1
ctxmux trace T-1 --otlp-json    # the payload itself, to pipe anywhere
```
</details>

<details>
<summary><b>Handing an unfinished task to another agent</b></summary>

```bash
ctxmux run T-1 --agents claude,codex
```

The second agent receives a package built from the **trajectory**, not the transcript — what
was tried, what failed, what is already on disk. Replaying a conversation costs as much as the
first attempt and carries the reasoning that got it stuck.

The valuable part is **negative knowledge**: what has already been ruled out. Every field is
tiered by how necessary it is thought to be, so the format can be argued with:

```
$ ctxmux handoff T-1

Already ruled out (2)
  - Bash: psql -c "\dt" — connection refused
  - Grep: DATABASE_URL — tried repeatedly without getting anywhere (3x)

Cost by tier
  none          142 tokens  task only (control)
  essential     271 tokens  task + workspace
  valuable      438 tokens  + what was ruled out
  optional      589 tokens  + everything else
```

`none` is a real control: the task alone, with no hint anything came before. Without it there
is no way to tell whether a handoff helped or whether the second agent would have managed
anyway.
</details>

<details>
<summary><b>Learning that compounds instead of accumulating</b></summary>

Agents get the same things wrong repeatedly, and the usual response — append every review
comment to a log and inject the most recent few — makes it worse. Recency says nothing about
importance, and the file grows with every merged pull request.

`ctxmux learn` watches for what **recurred** across tasks and proposes an edit to the skill or
rule it belongs to:

```
L-wz8ciu  seen across 2 tasks
  Use the shared date helper rather than inlining this.

  amends find-before-writing -> .ctxmux/skills/find-before-writing/SKILL.md

Nothing has been written.
  ctxmux learn --apply              write these into .ctxmux/
  ctxmux learn --reject <id>        decline one, permanently
```

Recurrence, not recency. Proposals, never auto-applied. Bounded by construction — lessons
amend the skill they belong to rather than adding a file each. And a rejection sticks until
you `--reconsider`, because a tool that re-proposes what you declined is one you stop reading.

The mirror of the same loop turns approaches that keep working into skills, using a local
success signal: reached review, every gate passed, no smell in the trajectory, and **no
correction rounds**. An agent that got there after three rounds proves the feedback worked,
not that its approach did.
</details>

<details>
<summary><b>Third-party skill packs</b></summary>

Somebody else's guidance, compiled to every agent you use:

```bash
ctxmux add github:DietrichGebert/ponytail
ctxmux sync
```

Packs are fetched into **your** repository, never vendored into contextmux, and every installed
skill carries its source, licence and commit — which survives into the generated files, so a
reader of your `AGENTS.md` can see whose rules they are. A pack never takes back a skill you
wrote or edited, and a skill name that is not a plain name is refused rather than used as a
path.

A prompt asking an agent to be minimal is advice it can ignore. Three rungs of that ladder are
checkable against the diff it produced, so they ship as gates:

```bash
ctxmux run T-1 --minimal
```

Off by default, because these are the ones most likely to argue with the person who filed the
task — an interface they wanted, a dependency they meant to add — and a gate that argues gets
switched off along with the ones that were earning their place.

| Gate | Catches |
| --- | --- |
| `no-unrequested-dependencies` | A dependency added that the task never mentioned |
| `no-duplicate-symbols` | A helper that already exists elsewhere in the codebase |
| `no-speculative-abstraction` | An interface introduced with its single implementation |

Each has an escape hatch: name the dependency in the task and it is allowed; ask for an
interface and the abstraction check stands down. `no-duplicate-symbols` needs the repository
index, so it is skipped when there is not one.

Composable directly, too, for a harness of your own:

```ts
import { minimalismGates } from '@contextmux/core'
```
</details>

<details>
<summary><b>Running at zero marginal cost</b></summary>

```bash
ctxmux run T-1 --agent local
```

A local *model* is not a local *agent*: ollama serves tokens but does not read files, edit
them, or run tests. You need a runner **and** a harness. contextmux drives the harness (aider,
Apache-2.0, or opencode, MIT) and points it at your runner. `ctxmux doctor` checks both halves
and says which is missing.
</details>

---

## Packages

The CLI is `contextmux`; everything else is a library you can use on its own.

| Package | Purpose |
| --- | --- |
| `contextmux` | The `ctxmux` command |
| `@contextmux/context` | Canonical model, compilers, importer, fidelity reporting |
| `@contextmux/repo` | Profile detection, symbol index, budgeted repo map |
| `@contextmux/mcp-repo` | MCP server over the index |
| `@contextmux/core` | State machine, gates, adapter contracts — pure, no I/O |
| `@contextmux/runner-local` | Local process runner with git worktree isolation |
| `@contextmux/agent-cli` | Shared machinery for CLI-driven agents |
| `@contextmux/agent-claude` | Claude Code as a driven agent, plus prompt assembly |
| `@contextmux/agent-copilot` | Copilot coding agent as a delegated agent |
| `@contextmux/agent-cursor` | Cursor as a driven agent |
| `@contextmux/agent-codex` | Codex as a driven agent |
| `@contextmux/agent-local` | A locally-hosted model, at zero marginal cost |
| `@contextmux/tracker-file` | Tasks as markdown files |
| `@contextmux/tracker-github` | GitHub Issues as tasks |
| `@contextmux/tracker-jira` | Jira, with ADF converted to markdown |
| `@contextmux/forge-github` | Issues, pull requests and reviews |
| `@contextmux/eval` | Comparison harness and scoring |
| `@contextmux/learn` | Recurrence detection and context proposals |
| `@contextmux/trajectory` | Step-level recording, stall detection, trajectory smells |
| `@contextmux/handoff` | Transferring an unfinished task between agents |

Every adapter passes the same published contract suite, so "implements the interface" means
the same thing for all of them:

```ts
import { runTrackerContract } from '@contextmux/core'

describe('my tracker', () => {
  runTrackerContract({ it, expect }, { setup: () => ({ tracker, taskId: 'X-1' }) })
})
```

## Free, and free to run

Three runtime dependencies: `zod` (MIT), `yaml` (ISC), and the MCP SDK (MIT).
`@contextmux/core` and `@contextmux/repo` have none. Apache-2.0, no hosted service, and it
shells out to `git` rather than linking anything copyleft.

## Status

Pre-release. The context layer, orchestration core, gates, five agent adapters, three trackers,
comparison, learning, recovery, handoff, skill packs and OTLP export are built and covered by
1,143 tests.

**Run against the real thing:** the Claude Code adapter, including its streaming format. Jira —
reading real tickets, converting their descriptions, extracting acceptance criteria. GitHub —
creating an issue, delegating to the Copilot coding agent, observing the pull request it
produced, and verifying that branch locally.

**Not yet run against the real thing:** the Cursor, Codex and local adapters were written from
documentation. Every vendor-specific detail is confined to a small declarative spec that can be
corrected without touching any logic, and `preflight` says so out loud rather than failing in a
way that looks like the agent doing poor work.

**What the first real runs cost us to learn:** twelve defects that 1,100 passing tests and four
review rounds had not found — a delegated artefact that exceeded GitHub's issue-body limit, a
quality gate that compiled the wrong working tree, a dry run that left a verdict behind, an
agent finishing without anything noticing. The doubles were themselves wrong twice, in ways
that hid real bugs. Treat a green suite here as weak evidence for anything that talks to a live
service.

## Contributing

```bash
pnpm install
pnpm test
pnpm build
```

contextmux compiles its own `.ctxmux/` directory, and CI fails if the result drifts. See
[CONTRIBUTING.md](./CONTRIBUTING.md).

## Licence

Apache-2.0
