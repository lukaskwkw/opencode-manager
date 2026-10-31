import type { SessionStatsInfo } from '@opencode-manager/shared/opencode'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCompactTokens } from '@/lib/contextUsage'
import { tokenComposition, totalTokens, type TokenSlice } from '@/lib/usageStats'

const SLICE_CLASS: Record<TokenSlice['key'], string> = {
  input: 'bg-info',
  output: 'bg-success',
  reasoning: 'bg-warning',
  cacheRead: 'bg-muted-foreground/50',
  cacheWrite: 'bg-muted-foreground/25',
}

export function UsageTokenBreakdown({ tokens }: { tokens: SessionStatsInfo['tokens'] }) {
  const slices = tokenComposition(tokens)
  const total = totalTokens(tokens)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Token composition</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div
          className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label={`${formatCompactTokens(total)} tokens in total`}
        >
          {slices
            .filter((slice) => slice.value > 0)
            .map((slice) => (
              <div
                key={slice.key}
                className={SLICE_CLASS[slice.key]}
                style={{ width: `${slice.share * 100}%` }}
              />
            ))}
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
          {slices.map((slice) => (
            <div key={slice.key} className="flex min-w-0 items-center justify-between gap-2">
              <dt className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                <span className={`h-2 w-2 shrink-0 rounded-full ${SLICE_CLASS[slice.key]}`} aria-hidden="true" />
                <span className="truncate">{slice.label}</span>
              </dt>
              <dd className="shrink-0 tabular-nums text-foreground" title={`${slice.value.toLocaleString('en-US')} tokens`}>
                {formatCompactTokens(slice.value)}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
