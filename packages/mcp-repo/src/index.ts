/**
 * ctxmux-repo — an MCP server over the repository index.
 *
 * This exists because of an asymmetry between agent archetypes. A *driven* agent (one whose
 * loop you own) can be handed a budgeted repo map directly in its prompt. A *delegated* agent
 * — Copilot's coding agent, a cloud task — runs somewhere you cannot reach at prompt-assembly
 * time, so the only way to give it repository knowledge is to expose that knowledge as tools
 * it can call.
 *
 * Same index, two delivery channels. Everything here is read-only by construction: it opens
 * no files outside the repository root and performs no writes, because an agent acting on
 * untrusted issue text should not be holding a tool that can change anything.
 */
import * as path from 'node:path'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import {
  buildIndex,
  buildMap,
  detectProfile,
  renderProfile,
  scoreFiles,
  type RepoIndex,
} from '@contextmux/repo'

const ROOT = path.resolve(process.env['CTXMUX_ROOT'] ?? process.cwd())

/**
 * The index is built once and reused. Rebuilding per call would make every tool call cost
 * a full repository scan; the cache makes a rebuild cheap, but not free.
 */
let cached: RepoIndex | null = null
let building: Promise<RepoIndex> | null = null

async function getIndex(refresh = false): Promise<RepoIndex> {
  if (refresh) {
    cached = null
    building = null
  }
  if (cached) return cached
  if (!building) {
    /*
     * Clear the in-flight promise on failure as well as on success.
     *
     * Only the success path reset it before, so a rejected build stayed parked in `building`
     * forever and every later tool call re-awaited the same rejection. One transient read
     * error — a file rewritten mid-scan — permanently bricked the server, and the only visible
     * symptom was the same stale message on every call.
     */
    building = buildIndex(ROOT).then(
      (idx) => {
        cached = idx
        building = null
        return idx
      },
      (err) => {
        building = null
        throw err
      },
    )
  }
  return building
}

function textResult(text: string) {
  return { content: [{ type: 'text' as const, text }] }
}

const server = new McpServer({ name: 'ctxmux-repo', version: '0.1.0' })

server.registerTool(
  'repo_map',
  {
    title: 'Repository map',
    description:
      'Get a token-budgeted, ranked map of the parts of this repository relevant to a task. ' +
      'Call this before writing code so you know what already exists. Ranking combines name and ' +
      'documentation matches with how recently files changed and which files historically change together.',
    inputSchema: {
      task: z
        .string()
        .describe('What you are about to do — a ticket title and body, or a task description.'),
      budget: z
        .number()
        .int()
        .positive()
        .max(20000)
        .default(4000)
        .describe('Maximum tokens the map may occupy.'),
      paths: z
        .array(z.string())
        .optional()
        .describe('Restrict to these path prefixes or glob patterns.'),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  async ({ task, budget, paths }) => {
    const index = await getIndex()
    const map = buildMap(index, { text: task, budget, ...(paths ? { paths } : {}) })
    const suffix =
      map.omitted > 0
        ? `\n\n_${map.omitted} further match(es) omitted at this budget. Increase budget or narrow with \`paths\` to see more._`
        : ''
    return textResult(map.text + suffix)
  },
)

server.registerTool(
  'find_symbol',
  {
    title: 'Find a symbol',
    description:
      'Find declarations by name across the repository. Supports * wildcards, so "use*" finds ' +
      'every hook and "*Selector" every selector. Use this to check whether something already ' +
      'exists before writing a new one.',
    inputSchema: {
      pattern: z.string().describe('Symbol name or wildcard pattern, e.g. "formatDate" or "use*".'),
      limit: z.number().int().positive().max(200).default(40),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  async ({ pattern, limit }) => {
    const index = await getIndex()
    const scored = scoreFiles(index, { symbols: [pattern], budget: 1 })

    /*
     * Count every match, show `limit` of them, and say so when those differ.
     *
     * This reported `rows.length` — the truncated count — as the number of matches, so a
     * pattern with five hundred hits answered "40 match(es)". An agent reads that as the whole
     * answer and stops looking, which is the failure `RepoMap.omitted` exists to prevent three
     * files away: truncation is never silent.
     */
    const rows: string[] = []
    let total = 0
    for (const file of scored) {
      for (const sym of file.symbols) {
        total += 1
        if (rows.length >= limit) continue
        rows.push(
          `${file.path}:${sym.line}  ${sym.kind} ${sym.name}${sym.exported ? '' : ' (not exported)'}` +
            (sym.doc ? `\n    ${sym.doc}` : ''),
        )
      }
    }
    if (total === 0) {
      return textResult(
        `No symbol matching "${pattern}". Nothing by that name exists, so writing a new one is safe — ` +
          `though consider trying a synonym before concluding that.`,
      )
    }
    const omitted =
      total > rows.length
        ? `\n\n_Showing ${rows.length} of ${total}. Raise \`limit\` or narrow the pattern to see the rest._`
        : ''
    return textResult(`${total} match(es) for "${pattern}":\n\n${rows.join('\n')}${omitted}`)
  },
)

server.registerTool(
  'find_similar',
  {
    title: 'Find similar existing code',
    description:
      'Describe something you are about to write. Returns existing code that does something ' +
      'similar, so you can extend it instead of adding a parallel implementation. Duplicated ' +
      'logic is the most common defect in generated code — call this first.',
    inputSchema: {
      description: z
        .string()
        .describe('What the thing you want to write does, in a sentence or two.'),
      limit: z.number().int().positive().max(50).default(12),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  async ({ description, limit }) => {
    const index = await getIndex()
    const all = scoreFiles(index, { text: description, budget: 1 })
    if (all.length === 0) {
      return textResult('Nothing similar found in the repository.')
    }
    const scored = all.slice(0, limit)
    const rows = scored.map((f) => {
      const syms = f.symbols.slice(0, 5).map((s) => `${s.kind} ${s.name}`).join(', ')
      return `${f.path}\n    ${syms}${f.reasons.length ? `\n    (${f.reasons.join(', ')})` : ''}`
    })
    // Same reasoning as `find_symbol`: a truncated list that does not say so reads as the
    // whole answer.
    const omitted =
      all.length > scored.length
        ? `\n\n_Showing ${scored.length} of ${all.length}. Raise \`limit\` to see the rest._`
        : ''
    return textResult(
      `Existing code that may already do this — read these before writing anything new:\n\n${rows.join('\n\n')}${omitted}`,
    )
  },
)

server.registerTool(
  'where_is',
  {
    title: 'Locate a concept',
    description:
      'Find where a concept lives in this repository — which directories and files own it. ' +
      'Use when you know what you need to change but not where it is.',
    inputSchema: {
      concept: z.string().describe('A concept, feature or domain term.'),
      limit: z.number().int().positive().max(50).default(10),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  async ({ concept, limit }) => {
    const index = await getIndex()
    const scored = scoreFiles(index, { text: concept, budget: 1 })
    if (scored.length === 0) return textResult(`Nothing found for "${concept}".`)

    const dirs = new Map<string, { count: number; score: number }>()
    for (const f of scored) {
      const d = path.dirname(f.path)
      const cur = dirs.get(d) ?? { count: 0, score: 0 }
      cur.count++
      cur.score += f.score
      dirs.set(d, cur)
    }
    const sortedDirs = [...dirs].sort((a, b) => b[1].score - a[1].score)
    const ranked = sortedDirs
      .slice(0, limit)
      .map(([d, v]) => `${d}/  (${v.count} relevant file${v.count === 1 ? '' : 's'})`)

    const topFiles = scored.slice(0, 5).map((f) => `  ${f.path}`)
    const omitted =
      sortedDirs.length > ranked.length
        ? `\n\n_${sortedDirs.length - ranked.length} further director${sortedDirs.length - ranked.length === 1 ? 'y' : 'ies'} omitted at this limit._`
        : ''
    return textResult(
      `"${concept}" lives mainly in:\n\n${ranked.join('\n')}\n\nMost relevant files:\n${topFiles.join('\n')}${omitted}`,
    )
  },
)

server.registerTool(
  'project_profile',
  {
    title: 'Project toolchain',
    description:
      'The detected toolchain: package manager, Node version, workspaces, frameworks, and the ' +
      'exact commands to run to verify a change. Call this before running any install, test or ' +
      'build command so you use the right tool for this repository.',
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  async () => {
    const profile = await detectProfile(ROOT)
    const notes = profile.notes.length ? `\n\nCaveats:\n${profile.notes.map((n) => `- ${n}`).join('\n')}` : ''
    return textResult(renderProfile(profile) + notes)
  },
)

server.registerTool(
  'refresh_index',
  {
    title: 'Refresh the index',
    description:
      'Rebuild the repository index. Call this only after creating or renaming files, since the ' +
      'index is otherwise built once and reused.',
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  async () => {
    const index = await getIndex(true)
    const partial = index.truncated
      ? ' The file ceiling was reached, so this index covers only part of the repository — treat ' +
        '"nothing found" as "nothing found in what was indexed".'
      : ''
    return textResult(`Reindexed ${index.files.length} file(s) (${index.skipped} skipped).${partial}`)
  },
)

const transport = new StdioServerTransport()
await server.connect(transport)
// stderr only: stdout is the MCP transport and any stray write corrupts the protocol stream.
process.stderr.write(`ctxmux-repo listening (root: ${ROOT})\n`)
