import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SessionUsagePanel } from './SessionUsagePanel'
import type { SessionUsageSummary } from '@/lib/sessionUsage'

const mocks = vi.hoisted(() => ({
  useSessionUsage: vi.fn(),
  useSession: vi.fn(),
}))

vi.mock('@/hooks/useSessionUsage', () => ({
  useSessionUsage: mocks.useSessionUsage,
}))

vi.mock('@/hooks/useOpenCode', () => ({
  useSession: mocks.useSession,
}))

function makeSummary(overrides: Partial<SessionUsageSummary> = {}): SessionUsageSummary {
  return {
    steps: 3,
    tokens: { input: 100, output: 40, reasoning: 10, cache: { read: 20, write: 5 } },
    cost: 0.0123,
    generated: 50,
    streamMs: 2_000,
    tokensPerSecond: 25,
    models: [],
    tools: { mode: 'detail', totals: { calls: 0, succeeded: 0, failed: 0, unfinished: 0 }, usage: [] },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.useSession.mockReturnValue({
    data: { cost: 0.5, tokens: { input: 100, output: 40, reasoning: 10, cache: { read: 20, write: 5 } } },
  })
  mocks.useSessionUsage.mockReturnValue({
    summary: makeSummary(),
    isPending: false,
    isError: false,
    data: { messages: [], truncated: false },
  })
})

describe('SessionUsagePanel', () => {
  it('shows the session cost, throughput, tokens and steps', () => {
    render(<SessionUsagePanel sessionID="ses_1" />)

    expect(screen.getByText('$0.500')).toBeTruthy()
    expect(screen.getByText('25')).toBeTruthy()
    expect(screen.getByText('175')).toBeTruthy()
    expect(screen.getByText('Steps')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
  })

  it('explains an empty session', () => {
    mocks.useSessionUsage.mockReturnValue({
      summary: makeSummary({ steps: 0 }),
      isPending: false,
      isError: false,
      data: { messages: [], truncated: false },
    })

    render(<SessionUsagePanel sessionID="ses_1" />)

    expect(screen.getByText('This session has no assistant steps yet.')).toBeTruthy()
  })

  it('notes when only the newest steps were summarized', () => {
    mocks.useSessionUsage.mockReturnValue({
      summary: makeSummary(),
      isPending: false,
      isError: false,
      data: { messages: [], truncated: true },
    })

    render(<SessionUsagePanel sessionID="ses_1" />)

    expect(screen.getByText('Summarized from the 3 most recent steps.')).toBeTruthy()
  })

  it('reports an unreadable session', () => {
    mocks.useSessionUsage.mockReturnValue({
      summary: undefined,
      isPending: false,
      isError: true,
      error: new Error('boom'),
      data: undefined,
    })

    render(<SessionUsagePanel sessionID="ses_1" />)

    expect(screen.getByText('Session usage unavailable')).toBeTruthy()
    expect(screen.getByText('boom')).toBeTruthy()
  })
})
