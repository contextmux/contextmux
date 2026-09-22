/**
 * Microsoft Teams, as a `Notifier`.
 *
 * Posts an Adaptive Card through a Teams Workflow webhook — the "Post to a channel when a
 * webhook request is received" workflow template, which is what Microsoft now directs people
 * toward. The older Office 365 Connector ("Incoming Webhook" app, plain `MessageCard` JSON) is
 * on a deprecation path Microsoft has already started enforcing for new connectors, so building
 * against it would be building against something already being turned off.
 */
import type { Notifier } from '@contextmux/core'

export interface TeamsNotifierOptions {
  webhookUrl: string
  fetchImpl?: typeof fetch
}

const COLOUR: Record<'info' | 'warn' | 'error', string> = {
  info: 'default',
  warn: 'warning',
  error: 'attention',
}

export class TeamsNotifier implements Notifier {
  readonly id = 'teams'
  private readonly fetchImpl: typeof fetch

  constructor(private readonly opts: TeamsNotifierOptions) {
    this.fetchImpl = opts.fetchImpl ?? fetch
  }

  async send(event: { level: 'info' | 'warn' | 'error'; title: string; body: string; runId?: string }): Promise<void> {
    const card = {
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      type: 'AdaptiveCard',
      version: '1.4',
      body: [
        { type: 'TextBlock', text: event.title, weight: 'Bolder', size: 'Medium', color: COLOUR[event.level], wrap: true },
        { type: 'TextBlock', text: event.body, wrap: true },
        ...(event.runId
          ? [{ type: 'TextBlock', text: `run: ${event.runId}`, isSubtle: true, spacing: 'Small' as const }]
          : []),
      ],
    }

    const res = await this.fetchImpl(this.opts.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'message',
        attachments: [{ contentType: 'application/vnd.microsoft.card.adaptive', content: card }],
      }),
    })

    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 300)
      throw new Error(`Teams webhook returned ${res.status}${detail ? `: ${detail}` : ''}`)
    }
  }
}

export function teamsNotifier(opts: TeamsNotifierOptions): TeamsNotifier {
  return new TeamsNotifier(opts)
}
