import fs from 'node:fs'
import path from 'node:path'

const WINDOWS_SH_CANDIDATES = [
  'C:\\Program Files\\Git\\bin\\sh.exe',
  'C:\\Program Files\\Git\\usr\\bin\\sh.exe',
  'C:\\Program Files (x86)\\Git\\bin\\sh.exe',
]

/**
 * Project actions and worktree setup run through a POSIX shell (`<shell> -c <command>`).
 * Windows has no `/bin/sh`, so resolve Git Bash's sh.exe explicitly; `cmd.exe` is not a
 * drop-in replacement because it re-parses quoted paths differently.
 */
export function resolveActionShell(
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
): string {
  if (platform !== 'win32') {
    return '/bin/sh'
  }
  const fromEnv = env.OPENCODE_GIT_BASH_PATH
    ? path.join(path.dirname(env.OPENCODE_GIT_BASH_PATH), 'sh.exe')
    : undefined
  const candidates = [fromEnv, ...WINDOWS_SH_CANDIDATES].filter((value): value is string =>
    Boolean(value),
  )
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? '/bin/sh'
}
