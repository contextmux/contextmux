/**
 * Filesystem helpers shared by anything that writes a file a person owns.
 *
 * There is exactly one thing here, and it exists because `fs.writeFile` truncates before it
 * fills. For a cache that is fine — a torn file fails to parse and is rebuilt. For a task
 * file, a rule, or a `CLAUDE.md` whose managed block sits inside content somebody wrote by
 * hand, it is not: an interrupted write leaves them holding a fragment, and the thing that
 * interrupted it was usually them pressing Ctrl-C.
 */
import { promises as fs } from 'node:fs'
import * as path from 'node:path'

/**
 * Distinguishes one call from the next within a process.
 *
 * The process id alone does not: two writes to the same path from one process — several runs
 * persisting at once, a `Promise.all` over context files — built the identical temporary name,
 * so the first rename moved it out from under the others. The lucky ones failed with ENOENT;
 * the unlucky ones had a second writer still filling the file the first was renaming into
 * place, which is precisely the torn write this function exists to prevent.
 */
let sequence = 0

/**
 * Write through a temporary file in the same directory, then rename over the target.
 *
 * Same directory because rename is only atomic within a filesystem, and a temp directory is
 * regularly on a different one. The result is that the file on disk is either entirely the old
 * content or entirely the new, never a prefix of one followed by nothing.
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
