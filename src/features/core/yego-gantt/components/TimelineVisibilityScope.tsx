import { Filter, GanttChartSquare, Lock, UserRound, Users, type LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { TimelineVisibilityFilter } from '../taskPrivacy'

export interface TimelineVisibilityCounts {
  equipo: number
  all: number
  mine: number
  priv: number
}

const SCOPES: ReadonlyArray<{
  id: TimelineVisibilityFilter
  label: string
  Icon: LucideIcon
  countKey: keyof TimelineVisibilityCounts
  needsUser: boolean
}> = [
  { id: 'default', label: 'Equipos', Icon: GanttChartSquare, countKey: 'equipo', needsUser: false },
  { id: 'all', label: 'Todas', Icon: Users, countKey: 'all', needsUser: false },
  { id: 'mine', label: 'Mis tareas', Icon: UserRound, countKey: 'mine', needsUser: true },
  { id: 'private', label: 'Privadas', Icon: Lock, countKey: 'priv', needsUser: true },
]

export function TimelineVisibilityScope({
  value,
  onChange,
  counts,
  currentUserId,
}: {
  value: TimelineVisibilityFilter
  onChange: (v: TimelineVisibilityFilter) => void
  counts: TimelineVisibilityCounts
  currentUserId: number | null | undefined
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shrink-0">
        <Filter className="h-3 w-3 opacity-80" aria-hidden />
        Alcance
      </span>
      {SCOPES.map(({ id, label, Icon, countKey, needsUser }) => {
        const active = value === id
        const disabled = needsUser && currentUserId == null
        const count = counts[countKey]
        return (
          <button
            key={id}
            type="button"
            disabled={disabled}
            title={disabled ? 'Inicia sesión' : undefined}
            onClick={() => !disabled && onChange(id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all border h-7',
              disabled && 'opacity-45 pointer-events-none',
              active
                ? 'border-orange-500 bg-orange-500 text-white shadow-sm hover:bg-orange-600'
                : 'border-border/70 bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span>{label}</span>
            <span
              className={cn(
                'ml-0.5 min-w-[1.2rem] rounded-full px-1 py-px text-[10px] font-bold tabular-nums leading-none',
                active ? 'bg-orange-800/90 text-white' : 'bg-muted text-foreground dark:bg-muted/80',
              )}
            >
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
