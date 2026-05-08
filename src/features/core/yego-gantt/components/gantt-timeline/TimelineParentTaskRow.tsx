import React from 'react'
import { Calendar, ChevronDown, Crown } from 'lucide-react'
import { cn } from '@/utils/cn'
import { avatarInitials } from '../../utils'
import type { ColaboradorDto } from '../../types'
import type { TaskSubtaskDto } from '../../types'
import type { GanttTaskItem } from '../../ganttModel'
import {
  formatTimelineShortDate,
  ganttSubtaskCountHint,
  maxSubtaskDueYmd,
  timelineParentRowTooltip,
  timelinePrincipalDisplayName,
} from './timelineColumnUtils'
import {
  TIMELINE_PARENT_ROW_CARD,
  TIMELINE_PARENT_ROW_CHEVRON_BTN,
  TIMELINE_PARENT_ROW_MAIN_BTN,
} from '../../timelinePalette'

export function TimelineParentTaskRow({
  task,
  laneBgClass,
  collaborators,
  collaboratorNames,
  subs,
  hasSubtasks,
  subtasksExpanded,
  onToggleSubtasksCollapsed,
  onActivate,
}: {
  task: GanttTaskItem
  laneBgClass: string
  collaborators: ColaboradorDto[]
  collaboratorNames?: Map<number, string>
  subs?: TaskSubtaskDto[]
  hasSubtasks: boolean
  subtasksExpanded: boolean
  onToggleSubtasksCollapsed?: () => void
  onActivate: () => void
  onDropTaskToSubtask?: (sourceTaskId: number, targetTaskId: number) => void
}) {
  const [dragOver, setDragOver] = React.useState(false)

  const principalName = timelinePrincipalDisplayName(task, collaborators, collaboratorNames)
  const subHint = ganttSubtaskCountHint(task)
  const maxDueYmd = maxSubtaskDueYmd(subs)
  const maxDueLabel = maxDueYmd != null ? formatTimelineShortDate(maxDueYmd) : null

  return (
    <div
      className={cn(
        TIMELINE_PARENT_ROW_CARD,
        laneBgClass,
        'pl-1.5 transition-colors',
        dragOver && 'ring-2 ring-primary/50 bg-primary/10 dark:bg-primary/20'
      )}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('application/yego-task-id')) {
          e.preventDefault()
          setDragOver(true)
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        setDragOver(false)
        const sourceIdStr = e.dataTransfer.getData('application/yego-task-id')
        if (sourceIdStr && onDropTaskToSubtask) {
          const sourceId = parseInt(sourceIdStr, 10)
          if (!isNaN(sourceId) && sourceId !== task.id) {
            onDropTaskToSubtask(sourceId, task.id)
          }
        }
      }}
    >
      <button
        type="button"
        draggable
        onDragStart={(e) => {
          // Allow dragging to convert this task to a subtask of another task
          e.dataTransfer.setData('application/yego-task-id', String(task.id))
          e.dataTransfer.effectAllowed = 'move'
        }}
        className={cn(TIMELINE_PARENT_ROW_MAIN_BTN, 'cursor-grab active:cursor-grabbing')}
        title={timelineParentRowTooltip(task.name, maxDueLabel, subHint)}
        aria-label={`Seleccionar y editar tarea ${task.name}`}
        onClick={onActivate}
      >
        {task.principalUserId != null ? (
          <div
            className="relative shrink-0 rounded-full self-center"
            title={`${task.name} · Responsable principal · ${principalName}${subHint}`}
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border/60 bg-muted text-[9px] font-bold text-muted-foreground">
              {avatarInitials(principalName)}
            </div>
            <Crown
              className="absolute -right-0.5 -top-0.5 h-3 w-3 text-amber-500 drop-shadow-sm dark:text-amber-400"
              aria-hidden
            />
          </div>
        ) : (
          <div
            className="h-6 w-6 shrink-0 rounded-full border border-dashed border-muted-foreground/20 bg-muted/15 self-center"
            title={`${task.name} · Sin responsable asignado${subHint}`}
            aria-hidden
          />
        )}
        <span className="min-w-0 flex-1 flex items-center gap-1.5">
          <span className="min-w-0 flex-1 truncate text-[12px] font-semibold tracking-tight text-foreground">
            {task.name}
          </span>
          {maxDueYmd != null ? (
            <span className="inline-flex items-center gap-0.5 shrink-0 tabular-nums text-[9px] text-muted-foreground font-medium">
              <Calendar className="h-2 w-2 shrink-0 opacity-75" aria-hidden />
              <span className="whitespace-nowrap">{maxDueLabel}</span>
            </span>
          ) : null}
        </span>
      </button>
      {hasSubtasks ? (
        <button
          type="button"
          aria-label={subtasksExpanded ? 'Ocultar subtareas' : 'Mostrar subtareas'}
          aria-expanded={subtasksExpanded}
          title={subtasksExpanded ? 'Ocultar subtareas de esta tarea' : 'Ver subtareas de esta tarea'}
          className={TIMELINE_PARENT_ROW_CHEVRON_BTN}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onToggleSubtasksCollapsed?.()
          }}
        >
          <ChevronDown
            className={cn(
              'h-2.5 w-2.5 shrink-0 opacity-90 stroke-[2.5] transition-transform duration-200 ease-out',
              !subtasksExpanded && '-rotate-90',
            )}
            aria-hidden
          />
        </button>
      ) : null}
    </div>
  )
}
