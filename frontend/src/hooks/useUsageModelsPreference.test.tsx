import { describe, expect, it, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { parseUsageModels, useUsageModelsPreference } from './useUsageModelsPreference'

const STORAGE_KEY = 'test.usage-models'

beforeEach(() => {
  localStorage.clear()
})

describe('useUsageModelsPreference', () => {
  it('starts with every model selected', () => {
    const { result } = renderHook(() => useUsageModelsPreference(STORAGE_KEY))

    expect(result.current[0]).toEqual([])
  })

  it('restores a stored selection', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(['provider-a/one', 'provider-b/two']))

    const { result } = renderHook(() => useUsageModelsPreference(STORAGE_KEY))

    expect(result.current[0]).toEqual(['provider-a/one', 'provider-b/two'])
  })

  it('falls back to every model when storage is unreadable', () => {
    localStorage.setItem(STORAGE_KEY, 'not json')

    const { result } = renderHook(() => useUsageModelsPreference(STORAGE_KEY))

    expect(result.current[0]).toEqual([])
  })

  it('persists every change under its key', () => {
    const { result } = renderHook(() => useUsageModelsPreference(STORAGE_KEY))

    act(() => result.current[1](['provider-a/one']))

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')).toEqual(['provider-a/one'])
  })
})

describe('parseUsageModels', () => {
  it('keeps only unique model references', () => {
    expect(parseUsageModels(JSON.stringify(['a', 'a', 'b', 7, '', null]))).toEqual(['a', 'b'])
  })

  it('ignores values that are not arrays', () => {
    expect(parseUsageModels(JSON.stringify({ models: ['a'] }))).toEqual([])
    expect(parseUsageModels(null)).toEqual([])
  })
})
