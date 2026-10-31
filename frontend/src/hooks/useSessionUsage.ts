import { useQueries, useQuery } from '@tanstack/react-query'
import { loadSessionUsageMessages, type SessionUsageMessages } from '@/api/usage'
import { useOpenCodeServerId } from '@/contexts/OpenCodeServerContext'
import { serverScopedKey } from '@/lib/serverScope'

export function sessionUsageQueryKey(sessionID: string): readonly unknown[] {
  return ['opencode', 'session-usage', sessionID]
}

const SESSION_USAGE_STALE_MS = 5 * 60_000

function sessionUsageServerQuery(sessionID: string, serverId: string) {
  return {
    queryKey: serverScopedKey(sessionUsageQueryKey(sessionID), serverId),
    queryFn: () => loadSessionUsageMessages(sessionID, serverId),
    staleTime: SESSION_USAGE_STALE_MS,
  }
}

/** Assistant steps of one session, which the session usage panel summarizes within its filters. */
export function useSessionUsage(sessionID: string | undefined) {
  const serverId = useOpenCodeServerId()
  return useQuery<SessionUsageMessages>({
    ...sessionUsageServerQuery(sessionID ?? '', serverId),
    enabled: sessionID !== undefined,
  })
}

/** Usage query per session, in the same order as the supplied ids. */
export function useSessionUsageQueries(sessionIDs: readonly string[]) {
  const serverId = useOpenCodeServerId()

  return useQueries({
    queries: sessionIDs.map((sessionID) => sessionUsageServerQuery(sessionID, serverId)),
  })
}
