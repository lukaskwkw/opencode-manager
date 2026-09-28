import { describe, expect, it } from 'vitest'
import type { SessionInfo, SessionMessageAssistantTool } from '@opencode-manager/shared/opencode'
import { childSessionIdFromTitle } from './SubagentSessionsContext'

const childSession = (id: string, title: string, agent: string): SessionInfo => ({
  id,
  projectID: 'project_1',
  agent,
  cost: 0,
  tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
  time: { created: 1, updated: 2 },
  title,
  location: { directory: '/workspace/repo' },
})

const runningSubagent = (input: Record<string, string>): SessionMessageAssistantTool => ({
  type: 'tool',
  id: 'tool_subagent',
  name: 'subagent',
  state: { status: 'running', input, metadata: {} },
  time: { created: 1, ran: 2 },
})

const completedSubagent = (input: Record<string, string>): SessionMessageAssistantTool => ({
  type: 'tool',
  id: 'tool_subagent',
  name: 'subagent',
  state: { status: 'completed', input, content: [{ type: 'text', text: 'done' }], metadata: {} },
  time: { created: 1, ran: 2, completed: 3 },
})

describe('childSessionIdFromTitle', () => {
  it('resolves the child session by title for a running subagent part without metadata', () => {
    const children = [childSession('child_1', 'Explore codebase', 'explore')]

    const result = childSessionIdFromTitle(runningSubagent({ description: 'Explore codebase', agent: 'explore' }), children)

    expect(result).toBe('child_1')
  })

  it('prefers the child whose agent matches the tool input when titles collide', () => {
    const children = [
      childSession('child_1', 'Review changes', 'build'),
      childSession('child_2', 'Review changes', 'explore'),
    ]

    const result = childSessionIdFromTitle(runningSubagent({ description: 'Review changes', agent: 'explore' }), children)

    expect(result).toBe('child_2')
  })

  it('returns undefined when no child title matches the description', () => {
    const children = [childSession('child_1', 'Explore codebase', 'explore')]

    const result = childSessionIdFromTitle(completedSubagent({ description: 'Something else' }), children)

    expect(result).toBeUndefined()
  })

  it('returns undefined for a streaming part', () => {
    const children = [childSession('child_1', 'Explore codebase', 'explore')]
    const streaming: SessionMessageAssistantTool = {
      type: 'tool',
      id: 'tool_subagent',
      name: 'subagent',
      state: { status: 'streaming', input: '' },
      time: { created: 1 },
    }

    expect(childSessionIdFromTitle(streaming, children)).toBeUndefined()
  })

  it('returns undefined when the input has no description', () => {
    const children = [childSession('child_1', 'Explore codebase', 'explore')]

    expect(childSessionIdFromTitle(runningSubagent({ prompt: 'Explore codebase' }), children)).toBeUndefined()
  })
})
