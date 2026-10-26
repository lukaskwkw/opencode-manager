import { describe, it, expect } from 'vitest'
import { EXTERNAL_STT_LANGUAGE_OPTIONS, normalizeExternalLanguage } from './sttLanguages'

describe('normalizeExternalLanguage', () => {
  it('returns auto for undefined', () => {
    expect(normalizeExternalLanguage(undefined)).toBe('auto')
  })

  it('returns auto for an empty string', () => {
    expect(normalizeExternalLanguage('')).toBe('auto')
  })

  it('returns auto for the auto sentinel', () => {
    expect(normalizeExternalLanguage('auto')).toBe('auto')
  })

  it('reduces a regional tag to its primary subtag', () => {
    expect(normalizeExternalLanguage('en-US')).toBe('en')
  })

  it('keeps a lowercase primary subtag', () => {
    expect(normalizeExternalLanguage('pl')).toBe('pl')
  })

  it('lowercases an uppercase primary subtag', () => {
    expect(normalizeExternalLanguage('PL')).toBe('pl')
  })
})

describe('EXTERNAL_STT_LANGUAGE_OPTIONS', () => {
  it('starts with auto-detect', () => {
    expect(EXTERNAL_STT_LANGUAGE_OPTIONS[0]).toEqual({ value: 'auto', label: 'Auto-detect' })
  })

  it('contains Polish', () => {
    expect(EXTERNAL_STT_LANGUAGE_OPTIONS).toContainEqual({ value: 'pl', label: 'Polish' })
  })
})
