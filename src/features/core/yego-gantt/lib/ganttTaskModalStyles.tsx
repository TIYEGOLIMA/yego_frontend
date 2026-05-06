import { CheckCircle2, Circle, CircleDot, Octagon } from 'lucide-react'
import type { AreaTaskStatus } from '../types'
import { STATUS_LABEL } from '../utils'

export type SubtaskModalBusy = 'idle' | 'adding' | 'updating'

export const FORM_SUBTASK_CHECKBOX_CLASS =
  'h-3.5 w-3.5 shrink-0 rounded-[3px] border-2 border-primary-500 text-primary-600 accent-primary-600 focus:ring-2 focus:ring-primary-500/35 focus:ring-offset-0 disabled:opacity-50'

export const SUBTASK_FORM_SELECT_CLASS =
  'h-7 flex-1 min-w-[9rem] max-w-[14rem] text-[11px] rounded border border-neutral-200 dark:border-border bg-white dark:bg-card px-1.5'

export const SUBTASK_FORM_DATE_CLASS =
  'h-7 text-[11px] rounded border border-neutral-200 dark:border-border bg-white dark:bg-card px-1 min-w-0 w-[10rem]'

/** Foco: borde primary al enfocar. */
export const TASK_MODAL_FOCUS =
  'focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus:border-primary-500 dark:focus:border-primary-400 focus-visible:border-primary-500 dark:focus-visible:border-primary-400'

/** Meta bajo el título del detalle: misma altura en todas las pastillas. */
export const DETAIL_TITLE_META_PILL =
  'inline-flex items-center justify-center gap-1.5 h-7 px-2.5 rounded-md border text-[11px] font-medium leading-none shrink-0'

export const DETAIL_STATUS_PILL: Record<
  AreaTaskStatus,
  { Icon: typeof Circle; label: string; cls: string }
> = {
  PENDING: {
    Icon: Circle,
    label: STATUS_LABEL.PENDING,
    cls: 'bg-muted/80 text-muted-foreground border-border',
  },
  IN_PROGRESS: {
    Icon: CircleDot,
    label: STATUS_LABEL.IN_PROGRESS,
    cls: 'bg-warning/10 text-warning border-warning/20',
  },
  DONE: {
    Icon: CheckCircle2,
    label: STATUS_LABEL.DONE,
    cls:
      'bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
  },
  BLOCKED: {
    Icon: Octagon,
    label: STATUS_LABEL.BLOCKED,
    cls: 'bg-red-50 text-red-800 border-red-200/80 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60',
  },
}
