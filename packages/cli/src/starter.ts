/**
 * The starter pack.
 *
 * A new user's first sync has to produce something that measurably improves agent output,
 * or the tool reads as ceremony. These defaults encode the failure modes that show up most
 * often in real agent PRs: duplicating a helper that already exists, editing tests until they
 * pass, and wandering outside the scope of the task.
 *
 * Everything here is meant to be edited. It is a starting point, not a policy.
 */
import type { ProjectProfile } from '@contextmux/repo'
import { renderProfile } from '@contextmux/repo'

export interface StarterFile {
  path: string
  content: string
}

function instructions(profile: ProjectProfile): string {
  return [
    '# Project conventions',
    '',
    'Read this before making any change.',
    '',
    renderProfile(profile).trim(),
    '',
    '## Working agreement',
    '',
    '- Make the smallest change that satisfies the request. Resist adjacent improvements.',
    '- Match the conventions of the surrounding code over any general style preference.',
    '- If a requirement is ambiguous, state the assumption you made in the pull request',
    '  description rather than guessing silently.',
    '',
  ].join('\n')
}

const REUSE_SKILL = `---
name: find-before-writing
description: Use before creating any new helper, hook, component, selector, type or utility — search the codebase for an existing implementation first.
repoQuery:
  terms: ["helper", "util", "hook", "component"]
  budget: 1500
---

# Find before writing

The most common defect in generated code is a second implementation of something that
already exists. It passes review because it is locally correct, and it costs the codebase
permanently.

Before adding any new shared unit — a helper, hook, component, selector, type, constant —
search for an existing one.

1. Search by **name**: the thing you are about to write, and two or three synonyms.
2. Search by **shape**: the signature or return type you need.
3. Search the **directory** where such a thing would live if it existed.

If you find something close but not exact, prefer extending it over duplicating it — unless
extending would change behaviour for existing callers, in which case add the new variant
beside it and say why in the pull request description.

Only write something new once all three searches come back empty.
`

const TEST_INTEGRITY_SKILL = `---
name: test-integrity
description: Use whenever a test fails, or when adding tests for a change. Governs what may and may not be changed to make a suite pass.
---

# Test integrity

A failing existing test is information. It is almost never noise.

**When an existing test fails after your change**, the default conclusion is that your
implementation is wrong. Fix the implementation.

You may change an existing test only when the task explicitly changes the behaviour that
test asserts. When that happens, say so in the pull request description and explain what
behaviour changed and why.

**Never**:
- weaken an assertion to make it pass
- delete or skip a test that your change broke
- adjust fixtures or mocks so that new, possibly incorrect, code looks correct

**When adding tests**, cover the branch you added, the boundary conditions around it, and
the case where nothing should change. A test that only exercises the happy path documents
the feature without defending it.
`

const SCOPE_RULE = `---
name: scope-discipline
description: Keep changes within the boundaries of the task
alwaysApply: true
priority: 80
---

Change only what the task requires.

Before opening a pull request, review your own diff and remove anything that is not needed:
unrelated refactors, renames, reformatting, dependency bumps, and configuration edits that
nobody asked for.

Configuration files — build config, TypeScript config, package manifests, CI workflows — are
outside the scope of an ordinary task. If one genuinely must change, call it out explicitly
rather than folding it in.

A reviewer should be able to read the diff and see only the task.
`

const REVIEWER_AGENT = `---
name: change-reviewer
description: Reviews a diff for scope creep, duplicated logic and weakened tests before a pull request is opened.
archetype: any
---

You review a change before it is proposed. You are not looking for style problems — a linter
handles those. You are looking for the three things that get through review and cost the most
later.

**1. Scope.** Does every changed file belong to the task? Flag unrelated refactors, renames,
reformatting, and configuration edits.

**2. Duplication.** Does anything added here already exist elsewhere in the codebase? Search
before concluding it does not.

**3. Test integrity.** Were existing assertions weakened, deleted or skipped? Were fixtures
adjusted to fit new behaviour? Does each new branch have a test that would fail if the branch
were wrong?

Report findings most-severe first. If there are none, say so plainly rather than manufacturing
feedback.
`

export function starterFiles(profile: ProjectProfile): StarterFile[] {
  return [
    { path: '.ctxmux/instructions.md', content: instructions(profile) },
    { path: '.ctxmux/rules/scope-discipline.md', content: SCOPE_RULE },
    { path: '.ctxmux/skills/find-before-writing/SKILL.md', content: REUSE_SKILL },
    { path: '.ctxmux/skills/test-integrity/SKILL.md', content: TEST_INTEGRITY_SKILL },
    { path: '.ctxmux/agents/change-reviewer.md', content: REVIEWER_AGENT },
    {
      path: '.ctxmux/mcp.json',
      content:
        JSON.stringify(
          {
            servers: {
              // The repository index, exposed as tools. Delegated agents cannot take an
              // injected repo map at prompt-assembly time, so this is the only way they get
              // repository knowledge. Read-only by construction.
              'ctxmux-repo': {
                transport: 'stdio',
                command: 'npx',
                args: ['-y', '@contextmux/mcp-repo'],
                readOnly: true,
              },
            },
          },
          null,
          2,
        ) + '\n',
    },
    {
      path: '.ctxmux/config.json',
      content:
        JSON.stringify(
          { targets: ['claude', 'copilot', 'cursor', 'codex'], provenance: true },
          null,
          2,
        ) + '\n',
    },
  ]
}
