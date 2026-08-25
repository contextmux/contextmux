/**
 * Codex compiler.
 *
 * `AGENTS.md` is a single markdown file per directory, with nested files applying to their
 * subtree. That gives real path scoping for rules whose globs share a common directory
 * prefix, and nothing for rules whose globs are cross-cutting (`**\/*.test.ts`). We use the
 * former where we can and fall back to labelled sections otherwise — and say which happened.
 *
 * This is the lowest-fidelity target and the compiler does not pretend otherwise.
 */
import type { LoadedContext, Rule } from '../schema.js'
import { describeRepoQuery, narrow, type Compiler, type CompileResult, type FidelityNote, type OutputFile } from './types.js'

/**
 * If every glob for a rule sits under one directory, that rule can live in a nested
 * AGENTS.md and gain real scoping. Returns null when the globs are cross-cutting.
 *
 * A glob is user-supplied text that here decides *where a file gets written*, so anything
 * that does not name a location inside the repository is refused rather than normalised.
 * `/etc/**` produced `/etc/AGENTS.md` and `../../x/**` climbed out of the project — in both
 * cases `ctxmux sync` would have written outside the repository it was pointed at, silently and
 * on a routine command.
 */
export function commonDirectory(globs: string[]): string | null {
  if (globs.length === 0) return null

  const dirs = globs.map((g) => {
    // Take the leading literal path segments, stopping at the first wildcard.
    const segs = g.split('/')
    const literal: string[] = []
    for (const s of segs) {
      if (s.includes('*') || s.includes('?') || s.includes('{')) break
      literal.push(s)
    }
    return literal.join('/')
  })

  if (dirs.some((d) => d === '')) return null
  if (dirs.some((d) => !isInsideRepo(d))) return null

  const first = dirs[0]!
  return dirs.every((d) => d === first) ? first : null
}

/** Whether a directory fragment names somewhere inside the repository, and nowhere else. */
function isInsideRepo(dir: string): boolean {
  if (dir.startsWith('/') || /^[A-Za-z]:/.test(dir)) return false
  // Split on both separators: a Windows-style glob would otherwise hide `..` inside a segment.
  return !dir.split(/[/\\]/).includes('..')
}

export const codexCompiler: Compiler = {
  target: 'codex',
  displayName: 'Codex',
  compile(ctx: LoadedContext): CompileResult {
    const m = narrow(ctx.model, 'codex')
    const files: OutputFile[] = []
    const fidelity: FidelityNote[] = []

    const nested = new Map<string, Rule[]>()
    const rootRules: Rule[] = []
    for (const rule of m.rules) {
      const dir = rule.alwaysApply ? null : commonDirectory(rule.globs)
      if (dir) {
        const list = nested.get(dir) ?? []
        list.push(rule)
        nested.set(dir, list)
      } else {
        rootRules.push(rule)
      }
    }

    // --- root AGENTS.md ---------------------------------------------------
    const sections: string[] = []
    if (m.instructions) sections.push(m.instructions.body.trim())

    for (const rule of rootRules.sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name))) {
      const scope = rule.globs.length
        ? `Applies to: ${rule.globs.map((g) => `\`${g}\``).join(', ')}`
        : 'Applies repo-wide.'
      sections.push([`## ${rule.description ?? rule.name}`, '', `_${scope}_`, '', rule.body.trim()].join('\n'))
    }

    // Skills inline as a catalogue. Codex has no activation mechanism, so the description is
    // written as an explicit "when to use" line and the agent has to notice it.
    for (const skill of m.skills) {
      const repoHint = skill.repoQuery ? describeRepoQuery(skill.repoQuery) : ''
      const scope = skill.globs.length
        ? `\n\n_Relevant paths: ${skill.globs.map((g) => `\`${g}\``).join(', ')}_`
        : ''
      const credit = skill.provenance?.['source']
        ? `\n\n_From ${skill.provenance['source']}${skill.provenance['license'] ? ` (${skill.provenance['license']})` : ''}._`
        : ''
      sections.push(
        [
          `## Skill: ${skill.name}`,
          '',
          `_Use this when: ${skill.description}_${scope}`,
          '',
          skill.body.trim(),
          ...(repoHint ? ['', repoHint] : []),
        ].join('\n') + credit,
      )
    }

    for (const cmd of m.commands) {
      sections.push([`## Command: ${cmd.name}`, '', `_${cmd.description}_`, '', cmd.body.trim()].join('\n'))
    }

    for (const agent of m.agents) {
      sections.push(
        [`## Role: ${agent.name}`, '', `_${agent.description}_`, '', agent.body.trim()].join('\n'),
      )
    }

    if (sections.length > 0) {
      files.push({ path: 'AGENTS.md', content: sections.join('\n\n') + '\n', ownership: 'block' })
    }

    // --- nested AGENTS.md per scoped directory ----------------------------
    for (const [dir, rules] of [...nested].sort(([a], [b]) => a.localeCompare(b))) {
      const body = rules
        .sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name))
        .map((r) => [`## ${r.description ?? r.name}`, '', r.body.trim()].join('\n'))
        .join('\n\n')
      files.push({
        path: `${dir}/AGENTS.md`,
        content: `${body}\n`,
        ownership: 'block',
      })
    }

    fidelity.push({ nodeType: 'instructions', fidelity: 'native', count: m.instructions ? 1 : 0 })
    fidelity.push({
      nodeType: 'rules',
      fidelity: rootRules.some((r) => r.globs.length > 0) ? 'degraded' : 'native',
      count: m.rules.length,
      ...(rootRules.some((r) => r.globs.length > 0)
        ? {
            as: `${nested.size} nested AGENTS.md file(s) for directory-scoped rules; ${rootRules.filter((r) => r.globs.length).length} cross-cutting rule(s) inlined in the root file`,
            lost: 'cross-cutting globs (patterns not under a single directory) become advisory text',
          }
        : {}),
    })
    if (m.skills.length > 0) {
      fidelity.push({
        nodeType: 'skills',
        fidelity: 'degraded',
        count: m.skills.length,
        as: 'sections in AGENTS.md',
        lost: 'no activation mechanism and no progressive disclosure — every skill body is always in context, which spends tokens on skills that are not relevant',
      })
    } else {
      fidelity.push({ nodeType: 'skills', fidelity: 'native', count: 0 })
    }
    if (m.agents.length > 0) {
      fidelity.push({
        nodeType: 'agents',
        fidelity: 'degraded',
        count: m.agents.length,
        as: 'role sections in AGENTS.md',
        lost: 'no subagent mechanism — roles cannot be dispatched to, and tool/model constraints are not enforced',
      })
    } else {
      fidelity.push({ nodeType: 'agents', fidelity: 'native', count: 0 })
    }
    fidelity.push({
      nodeType: 'commands',
      fidelity: m.commands.length > 0 ? 'degraded' : 'native',
      count: m.commands.length,
      ...(m.commands.length > 0
        ? { as: 'sections in AGENTS.md', lost: 'commands cannot be invoked by name' }
        : {}),
    })

    // --- mcp: user-level config, not repo-level ---------------------------
    if (m.mcp.length > 0) {
      const toml = m.mcp
        .map((s) => {
          const lines = [`[mcp_servers.${s.name}]`]
          if (s.transport === 'stdio') {
            lines.push(`command = ${JSON.stringify(s.command ?? '')}`)
            if (s.args.length) lines.push(`args = ${JSON.stringify(s.args)}`)
            if (Object.keys(s.env).length) {
              lines.push(
                `env = { ${Object.entries(s.env)
                  .map(([k, v]) => `${k} = ${JSON.stringify(v)}`)
                  .join(', ')} }`,
              )
            }
          } else {
            lines.push(`url = ${JSON.stringify(s.url ?? '')}`)
          }
          return lines.join('\n')
        })
        .join('\n\n')
      files.push({
        path: '.ctxmux/out/codex-config.toml',
        content: [
          '# Codex MCP configuration.',
          '# Codex reads MCP servers from ~/.codex/config.toml, which is user-level rather than',
          '# repository-level. Append the block below to that file — it cannot be applied from',
          '# inside the repository.',
          '',
          toml,
          '',
        ].join('\n'),
        ownership: 'full',
      })
    }
    fidelity.push({
      nodeType: 'mcp',
      fidelity: m.mcp.length > 0 ? 'degraded' : 'native',
      count: m.mcp.length,
      ...(m.mcp.length > 0
        ? {
            as: '.ctxmux/out/codex-config.toml (snippet)',
            lost: 'Codex MCP config is user-level (~/.codex/config.toml) — the snippet must be appended manually',
          }
        : {}),
    })

    return { target: 'codex', files, fidelity }
  },
}
