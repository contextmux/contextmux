/**
 * Reading acceptance criteria out of a ticket.
 *
 * The readiness gate refuses a task with none, so what counts as one decides whether real
 * tickets can be worked at all. These cases come from an actual Jira board rather than from
 * imagination — the shapes people write, not the shape the parser wished for.
 */
import { describe, expect, it } from 'vitest'
import { extractAcceptanceCriteria } from '../src/task.js'

describe('a bug report states its criterion as an expectation', () => {
  const reported = [
    'Reported issue:',
    '',
    'Following an out for a throw-in, the Throw-in button is still shown as active.',
    '',
    'Steps:',
    '',
    'Collect an out for throw-in.',
    '',
    'Actual behaviour:',
    '',
    'Throw-in button is shown as active.',
    '',
    'Expected behaviour:',
    '',
    'Throw-in button is shown as inactive, as the situation is resolved.',
  ].join('\n')

  it('reads the expectation as the criterion', () => {
    /*
     * The vocabulary was `acceptance criteria|acceptance|requirements|done when`, so a ticket
     * saying "Actual: the button stays active. Expected: it is inactive." produced nothing and
     * readiness rejected it for having no criteria — a better-specified change than most
     * tickets that carry the formal heading, refused for its wording.
     */
    expect(extractAcceptanceCriteria(reported)).toEqual([
      'Throw-in button is shown as inactive, as the situation is resolved.',
    ])
  })

  it('does not mistake the actual behaviour for the expected one', () => {
    // The negative that matters: the two sections sit next to each other and say opposite
    // things, so a parser that grabbed any section would invert the requirement.
    const actualOnly = 'Actual behaviour:\n\nThrow-in button is shown as active.'
    expect(extractAcceptanceCriteria(actualOnly)).toEqual([])
  })
})

describe('the shapes a section heading takes', () => {
  it.each([
    ['markdown heading', '## Expected behaviour\n- The button is inactive'],
    ['bold label', '**Expected behaviour:**\n- The button is inactive'],
    ['plain label and a colon', 'Expected behaviour:\n- The button is inactive'],
    ['the original spelling', '## Acceptance criteria\n- The button is inactive'],
    ['requirements', '### Requirements\n- The button is inactive'],
    ['done when', '# Done when\n- The button is inactive'],
    ['definition of done', '## Definition of done\n- The button is inactive'],
  ])('recognises %s', (_name, body) => {
    expect(extractAcceptanceCriteria(body)).toEqual(['The button is inactive'])
  })

  it('does not treat an ordinary sentence ending in a colon as a heading', () => {
    // The plain-label form is the loosest of the three, so it is bounded: short, words only.
    const body = 'The following happens when you press it and then wait for the timer to expire:\n- not a criterion'
    expect(extractAcceptanceCriteria(body)).toEqual([])
  })
})

describe('what the section contains', () => {
  it('prefers a list when there is one', () => {
    const body = '## Acceptance criteria\nSome preamble.\n- first\n- second'
    expect(extractAcceptanceCriteria(body)).toEqual(['first', 'second'])
  })

  it('falls back to prose, because that is how expectations are usually written', () => {
    // Read for list items only, a heading followed by one plain sentence yielded nothing.
    const body = '## Expected behaviour\nThe button is inactive once resolved.'
    expect(extractAcceptanceCriteria(body)).toEqual(['The button is inactive once resolved.'])
  })

  it('handles checkboxes and numbered lists', () => {
    const body = '## Acceptance criteria\n- [ ] first\n- [x] second\n1. third\n2) fourth'
    expect(extractAcceptanceCriteria(body)).toEqual(['first', 'second', 'third', 'fourth'])
  })

  it('stops at the next section', () => {
    const body = '## Acceptance criteria\n- in scope\n\n## Notes\n- out of scope'
    expect(extractAcceptanceCriteria(body)).toEqual(['in scope'])
  })

  it('finds nothing in a ticket that says nothing', () => {
    expect(extractAcceptanceCriteria('Just a title and some rambling prose.')).toEqual([])
  })
})
