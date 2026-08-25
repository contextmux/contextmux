# Project conventions

Read this before making any change.

## Project toolchain

- **Install:** `pnpm install --frozen-lockfile`
- **Package manager:** pnpm@10.33.0 — do not use any other
- **Node:** >=22
- **Languages:** JavaScript, TypeScript
- **Stack:** Vitest
- **Monorepo:** 20 workspace(s): @contextmux/agent-claude, @contextmux/agent-cli, @contextmux/agent-codex, @contextmux/agent-copilot, @contextmux/agent-cursor, @contextmux/agent-local, @contextmux/context, @contextmux/core, @contextmux/eval, @contextmux/forge-github, @contextmux/handoff, @contextmux/learn, @contextmux/mcp-repo, @contextmux/repo, @contextmux/runner-local, @contextmux/tracker-file, @contextmux/tracker-github, @contextmux/tracker-jira, @contextmux/trajectory, contextmux

**Before finalising any change, run all of these and fix every failure:**

```bash
pnpm run typecheck
pnpm run test
```

## What this project is

contextmux compiles one canonical context source out to four coding agents, and separately
runs tasks through an agent under gates. Two properties matter more than any feature:

- **Never destroy work somebody else wrote.** The writer refuses to overwrite a file it did
  not produce, and co-owned files keep everything outside their managed block.
- **Never report something that did not happen.** A gate that cannot fire, a check that passes
  without running, a cap that is not a cap — each is worse than not having it, because the
  output still claims it was enforced.

When those two conflict with convenience, they win.

## Layout

Two halves that share only `@contextmux/core`:

| | |
| --- | --- |
| `context`, `repo`, `mcp-repo` | The compiler. Files in, files out. No network. |
| `core` | The run state machine and gates. **A pure reducer — no I/O whatsoever.** |
| `agent-*`, `tracker-*`, `forge-*`, `runner-local` | Adapters. The only things that touch the outside world. |
| `trajectory`, `learn`, `handoff`, `eval` | Built on the run record. |
| `cli` | Argument parsing and output. Logic belongs in a library, not here. |

Policy lives in `core` precisely because it has no I/O: every escalation rule is tested
without a filesystem, a tracker, or a token spent. Adding I/O there gives that up.

## Writing code here

- **Comments explain why, not what.** A non-obvious trade-off is worth a paragraph; a
  restatement of the line below is worth nothing.
- **Errors say what to do**, not only what went wrong.
- **No new runtime dependency** without a reason worth writing down. There are three in total,
  and `core` and `repo` have none.
- **Formatting is hand-maintained** — no semicolons, single quotes, roughly 110 columns. There
  is deliberately no Prettier config. Do not run a formatter over a file to tidy a small edit;
  it rewrites the whole file and buries the change.
- **Adapters keep vendor detail in a declarative spec**, never in control flow, and declare
  `confidence` honestly. `unverified` is not a failure state — an adapter that is confidently
  wrong fails in a way that looks like the agent doing poor work, and then the wrong thing gets
  debugged.

## Before you finish

Run the quality gate above. Then read your own diff: if it contains anything the task did not
ask for, remove it.
