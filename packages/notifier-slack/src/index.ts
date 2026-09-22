/**
 * Slack, as a `Notifier`.
 *
 * A run that escalates or fails is invisible until someone happens to run `ctxmux status` —
 * which nobody does on a schedule. An incoming webhook is the smallest thing that closes that
 * loop: no bot to install, no OAuth scopes to negotiate, one URL from Slack's own "Incoming
 * Webhooks" app, pasted into an environment variable.
 */
import type { Notifier } from '@contextmux/core'

export interface SlackNotifierOptions {
  webhookUrl: string
  fetchImpl?: typeof fetch
}

const EMOJI: Record<'info' | 'warn' | 'error', string> = {
  info: ':information_source:',
  warn: ':warning:',
  error: ':rotating_light:',
}

export class SlackNotifier implements Notifier {
  readonly id = 'slack'
  private readonly fetchImpl: typeof fetch

  constructor(private readonly opts: SlackNotifierOptions) {
    this.fetchImpl = opts.fetchImpl ?? fetch
  }

  async send(event: { level: 'info' | 'warn' | 'error'; title: string; body: string; runId?: string }): Promise<void> {
    const text = [
      `${EMOJI[event.level]} *${event.title}*`,
      event.body,
      event.runId ? `_run: ${event.runId}_` : '',
    ]
      .filter(Boolean)
      .join('\n')

    const res = await this.fetchImpl(this.opts.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })

    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 300)
      throw new Error(`Slack webhook returned ${res.status}${detail ? `: ${detail}` : ''}`)
    }
  }
}

export function slackNotifier(opts: SlackNotifierOptions): SlackNotifier {
  return new SlackNotifier(opts)
}
