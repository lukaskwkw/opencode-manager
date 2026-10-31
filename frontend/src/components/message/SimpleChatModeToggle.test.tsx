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
})
