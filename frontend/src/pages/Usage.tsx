import { useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { Header } from '@/components/ui/header'
import { ErrorBanner } from '@/components/ui/error-banner'
import { ActivitySpinner } from '@/components/ui/activity-spinner'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UsageSummaryCards } from '@/components/usage/UsageSummaryCards'
import { UsageTokenBreakdown } from '@/components/usage/UsageTokenBreakdown'
import { UsageActivityChart } from '@/components/usage/UsageActivityChart'
import { UsageModelsTable } from '@/components/usage/UsageModelsTable'
import { UsageToolsTable } from '@/components/usage/UsageToolsTable'
import { RecentSessionsTable } from '@/components/usage/RecentSessionsTable'
import { useSessionStats } from '@/hooks/useSessionStats'
import { useSessionsAcrossDirectories } from '@/hooks/useOpenCode'
import { useNavigableRepos } from '@/hooks/useSidebarRepoGroups'
import { formatStatsRange, USAGE_RANGES, type UsageRange } from '@/lib/usageStats'

const RECENT_SESSION_SOURCE_LIMIT = 50

export function Usage() {
  const [range, setRange] = useState<UsageRange>('30d')
  const stats = useSessionStats(range)
  const { data: sessions } = useSessionsAcrossDirectories([], {
    allDirectories: true,
    limit: RECENT_SESSION_SOURCE_LIMIT,
  })
  const { repos } = useNavigableRepos()

  return (
    <div className="flex h-full max-h-full min-w-0 flex-1">
      <div className="flex h-full max-h-full flex-1 flex-col overflow-hidden bg-gradient-to-br from-background via-background to-background">
        <Header>
          <div className="flex min-w-0 items-center gap-2">
            <BarChart3 className="h-5 w-5 shrink-0 text-muted-foreground" />
            <Header.Title>Usage</Header.Title>
          </div>
          <Header.Actions>
            <Tabs value={range} onValueChange={(value) => setRange(value as UsageRange)}>
              <TabsList className="h-8">
                {USAGE_RANGES.map((option) => (
                  <TabsTrigger key={option.key} value={option.key} className="px-2.5 text-xs">
                    {option.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </Header.Actions>
        </Header>

        <div className="container mx-auto flex-1 min-h-0 overflow-auto px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+60px)] sm:px-4 sm:pb-6">
          {stats.isPending ? (
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
              <div className="grid gap-3 lg:grid-cols-2">
                <UsageTokenBreakdown tokens={stats.data.tokens} />
                <UsageActivityChart activity={stats.data.activity} />
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <UsageModelsTable models={stats.data.models} />
                <UsageToolsTable tools={stats.data.tools} />
              </div>
              <RecentSessionsTable sessions={sessions} repos={repos} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
