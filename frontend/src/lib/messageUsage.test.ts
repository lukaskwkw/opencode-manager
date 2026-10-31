import { describe, expect, it } from 'vitest'
import {
  assistantStreamMs,
  assistantTokenUsage,
  assistantTokensPerSecond,
  formatStreamTiming,
  formatTokenBreakdown,
  formatTokensPerSecond,
} from './messageUsage'

function tokens(overrides: Partial<{
  input: number
  output: number
  reasoning: number
  cache: { read: number; write: number }
}> = {}) {
  return {
    input: 100,
    output: 40,
    reasoning: 10,
    cache: { read: 900, write: 5 },
    ...overrides,
  }
}

describe('assistantTokenUsage', () => {
  it('returns null when the provider reported no usage', () => {
    expect(assistantTokenUsage(undefined)).toBeNull()
  })

  it('sums every billed counter and counts reasoning as generated', () => {
    const usage = assistantTokenUsage(tokens())
    expect(usage).toEqual({
      input: 100,
      output: 40,
      reasoning: 10,
      cacheRead: 900,
      cacheWrite: 5,
      total: 1055,
      generated: 50,
    })
  })
})

describe('assistantStreamMs', () => {
  it('prefers the stream end over the settled end', () => {
    expect(assistantStreamMs({ created: 1_000, streamed: 3_000, completed: 9_000 })).toBe(2_000)
  })

  it('falls back to nothing without a stream timestamp', () => {
    expect(assistantStreamMs({ created: 1_000, completed: 4_000 })).toBeNull()
  })

  it('has no duration while the message is still streaming', () => {
    expect(assistantStreamMs({ created: 1_000 })).toBeNull()
  })

  it('rejects a non-positive elapsed time', () => {
    expect(assistantStreamMs({ created: 1_000, streamed: 1_000 })).toBeNull()
  })
})

describe('assistantTokensPerSecond', () => {
  it('divides generated tokens by the streaming time', () => {
    expect(assistantTokensPerSecond(tokens(), { created: 0, streamed: 2_000, completed: 20_000 })).toBe(25)
  })

  it('ignores steps without generated tokens', () => {
    const empty = tokens({ output: 0, reasoning: 0 })
    expect(assistantTokensPerSecond(empty, { created: 0, streamed: 2_000 })).toBeNull()
  })

  it('ignores steps too short to measure', () => {
    expect(assistantTokensPerSecond(tokens(), { created: 0, streamed: 100 })).toBeNull()
  })

  it('has no value without usage or timing', () => {
    expect(assistantTokensPerSecond(undefined, { created: 0, streamed: 2_000 })).toBeNull()
    expect(assistantTokensPerSecond(tokens(), { created: 0 })).toBeNull()
  })
})

describe('formatTokensPerSecond', () => {
  it('keeps one decimal above ten and two below', () => {
    expect(formatTokensPerSecond(45.26)).toBe('45.3')
    expect(formatTokensPerSecond(5.049)).toBe('5.05')
  })

  it('drops trailing zeros', () => {
    expect(formatTokensPerSecond(120)).toBe('120')
    expect(formatTokensPerSecond(12)).toBe('12')
  })
})

describe('formatTokenBreakdown', () => {
  it('lists every counter with thousands separators', () => {
    expect(formatTokenBreakdown(assistantTokenUsage(tokens({ cache: { read: 123_456, write: 0 } }))!)).toBe(
      'output 40 · reasoning 10 · input 100 · cache read 123,456 · cache write 0',
    )
  })
})

describe('formatStreamTiming', () => {
  it('formats the streaming time in seconds', () => {
    expect(formatStreamTiming(2_450)).toBe('streamed in 2.5s')
  })

  it('is absent without timing', () => {
    expect(formatStreamTiming(null)).toBeNull()
  })
})
