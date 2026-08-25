/**
 * Writing files a person owns.
 *
 * Deliberately a copy of the helper in `@contextmux/core` rather than an import of it. This
 * package is the half of contextmux that compiles one context source out to every agent, and it
 * works with no orchestration at all — depending on the run engine for twelve lines of
 * filesystem code would make anyone installing the context layer carry a state machine they
 * never call. A duplicated function with a note is the cheaper of the two costs.
 */
import { promises as fs } from 'node:fs'
import * as path from 'node:path'

/**
 * Distinguishes one call from the next within a process.
 *
 * The process id alone does not: writing several context files at once builds the identical
 * temporary name, so the first rename moves it out from under the others. The lucky ones fail
 * with ENOENT; the unlucky ones have a second writer still filling the file the first is
 * renaming into place, which is the torn write this function exists to prevent.
 */
let sequence = 0

/**
 * Write through a temporary file in the same directory, then rename over the target.
 *
 * `fs.writeFile` truncates before it fills, so an interrupted write leaves a fragment. For the
 * files here that is other people's work — `CLAUDE.md` and `AGENTS.md` hold whatever they wrote
 * outside the managed block — and the usual cause of the interruption is them pressing Ctrl-C.
 * Rename is atomic within a filesystem, so the file is either wholly old or wholly new.
 */
export async function writeFileAtomic(file: string, content: string): Promise<void> {
  const dir = path.dirname(file)
  await fs.mkdir(dir, { recursive: true })
  const tmp = path.join(dir, `.${path.basename(file)}.ctxmux-${process.pid}-${sequence++}.tmp`)
  try {
    await fs.writeFile(tmp, content, 'utf8')
    await fs.rename(tmp, file)
  } catch (err) {
    await fs.rm(tmp, { force: true }).catch(() => {})
    throw err
  }
}
