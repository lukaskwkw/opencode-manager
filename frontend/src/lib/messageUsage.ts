import type { SessionMessageAssistant } from '@opencode-manager/shared/opencode'

/** Streams shorter than this cannot measure throughput meaningfully, so the footer omits tok/s. */
const MIN_STREAM_MS = 250

export interface AssistantTokenUsage {
  input: number
  output: number
  reasoning: number
  cacheRead: number
  cacheWrite: number
  /** Every token the provider billed for the step. */
  total: number
  /** Tokens the model produced itself, so reasoning tokens count as generated. */
  generated: number
}

/** Normalizes the provider token counters of one assistant message. */
export function assistantTokenUsage(
  tokens: SessionMessageAssistant['tokens'] | undefined,
): AssistantTokenUsage | null {
  if (!tokens) return null
  const { input, output, reasoning, cache } = tokens
  return {
    input,
    output,
    reasoning,
    cacheRead: cache.read,
    cacheWrite: cache.write,
    total: input + output + reasoning + cache.read + cache.write,
    generated: output + reasoning,
  }
}

/**
 * Milliseconds the provider spent streaming the response body.
 *
 * `time.streamed` marks the end of the stream before tool settlement, so it measures generation
 * time. Messages without it predate the field or are still streaming, so a throughput would either
 * be unknown or polluted by tool execution time.
 */
export function assistantStreamMs(time: SessionMessageAssistant['time']): number | null {
  if (time.streamed === undefined) return null
  const elapsed = time.streamed - time.created
  return elapsed > 0 ? elapsed : null
}

/** Generated tokens per second of provider streaming, or null when the timing is unusable. */
export function assistantTokensPerSecond(
  tokens: SessionMessageAssistant['tokens'] | undefined,
  time: SessionMessageAssistant['time'],
): number | null {
  const usage = assistantTokenUsage(tokens)
  const streamMs = assistantStreamMs(time)
  if (!usage || usage.generated <= 0 || streamMs === null || streamMs < MIN_STREAM_MS) return null
  return usage.generated / (streamMs / 1000)
}

/** Formats a throughput with at most two decimals and no trailing zeros. */
export function formatTokensPerSecond(value: number): string {
  return String(Number(value.toFixed(value >= 10 ? 1 : 2)))
}

/** Human-readable counter breakdown used as the footer tooltip. */
export function formatTokenBreakdown(usage: AssistantTokenUsage): string {
  return [
    `output ${formatCount(usage.output)}`,
    `reasoning ${formatCount(usage.reasoning)}`,
    `input ${formatCount(usage.input)}`,
    `cache read ${formatCount(usage.cacheRead)}`,
    `cache write ${formatCount(usage.cacheWrite)}`,
  ].join(' · ')
}

/** Stream timing explanation shown next to the breakdown in the footer tooltip. */
export function formatStreamTiming(ms: number | null): string | null {
  if (ms === null) return null
  return `streamed in ${(ms / 1000).toFixed(1)}s`
}

/** Full token story for the footer tooltip: counter breakdown plus stream timing. */
export function formatUsageTooltip(usage: AssistantTokenUsage, streamMs: number | null): string {
  return [formatTokenBreakdown(usage), formatStreamTiming(streamMs)].filter(Boolean).join(' · ')
}

function formatCount(value: number): string {
  return value.toLocaleString('en-US')
}
