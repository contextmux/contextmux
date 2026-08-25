/**
 * Claude Code compiler.
 *
 * The highest-fidelity target: skills, subagents and commands all have native homes, so this
 * is effectively a serialisation of the canonical model rather than a translation. When a
 * node type degrades here, it usually means the canonical model has drifted ahead of what
 * any target supports — which is a design smell worth noticing.
 */
import { serializeFrontmatter } from '../frontmatter.js'
import type { LoadedContext } from '../schema.js'
import { describeRepoQuery, narrow, type Compiler, type CompileResult, type FidelityNote, type OutputFile } from './types.js'

export const claudeCompiler: Compiler = {
  target: 'claude',
  displayName: 'Claude Code',
  compile(ctx: LoadedContext): CompileResult {
    const m = narrow(ctx.model, 'claude')
    const files: OutputFile[] = []
    const fidelity: FidelityNote[] = []

    // --- CLAUDE.md: instructions + repo-wide rules ------------------------
    // Glob-scoped rules have no native per-path mechanism here, so they are emitted as
    // labelled sections. Claude reads the whole file, so nothing is lost but the scoping
    // becomes advisory rather than enforced.
    const sections: string[] = []
    if (m.instructions) sections.push(m.instructions.body.trim())

    const sorted = [...m.rules].sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name))
    for (const rule of sorted) {
      const scope = rule.alwaysApply
        ? 'Always applies.'
        : rule.globs.length
          ? `Applies to: ${rule.globs.map((g) => `\`${g}\``).join(', ')}`
          : 'Applies repo-wide.'
      sections.push(
        [`## ${rule.description ?? rule.name}`, '', `_${scope}_`, '', rule.body.trim()].join('\n'),
      )
    }

    if (sections.length > 0) {
      files.push({
        path: 'CLAUDE.md',
        content: sections.join('\n\n') + '\n',
        ownership: 'block',
      })
    }

    fidelity.push({
      nodeType: 'instructions',
      fidelity: 'native',
      count: m.instructions ? 1 : 0,
    })
    fidelity.push({
      nodeType: 'rules',
      fidelity: m.rules.some((r) => r.globs.length > 0) ? 'degraded' : 'native',
      count: m.rules.length,
      ...(m.rules.some((r) => r.globs.length > 0)
        ? {
            as: 'labelled sections in CLAUDE.md',
            lost: 'path scoping is advisory — Claude Code loads CLAUDE.md in full rather than per-path',
          }
        : {}),
    })

    // --- skills: native ---------------------------------------------------
    for (const skill of m.skills) {
      const repoHint = skill.repoQuery ? describeRepoQuery(skill.repoQuery) : ''
      const body = [skill.body.trim(), repoHint].filter(Boolean).join('\n\n')
      files.push({
        path: `.claude/skills/${skill.name}/SKILL.md`,
        content: serializeFrontmatter(
          {
            name: skill.name,
            description: skill.description,
            ...(skill.tools?.length ? { 'allowed-tools': skill.tools } : {}),
            // Third-party content stays attributed wherever it is compiled to. A reader of the
            // generated file should not have to trace it back to find out whose rules these are.
            ...(skill.provenance?.['source'] ? { 'x-source': skill.provenance['source'] } : {}),
            ...(skill.provenance?.['license'] ? { 'x-license': skill.provenance['license'] } : {}),
          },
          body,
        ),
        ownership: 'full',
      })
    }
    fidelity.push({ nodeType: 'skills', fidelity: 'native', count: m.skills.length })

    // --- agents: native ---------------------------------------------------
    for (const agent of m.agents) {
      files.push({
        path: `.claude/agents/${agent.name}.md`,
        content: serializeFrontmatter(
          {
            name: agent.name,
            description: agent.description,
            ...(agent.tools?.length ? { tools: agent.tools.join(', ') } : {}),
            ...(agent.model ? { model: agent.model } : {}),
          },
          agent.body,
        ),
        ownership: 'full',
      })
    }
    fidelity.push({ nodeType: 'agents', fidelity: 'native', count: m.agents.length })

    // --- commands: native -------------------------------------------------
    for (const cmd of m.commands) {
      files.push({
        path: `.claude/commands/${cmd.name}.md`,
        content: serializeFrontmatter({ description: cmd.description }, cmd.body),
        ownership: 'full',
      })
    }
    fidelity.push({ nodeType: 'commands', fidelity: 'native', count: m.commands.length })

    // --- mcp: native ------------------------------------------------------
    if (m.mcp.length > 0) {
      const servers: Record<string, unknown> = {}
      for (const s of m.mcp) {
        servers[s.name] =
          s.transport === 'stdio'
            ? {
                command: s.command,
                ...(s.args.length ? { args: s.args } : {}),
                ...(Object.keys(s.env).length ? { env: s.env } : {}),
              }
            : { type: s.transport, url: s.url }
      }
      files.push({
        path: '.mcp.json',
        content: JSON.stringify({ mcpServers: servers }, null, 2) + '\n',
        ownership: 'full',
        noProvenance: true,
      })
    }
    fidelity.push({ nodeType: 'mcp', fidelity: 'native', count: m.mcp.length })

    return { target: 'claude', files, fidelity }
  },
}
