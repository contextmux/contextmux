import { describe, expect, it } from 'vitest'
import { TeamsNotifier } from '../src/index.js'

function response(status: number, body: string = ''): Response {
  return new Response(body, { status })
}

interface AdaptiveCardPayload {
  type: string
  attachments: Array<{ contentType: string; content: { body: unknown[] } }>
}

describe('TeamsNotifier', () => {
  it('posts an adaptive card the workflow webhook accepts', async () => {
    const calls: Array<{ url: string; body: string }> = []
    const notifier = new TeamsNotifier({
      webhookUrl: 'https://x.webhook.office.com/y',
      fetchImpl: async (url, init) => {
        calls.push({ url: String(url), body: (init as RequestInit).body as string })
        return response(202)
      },
    })

    await notifier.send({ level: 'error', title: 'Run escalated', body: 'Needs a human.', runId: 'run-T-1' })

    expect(calls).toHaveLength(1)
    expect(calls[0]!.url).toBe('https://x.webhook.office.com/y')

    const payload = JSON.parse(calls[0]!.body) as AdaptiveCardPayload
    expect(payload.type).toBe('message')
    const text = JSON.stringify(payload.attachments[0]!.content)
    expect(text).toContain('AdaptiveCard')
    expect(text).toContain('Run escalated')
    expect(text).toContain('Needs a human.')
    expect(text).toContain('run-T-1')
  })

  it('omits the run block when there is no run id', async () => {
    let sent = ''
    const notifier = new TeamsNotifier({
      webhookUrl: 'https://x',
      fetchImpl: async (_url, init) => {
        sent = (init as RequestInit).body as string
        return response(202)
      },
    })

    await notifier.send({ level: 'info', title: 't', body: 'b' })

    const payload = JSON.parse(sent) as AdaptiveCardPayload
    expect(payload.attachments[0]!.content.body).toHaveLength(2)
  })

  it('fails loudly when the webhook rejects the payload', async () => {
    const notifier = new TeamsNotifier({
      webhookUrl: 'https://x',
      fetchImpl: async () => response(400, 'invalid workflow trigger'),
    })

    await expect(notifier.send({ level: 'error', title: 't', body: 'b' })).rejects.toThrow(/400/)
  })
})
