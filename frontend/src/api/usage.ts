import { callOpenCode } from './opencodeApi'
import { listSessionMessages } from './opencode'
import type { SessionMessageInfo, SessionStatsInfo } from '@opencode-manager/shared/opencode'

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

/** The server rejects message pages above this size. */
const SESSION_USAGE_PAGE_LIMIT = 200
/** Older steps are dropped after this many pages, so a huge session cannot stall the panel. */
const SESSION_USAGE_MAX_PAGES = 5

export interface SessionUsageMessages {
  messages: SessionMessageInfo[]
  truncated: boolean
}

/** Assistant steps of one session, which carry the token counters and stream timings usage needs. */
export async function loadSessionUsageMessages(
  sessionID: string,
  serverId?: string,
): Promise<SessionUsageMessages> {
  const chunks: SessionMessageInfo[][] = []
  let cursor: string | undefined

  for (let page = 0; page < SESSION_USAGE_MAX_PAGES; page += 1) {
    const result = await listSessionMessages(
      sessionID,
      {
        limit: SESSION_USAGE_PAGE_LIMIT,
        type: 'assistant',
        ...(cursor === undefined ? {} : { cursor }),
      },
      serverId,
    )
    chunks.unshift(result.messages)
    cursor = result.nextCursor
    if (cursor === undefined) break
  }

  return { messages: chunks.flat(), truncated: cursor !== undefined }
}
