import { useLayoutEffect, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import type { IntegralNotification } from '@/types/integral-notification'

function formatNotifTime(ts: Date) {
  try {
    return new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short' }).format(
      ts instanceof Date ? ts : new Date(ts),
    )
  } catch {
    return ''
  }
}

export function IntegralNotificationDropdown({
  open,
  notifications,
  onClose,
  onMarkRead,
  onClearAll,
  anchorRef,
}: {
  open: boolean
  notifications: IntegralNotification[]
  onClose: () => void
  onMarkRead: (id: string) => void
  onClearAll: () => void
  anchorRef: RefObject<HTMLElement | null>
}) {
  const [rect, setRect] = useState({ top: 0, left: 0, width: 384 })

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return
    const r = anchorRef.current.getBoundingClientRect()
    const w = 384
    const left = Math.min(
      Math.max(8, r.right - w),
      (typeof window !== 'undefined' ? window.innerWidth : 800) - w - 8,
    )
    setRect({ top: r.bottom + 6, left, width: w })
  }, [open, anchorRef, notifications.length])

  useLayoutEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const el = (
    <>
      <div
        className="fixed inset-0 z-[90] bg-black/0"
        aria-hidden
        onClick={onClose}
      />
      <div
        className="fixed z-[100] w-96 max-w-[min(24rem,calc(100vw-1rem))] rounded-xl border border-border/80 bg-popover text-popover-foreground shadow-xl overflow-hidden backdrop-blur-sm"
        style={{ top: rect.top, left: rect.left, width: rect.width }}
        role="dialog"
        aria-label="Notificaciones"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/30">
          <span className="text-sm font-semibold">Notificaciones</span>
          <div className="flex gap-1">
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClearAll}>
                Limpiar
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose} aria-label="Cerrar">
              ×
            </Button>
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-10">No hay notificaciones</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`w-full text-left px-4 py-3 border-b border-border/40 text-xs hover:bg-muted/50 transition-colors ${
                  !n.read ? 'bg-primary-500/[0.06] dark:bg-primary-500/10' : ''
                }`}
                onClick={() => onMarkRead(n.id)}
              >
                <div className="font-medium text-foreground flex items-center gap-2">
                  <span
                    className={
                      n.type === 'error'
                        ? 'text-destructive'
                        : n.type === 'warning'
                          ? 'text-amber-700 dark:text-amber-400'
                          : n.type === 'success'
                            ? 'text-emerald-600'
                            : 'text-sky-600'
                    }
                  >
                    {n.title}
                  </span>
                </div>
                <div className="text-muted-foreground truncate mt-0.5">{n.message}</div>
                <div className="text-[10px] text-muted-foreground/80 mt-1 tabular-nums">
                  {formatNotifTime(n.timestamp)}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  )

  return createPortal(el, document.body)
}
