---
"@contextmux/agent-claude": minor
"@contextmux/agent-cli": minor
"@contextmux/agent-codex": minor
"@contextmux/agent-copilot": minor
"@contextmux/agent-cursor": minor
"@contextmux/agent-local": minor
"contextmux": minor
"@contextmux/context": minor
"@contextmux/core": minor
"@contextmux/eval": minor
"@contextmux/forge-github": minor
"@contextmux/handoff": minor
"@contextmux/learn": minor
"@contextmux/mcp-repo": minor
"@contextmux/repo": minor
"@contextmux/runner-local": minor
"@contextmux/tracker-file": minor
"@contextmux/tracker-github": minor
"@contextmux/tracker-jira": minor
"@contextmux/trajectory": minor
---

Initial release.

One canonical `.ctxmux/` source compiled to Claude Code, GitHub Copilot, Cursor and Codex,
with an explicit fidelity report for what each target loses, and a writer that refuses to
overwrite anything it did not produce. Imports from existing agent config. Detects the project
toolchain. Builds a token-budgeted, symbol-level repository map, delivered either in a prompt
or as MCP tools.

Plus the orchestration half: a pure state-machine run loop with preflight and verify gates,
git worktree isolation, five agent adapters, three trackers, agent comparison, trajectory
recording with stall recovery, handoff between agents, third-party skill packs, and a learning
loop that turns what recurred into proposed edits to your context.
