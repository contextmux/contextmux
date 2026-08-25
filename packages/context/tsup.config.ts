import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  // Project references need `composite`, which tsup's dts build cannot consume.
  tsconfig: 'tsconfig.build.json',
})
