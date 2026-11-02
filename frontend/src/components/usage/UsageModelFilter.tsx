import { MultiSelect } from '@/components/ui/multi-select'

interface UsageModelFilterProps {
  models: readonly string[]
  selected: readonly string[]
  onChange: (models: string[]) => void
  disabled?: boolean
  className?: string
}

/** Multi-select of model references, where an empty selection means every model. */
export function UsageModelFilter({
  models,
  selected,
  onChange,
  disabled = false,
  className,
}: UsageModelFilterProps) {
  return (
    <MultiSelect
      value={[...selected]}
      onChange={onChange}
      options={models.map((model) => ({ value: model, label: model }))}
      allLabel="All models"
      ariaLabel="Model filter"
      placeholder="All models"
      searchPlaceholder="Search models..."
      emptyMessage="No models in this range"
      maxChips={1}
      disabled={disabled || models.length === 0}
      className={className}
    />
  )
}
