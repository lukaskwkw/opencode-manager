import { describe, expect, it } from 'vitest'
import type {
  SessionMessageAssistant,
  SessionMessageAssistantTool,
  SessionMessageInfo,
} from '@opencode-manager/shared/opencode'
import { summarizeSessionUsage, sessionModelRefs } from './sessionUsage'

const TOKENS = { input: 100, output: 50, reasoning: 10, cache: { read: 20, write: 5 } }

function assistant(overrides: Partial<SessionMessageAssistant> = {}): SessionMessageInfo {
  return {
    id: 'msg_1',
    type: 'assistant',
    time: { created: 1_000, streamed: 3_000, completed: 3_500 },
    agent: 'build',
    model: { providerID: 'opencode-go', id: 'deepseek-v4.1-flash' },
    content: [],
    tokens: TOKENS,
    cost: 0.01,
    ...overrides,
  } as SessionMessageAssistant
}

function toolPart(
  name: string,
  status: 'completed' | 'error' | 'running',
  durationMs?: number,
): SessionMessageAssistantTool {
  const state = status === 'completed'
    ? { status, input: {}, content: [{ type: 'text', text: 'ok' }] }
    : status === 'error'
      ? { status, input: {}, error: { name: 'Error', message: 'failed' } }
      : { status, input: {}, metadata: {} }
  return {
    type: 'tool',
    id: `tool_${name}_${status}`,
    name,
    state,
    time: {
      created: 1_000,
      ran: 1_100,
      ...(durationMs === undefined ? {} : { completed: 1_100 + durationMs }),
    },
  } as SessionMessageAssistantTool
}

describe('summarizeSessionUsage', () => {
  it('sums steps, tokens and cost over assistant messages only', () => {
    const summary = summarizeSessionUsage([
      assistant(),
      assistant({ id: 'msg_2' }),
      { id: 'user_1', type: 'user', time: { created: 0 }, text: 'hi' } as SessionMessageInfo,
    ])

    expect(summary.steps).toBe(2)
    expect(summary.tokens).toEqual({ input: 200, output: 100, reasoning: 20, cache: { read: 40, write: 10 } })
    expect(summary.cost).toBeCloseTo(0.02)
  })

  it('derives generated tokens per second from the timed steps', () => {
    const summary = summarizeSessionUsage([
      assistant(),
      assistant({ id: 'msg_2', time: { created: 5_000, completed: 9_000 } }),
    ])

    expect(summary.generated).toBe(120)
    expect(summary.streamMs).toBe(2_000)
    expect(summary.tokensPerSecond).toBe(30)
  })

  it('has no throughput without timed steps', () => {
    const summary = summarizeSessionUsage([assistant({ time: { created: 1_000, completed: 3_000 } })])

    expect(summary.tokensPerSecond).toBeNull()
  })

  it('drops steps outside the requested bounds', () => {
    const summary = summarizeSessionUsage(
      [
        assistant({ id: 'early', time: { created: 1_000, streamed: 3_000 } }),
        assistant({ id: 'late', time: { created: 5_000, streamed: 7_000 } }),
      ],
      { from: 4_000, to: 10_000 },
    )

    expect(summary.steps).toBe(1)
  })

  it('keeps only the requested models', () => {
    const summary = summarizeSessionUsage(
      [
        assistant(),
        assistant({ id: 'other', model: { providerID: 'anthropic', id: 'claude' } }),
      ],
      undefined,
      ['opencode-go/deepseek-v4.1-flash'],
    )

    expect(summary.steps).toBe(1)
    expect(summary.models.map((model) => model.model.providerID)).toEqual(['opencode-go'])
  })

  it('lists the model references used in the range', () => {
    const refs = sessionModelRefs(
      [
        assistant(),
        assistant({ id: 'other', model: { providerID: 'anthropic', id: 'claude' } }),
        assistant({ id: 'late', time: { created: 9_000, streamed: 11_000 } }),
      ],
      { from: 0, to: 8_000 },
    )

    expect(refs).toEqual(['anthropic/claude', 'opencode-go/deepseek-v4.1-flash'])
  })

  it('aggregates models by reference', () => {
    const summary = summarizeSessionUsage([
      assistant(),
      assistant({ id: 'msg_2' }),
      assistant({ id: 'msg_3', model: { providerID: 'anthropic', id: 'claude' }, cost: 0.5 }),
    ])

    expect(summary.models.map((model) => [model.model.providerID, model.steps])).toEqual([
      ['anthropic', 1],
      ['opencode-go', 2],
    ])
  })

  it('counts tool outcomes and median latency', () => {
    const summary = summarizeSessionUsage([
      assistant({
        content: [
          toolPart('bash', 'completed', 200),
          toolPart('bash', 'completed', 400),
          toolPart('bash', 'error'),
          toolPart('read', 'running'),
        ],
      }),
    ])

    expect(summary.tools.mode).toBe('detail')
    if (summary.tools.mode !== 'detail') return
    expect(summary.tools.totals).toEqual({ calls: 4, succeeded: 2, failed: 1, unfinished: 1 })
    expect(summary.tools.usage).toEqual([
      { name: 'bash', calls: 3, succeeded: 2, failed: 1, unfinished: 0, durationP50: 300 },
      { name: 'read', calls: 1, succeeded: 0, failed: 0, unfinished: 1, durationP50: undefined },
    ])
  })
})
