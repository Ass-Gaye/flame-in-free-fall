import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { X } from 'lucide-react'

import { SidebarNav } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'

interface MobileNavProps {
  open: boolean
  onClose: () => void
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const location = useLocation()

  useEffect(() => {
    onClose()
    // Only react to route changes, not to a changing onClose identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  useEffect(() => {
    if (!open) {
      return
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close navigation"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className="absolute inset-y-0 left-0 flex w-[min(19rem,85vw)] animate-in flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl duration-200 slide-in-from-left"
      >
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute right-3 top-4 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={onClose}
          aria-label="Close navigation"
        >
          <X aria-hidden="true" />
        </Button>
        <SidebarNav onNavigate={onClose} />
      </div>
    </div>
  )
}
