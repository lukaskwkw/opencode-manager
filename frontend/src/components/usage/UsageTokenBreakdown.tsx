import type { SessionStatsInfo } from '@opencode-manager/shared/opencode'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatCompactTokens } from '@/lib/contextUsage'
import { formatTokenShare, tokenComposition, totalTokens, type TokenSlice } from '@/lib/usageStats'

const SLICE_CLASS: Record<TokenSlice['key'], string> = {
  input: 'bg-info',
  output: 'bg-success',
  reasoning: 'bg-warning',
  cacheRead: 'bg-muted-foreground/50',
  cacheWrite: 'bg-muted-foreground/25',
}

const TOOLTIP_DELAY_MS = 150

function sliceDetail(slice: TokenSlice): string {
  return `${slice.label} · ${slice.value.toLocaleString('en-US')} tokens · ${formatTokenShare(slice.share)}`
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
        <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
          <div
            className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted"
            role="img"
            aria-label={`${formatCompactTokens(total)} tokens in total`}
          >
            {slices
              .filter((slice) => slice.value > 0)
              .map((slice) => (
                <Tooltip key={slice.key}>
                  <TooltipTrigger asChild>
                    <div
                      data-slice={slice.key}
                      className={`${SLICE_CLASS[slice.key]} cursor-default`}
                      style={{ width: `${slice.share * 100}%` }}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {sliceDetail(slice)}
                  </TooltipContent>
                </Tooltip>
              ))}
          </div>
        </TooltipProvider>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
          {slices.map((slice) => (
            <div key={slice.key} className="flex min-w-0 items-center justify-between gap-2">
              <dt className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                <span className={`h-2 w-2 shrink-0 rounded-full ${SLICE_CLASS[slice.key]}`} aria-hidden="true" />
                <span className="truncate">{slice.label}</span>
              </dt>
              <dd className="shrink-0 tabular-nums text-foreground" title={sliceDetail(slice)}>
                {formatCompactTokens(slice.value)}
                <span className="ml-1 text-muted-foreground">{formatTokenShare(slice.share)}</span>
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
