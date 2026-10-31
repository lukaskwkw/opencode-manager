import { useEffect, useState } from 'react'
import {
  DEFAULT_USAGE_RANGE_SELECTION,
  parseUsageRangeSelection,
  serializeUsageRangeSelection,
  type UsageRangeSelection,
} from '@/lib/usageRange'

export const USAGE_RANGE_STORAGE_KEY = 'ocm.usage-range.v1'
export const SESSION_USAGE_RANGE_STORAGE_KEY = 'ocm.usage-range.session.v1'

function readSelection(storageKey: string, fallback: UsageRangeSelection): UsageRangeSelection {
  if (typeof window === 'undefined') return fallback
  try {
    return parseUsageRangeSelection(window.localStorage.getItem(storageKey)) ?? fallback
  } catch {
    return fallback
  }
}

function writeSelection(storageKey: string, selection: UsageRangeSelection): void {
  try {
    window.localStorage.setItem(storageKey, serializeUsageRangeSelection(selection))
  } catch {
    return
  }
}

/** Usage range selection persisted under its storage key, so a reload keeps the chosen window. */
export function useUsageRangePreference(
  storageKey: string = USAGE_RANGE_STORAGE_KEY,
  fallback: UsageRangeSelection = DEFAULT_USAGE_RANGE_SELECTION,
) {
  const [selection, setSelection] = useState<UsageRangeSelection>(() => readSelection(storageKey, fallback))

  useEffect(() => {
    writeSelection(storageKey, selection)
  }, [storageKey, selection])

  return [selection, setSelection] as const
}
