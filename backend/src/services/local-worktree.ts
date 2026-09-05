/**
 * "Worktree +" button flow (separate from the proxied "Workspace +" button).
 *
 * Creates a real git worktree at WORKSPACE_FULL_PATH/<slug> (e.g.
 * D:/ocm-workspace/small-fox) - the opencode server workspace API cannot be
 * used because its worktree root is hardcoded deep inside the opencode data
 * dir with no way to configure it (MAX_PATH killer for UE projects).
 * Sessions bind to any directory via ?directory=, so no opencode registry
 * entry is needed. The worktree is auto-linked as a manager repo.
 *
 * Optional post steps (modal checkboxes): verify VS Code project files
 * (UE 5.8 has no headless generator - verify only, never blocks) and a full
 * Editor Win64 Development build (long - runs inside the background job).
 */
import path from 'node:path'
import { existsSync } from 'node:fs'
import { mkdir, readdir, realpath, rm, lstat, readlink } from 'node:fs/promises'
import type { Database } from 'bun:sqlite'
import { executeCommand } from '../utils/process'
import { logger } from '../utils/logger'
import { getRepoById, deleteRepo } from '../db/queries'
import { initLocalRepo } from './repo'
import { getReposPath } from '@opencode-manager/shared/config/env'
import type { GitAuthService } from './git-auth'

export type LocalWorktreeStepStatus = 'pending' | 'running' | 'ok' | 'warning' | 'failed' | 'skipped'

export interface LocalWorktreeStep {
  key: string
  label: string
  status: LocalWorktreeStepStatus
  message?: string
  durationMs?: number
}

export interface LocalWorktreeJob {
  id: string
  repoId: number
  branch: string
  slug: string
  directory: string
  status: 'running' | 'done' | 'failed'
  steps: LocalWorktreeStep[]
  logTail: string
  linkedRepoId?: number
  error?: string
  createdAt: number
  updatedAt: number
}

export interface LocalWorktreeSteps {
  verifyVscode?: boolean
  build?: boolean
}

const jobs = new Map<string, LocalWorktreeJob>()
const MAX_JOBS = 50
const MAX_NAME_ATTEMPTS = 26
const WORKTREE_ADD_TIMEOUT_MS = 180000
const BUILD_TIMEOUT_MS = 3600000
const VSCODE_GEN_TIMEOUT_MS = 600000
const LOG_TAIL_CHARS = 6000

const SLUG_ADJECTIVES = [
  'small', 'brave', 'quiet', 'swift', 'clever', 'bright', 'calm', 'eager',
  'bold', 'frosty', 'hazy', 'jolly', 'kind', 'lively', 'misty', 'noble',
  'proud', 'rusty', 'sunny', 'tidy', 'vivid', 'wild', 'amber', 'copper',
]
const SLUG_NOUNS = [
  'fox', 'bear', 'wolf', 'hawk', 'otter', 'moose', 'lynx', 'badger',
  'heron', 'newt', 'owl', 'raven', 'seal', 'toad', 'viper', 'whale',
  'finch', 'gecko', 'ibis', 'jay', 'koala', 'lark', 'mole', 'panda',
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T
}

export function getLocalWorktreeRoot(): string {
  const root = (process.env.WORKSPACE_FULL_PATH || '').trim()
  if (!root) {
    throw new Error('WORKSPACE_FULL_PATH is not set. Add it to .env (e.g. WORKSPACE_FULL_PATH=D:/ocm-workspace) and restart the backend.')
  }
  if (!path.isAbsolute(root)) {
    throw new Error('WORKSPACE_FULL_PATH must be an absolute path.')
  }
  return path.normalize(root)
}

export function getUnrealBuildToolExe(): string | null {
  const engineRoot = (process.env.UE_ENGINE_PATH || "").trim()
  if (!engineRoot) return null
  const exe = path.join(engineRoot, "Engine", "Binaries", "DotNET", "UnrealBuildTool", "UnrealBuildTool.exe")
  return existsSync(exe) ? exe : null
}

export function getEngineBuildBat(): string | null {
  const engineRoot = (process.env.UE_ENGINE_PATH || '').trim()
  if (!engineRoot) return null
  const bat = path.join(engineRoot, 'Engine', 'Build', 'BatchFiles', 'Build.bat')
  return existsSync(bat) ? bat : null
}

/** Random friendly slug (small-fox style) with a collision-free directory. */
export function pickLocalWorktreeSlug(root: string): { slug: string; directory: string } {
  for (let i = 0; i < MAX_NAME_ATTEMPTS; i++) {
    const slug = `${pick(SLUG_ADJECTIVES)}-${pick(SLUG_NOUNS)}`
    const directory = path.join(root, slug)
    if (!existsSync(directory)) return { slug, directory }
  }
  const slug = `${pick(SLUG_ADJECTIVES)}-${pick(SLUG_NOUNS)}-${Date.now().toString(36)}`
  return { slug, directory: path.join(root, slug) }
}

interface GitResult {
  code: number
  out: string
  err: string
}

async function runGit(args: string[], cwd: string, env: Record<string, string>, timeoutMs = 60000): Promise<GitResult> {
  const res = (await executeCommand(['git', ...args], { cwd, env, silent: true, ignoreExitCode: true, timeout: timeoutMs })) as unknown as {
    exitCode: number
    stdout: string
    stderr: string
  }
  return { code: res.exitCode, out: (res.stdout || '').trim(), err: (res.stderr || '').trim() }
}

async function resolveRepoDir(database: Database, repoId: number): Promise<string> {
  const row = getRepoById(database, repoId) as unknown as { id: number; localPath: string; sourcePath?: string | null } | null
  if (!row) throw new Error(`Repo not found: ${repoId}`)
  const raw = row.sourcePath || path.join(getReposPath(), row.localPath)
  let directory: string
  try {
    directory = await realpath(raw)
  } catch {
    throw new Error(`Repository directory does not exist: ${raw}`)
  }
  const check = await runGit(['rev-parse', '--git-dir'], directory, process.env as Record<string, string>, 15000)
  if (check.code !== 0) throw new Error(`Directory is not a git repository: ${directory}`)
  return directory
}

async function resolveBaseBranch(sourceDir: string, env: Record<string, string>): Promise<string> {
  const main = await runGit(['rev-parse', '--verify', '--quiet', 'main'], sourceDir, env, 15000)
  if (main.code === 0) return 'main'
  const cur = await runGit(['rev-parse', '--abbrev-ref', 'HEAD'], sourceDir, env, 15000)
  if (cur.code !== 0 || !cur.out || cur.out === 'HEAD') {
    throw new Error('Cannot determine base branch (no main branch and no checked-out branch).')
  }
  return cur.out
}

export async function detectUproject(dir: string): Promise<string | null> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    const hit = entries.find((e) => e.isFile() && e.name.toLowerCase().endsWith('.uproject'))
    return hit ? hit.name : null
  } catch {
    return null
  }
}

function appendLog(job: LocalWorktreeJob, text: string): void {
  if (!text) return
  job.logTail = `${job.logTail}\n${text}`.slice(-LOG_TAIL_CHARS)
  job.updatedAt = Date.now()
}

export function getLocalWorktreeJob(jobId: string): LocalWorktreeJob {
  const job = jobs.get(jobId)
  if (!job) throw new Error(`Unknown local worktree job: ${jobId}`)
  return job
}

async function runStep(
  job: LocalWorktreeJob,
  key: string,
  label: string,
  fn: () => Promise<{ warning?: string; log?: string } | void>,
): Promise<void> {
  const step: LocalWorktreeStep = { key, label, status: 'running' }
  job.steps.push(step)
  job.updatedAt = Date.now()
  const started = Date.now()
  try {
    const res = (await fn()) ?? {}
    step.status = res.warning ? 'warning' : 'ok'
    if (res.warning) step.message = res.warning
    if (res.log) appendLog(job, res.log)
  } catch (error) {
    step.status = 'failed'
    step.message = error instanceof Error ? error.message : String(error)
    appendLog(job, step.message)
    throw error
  } finally {
    step.durationMs = Date.now() - started
    job.updatedAt = Date.now()
  }
}

function newJobId(): string {
  return `lwt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

async function runLocalWorktreeJob(
  job: LocalWorktreeJob,
  ctx: { database: Database; gitAuthService: GitAuthService; sourceDir: string; branch: string; steps: LocalWorktreeSteps },
): Promise<void> {
  const { database, gitAuthService, sourceDir, branch, steps } = ctx
  const env = gitAuthService.getGitEnvironment(true)
  try {
    await runStep(job, 'create', `git worktree add ${job.slug}`, async () => {
      const base = await resolveBaseBranch(sourceDir, env)
      const res = await runGit(['worktree', 'add', '-b', branch, job.directory, base], sourceDir, env, WORKTREE_ADD_TIMEOUT_MS)
      if (res.code !== 0) {
        throw new Error(`git worktree add failed: ${res.err || res.out || `exit ${res.code}`}`)
      }
      return { log: `$ git worktree add -b ${branch} ${job.directory} ${base}\n${res.out}`.slice(-2000) }
    })

    const uproject = await detectUproject(job.directory)

    if (steps.verifyVscode && uproject) {
      await runStep(job, "generate-vscode", "Generate VSC project files", async () => {
        const ubt = getUnrealBuildToolExe()
        if (!ubt) {
          throw new Error("UE_ENGINE_PATH is not set or UnrealBuildTool.exe not found. Set UE_ENGINE_PATH (e.g. H:/UE_5.8) in .env and restart the backend.")
        }
        const uprojectPath = path.join(job.directory, uproject)
        const args = [ubt, "-project=" + uprojectPath, "-vscode", "-game", "-engine"]
        logger.info("Local worktree VS Code gen: " + args.join(" "))
        const res = (await executeCommand(args, { cwd: job.directory, env: process.env as Record<string, string>, silent: true, ignoreExitCode: true, timeout: VSCODE_GEN_TIMEOUT_MS })) as unknown as {
          exitCode: number
          stdout: string
          stderr: string
        }
        const tail = ((res.stdout || "") + "\n" + (res.stderr || "")).slice(-4000)
        const cProps = path.join(job.directory, ".vscode", "c_cpp_properties.json")
        const cc = path.join(job.directory, "compile_commands.json")
        if (res.exitCode !== 0 || (!existsSync(cProps) && !existsSync(cc))) {
          throw new Error(("VS Code project generation failed (exit " + res.exitCode + ").\n" + tail).slice(0, 2000))
        }
        return { log: ("VS Code project files generated.\n" + tail).slice(-4000) }
      })
    } else if (steps.verifyVscode && !uproject) {
      job.steps.push({ key: "generate-vscode", label: "Generate VSC project files", status: "skipped", message: "No .uproject detected - not a UE project." })
    }

    if (steps.build && uproject) {
      await runStep(job, 'build', 'Build Editor (Win64 Development)', async () => {
        const buildBat = getEngineBuildBat()
        if (!buildBat) {
          throw new Error('UE_ENGINE_PATH is not set or Build.bat not found. Set UE_ENGINE_PATH (e.g. H:/UE_5.8) in .env and restart the backend.')
        }
        const target = `${path.basename(uproject, '.uproject')}Editor`
        const uprojectPath = path.join(job.directory, uproject)
        const args =
          process.platform === 'win32'
            ? ['cmd', '/c', buildBat, target, 'Win64', 'Development', `-Project=${uprojectPath}`, '-WaitMutex', '-NoHotReload']
            : [buildBat, target, 'Win64', 'Development', `-Project=${uprojectPath}`, '-WaitMutex', '-NoHotReload']
        logger.info(`Local worktree build: ${args.join(' ')}`)
        const res = (await executeCommand(args, { env: process.env as Record<string, string>, silent: true, ignoreExitCode: true, timeout: BUILD_TIMEOUT_MS })) as unknown as {
          exitCode: number
          stdout: string
          stderr: string
        }
        const tail = `${res.stdout || ''}\n${res.stderr || ''}`.slice(-4000)
        if (res.exitCode !== 0) {
          const hint = /live coding is active/i.test(`${res.stdout} ${res.stderr}`)
            ? ' Close the editor (or disable Live Coding with Ctrl+Alt+F11) and retry.'
            : ''
          throw new Error(`Editor build failed (exit ${res.exitCode}).${hint}\n${tail}`.slice(0, 2000))
        }
        return { log: `Build OK (${target}).\n${tail}`.slice(-4000) }
      }).catch((error) => {
        // A failed build must not block repo linking - the worktree itself is fine.
        job.error = error instanceof Error ? error.message : String(error)
      })
    } else if (steps.build && !uproject) {
      job.steps.push({ key: 'build', label: 'Build Editor (Win64 Development)', status: 'skipped', message: 'No .uproject detected - not a UE project.' })
    }

    await runStep(job, 'link', 'Link repository in manager', async () => {
      const linked = (await initLocalRepo(database, gitAuthService, job.directory, branch)) as unknown as { id: number }
      job.linkedRepoId = linked.id
      return { log: `Linked as repo #${job.linkedRepoId}.` }
    })

    job.status = job.error ? 'failed' : 'done'
  } catch (error) {
    job.status = 'failed'
    if (!job.error) job.error = error instanceof Error ? error.message : String(error)
  } finally {
    job.updatedAt = Date.now()
  }
}

export async function createLocalWorktree(input: {
  database: Database
  gitAuthService: GitAuthService
  repoId: number
  branch: string
  steps?: LocalWorktreeSteps
}): Promise<LocalWorktreeJob> {
  const branch = (input.branch || '').trim()
  if (!branch) throw new Error('Branch name is required (e.g. feature/my-feature).')
  if (branch.length > 100) throw new Error('Branch name is too long (max 100 chars).')

  const root = getLocalWorktreeRoot()
  await mkdir(root, { recursive: true })

  const sourceDir = await resolveRepoDir(input.database, input.repoId)
  const env = input.gitAuthService.getGitEnvironment(true)

  const fmt = await runGit(['check-ref-format', '--branch', branch], sourceDir, env, 15000)
  if (fmt.code !== 0) throw new Error(`Invalid branch name: '${branch}'.`)
  const exists = await runGit(['show-ref', '--verify', '--quiet', `refs/heads/${branch}`], sourceDir, env, 15000)
  if (exists.code === 0) throw new Error(`Branch '${branch}' already exists in this repository.`)

  const { slug, directory } = pickLocalWorktreeSlug(root)

  const job: LocalWorktreeJob = {
    id: newJobId(),
    repoId: input.repoId,
    branch,
    slug,
    directory,
    status: 'running',
    steps: [],
    logTail: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  jobs.set(job.id, job)
  if (jobs.size > MAX_JOBS) {
    const oldest = [...jobs.values()].filter((j) => j.status !== 'running').sort((a, b) => a.createdAt - b.createdAt)[0]
    if (oldest) jobs.delete(oldest.id)
  }

  void runLocalWorktreeJob(job, {
    database: input.database,
    gitAuthService: input.gitAuthService,
    sourceDir,
    branch,
    steps: input.steps ?? {},
  }).catch((error) => {
    job.status = 'failed'
    job.error = error instanceof Error ? error.message : String(error)
    job.updatedAt = Date.now()
  })

  return job
}

export interface LocalWorktreeRemoved {
  removedWorktree: boolean
  branchDeleted: boolean
  repoDeleted: boolean
  warnings: string[]
}

/** Removes a worktree created through the Worktree + flow (by directory). */
export async function deleteLocalWorktree(input: {
  database: Database
  gitAuthService: GitAuthService
  repoId: number
  directory: string
}): Promise<LocalWorktreeRemoved> {
  const warnings: string[] = []
  const row = getRepoById(input.database, input.repoId) as unknown as { id: number; localPath: string; sourcePath?: string | null } | null
  if (!row) throw new Error(`Repo not found: ${input.repoId}`)

  const root = path.resolve(getLocalWorktreeRoot())
  let realDir: string
  try {
    realDir = await realpath(path.resolve(input.directory))
  } catch {
    throw new Error(`Directory does not exist: ${input.directory}`)
  }
  // Safety: only touch directories inside WORKSPACE_FULL_PATH.
  if (realDir !== root && !realDir.startsWith(root + path.sep)) {
    const sameRoot = process.platform === 'win32'
      ? realDir.toLowerCase().startsWith(root.toLowerCase() + path.sep)
      : false
    if (!sameRoot) throw new Error('Refusing to delete: directory is outside WORKSPACE_FULL_PATH.')
  }

  const rowDir = row.sourcePath || path.join(getReposPath(), row.localPath)
  let rowReal = ''
  try {
    rowReal = await realpath(rowDir)
  } catch {
    rowReal = ''
  }
  const samePath = (a: string, b: string) =>
    process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b
  if (!rowReal || !samePath(rowReal, realDir)) {
    throw new Error('Refusing to delete: the repo row does not point at this directory.')
  }

  const env = input.gitAuthService.getGitEnvironment(true)
  const common = await runGit(['rev-parse', '--git-common-dir'], realDir, env, 15000)
  if (common.code !== 0) throw new Error(`Not a git worktree: ${realDir}`)
  let mainRepo = common.out
  if (/\.git$/i.test(mainRepo)) mainRepo = path.dirname(mainRepo)
  if (samePath(path.resolve(mainRepo), realDir)) {
    throw new Error('Refusing to delete: this looks like a main checkout, not a linked worktree.')
  }

  let branch = ''
  const br = await runGit(['rev-parse', '--abbrev-ref', 'HEAD'], realDir, env, 15000)
  if (br.code === 0 && br.out && br.out !== 'HEAD') branch = br.out

  let removedWorktree = false
  const rmRes = await runGit(['worktree', 'remove', '--force', realDir], mainRepo, env, 120000)
  if (rmRes.code === 0) {
    removedWorktree = true
  } else {
    await runGit(['worktree', 'prune'], mainRepo, env, 30000)
    if (!existsSync(realDir)) {
      removedWorktree = true
      warnings.push(`worktree remove reported an error but the directory is gone: ${rmRes.err || rmRes.out}`)
    } else {
      throw new Error(`git worktree remove failed: ${rmRes.err || rmRes.out || `exit ${rmRes.code}`}`)
    }
  }

  let branchDeleted = false
  if (branch && !['main', 'master'].includes(branch)) {
    const del = await runGit(['branch', '-D', branch], mainRepo, env, 30000)
    if (del.code === 0) {
      branchDeleted = true
    } else {
      warnings.push(`Kept branch '${branch}' (${del.err || del.out || 'not fully merged'}).`)
    }
  }

  try {
    const aliasPath = path.join(getReposPath(), row.localPath)
    const st = await lstat(aliasPath)
    if (st.isSymbolicLink()) {
      const target = path.resolve(path.dirname(aliasPath), await readlink(aliasPath))
      if (samePath(target, realDir)) {
        await rm(aliasPath, { force: true })
      } else {
        warnings.push('Workspace link points elsewhere - left untouched.')
      }
    }
  } catch (error) {
    warnings.push(`Could not remove workspace link: ${error instanceof Error ? error.message : String(error)}`)
  }

  deleteRepo(input.database, input.repoId)
  return { removedWorktree, branchDeleted, repoDeleted: true, warnings }
}

export async function getLocalWorktreeInfo(
  database: Database,
  gitAuthService: GitAuthService,
  repoId: number,
): Promise<{ rootConfigured: boolean; root: string | null; ueProject: string | null; baseBranch: string | null; engineConfigured: boolean }> {
  let root: string | null = null
  let rootConfigured = false
  try {
    root = getLocalWorktreeRoot()
    rootConfigured = true
  } catch {
    rootConfigured = false
  }
  let ueProject: string | null = null
  let baseBranch: string | null = null
  try {
    const sourceDir = await resolveRepoDir(database, repoId)
    ueProject = await detectUproject(sourceDir)
    const env = gitAuthService.getGitEnvironment(true)
    const main = await runGit(['rev-parse', '--verify', '--quiet', 'main'], sourceDir, env, 15000)
    if (main.code === 0) {
      baseBranch = 'main'
    } else {
      const cur = await runGit(['rev-parse', '--abbrev-ref', 'HEAD'], sourceDir, env, 15000)
      baseBranch = cur.code === 0 && cur.out && cur.out !== 'HEAD' ? cur.out : null
    }
  } catch {
    // Info stays partial - create will raise the real error.
  }
  return { rootConfigured, root, ueProject, baseBranch, engineConfigured: getEngineBuildBat() !== null }
}
