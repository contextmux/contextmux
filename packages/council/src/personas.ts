/**
 * The voices that propose rules.
 *
 * Four viewpoints rather than one, because a single prompt asking "what rules should this
 * repository have" produces the same generic list every time: write tests, handle errors, keep
 * functions small. Every one of those is already a default, and a rule that restates a default
 * costs context without adding information.
 *
 * Each persona is given something to care about that pulls against the others. What survives
 * all four is more likely to be worth the space it takes.
 */
export interface Persona {
  id: string
  /** The standing this voice speaks from, put to the model directly. */
  stance: string
  /** What it is asked to look for. */
  brief: string
}

/** Bump when a stance changes in a way that would change what it proposes. */
export const PERSONA_VERSION = '1.0.0'

export const PERSONAS: Persona[] = [
  {
    id: 'reviewer',
    stance:
      'You review every pull request in this repository. You are the one who has to notice when ' +
      'a rule was broken, from a diff, without running anything.',
    brief:
      'Propose rules whose violation you could actually spot in a diff. Prefer a rule naming a ' +
      'concrete thing — a directory, an import, a command, a file extension — over one naming a ' +
      'quality. If you could not tell from the diff, do not propose it.',
  },
  {
    id: 'newcomer',
    stance:
      'It is your first day. You have the repository open and no context beyond what is written ' +
      'down, and you are about to make a change.',
    brief:
      'Propose rules for the things that would surprise you — a convention that is not obvious ' +
      'from reading the code, a place where the obvious approach is the wrong one here, a ' +
      'command you would not have guessed you needed to run. Skip anything you would have ' +
      'assumed correctly.',
  },
  {
    id: 'minimalist',
    stance:
      'You think most written-down rules are noise, and that every rule an agent reads costs ' +
      'attention that the actual task needed.',
    brief:
      'Propose only rules that a competent agent would get wrong without being told. If a rule ' +
      'restates a default — write tests, handle errors, use clear names — do not propose it. ' +
      'Proposing nothing at all is a respectable answer.',
  },
  {
    id: 'maintainer',
    stance:
      'You will still be here in a year, living with whatever this repository becomes.',
    brief:
      'Propose rules about the things that rot: where generated output lives and why it must ' +
      'not be edited, what must stay in step with what, which boundaries exist for a reason. ' +
      'Prefer rules that will still be true after the code changes.',
  },
]
