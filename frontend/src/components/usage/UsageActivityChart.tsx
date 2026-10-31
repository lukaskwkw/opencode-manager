import type { SessionStatsInfo } from '@opencode-manager/shared/opencode'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { activityBars } from '@/lib/usageStats'

const MIN_VISIBLE_HEIGHT = 4

export function UsageActivityChart({ activity }: { activity: SessionStatsInfo['activity'] }) {
  const bars = activityBars(activity)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Steps per day</CardTitle>
      </CardHeader>
      <CardContent>
        {bars.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No recorded activity in this range.</p>
        ) : (
          <div className="flex h-28 items-end gap-[2px]" aria-hidden="true">
            {bars.map((bar) => (
              <div
                key={bar.date}
                className="group flex h-full flex-1 items-end"
                title={`${bar.date}: ${bar.steps.toLocaleString('en-US')} steps`}
              >
                <div
                  className="w-full rounded-t-sm bg-info/70 transition-colors group-hover:bg-info"
                  style={{
                    height: bar.steps > 0
                      ? `${Math.max(bar.height * 100, MIN_VISIBLE_HEIGHT)}%`
                      : '1px',
                  }}
                />
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          One bar per active day; the height is that day's step count.
        </p>
      </CardContent>
    </Card>
  )
}
