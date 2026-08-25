/**
 * Cursor compiler.
 *
 * Cursor's `.mdc` rule format is a good fit for canonical rules: it carries `globs` and
 * `alwaysApply`, and `description` drives agent-requested selection. That last property is
 * what lets skills degrade reasonably here — a description-activated `.mdc` is closer to a
 * skill than a static prompt file is, even though bundled resources are still lost.
 */
import { serializeFrontmatter } from '../frontmatter.js'
import type { LoadedContext } from '../schema.js'
import { describeRepoQuery, narrow, type Compiler, type CompileResult, type FidelityNote, type OutputFile } from './types.js'

/** Cursor reads `.mdc`; the frontmatter dialect differs from Copilot's. */
function mdc(
  meta: { description?: string; globs?: string[]; alwaysApply: boolean },
  body: string,
): string {
  return serializeFrontmatter(
    {
      ...(meta.description ? { description: meta.description } : {}),
      ...(meta.globs?.length ? { globs: meta.globs.join(',') } : {}),
      alwaysApply: meta.alwaysApply,
    },
    body,
  )
}

export const cursorCompiler: Compiler = {
  target: 'cursor',
  displayName: 'Cursor',
  compile(ctx: LoadedContext): CompileResult {
    const m = narrow(ctx.model, 'cursor')
    const files: OutputFile[] = []
    const fidelity: FidelityNote[] = []

    // --- instructions → an always-applied rule ----------------------------
    if (m.instructions) {
      files.push({
        path: '.cursor/rules/000-project.mdc',
        content: mdc(
          { description: 'Project-wide conventions', alwaysApply: true },
          m.instructions.body,
        ),
        ownership: 'full',
      })
    }
    fidelity.push({
      nodeType: 'instructions',
      fidelity: m.instructions ? 'degraded' : 'native',
      count: m.instructions ? 1 : 0,
      ...(m.instructions
        ? {
            as: '.cursor/rules/000-project.mdc with alwaysApply: true',
            lost: 'nothing functionally — Cursor has no single root instruction file, so this is a naming difference only',
          }
        : {}),
    })

    // --- rules: native ----------------------------------------------------
    for (const rule of m.rules) {
      // Priority becomes a filename prefix because Cursor orders rules lexically.
      const prefix = String(100 - rule.priority).padStart(3, '0')
      files.push({
        path: `.cursor/rules/${prefix}-${rule.name}.mdc`,
        content: mdc(
          {
            description: rule.description ?? rule.name,
            globs: rule.globs,
            alwaysApply: rule.alwaysApply,
          },
          rule.body,
        ),
        ownership: 'full',
      })
    }
    fidelity.push({ nodeType: 'rules', fidelity: 'native', count: m.rules.length })

    // --- skills → description-activated rules (degraded) -------------------
    for (const skill of m.skills) {
      const repoHint = skill.repoQuery ? describeRepoQuery(skill.repoQuery) : ''
      const body = [skill.body.trim(), repoHint].filter(Boolean).join('\n\n')
      files.push({
        path: `.cursor/rules/skill-${skill.name}.mdc`,
        content: mdc(
          { description: skill.description, globs: skill.globs, alwaysApply: false },
          body,
        ),
        ownership: 'full',
      })
    }
    if (m.skills.length > 0) {
      const withResources = m.skills.filter((s) => s.resources.length > 0)
      fidelity.push({
        nodeType: 'skills',
        fidelity: 'degraded',
        count: m.skills.length,
        as: '.cursor/rules/skill-*.mdc (agent-requested by description)',
        lost:
          withResources.length > 0
            ? `progressive disclosure — bundled resources in ${withResources.length} skill(s) are not loaded on demand`
            : 'progressive disclosure — the whole rule body loads at once rather than in stages',
      })
    } else {
      fidelity.push({ nodeType: 'skills', fidelity: 'native', count: 0 })
    }

    // --- agents → documented, not executable ------------------------------
    if (m.agents.length > 0) {
      const body = [
        'Canonical agent roles, compiled for reference. Cursor custom modes are configured in',
        'the application UI rather than in the repository, so these cannot be applied',
        'automatically.',
        '',
        ...m.agents.flatMap((a) => [
          `## ${a.name}`,
          '',
          a.description,
          ...(a.tools?.length ? ['', `Tools: ${a.tools.join(', ')}`] : []),
          ...(a.model ? [`Model: ${a.model}`] : []),
          '',
          a.body.trim(),
          '',
        ]),
      ].join('\n')
      files.push({ path: '.cursor/rules/agents-reference.mdc', content: mdc({ description: 'Agent role definitions (reference)', alwaysApply: false }, body), ownership: 'full' })
      fidelity.push({
        nodeType: 'agents',
        fidelity: 'degraded',
        count: m.agents.length,
        as: '.cursor/rules/agents-reference.mdc',
        lost: 'Cursor custom modes are configured in the application, not the repo — roles are reference material only',
      })
    } else {
      fidelity.push({ nodeType: 'agents', fidelity: 'native', count: 0 })
    }

    // --- commands ---------------------------------------------------------
    for (const cmd of m.commands) {
      files.push({
        path: `.cursor/commands/${cmd.name}.md`,
        content: `# ${cmd.description}\n\n${cmd.body.trim()}\n`,
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
            : { url: s.url }
      }
      files.push({
        path: '.cursor/mcp.json',
        content: JSON.stringify({ mcpServers: servers }, null, 2) + '\n',
        ownership: 'full',
        noProvenance: true,
      })
    }
    fidelity.push({ nodeType: 'mcp', fidelity: 'native', count: m.mcp.length })

    return { target: 'cursor', files, fidelity }
  },
}
