/** A typed event bus, so observability is a first-class output rather than console noise. */
import type { Effect, GateOutcome, Run, RunEvent, RunState } from './machine.js'

export type EngineEvent =
  | { type: 'run:started'; runId: string; taskId: string; title: string }
  | { type: 'run:state'; runId: string; from: RunState; to: RunState; via: RunEvent['type'] }
  | { type: 'run:effect'; runId: string; effect: Effect['type']; detail?: string }
  | { type: 'gate:result'; runId: string; phase: 'preflight' | 'verify'; outcome: GateOutcome }
  | { type: 'agent:dispatched'; runId: string; agentId: string; round: number }
  | { type: 'agent:progress'; runId: string; message: string }
  | { type: 'agent:finished'; runId: string; status: string; filesChanged: number }
  | { type: 'run:finished'; runId: string; state: RunState; reason?: string }
  | { type: 'log'; level: 'debug' | 'info' | 'warn' | 'error'; message: string }

export type EventListener = (event: EngineEvent) => void

export class EventBus {
  private readonly listeners: EventListener[] = []

  on(listener: EventListener): () => void {
    this.listeners.push(listener)
    return () => {
      const i = this.listeners.indexOf(listener)
      if (i >= 0) this.listeners.splice(i, 1)
    }
  }

  emit(event: EngineEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch {
        // A broken listener must never take down a run.
      }
    }
  }
}

export function describeRun(run: Run): string {
  return `${run.id} [${run.state}] attempt=${run.attempt} round=${run.feedbackRound}`
}
