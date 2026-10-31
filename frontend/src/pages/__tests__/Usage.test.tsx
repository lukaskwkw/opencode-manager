import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { SessionStatsInfo } from '@opencode-manager/shared/opencode'
import type { SessionInfo } from '@opencode-manager/shared/opencode'
import type { Repo } from '@/api/types'
import { Usage } from '../Usage'

const mocks = vi.hoisted(() => ({
  useSessionStats: vi.fn(),
  useSessionsAcrossDirectories: vi.fn(),
  useNavigableRepos: vi.fn(),
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

function renderUsage() {
  return render(
    <MemoryRouter>
      <Usage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.useSessionStats.mockReturnValue({ isPending: false, isError: false, data: makeStats() })
  mocks.useSessionsAcrossDirectories.mockReturnValue({ data: [makeSession()] })
  mocks.useNavigableRepos.mockReturnValue({ repos: REPOS })
})

describe('Usage', () => {
  it('shows the aggregated range metrics', () => {
    mocks.useSessionStats.mockReturnValue({ isPending: false, isError: false, data: makeStats() })

    renderUsage()

    expect(screen.getByText('Usage')).toBeTruthy()
    expect(screen.getAllByText('$0.420').length).toBeGreaterThan(0)
    expect(screen.getByText('12')).toBeTruthy()
    expect(screen.getByText('2 days')).toBeTruthy()
    expect(screen.getByText('anthropic/claude-sonnet')).toBeTruthy()
    expect(screen.getByText('bash')).toBeTruthy()
    expect(screen.getByText('80% succeeded')).toBeTruthy()
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
    })

    renderUsage()

    expect(screen.getByText('Usage unavailable')).toBeTruthy()
    expect(screen.getByText('404 Not Found')).toBeTruthy()
  })

  it('requests the selected range from the stats hook', async () => {
    const user = userEvent.setup()

    renderUsage()

    expect(mocks.useSessionStats).toHaveBeenLastCalledWith('30d')

    await user.click(screen.getByRole('tab', { name: 'All time' }))

    expect(mocks.useSessionStats).toHaveBeenLastCalledWith('all')
  })
})
