import type {
  SessionStatsInfo,
  SessionStatsToolTotals,
  SessionStatsToolUsage,
  SessionStatsTools,
} from '@opencode-manager/shared/opencode'
import { formatDuration } from '@/lib/utils'

export type UsageRange = '15m' | '1h' | '4h' | '8h' | '24h' | '48h' | '7d' | '30d' | '90d' | 'all' | 'custom'

export interface UsageRangeOption {
  key: UsageRange
  /** Compact label for range pickers. */
  label: string
  /** Human-readable span shown in the picker and on the page. */
  description: string
  durationMs: number | null
}

const MINUTE_MS = 60 * 1000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

export const USAGE_RANGES: readonly UsageRangeOption[] = [
  { key: '15m', label: '15m', description: 'Last 15 minutes', durationMs: 15 * MINUTE_MS },
  { key: '1h', label: '1h', description: 'Last 1 hour', durationMs: HOUR_MS },
  { key: '4h', label: '4h', description: 'Last 4 hours', durationMs: 4 * HOUR_MS },
  { key: '8h', label: '8h', description: 'Last 8 hours', durationMs: 8 * HOUR_MS },
  { key: '24h', label: '24h', description: 'Last 24 hours', durationMs: DAY_MS },
  { key: '48h', label: '48h', description: 'Last 48 hours', durationMs: 2 * DAY_MS },
  { key: '7d', label: '7d', description: 'Last 7 days', durationMs: 7 * DAY_MS },
  { key: '30d', label: '30d', description: 'Last 30 days', durationMs: 30 * DAY_MS },
  { key: '90d', label: '90d', description: 'Last 90 days', durationMs: 90 * DAY_MS },
  { key: 'all', label: 'All', description: 'All time', durationMs: null },
  { key: 'custom', label: 'Custom', description: 'Custom range', durationMs: null },
]

export interface UsageRangeBounds {
  from?: number
  to?: number
}

/** Query bounds for a fixed range option, or no bounds at all for the server's whole history. */
export function usageRangeBounds(range: Exclude<UsageRange, 'custom'>, now: number = Date.now()): UsageRangeBounds {
  const option = USAGE_RANGES.find((entry) => entry.key === range)
  if (!option || option.durationMs === null) return {}
  return { from: now - option.durationMs, to: now }
}

/** Whether the range spans whole days, which is what the server's daily activity buckets need. */
export function hasDailyActivityForBounds(bounds: UsageRangeBounds | null): boolean {
  if (bounds === null) return false
  if (bounds.from === undefined || bounds.to === undefined) return true
  return bounds.to - bounds.from >= DAY_MS
}

/** Dollar amount with enough precision to keep sub-cent costs visible. */
export function formatCost(cost: number): string {
  if (cost <= 0) return '$0'
  if (cost < 0.01) return `$${cost.toFixed(4)}`
  if (cost < 1) return `$${cost.toFixed(3)}`
  return `$${cost.toFixed(2)}`
}

export interface TokenSlice {
  key: 'input' | 'output' | 'reasoning' | 'cacheRead' | 'cacheWrite'
  label: string
  value: number
  share: number
}

const TOKEN_SLICES: ReadonlyArray<{ key: TokenSlice['key']; label: string; read: (tokens: SessionStatsInfo['tokens']) => number }> = [
  { key: 'input', label: 'Input', read: (tokens) => tokens.input },
  { key: 'output', label: 'Output', read: (tokens) => tokens.output },
  { key: 'reasoning', label: 'Reasoning', read: (tokens) => tokens.reasoning },
  { key: 'cacheRead', label: 'Cache read', read: (tokens) => tokens.cache.read },
  { key: 'cacheWrite', label: 'Cache write', read: (tokens) => tokens.cache.write },
]

/** Token counters normalized to their share of the range total. */
export function tokenComposition(tokens: SessionStatsInfo['tokens']): TokenSlice[] {
  const total = totalTokens(tokens)
  return TOKEN_SLICES.map(({ key, label, read }) => {
    const value = read(tokens)
    return { key, label, value, share: total > 0 ? value / total : 0 }
  })
}

export function totalTokens(tokens: SessionStatsInfo['tokens']): number {
  return tokens.input + tokens.output + tokens.reasoning + tokens.cache.read + tokens.cache.write
}

export interface ActivityBar {
  date: string
  steps: number
  /** Share of the range's busiest day, from 0 to 1. */
  height: number
}

/** Turns the server's active-day list into chart bars, keeping only the most recent window. */
export function activityBars(activity: SessionStatsInfo['activity'], limit = 45): ActivityBar[] {
  const recent = [...activity].sort((left, right) => left.date.localeCompare(right.date)).slice(-limit)
  const busiest = recent.reduce((max, day) => Math.max(max, day.steps), 0)
  return recent.map((day) => ({
    date: day.date,
    steps: day.steps,
    height: busiest > 0 ? day.steps / busiest : 0,
  }))
}

export interface ToolStats {
  totals: SessionStatsToolTotals
  rows: readonly SessionStatsToolUsage[]
}

/** Tool reliability totals and, when the server sends detail mode, the per-tool rows. */
export function toolStats(tools: SessionStatsTools): ToolStats | null {
  if (tools.mode === 'none') return null
  return {
    totals: tools.totals,
    rows: tools.mode === 'detail' ? tools.usage : [],
  }
}

/** Share of tool calls that succeeded, or null when the range has no calls. */
export function toolSuccessRate(totals: { calls: number; succeeded: number }): number | null {
  if (totals.calls <= 0) return null
  return totals.succeeded / totals.calls
}

/** Compact duration for tool latency percentiles, keeping sub-second values in milliseconds. */
export function formatToolDuration(ms: number | undefined): string {
  if (ms === undefined) return '—'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return formatDuration(ms)
}

/** Share of a token total as a percentage, keeping tiny but non-zero shares visible. */
export function formatTokenShare(share: number): string {
  const percent = share * 100
  if (percent <= 0) return '0%'
  if (percent < 1) return '<1%'
  if (percent < 10) return `${percent.toFixed(1)}%`
  return `${Math.round(percent)}%`
}

/** Human-readable span of the range the server actually aggregated. */
export function formatStatsRange(range: SessionStatsInfo['range']): string {
  const shortRange = range.to - range.from <= 2 * DAY_MS
  const format = (value: number) =>
    new Date(value).toLocaleString(undefined, shortRange
      ? { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { month: 'short', day: 'numeric' })
  return `${format(range.from)} – ${format(range.to)}`
}
