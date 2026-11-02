import { useCallback } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useUrlParams } from '@/hooks/useUrlParams'
import { UsageDashboard } from './UsageDashboard'

/** Full-screen global usage panel, opened with `?usage=open`. */
export function UsageDialog() {
  const { searchParams, closePushedParams } = useUrlParams()
  const isOpen = searchParams.get('usage') === 'open'
  const close = useCallback(() => {
    closePushedParams((params) => params.delete('usage'))
  }, [closePushedParams])

  return (
    <Dialog open={isOpen} modal={false} onOpenChange={(open) => !open && close()}>
      <DialogContent
        fullscreen
        onInteractOutside={(event) => event.preventDefault()}
        onFocusOutside={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        className="!flex !flex-col !gap-0 overflow-hidden p-0"
      >
        <DialogTitle className="sr-only">Usage</DialogTitle>
        <UsageDashboard onClose={close} />
      </DialogContent>
    </Dialog>
  )
}
