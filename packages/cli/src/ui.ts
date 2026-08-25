/** Terminal output. Colour is suppressed when not a TTY, or when NO_COLOR is set. */
const ESC = String.fromCharCode(27) + '['
const useColor =
  Boolean(process.stdout.isTTY) && !process.env['NO_COLOR'] && process.env['TERM'] !== 'dumb'

const wrap = (code: string) => (s: string) => (useColor ? `${ESC}${code}m${s}${ESC}0m` : s)

export const c = {
  bold: wrap('1'),
  dim: wrap('2'),
  red: wrap('31'),
  green: wrap('32'),
  yellow: wrap('33'),
  blue: wrap('34'),
  cyan: wrap('36'),
}

export function heading(s: string): void {
  console.log('\n' + c.bold(s))
}

export function info(s: string): void {
  console.log(s)
}

export function success(s: string): void {
  console.log(c.green('OK') + '  ' + s)
}

export function warn(s: string): void {
  console.log(c.yellow('!') + '   ' + s)
}

export function error(s: string): void {
  console.error(c.red('x') + '   ' + s)
}

export function bullet(s: string): void {
  console.log('  ' + c.dim('-') + ' ' + s)
}

/** Status glyphs for the sync table, kept ASCII so CI logs stay readable everywhere. */
export const STATUS_LABEL: Record<string, string> = {
  created: 'create',
  updated: 'update',
  unchanged: 'ok',
  drift: 'DRIFT',
  forced: 'forced',
}
