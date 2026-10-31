import { formatOpenCodeModelRef } from '@opencode-manager/shared/opencode'
import type {
  SessionMessageAssistant,
  SessionMessageInfo,
  SessionStatsModelUsage,
  SessionStatsToolTotals,
  SessionStatsToolUsage,
  SessionStatsTools,
  TokenUsageInfo,
} from '@opencode-manager/shared/opencode'
import type { UsageRangeBounds } from './usageStats'
import { assistantStreamMs } from './messageUsage'

export interface SessionUsageSummary {
  steps: number
  tokens: TokenUsageInfo
  cost: number
  /** Output and reasoning tokens the model produced. */
  generated: number
  /** Provider streaming time of the steps that reported it. */
  streamMs: number
  /** Generated tokens per second of streaming, or null without timed steps. */
  tokensPerSecond: number | null
  models: SessionStatsModelUsage[]
  tools: SessionStatsTools
}

function emptyTokens(): TokenUsageInfo {
  return { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } }
}

function addTokens(target: TokenUsageInfo, source: TokenUsageInfo): void {
  target.input += source.input
  target.output += source.output
  target.reasoning += source.reasoning
  target.cache.read += source.cache.read
  target.cache.write += source.cache.write
}

function emptyToolTotals(): SessionStatsToolTotals {
  return { calls: 0, succeeded: 0, failed: 0, unfinished: 0 }
}

function isWithinBounds(created: number, bounds?: UsageRangeBounds): boolean {
  if (!bounds) return true
  if (bounds.from !== undefined && created < bounds.from) return false
  if (bounds.to !== undefined && created > bounds.to) return false
  return true
}

function median(values: readonly number[]): number | undefined {
  if (values.length === 0) return undefined
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : Math.round(sorted[middle])
}

interface ToolAccumulator {
  totals: SessionStatsToolTotals
  durations: number[]
}

function addModel(
  models: Map<string, SessionStatsModelUsage>,
  message: SessionMessageAssistant,
): void {
  const key = formatOpenCodeModelRef(message.model)
  const existing = models.get(key) ?? {
    model: message.model,
    steps: 0,
    tokens: emptyTokens(),
    cost: 0,
  }
  existing.steps += 1
  existing.cost += message.cost ?? 0
  if (message.tokens) addTokens(existing.tokens, message.tokens)
  models.set(key, existing)
}

function addTool(tools: Map<string, ToolAccumulator>, part: SessionMessageAssistant['content'][number]): void {
  if (part.type !== 'tool') return
  const entry = tools.get(part.name) ?? { totals: emptyToolTotals(), durations: [] }
  entry.totals.calls += 1
  if (part.state.status === 'completed') {
    entry.totals.succeeded += 1
    const completed = part.time.completed
    if (completed !== undefined) {
      const duration = completed - (part.time.ran ?? part.time.created)
      if (duration > 0) entry.durations.push(duration)
    }
  } else if (part.state.status === 'error') {
    entry.totals.failed += 1
  } else {
    entry.totals.unfinished += 1
  }
  tools.set(part.name, entry)
}

function isSelectedModel(message: SessionMessageAssistant, models?: readonly string[]): boolean {
  if (!models || models.length === 0) return true
  return models.includes(formatOpenCodeModelRef(message.model))
}

/**
 * Aggregates one session's assistant steps into the same shape the server uses for global stats,
 * so the Usage tables and cards render per-session data without a dedicated endpoint. Steps outside
 * the supplied bounds, or from other models, are skipped.
 */
export function summarizeSessionUsage(
  messages: readonly SessionMessageInfo[],
  bounds?: UsageRangeBounds,
  models?: readonly string[],
): SessionUsageSummary {
  const tokens = emptyTokens()
  const modelUsage = new Map<string, SessionStatsModelUsage>()
  const tools = new Map<string, ToolAccumulator>()
  let steps = 0
  let cost = 0
  let generated = 0
  let streamedGenerated = 0
  let streamMs = 0

  for (const message of messages) {
    if (message.type !== 'assistant') continue
    if (!isWithinBounds(message.time.created, bounds)) continue
    if (!isSelectedModel(message, models)) continue
    steps += 1
    cost += message.cost ?? 0
    if (message.tokens) {
      addTokens(tokens, message.tokens)
      const messageGenerated = message.tokens.output + message.tokens.reasoning
      generated += messageGenerated
      const messageStreamMs = assistantStreamMs(message.time)
      if (messageStreamMs !== null && messageGenerated > 0) {
        streamedGenerated += messageGenerated
        streamMs += messageStreamMs
      }
    }
    addModel(modelUsage, message)
    for (const part of message.content) addTool(tools, part)
  }

  const toolTotals = emptyToolTotals()
  const toolUsage: SessionStatsToolUsage[] = []
  for (const [name, entry] of tools) {
    toolTotals.calls += entry.totals.calls
    toolTotals.succeeded += entry.totals.succeeded
    toolTotals.failed += entry.totals.failed
    toolTotals.unfinished += entry.totals.unfinished
    toolUsage.push({ name, ...entry.totals, durationP50: median(entry.durations) })
  }

  return {
    steps,
    tokens,
    cost,
    generated,
    streamMs,
    tokensPerSecond: streamMs > 0 ? streamedGenerated / (streamMs / 1000) : null,
    models: [...modelUsage.values()].sort((left, right) => right.cost - left.cost),
    tools: { mode: 'detail', totals: toolTotals, usage: toolUsage.sort((left, right) => right.calls - left.calls) },
  }
}

/** Model references used by the steps inside the range, sorted for a stable picker order. */
export function sessionModelRefs(
  messages: readonly SessionMessageInfo[],
  bounds?: UsageRangeBounds,
): string[] {
  const refs = new Set<string>()
  for (const message of messages) {
    if (message.type !== 'assistant') continue
    if (!isWithinBounds(message.time.created, bounds)) continue
    refs.add(formatOpenCodeModelRef(message.model))
  }
  return [...refs].sort()
}
