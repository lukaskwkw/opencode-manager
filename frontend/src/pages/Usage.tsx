import { BarChart3 } from 'lucide-react'
import { Header } from '@/components/ui/header'
import { ErrorBanner } from '@/components/ui/error-banner'
import { ActivitySpinner } from '@/components/ui/activity-spinner'
import { UsageRangePicker } from '@/components/usage/UsageRangePicker'
import { UsageSummaryCards } from '@/components/usage/UsageSummaryCards'
import { UsageTokenBreakdown } from '@/components/usage/UsageTokenBreakdown'
import { UsageActivityChart } from '@/components/usage/UsageActivityChart'
import { UsageModelsTable } from '@/components/usage/UsageModelsTable'
import { UsageToolsTable } from '@/components/usage/UsageToolsTable'
import { RecentSessionsTable } from '@/components/usage/RecentSessionsTable'
import { useSessionStats } from '@/hooks/useSessionStats'
import { useSessionsAcrossDirectories } from '@/hooks/useOpenCode'
import { useNavigableRepos } from '@/hooks/useSidebarRepoGroups'
import { useUsageRangePreference } from '@/hooks/useUsageRangePreference'
import { formatStatsRange, hasDailyActivityForBounds } from '@/lib/usageStats'

const RECENT_SESSION_SOURCE_LIMIT = 100

export function Usage() {
  const [selection, setSelection] = useUsageRangePreference()
  const stats = useSessionStats(selection)
  const { data: sessions } = useSessionsAcrossDirectories([], {
    allDirectories: true,
    limit: RECENT_SESSION_SOURCE_LIMIT,
  })
  const { repos } = useNavigableRepos()
  const hasDailyActivity = hasDailyActivityForBounds(stats.bounds)

  return (
    <div className="flex h-full max-h-full min-w-0 flex-1">
      <div className="flex h-full max-h-full flex-1 flex-col overflow-hidden bg-gradient-to-br from-background via-background to-background">
        <Header>
          <div className="flex min-w-0 items-center gap-2">
            <BarChart3 className="h-5 w-5 shrink-0 text-muted-foreground" />
            <Header.Title>Usage</Header.Title>
          </div>
        </Header>

        <div className="container mx-auto flex-1 min-h-0 overflow-auto px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+60px)] sm:px-4 sm:pb-6">
          <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
            <UsageRangePicker selection={selection} onChange={setSelection} />
          </div>
          {stats.bounds === null ? (
            <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
              Choose a start and end time to see usage for a custom range.
            </div>
          ) : stats.isPending ? (
            <div className="flex items-center justify-center py-16">
              <ActivitySpinner className="h-6 w-6 text-muted-foreground" />
            </div>
          ) : stats.isError ? (
            <ErrorBanner
              title="Usage unavailable"
              summary="This OpenCode server could not return session statistics. It may be older than the version that exposes the stats endpoint."
              detail={stats.error instanceof Error ? stats.error.message : undefined}
            />
          ) : stats.data ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">
                {formatStatsRange(stats.data.range)} · aggregated by the OpenCode server
              </p>
              <UsageSummaryCards stats={stats.data} />
              <div className={hasDailyActivity ? 'grid gap-3 lg:grid-cols-2' : 'grid gap-3'}>
                <UsageTokenBreakdown tokens={stats.data.tokens} />
                {hasDailyActivity && <UsageActivityChart activity={stats.data.activity} />}
              </div>
              <UsageModelsTable models={stats.data.models} />
              <UsageToolsTable tools={stats.data.tools} />
              <RecentSessionsTable sessions={sessions} repos={repos} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
