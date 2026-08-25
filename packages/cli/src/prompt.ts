/**
 * A terminal picker, in the standard library.
 *
 * contextmux ships three runtime dependencies and says so in its README, which rules out the
 * usual prompt libraries. What is actually needed here is small: pick one of a list, or several
 * of a list, with a sensible default already chosen.
 *
 * Everything is skipped when nothing is there to answer — a pipe, a CI runner, `--yes`. A setup
 * command that blocks forever waiting for a keystroke nobody is there to press is worse than one
 * that never asked.
 */
import * as readline from 'node:readline/promises'
import { c } from './ui.js'

export interface Choice {
  value: string
  label: string
  /** Shown dimmed after the label — why this one, or what it needs. */
  note?: string
}

/** Whether a person is there to answer. */
export function interactive(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY)
}

async function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  try {
    return (await rl.question(question)).trim()
  } finally {
    rl.close()
  }
}

/**
 * Pick one.
 *
 * The default is chosen by pressing enter, so the fastest path through is the one we already
 * worked out from the repository.
 */
export async function selectOne(
  title: string,
  choices: Choice[],
  defaultValue: string,
): Promise<string> {
  const index = Math.max(0, choices.findIndex((ch) => ch.value === defaultValue))

  process.stdout.write(`\n${c.bold(title)}\n`)
  choices.forEach((ch, i) => {
    const marker = i === index ? c.green('>') : ' '
    const note = ch.note ? c.dim(`  ${ch.note}`) : ''
    process.stdout.write(`  ${marker} ${i + 1}) ${ch.label}${note}\n`)
  })

  const answer = await ask(c.dim(`  choose [${index + 1}]: `))
  return interpretOne(answer, choices, index)
}

/**
 * What an answer to `selectOne` means.
 *
 * Separated from the asking because this is where the behaviour is, and it needs no terminal to
 * exercise: empty means the default, a number means that row, a name means that row, and
 * anything else means the default rather than an error — a setup command should not refuse to
 * proceed over a typo.
 */
export function interpretOne(answer: string, choices: Choice[], defaultIndex: number): string {
  const fallback = choices[defaultIndex]!.value
  const trimmed = answer.trim()
  if (!trimmed) return fallback

  const picked = Number(trimmed)
  if (Number.isInteger(picked) && picked >= 1 && picked <= choices.length) {
    return choices[picked - 1]!.value
  }
  const byName = choices.find((ch) => ch.value === trimmed.toLowerCase())
  return byName ? byName.value : fallback
}

/**
 * Pick any number, by listing the ones you want.
 *
 * Numbers rather than a cursor and spacebar: a raw-mode selector has to handle arrow keys,
 * resizing and every terminal that disagrees about them, and gets in the way of anyone piping
 * input. Typing `1,3` is not worse, and it works everywhere.
 */
export async function selectMany(
  title: string,
  choices: Choice[],
  defaults: string[],
): Promise<string[]> {
  const chosen = new Set(defaults)

  process.stdout.write(`\n${c.bold(title)}\n`)
  choices.forEach((ch, i) => {
    const mark = chosen.has(ch.value) ? c.green('x') : ' '
    const note = ch.note ? c.dim(`  ${ch.note}`) : ''
    process.stdout.write(`  [${mark}] ${i + 1}) ${ch.label}${note}\n`)
  })

  const preset = [...chosen]
    .map((v) => choices.findIndex((ch) => ch.value === v) + 1)
    .filter((n) => n > 0)
    .join(',')

  const answer = await ask(c.dim(`  choose, comma separated [${preset || 'none'}]: `))
  return interpretMany(answer, choices, [...chosen])
}

/** What an answer to `selectMany` means. Same reasoning as `interpretOne`. */
export function interpretMany(answer: string, choices: Choice[], defaults: string[]): string[] {
  const trimmed = answer.trim()
  if (!trimmed) return [...new Set(defaults)]

  const picked = trimmed
    .split(/[,\s]+/)
    .map((token) => {
      const n = Number(token)
      if (Number.isInteger(n) && n >= 1 && n <= choices.length) return choices[n - 1]!.value
      return choices.find((ch) => ch.value === token.toLowerCase())?.value
    })
    .filter((v): v is string => Boolean(v))

  // An answer that selected nothing is far more likely to be a typo than a request for nothing.
  return picked.length > 0 ? [...new Set(picked)] : [...new Set(defaults)]
}
