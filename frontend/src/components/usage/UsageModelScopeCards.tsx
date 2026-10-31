import { Activity, Coins, ListOrdered } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCompactTokens } from '@/lib/contextUsage'
import { formatCost, totalTokens, type ModelUsageTotals } from '@/lib/usageStats'

interface ScopeMetric {
  label: string
  value: string
  detail: string
  icon: typeof Coins
}

/** Summary cards for the model-filtered scope, which can only show model-attributable numbers. */
export function UsageModelScopeCards({
  totals,
  modelCount,
}: {
  totals: ModelUsageTotals
  modelCount: number
}) {
  const metrics: ScopeMetric[] = [
    {
      label: 'Spend',
      value: formatCost(totals.cost),
      detail: `${modelCount} selected ${modelCount === 1 ? 'model' : 'models'}`,
      icon: Coins,
    },
    {
      label: 'Tokens',
      value: formatCompactTokens(totalTokens(totals.tokens)),
      detail: `${formatCompactTokens(totals.tokens.input)} in · ${formatCompactTokens(totals.tokens.output + totals.tokens.reasoning)} out`,
      icon: Activity,
    },
    {
      label: 'Steps',
      value: totals.steps.toLocaleString('en-US'),
      detail: 'across the selected models',
      icon: ListOrdered,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {metrics.map((metric) => (
        <Card key={metric.label}>
          <CardContent className="flex flex-col gap-1 p-4">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <metric.icon className="h-3.5 w-3.5" />
              {metric.label}
            </span>
            <span className="text-xl font-semibold tabular-nums text-foreground sm:text-2xl">{metric.value}</span>
            <span className="truncate text-xs text-muted-foreground" title={metric.detail}>{metric.detail}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
