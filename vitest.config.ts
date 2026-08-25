import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = path.dirname(fileURLToPath(import.meta.url))

/**
 * Resolve workspace packages to their sources.
 *
 * Without this, cross-package imports resolve through `dist`, so `pnpm test` fails on a clean
 * checkout and depends on a build having already happened — which is exactly the order CI
 * does not use. Aliasing to source also means a change is tested without rebuilding first.
 */
const PACKAGES = [
  'core', 'trajectory', 'context', 'repo', 'forge-github', 'runner-local', 'agent-cli', 'tracker-file', 'tracker-github', 'tracker-jira', 'agent-claude', 'agent-copilot', 'agent-cursor', 'agent-codex', 'agent-local', 'eval', 'learn', 'handoff', 'mcp-repo', 'cli',
]

export default defineConfig({
  resolve: {
    alias: Object.fromEntries(
      PACKAGES.map((p) => [`@contextmux/${p}`, path.join(root, 'packages', p, 'src', 'index.ts')]),
    ),
  },
  test: {
    include: ['packages/*/test/**/*.test.ts'],
    environment: 'node',
    reporters: 'default',
  },
})
