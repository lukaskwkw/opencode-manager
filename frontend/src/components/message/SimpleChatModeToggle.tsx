import { cn } from '@/lib/utils'

interface SimpleChatModeToggleProps {
  simpleChatMode: boolean
  onChange: (simpleChatMode: boolean) => void
}

const MODES = [
  { simple: false, label: 'Full', title: 'Full chat: tool calls, reasoning, diffs and agent details' },
  { simple: true, label: 'Simple', title: 'Simple chat: only your messages and the assistant replies' },
] as const

/** Segmented Full/Simple switch for the `simpleChatMode` preference, mirroring Settings → General. */
export function SimpleChatModeToggle({ simpleChatMode, onChange }: SimpleChatModeToggleProps) {
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
