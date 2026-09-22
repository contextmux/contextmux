import { describe, expect, it } from 'vitest'
import { SlackNotifier } from '../src/index.js'

function response(status: number, body: string = ''): Response {
  return new Response(body, { status })
}

describe('SlackNotifier', () => {
  it('posts a message the webhook accepts', async () => {
    const calls: Array<{ url: string; body: string }> = []
    const notifier = new SlackNotifier({
      webhookUrl: 'https://hooks.slack.com/services/x',
      fetchImpl: async (url, init) => {
        calls.push({ url: String(url), body: (init as RequestInit).body as string })
        return response(200)
      },
    })

    await notifier.send({ level: 'error', title: 'Run escalated', body: 'Needs a human.', runId: 'run-T-1' })

    expect(calls).toHaveLength(1)
    expect(calls[0]!.url).toBe('https://hooks.slack.com/services/x')
    const payload = JSON.parse(calls[0]!.body)
    expect(payload.text).toContain('Run escalated')
    expect(payload.text).toContain('Needs a human.')
    expect(payload.text).toContain('run-T-1')
  })

  it('marks each level distinctly', async () => {
    const texts: string[] = []
    const notifier = new SlackNotifier({
      webhookUrl: 'https://x',
      fetchImpl: async (_url, init) => {
        texts.push((JSON.parse((init as RequestInit).body as string) as { text: string }).text)
        return response(200)
      },
    })

    await notifier.send({ level: 'info', title: 't', body: 'b' })
    await notifier.send({ level: 'warn', title: 't', body: 'b' })
    await notifier.send({ level: 'error', title: 't', body: 'b' })

    // Three different messages for three different levels — otherwise an escalation and a
    // routine info notice read identically in the channel.
    expect(new Set(texts).size).toBe(3)
  })

  it('omits the run line when there is no run id', async () => {
    let sent = ''
    const notifier = new SlackNotifier({
      webhookUrl: 'https://x',
      fetchImpl: async (_url, init) => {
        sent = (init as RequestInit).body as string
        return response(200)
      },
    })

    await notifier.send({ level: 'info', title: 't', body: 'b' })

    expect(JSON.parse(sent).text).not.toContain('run:')
  })

  it('fails loudly when the webhook rejects the payload', async () => {
    const notifier = new SlackNotifier({ webhookUrl: 'https://x', fetchImpl: async () => response(404, 'no_service') })

    await expect(notifier.send({ level: 'error', title: 't', body: 'b' })).rejects.toThrow(/404/)
  })
})
