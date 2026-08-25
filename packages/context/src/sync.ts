/** Orchestration: load → compile → collision-check → write, with a report for the CLI. */
import { COMPILERS } from './compilers/index.js'
import type { CompileResult, OutputFile } from './compilers/types.js'
import { ContextError } from './errors.js'
import { summarize, type FidelitySummary } from './fidelity.js'
import { loadContext } from './loader.js'
import type { LoadedContext, Target } from './schema.js'
import { findCollisions, writeOutputs, type WriteRecord } from './writer.js'

export interface SyncOptions {
  root?: string
  /** Overrides `config.targets`. */
  targets?: Target[]
  dryRun?: boolean
  force?: boolean
}

export interface SyncReport {
  context: LoadedContext
  results: CompileResult[]
  fidelity: FidelitySummary[]
  records: WriteRecord[]
  /** True when at least one file was skipped because a human had edited it. */
  hasDrift: boolean
  /** True when anything would change on disk. Drives `check`'s exit code. */
  hasChanges: boolean
}

export function compileAll(ctx: LoadedContext, targets?: Target[]): CompileResult[] {
  const list = targets ?? ctx.config.targets
  return list.map((t) => {
    const compiler = COMPILERS[t]
    if (!compiler) throw new ContextError(`Unknown target "${t}"`)
    return compiler.compile(ctx)
  })
}

export async function sync(opts: SyncOptions = {}): Promise<SyncReport> {
  const ctx = await loadContext({ root: opts.root })
  const results = compileAll(ctx, opts.targets)

  const flat: Array<OutputFile & { target: string }> = results.flatMap((r) =>
    r.files.map((f) => ({ ...f, target: r.target })),
  )

  const collisions = findCollisions(flat)
  if (collisions.length > 0) {
    throw new ContextError(
      'Two nodes compile to the same output path',
      collisions.map((c) => ({
        level: 'error' as const,
        message: c,
        hint: 'Rename one of them — for example, a skill and a command sharing a name both compile to .github/prompts/<name>.prompt.md.',
      })),
    )
  }

  const records = await writeOutputs(flat, {
    root: ctx.root,
    dryRun: opts.dryRun ?? false,
    force: opts.force ?? false,
    provenance: ctx.config.provenance,
  })

  const names = Object.fromEntries(
    Object.entries(COMPILERS).map(([k, v]) => [k, v.displayName]),
  ) as Record<Target, string>

  return {
    context: ctx,
    results,
    fidelity: summarize(results, names),
    records,
    hasDrift: records.some((r) => r.status === 'drift'),
    hasChanges: records.some((r) => r.status !== 'unchanged'),
  }
}

/** `check` is `sync --dry-run` with an opinion about exit codes. */
export async function check(opts: { root?: string; targets?: Target[] } = {}): Promise<SyncReport> {
  return sync({ ...opts, dryRun: true })
}
