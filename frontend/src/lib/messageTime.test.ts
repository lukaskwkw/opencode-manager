import { describe, expect, it } from 'vitest'
import { formatMessageTimestamp } from './messageTime'

const NOW = new Date(2026, 9, 31, 15, 0, 0).getTime()

describe('formatMessageTimestamp', () => {
  it('shows only the clock time for a message from today', () => {
    const created = new Date(2026, 9, 31, 9, 41, 12).getTime()

    expect(formatMessageTimestamp(created, NOW)).toBe(new Date(created).toLocaleTimeString())
  })

  it('prefixes the date for a message from an earlier day', () => {
    const created = new Date(2026, 9, 29, 9, 41, 12).getTime()

    expect(formatMessageTimestamp(created, NOW)).toBe(
      `${new Date(created).toLocaleDateString()} ${new Date(created).toLocaleTimeString()}`,
    )
  })
})
