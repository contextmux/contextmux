## What this changes

<!-- What behaviour is different after this merges. Not a list of files — the diff already
     shows those. If it fixes an issue, "Fixes #123". -->

## Why

<!-- The problem this solves. If the reason is not obvious from the change, it belongs here
     rather than only in a commit message. -->

## How it was checked

<!-- What you ran, and what convinced you it works. "Tests pass" on its own is weak: a test
     that passes without the fix applied is not evidence. If you removed the fix and watched
     the test fail, say so — that is the thing worth saying. -->

---

- [ ] `pnpm test` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` passes
- [ ] If `packages/action/` or anything it bundles changed: `pnpm bundle` was run and
      `packages/action/dist/ctxmux.mjs` is committed
- [ ] Generated files are in sync (`pnpm ctxmux check`), if `.ctxmux/` changed
- [ ] No new runtime dependency — or the PR explains why one is worth it

<!-- The dependency line is not a formality. The published package has exactly three runtime
     dependencies, and keeping it that way is deliberate. Development dependencies are a much
     easier conversation. -->
