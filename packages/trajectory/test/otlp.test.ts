/**
 * OTLP export.
 *
 * The structural assertions are checked against the canonical example from
 * open-telemetry/opentelemetry-proto, because guessing at a wire format is how an exporter ends
 * up producing something no collector accepts.
 */
import { describe, expect, it } from 'vitest'
import {
  endpointFromEnv,
  exportTrajectory,
  headersFromEnv,
  toOtlp,
  Trajectory,
  type TrajectoryMeta,
} from '../src/index.js'

const meta = (): TrajectoryMeta => ({
  runId: 'run-T-1',
  taskId: 'T-1',
  agentId: 'claude-code',
  round: 0,
  startedAt: 1_700_000_000_000,
  workspaceRoot: '/tmp/wt',
})

function sample(): Trajectory {
  const t = new Trajectory(meta())
  t.dispatch('claude-code invoked')
  t.tool('Read', { file_path: '/tmp/wt/src/a.ts' }, { files: ['src/a.ts'], id: 'x' })
  t.resolveTool('x', true)
  t.tool('Bash', { command: 'pnpm test' }, { ok: false, error: 'exit 1', id: 'y' })
  t.resolveTool('y', false, 'exit 1')
  t.observe(['src/a.ts'], 'diff')
  t.result('succeeded', 'done', ['src/a.ts'])
  return t
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const payload = () => toOtlp(sample()) as any

describe('wire format', () => {
  it('matches the canonical envelope', () => {
    const p = payload()
    expect(Array.isArray(p.resourceSpans)).toBe(true)
    expect(Array.isArray(p.resourceSpans[0].resource.attributes)).toBe(true)
    expect(Array.isArray(p.resourceSpans[0].scopeSpans)).toBe(true)
    expect(p.resourceSpans[0].scopeSpans[0].scope.name).toBe('@contextmux/trajectory')
    expect(Array.isArray(p.resourceSpans[0].scopeSpans[0].spans)).toBe(true)
  })

  it('encodes ids as hex of the lengths the spec requires', () => {
    // 16 bytes for a trace, 8 for a span, hex-encoded.
    for (const span of payload().resourceSpans[0].scopeSpans[0].spans) {
      expect(span.traceId).toMatch(/^[0-9a-f]{32}$/)
      expect(span.spanId).toMatch(/^[0-9a-f]{16}$/)
      if (span.parentSpanId) expect(span.parentSpanId).toMatch(/^[0-9a-f]{16}$/)
    }
  })

  it('encodes timestamps as nanosecond strings', () => {
    for (const span of payload().resourceSpans[0].scopeSpans[0].spans) {
      expect(typeof span.startTimeUnixNano).toBe('string')
      expect(span.startTimeUnixNano).toMatch(/^\d+$/)
      expect(Number(span.endTimeUnixNano)).toBeGreaterThanOrEqual(Number(span.startTimeUnixNano))
    }
  })

  it('encodes attribute values as typed objects', () => {
    const [root] = payload().resourceSpans[0].scopeSpans[0].spans
    for (const a of root.attributes) {
      expect(typeof a.key).toBe('string')
      const keys = Object.keys(a.value)
      expect(keys).toHaveLength(1)
      expect(['stringValue', 'intValue', 'boolValue']).toContain(keys[0])
    }
  })

  it('serialises to JSON without losing anything', () => {
    expect(() => JSON.parse(JSON.stringify(payload()))).not.toThrow()
  })
})

describe('span structure', () => {
  it('parents every step under one run span', () => {
    const spans = payload().resourceSpans[0].scopeSpans[0].spans
    const [root, ...children] = spans
    expect(root.parentSpanId).toBeUndefined()
    expect(children.every((s: any) => s.parentSpanId === root.spanId)).toBe(true)
  })

  it('gives ids that are stable across exports', () => {
    // Deterministic rather than random, so re-exporting lands on the same trace instead of
    // creating a duplicate every time.
    const a = payload().resourceSpans[0].scopeSpans[0].spans[0]
    const b = payload().resourceSpans[0].scopeSpans[0].spans[0]
    expect(a.spanId).toBe(b.spanId)
    expect(a.traceId).toBe(b.traceId)
  })

  it('renders steps as a waterfall rather than zero-width ticks', () => {
    // Steps are instants; each ends where the next begins so a backend shows something legible.
    const [, first, second] = payload().resourceSpans[0].scopeSpans[0].spans
    expect(first.endTimeUnixNano).toBe(second.startTimeUnixNano)
  })

  it('names tool spans the way the conventions say to', () => {
    const spans = payload().resourceSpans[0].scopeSpans[0].spans
    expect(spans.some((s: any) => s.name === 'execute_tool Read')).toBe(true)
  })

  it('marks a failed tool call as an error', () => {
    const failed = payload()
      .resourceSpans[0].scopeSpans[0].spans.find((s: any) => s.name === 'execute_tool Bash')
    expect(failed.status.code).toBe(2)
    expect(failed.status.message).toContain('exit 1')
  })
})

describe('attributes', () => {
  const find = (span: any, key: string) =>
    span.attributes.find((a: any) => a.key === key)?.value

  it('uses the standard names where they fit', () => {
    const tool = payload()
      .resourceSpans[0].scopeSpans[0].spans.find((s: any) => s.name === 'execute_tool Read')
    expect(find(tool, 'gen_ai.operation.name')).toEqual({ stringValue: 'execute_tool' })
    expect(find(tool, 'gen_ai.tool.name')).toEqual({ stringValue: 'Read' })
    expect(find(tool, 'gen_ai.agent.name')).toEqual({ stringValue: 'claude-code' })
  })

  it('namespaces what has no standard equivalent, rather than borrowing a name that means something else', () => {
    // The conventions have no notion of a mutating call, a stall, or an intervention.
    const tool = payload()
      .resourceSpans[0].scopeSpans[0].spans.find((s: any) => s.name === 'execute_tool Read')
    expect(find(tool, 'contextmux.tool.mutating')).toEqual({ boolValue: false })
    expect(find(tool, 'contextmux.step.seq')).toBeTruthy()
  })

  it('relativises paths, as the trace command does', () => {
    const tool = payload()
      .resourceSpans[0].scopeSpans[0].spans.find((s: any) => s.name === 'execute_tool Read')
    expect(find(tool, 'contextmux.step.summary')).toEqual({ stringValue: 'src/a.ts' })
  })

  it('carries the findings, so a backend shows why a run is interesting', () => {
    const t = new Trajectory(meta())
    for (let i = 0; i < 3; i++) t.tool('Bash', { command: 'x' }, { ok: false, error: 'no' })
    t.tool('Bash', { command: 'pnpm migrate:deploy' })

    const [root] = (toOtlp(t) as any).resourceSpans[0].scopeSpans[0].spans
    expect(find(root, 'contextmux.smells')).toBeTruthy()
    expect(find(root, 'contextmux.smells.worst')).toEqual({ stringValue: 'block' })
    expect(root.status.code).toBe(2)
  })

  it('sets service.name on the resource', () => {
    const res = payload().resourceSpans[0].resource
    expect(res.attributes.find((a: any) => a.key === 'service.name').value).toEqual({
      stringValue: 'contextmux',
    })
  })
})

describe('sending', () => {
  it('posts to /v1/traces with a JSON content type', async () => {
    let seen: { url: string; init: RequestInit } | null = null
    const result = await exportTrajectory(sample(), {
      endpoint: 'http://collector.test:4318',
      fetchImpl: async (url, init) => {
        seen = { url: String(url), init: init as RequestInit }
        return new Response('{}', { status: 200 })
      },
    })

    expect(result.ok).toBe(true)
    expect(seen!.url).toBe('http://collector.test:4318/v1/traces')
    expect((seen!.init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
  })

  it('tolerates a trailing slash on the endpoint', async () => {
    let url = ''
    await exportTrajectory(sample(), {
      endpoint: 'http://collector.test:4318/',
      fetchImpl: async (u) => {
        url = String(u)
        return new Response('{}', { status: 200 })
      },
    })
    expect(url).toBe('http://collector.test:4318/v1/traces')
  })

  it('reports a collector failure rather than throwing', async () => {
    // Telemetry that can break the run it is observing is worse than no telemetry.
    const result = await exportTrajectory(sample(), {
      endpoint: 'http://collector.test:4318',
      fetchImpl: async () => new Response('bad request', { status: 400 }),
    })
    expect(result.ok).toBe(false)
    expect(result.detail).toContain('400')
  })

  it('reports an unreachable collector rather than throwing', async () => {
    const result = await exportTrajectory(sample(), {
      endpoint: 'http://collector.test:4318',
      fetchImpl: async () => {
        throw new Error('ECONNREFUSED')
      },
    })
    expect(result.ok).toBe(false)
    expect(result.detail).toContain('could not reach')
  })
})

describe('configuration from the environment', () => {
  it('reads the variables OTel tools already set', () => {
    const before = process.env['OTEL_EXPORTER_OTLP_ENDPOINT']
    process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] = 'http://localhost:4318'
    expect(endpointFromEnv()).toBe('http://localhost:4318')
    if (before === undefined) delete process.env['OTEL_EXPORTER_OTLP_ENDPOINT']
    else process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] = before
  })

  it('strips a /v1/traces suffix, since both forms are in the wild', () => {
    const before = process.env['OTEL_EXPORTER_OTLP_TRACES_ENDPOINT']
    process.env['OTEL_EXPORTER_OTLP_TRACES_ENDPOINT'] = 'http://localhost:4318/v1/traces'
    expect(endpointFromEnv()).toBe('http://localhost:4318')
    if (before === undefined) delete process.env['OTEL_EXPORTER_OTLP_TRACES_ENDPOINT']
    else process.env['OTEL_EXPORTER_OTLP_TRACES_ENDPOINT'] = before
  })

  it('parses headers in the form OTel uses', () => {
    const before = process.env['OTEL_EXPORTER_OTLP_HEADERS']
    process.env['OTEL_EXPORTER_OTLP_HEADERS'] = 'api-key=secret,x-scope=team'
    expect(headersFromEnv()).toEqual({ 'api-key': 'secret', 'x-scope': 'team' })
    if (before === undefined) delete process.env['OTEL_EXPORTER_OTLP_HEADERS']
    else process.env['OTEL_EXPORTER_OTLP_HEADERS'] = before
  })

  it('returns nothing when nothing is configured', () => {
    const saved = {
      a: process.env['OTEL_EXPORTER_OTLP_ENDPOINT'],
      b: process.env['OTEL_EXPORTER_OTLP_TRACES_ENDPOINT'],
    }
    delete process.env['OTEL_EXPORTER_OTLP_ENDPOINT']
    delete process.env['OTEL_EXPORTER_OTLP_TRACES_ENDPOINT']
    expect(endpointFromEnv()).toBeNull()
    if (saved.a) process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] = saved.a
    if (saved.b) process.env['OTEL_EXPORTER_OTLP_TRACES_ENDPOINT'] = saved.b
  })
})
