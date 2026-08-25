import { promises as fs } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  applyInstall,
  installedPacks,
  isEnvReference,
  literalEnvKeys,
  loadContext,
  PACK_FIELD,
  planInstall,
  readPack,
  renderPackSkill,
  sync,
} from '../src/index.js'


/** Lay a pack out on disk, so `readPack` sees a real directory tree. */
async function packOnDisk(files: Record<string, string>): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ctxmux-packsrc-'))
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(root, rel)
    await fs.mkdir(path.dirname(abs), { recursive: true })
    await fs.writeFile(abs, content, 'utf8')
  }
  return root
}

let dir: string
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ctxmux-pack-'))
})
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true })
})

async function write(rel: string, content: string): Promise<void> {
  const abs = path.join(dir, rel)
  await fs.mkdir(path.dirname(abs), { recursive: true })
  await fs.writeFile(abs, content, 'utf8')
}

/** A pack laid out the way ponytail is. */
async function makePack(root: string): Promise<void> {
  await write(`${root}/skills/be-lazy/SKILL.md`, [
    '---',
    'name: be-lazy',
    'description: Use before writing code — climb the ladder first.',
    'license: MIT',
    'homepage: https://example.test/pack',
    '---',
    '',
    'Do not write what already exists.',
  ].join('\n'))
  await write(`${root}/skills/review/SKILL.md`, [
    '---', 'name: review', 'description: Review a diff for over-engineering.', '---',
    '', 'Look for unrequested abstractions.',
  ].join('\n'))
  await write(`${root}/AGENTS.md`, '# Pack rules\n\nBe lazy about everything.')
  await write(`${root}/LICENSE`, 'MIT License\n\nCopyright (c) 2026 Someone')
}

const source = (packDir: string) => ({
  spec: 'test',
  dir: path.join(dir, packDir),
  origin: 'https://example.test/pack.git',
  commit: 'abc1234',
})

describe('reading a pack', () => {
  it('reads skills laid out the canonical way', async () => {
    await makePack('pack')
    const pack = await readPack(source('pack'), 'demo')
    expect(pack.skills.map((s) => s.name).sort()).toEqual(['be-lazy', 'review'])
    expect(pack.license).toBe('MIT')
  })

  it('finds skills a host-specific pack put elsewhere', async () => {
    await write('alt/.claude/skills/thing/SKILL.md', '---\nname: thing\ndescription: Does a thing.\n---\nbody')
    const pack = await readPack(source('alt'), 'alt')
    expect(pack.skills).toHaveLength(1)
  })

  it('ignores a skill with no activation description, since it can never be selected', async () => {
    await write('bad/skills/nameless/SKILL.md', '---\nname: nameless\n---\nbody')
    expect((await readPack(source('bad'), 'bad')).skills).toHaveLength(0)
  })

  it('notices top-level guidance without treating it as a skill', async () => {
    await makePack('pack')
    const pack = await readPack(source('pack'), 'demo')
    expect(pack.instructions).toContain('Be lazy about everything')
  })
})

describe('installing', () => {
  it('stamps each skill with where it came from', async () => {
    await makePack('pack')
    const pack = await readPack(source('pack'), 'demo')
    const rendered = renderPackSkill(pack, pack.skills[0]!)
    expect(rendered).toContain(`${PACK_FIELD}: demo`)
    expect(rendered).toContain('x-ctxmux-source: https://example.test/pack.git')
    expect(rendered).toContain('x-ctxmux-commit: abc1234')
    expect(rendered).toContain('x-ctxmux-license: MIT')
  })

  it('installs into the canonical source directory', async () => {
    await makePack('pack')
    const pack = await readPack(source('pack'), 'demo')
    const plan = await planInstall(dir, pack)
    expect(plan.install.map((i) => i.action)).toEqual(['create', 'create'])
    await applyInstall(dir, pack, plan)
    expect(await fs.readFile(path.join(dir, '.ctxmux/skills/be-lazy/SKILL.md'), 'utf8')).toContain('Do not write')
  })

  it('never takes back a skill you wrote yourself', async () => {
    // Overwriting a user's own work would make installing a pack a hostile act.
    await makePack('pack')
    await write('.ctxmux/skills/be-lazy/SKILL.md', '---\nname: be-lazy\ndescription: Mine.\n---\nMy own words.')

    const pack = await readPack(source('pack'), 'demo')
    const plan = await planInstall(dir, pack)

    expect(plan.skipped[0]?.name).toBe('be-lazy')
    expect(plan.skipped[0]?.reason).toContain('you wrote or edited')
  })

  it('does replace what the same pack installed before', async () => {
    await makePack('pack')
    const pack = await readPack(source('pack'), 'demo')
    await applyInstall(dir, pack, await planInstall(dir, pack))

    // The pack ships a newer version of the skill.
    await write('pack/skills/be-lazy/SKILL.md', [
      '---', 'name: be-lazy', 'description: Use before writing code — climb the ladder first.', '---',
      '', 'Updated guidance.',
    ].join('\n'))

    const updated = await readPack(source('pack'), 'demo')
    const plan = await planInstall(dir, updated)
    expect(plan.install.find((i) => i.skill.name === 'be-lazy')?.action).toBe('update')
  })

  it('reports an unchanged skill as unchanged rather than rewriting it', async () => {
    await makePack('pack')
    const pack = await readPack(source('pack'), 'demo')
    await applyInstall(dir, pack, await planInstall(dir, pack))
    const second = await planInstall(dir, pack)
    expect(second.install.every((i) => i.action === 'unchanged')).toBe(true)
  })

  it('leaves another pack’s skills alone', async () => {
    await makePack('pack')
    await write('.ctxmux/skills/be-lazy/SKILL.md',
      `---\nname: be-lazy\ndescription: d\n${PACK_FIELD}: someone-else\n---\nTheirs.`)
    const pack = await readPack(source('pack'), 'demo')
    const plan = await planInstall(dir, pack)
    expect(plan.skipped[0]?.reason).toContain('someone-else')
  })
})

describe('provenance survives the schema', () => {
  it('loads an installed pack without tripping strict validation', async () => {
    // The schemas reject unknown keys so typos surface — which would otherwise reject the
    // attribution the installer itself writes. A reserved prefix resolves both.
    await makePack('pack')
    const pack = await readPack(source('pack'), 'demo')
    await applyInstall(dir, pack, await planInstall(dir, pack))
    await write('.ctxmux/instructions.md', 'Project rules.')

    const ctx = await loadContext({ root: dir })
    const skill = ctx.model.skills.find((s) => s.name === 'be-lazy')
    expect(skill?.provenance?.['pack']).toBe('demo')
    expect(skill?.provenance?.['license']).toBe('MIT')
  })

  it('still rejects a genuine typo in a real field', async () => {
    await write('.ctxmux/skills/x/SKILL.md', '---\nname: x\ndescriptoin: typo\n---\nbody')
    await expect(loadContext({ root: dir })).rejects.toThrow(/descriptoin/)
  })

  it('carries attribution into generated output', async () => {
    await makePack('pack')
    const pack = await readPack(source('pack'), 'demo')
    await applyInstall(dir, pack, await planInstall(dir, pack))
    await write('.ctxmux/instructions.md', 'Project rules.')

    await sync({ root: dir, targets: ['claude', 'codex'] })

    const claude = await fs.readFile(path.join(dir, '.claude/skills/be-lazy/SKILL.md'), 'utf8')
    expect(claude).toContain('x-source: https://example.test/pack.git')
    const agents = await fs.readFile(path.join(dir, 'AGENTS.md'), 'utf8')
    expect(agents).toContain('_From https://example.test/pack.git (MIT)._')
  })
})

describe('listing what is installed', () => {
  it('reports packs and their skills', async () => {
    await makePack('pack')
    const pack = await readPack(source('pack'), 'demo')
    await applyInstall(dir, pack, await planInstall(dir, pack))

    const installed = await installedPacks(dir)
    expect(installed).toHaveLength(1)
    expect(installed[0]?.name).toBe('demo')
    expect(installed[0]?.commit).toBe('abc1234')
    expect(installed[0]?.skills.sort()).toEqual(['be-lazy', 'review'])
  })

  it('does not count skills you wrote as belonging to a pack', async () => {
    await write('.ctxmux/skills/mine/SKILL.md', '---\nname: mine\ndescription: d\n---\nbody')
    expect(await installedPacks(dir)).toEqual([])
  })
})

describe('names from a third-party pack', () => {
  it('refuses a skill name that would escape the skills directory', async () => {
    /*
     * The load-bearing check in this file. A pack's frontmatter is content from someone else's
     * repository, and the declared name becomes a directory — under `.ctxmux/skills/` when it
     * is installed, and again under `.claude/skills/` when it is compiled. `path.join` resolves
     * `..` rather than rejecting it, so a name like `../../../../evil` wrote a file outside the
     * repository altogether, on the one command whose entire purpose is running someone else's
     * content.
     */
    const dir = await packOnDisk({
      'skills/helpful/SKILL.md': [
        '---',
        'name: ../../../../evil',
        'description: Looks ordinary.',
        '---',
        '',
        'Body.',
      ].join('\n'),
    })

    try {
      const pack = await readPack({ spec: 'x', dir, origin: 'x' }, 'x')

      expect(pack.skills.map((s) => s.name)).toEqual(['helpful'])
      expect(pack.rejected).toHaveLength(1)
      expect(pack.rejected[0]?.reason).toContain('../../../../evil')

      const plan = await planInstall(dir, pack)
      for (const item of plan.install) {
        expect(item.path.startsWith('.ctxmux/skills/')).toBe(true)
        expect(item.path).not.toContain('..')
      }
    } finally {
      await fs.rm(dir, { recursive: true, force: true })
    }
  })

  it('refuses outright when the directory name is unusable too', async () => {
    const dir = await packOnDisk({
      'skills/Not A Slug/SKILL.md': '---\nname: ../evil\ndescription: d\n---\n\nBody.\n',
    })
    try {
      const pack = await readPack({ spec: 'x', dir, origin: 'x' }, 'x')
      expect(pack.skills).toHaveLength(0)
      expect(pack.rejected[0]?.reason).toContain('usable name')
    } finally {
      await fs.rm(dir, { recursive: true, force: true })
    }
  })

  it('accepts an ordinary name unchanged', async () => {
    const dir = await packOnDisk({
      'skills/write-tests/SKILL.md': '---\nname: write-tests\ndescription: d\n---\n\nBody.\n',
    })
    try {
      const pack = await readPack({ spec: 'x', dir, origin: 'x' }, 'x')
      expect(pack.skills.map((s) => s.name)).toEqual(['write-tests'])
      expect(pack.rejected).toEqual([])
    } finally {
      await fs.rm(dir, { recursive: true, force: true })
    }
  })
})

describe('mcp credentials', () => {
  it('tells a reference from a value', () => {
    for (const reference of ['${GITHUB_TOKEN}', '$GITHUB_TOKEN', '', '  ', '${a_b1}']) {
      expect(isEnvReference(reference), reference).toBe(true)
    }
    for (const literal of ['ghp_abc123', 'sk-live-xyz', 'https://x', '${A} and more', 'a b']) {
      expect(isEnvReference(literal), literal).toBe(false)
    }
  })

  it('names the keys carrying a value, and only the keys', () => {
    const keys = literalEnvKeys({ TOKEN: 'ghp_secret', REGION: '${AWS_REGION}' })
    expect(keys).toEqual(['TOKEN'])
  })
})
