import { describe, expect, it } from 'vitest'
import {
  activityBars,
  formatCost,
  formatToolDuration,
  tokenComposition,
  toolStats,
  toolSuccessRate,
  totalTokens,
  usageRangeBounds,
} from './usageStats'

const DAY_MS = 24 * 60 * 60 * 1000

describe('usageRangeBounds', () => {
  it('anchors a day range on the supplied clock', () => {
    const now = 10 * DAY_MS
    expect(usageRangeBounds('7d', now)).toEqual({ from: 3 * DAY_MS, to: now })
  })

  it('leaves the whole-history range unbounded', () => {
    expect(usageRangeBounds('all', 10 * DAY_MS)).toEqual({})
  })
})

describe('formatCost', () => {
  it('keeps sub-cent costs readable', () => {
    expect(formatCost(0.0015)).toBe('$0.0015')
  })

  it('scales precision with the amount', () => {
    expect(formatCost(0.42)).toBe('$0.420')
    expect(formatCost(12.345)).toBe('$12.35')
  })

  it('shows free ranges as zero', () => {
    expect(formatCost(0)).toBe('$0')
  })
})

describe('totalTokens', () => {
  it('includes every counter', () => {
    expect(totalTokens({ input: 1, output: 2, reasoning: 3, cache: { read: 4, write: 5 } })).toBe(15)
  })
})

describe('tokenComposition', () => {
  it('reports each counter as a share of the total', () => {
    const slices = tokenComposition({ input: 50, output: 25, reasoning: 0, cache: { read: 25, write: 0 } })
    expect(slices.map((slice) => slice.key)).toEqual(['input', 'output', 'reasoning', 'cacheRead', 'cacheWrite'])
    expect(slices.map((slice) => slice.share)).toEqual([0.5, 0.25, 0, 0.25, 0])
  })

  it('avoids a division by zero on an empty range', () => {
    const slices = tokenComposition({ input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } })
    expect(slices.every((slice) => slice.share === 0)).toBe(true)
  })
})

describe('activityBars', () => {
  it('scales heights against the busiest day in the window', () => {
    const bars = activityBars([
      { date: '2026-01-02', steps: 5 },
      { date: '2026-01-01', steps: 10 },
    ])
    expect(bars).toEqual([
      { date: '2026-01-01', steps: 10, height: 1 },
      { date: '2026-01-02', steps: 5, height: 0.5 },
    ])
  })

  it('keeps only the most recent days', () => {
    const activity = Array.from({ length: 5 }, (_, index) => ({
      date: `2026-01-0${index + 1}`,
      steps: index + 1,
    }))
    expect(activityBars(activity, 2).map((bar) => bar.date)).toEqual(['2026-01-04', '2026-01-05'])
  })

  it('handles an empty activity list', () => {
    expect(activityBars([])).toEqual([])
  })
})

describe('toolStats', () => {
  const totals = { calls: 10, succeeded: 8, failed: 1, unfinished: 1 }

  it('has no rows without tool data', () => {
    expect(toolStats({ mode: 'none' })).toBeNull()
  })

  it('exposes only totals in summary mode', () => {
    expect(toolStats({ mode: 'summary', totals })).toEqual({ totals, rows: [] })
  })

  it('exposes per-tool rows in detail mode', () => {
    const usage = [{ name: 'bash', calls: 2, succeeded: 2, failed: 0, unfinished: 0, durationP50: 42 }]
    expect(toolStats({ mode: 'detail', totals, usage })).toEqual({ totals, rows: usage })
  })
})

describe('toolSuccessRate', () => {
  it('divides successes by calls', () => {
    expect(toolSuccessRate({ calls: 4, succeeded: 3 })).toBe(0.75)
  })

  it('is unknown without calls', () => {
    expect(toolSuccessRate({ calls: 0, succeeded: 0 })).toBeNull()
  })
})

describe('formatToolDuration', () => {
  it('keeps sub-second latencies in milliseconds', () => {
    expect(formatToolDuration(240)).toBe('240ms')
  })

  it('falls back to the shared duration format above a second', () => {
    expect(formatToolDuration(65_000)).toBe('1m 5s')
  })

  it('marks missing latencies', () => {
    expect(formatToolDuration(undefined)).toBe('—')
  })
})
