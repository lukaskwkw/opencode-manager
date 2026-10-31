import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSessionStats } from '@/api/usage'
import { useOpenCodeServerId } from '@/contexts/OpenCodeServerContext'
import { serverScopedKey } from '@/lib/serverScope'
import { resolveUsageRangeBounds, type UsageRangeSelection } from '@/lib/usageRange'

export function sessionStatsQueryKey(selection: UsageRangeSelection): readonly unknown[] {
  return ['opencode', 'stats', selection.range, selection.from, selection.to]
}

function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

/** Session usage aggregation for the selected range, read from the active OpenCode server. */
export function useSessionStats(selection: UsageRangeSelection) {
  const serverId = useOpenCodeServerId()
  const bounds = useMemo(() => resolveUsageRangeBounds(selection), [selection])
  const timezone = useMemo(browserTimezone, [])

  const query = useQuery({
    queryKey: serverScopedKey(sessionStatsQueryKey(selection), serverId),
    queryFn: () => getSessionStats({ ...(bounds ?? {}), timezone, tools: 'detail' }, serverId),
    enabled: bounds !== null,
    staleTime: 60_000,
  })

  return { ...query, bounds }
}
