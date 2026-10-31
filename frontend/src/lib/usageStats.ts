import type {
  SessionStatsInfo,
  SessionStatsToolTotals,
  SessionStatsToolUsage,
  SessionStatsTools,
} from '@opencode-manager/shared/opencode'
import { formatDuration } from '@/lib/utils'

export type UsageRange = '7d' | '30d' | '90d' | 'all'

export interface UsageRangeOption {
  key: UsageRange
  label: string
  days: number | null
}

export const USAGE_RANGES: readonly UsageRangeOption[] = [
  { key: '7d', label: '7 days', days: 7 },
  { key: '30d', label: '30 days', days: 30 },
  { key: '90d', label: '90 days', days: 90 },
  { key: 'all', label: 'All time', days: null },
]

const DAY_MS = 24 * 60 * 60 * 1000

export interface UsageRangeBounds {
  from?: number
  to?: number
}

/** Query bounds for a range option, or no bounds at all for the server's whole history. */
export function usageRangeBounds(range: UsageRange, now: number = Date.now()): UsageRangeBounds {
  const option = USAGE_RANGES.find((entry) => entry.key === range)
  if (!option || option.days === null) return {}
  return { from: now - option.days * DAY_MS, to: now }
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

/** Human-readable span of the range the server actually aggregated. */
export function formatStatsRange(range: SessionStatsInfo['range']): string {
  const format = (value: number) =>
    new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${format(range.from)} – ${format(range.to)}`
}
