import type { Target } from '../schema.js'
import { claudeCompiler } from './claude.js'
import { codexCompiler } from './codex.js'
import { copilotCompiler } from './copilot.js'
import { cursorCompiler } from './cursor.js'
import type { Compiler } from './types.js'

export const COMPILERS: Record<Target, Compiler> = {
  claude: claudeCompiler,
  copilot: copilotCompiler,
  cursor: cursorCompiler,
  codex: codexCompiler,
}

export * from './types.js'
export { claudeCompiler, copilotCompiler, cursorCompiler, codexCompiler, commonDirectory } from './exports.js'
