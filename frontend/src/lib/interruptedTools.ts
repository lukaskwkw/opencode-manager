import type { SessionMessageAssistantTool, SessionMessageInfo } from '@opencode-manager/shared/opencode'

export const TURN_STALL_THRESHOLD_MS = 180_000

/**
 * IDs of tool parts that were left in `streaming` by an ended or stalled turn. Purely derived from
 * the already-loaded messages so the API state is never rewritten.
 */
export function interruptedToolIDs(
  messages: SessionMessageInfo[],
  lastChangeAt: ReadonlyMap<string, number>,
  now: number,
): Set<string> {
  const ids = new Set<string>()
  const lastIdleIndex = messages.reduce((index, message, messageIndex) => (message.type === 'idle' ? messageIndex : index), -1)

  messages.forEach((message, messageIndex) => {
    if (message.type !== 'assistant') return
    const streamingParts = message.content.filter(
      (part): part is SessionMessageAssistantTool => part.type === 'tool' && part.state.status === 'streaming',
    )
    if (streamingParts.length === 0) return
    const turnEnded = message.time.completed !== undefined || lastIdleIndex > messageIndex
    streamingParts.forEach((part) => {
      if (turnEnded) {
        ids.add(part.id)
        return
      }
      const changedAt = lastChangeAt.get(part.id) ?? part.time.ran ?? part.time.created
      if (now - changedAt >= TURN_STALL_THRESHOLD_MS) ids.add(part.id)
    })
  })

  return ids
}
