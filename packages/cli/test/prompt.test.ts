/**
 * What an answer means.
 *
 * The asking is six lines of readline; the deciding is where anyone gets hurt. A setup command
 * that misreads a keystroke configures the wrong agent, and the person only finds out when a
 * run goes somewhere they did not expect.
 */
import { describe, expect, it } from 'vitest'
import { interpretMany, interpretOne, type Choice } from '../src/prompt.js'

const agents: Choice[] = [
  { value: 'claude', label: 'Claude Code' },
  { value: 'copilot', label: 'GitHub Copilot' },
  { value: 'codex', label: 'Codex' },
]

describe('choosing one', () => {
  it('takes the default on an empty answer', () => {
    // Enter is the fast path, and the default is what the repository already told us.
    expect(interpretOne('', agents, 1)).toBe('copilot')
  })

  it('accepts a number', () => {
    expect(interpretOne('3', agents, 0)).toBe('codex')
  })

  it('accepts the name, because that is as reasonable a thing to type', () => {
    expect(interpretOne('copilot', agents, 0)).toBe('copilot')
    expect(interpretOne('  CODEX  ', agents, 0)).toBe('codex')
  })

  it('falls back to the default rather than refusing', () => {
    // A setup command should not stop over a typo.
    for (const nonsense of ['9', '0', '-1', 'windsurf', '2.5']) {
      expect(interpretOne(nonsense, agents, 0), nonsense).toBe('claude')
    }
  })
})

describe('choosing several', () => {
  const targets: Choice[] = [
    { value: 'claude', label: 'Claude Code' },
    { value: 'copilot', label: 'GitHub Copilot' },
    { value: 'cursor', label: 'Cursor' },
    { value: 'codex', label: 'Codex' },
  ]

  it('takes the defaults on an empty answer', () => {
    expect(interpretMany('', targets, ['copilot'])).toEqual(['copilot'])
  })

  it('reads a comma separated list', () => {
    expect(interpretMany('1,3', targets, [])).toEqual(['claude', 'cursor'])
  })

  it('reads spaces just as well, since people type both', () => {
    expect(interpretMany('2 4', targets, [])).toEqual(['copilot', 'codex'])
  })

  it('mixes numbers and names', () => {
    expect(interpretMany('1, codex', targets, [])).toEqual(['claude', 'codex'])
  })

  it('does not return the same target twice', () => {
    expect(interpretMany('2,copilot,2', targets, [])).toEqual(['copilot'])
  })

  it('keeps the defaults when nothing in the answer was valid', () => {
    /*
     * An answer that selects nothing is far more likely to be a typo than a request to generate
     * files for no agent at all — and generating nothing would leave the repo looking set up
     * while doing nothing.
     */
    expect(interpretMany('nonsense, 99', targets, ['copilot'])).toEqual(['copilot'])
  })
})
