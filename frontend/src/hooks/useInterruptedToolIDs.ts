import { useEffect, useMemo, useRef, useState } from 'react'
import type { SessionMessageInfo } from '@opencode-manager/shared/opencode'
import { interruptedToolIDs } from '@/lib/interruptedTools'

const RECOMPUTE_INTERVAL_MS = 15_000

function sameIDs(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) return false
  for (const id of a) {
    if (!b.has(id)) return false
  }
  return true
}

export function useInterruptedToolIDs(messages: SessionMessageInfo[]): ReadonlySet<string> {
  const lastChangeAt = useRef(new Map<string, number>())
  const lastSignature = useRef(new Map<string, string>())
  const stable = useRef<ReadonlySet<string>>(new Set())
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), RECOMPUTE_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const seen = new Set<string>()
    const observedAt = Date.now()
    messages.forEach((message) => {
      if (message.type !== 'assistant') return
      message.content.forEach((part) => {
        if (part.type !== 'tool' || part.state.status !== 'streaming') return
        seen.add(part.id)
        const signature = part.state.input
        const previousSignature = lastSignature.current.get(part.id)
        if (previousSignature === undefined) {
          lastChangeAt.current.set(part.id, part.time.ran ?? part.time.created)
          lastSignature.current.set(part.id, signature)
          return
        }
        if (previousSignature !== signature) {
          lastChangeAt.current.set(part.id, observedAt)
          lastSignature.current.set(part.id, signature)
        }
      })
    })
    for (const id of [...lastChangeAt.current.keys()]) {
      if (seen.has(id)) continue
      lastChangeAt.current.delete(id)
      lastSignature.current.delete(id)
    }
  }, [messages])

  const computed = useMemo(
    () => interruptedToolIDs(messages, lastChangeAt.current, now),
    [messages, now],
  )

  if (!sameIDs(stable.current, computed)) {
    stable.current = computed
  }

  return stable.current
}
