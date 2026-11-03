import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { SessionMessageAssistant, SessionMessageInfo } from '@opencode-manager/shared/opencode'
import { SessionUsagePanel } from './SessionUsagePanel'

const mocks = vi.hoisted(() => ({
  useSessionUsage: vi.fn(),
}))

vi.mock('@/hooks/useSessionUsage', () => ({
  useSessionUsage: mocks.useSessionUsage,
}))

const DEEPSEEK = { providerID: 'opencode-go', id: 'deepseek' }
const CLAUDE = { providerID: 'anthropic', id: 'claude' }

function assistant(overrides: Partial<SessionMessageAssistant>): SessionMessageInfo {
  return {
    id: 'msg_1',
    type: 'assistant',
    agent: 'build',
    model: DEEPSEEK,
    time: { created: 1_000, streamed: 3_000, completed: 3_500 },
    content: [],
    tokens: { input: 100, output: 50, reasoning: 0, cache: { read: 0, write: 0 } },
    cost: 0.01,
    ...overrides,
  } as SessionMessageAssistant
}

const DEEPSEEK_STEP = assistant({})
const CLAUDE_STEP = assistant({
  id: 'msg_2',
  model: CLAUDE,
  time: { created: 5_000, streamed: 7_000, completed: 7_500 },
  tokens: { input: 20, output: 10, reasoning: 0, cache: { read: 0, write: 0 } },
  cost: 0.5,
})

function mockMessages(messages: SessionMessageInfo[], truncated = false) {
  mocks.useSessionUsage.mockReturnValue({
    data: { messages, truncated },
    isPending: false,
    isError: false,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  mockMessages([DEEPSEEK_STEP, CLAUDE_STEP])
})

describe('SessionUsagePanel', () => {
  it('shows the session cost, throughput, tokens and steps', () => {
    render(<SessionUsagePanel sessionID="ses_1" />)

    expect(screen.getByText('$0.510')).toBeTruthy()
    expect(screen.getByText('15')).toBeTruthy()
    expect(screen.getByText('180')).toBeTruthy()
    expect(screen.getAllByText('Steps').length).toBeGreaterThan(0)
    expect(screen.getByText('2')).toBeTruthy()
  })

  it('scopes every number to the selected models and restores them with All models', async () => {
    const user = userEvent.setup()
    render(<SessionUsagePanel sessionID="ses_1" />)

    await user.click(screen.getByRole('combobox', { name: 'Model filter' }))
    await user.click(await screen.findByRole('option', { name: 'opencode-go/deepseek' }))

    expect(screen.getAllByText('$0.010').length).toBeGreaterThan(0)
    expect(screen.getByText('150')).toBeTruthy()
    expect(screen.getByText('25')).toBeTruthy()
    expect(screen.getAllByText('1').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('option', { name: 'All models' }))

    expect(screen.getByText('$0.510')).toBeTruthy()
    expect(screen.getByText('180')).toBeTruthy()
  })

  it('explains an empty session', () => {
    mockMessages([])

    render(<SessionUsagePanel sessionID="ses_1" />)

    expect(screen.getByText('No assistant steps in this range.')).toBeTruthy()
  })

  it('clears the model filter from the compact reset button', async () => {
    const user = userEvent.setup()
    render(<SessionUsagePanel sessionID="ses_1" />)

    await user.click(screen.getByRole('combobox', { name: 'Model filter' }))
    await user.click(await screen.findByRole('option', { name: 'opencode-go/deepseek' }))

    expect(screen.getAllByText('$0.010').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Reset filters' }))

    expect(screen.getByText('$0.510')).toBeTruthy()
  })

  it('notes when only the newest steps were summarized', () => {
    mockMessages([DEEPSEEK_STEP, CLAUDE_STEP], true)

    render(<SessionUsagePanel sessionID="ses_1" />)

    expect(screen.getByText('Summarized from the 2 most recent steps in this range.')).toBeTruthy()
  })

  it('reports an unreadable session', () => {
    mocks.useSessionUsage.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error('boom'),
    })

    render(<SessionUsagePanel sessionID="ses_1" />)

    expect(screen.getByText('Session usage unavailable')).toBeTruthy()
    expect(screen.getByText('boom')).toBeTruthy()
  })
})
