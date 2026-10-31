import { Link } from 'react-router-dom'
import type { SessionInfo } from '@opencode-manager/shared/opencode'
import type { Repo } from '@/api/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { findRepoForDirectory } from '@/components/navigation/sidebar-session-tree'
import { getSessionPath } from '@/lib/navigation'
import { formatCompactTokens } from '@/lib/contextUsage'
import { formatCost, totalTokens } from '@/lib/usageStats'
import { formatShortRelativeTime, getDirectoryName } from '@/lib/utils'

const RECENT_SESSION_LIMIT = 8

interface SessionUsageRow {
  session: SessionInfo
  title: string
  directory: string
  cost: number
  tokens: number
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
        cost: session.cost,
        tokens: totalTokens(session.tokens),
        repoId: repo?.id ?? null,
      }
    })
    .filter((row) => row.cost > 0 || row.tokens > 0)
    .sort((left, right) => right.cost - left.cost || right.tokens - left.tokens)
    .slice(0, RECENT_SESSION_LIMIT)
}

export function RecentSessionsTable({
  sessions,
  repos,
}: {
  sessions: readonly SessionInfo[]
  repos: readonly Repo[]
}) {
  const rows = usageRows(sessions, repos)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Sessions by spend</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {rows.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">No session usage in this range.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr className="border-b border-border/60">
                <th scope="col" className="px-4 py-2 text-left font-medium">Session</th>
                <th scope="col" className="hidden px-4 py-2 text-left font-medium sm:table-cell">Updated</th>
                <th scope="col" className="hidden px-4 py-2 text-right font-medium sm:table-cell">Tokens</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map((row) => (
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
                  <td className="hidden whitespace-nowrap px-4 py-2 text-xs text-muted-foreground sm:table-cell">
                    {formatShortRelativeTime(new Date(row.session.time.updated))}
                  </td>
                  <td className="hidden px-4 py-2 text-right tabular-nums text-muted-foreground sm:table-cell">
                    {formatCompactTokens(row.tokens)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-foreground">{formatCost(row.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  )
}
