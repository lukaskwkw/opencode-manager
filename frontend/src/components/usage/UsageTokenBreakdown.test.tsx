import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UsageTokenBreakdown } from './UsageTokenBreakdown'

const TOKENS = { input: 50, output: 25, reasoning: 0, cache: { read: 25, write: 0 } }

describe('UsageTokenBreakdown', () => {
  it('shows each counter with its share of the total', () => {
    render(<UsageTokenBreakdown tokens={TOKENS} />)

    expect(screen.getByText('50%')).toBeTruthy()
    expect(screen.getAllByText('25%')).toHaveLength(2)
    expect(screen.getAllByText('0%')).toHaveLength(2)
  })

  it('reveals the counter detail when its bar segment is hovered', async () => {
    const user = userEvent.setup()
    const { container } = render(<UsageTokenBreakdown tokens={TOKENS} />)

    await user.hover(container.querySelector('[data-slice="cacheRead"]') as Element)

    expect((await screen.findAllByText('Cache read · 25 tokens · 25%')).length).toBeGreaterThan(0)
  })
})
