import { describe, expect, it } from 'vitest'
import {
  DEFAULT_USAGE_RANGE_SELECTION,
  fromDateTimeLocalValue,
  parseUsageRangeSelection,
  resolveUsageRangeBounds,
  serializeUsageRangeSelection,
  toDateTimeLocalValue,
  withUsageRange,
  type UsageRangeSelection,
} from './usageRange'

const DAY_MS = 24 * 60 * 60 * 1000

describe('resolveUsageRangeBounds', () => {
  it('resolves a fixed range from the clock', () => {
    expect(resolveUsageRangeBounds({ range: '15m', from: null, to: null }, 10 * DAY_MS)).toEqual({
      from: 10 * DAY_MS - 15 * 60 * 1000,
      to: 10 * DAY_MS,
    })
  })

  it('uses the stored bounds for a custom range', () => {
    const selection: UsageRangeSelection = { range: 'custom', from: 1_000, to: 2_000 }

    expect(resolveUsageRangeBounds(selection, 10 * DAY_MS)).toEqual({ from: 1_000, to: 2_000 })
  })

  it('refuses an incomplete or reversed custom range', () => {
    expect(resolveUsageRangeBounds({ range: 'custom', from: null, to: 2_000 })).toBeNull()
    expect(resolveUsageRangeBounds({ range: 'custom', from: 1_000, to: null })).toBeNull()
    expect(resolveUsageRangeBounds({ range: 'custom', from: 2_000, to: 2_000 })).toBeNull()
  })
})

describe('withUsageRange', () => {
  it('seeds a custom range with the last day when it has no bounds yet', () => {
    const selection = withUsageRange(DEFAULT_USAGE_RANGE_SELECTION, 'custom', 10 * DAY_MS)

    expect(selection).toEqual({ range: 'custom', from: 9 * DAY_MS, to: 10 * DAY_MS })
  })

  it('keeps existing custom bounds when the user returns to custom', () => {
    const selection = withUsageRange({ range: '7d', from: 1_000, to: 2_000 }, 'custom')

    expect(selection).toEqual({ range: 'custom', from: 1_000, to: 2_000 })
  })
})

describe('usage range storage', () => {
  it('round-trips a selection', () => {
    const selection: UsageRangeSelection = { range: 'custom', from: 1_000, to: 2_000 }

    expect(parseUsageRangeSelection(serializeUsageRangeSelection(selection))).toEqual(selection)
  })

  it('drops an unknown range or malformed payload', () => {
    expect(parseUsageRangeSelection(JSON.stringify({ range: '2w', from: null, to: null }))).toBeNull()
    expect(parseUsageRangeSelection('{oops')).toBeNull()
    expect(parseUsageRangeSelection(null)).toBeNull()
  })

  it('normalizes missing custom bounds', () => {
    expect(parseUsageRangeSelection(JSON.stringify({ range: '7d' }))).toEqual({
      range: '7d',
      from: null,
      to: null,
    })
  })
})

describe('datetime-local conversion', () => {
  it('round-trips a local timestamp to the minute', () => {
    const ms = new Date(2026, 9, 31, 14, 45).getTime()
    const value = toDateTimeLocalValue(ms)

    expect(value).toBe('2026-10-31T14:45')
    expect(fromDateTimeLocalValue(value)).toBe(ms)
  })

  it('treats an empty or invalid value as missing', () => {
    expect(fromDateTimeLocalValue('')).toBeNull()
    expect(fromDateTimeLocalValue('not-a-date')).toBeNull()
  })
})
