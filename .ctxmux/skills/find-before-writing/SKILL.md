---
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
