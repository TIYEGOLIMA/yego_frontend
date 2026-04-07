import { useState } from 'react'
import { Bell, Flame, Plus, Route, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type PulseNotification = {
  id: string
  type: 'success' | 'warning' | 'info' | 'error'
  title: string
  message: string
  timestamp: Date
  read: boolean
}

function NotificationDropdown({
  open,
  notifications,
  onClose,
  onMarkRead,
  onClearAll,
}: {
  open: boolean
  notifications: PulseNotification[]
  onClose: () => void
  onMarkRead: (id: string) => void
  onClearAll: () => void
}) {
  if (!open) return null
  return (
    <div className="absolute right-0 top-full mt-1.5 w-96 z-50 rounded-xl border border-border/80 bg-popover shadow-xl overflow-hidden backdrop-blur-sm">
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
                !n.read ? 'bg-red-500/[0.04]' : ''
              }`}
              onClick={() => onMarkRead(n.id)}
            >
              <div className="font-medium text-foreground">{n.title}</div>
              <div className="text-muted-foreground truncate mt-0.5">{n.message}</div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

export function PulseGanttToolbar({
  showHeatmap,
  onToggleHeatmap,
  showCriticalPath,
  onToggleCriticalPath,
  filterText,
  onFilterChange,
  onCreateTask,
  notifications,
  onMarkNotificationRead,
  onClearNotifications,
  manage,
  showGanttExtras,
  searchPlaceholder,
}: {
  showHeatmap: boolean
  onToggleHeatmap: () => void
  showCriticalPath: boolean
  onToggleCriticalPath: () => void
  filterText: string
  onFilterChange: (v: string) => void
  onCreateTask: () => void
  notifications: PulseNotification[]
  onMarkNotificationRead: (id: string) => void
  onClearNotifications: () => void
  manage: boolean
  showGanttExtras: boolean
  searchPlaceholder: string
}) {
  const [notifOpen, setNotifOpen] = useState(false)
  const unread = notifications.filter((n) => !n.read).length

  return (
    <div className="flex items-center gap-2.5 px-4 sm:px-5 py-3 border-b border-border/80 bg-card/90 backdrop-blur-md relative flex-wrap gap-y-2">
      {/* Left: Nueva Tarea */}
      {manage && (
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5 bg-red-600 hover:bg-red-700 text-white shadow-sm"
          onClick={onCreateTask}
        >
          <Plus className="w-3.5 h-3.5" />
          Nueva Tarea
        </Button>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="search"
          value={filterText}
          onChange={(e) => onFilterChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-8 pl-8 pr-3 text-xs rounded-lg border border-border/80 bg-background/80 w-44 sm:w-48 focus:outline-none focus:ring-2 focus:ring-red-500/25 focus:border-red-500/50 transition-shadow"
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right: Gantt extras */}
      {showGanttExtras && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleHeatmap}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all ${
              showHeatmap
                ? 'border-amber-400/80 bg-amber-500/15 text-amber-900 dark:text-amber-100 shadow-sm'
                : 'border-border/80 bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            Heatmap
          </button>

          <button
            type="button"
            onClick={onToggleCriticalPath}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all ${
              showCriticalPath
                ? 'border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-300 shadow-sm'
                : 'border-border/80 bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70'
            }`}
          >
            <Route className="w-3.5 h-3.5" />
            Ruta Crítica
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-lg border border-border/80 bg-muted/40 hover:bg-muted/70 transition-colors"
              aria-label="Notificaciones"
            >
              <Bell className="w-4 h-4 text-muted-foreground" />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-0.5 rounded-full bg-red-600 text-[10px] text-white flex items-center justify-center font-bold">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
            <NotificationDropdown
              open={notifOpen}
              notifications={notifications}
              onClose={() => setNotifOpen(false)}
              onMarkRead={onMarkNotificationRead}
              onClearAll={onClearNotifications}
            />
          </div>
        </div>
      )}
    </div>
  )
}
