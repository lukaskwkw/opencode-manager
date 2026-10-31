import { useMemo, type ReactNode } from 'react'
import { BarChart3 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { ActivitySpinner } from '@/components/ui/activity-spinner'
import { ErrorBanner } from '@/components/ui/error-banner'
import { UsageRangePicker } from './UsageRangePicker'
import { UsageTokenBreakdown } from './UsageTokenBreakdown'
import { UsageModelsTable } from './UsageModelsTable'
import { UsageToolsTable } from './UsageToolsTable'
import { useSessionUsage } from '@/hooks/useSessionUsage'
import {
  SESSION_USAGE_RANGE_STORAGE_KEY,
  useUsageRangePreference,
} from '@/hooks/useUsageRangePreference'
import { formatCompactTokens } from '@/lib/contextUsage'
import { formatTokensPerSecond } from '@/lib/messageUsage'
import { ALL_USAGE_RANGE_SELECTION, resolveUsageRangeBounds } from '@/lib/usageRange'
import { formatCost, totalTokens } from '@/lib/usageStats'
import { formatDuration } from '@/lib/utils'

interface SessionKpi {
  label: string
  value: string
  detail: string
}

/** Right-panel usage statistics for the open session, computed from its assistant steps. */
export function SessionUsagePanel({ sessionID }: { sessionID: string }) {
  const [selection, setSelection] = useUsageRangePreference(
    SESSION_USAGE_RANGE_STORAGE_KEY,
    ALL_USAGE_RANGE_SELECTION,
  )
  const bounds = useMemo(() => resolveUsageRangeBounds(selection), [selection])
  const { summary, isPending, isError, error, data } = useSessionUsage(sessionID, bounds)

  const shell = (content: ReactNode) => (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-border px-3 py-2">
        <UsageRangePicker selection={selection} onChange={setSelection} />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">{content}</div>
    </div>
  )

  if (bounds === null) {
    return shell(
      <p className="text-sm text-muted-foreground">
        Choose a start and end time to see this session's usage.
      </p>,
    )
  }

  if (isPending) {
    return shell(
      <div className="flex flex-1 items-center justify-center py-10">
        <ActivitySpinner className="h-5 w-5 text-muted-foreground" />
      </div>,
    )
  }

  if (isError) {
    return shell(
      <ErrorBanner
        title="Session usage unavailable"
        summary="The session steps could not be read from this OpenCode server."
        detail={error instanceof Error ? error.message : undefined}
      />,
    )
  }

  if (!summary || summary.steps === 0) {
    return shell(
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <BarChart3 className="h-6 w-6" />
        <p>No assistant steps in this range.</p>
      </div>,
    )
  }

  const tokens = summary.tokens
  const cost = summary.cost
  const toolCalls = summary.tools.mode === 'none' ? 0 : summary.tools.totals.calls
  const kpis: SessionKpi[] = [
    {
      label: 'Spend',
      value: formatCost(cost),
      detail: `${summary.models.length} ${summary.models.length === 1 ? 'model' : 'models'}`,
    },
    {
      label: 'Avg tokens/s',
      value: summary.tokensPerSecond === null ? '—' : formatTokensPerSecond(summary.tokensPerSecond),
      detail: summary.streamMs > 0
        ? `${formatCompactTokens(summary.generated)} generated in ${formatDuration(summary.streamMs)}`
        : 'No timed steps',
    },
    {
      label: 'Tokens',
      value: formatCompactTokens(totalTokens(tokens)),
      detail: `${formatCompactTokens(tokens.input)} in · ${formatCompactTokens(tokens.output + tokens.reasoning)} out`,
    },
    {
      label: 'Steps',
      value: summary.steps.toLocaleString('en-US'),
      detail: `${toolCalls.toLocaleString('en-US')} tool calls`,
    },
  ]

  return shell(
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="flex flex-col gap-0.5 p-3">
              <span className="text-xs text-muted-foreground">{kpi.label}</span>
              <span className="text-lg font-semibold tabular-nums text-foreground">{kpi.value}</span>
              <span className="truncate text-[11px] text-muted-foreground" title={kpi.detail}>{kpi.detail}</span>
            </CardContent>
          </Card>
        ))}
      </div>
      {summary.tools.mode === 'detail' && summary.tools.totals.calls > 0 && (
        <UsageToolsTable tools={summary.tools} />
      )}
      <UsageTokenBreakdown tokens={tokens} />
      <UsageModelsTable models={summary.models} />
      {data?.truncated ? (
        <p className="text-xs text-muted-foreground">
          Summarized from the {summary.steps.toLocaleString('en-US')} most recent steps in this range.
        </p>
      ) : null}
    </div>,
  )
}
