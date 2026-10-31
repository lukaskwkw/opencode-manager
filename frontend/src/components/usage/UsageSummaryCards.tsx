import { Activity, Coins, Flame, MessageSquare } from 'lucide-react'
import type { SessionStatsInfo } from '@opencode-manager/shared/opencode'
import { Card, CardContent } from '@/components/ui/card'
import { formatCompactTokens } from '@/lib/contextUsage'
import { formatCost, totalTokens } from '@/lib/usageStats'

interface SummaryMetric {
  label: string
  value: string
  detail: string
  icon: typeof Coins
}

function summaryMetrics(stats: SessionStatsInfo): SummaryMetric[] {
  const tokens = stats.tokens
  return [
    {
      label: 'Spend',
      value: formatCost(stats.cost),
      detail: `${stats.models.length} ${stats.models.length === 1 ? 'model' : 'models'}`,
      icon: Coins,
    },
    {
      label: 'Tokens',
      value: formatCompactTokens(totalTokens(tokens)),
      detail: `${formatCompactTokens(tokens.input)} in · ${formatCompactTokens(tokens.output + tokens.reasoning)} out`,
      icon: Activity,
    },
    {
      label: 'Prompts',
      value: stats.prompts.toLocaleString('en-US'),
      detail: `${stats.steps.toLocaleString('en-US')} steps · ${stats.sessions.toLocaleString('en-US')} sessions`,
      icon: MessageSquare,
    },
    {
      label: 'Streak',
      value: `${stats.streak.toLocaleString('en-US')} ${stats.streak === 1 ? 'day' : 'days'}`,
      detail: `${stats.activeDays.toLocaleString('en-US')} active ${stats.activeDays === 1 ? 'day' : 'days'}`,
      icon: Flame,
    },
  ]
}

export function UsageSummaryCards({ stats }: { stats: SessionStatsInfo }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {summaryMetrics(stats).map((metric) => (
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
