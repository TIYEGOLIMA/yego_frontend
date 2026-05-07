import { CheckCircle2, Circle, Calendar } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '../../../../utils/cn'
import type { ColaboradorDto } from '../types'
import { FORM_SUBTASK_CHECKBOX_CLASS, TASK_MODAL_FOCUS } from '../lib/ganttTaskModalStyles'

export function SubtaskAssigneeSelect({
  assignees,
  value,
  disabled,
  onCommit,
}: {
  assignees: ColaboradorDto[]
  value: number | null
  disabled?: boolean
  onCommit: (next: number | null) => void | Promise<void>
}) {
  return (
    <Select
      value={value == null ? 'none' : String(value)}
      disabled={disabled}
      onValueChange={(v) => {
        void onCommit(v === 'none' ? null : Number(v))
      }}
    >
      <SelectTrigger
        className={cn(
          'h-8 w-full min-w-0 rounded-md border border-neutral-200 dark:border-border bg-white dark:bg-card px-2 text-[11px] shadow-none [&>span]:truncate',
          TASK_MODAL_FOCUS,
        )}
      >
        <SelectValue placeholder="Responsable" />
      </SelectTrigger>
      <SelectContent className="max-h-[min(40vh,280px)]">
        <SelectItem value="none">Sin responsable</SelectItem>
        {assignees.map((c) => (
          <SelectItem key={c.id} value={String(c.id)}>
            {c.nombreCompleto}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function SubtaskDueDateField({
  value,
  min,
  max,
  disabled,
  onCommit,
}: {
  value: string | null
  min?: string
  max?: string
  disabled?: boolean
  onCommit: (next: string | null) => void | Promise<void>
}) {
  return (
    <Input
      type="date"
      variant="plain"
      leftIcon={<Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />}
      value={value ?? ''}
      min={min || undefined}
      max={max || undefined}
      disabled={disabled}
      onChange={(e) => {
        const v = e.target.value.trim()
        void onCommit(v === '' ? null : v)
      }}
      aria-label="Fecha límite"
      className={cn(
        'h-8 w-full min-w-0 text-xs rounded-md border border-neutral-200 dark:border-border bg-white dark:bg-card shadow-none py-1',
        TASK_MODAL_FOCUS,
      )}
    />
  )
}

/** Responsable + fecha en dos columnas (modal crear/editar subtareas). */
export function SubtaskAssigneeDateGrid({
  assignees,
  assignedUserId,
  dueDate,
  min,
  max,
  disabled,
  onAssigneeCommit,
  onDueDateCommit,
  readOnlyAssigneeLabel,
}: {
  assignees: ColaboradorDto[]
  assignedUserId: number | null | undefined
  dueDate?: string | null
  min?: string
  max?: string
  disabled?: boolean
  onAssigneeCommit: (next: number | null) => void | Promise<void>
  onDueDateCommit: (next: string | null) => void | Promise<void>
  readOnlyAssigneeLabel?: string | null
}) {
  const assigneeCell =
    readOnlyAssigneeLabel != null && readOnlyAssigneeLabel !== '' ? (
      <div
        className={cn(
          'h-8 w-full min-w-0 rounded-md border border-neutral-200 dark:border-border bg-muted/40 dark:bg-muted/25 px-2 flex items-center text-[11px] text-foreground truncate',
          disabled && 'opacity-50 pointer-events-none',
        )}
        title={readOnlyAssigneeLabel}
      >
        {readOnlyAssigneeLabel}
      </div>
    ) : (
      <SubtaskAssigneeSelect
        assignees={assignees}
        value={assignedUserId ?? null}
        disabled={disabled}
        onCommit={onAssigneeCommit}
      />
    )

  return (
    <div className="grid grid-cols-2 gap-2 pl-7 min-w-0 items-start">
      <div className="min-w-0">{assigneeCell}</div>
      <div className="min-w-0">
        <SubtaskDueDateField
          value={dueDate ?? null}
          min={min}
          max={max}
          disabled={disabled}
          onCommit={onDueDateCommit}
        />
      </div>
    </div>
  )
}

/**
 * Checkbox de hecho o icono de solo lectura (timeline / detalle).
 * Con `preferDisabledCheckbox`: siempre checkbox; deshabilitado si no puede togglear (modal edición).
 */
export function SubtaskDoneToggle({
  done,
  canToggle,
  disabled,
  checkboxClassName,
  idleWrapperClassName,
  preferDisabledCheckbox,
  onCommitted,
}: {
  done: boolean
  canToggle: boolean
  disabled?: boolean
  checkboxClassName?: string
  idleWrapperClassName?: string
  preferDisabledCheckbox?: boolean
  onCommitted: (next: boolean) => void | Promise<void>
}) {
  const combinedDisabled = Boolean(disabled) || (preferDisabledCheckbox && !canToggle)

  if (preferDisabledCheckbox) {
    return (
      <input
        type="checkbox"
        className={cn(FORM_SUBTASK_CHECKBOX_CLASS, checkboxClassName)}
        checked={done}
        disabled={combinedDisabled}
        title={done ? 'Hecha' : 'Pendiente'}
        aria-label={done ? 'Marcar pendiente' : 'Marcar hecha'}
        onChange={(e) => {
          if (!canToggle) return
          void onCommitted(e.target.checked)
        }}
      />
    )
  }

  if (canToggle) {
    return (
      <input
        type="checkbox"
        className={cn(FORM_SUBTASK_CHECKBOX_CLASS, checkboxClassName)}
        checked={done}
        disabled={disabled}
        title={done ? 'Hecha' : 'Pendiente'}
        aria-label={done ? 'Marcar pendiente' : 'Marcar hecha'}
        onChange={(e) => void onCommitted(e.target.checked)}
      />
    )
  }

  return (
    <span
      className={cn('shrink-0 mt-px', idleWrapperClassName)}
      title={done ? 'Hecha' : 'Pendiente'}
    >
      {done ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-500" aria-hidden />
      ) : (
        <Circle className="h-4 w-4 text-muted-foreground/60" aria-hidden />
      )}
    </span>
  )
}
