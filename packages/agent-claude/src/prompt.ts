/**
 * Prompt assembly.
 *
 * This is where the three layers meet: the task, the project's own conventions from
 * `.ctxmux/`, and a budgeted slice of the repository. It is the reason a driven agent is
 * worth owning — you decide what goes in the window and in what proportion.
 *
 * The budget split is deliberate. Repository context is capped so it cannot crowd out the task
 * itself; skills are selected by relevance rather than all included, because a wall of
 * unrelated guidance costs tokens and dilutes attention.
 */
import type { Feedback, TaskSpec } from '@contextmux/core'
import type { ContextModel, Rule, Skill } from '@contextmux/context'
import { globsOverlap } from '@contextmux/core'
import { buildMap, type RepoIndex } from '@contextmux/repo'

export interface PromptOptions {
  task: TaskSpec
  context?: ContextModel
  index?: RepoIndex
  feedback?: Feedback
  /** Tokens the repository map may occupy. */
  repoBudget?: number
  /** Maximum skills to include, ranked by relevance. */
  maxSkills?: number
  /**
   * Who the prompt is for, which decides whether the project's own context is inlined.
   *
   * A driven agent is handed a prompt and nothing else, so its conventions have to travel with
   * it. A delegated one is working inside a checkout of the repository and reads that
   * repository's config natively — Copilot's coding agent honours
   * `.github/copilot-instructions.md` and `.github/instructions/**`, which contextmux compiled
   * for it. Inlining them again duplicates what the agent already has.
   *
   * On a real board that duplication was not merely wasteful. The artefact came to 151,604
   * characters against a GitHub issue-body limit of 65,536, so the run would have failed at
   * the point of creating the issue — after preflight had passed and reported everything fine.
   */
  audience?: 'driven' | 'delegated'
}

/** Score a skill against the task, so only relevant guidance is spent. */
/** Words worth matching on: long enough to mean something, split the way identifiers are. */
function terms(text: string): Set<string> {
  return new Set(
    text
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 3),
  )
}

/**
 * How well a skill matches the task in front of it.
 *
 * Scored as the *proportion* of the skill's own vocabulary that the task mentions, not the
 * count. A raw count rewards a long description: a pack whose skills each describe themselves
 * in eight hundred characters crowds out the repository's own three-line skills, whatever the
 * task is. Dividing by the skill's vocabulary makes a short precise description competitive
 * with a long vague one, which is the right way round.
 *
 * Matching is word against word. Substring matching counted `code` as a hit inside `encoded`
 * and `decoder`, which meant almost every skill scored on almost every task.
 */
function scoreSkill(skill: Skill, task: TaskSpec): number {
  const wanted = terms(`${skill.name} ${skill.description}`)
  if (wanted.size === 0) return 0

  const present = terms(`${task.title} ${task.body}`)
  let shared = 0
  for (const term of wanted) if (present.has(term)) shared += 1

  let score = shared / wanted.size

  // A skill scoped to paths the task may touch is very likely relevant, whatever its wording.
  if (skill.globs.length > 0 && task.scope.allow.length > 0) {
    if (skill.globs.some((g) => task.scope.allow.some((a) => globsOverlap(g, a)))) score += 0.5
  }

  return score
}

function relevantRules(rules: Rule[], task: TaskSpec): Rule[] {
  return rules
    .filter((rule) => {
      if (rule.alwaysApply || rule.globs.length === 0) return true
      // Without a declared scope we cannot tell which rules apply, so include them all rather
      // than silently dropping guidance the author expected to be in force.
      if (task.scope.allow.length === 0) return true
      // Both sides are patterns — no files exist yet — so this asks whether they could ever
      // describe the same file. The previous test compared the rule's literal prefix with
      // `startsWith`, which matched everything whenever a glob began with a star, and matched
      // a rule scoped to per-package tsconfig files against a task scoped to per-package tests.
      return rule.globs.some((g) => task.scope.allow.some((a) => globsOverlap(g, a)))
    })
    .sort((a, b) => b.priority - a.priority)
}

/**
 * Push a document's own headings below the one it is being filed under.
 *
 * Each of these bodies was written as a standalone file, so it opens with its own `#` title.
 * Dropped into a prompt verbatim, that title outranks the task's — the agent reads a document
 * whose most prominent heading is "Project conventions" rather than the thing it was asked to
 * do, and the section boundaries stop meaning anything.
 *
 * Fenced blocks are skipped, because a `#` at the start of a line inside one is a shell comment
 * or a CSS id, not a heading.
 */
function demoteHeadings(body: string, under: number): string {
  let fenced = false

  return body
    .split('\n')
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        fenced = !fenced
        return line
      }
      if (fenced) return line

      const heading = /^(#{1,6}) (.*)$/.exec(line)
      if (!heading) return line

      // Capped at six: markdown has no deeper level, and a run of ###### reads as noise anyway.
      return `${'#'.repeat(Math.min(heading[1]!.length + under, 6))} ${heading[2]}`
    })
    .join('\n')
}

export function renderPrompt(opts: PromptOptions): string {
  const { task, context, index, feedback } = opts
  const parts: string[] = []

  // --- revision rounds lead with the feedback ------------------------------
  if (feedback) {
    parts.push(
      [
        `# Revision round ${feedback.round}`,
        '',
        `Your previous attempt at this task did not pass. Feedback from ${feedback.source}:`,
        '',
        feedback.body,
        ...(feedback.items?.length
          ? ['', 'Specific comments:', ...feedback.items.map((i) => `- ${i.file}${i.line ? `:${i.line}` : ''} — ${i.body}`)]
          : []),
        '',
        'Fix exactly what is described above. Do not make unrelated changes, and do not revert',
        'work that was not criticised.',
      ].join('\n'),
    )
  }

  // --- the task ------------------------------------------------------------
  parts.push(
    [
      `# Task: ${task.title}`,
      '',
      task.body,
      ...(task.acceptanceCriteria.length
        ? [
            '',
            '## Acceptance criteria',
            '',
            'Every one of these must be true when you are done:',
            '',
            ...task.acceptanceCriteria.map((c) => `- ${c.text}`),
          ]
        : []),
      /*
       * Attachments, named and declared unreadable.
       *
       * The body arrives with `![screenshot.png](attachment:abc)` in it, because discarding a
       * screenshot silently would discard the specification — for UI work the picture is
       * frequently the whole requirement. But the agent cannot fetch it: the link needs Jira
       * credentials it does not have. Left unexplained, a dangling image reference invites it
       * to imagine what the picture showed, which is the worst of the three options.
       *
       * So the reference stays and the limitation is stated. An agent that knows it is missing
       * something can say so; one that does not, guesses.
       */
      ...(task.attachments?.length
        ? [
            '',
            '## Attachments you cannot see',
            '',
            `This task has ${task.attachments.length} attachment(s), referenced in the text above:`,
            '',
            ...task.attachments.map((a) => `- ${a.name}`),
            '',
            'You have no way to open them. Do not guess at what they show. If the change depends',
            'on their contents, say so plainly and stop rather than proceeding on an assumption.',
          ]
        : []),
    ].join('\n'),
  )

  // --- scope, stated as an enforced constraint rather than a request -------
  const scopeLines: string[] = []
  if (task.scope.allow.length > 0) {
    scopeLines.push(`- You may modify only: ${task.scope.allow.map((p) => `\`${p}\``).join(', ')}`)
  }
  if (task.scope.deny.length > 0) {
    scopeLines.push(`- You must not modify: ${task.scope.deny.map((p) => `\`${p}\``).join(', ')}`)
  }
  if (task.scope.maxFiles !== undefined) {
    scopeLines.push(`- Change at most ${task.scope.maxFiles} file(s)`)
  }
  if (scopeLines.length > 0) {
    parts.push(
      [
        '## Scope',
        '',
        ...scopeLines,
        '',
        'These boundaries are checked automatically after you finish. A change outside them is',
        'rejected and sent back, so staying inside them is faster than not.',
      ].join('\n'),
    )
  }

  // --- project conventions -------------------------------------------------
  /*
   * Skipped entirely for a delegated agent, which reads them from the repository itself.
   *
   * Named rather than silently dropped: an agent told where its conventions live can go and
   * read them, and a human reading the issue can see that the omission was deliberate.
   */
  const delegated = opts.audience === 'delegated'

  if (delegated && (context?.instructions?.body || context?.rules?.length)) {
    parts.push(
      [
        '## Project conventions',
        '',
        'This repository carries its own conventions, compiled by contextmux, and you are',
        'working inside a checkout of it. Read them rather than assuming defaults:',
        '',
        '- `.github/copilot-instructions.md` — how this project is written',
        '- `.github/instructions/*.instructions.md` — rules scoped to particular paths',
        '',
        'They are not repeated here because you can open them, and repeating them would not',
        'fit in an issue body.',
      ].join('\n'),
    )
  }

  if (!delegated && context?.instructions?.body) {
    parts.push(['## Project conventions', '', demoteHeadings(context.instructions.body.trim(), 2)].join('\n'))
  }

  if (!delegated && context?.rules?.length) {
    const rules = relevantRules(context.rules, task)
    if (rules.length > 0) {
      parts.push(
        [
          '## Rules',
          '',
          ...rules.map((r) =>
            [
              `### ${r.description ?? r.name}`,
              r.globs.length ? `_Applies to: ${r.globs.map((g) => `\`${g}\``).join(', ')}_` : '',
              '',
              demoteHeadings(r.body.trim(), 3),
            ]
              .filter(Boolean)
              .join('\n'),
          ),
        ].join('\n\n'),
      )
    }
  }

  if (context?.skills?.length) {
    const ranked = context.skills
      .map((s) => ({ skill: s, score: scoreSkill(s, task) }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, opts.maxSkills ?? 3)

    if (ranked.length > 0) {
      parts.push(
        [
          '## Relevant practices',
          '',
          ...ranked.map(({ skill }) =>
            [`### ${skill.name}`, `_${skill.description}_`, '', demoteHeadings(skill.body.trim(), 3)].join('\n'),
          ),
        ].join('\n\n'),
      )
    }
  }

  // --- repository map ------------------------------------------------------
  if (index) {
    const map = buildMap(index, {
      text: `${task.title}\n${task.body}`,
      budget: opts.repoBudget ?? 3000,
      ...(task.scope.allow.length ? { paths: task.scope.allow } : {}),
    })
    parts.push(
      [
        map.text.trim(),
        '',
        'Read the relevant files before writing anything. If something close to what you need',
        'already exists, extend it rather than adding a parallel implementation.',
      ].join('\n'),
    )
  }

  // --- how to finish -------------------------------------------------------
  /*
   * Who runs the checks depends on who can.
   *
   * A driven agent works in a checkout on a machine that already has the project installed, so
   * asking it to verify is both possible and cheaper than a correction round. A delegated one
   * works in the vendor's sandbox, which has no credentials for a private registry and often no
   * route to it either — and contextmux re-runs these commands itself afterwards regardless.
   *
   * On a real ticket this instruction cost about twenty of thirty-six turns: the agent tried
   * pnpm, then npm, then hunted for a vitest binary, then tried to install twice, against a
   * registry the sandbox cannot reach. It had made the correct change by turn fifteen.
   */
  if (task.qualityGate.length > 0 && !delegated) {
    parts.push(
      [
        '## Before you finish',
        '',
        'Run these and fix every failure:',
        '',
        '```bash',
        ...task.qualityGate,
        '```',
        '',
        'These are run again automatically after you finish. A failure sends the task back to',
        'you, so it is cheaper to fix it now.',
      ].join('\n'),
    )
  } else if (task.qualityGate.length > 0) {
    parts.push(
      [
        '## Verification happens outside this environment',
        '',
        'Do not install dependencies and do not run the test suite. This environment has no',
        'credentials for the project and may have no route to its package registry, so the',
        'attempt will fail however many ways you try it.',
        '',
        'These are run for you once you finish, somewhere that can:',
        '',
        '```bash',
        ...task.qualityGate,
        '```',
        '',
        'Make the change, satisfy the acceptance criteria by reading the code, and stop.',
      ].join('\n'),
    )
  }

  /*
   * A bound on trying the same thing differently.
   *
   * The expensive failure mode is not one command failing, it is the search for a way around
   * it: pnpm, then npm, then `which node`, then the binary directly, then install, then install
   * with the other tool. Seven escalating attempts where two and a sentence would have done —
   * and the sentence is the part a human can act on.
   */
  parts.push(
    [
      '## If something blocks you',
      '',
      'Try at most twice. If a command fails a second time for the same reason, stop and say',
      'what blocked you — the exact command and the error. Do not reach for a different package',
      'manager, a different runner, or a manual install.',
      '',
      'An accurate account of what stopped you is worth more than a workaround, and something',
      'that cannot work here is usually a missing credential or a blocked host, which no amount',
      'of retrying will supply.',
    ].join('\n'),
  )

  parts.push(
    [
      '## Working agreement',
      '',
      '- Make the change. Do not ask for confirmation — there is nobody to answer.',
      '- If an existing test fails after your change, your implementation is wrong. Fix the',
      '  implementation, not the test.',
      '- If the task is impossible or unsafe as written, stop and say so plainly, explaining why.',
      '  Do not produce a partial change that looks complete.',
      '- End with a short summary of what you changed and why.',
    ].join('\n'),
  )

  return parts.join('\n\n---\n\n')
}
