import { describe, expect, it, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { DEFAULT_USAGE_RANGE_SELECTION, ALL_USAGE_RANGE_SELECTION } from '@/lib/usageRange'
import { useUsageRangePreference } from './useUsageRangePreference'

const STORAGE_KEY = 'test.usage-range'

beforeEach(() => {
  localStorage.clear()
})

describe('useUsageRangePreference', () => {
  it('defaults to the last 4 hours', () => {
    const { result } = renderHook(() => useUsageRangePreference(STORAGE_KEY))

    expect(result.current[0]).toEqual(DEFAULT_USAGE_RANGE_SELECTION)
  })

  it('accepts a caller fallback for the first visit', () => {
    const { result } = renderHook(() => useUsageRangePreference(STORAGE_KEY, ALL_USAGE_RANGE_SELECTION))

    expect(result.current[0]).toEqual(ALL_USAGE_RANGE_SELECTION)
  })

  it('restores a stored selection', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ range: 'custom', from: 1_000, to: 2_000 }))

    const { result } = renderHook(() => useUsageRangePreference(STORAGE_KEY))

    expect(result.current[0]).toEqual({ range: 'custom', from: 1_000, to: 2_000 })
  })

  it('falls back when storage holds an unknown range', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ range: '2w' }))

    const { result } = renderHook(() => useUsageRangePreference(STORAGE_KEY))

    expect(result.current[0]).toEqual(DEFAULT_USAGE_RANGE_SELECTION)
  })

  it('persists every change under its key', () => {
    const { result } = renderHook(() => useUsageRangePreference(STORAGE_KEY))

    act(() => result.current[1]({ range: 'custom', from: 1_000, to: 2_000 }))

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')).toEqual({
      range: 'custom',
      from: 1_000,
      to: 2_000,
    })
  })
})
