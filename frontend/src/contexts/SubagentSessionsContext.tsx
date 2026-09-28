/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, type ReactNode } from 'react'
import type { SessionInfo, SessionMessageAssistantTool } from '@opencode-manager/shared/opencode'

const SubagentSessionsContext = createContext<readonly SessionInfo[]>([])

export function SubagentSessionsProvider({ value, children }: { value: readonly SessionInfo[]; children: ReactNode }) {
  return <SubagentSessionsContext.Provider value={value}>{children}</SubagentSessionsContext.Provider>
}

export function useSubagentSessions(): readonly SessionInfo[] {
  return useContext(SubagentSessionsContext)
}

export function childSessionIdFromTitle(part: SessionMessageAssistantTool, children: readonly SessionInfo[]): string | undefined {
  if (part.state.status === 'streaming') return undefined
  const input = part.state.input
  const description = typeof input.description === 'string' ? input.description : undefined
  if (description === undefined || description === '') return undefined
  const candidates = children.filter((child) => child.title === description)
  if (candidates.length === 0) return undefined
  const agent = typeof input.agent === 'string' ? input.agent : undefined
  if (agent !== undefined) {
    const exact = candidates.find((child) => child.agent === agent)
    if (exact !== undefined) return exact.id
  }
  return candidates[0]?.id
}
