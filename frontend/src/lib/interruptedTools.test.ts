import { describe, expect, it } from 'vitest'
import type {
  SessionMessageAssistant,
  SessionMessageAssistantTool,
  SessionMessageInfo,
} from '@opencode-manager/shared/opencode'
import { TURN_STALL_THRESHOLD_MS, interruptedToolIDs } from './interruptedTools'

const toolWithState = (id: string, state: SessionMessageAssistantTool['state'], created = 1_000): SessionMessageAssistantTool => ({
  type: 'tool',
  id,
  name: 'read',
  state,
  time: { created },
})

const streamingTool = (id: string, created = 1_000, input = '{"path"'): SessionMessageAssistantTool =>
  toolWithState(id, { status: 'streaming', input }, created)

type AssistantExtra = Partial<Pick<SessionMessageAssistant, 'time'>>

const assistant = (content: SessionMessageAssistant['content'], extra: AssistantExtra = {}): SessionMessageInfo => ({
  id: 'msg-assistant',
  type: 'assistant',
  agent: 'build',
  model: { providerID: 'provider', id: 'model' },
  content,
  time: { created: 0, ...extra.time },
})

const idle = (): SessionMessageInfo => ({ id: 'msg-idle', type: 'idle', outcome: 'succeeded', time: { created: 0 } })

describe('interruptedToolIDs', () => {
  it('marks streaming parts interrupted when the turn recorded a completion time', () => {
    const messages = [assistant([streamingTool('t1')], { time: { created: 0, completed: 2_000 } })]

    expect(interruptedToolIDs(messages, new Map(), 2_000)).toEqual(new Set(['t1']))
  })

  it('marks streaming parts interrupted when an idle message follows the assistant message', () => {
    const messages = [assistant([streamingTool('t1')]), idle()]

    expect(interruptedToolIDs(messages, new Map(), 2_000)).toEqual(new Set(['t1']))
  })

  it('leaves a freshly created streaming part alone while the turn is open', () => {
    const messages = [assistant([streamingTool('t1', 1_000)])]

    expect(interruptedToolIDs(messages, new Map(), 1_000 + 1_000)).toEqual(new Set())
  })

  it('marks an old streaming part interrupted when the turn never ended', () => {
    const messages = [assistant([streamingTool('t1', 1_000)])]

    expect(interruptedToolIDs(messages, new Map(), 1_000 + TURN_STALL_THRESHOLD_MS)).toEqual(new Set(['t1']))
  })

  it('never returns running, completed, or error parts', () => {
    const messages = [
      assistant([
        toolWithState('t1', { status: 'running', input: {}, metadata: {} }),
        toolWithState('t2', { status: 'completed', input: {}, content: [{ type: 'text', text: 'ok' }], metadata: {} }),
        toolWithState('t3', {
          status: 'error',
          input: {},
          error: { type: 'tool.failed', message: 'boom' },
          metadata: {},
        }),
      ]),
    ]

    expect(interruptedToolIDs(messages, new Map(), 1_000 + TURN_STALL_THRESHOLD_MS * 10)).toEqual(new Set())
  })

  it('returns an empty set when there are no streaming tool parts', () => {
    const messages = [assistant([{ type: 'text', text: 'hello' }])]

    expect(interruptedToolIDs(messages, new Map(), 1_000 + TURN_STALL_THRESHOLD_MS * 10)).toEqual(new Set())
  })

  it('treats a part observed changing more recently than the threshold as still active', () => {
    const messages = [assistant([streamingTool('t1', 1_000)])]
    const now = 1_000 + TURN_STALL_THRESHOLD_MS * 2

    expect(interruptedToolIDs(messages, new Map([['t1', now - 1_000]]), now)).toEqual(new Set())
  })
})
