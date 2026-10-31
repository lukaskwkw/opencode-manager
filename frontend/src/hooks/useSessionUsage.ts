import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { loadSessionUsageMessages, type SessionUsageMessages } from '@/api/usage'
import { useOpenCodeServerId } from '@/contexts/OpenCodeServerContext'
import { serverScopedKey } from '@/lib/serverScope'
import { summarizeSessionUsage, type SessionUsageSummary } from '@/lib/sessionUsage'
import type { UsageRangeBounds } from '@/lib/usageStats'

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

/** Per-session usage summary computed from the session's assistant steps within the given bounds. */
export function useSessionUsage(
  sessionID: string | undefined,
  bounds?: UsageRangeBounds | null,
) {
  const serverId = useOpenCodeServerId()
  const query = useQuery<SessionUsageMessages>({
    ...sessionUsageServerQuery(sessionID ?? '', serverId),
    enabled: sessionID !== undefined,
  })
  const summary = useMemo<SessionUsageSummary | undefined>(() => {
    if (!query.data || bounds === null) return undefined
    return summarizeSessionUsage(query.data.messages, bounds)
  }, [query.data, bounds])

  return { ...query, summary }
}

/** Usage query per session, in the same order as the supplied ids. */
export function useSessionUsageQueries(sessionIDs: readonly string[]) {
  const serverId = useOpenCodeServerId()

  return useQueries({
    queries: sessionIDs.map((sessionID) => sessionUsageServerQuery(sessionID, serverId)),
  })
}
