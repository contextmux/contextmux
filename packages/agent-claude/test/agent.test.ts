/**
 * Claude Code as a driven agent.
 *
 * Prompt assembly moved to `@contextmux/prompt`, which is shared by every agent; what is left
 * here is what is actually Claude's.
 */
import { describe, expect, it } from 'vitest'
import { ClaudeAgent } from '../src/index.js'
import { runAgentContract } from '@contextmux/core'

describe('ClaudeAgent contract', () => {
  runAgentContract(
    { it, expect: expect as never },
    {
      // A binary that does not exist, so the contract exercises the failure path without
      // spending a token. An adapter must report that cleanly rather than throwing.
      setup: () => ({ agent: new ClaudeAgent({ bin: 'definitely-not-claude-xyz' }) }),
    },
  )
})
