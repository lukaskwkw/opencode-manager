import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UsageRangePicker } from './UsageRangePicker'

const FROM = new Date(2026, 9, 30, 8, 0).getTime()
const TO = new Date(2026, 9, 31, 8, 0).getTime()

describe('UsageRangePicker', () => {
  it('shows the current range and reports a new fixed range', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<UsageRangePicker selection={{ range: '30d', from: null, to: null }} onChange={onChange} />)

    expect(screen.getByRole('combobox', { name: 'Usage range' })).toHaveTextContent('Last 30 days')

    await user.click(screen.getByRole('combobox', { name: 'Usage range' }))
    await user.click(await screen.findByRole('option', { name: 'Last 15 minutes' }))

    expect(onChange).toHaveBeenCalledWith({ range: '15m', from: null, to: null })
  })

  it('seeds custom bounds when the custom range is chosen', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<UsageRangePicker selection={{ range: '7d', from: FROM, to: TO }} onChange={onChange} />)

    await user.click(screen.getByRole('combobox', { name: 'Usage range' }))
    await user.click(await screen.findByRole('option', { name: 'Custom range' }))

    expect(onChange).toHaveBeenCalledWith({ range: 'custom', from: FROM, to: TO })
  })

  it('renders from and to inputs for a custom selection and edits the start', () => {
    const onChange = vi.fn()
    render(<UsageRangePicker selection={{ range: 'custom', from: FROM, to: TO }} onChange={onChange} />)

    const start = screen.getByLabelText('Usage range start')
    expect(screen.getByLabelText('Usage range end')).toBeTruthy()

    fireEvent.change(start, { target: { value: '2026-10-30T09:30' } })

    expect(onChange).toHaveBeenCalledWith({
      range: 'custom',
      from: new Date(2026, 9, 30, 9, 30).getTime(),
      to: TO,
    })
  })
})
