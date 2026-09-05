import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, FolderGit2, Loader2, MinusCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateLocalWorktree, useLocalWorktreeInfo, useLocalWorktreeJob } from '@/hooks/useLocalWorktree'
import type { LocalWorktreeStep } from '@/api/repos'

interface LocalWorktreeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  repoId: number
}

function StepIcon({ status }: { status: LocalWorktreeStep['status'] }) {
  if (status === 'running') return <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
  if (status === 'ok') return <CheckCircle2 className="h-4 w-4 text-green-400" />
  if (status === 'warning') return <AlertTriangle className="h-4 w-4 text-yellow-400" />
  if (status === 'failed') return <XCircle className="h-4 w-4 text-red-400" />
  return <MinusCircle className="h-4 w-4 text-muted-foreground" />
}

function formatDuration(ms?: number): string {
  if (ms === undefined) return ''
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function useElapsed(running: boolean): number {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!running) return
    setElapsed(0)
    const started = Date.now()
    const t = setInterval(() => setElapsed(Date.now() - started), 1000)
    return () => clearInterval(t)
  }, [running])
  return elapsed
}

export function LocalWorktreeDialog({ open, onOpenChange, repoId }: LocalWorktreeDialogProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [branch, setBranch] = useState('')
  const [verifyVscode, setVerifyVscode] = useState(true)
  const [build, setBuild] = useState(false)
  const [jobId, setJobId] = useState<string | undefined>()

  const infoQuery = useLocalWorktreeInfo(repoId, open)
  const info = infoQuery.data
  const createMutation = useCreateLocalWorktree(repoId)
  const jobQuery = useLocalWorktreeJob(repoId, jobId)
  const job = jobQuery.data
  const running = !!job && job.status === 'running'
  const elapsed = useElapsed(running)

  useEffect(() => {
    if (!open) {
      setBranch('')
      setVerifyVscode(true)
      setBuild(false)
      setJobId(undefined)
      createMutation.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const canSubmit = branch.trim().length > 0 && !createMutation.isPending && !jobId
  const submitError = createMutation.isError
    ? (createMutation.error as Error)?.message || 'Failed to create local worktree'
    : undefined

  const handleCreate = async () => {
    try {
      const res = await createMutation.mutateAsync({
        branch: branch.trim(),
        steps: { verifyVscode, build },
      })
      setJobId(res.jobId)
    } catch {
      // surfaced via submitError
    }
  }

  const handleOpenRepo = () => {
    if (!job?.linkedRepoId) return
    queryClient.invalidateQueries({ queryKey: ['repos'] })
    onOpenChange(false)
    navigate(`/repos/${job.linkedRepoId}`)
  }

  const isUE = !!info?.ueProject
  const steps = useMemo(() => job?.steps ?? [], [job?.steps])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderGit2 className="h-4 w-4 text-green-400" />
            New local worktree
          </DialogTitle>
          <DialogDescription>
            Creates a git worktree under {info?.root ?? 'WORKSPACE_FULL_PATH'} with a random name (e.g. small-fox).
          </DialogDescription>
        </DialogHeader>

        {!jobId ? (
          <div className="space-y-4">
            {infoQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <>
                {info && !info.rootConfigured && (
                  <p className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-300">
                    WORKSPACE_FULL_PATH is not set. Add it to .env and restart the backend.
                  </p>
                )}
                <div className="space-y-2">
                  <Label htmlFor="lwt-branch">Branch (created from {info?.baseBranch ?? 'main'})</Label>
                  <Input
                    id="lwt-branch"
                    placeholder="feature/my-feature"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                  />
                </div>
                {isUE ? (
                  <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
                    <p className="text-xs font-medium">Detected UE project: {info?.ueProject}</p>
                    <label className="flex items-start gap-2 text-sm">
                      <Checkbox checked={verifyVscode} onCheckedChange={(v) => setVerifyVscode(v === true)} />
                      <span>
                        Generate VSC project files
                        <span className="block text-xs text-muted-foreground">
                          Runs UnrealBuildTool -vscode -game -engine in the new worktree (takes a few minutes).
                        </span>
                      </span>
                    </label>
                    <label className="flex items-start gap-2 text-sm">
                      <Checkbox checked={build} onCheckedChange={(v) => setBuild(v === true)} />
                      <span>
                        Build CRPGProjectEditor Win64 Development
                        <span className="block text-xs text-muted-foreground">
                          Full build, takes several minutes. Close the editor (or disable Live Coding) first.
                        </span>
                      </span>
                    </label>
                    {!info?.engineConfigured && (
                      <p className="text-xs text-yellow-300">UE_ENGINE_PATH is not set - the build step will fail.</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No .uproject detected - plain git worktree, no extra steps.</p>
                )}
                {submitError && <p className="text-xs text-red-400">{submitError}</p>}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              {steps.map((step) => (
                <div key={step.key} className="flex items-start gap-2 text-sm">
                  <StepIcon status={step.status} />
                  <div className="min-w-0 flex-1">
                    <span>{step.label}</span>
                    {step.durationMs !== undefined && step.status !== 'running' && (
                      <span className="ml-2 text-xs text-muted-foreground">{formatDuration(step.durationMs)}</span>
                    )}
                    {step.message && <p className="text-xs text-muted-foreground">{step.message}</p>}
                  </div>
                </div>
              ))}
            </div>
            {running && (
              <p className="text-xs text-muted-foreground">Working… {formatDuration(elapsed)} elapsed</p>
            )}
            {job?.logTail && (
              <pre className="max-h-40 overflow-auto rounded-md bg-black/40 p-2 text-[11px] leading-snug text-muted-foreground">
                {job.logTail}
              </pre>
            )}
            {job?.status === 'done' && (
              <div className="space-y-2">
                <p className="text-xs text-green-300">Worktree ready: {job.directory}</p>
                {job.linkedRepoId && <Button onClick={handleOpenRepo}>Open repository</Button>}
              </div>
            )}
            {job?.status === 'failed' && (
              <p className="text-xs text-red-400">{job.error || 'Worktree creation failed.'}</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {jobId ? 'Close' : 'Cancel'}
          </Button>
          {!jobId && (
            <Button
              onClick={() => void handleCreate()}
              disabled={!canSubmit || !info?.rootConfigured}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting…
                </>
              ) : (
                'Create worktree'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
