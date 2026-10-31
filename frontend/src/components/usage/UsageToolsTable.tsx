import type { SessionStatsTools } from '@opencode-manager/shared/opencode'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatToolDuration, toolStats, toolSuccessRate } from '@/lib/usageStats'

function successTone(rate: number | null): string {
  if (rate === null) return 'text-muted-foreground'
  if (rate >= 0.95) return 'text-success'
  if (rate >= 0.8) return 'text-warning'
  return 'text-destructive'
}

export function UsageToolsTable({ tools }: { tools: SessionStatsTools }) {
  const stats = toolStats(tools)
  if (!stats) return null

  const rate = toolSuccessRate(stats.totals)

  return (
    <Card>
      <CardHeader className="flex-row items-baseline justify-between pb-3">
        <CardTitle className="text-sm font-medium">Tool reliability</CardTitle>
        <span className={cn('text-xs tabular-nums', successTone(rate))}>
          {rate === null ? 'No calls' : `${Math.round(rate * 100)}% succeeded`}
        </span>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {stats.rows.length === 0 ? (
          <div className="grid grid-cols-4 gap-2 px-4 pb-4 text-center text-sm">
            <ToolCount label="Calls" value={stats.totals.calls} />
            <ToolCount label="Succeeded" value={stats.totals.succeeded} />
            <ToolCount label="Failed" value={stats.totals.failed} />
            <ToolCount label="Unfinished" value={stats.totals.unfinished} />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr className="border-b border-border/60">
                <th scope="col" className="px-4 py-2 text-left font-medium">Tool</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Calls</th>
                <th scope="col" className="hidden px-4 py-2 text-right font-medium sm:table-cell">Succeeded</th>
                <th scope="col" className="hidden px-4 py-2 text-right font-medium sm:table-cell">Failed</th>
                <th scope="col" className="hidden px-4 py-2 text-right font-medium sm:table-cell">Unfinished</th>
                <th scope="col" className="hidden px-4 py-2 text-right font-medium md:table-cell">p50</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {stats.rows.map((row) => (
                <tr key={row.name}>
                  <td className="max-w-0 truncate px-4 py-2 font-mono text-xs" title={row.name}>{row.name}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-foreground">{row.calls.toLocaleString('en-US')}</td>
                  <td className="hidden px-4 py-2 text-right tabular-nums text-success sm:table-cell">
                    {row.succeeded.toLocaleString('en-US')}
                  </td>
                  <td className="hidden px-4 py-2 text-right tabular-nums text-destructive sm:table-cell">
                    {row.failed.toLocaleString('en-US')}
                  </td>
                  <td className="hidden px-4 py-2 text-right tabular-nums text-muted-foreground sm:table-cell">
                    {row.unfinished.toLocaleString('en-US')}
                  </td>
                  <td className="hidden px-4 py-2 text-right tabular-nums text-muted-foreground md:table-cell">
                    {formatToolDuration(row.durationP50)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  )
}

function ToolCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-lg font-semibold tabular-nums text-foreground">{value.toLocaleString('en-US')}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}
