import { readFileSync } from 'node:fs'
import { defineConfig } from 'tsup'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string
}

export default defineConfig({
  entry: ['src/index.ts'],
  // One source of truth for the version, shared with scripts/bundle.mjs.
  define: { __CTXMUX_VERSION__: JSON.stringify(version) },
  format: ['esm'],
  dts: true,
  clean: true,
  tsconfig: 'tsconfig.build.json',
  banner: { js: '#!/usr/bin/env node' },
})
