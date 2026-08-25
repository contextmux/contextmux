---
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
