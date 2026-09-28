import { describe, it, expect } from 'vitest'
import { needsChildSessions } from './useChildSessions'
import type {
  SessionMessageAssistant,
  SessionMessageAssistantTool,
  SessionMessageInfo,
  SessionMessageUser,
} from '@opencode-manager/shared/opencode'

const subagentTool = (
  state: SessionMessageAssistantTool['state'],
): SessionMessageAssistantTool => ({
  type: 'tool',
  id: 'tool_subagent',
  name: 'subagent',
  state,
  time: { created: Date.now(), completed: Date.now() + 100 },
})

const runningSubagent = (metadata: { [x: string]: string } = {}): SessionMessageAssistantTool =>
  subagentTool({ status: 'running', input: { description: 'Explore' }, metadata })

const completedSubagent = (): SessionMessageAssistantTool =>
  subagentTool({
    status: 'completed',
    input: { description: 'Explore' },
    content: [{ type: 'text', text: 'done' }],
  })

const textPart = (text: string): SessionMessageAssistant['content'][number] => ({ type: 'text', text })

const assistantMessage = (
  id: string,
  content: SessionMessageAssistant['content'],
): SessionMessageAssistant => ({
  id,
  type: 'assistant',
  agent: 'test-agent',
  model: { providerID: 'test-provider', id: 'test-model' },
  content,
  time: { created: Date.now(), completed: Date.now() + 100 },
})

const userMessage = (id: string, text: string): SessionMessageUser => ({
  id,
  type: 'user',
  text,
  time: { created: Date.now() },
})

describe('needsChildSessions', () => {
  it('returns true for an active session even without subagent parts', () => {
    const messages: SessionMessageInfo[] = [userMessage('1', 'hello'), assistantMessage('2', [textPart('hi')])]

    expect(needsChildSessions(messages, true)).toBe(true)
  })

  it('returns true when idle with a running subagent part without sessionID metadata', () => {
    const messages: SessionMessageInfo[] = [assistantMessage('1', [runningSubagent()])]

    expect(needsChildSessions(messages, false)).toBe(true)
  })

  it('returns false when idle with a completed subagent part without sessionID metadata', () => {
    const messages: SessionMessageInfo[] = [assistantMessage('1', [completedSubagent()])]

    expect(needsChildSessions(messages, false)).toBe(false)
  })

  it('returns false when idle with a running subagent part whose metadata has sessionID', () => {
    const messages: SessionMessageInfo[] = [assistantMessage('1', [runningSubagent({ sessionID: 'child-1' })])]

    expect(needsChildSessions(messages, false)).toBe(false)
  })

  it('returns false when idle with no subagent parts', () => {
    const messages: SessionMessageInfo[] = [userMessage('1', 'hello'), assistantMessage('2', [textPart('hi')])]

    expect(needsChildSessions(messages, false)).toBe(false)
  })
})
