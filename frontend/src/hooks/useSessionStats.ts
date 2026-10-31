import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSessionStats } from '@/api/usage'
import { useOpenCodeServerId } from '@/contexts/OpenCodeServerContext'
import { serverScopedKey } from '@/lib/serverScope'
import { usageRangeBounds, type UsageRange } from '@/lib/usageStats'

export function sessionStatsQueryKey(range: UsageRange): readonly unknown[] {
  return ['opencode', 'stats', range]
}

function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

/** Session usage aggregation for a range, read from the active OpenCode server. */
export function useSessionStats(range: UsageRange) {
  const serverId = useOpenCodeServerId()
  const bounds = useMemo(() => usageRangeBounds(range), [range])
  const timezone = useMemo(browserTimezone, [])

  return useQuery({
    queryKey: serverScopedKey(sessionStatsQueryKey(range), serverId),
    queryFn: () => getSessionStats({ ...bounds, timezone, tools: 'detail' }, serverId),
    staleTime: 60_000,
  })
}
