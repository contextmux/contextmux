/**
 * A small argument parser.
 *
 * Hand-rolled rather than pulled from a dependency: the surface is tiny, and owning it means
 * exit codes and help text stay under our control, which matters because `check` is designed
 * to be wired into CI where the exit code is the entire contract.
 */
export interface ParsedArgs {
  command: string | undefined
  positionals: string[]
  flags: Map<string, string | boolean>
}

export function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = []
  const flags = new Map<string, string | boolean>()

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!
    if (arg.startsWith('--')) {
      const body = arg.slice(2)
      const eq = body.indexOf('=')
      if (eq !== -1) {
        flags.set(body.slice(0, eq), body.slice(eq + 1))
      } else {
        const next = argv[i + 1]
        if (next && !next.startsWith('-')) {
          flags.set(body, next)
          i++
        } else {
          flags.set(body, true)
        }
      }
    } else if (arg.startsWith('-') && arg.length > 1) {
      for (const ch of arg.slice(1)) flags.set(ch, true)
    } else {
      positionals.push(arg)
    }
  }

  return { command: positionals[0], positionals: positionals.slice(1), flags }
}

export function flagString(args: ParsedArgs, ...names: string[]): string | undefined {
  for (const n of names) {
    const v = args.flags.get(n)
    if (typeof v === 'string') return v
  }
  return undefined
}

export function flagBool(args: ParsedArgs, ...names: string[]): boolean {
  return names.some((n) => args.flags.get(n) === true || args.flags.get(n) === 'true')
}

/**
 * A flag that must be a number.
 *
 * `Number(flagString(...))` was used everywhere and is quietly dangerous: every one of these
 * flags tunes a limit, and `Number('abc')` is `NaN`, which compares false against everything.
 * So a typo did not fail — it turned the limit off. `--max-files abc` stopped enforcing a file
 * ceiling, and `--max-rounds abc` made `round > max` false forever, which is a correction loop
 * with no exit that dispatches a paid agent every time round.
 *
 * Refusing is the only safe response. A limit nobody can see is worse than no limit at all,
 * because the output still claims it was applied.
 */
export function flagNumber(
  args: ParsedArgs,
  name: string,
  opts: { default: number; min?: number; max?: number; integer?: boolean },
): number {
  const raw = flagString(args, name)
  if (raw === undefined) {
    // `--max-files` with no value parses as a boolean, which is still a mistake worth naming.
    if (args.flags.get(name) === true) {
      throw new UsageError(`--${name} needs a number.`, `For example: --${name} ${opts.default}`)
    }
    return opts.default
  }

  const value = Number(raw)
  if (!Number.isFinite(value)) {
    throw new UsageError(
      `--${name} must be a number, but was "${raw}".`,
      `For example: --${name} ${opts.default}`,
    )
  }
  if (opts.integer !== false && !Number.isInteger(value)) {
    throw new UsageError(`--${name} must be a whole number, but was "${raw}".`)
  }
  if (opts.min !== undefined && value < opts.min) {
    throw new UsageError(`--${name} must be at least ${opts.min}, but was ${value}.`)
  }
  if (opts.max !== undefined && value > opts.max) {
    throw new UsageError(`--${name} must be at most ${opts.max}, but was ${value}.`)
  }
  return value
}

/** A flag the user got wrong. Carries a hint, because the fix is always obvious to us. */
export class UsageError extends Error {
  override name = 'UsageError'
  constructor(
    message: string,
    readonly hint?: string,
  ) {
    super(message)
  }
}
