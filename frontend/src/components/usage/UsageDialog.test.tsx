import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { UsageDialog } from './UsageDialog'

vi.mock('./UsageDashboard', () => ({
  UsageDashboard: ({ onClose }: { onClose?: () => void }) => (
    <div data-testid="usage-dashboard">
      <button type="button" onClick={onClose}>Close usage</button>
    </div>
  ),
}))

function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}{location.search}</div>
}

function renderDialog(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <UsageDialog />
      <LocationDisplay />
    </MemoryRouter>,
  )
}

describe('UsageDialog', () => {
  it('opens the global usage dashboard with usage=open', () => {
    renderDialog('/repos/1/sessions/ses_1?usage=open')

    expect(screen.getByTestId('usage-dashboard')).toBeInTheDocument()
  })

  it('stays closed without the usage param', () => {
    renderDialog('/repos/1/sessions/ses_1')

    expect(screen.queryByTestId('usage-dashboard')).not.toBeInTheDocument()
  })

  it('removes the usage param when closed', async () => {
    const user = userEvent.setup()
    renderDialog('/repos/1/sessions/ses_1?usage=open')

    await user.click(screen.getByRole('button', { name: 'Close usage' }))

    expect(screen.getByTestId('location').textContent).toBe('/repos/1/sessions/ses_1')
  })
})
