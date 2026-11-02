import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SimpleChatModeToggle } from './SimpleChatModeToggle'

describe('SimpleChatModeToggle', () => {
  it('marks the active mode', () => {
    render(<SimpleChatModeToggle simpleChatMode={false} onChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Full' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Simple' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('writes the simple mode when it is selected', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SimpleChatModeToggle simpleChatMode={false} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Simple' }))

    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('does not write the mode that is already active', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SimpleChatModeToggle simpleChatMode onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Simple' }))

    expect(onChange).not.toHaveBeenCalled()
  })

  it('renders a single icon toggle in compact mode', () => {
    render(<SimpleChatModeToggle compact simpleChatMode={false} onChange={vi.fn()} />)

    const toggle = screen.getByRole('button', { name: 'Simple chat mode' })
    expect(toggle.getAttribute('aria-pressed')).toBe('false')
    expect(screen.queryByRole('button', { name: 'Full' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Simple' })).toBeNull()
  })

  it('switches the compact toggle to simple chat', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SimpleChatModeToggle compact simpleChatMode={false} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Simple chat mode' }))

    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('switches the compact toggle back to full chat', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SimpleChatModeToggle compact simpleChatMode onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Simple chat mode' }))

    expect(onChange).toHaveBeenCalledWith(false)
  })
})
