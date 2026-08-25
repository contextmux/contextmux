---
name: writing-tests
description: What a test here has to do to earn its place
globs:
  - "packages/*/test/**"
  - "**/*.test.ts"
priority: 70
---

- **The bugs that ship here live between components**, not inside them — compile, write, then
  re-read. Use a real temporary directory rather than mocking the filesystem.
- **Every regression test carries a comment naming the failure it prevents.** Not what it
  asserts; what went wrong, and why it mattered.
- **If you add a gate, a check or a detector, add the test that proves it fires.** One that
  cannot fire is worse than none, because the run still reports that it ran.
- **Do not weaken a test to make a suite pass** — see the `test-integrity` skill.
