import { MessagesSquare } from 'lucide-react'
import { getIconToggleButtonClassName } from '@/components/ui/icon-toggle-button'
import { cn } from '@/lib/utils'

interface SimpleChatModeToggleProps {
  simpleChatMode: boolean
  onChange: (simpleChatMode: boolean) => void
  /** Renders a single icon button for the narrow mobile composer row. */
  compact?: boolean
}

const MODES = [
  { simple: false, label: 'Full', title: 'Full chat: tool calls, reasoning, diffs and agent details' },
  { simple: true, label: 'Simple', title: 'Simple chat: only your messages and the assistant replies' },
] as const

/** Segmented Full/Simple switch for the `simpleChatMode` preference, mirroring Settings → General. */
export function SimpleChatModeToggle({ simpleChatMode, onChange, compact = false }: SimpleChatModeToggleProps) {
  if (compact) {
    return (
      <button
        type="button"
        aria-label="Simple chat mode"
        aria-pressed={simpleChatMode}
        title={simpleChatMode
          ? 'Simple chat: only your messages and the assistant replies'
          : 'Full chat: tool calls, reasoning, diffs and agent details'}
        onClick={() => onChange(!simpleChatMode)}
        className={cn(
          getIconToggleButtonClassName(simpleChatMode),
          'flex h-11 w-11 shrink-0 items-center justify-center p-0',
        )}
      >
        <MessagesSquare className="h-5 w-5" />
      </button>
    )
  }

  return (
    <div
      role="group"
      aria-label="Chat detail mode"
      className="flex shrink-0 items-center gap-0.5 rounded-lg border border-border bg-muted p-0.5 shadow-md"
    >
      {MODES.map((mode) => {
        const selected = simpleChatMode === mode.simple
        return (
          <button
            key={mode.label}
            type="button"
            aria-pressed={selected}
            title={mode.title}
            onClick={() => {
              if (!selected) onChange(mode.simple)
            }}
            className={cn(
              'rounded-md px-2 py-1 text-[11px] font-medium leading-none transition-colors',
              selected
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {mode.label}
          </button>
        )
      })}
    </div>
  )
}
