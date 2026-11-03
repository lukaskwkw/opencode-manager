import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Clears the active usage filters and returns to the default range. */
export function UsageResetFiltersButton({
  onReset,
  iconOnly = false,
  className,
}: {
  onReset: () => void
  /** Renders only the icon, for narrow panel toolbars. */
  iconOnly?: boolean
  className?: string
}) {
  if (iconOnly) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onReset}
        aria-label="Reset filters"
        title="Reset filters"
        className={cn('text-muted-foreground', className)}
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onReset}
      className={cn('h-8 gap-1 px-2 text-xs text-muted-foreground', className)}
    >
      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
      Reset filters
    </Button>
  )
}
