import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { SessionStatsInfo } from '@opencode-manager/shared/opencode'
import type { SessionInfo } from '@opencode-manager/shared/opencode'
import type { Repo } from '@/api/types'
import { UsageDashboard } from './UsageDashboard'

const mocks = vi.hoisted(() => ({
  useSessionStats: vi.fn(),
  useSessionsAcrossDirectories: vi.fn(),
  useNavigableRepos: vi.fn(),
  useSessionUsageQueries: vi.fn(),
}))

vi.mock('@/hooks/useSessionStats', () => ({
  useSessionStats: mocks.useSessionStats,
}))

vi.mock('@/hooks/useOpenCode', () => ({
  useSessionsAcrossDirectories: mocks.useSessionsAcrossDirectories,
}))

vi.mock('@/hooks/useSidebarRepoGroups', () => ({
  useNavigableRepos: mocks.useNavigableRepos,
}))

vi.mock('@/hooks/useSessionUsage', () => ({
  useSessionUsage: () => ({ summary: undefined, isPending: false, isError: false, data: undefined }),
  useSessionUsageQueries: mocks.useSessionUsageQueries,
}))

const TOKENS = { input: 1_000, output: 500, reasoning: 100, cache: { read: 2_000, write: 300 } }

function makeStats(overrides: Partial<SessionStatsInfo> = {}): SessionStatsInfo {
  return {
    range: { from: Date.UTC(2026, 0, 1), to: Date.UTC(2026, 0, 31) },
    sessions: 4,
    subagents: 1,
    prompts: 12,
    steps: 40,
    tokens: TOKENS,
    cost: 0.42,
    tools: {
      mode: 'detail',
      totals: { calls: 10, succeeded: 8, failed: 1, unfinished: 1 },
      usage: [{ name: 'bash', calls: 3, succeeded: 3, failed: 0, unfinished: 0, durationP50: 420 }],
    },
    activeDays: 3,
    streak: 2,
    activity: [
      { date: '2026-01-01', steps: 10 },
      { date: '2026-01-02', steps: 5 },
    ],
    models: [
      {
        model: { providerID: 'anthropic', id: 'claude-sonnet' },
        steps: 40,
        tokens: TOKENS,
        cost: 0.42,
      },
      {
        model: { providerID: 'openai', id: 'gpt-5' },
        steps: 10,
        tokens: { input: 10, output: 5, reasoning: 0, cache: { read: 0, write: 0 } },
        cost: 0.58,
      },
    ],
    ...overrides,
  } as SessionStatsInfo
}

function makeSession(overrides: Partial<SessionInfo> = {}): SessionInfo {
  return {
    id: 'ses_1',
    title: 'Refactor the parser',
    cost: 0.25,
    tokens: { input: 10, output: 20, reasoning: 0, cache: { read: 0, write: 0 } },
    time: { created: Date.UTC(2026, 0, 2), updated: Date.UTC(2026, 0, 2) },
    location: { directory: '/repos/alpha' },
    ...overrides,
  } as SessionInfo
}

const REPOS = [{ id: 7, name: 'alpha', fullPath: '/repos/alpha' }] as Repo[]

function makeAssistantStep() {
  return {
    id: 'msg_a1',
    type: 'assistant',
    time: { created: 0, streamed: 2_000, completed: 2_500 },
    agent: 'build',
    model: { providerID: 'opencode-go', id: 'deepseek-v4.1-flash' },
    content: [],
    tokens: { input: 0, output: 60, reasoning: 0, cache: { read: 0, write: 0 } },
    cost: 0,
  }
}

function renderUsage() {
  return render(
    <MemoryRouter>
      <UsageDashboard />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  mocks.useSessionStats.mockReturnValue({
    isPending: false,
    isError: false,
    data: makeStats(),
    bounds: { from: Date.UTC(2026, 0, 1), to: Date.UTC(2026, 0, 31) },
  })
  mocks.useSessionsAcrossDirectories.mockReturnValue({ data: [makeSession()] })
  mocks.useNavigableRepos.mockReturnValue({ repos: REPOS })
  mocks.useSessionUsageQueries.mockReturnValue([
    { data: { messages: [makeAssistantStep()], truncated: false }, isPending: false, isError: false },
  ])
})

describe('UsageDashboard', () => {
  it('shows the aggregated range metrics', () => {
    mocks.useSessionStats.mockReturnValue({
      isPending: false,
      isError: false,
      data: makeStats(),
      bounds: { from: Date.UTC(2026, 0, 1), to: Date.UTC(2026, 0, 31) },
    })

    renderUsage()

    expect(screen.getByText('Usage')).toBeTruthy()
    expect(screen.getAllByText('$0.420').length).toBeGreaterThan(0)
    expect(screen.getByText('12')).toBeTruthy()
    expect(screen.getByText('2 days')).toBeTruthy()
    expect(screen.getByText('anthropic')).toBeTruthy()
    expect(screen.getByText('claude-sonnet')).toBeTruthy()
    expect(screen.getByText('bash')).toBeTruthy()
    expect(screen.getByText('80% succeeded')).toBeTruthy()
  })

  it('adds per-session steps and average throughput to the session table', () => {
    renderUsage()

    expect(screen.getAllByText('Steps').length).toBeGreaterThan(0)
    expect(screen.getByText('Avg tok/s')).toBeTruthy()
    const row = screen.getByRole('link', { name: 'Refactor the parser' }).closest('tr')
    expect(row).not.toBeNull()
    expect(within(row as HTMLElement).getByText('1')).toBeTruthy()
    expect(within(row as HTMLElement).getByText('30')).toBeTruthy()
  })

  it('scopes the dashboard to the selected models and hides global-only sections', async () => {
    const user = userEvent.setup()

    renderUsage()

    expect(screen.getByText('Tool reliability')).toBeTruthy()
    expect(screen.getByText('Sessions by spend')).toBeTruthy()

    await user.click(screen.getByRole('combobox', { name: 'Model filter' }))
    await user.click(await screen.findByRole('option', { name: 'anthropic/claude-sonnet' }))

    expect(screen.getByText(/Filtered to 1 model/)).toBeTruthy()
    expect(screen.queryByText('Tool reliability')).toBeNull()
    expect(screen.queryByText('Sessions by spend')).toBeNull()
    expect(screen.queryByText('Steps per day')).toBeNull()
    expect(screen.queryByText('Prompts')).toBeNull()
    expect(screen.getAllByText('$0.420').length).toBeGreaterThan(0)
  })

  it('restores the model filter from local storage', () => {
    localStorage.setItem('ocm.usage-models.v1', JSON.stringify(['anthropic/claude-sonnet']))

    renderUsage()

    expect(screen.getByText(/Filtered to 1 model/)).toBeTruthy()
  })

  it('caps the model chips and resets the range and models together', async () => {
    const user = userEvent.setup()

    renderUsage()

    await user.click(screen.getByRole('combobox', { name: 'Usage range' }))
    await user.click(await screen.findByRole('option', { name: 'Last 15 minutes' }))
    await user.click(screen.getByRole('combobox', { name: 'Model filter' }))
    await user.click(await screen.findByRole('option', { name: 'anthropic/claude-sonnet' }))
    await user.click(screen.getByRole('option', { name: 'openai/gpt-5' }))

    expect(screen.getByText('+1 more')).toBeTruthy()
    expect(screen.getByText(/Filtered to 2 models/)).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Reset filters' }))

    expect(screen.queryByText(/Filtered to/)).toBeNull()
    expect(screen.getByRole('combobox', { name: 'Usage range' }).textContent).toBe('Last 4 hours')
    expect(mocks.useSessionStats).toHaveBeenLastCalledWith({ range: '4h', from: null, to: null })
  })

  it('lists the most expensive session with a link into the repo', () => {
    renderUsage()

    const link = screen.getByRole('link', { name: 'Refactor the parser' })
    expect(link.getAttribute('href')).toBe('/repos/7/sessions/ses_1')
    expect(screen.getByText('alpha')).toBeTruthy()
  })

  it('shows an empty session table when no session spent anything', () => {
    mocks.useSessionsAcrossDirectories.mockReturnValue({ data: [] })

    renderUsage()

    expect(screen.getByText('No session usage in this range.')).toBeTruthy()
  })

  it('explains an unavailable stats endpoint instead of failing silently', () => {
    mocks.useSessionStats.mockReturnValue({
      isPending: false,
      isError: true,
      error: new Error('404 Not Found'),
      bounds: { from: Date.UTC(2026, 0, 1), to: Date.UTC(2026, 0, 31) },
    })

    renderUsage()

    expect(screen.getByText('Usage unavailable')).toBeTruthy()
    expect(screen.getByText('404 Not Found')).toBeTruthy()
  })

  it('requests the selected range from the stats hook', async () => {
    const user = userEvent.setup()

    renderUsage()

    expect(mocks.useSessionStats).toHaveBeenLastCalledWith({ range: '4h', from: null, to: null })

    await user.click(screen.getByRole('combobox', { name: 'Usage range' }))
    await user.click(await screen.findByRole('option', { name: 'Last 15 minutes' }))

    expect(mocks.useSessionStats).toHaveBeenLastCalledWith({ range: '15m', from: null, to: null })
  })

  it('reveals custom from and to inputs for a custom range', async () => {
    const user = userEvent.setup()

    renderUsage()

    await user.click(screen.getByRole('combobox', { name: 'Usage range' }))
    await user.click(await screen.findByRole('option', { name: 'Custom range' }))

    expect(screen.getByLabelText('Usage range start')).toBeTruthy()
    expect(screen.getByLabelText('Usage range end')).toBeTruthy()
    expect(mocks.useSessionStats).toHaveBeenLastCalledWith(
      expect.objectContaining({ range: 'custom' }),
    )
  })

  it('asks for usable bounds before loading a custom range', () => {
    mocks.useSessionStats.mockReturnValue({
      isPending: false,
      isError: false,
      data: undefined,
      bounds: null,
    })

    renderUsage()

    expect(screen.getByText('Choose a start and end time to see usage for a custom range.')).toBeTruthy()
  })

  it('closes the panel from its header', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <MemoryRouter>
        <UsageDashboard onClose={onClose} />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
