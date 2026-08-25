---
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
