# Contributing

Requires Node 22+ and pnpm.

```bash
pnpm install
pnpm test        # 963 tests
pnpm typecheck
pnpm build
```

`pnpm build` bundles each package with tsup into `dist/`; `pnpm typecheck` runs the TypeScript
project references and emits to `.tsbuild/`. They write to different places on purpose — when
they shared one, whichever ran last won and the published bundle could end up incomplete.

## Layout

Twenty packages in two halves. The full list is in the [README](./README.md); the ones you are
most likely to touch:

| Package | Purpose |
| --- | --- |
| `@contextmux/context` | Canonical model, four compilers, importer, safe writer, fidelity reporting |
| `@contextmux/repo` | Toolchain detection, symbol index, token-budgeted repo map |
| `@contextmux/core` | Run state machine, gates, adapter contracts — a pure reducer, no I/O |
| `@contextmux/agent-cli` | Shared machinery for CLI-driven agents; a vendor adds only a spec |
| `contextmux` | The `ctxmux` command |

`@contextmux/core` and `@contextmux/repo` have no runtime dependencies at all, and no package
here reaches the network except the tracker and forge adapters that exist to.

## Adding an agent

Everything vendor-specific lives in a declarative `CliAgentSpec`: which flags to pass, how to
read the output, how to resume. The shared flow — budgets, timeouts, refusal detection,
trajectory recording, stall recovery — is already written and already tested.

Declare `confidence: 'verified'` only once you have run it against the real CLI. `unverified`
is not a failure state; it is the honest one, and `preflight` says so out loud. An adapter that
is confidently wrong fails in a way that looks like the agent doing poor work, and then the
wrong thing gets debugged.

## Adding a compile target

A compiler is a `{ target, displayName, compile(ctx) }` object returning `{ files, fidelity }`.
See `packages/context/src/compilers/`.

Two rules, both enforced by tests in `packages/context/test/compilers.test.ts`:

1. **Every node type appears in the fidelity report**, even at count zero.
2. **Anything not `native` must say both how it is represented and what is lost.** A target
   that silently drops content is worse than one that refuses it, because the user believes
   their instruction is in effect.

Prefer an honest `degraded` with a clear `lost:` note over a generous `native`.

## Writing tests

The bugs that have actually shipped here lived in the *interaction* between compile, write and
re-read — not in any one of them. `packages/context/test/roundtrip.test.ts` runs against real
temporary directories for that reason. Add integration coverage there rather than mocking the
filesystem.

Every regression test carries a comment explaining the failure it prevents. Several of these
were genuinely subtle:

- A begin marker carrying a hash was never matched by an exact-string lookup, so every sync
  prepended a fresh block and the file doubled.
- Hashing untrimmed content made every legitimate edit to `.ctxmux/` look like a hand edit,
  which blocked the update.
- A provenance comment placed above YAML frontmatter pushed the frontmatter off line 1, so
  every target silently lost `applyTo`, `globs` and activation descriptions.
- The importer emitted `tools` as a string while the schema demanded an array, breaking
  `import && sync` — the entire onboarding path.
- `git ls-files` returns nothing, successfully, in a repository with no commits — so the
  repo map indexed zero files and told the agent that nothing similar existed yet.
- A skill name from a third-party pack became a directory without being checked, so
  `../../../../evil` wrote outside the repository.

## Conventions

- Comments explain *why*, not *what*. If a decision has a non-obvious tradeoff, record it.
- Errors must be actionable: say what to do, not only what went wrong.
- No runtime dependency gets added without a clear reason. There are three in total.
- A gate, a check or a detector that cannot actually fire is worse than none, because the run
  reports that it ran. If you add one, add the test that proves it fires.
