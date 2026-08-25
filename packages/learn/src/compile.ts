/**
 * Turning recurring successful approaches into proposed skills.
 *
 * The same shape as the rest of this package — observe, cluster, propose, let a human decide —
 * pointed at successes rather than failures. Reusing that pipeline is deliberate: a second
 * command with a second ledger and a second approval flow would be more surface for the same
 * idea, and the two kinds of lesson belong in one place because they compete for the same
 * scarce resource, which is a reader's attention.
 */
import type { Trajectory } from '@contextmux/trajectory'
import { createHash } from 'node:crypto'
import { serializeFrontmatter, type ContextModel } from '@contextmux/context'
import { terms, similarity } from './cluster.js'
import type { Proposal } from './propose.js'
import { describeShape, shapeKey, shapeOf, type Move } from './success.js'

/** One exemplary run, reduced to what the compiler needs. */
export interface Exemplar {
  taskId: string
  runId: string
  /** Task title and body, for working out when the approach applies. */
  taskText: string
  shape: Move[]
  /** Distinct files the run touched, for scoping. */
  files: string[]
  at: number
}

export function toExemplar(input: {
  taskId: string
  runId: string
  taskText: string
  trajectory: Trajectory
  files: string[]
}): Exemplar {
  return {
    taskId: input.taskId,
    runId: input.runId,
    taskText: input.taskText,
    shape: shapeOf(input.trajectory),
    files: input.files,
    at: Date.now(),
  }
}

export interface ApproachPattern {
  id: string
  shape: Move[]
  exemplars: Exemplar[]
  /** Distinct tasks it worked on — the measure of whether it generalises. */
  taskCount: number
  /** What those tasks had in common, if anything. */
  commonTerms: string[]
}

/**
 * Identity of an approach, derived from its shape.
 *
 * Digested for the same reason a lesson's id is: this is the key a person's decision is
 * recorded against, and two shapes sharing one would silently suppress an approach nobody
 * declined.
 */
function patternId(shape: Move[]): string {
  return `A-${createHash('sha256').update(shapeKey(shape)).digest('base64url').slice(0, 10)}`
}

export interface CompileOptions {
  /** Distinct tasks a shape must have worked on before it counts as an approach. */
  minTasks?: number
  /** Shapes shorter than this describe nothing worth writing down. */
  minLength?: number
}

/**
 * Find approaches that keep working.
 *
 * Grouped by exact shape rather than by similarity. Two sequences that differ are two
 * approaches, and blurring them would produce a skill describing neither — the opposite of the
 * problem in `cluster.ts`, where the input is prose and near-matches are the same point.
 */
export function findApproaches(exemplars: Exemplar[], opts: CompileOptions = {}): ApproachPattern[] {
  const minTasks = opts.minTasks ?? 3
  const minLength = opts.minLength ?? 2

  const byShape = new Map<string, Exemplar[]>()
  for (const exemplar of exemplars) {
    if (exemplar.shape.length < minLength) continue
    const key = shapeKey(exemplar.shape)
    byShape.set(key, [...(byShape.get(key) ?? []), exemplar])
  }

  const patterns: ApproachPattern[] = []

  for (const [, group] of byShape) {
    const tasks = new Set(group.map((e) => e.taskId))
    if (tasks.size < minTasks) continue

    patterns.push({
      id: patternId(group[0]!.shape),
      shape: group[0]!.shape,
      exemplars: group,
      taskCount: tasks.size,
      commonTerms: sharedTerms(group.map((e) => e.taskText)),
    })
  }

  return patterns.sort((a, b) => b.taskCount - a.taskCount)
}

/**
 * Terms present in most of a group's tasks.
 *
 * Used to say when an approach applies. Requiring *every* task to share a term finds nothing
 * once a group is more than three or four; a majority is the useful threshold.
 */
function sharedTerms(texts: string[]): string[] {
  if (texts.length === 0) return []
  const counts = new Map<string, number>()
  for (const text of texts) {
    for (const term of terms(text)) counts.set(term, (counts.get(term) ?? 0) + 1)
  }
  const threshold = Math.ceil(texts.length * 0.6)
  return [...counts]
    .filter(([, n]) => n >= threshold)
    .sort((a, b) => b[1] - a[1])
    .map(([term]) => term)
    .slice(0, 6)
}

/** Name a skill after what its tasks had in common, or after the shape. */
function nameFor(pattern: ApproachPattern): string {
  if (pattern.commonTerms.length >= 2) {
    return `${pattern.commonTerms.slice(0, 3).join('-')}-approach`.replace(/[^a-z0-9-]/g, '')
  }
  return `${pattern.shape.join('-then-')}`
}

/** When to reach for it. */
function descriptionFor(pattern: ApproachPattern): string {
  const what =
    pattern.commonTerms.length >= 2
      ? `tasks involving ${pattern.commonTerms.slice(0, 3).join(', ')}`
      : 'a task of this kind'
  return `Use for ${what} — an approach that has worked ${pattern.taskCount} times here without needing correction.`
}

/**
 * Is this already covered?
 *
 * A skill saying what an existing one says is not an addition, it is dilution — and the whole
 * value of the context layer is that everything in it earns its place.
 */
function alreadyCovered(pattern: ApproachPattern, context: ContextModel): boolean {
  const proposed = terms(describeShape(pattern.shape).join(' '))
  for (const skill of context.skills) {
    if (similarity(proposed, terms(`${skill.description} ${skill.body}`)) >= 0.6) return true
  }
  return false
}

export function proposeApproaches(
  patterns: ApproachPattern[],
  context: ContextModel,
  opts: { sourceDir?: string } = {},
): Proposal[] {
  const sourceDir = opts.sourceDir ?? '.ctxmux'
  const proposals: Proposal[] = []

  for (const pattern of patterns) {
    if (alreadyCovered(pattern, context)) continue

    const name = nameFor(pattern)
    const steps = describeShape(pattern.shape)

    const body = [
      `## The approach`,
      '',
      ...steps.map((step, i) => `${i + 1}. ${step}`),
      '',
      '## Why this is here',
      '',
      `This sequence was what ${pattern.taskCount} tasks in this repository had in common when`,
      'they succeeded first time — no correction rounds, every check passing.',
      '',
      /*
       * The caveat is not decoration. A skill that reads as a procedure invites an agent to
       * follow it when it does not fit, and the tasks where an agent earns its cost are
       * exactly the ones where the steps have to vary.
       */
      '_It describes what has worked, not what must happen. Where the task calls for something',
      'different, do the different thing — this is evidence, not a procedure._',
    ].join('\n')

    proposals.push({
      id: pattern.id,
      kind: 'new-rule',
      lesson: `An approach that has worked ${pattern.taskCount} times: ${pattern.shape.join(' → ')}`,
      path: `${sourceDir}/skills/${name}/SKILL.md`,
      taskCount: pattern.taskCount,
      evidence: pattern.exemplars.slice(0, 5).map((e) => ({
        taskId: e.taskId,
        source: 'succeeded first time',
        text: e.taskText.split('\n')[0]?.slice(0, 120) ?? '',
      })),
      globs: [],
      // Approaches come from trajectories, not from recorded observations, so there is no
      // evidence in the ledger for an applied one to retire.
      signalKeys: [],
      // Serialised rather than interpolated. The values here happen to be alphanumeric today,
      // but a generated file that breaks its own loader is a failure worth being structurally
      // unable to reach rather than one that depends on a term extractor staying strict.
      content: serializeFrontmatter({ name, description: descriptionFor(pattern) }, body),
    })
  }

  return proposals
}
