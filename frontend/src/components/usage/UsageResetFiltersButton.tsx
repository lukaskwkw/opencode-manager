import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Clears the active usage filters and returns to the default range. */
export function UsageResetFiltersButton({
  onReset,
  className,
}: {
  onReset: () => void
  className?: string
}) {
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
