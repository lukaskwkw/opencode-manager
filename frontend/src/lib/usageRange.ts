import { USAGE_RANGES, usageRangeBounds, type UsageRange, type UsageRangeBounds } from './usageStats'

export interface UsageRangeSelection {
  range: UsageRange
  /** Custom range start, epoch ms; ignored by the fixed ranges. */
  from: number | null
  /** Custom range end, epoch ms; ignored by the fixed ranges. */
  to: number | null
}

export const DEFAULT_USAGE_RANGE_SELECTION: UsageRangeSelection = {
  range: '30d',
  from: null,
  to: null,
}

export const ALL_USAGE_RANGE_SELECTION: UsageRangeSelection = {
  range: 'all',
  from: null,
  to: null,
}

const CUSTOM_RANGE_DEFAULT_SPAN_MS = 24 * 60 * 60 * 1000

/** Bounds for a selection, or null when a custom range is incomplete or reversed. */
export function resolveUsageRangeBounds(
  selection: UsageRangeSelection,
  now: number = Date.now(),
): UsageRangeBounds | null {
  if (selection.range !== 'custom') return usageRangeBounds(selection.range, now)

  const { from, to } = selection
  if (from === null || to === null) return null
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return null
  return { from, to }
}

export function isUsageRange(value: unknown): value is UsageRange {
  return USAGE_RANGES.some((option) => option.key === value)
}

/** Switches the selection to a range, seeding a custom range with the last day. */
export function withUsageRange(
  selection: UsageRangeSelection,
  range: UsageRange,
  now: number = Date.now(),
): UsageRangeSelection {
  if (range !== 'custom') return { ...selection, range }
  if (selection.from !== null && selection.to !== null) return { ...selection, range }
  return { range, from: now - CUSTOM_RANGE_DEFAULT_SPAN_MS, to: now }
}

/** Parses a persisted selection, ignoring anything that no longer matches the supported ranges. */
export function parseUsageRangeSelection(raw: string | null): UsageRangeSelection | null {
  if (raw === null) return null
  try {
    const parsed = JSON.parse(raw) as Partial<UsageRangeSelection> | null
    if (parsed === null || typeof parsed !== 'object' || !isUsageRange(parsed.range)) return null
    return {
      range: parsed.range,
      from: typeof parsed.from === 'number' && Number.isFinite(parsed.from) ? parsed.from : null,
      to: typeof parsed.to === 'number' && Number.isFinite(parsed.to) ? parsed.to : null,
    }
  } catch {
    return null
  }
}

export function serializeUsageRangeSelection(selection: UsageRangeSelection): string {
  return JSON.stringify({ range: selection.range, from: selection.from, to: selection.to })
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** Local `datetime-local` value (`YYYY-MM-DDTHH:mm`) for an instant. */
export function toDateTimeLocalValue(ms: number): string {
  const date = new Date(ms)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Epoch milliseconds for a `datetime-local` value, or null when the input is empty or invalid. */
export function fromDateTimeLocalValue(value: string): number | null {
  if (value.trim() === '') return null
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : null
}
