/**
 * Minimalism gates.
 *
 * Inspired by ponytail (MIT, github.com/DietrichGebert/ponytail), which asks an agent to climb
 * a ladder before writing code: does this need to exist → is it already in the codebase →
 * stdlib → native feature → installed dependency → one line → only then write something.
 *
 * That is a good prompt, and a prompt is advice an agent can ignore. Three rungs are
 * mechanically checkable against the diff the agent produced, and checking beats asking: a
 * gate that rejects a change adding an unrequested dependency does not depend on the model
 * having paid attention.
 *
 * The rungs that are *not* checkable are left alone. "Does this need to exist" is a judgement
 * about intent, and a gate that guessed at it would reject correct work — which is a far worse
 * failure than missing some over-engineering.
 */
import type { GateOutcome } from './machine.js'
import type { Gate } from './gates.js'
import { matchGlob } from './glob.js'

const pass = (gate: string): GateOutcome => ({ gate, verdict: 'pass' })
const reject = (gate: string, reason: string, hint?: string): GateOutcome => ({
  gate,
  verdict: 'reject',
  reason,
  ...(hint ? { hint } : {}),
})

/** Added lines from a unified diff, with their file. */
function addedLines(diff: string): Array<{ file: string; text: string }> {
  const out: Array<{ file: string; text: string }> = []
  let current = ''
  for (const line of diff.split('\n')) {
    const header = /^\+\+\+ b\/(.+)$/.exec(line)
    if (header) {
      current = header[1]!
      continue
    }
    if (line.startsWith('+') && !line.startsWith('+++')) {
      out.push({ file: current, text: line.slice(1) })
    }
  }
  return out
}

/**
 * A dependency the task never asked for.
 *
 * The ladder's fifth rung inverted: if an installed dependency would have done, adding a new
 * one was avoidable. Detectable exactly, because it shows up as an added line in a manifest.
 *
 * The task's own text is the escape hatch. "Add stripe checkout" mentions stripe, so adding
 * stripe is requested; "fix the date display" does not mention date-fns, so adding date-fns is
 * the agent deciding for you.
 */
export function noUnrequestedDependencies(opts: { manifests?: string[] } = {}): Gate {
  const manifests = opts.manifests ?? [
    'package.json', '**/package.json', 'requirements.txt', 'pyproject.toml',
    'go.mod', 'Cargo.toml', 'Gemfile', 'composer.json',
  ]

  return {
    name: 'no-unrequested-dependencies',
    async verify({ task, result, runner }) {
      const touched = result.filesChanged.filter((f) => manifests.some((m) => matchGlob(m, f)))
      if (touched.length === 0) return pass('no-unrequested-dependencies')

      // Read the workspace when the agent reported no diff, rather than refusing on a technicality
      // — an adapter that omits `diff` is not evidence that a dependency was added.
      const diff = result.diff || (await runner.diff().catch(() => ''))
      if (!diff) {
        // A manifest changed but we cannot see how. Say so rather than guessing either way.
        return {
          gate: 'no-unrequested-dependencies',
          verdict: 'reject',
          reason: `${touched.join(', ')} changed, and no diff was available to check what was added`,
          hint: 'Review the manifest change by hand.',
        }
      }

      const taskText = `${task.title} ${task.body}`.toLowerCase()
      const added: string[] = []

      for (const line of addedLines(diff)) {
        if (!manifests.some((m) => matchGlob(m, line.file))) continue
        // `"name": "^1.2.3"` in a JSON manifest, or `name==1.2` / `name = "1.2"` elsewhere.
        const json = /^\s*"([^"]+)"\s*:\s*"[^"]*"/.exec(line.text)
        const other = /^\s*([A-Za-z0-9@._/-]+)\s*[=><~]{1,2}/.exec(line.text)
        const name = json?.[1] ?? other?.[1]
        if (!name) continue
        // Ignore manifest fields that are not dependencies at all.
        if (['name', 'version', 'description', 'license', 'main', 'type', 'author'].includes(name)) continue
        // The task named it, so it was asked for.
        if (taskText.includes(name.toLowerCase().replace(/^@[^/]+\//, ''))) continue
        added.push(name)
      }

      if (added.length === 0) return pass('no-unrequested-dependencies')

      return reject(
        'no-unrequested-dependencies',
        `${added.length} dependency/dependencies added that the task did not ask for: ${added.join(', ')}`,
        'Use what is already installed, or the standard library. If one of these is genuinely ' +
          'required, say why in the pull request description so a human can agree.',
      )
    },
  }
}

/**
 * A new thing that already exists.
 *
 * The ladder's second rung. Needs a symbol index, so the caller supplies one — the gate does
 * not build it, both because indexing is not core's job and because the caller usually has one
 * already.
 *
 * Deliberately conservative. It fires only on a near-exact name match, because "similar" is a
 * judgement and a gate that rejected every plausibly-overlapping helper would be turned off
 * within a week.
 */
export function noDuplicateSymbols(opts: {
  /** Existing exported symbols, by name, excluding anything the agent just added. */
  existing: () => Promise<Array<{ name: string; file: string }>> | Array<{ name: string; file: string }>
}): Gate {
  return {
    name: 'no-duplicate-symbols',
    async verify({ result, runner }) {
      /*
       * Ask the workspace when the agent said nothing.
       *
       * `result.diff ?? ''` treated an empty string as an answer, so an adapter that does not
       * populate `diff` — most of them, on some paths — had this gate inspect nothing and pass.
       * A duplication check that silently checks nothing is worse than one that is switched
       * off, because the run reports that it ran.
       */
      const diff = result.diff || (await runner.diff().catch(() => ''))
      if (!diff) return pass('no-duplicate-symbols')

      const declared: Array<{ name: string; file: string }> = []
      for (const line of addedLines(diff)) {
        const match =
          /^\s*export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/.exec(line.text) ??
          /^\s*export\s+(?:const|class|interface|type)\s+([A-Za-z_$][\w$]*)/.exec(line.text) ??
          /^\s*(?:pub\s+)?fn\s+([a-z_][\w]*)/.exec(line.text) ??
          /^\s*def\s+([a-z_][\w]*)/.exec(line.text)
        if (match?.[1]) declared.push({ name: match[1], file: line.file })
      }
      if (declared.length === 0) return pass('no-duplicate-symbols')

      const index = await opts.existing()
      const changed = new Set(result.filesChanged)
      const collisions: string[] = []

      for (const added of declared) {
        const clash = index.find(
          (e) =>
            e.name.toLowerCase() === added.name.toLowerCase() &&
            // Not the same file — redeclaring within the file it edited is normal.
            e.file !== added.file &&
            !changed.has(e.file),
        )
        if (clash) collisions.push(`\`${added.name}\` in ${added.file} already exists in ${clash.file}`)
      }

      if (collisions.length === 0) return pass('no-duplicate-symbols')

      return reject(
        'no-duplicate-symbols',
        `${collisions.length} newly-added symbol(s) already exist elsewhere:\n  ${collisions.join('\n  ')}`,
        'Reuse the existing one, or extend it. If the new one genuinely differs, give it a name ' +
          'that says how.',
      )
    },
  }
}

/**
 * An abstraction with one user.
 *
 * The ladder's "no abstractions that weren't explicitly requested". An interface introduced
 * alongside its single implementation, in the same change, is a layer added on speculation.
 *
 * Scoped to the diff on purpose: an interface with one implementer that has been in the
 * codebase for a year is somebody's deliberate design, and reopening that argument is not this
 * gate's business.
 */
export function noSpeculativeAbstraction(opts: { minImplementers?: number } = {}): Gate {
  const minImplementers = opts.minImplementers ?? 2

  return {
    name: 'no-speculative-abstraction',
    async verify({ task, result, runner }) {
      // Same reasoning as the sibling gates: an absent diff is a gap in reporting, not evidence
      // of a small change, so read the workspace before concluding anything.
      const diff = result.diff || (await runner.diff().catch(() => ''))
      if (!diff) return pass('no-speculative-abstraction')

      /*
       * The task asking for an abstraction makes it requested, which is the whole exemption.
       *
       * The inflections are spelled out. `extensib` and `pluggab` were written as prefixes, but
       * a trailing `\b` requires a non-word character next, so neither matched "extensible" or
       * "pluggable" — the two words most likely to appear in a task that legitimately asks for
       * this. Being an exemption, a miss fails the gate on work the human explicitly requested,
       * which is the expensive direction to be wrong in.
       */
      const taskText = `${task.title} ${task.body}`.toLowerCase()
      const REQUESTED =
        /\b(?:interfaces?|abstract(?:ion|ions|ing)?|plug-?ins?|adapters?|extensib(?:le|ility)|pluggab(?:le|ility)|strategy pattern)\b/
      if (REQUESTED.test(taskText)) {
        return pass('no-speculative-abstraction')
      }

      const added = addedLines(diff)
      const interfaces = new Map<string, string>()
      for (const line of added) {
        const match = /^\s*export\s+(?:interface|abstract\s+class)\s+([A-Za-z_$][\w$]*)/.exec(line.text)
        if (match?.[1]) interfaces.set(match[1], line.file)
      }
      if (interfaces.size === 0) return pass('no-speculative-abstraction')

      const speculative: string[] = []
      for (const [name, file] of interfaces) {
        const implementers = added.filter((l) =>
          new RegExp(`\\b(?:implements|extends|:)\\s+${name}\\b`).test(l.text),
        ).length
        if (implementers < minImplementers) {
          speculative.push(`\`${name}\` in ${file} (${implementers} implementer(s))`)
        }
      }

      if (speculative.length === 0) return pass('no-speculative-abstraction')

      return reject(
        'no-speculative-abstraction',
        `${speculative.length} abstraction(s) introduced with fewer than ${minImplementers} users: ${speculative.join(', ')}`,
        'An interface with one implementation is a layer added on speculation. Use the concrete ' +
          'type; introduce the interface when a second implementation actually arrives.',
      )
    },
  }
}

/**
 * The three checkable rungs together.
 *
 * `existing` is optional: without a symbol index the duplicate check cannot run, and running
 * two of three is better than refusing to run any.
 */
export function minimalismGates(opts: {
  existing?: Parameters<typeof noDuplicateSymbols>[0]['existing']
} = {}): Gate[] {
  return [
    noUnrequestedDependencies(),
    noSpeculativeAbstraction(),
    ...(opts.existing ? [noDuplicateSymbols({ existing: opts.existing })] : []),
  ]
}
