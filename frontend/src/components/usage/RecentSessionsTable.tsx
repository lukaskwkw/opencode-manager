import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { SessionInfo, TokenUsageInfo } from '@opencode-manager/shared/opencode'
import type { Repo } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { findRepoForDirectory } from '@/components/navigation/sidebar-session-tree'
import { getSessionPath } from '@/lib/navigation'
import { formatCompactTokens } from '@/lib/contextUsage'
import { formatTokensPerSecond } from '@/lib/messageUsage'
import { summarizeSessionUsage } from '@/lib/sessionUsage'
import { useSessionUsageQueries } from '@/hooks/useSessionUsage'
import { formatCost, totalTokens } from '@/lib/usageStats'
import { formatShortRelativeTime, getDirectoryName } from '@/lib/utils'

const INITIAL_ROWS = 10
const ROW_STEP = 10

interface SessionUsageRow {
  session: SessionInfo
  title: string
  directory: string
  tokens: TokenUsageInfo
  total: number
  repoId: number | null
}

function usageRows(sessions: readonly SessionInfo[], repos: readonly Repo[]): SessionUsageRow[] {
  const repoList = [...repos]
  return sessions
    .map((session) => {
      const directory = session.location?.directory ?? ''
      const repo = findRepoForDirectory(repoList, directory)
      return {
        session,
        title: session.title?.trim() || 'Untitled session',
        directory: directory ? getDirectoryName(directory) : 'No directory',
        tokens: session.tokens,
        total: totalTokens(session.tokens),
        repoId: repo?.id ?? null,
      }
    })
    .filter((row) => row.session.cost > 0 || row.total > 0)
    .sort((left, right) => right.session.cost - left.session.cost || right.total - left.total)
}

function tabularPlaceholder(isPending: boolean): string {
  return isPending ? '…' : '—'
}

export function RecentSessionsTable({
  sessions,
  repos,
}: {
  sessions: readonly SessionInfo[]
  repos: readonly Repo[]
}) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_ROWS)
  const rows = usageRows(sessions, repos)
  const visibleRows = rows.slice(0, visibleCount)
  const usageQueries = useSessionUsageQueries(visibleRows.map((row) => row.session.id))

  return (
    <Card>
      <CardHeader className="flex-row items-baseline justify-between pb-3">
        <CardTitle className="text-sm font-medium">Sessions by spend</CardTitle>
        <span className="text-xs tabular-nums text-muted-foreground">
          {rows.length.toLocaleString('en-US')} {rows.length === 1 ? 'session' : 'sessions'}
        </span>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {rows.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">No session usage in this range.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr className="border-b border-border/60">
                    <th scope="col" className="px-4 py-2 text-left font-medium">Session</th>
                    <th scope="col" className="hidden whitespace-nowrap px-4 py-2 text-left font-medium lg:table-cell">Updated</th>
                    <th scope="col" className="whitespace-nowrap px-4 py-2 text-right font-medium">Steps</th>
                    <th scope="col" className="hidden whitespace-nowrap px-4 py-2 text-right font-medium sm:table-cell">Input</th>
                    <th scope="col" className="hidden whitespace-nowrap px-4 py-2 text-right font-medium sm:table-cell">Output</th>
                    <th scope="col" className="hidden whitespace-nowrap px-4 py-2 text-right font-medium md:table-cell">Cache read</th>
                    <th scope="col" className="whitespace-nowrap px-4 py-2 text-right font-medium">Avg tok/s</th>
                    <th scope="col" className="whitespace-nowrap px-4 py-2 text-right font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {visibleRows.map((row, index) => {
                    const query = usageQueries[index]
                    const summary = query?.data ? summarizeSessionUsage(query.data.messages) : undefined
                    const pending = query?.isPending ?? false
                    const stepsCell = summary === undefined
                      ? tabularPlaceholder(pending)
                      : summary.steps.toLocaleString('en-US')
                    const throughputCell = summary === undefined
                      ? tabularPlaceholder(pending)
                      : summary.tokensPerSecond === null
                        ? '—'
                        : formatTokensPerSecond(summary.tokensPerSecond)
                    return (
                      <tr key={row.session.id}>
                        <td className="max-w-0 px-4 py-2">
                          <div className="flex min-w-0 flex-col">
                            {row.repoId === null ? (
                              <span className="truncate">{row.title}</span>
                            ) : (
                              <Link
                                to={getSessionPath(row.repoId, row.session.id)}
                                className="truncate text-foreground hover:text-info hover:underline"
                                title={row.title}
                              >
                                {row.title}
                              </Link>
                            )}
                            <span className="truncate text-xs text-muted-foreground">{row.directory}</span>
                          </div>
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-2 text-xs text-muted-foreground lg:table-cell">
                          {formatShortRelativeTime(new Date(row.session.time.updated))}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-muted-foreground" title="Assistant steps">
                          {stepsCell}
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-2 text-right tabular-nums text-muted-foreground sm:table-cell">
                          {formatCompactTokens(row.tokens.input)}
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-2 text-right tabular-nums text-muted-foreground sm:table-cell">
                          {formatCompactTokens(row.tokens.output + row.tokens.reasoning)}
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-2 text-right tabular-nums text-muted-foreground md:table-cell">
                          {formatCompactTokens(row.tokens.cache.read)}
                        </td>
                        <td
                          className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-foreground"
                          title="Generated tokens per second of provider streaming"
                        >
                          {throughputCell}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums text-foreground">
                          {formatCost(row.session.cost)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {rows.length > visibleRows.length ? (
              <div className="flex justify-center border-t border-border/60 p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setVisibleCount((count) => Math.min(count + ROW_STEP, rows.length))}
                >
                  Show {Math.min(ROW_STEP, rows.length - visibleRows.length)} more
                </Button>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
