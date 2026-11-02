import { useLocation } from 'react-router-dom'
import { SideDrawer, SideDrawerHeader } from '@/components/ui/side-drawer'
import { parseActivePickerSession } from '@/lib/navigation'
import { SessionUsagePanel } from './SessionUsagePanel'

/** Mobile presentation of the per-session usage panel, opened from the Workspace menu. */
export function SessionUsageSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { pathname } = useLocation()
  const { sessionId } = parseActivePickerSession(pathname)

  if (!sessionId) return null

  return (
    <SideDrawer
      isOpen={isOpen}
      onClose={onClose}
      side="right"
      widthClass="w-screen sm:w-[min(90vw,420px)]"
      className="pb-safe"
      ariaLabel="Session usage"
    >
      <SideDrawerHeader title="Usage" onClose={onClose} />
      <SessionUsagePanel sessionID={sessionId} />
    </SideDrawer>
  )
}
