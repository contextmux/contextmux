import { describe, expect, it } from 'vitest'
import { runAgentContract } from '@contextmux/core'
import { AIDER_SPEC, LocalAgent, OPENCODE_SPEC } from '../src/index.js'

const invoke = (spec = AIDER_SPEC, over = {}) =>
  spec.invoke({ prompt: 'do the thing', systemPrompt: 'sys', isolated: true, ...over }).args

describe('the free path', () => {
  it('claims no budget, because a local model has no per-token cost to cap', () => {
    expect(AIDER_SPEC.capabilities.budgetable).toBe(false)
    expect(OPENCODE_SPEC.capabilities.budgetable).toBe(false)
  })

  it('declares itself unverified like the other adapters written from documentation', () => {
    expect(AIDER_SPEC.confidence).toBe('unverified')
  })

  it('defaults to a model served locally', () => {
    const agent = new LocalAgent()
    expect(agent.spec.id).toBe('local-aider')
  })
})

describe('invocation', () => {
  it('runs unattended and leaves the change in the working tree', () => {
    // contextmux's runner reads the diff from the tree, so a harness that commits on its own
    // turns one reviewable change into a series of commits nobody asked for.
    const args = invoke()
    expect(args).toContain('--yes-always')
    expect(args).toContain('--no-auto-commits')
  })

  it('will not edit an unisolated checkout', () => {
    // Without a worktree the agent is in the developer's own files.
    expect(invoke(AIDER_SPEC, { isolated: false })).toContain('--dry-run')
    expect(invoke(AIDER_SPEC, { isolated: true })).not.toContain('--dry-run')
  })

  it('avoids the pretty renderer, whose control codes parse badly', () => {
    expect(invoke()).toContain('--no-pretty')
  })

  it('supports opencode as an alternative harness', () => {
    expect(invoke(OPENCODE_SPEC)[0]).toBe('run')
  })
})

describe('preflight tells you which half is missing', () => {
  it('explains that a model runner is not an agent', async () => {
    // Ollama serves tokens; it does not read or edit files. Anyone expecting it to work alone
    // gets a confusing failure without this.
    const agent = new LocalAgent({ harness: 'aider', bin: 'definitely-not-aider-xyz' })
    const health = await agent.preflight()
    expect(health.ok).toBe(false)
    expect(health.detail).toContain('does not read or edit files')
    expect(health.detail).toContain('aider')
  })

  it('reports an unreachable runner separately from a missing harness', async () => {
    // "Installed but not running" is a real and confusing state: the binary answers
    // --version, so a check that stopped at the harness would report everything fine.
    const agent = new LocalAgent({
      harness: 'aider',
      bin: 'node',
      model: 'ollama/qwen2.5-coder',
      runnerUrl: 'http://127.0.0.1:1',
    })
    const health = await agent.preflight()
    expect(health.ok).toBe(false)
    expect(health.detail).toContain('ollama serve')
  })

  it('does not check a runner for a model that is not served by one', async () => {
    const agent = new LocalAgent({ harness: 'aider', bin: 'node', model: 'openai/gpt-4' })
    const health = await agent.preflight()
    expect(health.detail).not.toContain('ollama serve')
  })
})

describe('LocalAgent contract', () => {
  runAgentContract(
    { it, expect: expect as never },
    { setup: () => ({ agent: new LocalAgent({ bin: 'definitely-not-aider-xyz' }) }) },
  )
})
