/**
 * GitHub Copilot compiler.
 *
 * Copilot has the best native story for *scoped* rules — `.github/instructions/*.instructions.md`
 * carries an `applyTo:` glob that the tool actually honours — but no native skill format.
 * Skills therefore become prompt files, which are human-invoked rather than
 * description-activated: the model will not reach for them on its own.
 *
 * MCP is the sharp edge here. Copilot's coding agent reads MCP configuration from repository
 * settings rather than a tracked file, so we emit a documented, copy-pasteable block instead
 * of pretending a committed file will be picked up.
 */
import { serializeFrontmatter } from '../frontmatter.js'
import type { LoadedContext } from '../schema.js'
import { describeRepoQuery, narrow, type Compiler, type CompileResult, type FidelityNote, type OutputFile } from './types.js'

export const copilotCompiler: Compiler = {
  target: 'copilot',
  displayName: 'GitHub Copilot',
  compile(ctx: LoadedContext): CompileResult {
    const m = narrow(ctx.model, 'copilot')
    const files: OutputFile[] = []
    const fidelity: FidelityNote[] = []

    // --- repo-wide instructions -------------------------------------------
    if (m.instructions) {
      files.push({
        path: '.github/copilot-instructions.md',
        content: m.instructions.body.trim() + '\n',
        ownership: 'block',
      })
    }
    fidelity.push({ nodeType: 'instructions', fidelity: 'native', count: m.instructions ? 1 : 0 })

    // --- rules: native, with real glob scoping ----------------------------
    for (const rule of m.rules) {
      const applyTo = rule.alwaysApply || rule.globs.length === 0 ? '**' : rule.globs.join(', ')
      files.push({
        path: `.github/instructions/${rule.name}.instructions.md`,
        content: serializeFrontmatter(
          { applyTo, ...(rule.description ? { description: rule.description } : {}) },
          rule.body,
        ),
        ownership: 'full',
      })
    }
    fidelity.push({ nodeType: 'rules', fidelity: 'native', count: m.rules.length })

    // --- skills → prompt files (degraded) ---------------------------------
    for (const skill of m.skills) {
      const repoHint = skill.repoQuery ? describeRepoQuery(skill.repoQuery) : ''
      const header =
        `_Use this when: ${skill.description}_` +
        (skill.globs.length ? `\n\n_Relevant paths: ${skill.globs.map((g) => `\`${g}\``).join(', ')}_` : '')
      const body = [header, skill.body.trim(), repoHint].filter(Boolean).join('\n\n')
      files.push({
        path: `.github/prompts/${skill.name}.prompt.md`,
        content: serializeFrontmatter(
          { mode: 'agent', description: skill.description },
          body,
        ),
        ownership: 'full',
      })
    }
    if (m.skills.length > 0) {
      fidelity.push({
        nodeType: 'skills',
        fidelity: 'degraded',
        count: m.skills.length,
        as: '.github/prompts/*.prompt.md',
        lost: 'automatic description-based activation — prompt files must be invoked explicitly by a human, and bundled resources are not loaded',
      })
    } else {
      fidelity.push({ nodeType: 'skills', fidelity: 'native', count: 0 })
    }

    // --- agents -----------------------------------------------------------
    for (const agent of m.agents) {
      files.push({
        path: `.github/agents/${agent.name}.agent.md`,
        content: serializeFrontmatter(
          { name: agent.name, description: agent.description },
          agent.body,
        ),
        ownership: 'full',
      })
    }
    if (m.agents.length > 0) {
      const constrained = m.agents.filter((a) => a.tools?.length || a.model)
      fidelity.push({
        nodeType: 'agents',
        fidelity: constrained.length > 0 ? 'degraded' : 'native',
        count: m.agents.length,
        ...(constrained.length > 0
          ? {
              as: '.github/agents/*.agent.md',
              lost: 'per-agent tool allowlists and model pinning are not expressed',
            }
          : {}),
      })
    } else {
      fidelity.push({ nodeType: 'agents', fidelity: 'native', count: 0 })
    }

    // --- commands → prompt files ------------------------------------------
    for (const cmd of m.commands) {
      const argNote = cmd.args.length
        ? `\n\n_Arguments: ${cmd.args.map((a) => `\`{${a}}\``).join(', ')} — replace before running._`
        : ''
      files.push({
        path: `.github/prompts/${cmd.name}.prompt.md`,
        content: serializeFrontmatter(
          { mode: 'agent', description: cmd.description },
          cmd.body + argNote,
        ),
        ownership: 'full',
      })
    }
    fidelity.push({
      nodeType: 'commands',
      fidelity: m.commands.some((c) => c.args.length > 0) ? 'degraded' : 'native',
      count: m.commands.length,
      ...(m.commands.some((c) => c.args.length > 0)
        ? { as: '.github/prompts/*.prompt.md', lost: 'named arguments are documented but not templated' }
        : {}),
    })

    // --- mcp: not a tracked file ------------------------------------------
    if (m.mcp.length > 0) {
      const servers: Record<string, unknown> = {}
      for (const s of m.mcp) {
        servers[s.name] =
          s.transport === 'stdio'
            ? {
                type: 'local',
                command: s.command,
                ...(s.args.length ? { args: s.args } : {}),
                ...(Object.keys(s.env).length ? { env: s.env } : {}),
                tools: ['*'],
              }
            : { type: s.transport, url: s.url, tools: ['*'] }
      }
      const secretNames = [
        ...new Set(
          m.mcp.flatMap((s) => Object.values(s.env).filter((v) => /^\$\{?[A-Z0-9_]+\}?$/.test(v))),
        ),
      ]
      files.push({
        path: '.github/copilot-mcp-config.md',
        content: [
          '# Copilot coding agent — MCP configuration',
          '',
          'Copilot reads MCP configuration from **repository settings**, not from a file in the',
          'repository. This file is generated so the configuration is reviewable in version',
          'control, but it is not read by Copilot at runtime.',
          '',
          '**To apply:** Settings → Copilot → Coding agent → MCP configuration, and paste:',
          '',
          '```json',
          JSON.stringify({ mcpServers: servers }, null, 2),
          '```',
          '',
          ...(secretNames.length
            ? [
                'Secrets referenced above must exist as Actions secrets named with the',
                '`COPILOT_MCP_` prefix, which is the only prefix the coding agent can read:',
                '',
                ...secretNames.map((n) => `- \`${n}\``),
                '',
              ]
            : []),
          ...(m.mcp.some((s) => !s.readOnly)
            ? [
                '> **Warning:** one or more servers below are not marked read-only. An agent',
                '> processing untrusted issue or ticket text should not hold write-capable tools.',
                '',
              ]
            : []),
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
            as: '.github/copilot-mcp-config.md (documentation only)',
            lost: 'Copilot reads MCP config from repository settings — the generated file must be pasted in manually',
          }
        : {}),
    })

    return { target: 'copilot', files, fidelity }
  },
}
