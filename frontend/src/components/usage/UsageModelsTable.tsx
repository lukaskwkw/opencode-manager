import { formatOpenCodeModelRef } from '@opencode-manager/shared/opencode'
import type { SessionStatsInfo } from '@opencode-manager/shared/opencode'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCompactTokens } from '@/lib/contextUsage'
import { formatCost } from '@/lib/usageStats'

export function UsageModelsTable({ models }: { models: SessionStatsInfo['models'] }) {
  const sorted = [...models].sort((left, right) => right.cost - left.cost)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Models</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {sorted.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">No model usage in this range.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr className="border-b border-border/60">
                <th scope="col" className="px-4 py-2 text-left font-medium">Model</th>
                <th scope="col" className="hidden px-4 py-2 text-right font-medium sm:table-cell">Steps</th>
                <th scope="col" className="hidden px-4 py-2 text-right font-medium sm:table-cell">Input</th>
                <th scope="col" className="hidden px-4 py-2 text-right font-medium sm:table-cell">Output</th>
                <th scope="col" className="hidden px-4 py-2 text-right font-medium md:table-cell">Cache read</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {sorted.map((entry) => {
                const label = formatOpenCodeModelRef(entry.model)
                return (
                  <tr key={label}>
                    <td className="max-w-0 truncate px-4 py-2" title={label}>{label}</td>
                    <td className="hidden px-4 py-2 text-right tabular-nums text-muted-foreground sm:table-cell">
                      {entry.steps.toLocaleString('en-US')}
                    </td>
                    <td className="hidden px-4 py-2 text-right tabular-nums text-muted-foreground sm:table-cell">
                      {formatCompactTokens(entry.tokens.input)}
                    </td>
                    <td className="hidden px-4 py-2 text-right tabular-nums text-muted-foreground sm:table-cell">
                      {formatCompactTokens(entry.tokens.output + entry.tokens.reasoning)}
                    </td>
                    <td className="hidden px-4 py-2 text-right tabular-nums text-muted-foreground md:table-cell">
                      {formatCompactTokens(entry.tokens.cache.read)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground">{formatCost(entry.cost)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  )
}
