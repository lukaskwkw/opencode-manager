import { useQuery } from '@tanstack/react-query'
import { listChildSessions } from '@/api/opencode'
import type { SessionInfo, SessionMessageInfo } from '@opencode-manager/shared/opencode'

const CHILD_SESSIONS_POLL_INTERVAL_MS = 5000

const EMPTY_CHILDREN: SessionInfo[] = []

export function needsChildSessions(messages: SessionMessageInfo[], isSessionActive: boolean): boolean {
  if (isSessionActive) return true
  return messages.some(
    (message) =>
      message.type === 'assistant' &&
      message.content.some(
        (part) =>
          part.type === 'tool' &&
          part.name === 'subagent' &&
          (part.state.status === 'running' || part.state.status === 'error') &&
          typeof part.state.metadata?.sessionID !== 'string',
      ),
  )
}

export function useChildSessions(sessionID: string | undefined, directory: string | undefined, enabled: boolean) {
  const query = useQuery({
    queryKey: ['opencode', 'session', sessionID, 'children', directory],
    queryFn: () => listChildSessions(sessionID ?? '', directory),
    enabled: Boolean(sessionID && directory && enabled),
    refetchInterval: CHILD_SESSIONS_POLL_INTERVAL_MS,
    refetchOnWindowFocus: false,
  })
  return query.data ?? EMPTY_CHILDREN
}
