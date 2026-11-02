import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SessionUsageSheet } from './SessionUsageSheet'

vi.mock('./SessionUsagePanel', () => ({
  SessionUsagePanel: ({ sessionID }: { sessionID: string }) => (
    <div data-testid="session-usage-panel">{sessionID}</div>
  ),
}))

function renderSheet(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <SessionUsageSheet isOpen onClose={vi.fn()} />
    </MemoryRouter>,
  )
}

describe('SessionUsageSheet', () => {
  it('opens the routed local session usage', () => {
    renderSheet('/repos/1/sessions/ses_1')

    expect(screen.getByRole('heading', { name: 'Usage' })).toBeInTheDocument()
    expect(screen.getByTestId('session-usage-panel')).toHaveTextContent('ses_1')
  })

  it('opens the routed linked-server session usage', () => {
    renderSheet('/servers/srv_kitchen/sessions/ses_remote')

    expect(screen.getByTestId('session-usage-panel')).toHaveTextContent('ses_remote')
  })

  it('renders nothing outside a session route', () => {
    const { container } = renderSheet('/repos/1')

    expect(container.firstChild).toBeNull()
  })
})
