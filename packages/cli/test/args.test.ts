/**
 * Argument parsing.
 *
 * Every numeric flag here tunes a limit, which is exactly why they cannot be parsed leniently:
 * a limit that silently stops applying is worse than one that was never set, because the run
 * still reports that it was enforced.
 */
import { describe, expect, it } from 'vitest'
import { flagBool, flagNumber, flagString, parseArgs, UsageError } from '../src/args.js'

const parse = (line: string) => parseArgs(line.split(' ').filter(Boolean))

describe('parseArgs', () => {
  it('reads a value after a flag, and after an equals sign', () => {
    expect(flagString(parse('run --agent claude'), 'agent')).toBe('claude')
    expect(flagString(parse('run --agent=claude'), 'agent')).toBe('claude')
  })

  it('treats a flag with no value as a boolean', () => {
    expect(flagBool(parse('sync --force'), 'force')).toBe(true)
  })

  it('expands clustered short flags', () => {
    const args = parse('sync -nf')
    expect(flagBool(args, 'n')).toBe(true)
    expect(flagBool(args, 'f')).toBe(true)
  })

  it('keeps positionals in order', () => {
    expect(parse('run T-1 extra').positionals).toEqual(['T-1', 'extra'])
  })
})

describe('flagNumber', () => {
  const opts = { default: 3 }

  it('returns the default when the flag is absent', () => {
    expect(flagNumber(parse('run T-1'), 'max-rounds', opts)).toBe(3)
  })

  it('reads a number', () => {
    expect(flagNumber(parse('run T-1 --max-rounds 5'), 'max-rounds', opts)).toBe(5)
  })

  it('refuses a value that is not a number', () => {
    /*
     * `Number('abc')` is `NaN`, and `NaN` compares false against everything. So the old
     * conversion did not fail on a typo — it turned the limit off. `--max-rounds abc` made
     * `round > max` false forever, which is a correction loop with no exit that pays for an
     * agent on every pass.
     */
    expect(() => flagNumber(parse('run T-1 --max-rounds abc'), 'max-rounds', opts)).toThrow(
      UsageError,
    )
    expect(() => flagNumber(parse('run T-1 --max-files abc'), 'max-files', opts)).toThrow(
      /must be a number/,
    )
  })

  it('refuses a flag given with no value at all', () => {
    expect(() => flagNumber(parse('run T-1 --max-files --verbose'), 'max-files', opts)).toThrow(
      /needs a number/,
    )
  })

  it('enforces the bounds it is given', () => {
    expect(() => flagNumber(parse('run T-1 --max-rounds 0'), 'max-rounds', { default: 2, min: 1 }))
      .toThrow(/at least 1/)
    expect(() => flagNumber(parse('run T-1 --max-rounds 99'), 'max-rounds', { default: 2, max: 20 }))
      .toThrow(/at most 20/)
  })

  it('refuses a fraction where a count is meant', () => {
    expect(() => flagNumber(parse('run T-1 --max-files 2.5'), 'max-files', opts)).toThrow(
      /whole number/,
    )
  })

  it('says what a good value looks like', () => {
    try {
      flagNumber(parse('run T-1 --max-rounds nope'), 'max-rounds', { default: 2 })
      expect.unreachable()
    } catch (err) {
      expect((err as UsageError).hint).toContain('--max-rounds 2')
    }
  })
})
