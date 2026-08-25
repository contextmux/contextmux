/**
 * A trajectory: the ordered record of one agent invocation.
 *
 * Deliberately append-only and bounded. Append-only because a record that can be rewritten is
 * not evidence; bounded because a long run can emit thousands of steps and the interesting
 * questions — is it repeating itself, did it verify before acting — only ever need a window.
 */
import { hashWorkspace, isMutating, signatureOf, type ObservationData, type Step, type StepKind, type ToolStepData } from './steps.js'

export interface TrajectoryMeta {
  runId: string
  taskId: string
  /** Filled in once the agent is resolved, which may be after the trajectory is created. */
  agentId: string
  /** Revision round this invocation belongs to. */
  round: number
  startedAt: number
  endedAt?: number
  /**
   * Where the agent was working.
   *
   * Recorded so paths can be shown relative to it. A worktree lives under a temp directory
   * with a hashed name, and a timeline where every line begins with sixty characters of that
   * prefix is one nobody reads.
   */
  workspaceRoot?: string
}

export interface TrajectoryData {
  meta: TrajectoryMeta
  steps: Step[]
  /** Steps dropped to stay within the cap, so truncation is never silent. */
  dropped: number
}

/** Enough to answer every question asked of a trajectory, without unbounded growth. */
const MAX_STEPS = 5_000

export class Trajectory {
  private steps: Step[] = []
  private seq = 0
  private droppedCount = 0

  constructor(readonly meta: TrajectoryMeta) {}

  /** Record which agent this turned out to be, once that is known. */
  attribute(agentId: string, workspaceRoot?: string): void {
    this.meta.agentId = agentId
    if (workspaceRoot) this.meta.workspaceRoot = workspaceRoot
  }

  /** Trim the workspace prefix off a path, so a timeline reads as file names. */
  private relative(text: string): string {
    const root = this.meta.workspaceRoot
    if (!root) return text

    /*
     * Longest prefix first.
     *
     * macOS resolves `/tmp/x` to `/private/tmp/x`, so both forms appear. Stripping the plain
     * root first matches it *inside* the resolved path and leaves a `private/` fragment
     * behind — the two candidates have to be tried longest-first.
     */
    for (const candidate of [`/private${root}`, root]) {
      if (text.includes(candidate)) {
        return text.split(candidate).join('').replace(/^\/+/, '')
      }
    }
    return text
  }

  static from(data: TrajectoryData): Trajectory {
    const t = new Trajectory(data.meta)
    t.steps = [...data.steps]
    t.seq = data.steps.at(-1)?.seq ?? 0
    t.droppedCount = data.dropped
    return t
  }

  toJSON(): TrajectoryData {
    return { meta: this.meta, steps: this.steps, dropped: this.droppedCount }
  }

  get length(): number {
    return this.steps.length
  }

  get all(): readonly Step[] {
    return this.steps
  }

  /** Steps of a kind, newest last. */
  of(kind: StepKind): Step[] {
    return this.steps.filter((s) => s.kind === kind)
  }

  /** A step's summary with the workspace prefix removed. */
  describe(step: Step): string {
    return this.relative(step.summary)
  }

  /** The most recent `n` steps, for questions about what is happening now. */
  recent(n: number): Step[] {
    return this.steps.slice(-n)
  }

  private push(step: Omit<Step, 'seq' | 'at'> & { at?: number }): Step {
    const full: Step = { seq: ++this.seq, at: step.at ?? Date.now(), ...step }
    this.steps.push(full)

    if (this.steps.length > MAX_STEPS) {
      /*
       * Drop from the middle, not the start.
       *
       * The opening steps establish what the agent was asked and what it read first, and the
       * closing steps are what it is doing now. The middle of a very long run is the least
       * informative part, and it is also the part most likely to be repetitive.
       */
      const keepHead = Math.floor(MAX_STEPS * 0.2)
      const keepTail = MAX_STEPS - keepHead
      this.droppedCount += this.steps.length - MAX_STEPS
      this.steps = [...this.steps.slice(0, keepHead), ...this.steps.slice(-keepTail)]
    }

    return full
  }

  dispatch(summary: string, data?: Record<string, unknown>): Step {
    return this.push({ kind: 'dispatch', name: 'dispatch', summary, ...(data ? { data } : {}) })
  }

  /** Tool steps awaiting a result, keyed by the vendor's call id. */
  private readonly awaitingResult = new Map<string, Step>()

  tool(
    name: string,
    args: unknown,
    opts: { ok?: boolean; error?: string; files?: string[]; id?: string; existed?: boolean } = {},
  ): Step {
    const data: ToolStepData = {
      mutating: isMutating(name),
      signature: signatureOf(name, args),
      ...(opts.ok !== undefined ? { ok: opts.ok } : {}),
      ...(opts.error ? { error: opts.error } : {}),
      ...(opts.existed !== undefined ? { existed: opts.existed } : {}),
    }
    const step = this.push({
      kind: 'tool',
      name,
      summary: describeArgs(name, args),
      data: data as unknown as Record<string, unknown>,
      ...(opts.files?.length ? { files: opts.files } : {}),
    })

    /*
     * Vendors report a call and its result as separate events, so the outcome has to be
     * attached afterwards. Without this every tool call would look like it succeeded, and the
     * detector that matters most — acting on an unresolved error — would never fire.
     */
    if (opts.id) this.awaitingResult.set(opts.id, step)
    return step
  }

  /** Attach an outcome to a call recorded earlier. Unknown ids are ignored. */
  resolveTool(id: string, ok: boolean, error?: string): void {
    const step = this.awaitingResult.get(id)
    if (!step) return
    this.awaitingResult.delete(id)
    const data = step.data as unknown as ToolStepData
    data.ok = ok
    if (error) data.error = error
    if (!ok) step.summary = `${step.summary} — failed`
  }

  message(text: string): Step {
    const trimmed = text.trim().replace(/\s+/g, ' ')
    return this.push({
      kind: 'message',
      name: 'assistant',
      summary: trimmed.length > 160 ? `${trimmed.slice(0, 160)}…` : trimmed,
    })
  }

  /** Record a workspace sample and report how long nothing has changed. */
  observe(files: string[], diff: string): Step {
    const workspaceHash = hashWorkspace(files, diff)
    const previous = [...this.steps].reverse().find((s) => s.kind === 'observation')
    const previousHash = (previous?.data as unknown as ObservationData | undefined)?.workspaceHash
    const previousStagnant = (previous?.data as unknown as ObservationData | undefined)?.stagnantFor ?? 0
    const stagnantFor = previousHash === workspaceHash ? previousStagnant + 1 : 0

    const data: ObservationData = { workspaceHash, filesChanged: files.length, stagnantFor }
    return this.push({
      kind: 'observation',
      name: 'workspace',
      summary:
        stagnantFor === 0
          ? `${files.length} file(s) changed`
          : `unchanged for ${stagnantFor} sample(s)`,
      data: data as unknown as Record<string, unknown>,
    })
  }

  gate(name: string, verdict: string, reason?: string): Step {
    return this.push({
      kind: 'gate',
      name,
      summary: reason ? `${verdict}: ${reason.split('\n')[0]}` : verdict,
      data: { verdict },
    })
  }

  feedback(source: string, body: string): Step {
    return this.push({
      kind: 'feedback',
      name: source,
      summary: body.trim().split('\n')[0]?.slice(0, 160) ?? '',
    })
  }

  intervention(name: string, summary: string, data?: Record<string, unknown>): Step {
    return this.push({ kind: 'intervention', name, summary, ...(data ? { data } : {}) })
  }

  result(status: string, summary: string, files: string[]): Step {
    this.meta.endedAt = Date.now()
    return this.push({ kind: 'result', name: status, summary, files })
  }

  /** How many samples in a row have shown no change. */
  get stagnantSamples(): number {
    const last = [...this.steps].reverse().find((s) => s.kind === 'observation')
    return (last?.data as unknown as ObservationData | undefined)?.stagnantFor ?? 0
  }

  /** Tool calls whose signature matches, for spotting repetition. */
  repeatsOf(signature: string): Step[] {
    return this.steps.filter(
      (s) => s.kind === 'tool' && (s.data as unknown as ToolStepData | undefined)?.signature === signature,
    )
  }

  /** Files the agent read, in order, for checking whether it looked before it leapt. */
  readFiles(): string[] {
    const out: string[] = []
    for (const step of this.steps) {
      if (step.kind !== 'tool') continue
      if ((step.data as unknown as ToolStepData | undefined)?.mutating) continue
      out.push(...(step.files ?? []))
    }
    return out
  }

  /** A compact human-readable rendering, for a terminal or a handoff package. */
  render(opts: { limit?: number } = {}): string {
    const limit = opts.limit ?? 60
    const shown = this.steps.slice(-limit)
    const lines: string[] = []

    if (this.droppedCount > 0 || shown.length < this.steps.length) {
      const hidden = this.droppedCount + (this.steps.length - shown.length)
      lines.push(`… ${hidden} earlier step(s) not shown`)
    }

    const start = this.meta.startedAt
    for (const step of shown) {
      const elapsed = `${Math.round((step.at - start) / 1000)}s`.padStart(6)
      const kind = step.kind.padEnd(12)
      lines.push(`${elapsed}  ${kind}${step.name.padEnd(18)} ${this.relative(step.summary)}`)
    }
    return lines.join('\n')
  }
}

/** One line describing a tool call, favouring the argument a reader cares about. */
function describeArgs(name: string, args: unknown): string {
  if (!args || typeof args !== 'object') return name

  const record = args as Record<string, unknown>
  for (const key of ['file_path', 'path', 'file', 'command', 'pattern', 'query', 'url']) {
    const value = record[key]
    if (typeof value === 'string') {
      return value.length > 120 ? `${value.slice(0, 120)}…` : value
    }
  }

  const keys = Object.keys(record).slice(0, 3)
  return keys.length ? keys.join(', ') : name
}
