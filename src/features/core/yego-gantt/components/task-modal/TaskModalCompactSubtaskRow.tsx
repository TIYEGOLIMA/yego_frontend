import type { ReactNode } from 'react'
import { Calendar, ListChecks, User } from 'lucide-react'
import { cn } from '@/utils/cn'
import { formatTimelineShortDate } from '../gantt-timeline/timelineColumnUtils'
import {
  TIMELINE_SUBTASK_BADGE_ICON,
  TIMELINE_SUBTASK_BADGE_LABEL,
  TIMELINE_SUBTASK_ROW,
} from '../../timelinePalette'

/** Lista de subtareas compactas en el modal de tarea / proyecto */
export const TASK_MODAL_COMPACT_SUBTASKS_LIST_CLASS =
  'flex flex-col gap-1 mt-1.5 max-h-[min(52vh,380px)] overflow-y-auto pr-0.5'

function MetaLine({
  responsibleName,
  dueYmd,
}: {
  responsibleName: string | null
  dueYmd?: string | null
}) {
  if (!responsibleName && !dueYmd) return null
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0 text-[8px] text-muted-foreground leading-tight">
      {responsibleName ? (
        <span
          className="inline-flex min-w-0 items-center gap-0.5"
          title={`Responsable: ${responsibleName}`}
        >
          <User className="h-2.5 w-2.5 shrink-0 opacity-80" aria-hidden />
          <span className="truncate">{responsibleName}</span>
        </span>
      ) : null}
      {dueYmd ? (
        <span className="inline-flex shrink-0 items-center gap-0.5 tabular-nums">
          <Calendar className="h-2 w-2 shrink-0 opacity-80" aria-hidden />
          {formatTimelineShortDate(dueYmd)}
        </span>
      ) : null}
    </span>
  )
}

export function toolbarIconBtnInteractive(disabled: boolean, intent: 'default' | 'danger') {
  return cn(
    'shrink-0 rounded p-0.5 text-muted-foreground',
    intent === 'default'
      ? 'opacity-70 group-hover:opacity-100 hover:text-primary hover:bg-primary/10'
      : 'opacity-70 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10',
    disabled && 'opacity-40 pointer-events-none',
  )
}

/** Fila estilo timeline (columna izquierda) dentro del modal de tarea */
export function TaskModalCompactSubtaskRow({
  titleAttr,
  leading,
  displayTitle,
  done,
  responsibleName,
  dueDate,
  mainDisabled,
  onOpenDetail,
  trailingActions,
}: {
  titleAttr: string
  leading: ReactNode
  displayTitle: string
  done: boolean
  responsibleName: string | null
  dueDate?: string | null
  mainDisabled?: boolean
  onOpenDetail: () => void
  trailingActions: ReactNode
}) {
  return (
    <div className={cn(TIMELINE_SUBTASK_ROW, 'group relative ml-0')} title={titleAttr}>
      <span className="w-3 shrink-0" aria-hidden />
      <span
        className="flex w-5 shrink-0 flex-col items-center justify-center gap-px select-none pointer-events-none"
        aria-hidden
      >
        <ListChecks className={TIMELINE_SUBTASK_BADGE_ICON} strokeWidth={2.25} />
        <span className={TIMELINE_SUBTASK_BADGE_LABEL}>sub</span>
      </span>
      {leading}
      <button
        type="button"
        disabled={mainDisabled}
        onClick={onOpenDetail}
        className="min-w-0 flex-1 text-left flex flex-col justify-center gap-0.5 py-px"
      >
        <span
          className={cn(
            'min-w-0 w-full truncate text-[10px] font-normal italic leading-snug text-left',
            done
              ? 'text-muted-foreground line-through decoration-muted-foreground/45'
              : 'text-foreground/85',
          )}
        >
          {displayTitle}
        </span>
        <MetaLine responsibleName={responsibleName} dueYmd={dueDate} />
      </button>
      <div className="flex shrink-0 items-center gap-0.5 pl-1">{trailingActions}</div>
    </div>
  )
}
