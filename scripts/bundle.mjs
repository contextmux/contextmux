/**
 * Build the single-file CLI the GitHub Action runs.
 *
 * The Action used to install contextmux from npm on every invocation. That made a workflow
 * depend on a registry being reachable, on a publish having happened, and on the published
 * version matching the ref the workflow pinned — three ways for a green pipeline to run code
 * nobody intended. Committing the bundle is how most JavaScript Actions ship for exactly this
 * reason: the code that runs is the code at the ref you pinned, and nothing is resolved at run
 * time.
 *
 * The cost is that a committed artefact can go stale. `--check` exists to make that a CI
 * failure rather than a silent one, and it is only safe because esbuild's output is
 * byte-stable for identical input.
 */
import { build } from 'esbuild'
import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const entry = path.join(root, 'packages/cli/src/index.ts')
const outfile = path.join(root, 'packages/action/dist/ctxmux.mjs')

const { version } = JSON.parse(await fs.readFile(path.join(root, 'packages/cli/package.json'), 'utf8'))

// Resolve workspace packages to their sources, not their builds.
//
// Left alone, esbuild follows each @contextmux import to that package's compiled output, which
// makes the bundle a function of whenever `pnpm build` last ran rather than of the commit. A
// stale build directory would then produce a stale bundle that `--check` happily calls
// current — the one failure this check exists to catch, arriving through the check itself.
const alias = {}
for (const entryDir of await fs.readdir(path.join(root, 'packages'), { withFileTypes: true })) {
  if (!entryDir.isDirectory()) continue
  const manifest = path.join(root, 'packages', entryDir.name, 'package.json')
  let name
  try {
    ;({ name } = JSON.parse(await fs.readFile(manifest, 'utf8')))
  } catch {
    continue
  }
  const source = path.join(root, 'packages', entryDir.name, 'src/index.ts')
  if (name?.startsWith('@contextmux/') && (await fs.stat(source).catch(() => null))) {
    alias[name] = source
  }
}

/*
 * `createRequire`, because the bundle is ESM but not everything it carries is.
 *
 * Dependencies that reach for `require` at runtime are otherwise a crash on first use, and it
 * would be a crash in the Action rather than here.
 */
const banner = [
  '#!/usr/bin/env node',
  'import { createRequire as __ctxmuxRequire } from "node:module"',
  'const require = __ctxmuxRequire(import.meta.url)',
].join('\n')

const result = await build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  alias,
  banner: { js: banner },
  // Stamped at build time from package.json, so the bundle cannot report a version that is
  // not its own.
  define: { __CTXMUX_VERSION__: JSON.stringify(version) },
  legalComments: 'none',
  logLevel: 'warning',
  write: false,
})

const built = result.outputFiles[0].text
const digest = (text) => createHash('sha256').update(text).digest('hex').slice(0, 12)

if (process.argv.includes('--check')) {
  let existing
  try {
    existing = await fs.readFile(outfile, 'utf8')
  } catch {
    console.error(`Missing ${path.relative(root, outfile)}. Run \`pnpm bundle\` and commit it.`)
    process.exit(1)
  }
  if (existing !== built) {
    console.error(
      `${path.relative(root, outfile)} is stale.\n` +
        `  committed: ${digest(existing)}\n` +
        `  from source: ${digest(built)}\n` +
        'Run `pnpm bundle` and commit the result — the Action runs the committed file, so a\n' +
        'stale bundle means workflows execute code that is not in this commit.',
    )
    process.exit(1)
  }
  console.log(`bundle is current (${digest(built)}, ${(built.length / 1024).toFixed(0)}kb)`)
  process.exit(0)
}

await fs.mkdir(path.dirname(outfile), { recursive: true })
await fs.writeFile(outfile, built, 'utf8')
await fs.chmod(outfile, 0o755)
console.log(`${path.relative(root, outfile)}  ${(built.length / 1024).toFixed(0)}kb  v${version}  ${digest(built)}`)
