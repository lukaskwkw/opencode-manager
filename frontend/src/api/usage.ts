import { callOpenCode } from './opencodeApi'
import type { SessionStatsInfo } from '@opencode-manager/shared/opencode'

export interface SessionStatsQuery {
  from?: number
  to?: number
  timezone?: string
  tools?: 'none' | 'summary' | 'detail'
}

/** Aggregated local session activity, usage and tool reliability from the OpenCode server. */
export async function getSessionStats(
  query: SessionStatsQuery,
  serverId?: string,
): Promise<SessionStatsInfo> {
  return callOpenCode((api) => api.session.stats(query), serverId)
}
