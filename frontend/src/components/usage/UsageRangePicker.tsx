import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  fromDateTimeLocalValue,
  resolveUsageRangeBounds,
  toDateTimeLocalValue,
  withUsageRange,
  type UsageRangeSelection,
} from '@/lib/usageRange'
import { USAGE_RANGES, type UsageRange } from '@/lib/usageStats'
import { cn } from '@/lib/utils'

interface UsageRangePickerProps {
  selection: UsageRangeSelection
  onChange: (selection: UsageRangeSelection) => void
  /** Horizontal alignment of the picker inside its row; defaults to end. */
  align?: 'start' | 'end'
  className?: string
}

/** Range selector shared by the usage page and the session usage panel, with custom bounds. */
export function UsageRangePicker({ selection, onChange, align = 'end', className }: UsageRangePickerProps) {
  const isCustom = selection.range === 'custom'
  const invalidBounds =
    isCustom
    && selection.from !== null
    && selection.to !== null
    && resolveUsageRangeBounds(selection) === null

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', align === 'end' ? 'justify-end' : 'justify-start', className)}>
      <Select
        value={selection.range}
        onValueChange={(value) => onChange(withUsageRange(selection, value as UsageRange))}
      >
        <SelectTrigger aria-label="Usage range" className="h-8 w-40 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end" className="max-h-80">
          {USAGE_RANGES.map((option) => (
            <SelectItem key={option.key} value={option.key} className="text-xs">
              {option.description}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isCustom ? (
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <Input
            type="datetime-local"
            aria-label="Usage range start"
            aria-invalid={invalidBounds}
            value={selection.from === null ? '' : toDateTimeLocalValue(selection.from)}
            max={selection.to === null ? undefined : toDateTimeLocalValue(selection.to)}
            onChange={(event) => onChange({ ...selection, from: fromDateTimeLocalValue(event.target.value) })}
            className="h-8 w-48 text-xs"
          />
          <span className="text-xs text-muted-foreground">–</span>
          <Input
            type="datetime-local"
            aria-label="Usage range end"
            aria-invalid={invalidBounds}
            value={selection.to === null ? '' : toDateTimeLocalValue(selection.to)}
            min={selection.from === null ? undefined : toDateTimeLocalValue(selection.from)}
            onChange={(event) => onChange({ ...selection, to: fromDateTimeLocalValue(event.target.value) })}
            className="h-8 w-48 text-xs"
          />
        </div>
      ) : null}
    </div>
  )
}
