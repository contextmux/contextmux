/**
 * Exporting a trajectory as OpenTelemetry spans.
 *
 * ## Why the format and not the SDK
 *
 * The reason to export at all is to *not* build a viewer. Jaeger, Grafana Tempo and SigNoz are
 * free, self-hostable and already good at showing traces; writing a worse version of them would
 * be the clearest possible waste of effort.
 *
 * The reason to skip `@opentelemetry/*` is arithmetic. The SDK is three or more packages, and
 * contextmux currently has three dependencies in total across twenty packages. OTLP over HTTP is
 * a documented wire format — a JSON body posted to `/v1/traces` — so `fetch` covers it, and the
 * envelope stays stable while the SDK's API does not.
 *
 * ## What is stable and what is not
 *
 * The OTLP envelope is stable and used verbatim. The GenAI semantic conventions are not: every
 * span definition in them is marked `stability: development`, which is OpenTelemetry's term for
 * "expect this to change". They are followed where they fit, because a backend that understands
 * `gen_ai.tool.name` should see it — but nothing here depends on them.
 *
 * And they do not fit everything. The conventions have no notion of a trajectory, of a repeated
 * call, of a stall, or of the harness intervening — the concepts this package exists to record.
 * Those go under `contextmux.*`, which is honest about being ours rather than borrowing a
 * standard name that means something else.
 */
import { createHash } from 'node:crypto'
import type { Step } from './steps.js'
import type { Trajectory } from './trajectory.js'
import { inspect, type Smell } from './smells.js'

type AttrValue = { stringValue: string } | { intValue: string } | { boolValue: boolean }

interface OtlpAttribute {
  key: string
  value: AttrValue
}

interface OtlpSpan {
  traceId: string
  spanId: string
  parentSpanId?: string
  name: string
  kind: number
  startTimeUnixNano: string
  endTimeUnixNano: string
  attributes: OtlpAttribute[]
  status?: { code: number; message?: string }
}

/** Span kinds, from the OTLP spec. */
const KIND_INTERNAL = 1
const KIND_CLIENT = 3

/** Status codes, from the OTLP spec. */
const STATUS_UNSET = 0
const STATUS_ERROR = 2

function attr(key: string, value: string | number | boolean | undefined): OtlpAttribute | null {
  if (value === undefined) return null
  if (typeof value === 'boolean') return { key, value: { boolValue: value } }
  if (typeof value === 'number') return { key, value: { intValue: String(Math.round(value)) } }
  return { key, value: { stringValue: value } }
}

function attrs(entries: Record<string, string | number | boolean | undefined>): OtlpAttribute[] {
  return Object.entries(entries)
    .map(([k, v]) => attr(k, v))
    .filter((a): a is OtlpAttribute => a !== null)
}

/** Milliseconds to the nanosecond strings OTLP expects. */
function nanos(ms: number): string {
  return `${Math.round(ms)}000000`
}

/**
 * Derive stable ids from the run.
 *
 * Deterministic rather than random, so re-exporting the same trajectory lands on the same trace
 * instead of creating a duplicate every time. Ids must be hex of the right length — 32 for a
 * trace, 16 for a span — and a hash gives that for free.
 */
function traceIdFor(runId: string): string {
  return createHash('sha256').update(`contextmux:trace:${runId}`).digest('hex').slice(0, 32)
}

function spanIdFor(runId: string, seq: number | 'root'): string {
  return createHash('sha256').update(`contextmux:span:${runId}:${seq}`).digest('hex').slice(0, 16)
}

/**
 * Map a step to a span name.
 *
 * Tool calls follow the GenAI convention (`execute_tool {name}`) so a backend that knows it
 * groups them correctly. Everything else uses a plain name rather than inventing a convention
 * that does not exist.
 */
function spanName(step: Step): string {
  if (step.kind === 'tool') return `execute_tool ${step.name}`
  return `${step.kind} ${step.name}`
}

function stepAttributes(trajectory: Trajectory, step: Step): OtlpAttribute[] {
  const base: Record<string, string | number | boolean | undefined> = {
    // Ours, because the conventions have no equivalent.
    'contextmux.step.kind': step.kind,
    'contextmux.step.seq': step.seq,
    'contextmux.step.summary': trajectory.describe(step),
  }

  if (step.kind === 'tool') {
    const data = step.data as { mutating?: boolean; signature?: string; ok?: boolean; error?: string } | undefined
    // Followed where they fit — a backend that understands these should see them.
    base['gen_ai.operation.name'] = 'execute_tool'
    base['gen_ai.tool.name'] = step.name
    base['gen_ai.agent.name'] = trajectory.meta.agentId
    // Ours: whether a call changes the world is the distinction every consumer here needs, and
    // the conventions do not express it.
    base['contextmux.tool.mutating'] = data?.mutating
    base['contextmux.tool.signature'] = data?.signature
    if (data?.error) base['contextmux.tool.error'] = data.error
  }

  if (step.kind === 'observation') {
    const data = step.data as { stagnantFor?: number; filesChanged?: number } | undefined
    base['contextmux.workspace.stagnant_samples'] = data?.stagnantFor
    base['contextmux.workspace.files_changed'] = data?.filesChanged
  }

  if (step.files?.length) base['contextmux.files'] = step.files.join(',')

  return attrs(base)
}

export interface ExportOptions {
  /** Collector base URL. `/v1/traces` is appended. */
  endpoint: string
  /** Extra headers, for a collector behind auth. */
  headers?: Record<string, string>
  /** `service.name` on the resource. */
  serviceName?: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

/**
 * Build the OTLP payload for a trajectory.
 *
 * One root span for the run, one child per step. Steps are points in time rather than
 * intervals, so each child ends where the next begins — which gives a readable waterfall
 * instead of a row of zero-width ticks.
 */
export function toOtlp(trajectory: Trajectory, opts: { serviceName?: string } = {}): unknown {
  const meta = trajectory.meta
  const traceId = traceIdFor(meta.runId)
  const rootId = spanIdFor(meta.runId, 'root')
  const endedAt = meta.endedAt ?? trajectory.all.at(-1)?.at ?? meta.startedAt

  const smells: Smell[] = inspect(trajectory)
  const worst = smells.find((s) => s.severity === 'block') ?? smells[0]

  const root: OtlpSpan = {
    traceId,
    spanId: rootId,
    name: `agent_run ${meta.taskId}`,
    kind: KIND_CLIENT,
    startTimeUnixNano: nanos(meta.startedAt),
    endTimeUnixNano: nanos(endedAt),
    attributes: attrs({
      'gen_ai.operation.name': 'invoke_agent',
      'gen_ai.agent.name': meta.agentId,
      'contextmux.run.id': meta.runId,
      'contextmux.task.id': meta.taskId,
      'contextmux.run.round': meta.round,
      'contextmux.trajectory.steps': trajectory.length,
      'contextmux.trajectory.dropped': trajectory.toJSON().dropped,
      'contextmux.trajectory.tool_calls': trajectory.of('tool').length,
      // The findings travel with the trace, so a backend shows why a run is interesting
      // without needing to understand how they were derived.
      'contextmux.smells': smells.map((s) => s.name).join(',') || undefined,
      'contextmux.smells.worst': worst?.severity,
    }),
    ...(worst?.severity === 'block'
      ? { status: { code: STATUS_ERROR, message: worst.detail } }
      : { status: { code: STATUS_UNSET } }),
  }

  const steps = trajectory.all
  const children: OtlpSpan[] = steps.map((step, i) => {
    const data = step.kind === 'tool' ? (step.data as { ok?: boolean; error?: string } | undefined) : undefined
    const next = steps[i + 1]
    return {
      traceId,
      spanId: spanIdFor(meta.runId, step.seq),
      parentSpanId: rootId,
      name: spanName(step),
      kind: KIND_INTERNAL,
      startTimeUnixNano: nanos(step.at),
      // Steps are instants; ending where the next begins renders as a waterfall rather than
      // a row of zero-width ticks nobody can read.
      endTimeUnixNano: nanos(next?.at ?? endedAt),
      attributes: stepAttributes(trajectory, step),
      ...(data?.ok === false
        ? { status: { code: STATUS_ERROR, message: data.error ?? 'tool call failed' } }
        : {}),
    }
  })

  return {
    resourceSpans: [
      {
        resource: {
          attributes: attrs({
            'service.name': opts.serviceName ?? 'contextmux',
            'service.version': '0.1.0',
          }),
        },
        scopeSpans: [
          {
            scope: { name: '@contextmux/trajectory', version: '0.1.0' },
            spans: [root, ...children],
          },
        ],
      },
    ],
  }
}

export interface ExportResult {
  ok: boolean
  spans: number
  detail: string
}

/**
 * Post a trajectory to an OTLP collector.
 *
 * A failure here is reported, never thrown. Telemetry that can break the run it is observing is
 * worse than no telemetry: a collector being down should not fail somebody's work.
 */
export async function exportTrajectory(
  trajectory: Trajectory,
  opts: ExportOptions,
): Promise<ExportResult> {
  const payload = toOtlp(trajectory, {
    ...(opts.serviceName ? { serviceName: opts.serviceName } : {}),
  })
  const spans = trajectory.length + 1
  const url = `${opts.endpoint.replace(/\/$/, '')}/v1/traces`
  const send = opts.fetchImpl ?? fetch

  try {
    const res = await send(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...opts.headers },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 5_000),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { ok: false, spans, detail: `collector returned ${res.status}: ${body.slice(0, 200)}` }
    }
    return { ok: true, spans, detail: `exported ${spans} span(s) to ${url}` }
  } catch (err) {
    return { ok: false, spans, detail: `could not reach ${url}: ${(err as Error).message}` }
  }
}

/** Where to export, from the environment OTel tools already set. */
export function endpointFromEnv(): string | null {
  return (
    process.env['OTEL_EXPORTER_OTLP_TRACES_ENDPOINT']?.replace(/\/v1\/traces$/, '') ??
    process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] ??
    null
  )
}

/** Headers from the environment, in the `key=value,key=value` form OTel uses. */
export function headersFromEnv(): Record<string, string> {
  const raw = process.env['OTEL_EXPORTER_OTLP_HEADERS']
  if (!raw) return {}
  const out: Record<string, string> = {}
  for (const pair of raw.split(',')) {
    const [key, ...rest] = pair.split('=')
    if (key?.trim() && rest.length) out[key.trim()] = rest.join('=').trim()
  }
  return out
}
