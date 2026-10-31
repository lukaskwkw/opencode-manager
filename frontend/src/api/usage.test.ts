import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { SessionMessageInfo } from '@opencode-manager/shared/opencode'
import { loadSessionUsageMessages } from './usage'

const mocks = vi.hoisted(() => ({
  listSessionMessages: vi.fn(),
}))

vi.mock('./opencode', () => ({
  listSessionMessages: mocks.listSessionMessages,
}))

vi.mock('./opencodeApi', () => ({
  callOpenCode: vi.fn(),
}))

function message(id: string): SessionMessageInfo {
  return {
    id,
    type: 'assistant',
    time: { created: 0 },
    agent: 'build',
    model: { providerID: 'opencode-go', id: 'deepseek' },
    content: [],
  } as SessionMessageInfo
}

beforeEach(() => {
  mocks.listSessionMessages.mockReset()
})

describe('loadSessionUsageMessages', () => {
  it('reads assistant steps page by page within the server limit', async () => {
    mocks.listSessionMessages
      .mockResolvedValueOnce({ messages: [message('m3'), message('m4')], nextCursor: 'older' })
      .mockResolvedValueOnce({ messages: [message('m1'), message('m2')] })

    const result = await loadSessionUsageMessages('ses_1', 'srv_1')

    expect(result.messages.map((entry) => entry.id)).toEqual(['m1', 'm2', 'm3', 'm4'])
    expect(result.truncated).toBe(false)
    expect(mocks.listSessionMessages).toHaveBeenNthCalledWith(
      1,
      'ses_1',
      { limit: 200, type: 'assistant' },
      'srv_1',
    )
    expect(mocks.listSessionMessages).toHaveBeenNthCalledWith(
      2,
      'ses_1',
      { limit: 200, type: 'assistant', cursor: 'older' },
      'srv_1',
    )
  })

  it('stops after the page cap and reports the truncation', async () => {
    mocks.listSessionMessages.mockResolvedValue({ messages: [], nextCursor: 'more' })

    const result = await loadSessionUsageMessages('ses_1')

    expect(result.truncated).toBe(true)
    expect(mocks.listSessionMessages).toHaveBeenCalledTimes(5)
  })
})
