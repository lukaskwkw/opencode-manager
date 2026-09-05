import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createLocalWorktree,
  getLocalWorktreeInfo,
  getLocalWorktreeJob,
  type LocalWorktreeJob,
} from '@/api/repos'
import { showToast } from '@/lib/toast'

export function useLocalWorktreeInfo(repoId: number | undefined, enabled = true) {
  return useQuery({
    queryKey: ['repo', 'local-worktree-info', repoId],
    queryFn: () => getLocalWorktreeInfo(repoId!),
    enabled: !!repoId && enabled,
    staleTime: 60_000,
  })
}

export function useCreateLocalWorktree(repoId: number | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (options: { branch: string; steps?: { verifyVscode?: boolean; build?: boolean } }) => {
      if (!repoId) throw new Error('Repo id is required')
      return createLocalWorktree(repoId, options)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repo', 'siblings', repoId] })
      queryClient.invalidateQueries({ queryKey: ['repos'] })
    },
    onError: () => {
      showToast.error('Failed to create local worktree')
    },
  })
}

function isJobTerminal(job: LocalWorktreeJob | undefined): boolean {
  return !!job && job.status !== 'running'
}

export function useLocalWorktreeJob(repoId: number | undefined, jobId: string | undefined) {
  return useQuery({
    queryKey: ['repo', 'local-worktree-job', repoId, jobId],
    queryFn: () => getLocalWorktreeJob(repoId!, jobId!),
    enabled: !!repoId && !!jobId,
    refetchInterval: (query) => (isJobTerminal(query.state.data) ? false : 2000),
  })
}