import { useEffect, useMemo } from 'react'
import { BarChart3, X } from 'lucide-react'
import { formatOpenCodeModelRef } from '@opencode-manager/shared/opencode'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/ui/header'
import { ErrorBanner } from '@/components/ui/error-banner'
import { ActivitySpinner } from '@/components/ui/activity-spinner'
import { UsageRangePicker } from '@/components/usage/UsageRangePicker'
import { UsageModelFilter } from '@/components/usage/UsageModelFilter'
import { UsageResetFiltersButton } from '@/components/usage/UsageResetFiltersButton'
import { UsageModelScopeCards } from '@/components/usage/UsageModelScopeCards'
import { UsageSummaryCards } from '@/components/usage/UsageSummaryCards'
import { UsageTokenBreakdown } from '@/components/usage/UsageTokenBreakdown'
import { UsageActivityChart } from '@/components/usage/UsageActivityChart'
import { UsageModelsTable } from '@/components/usage/UsageModelsTable'
import { UsageToolsTable } from '@/components/usage/UsageToolsTable'
import { RecentSessionsTable } from '@/components/usage/RecentSessionsTable'
import { useSessionStats } from '@/hooks/useSessionStats'
import { useSessionsAcrossDirectories } from '@/hooks/useOpenCode'
import { useNavigableRepos } from '@/hooks/useSidebarRepoGroups'
import { useUsageModelsPreference } from '@/hooks/useUsageModelsPreference'
import { useUsageRangePreference } from '@/hooks/useUsageRangePreference'
import { DEFAULT_USAGE_RANGE_SELECTION } from '@/lib/usageRange'
import {
  filterModelUsage,
  formatStatsRange,
  hasDailyActivityForBounds,
  sumModelUsage,
} from '@/lib/usageStats'

const RECENT_SESSION_SOURCE_LIMIT = 100

/** Global usage dashboard, rendered in a full-screen panel from the usage dialog. */
export function UsageDashboard({ onClose }: { onClose?: () => void }) {
  const [selection, setSelection] = useUsageRangePreference()
  const [selectedModels, setSelectedModels] = useUsageModelsPreference()
  const stats = useSessionStats(selection)
  const { data: sessions } = useSessionsAcrossDirectories([], {
    allDirectories: true,
    limit: RECENT_SESSION_SOURCE_LIMIT,
  })
  const { repos } = useNavigableRepos()

  const modelRefs = useMemo(
    () => stats.data?.models.map((entry) => formatOpenCodeModelRef(entry.model)) ?? [],
    [stats.data],
  )

  useEffect(() => {
    if (stats.data === undefined) return
    const available = new Set(modelRefs)
    setSelectedModels((current) => {
      const next = current.filter((model) => available.has(model))
      return next.length === current.length ? current : next
    })
  }, [stats.data, modelRefs, setSelectedModels])

  const modelScope = useMemo(() => {
    if (!stats.data || selectedModels.length === 0) return null
    const models = filterModelUsage(stats.data.models, selectedModels)
    return { models, ...sumModelUsage(models) }
  }, [stats.data, selectedModels])

  const filtersActive = selectedModels.length > 0 || selection.range !== DEFAULT_USAGE_RANGE_SELECTION.range

  const resetFilters = () => {
    setSelectedModels([])
    setSelection(DEFAULT_USAGE_RANGE_SELECTION)
  }

  const hasDailyActivity = hasDailyActivityForBounds(stats.bounds)

  return (
    <div className="flex h-full max-h-full min-w-0 flex-1">
      <div className="flex h-full max-h-full flex-1 flex-col overflow-hidden bg-gradient-to-br from-background via-background to-background">
        <Header>
          <div className="flex min-w-0 items-center gap-2">
            <BarChart3 className="h-5 w-5 shrink-0 text-muted-foreground" />
            <Header.Title>Usage</Header.Title>
          </div>
          {onClose ? (
            <Header.Actions>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Close"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </Header.Actions>
          ) : null}
        </Header>

        <div className="container mx-auto flex-1 min-h-0 overflow-auto px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+60px)] sm:px-4 sm:pb-6">
          <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
            <UsageRangePicker selection={selection} onChange={setSelection} />
            <UsageModelFilter
              models={modelRefs}
              selected={selectedModels}
              onChange={setSelectedModels}
              className="w-full sm:w-72"
            />
            {filtersActive && <UsageResetFiltersButton onReset={resetFilters} />}
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
              {modelScope ? (
                <>
                  <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    Filtered to {modelScope.models.length} {modelScope.models.length === 1 ? 'model' : 'models'}.
                    {' '}Spend, tokens, steps and the model table cover only those models. Prompt, streak,
                    activity and tool reliability cannot be split per model, so they are hidden.
                  </div>
                  <UsageModelScopeCards totals={modelScope} modelCount={modelScope.models.length} />
                  <UsageTokenBreakdown tokens={modelScope.tokens} />
                  <UsageModelsTable models={modelScope.models} />
                </>
              ) : (
                <>
                  <UsageSummaryCards stats={stats.data} />
                  <div className={hasDailyActivity ? 'grid gap-3 lg:grid-cols-2' : 'grid gap-3'}>
                    <UsageTokenBreakdown tokens={stats.data.tokens} />
                    {hasDailyActivity && <UsageActivityChart activity={stats.data.activity} />}
                  </div>
                  <UsageModelsTable models={stats.data.models} />
                  <UsageToolsTable tools={stats.data.tools} />
                  <RecentSessionsTable sessions={sessions} repos={repos} />
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
