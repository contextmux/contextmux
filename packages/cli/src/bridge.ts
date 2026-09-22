/**
 * The marker linking a bridged GitHub issue back to the task `ctxmux plan` bridged it from.
 *
 * Stored as a label on the issue itself rather than in local state under `.ctxmux/state/`,
 * because the two ends of a bridge are rarely read by the same process: `plan` creates the
 * issue, often on a laptop, and `run` reports back to the source tracker whenever and wherever
 * that issue eventually gets run — usually CI, usually a different machine entirely. GitHub is
 * the one thing both of them are guaranteed to be able to reach; local state is exactly the
 * kind of thing that does not exist on whichever machine `run` happens to execute on.
 */
const PREFIX = 'bridged-from:'

/** The label `plan` applies when it bridges a task from `tracker`/`id` to a new GitHub issue. */
export function bridgeLabel(tracker: string, id: string): string {
  return `${PREFIX}${tracker}:${id}`
}

/** Where a GitHub issue was bridged from, if `plan` bridged it — the first such label wins. */
export function parseBridgeLabel(labels: string[]): { tracker: string; id: string } | null {
  for (const label of labels) {
    if (!label.startsWith(PREFIX)) continue
    const rest = label.slice(PREFIX.length)
    const at = rest.indexOf(':')
    if (at <= 0) continue
    const tracker = rest.slice(0, at)
    const id = rest.slice(at + 1)
    if (tracker && id) return { tracker, id }
  }
  return null
}
