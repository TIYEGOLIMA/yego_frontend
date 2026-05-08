import { useCallback, useEffect, useState, type ChangeEvent } from 'react'
import { CheckCircle2, Circle, Calendar, Crown } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { FORM_SUBTASK_CHECKBOX_CLASS, TASK_MODAL_FOCUS } from '../lib/ganttTaskModalStyles'

export function SubtaskAssigneeSelect({
  assignees,
  value,
  disabled,
  onCommit,
  triggerClassName,
}: {
  assignees: ColaboradorDto[]
  value: number | null
  disabled?: boolean
  onCommit: (next: number | null) => void | Promise<void>
  triggerClassName?: string
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
          triggerClassName,
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

/** Normaliza valor de API a `yyyy-mm-dd` para el input native. */
function ymdForDateInput(value: string | null | undefined): string {
  if (value == null) return ''
  const t = String(value).trim().slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : ''
}

export function SubtaskDueDateField({
  value,
  min,
  max,
  disabled,
  onCommit,
  ariaLabel = 'Fecha límite',
  className,
}: {
  value: string | null
  min?: string
  max?: string
  disabled?: boolean
  onCommit: (next: string | null) => void | Promise<void>
  ariaLabel?: string
  className?: string
}) {
  /** Borrador local: evita guardar/API en cada evento al cambiar de mes en el date picker nativo. */
  const [draft, setDraft] = useState(() => ymdForDateInput(value))
  useEffect(() => {
    setDraft(ymdForDateInput(value))
  }, [value])

  const flushIfChanged = useCallback(() => {
    const raw = draft.trim()
    const next = raw === '' ? null : raw
    const prev = (() => {
      const p = ymdForDateInput(value)
      return p === '' ? null : p
    })()
    if (next === prev) return
    if (next != null && !/^\d{4}-\d{2}-\d{2}$/.test(next)) return
    void onCommit(next)
  }, [draft, value, onCommit])

  const tryCommitFullYmd = useCallback(
    (v: string) => {
      setDraft(v)
      const t = v.trim()
      if (t === '') {
        const had = ymdForDateInput(value) !== ''
        if (had) void onCommit(null)
        return
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return
      const prevYmd = ymdForDateInput(value)
      if (t === prevYmd) return
      void onCommit(t)
    },
    [value, onCommit],
  )

  const handleDateInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      tryCommitFullYmd(e.target.value)
    },
    [tryCommitFullYmd],
  )

  return (
    <Input
      type="date"
      variant="plain"
      leftIcon={<Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />}
      value={draft}
      min={min || undefined}
      max={max || undefined}
      disabled={disabled}
      onChange={handleDateInput}
      onInput={handleDateInput}
      onBlur={() => void flushIfChanged()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
      aria-label={ariaLabel}
      className={cn(
        'h-8 w-full min-w-0 text-xs rounded-md border border-neutral-200 dark:border-border bg-white dark:bg-card shadow-none py-1',
        TASK_MODAL_FOCUS,
        className,
      )}
    />
  )
}

/** Equipo y espacio de trabajo (misma lógica de herencia que en la API). */
export function SubtaskAreaWorkspaceRow({
  areas,
  workspaces,
  areaId,
  workspaceId,
  disabled,
  onAreaCommit,
  onWorkspaceCommit,
  /** Sin sangría `pl-7` (p. ej. modal de subtarea). */
  noIndent = false,
  /** Etiquetas Área / Proyecto encima de cada selector. */
  labeled = false,
}: {
  areas: { id: number; name: string }[]
  workspaces: { id: number; name: string }[]
  areaId: number
  workspaceId: number | null
  disabled?: boolean
  onAreaCommit: (nextAreaId: number) => void | Promise<void>
  onWorkspaceCommit: (nextWorkspaceId: number | null) => void | Promise<void>
  noIndent?: boolean
  labeled?: boolean
}) {
  const areaSelect = (
    <Select
      value={String(areaId)}
      disabled={disabled || areas.length === 0}
      onValueChange={(v) => void onAreaCommit(Number(v))}
    >
      <SelectTrigger
        className={cn(
          'h-8 w-full min-w-0 rounded-md border border-neutral-200 dark:border-border bg-white dark:bg-card px-2 text-[11px] shadow-none [&>span]:truncate',
          TASK_MODAL_FOCUS,
          labeled && 'h-9 text-sm',
        )}
      >
        <SelectValue placeholder="Equipo" />
      </SelectTrigger>
      <SelectContent className="max-h-[min(40vh,280px)]">
        {areas.map((a) => (
          <SelectItem key={a.id} value={String(a.id)}>
            {a.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  const workspaceSelect = (
    <Select
      value={workspaceId == null ? 'none' : String(workspaceId)}
      disabled={disabled}
      onValueChange={(v) => void onWorkspaceCommit(v === 'none' ? null : Number(v))}
    >
      <SelectTrigger
        className={cn(
          'h-8 w-full min-w-0 rounded-md border border-neutral-200 dark:border-border bg-white dark:bg-card px-2 text-[11px] shadow-none [&>span]:truncate',
          TASK_MODAL_FOCUS,
          labeled && 'h-9 text-sm',
        )}
      >
        <SelectValue placeholder="Proyecto" />
      </SelectTrigger>
      <SelectContent className="max-h-[min(40vh,280px)]">
        <SelectItem value="none">{labeled ? 'Sin proyecto' : 'Sin espacio'}</SelectItem>
        {workspaces.map((w) => (
          <SelectItem key={w.id} value={String(w.id)}>
            {w.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  if (labeled) {
    return (
      <div className="grid grid-cols-2 gap-3 min-w-0">
        <div className="min-w-0 space-y-1.5">
          <span className="text-xs font-medium text-foreground">Área</span>
          {areaSelect}
        </div>
        <div className="min-w-0 space-y-1.5">
          <span className="text-xs font-medium text-foreground">Proyecto</span>
          {workspaceSelect}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-2 min-w-0 items-start',
        noIndent ? 'pl-0' : 'pl-7',
      )}
    >
      {areaSelect}
      {workspaceSelect}
    </div>
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
  dueDateDisabled,
  onAssigneeCommit,
  onDueDateCommit,
  readOnlyAssigneeLabel,
  noIndent = false,
  labeled = false,
}: {
  assignees: ColaboradorDto[]
  assignedUserId: number | null | undefined
  dueDate?: string | null
  min?: string
  max?: string
  disabled?: boolean
  /**
   * Control aparte del input de fecha: si no se pasa, usa `disabled`.
   * Evita deshabilitar la fecha cuando `disabled` refleja un guardado en curso en otro campo
   * (el `disabled` corta el foco y cierra el date picker nativo al cambiar de mes).
   */
  dueDateDisabled?: boolean
  onAssigneeCommit: (next: number | null) => void | Promise<void>
  onDueDateCommit: (next: string | null) => void | Promise<void>
  readOnlyAssigneeLabel?: string | null
  noIndent?: boolean
  labeled?: boolean
}) {
  const dateFieldDisabled = dueDateDisabled ?? disabled
  const assigneeCell =
    readOnlyAssigneeLabel != null && readOnlyAssigneeLabel !== '' ? (
      <div
        className={cn(
          'h-8 w-full min-w-0 rounded-md border border-neutral-200 dark:border-border bg-muted/40 dark:bg-muted/25 px-2 flex items-center text-[11px] text-foreground truncate',
          labeled && 'h-9 text-sm',
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
        triggerClassName={labeled ? 'h-9 text-sm' : undefined}
      />
    )

  const datePicker = (
    <div className="min-w-0">
      <SubtaskDueDateField
        value={dueDate ?? null}
        min={min}
        max={max}
        disabled={dateFieldDisabled}
        onCommit={onDueDateCommit}
        ariaLabel={labeled ? 'Fecha objetivo' : undefined}
        className={labeled ? 'h-9 text-sm' : undefined}
      />
    </div>
  )

  if (labeled) {
    return (
      <div className={cn('grid grid-cols-2 gap-3 min-w-0 items-start', noIndent ? 'pl-0' : 'pl-7')}>
        <div className="min-w-0 space-y-1.5">
          <span className="flex items-center gap-1 text-xs font-semibold text-foreground">
            <Crown className="h-3 w-3 text-amber-500 shrink-0" aria-hidden />
            Responsable
          </span>
          <div className="min-w-0">{assigneeCell}</div>
        </div>
        <div className="min-w-0 space-y-1.5">
          <span className="text-xs font-medium text-foreground">Fecha objetivo</span>
          {datePicker}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('grid grid-cols-2 gap-2 min-w-0 items-start', noIndent ? 'pl-0' : 'pl-7')}>
      <div className="min-w-0">{assigneeCell}</div>
      {datePicker}
    </div>
  )
}

export function SubtaskDescriptionField({
  value,
  disabled,
  placeholder = 'Descripción (opcional)',
  onChange,
  onBlur,
}: {
  value: string
  disabled?: boolean
  placeholder?: string
  onChange: (next: string) => void
  onBlur?: () => void | Promise<void>
}) {
  const handleBlur = onBlur ?? (() => {})
  return (
    <Textarea
      value={value}
      disabled={disabled}
      rows={2}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => void handleBlur()}
      className={cn(
        'min-h-[52px] max-h-32 text-xs rounded-md border border-neutral-200 dark:border-border bg-white dark:bg-card shadow-none py-1.5 px-2 resize-y',
        TASK_MODAL_FOCUS,
      )}
      aria-label="Descripción de la subtarea"
    />
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
  cannotToggleTitle,
  onCannotToggleInteract,
  onCommitted,
}: {
  done: boolean
  canToggle: boolean
  disabled?: boolean
  checkboxClassName?: string
  idleWrapperClassName?: string
  preferDisabledCheckbox?: boolean
  /** Tooltip / accesibilidad cuando «no puede» completar (además del aviso opcional `onCannotToggleInteract`). */
  cannotToggleTitle?: string
  /** Al hacer clic sin permiso (p. ej. mostrar mensaje emergente). */
  onCannotToggleInteract?: () => void
  onCommitted: (next: boolean) => void | Promise<void>
}) {
  const combinedDisabled = Boolean(disabled) || (preferDisabledCheckbox && !canToggle)
  const blockedTitle = cannotToggleTitle?.trim()
  const defaultStateTitle = done ? 'Hecha' : 'Pendiente'
  const hoverTitle =
    preferDisabledCheckbox && !canToggle && blockedTitle ? blockedTitle : defaultStateTitle
  const showPermissionBlockOverlay =
    Boolean(onCannotToggleInteract) && !canToggle && !disabled && Boolean(preferDisabledCheckbox)

  if (preferDisabledCheckbox) {
    return (
      <span className="relative inline-flex items-center shrink-0">
        <input
          type="checkbox"
          className={cn(FORM_SUBTASK_CHECKBOX_CLASS, checkboxClassName)}
          checked={done}
          disabled={combinedDisabled}
          title={hoverTitle}
          aria-label={preferDisabledCheckbox && !canToggle && blockedTitle ? blockedTitle : done ? 'Marcar pendiente' : 'Marcar hecha'}
          onChange={(e) => {
            if (!canToggle) return
            void onCommitted(e.target.checked)
          }}
        />
        {showPermissionBlockOverlay ? (
          <button
            type="button"
            tabIndex={0}
            className="absolute -inset-2 z-[1] cursor-not-allowed rounded-sm"
            title={blockedTitle}
            aria-label={blockedTitle ?? 'Sin permiso para cambiar esta subtarea'}
            onClick={(ev) => {
              ev.preventDefault()
              ev.stopPropagation()
              onCannotToggleInteract?.()
            }}
            onKeyDown={(ev) => {
              if (ev.key !== 'Enter' && ev.key !== ' ') return
              ev.preventDefault()
              ev.stopPropagation()
              onCannotToggleInteract?.()
            }}
          />
        ) : null}
      </span>
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

  const roTitle = blockedTitle ?? defaultStateTitle
  const roLabel = blockedTitle ?? (done ? 'Subtarea hecha' : 'Subtarea pendiente')

  return (
    <button
      type="button"
      tabIndex={0}
      className={cn(
        'shrink-0 mt-px rounded-sm p-0.5 cursor-not-allowed text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/80 focus-visible:ring-offset-2',
        idleWrapperClassName,
      )}
      title={roTitle}
      aria-label={roLabel}
      onClick={(ev) => {
        ev.preventDefault()
        ev.stopPropagation()
        onCannotToggleInteract?.()
      }}
    >
      {done ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-500" aria-hidden />
      ) : (
        <Circle className="h-4 w-4 text-muted-foreground/60" aria-hidden />
      )}
    </button>
  )
}
