import { useCallback, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { OpenCodeClient, type SessionFileDiff } from '@/api/opencode'
import { Button } from '@/components/ui/button'
import { SideDrawer, SideDrawerHeader, SideDrawerContent } from '@/components/ui/side-drawer'
import { Loader2, ChevronRight, FileCode, FileDiff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SessionReviewPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionID: string
  directory?: string
  opcodeUrl: string
}

// odswiezanie diffow co 10s w trakcie pracy agenta
const REVIEW_REFRESH_INTERVAL_MS = 10000

type DiffStatus = 'added' | 'deleted' | 'modified'

// A = dodany (zielony), M = zmodyfikowany (zolty), D = usuniety (czerwony)
const STATUS_BADGE: Record<DiffStatus, { letter: string; className: string }> = {
  added: { letter: 'A', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  modified: { letter: 'M', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  deleted: { letter: 'D', className: 'bg-rose-500/15 text-rose-600 dark:text-rose-400' },
}

const resolveStatus = (diff: SessionFileDiff): DiffStatus => {
  if (diff.status === 'added' || diff.status === 'deleted') return diff.status
  if (diff.deletions > 0 && diff.additions === 0) return 'deleted'
  if (diff.additions > 0 && diff.deletions === 0) return 'added'
  return 'modified'
}

type DiffLineKind = 'add' | 'delete' | 'hunk' | 'header' | 'marker' | 'context'

const LINE_CLASS: Record<DiffLineKind, string> = {
  add: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
  delete: 'bg-rose-500/10 text-rose-800 dark:text-rose-300',
  hunk: 'bg-muted/60 text-muted-foreground font-semibold',
  header: 'bg-muted/30 text-muted-foreground',
  marker: 'text-muted-foreground italic',
  context: 'text-foreground',
}

// klasyfikacja linii unified diff: + dodane, - usuniete, @@ naglowek hunk, reszta kontekst
const classifyLine = (line: string): DiffLineKind => {
  if (line.startsWith('@@')) return 'hunk'
  if (line.startsWith('Index:') || line.startsWith('===')) return 'header'
  if (line.startsWith('---') || line.startsWith('+++')) return 'header'
  if (line.startsWith('\\')) return 'marker'
  if (line.startsWith('+')) return 'add'
  if (line.startsWith('-')) return 'delete'
  return 'context'
}

function DiffBody({ diff }: { diff: SessionFileDiff }) {
  const { patch } = diff

  // starsze serwery zwracaja pelne zawartosci before/after zamiast patcha
  if (patch === undefined) {
    const content = diff.status === 'deleted' ? diff.before ?? '' : diff.after ?? ''
    if (!content) {
      return <p className="text-xs text-muted-foreground px-2 py-2">No diff available for this file.</p>
    }
    return (
      <pre className="text-xs font-mono whitespace-pre-wrap break-words p-2 text-foreground max-h-[50vh] overflow-auto">
        {content}
      </pre>
    )
  }

  if (patch === '') {
    return <p className="text-xs text-muted-foreground px-2 py-2">Binary file - diff not available.</p>
  }

  const lines = patch.split('\n')
  if (lines[lines.length - 1] === '') lines.pop()

  return (
    <div className="font-mono text-xs max-h-[50vh] overflow-auto rounded-md border border-border">
      {lines.map((line, index) => {
        const kind = classifyLine(line)
        return (
          <div key={index} className={cn('whitespace-pre px-2 leading-5', LINE_CLASS[kind])}>
            {line || ' '}
          </div>
        )
      })}
    </div>
  )
}

export function SessionReviewPanel({
  open,
  onOpenChange,
  sessionID,
  directory,
  opcodeUrl,
}: SessionReviewPanelProps) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())

  const query = useQuery({
    queryKey: ['opencode', 'session', 'review', opcodeUrl, sessionID, directory],
    queryFn: () => new OpenCodeClient(opcodeUrl, directory).getSessionDiff(sessionID, directory),
    enabled: open && !!sessionID && !!opcodeUrl,
    refetchInterval: open ? REVIEW_REFRESH_INTERVAL_MS : false,
    refetchOnWindowFocus: false,
    staleTime: 5000,
  })

  // sortowanie plikow wg sciezki
  const diffs = useMemo(() => {
    const items = query.data ?? []
    return [...items].sort((a, b) => a.file.localeCompare(b.file))
  }, [query.data])

  const expandAll = useCallback(() => {
    setExpanded(new Set(diffs.map((d) => d.file)))
  }, [diffs])

  const collapseAll = useCallback(() => {
    setExpanded(new Set())
  }, [])

  const toggleFile = useCallback((file: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(file)) {
        next.delete(file)
      } else {
        next.add(file)
      }
      return next
    })
  }, [])

  const renderContent = () => {
    if (query.isLoading) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )
    }

    if (query.isError) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
          <p className="text-sm text-foreground">Failed to load review</p>
          <p className="text-xs text-muted-foreground max-w-full truncate">
            {query.error instanceof Error ? query.error.message : 'Unknown error'}
          </p>
          <Button variant="outline" size="sm" onClick={() => query.refetch()}>
            Retry
          </Button>
        </div>
      )
    }

    if (diffs.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
          <FileDiff className="w-8 h-8 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">No changes yet</p>
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-2">
        {diffs.map((diff) => {
          const status = resolveStatus(diff)
          const badge = STATUS_BADGE[status]
          const isExpanded = expanded.has(diff.file)
          const lastSlash = diff.file.lastIndexOf('/')
          const fileName = lastSlash >= 0 ? diff.file.slice(lastSlash + 1) : diff.file
          const dirPath = lastSlash >= 0 ? diff.file.slice(0, lastSlash) : ''

          return (
            <div key={diff.file} className="rounded-md border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => toggleFile(diff.file)}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-accent transition-colors"
                aria-expanded={isExpanded}
              >
                <ChevronRight
                  className={cn(
                    'w-4 h-4 flex-shrink-0 text-muted-foreground transition-transform',
                    isExpanded && 'rotate-90',
                  )}
                />
                <FileCode className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                <span className="text-sm font-medium truncate min-w-0 flex-1">{fileName}</span>
                {dirPath && (
                  <span className="text-xs text-muted-foreground truncate max-w-[40%]">{dirPath}</span>
                )}
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 font-semibold', badge.className)}>
                  {badge.letter}
                </span>
                <span className="text-xs flex-shrink-0 whitespace-nowrap">
                  {diff.additions > 0 && <span className="text-green-600 dark:text-green-400">+{diff.additions}</span>}
                  {diff.deletions > 0 && <span className="text-red-600 dark:text-red-400">-{diff.deletions}</span>}
                </span>
              </button>
              {isExpanded && (
                <div className="border-t border-border">
                  <DiffBody diff={diff} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <SideDrawer
      isOpen={open}
      onClose={() => onOpenChange(false)}
      side="right"
      widthClass="w-screen sm:w-[min(92vw,720px)]"
      ariaLabel="Session review"
    >
      <SideDrawerHeader
        title="Review"
        onClose={() => onOpenChange(false)}
        meta={
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {diffs.length} file{diffs.length === 1 ? '' : 's'}
            </span>
            {diffs.length > 0 && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={expandAll}>
                  Expand all
                </Button>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={collapseAll}>
                  Collapse all
                </Button>
              </div>
            )}
          </div>
        }
      />
      <SideDrawerContent>{renderContent()}</SideDrawerContent>
    </SideDrawer>
  )
}