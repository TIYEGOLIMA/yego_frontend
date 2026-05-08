import type { GanttVisualStatus } from './types'

/**
 * Paleta «océano» para el timeline Gantt:
 * - **Tarea padre**: sky (azul cielo) — pieza principal y barras de hitos.
 * - **Subtarea**: cyan — mismo matiz frío que el sky, se lee como capa anidada sin chocar con el padre.
 */

/** Card de la fila de tarea padre (columna izquierda del timeline). */
export const TIMELINE_PARENT_ROW_CARD =
  'flex w-full shrink-0 h-[42px] items-stretch overflow-hidden rounded-md -mx-px ' +
  'border border-sky-200/55 dark:border-sky-800/45 ' +
  'bg-gradient-to-r from-sky-50/95 via-sky-50/65 to-sky-100/30 ' +
  'dark:from-sky-950/48 dark:via-sky-950/32 dark:to-sky-950/22 ' +
  'border-l-[4px] border-l-sky-600 dark:border-l-sky-400 ' +
  'shadow-sm ring-1 ring-sky-600/10 dark:ring-sky-400/18'

export const TIMELINE_PARENT_ROW_MAIN_BTN =
  'flex flex-1 min-w-0 items-center gap-2 px-1.5 py-1 text-left ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500 focus-visible:z-[1] ' +
  'hover:bg-sky-900/[0.045] dark:hover:bg-sky-400/[0.07]'

export const TIMELINE_PARENT_ROW_CHEVRON_BTN =
  'shrink-0 flex items-center justify-center gap-0 pl-0.5 pr-1 ' +
  'border-l border-sky-900/12 text-muted-foreground/90 transition-colors ' +
  'hover:bg-sky-900/[0.06] hover:text-foreground dark:border-sky-400/14 dark:hover:bg-sky-400/12 dark:hover:text-sky-50 ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500'

/** Fila de subtarea anidada bajo la tarea padre. */
export const TIMELINE_SUBTASK_ROW =
  'flex items-center gap-1 shrink-0 min-h-[42px] py-1 rounded-md mr-px pl-2 pr-1 ' +
  'ml-5 border-l-[3px] border-l-cyan-500/85 dark:border-l-cyan-400/75 ' +
  'border border-dashed border-cyan-300/60 dark:border-cyan-600/40 ' +
  'bg-gradient-to-r from-cyan-50/75 via-sky-50/35 to-transparent ' +
  'dark:from-cyan-950/38 dark:via-sky-950/22 dark:to-transparent ' +
  'ring-1 ring-inset ring-cyan-500/11 dark:ring-cyan-400/20'

export const TIMELINE_SUBTASK_BADGE_ICON =
  'h-2.5 w-2.5 text-cyan-600/90 dark:text-cyan-400/90'

export const TIMELINE_SUBTASK_BADGE_LABEL =
  'text-[6px] font-bold uppercase tracking-wide text-cyan-800/92 dark:text-cyan-300/95 leading-none'

/** Anillo al hover en la mini-barra de subtarea sobre la rejilla. */
export const TIMELINE_SUBTASK_MINIBAR_HOVER_RING =
  'hover:ring-2 hover:ring-cyan-200/90 dark:border-cyan-300/45 dark:hover:ring-cyan-400/45'

/**
 * Hex para mini-barras de subtareas (coherentes con TIMELINE_SUBTASK_ROW / cyan).
 */
export function timelineSubtaskBarColor(progressPct: number, status: GanttVisualStatus): string {
  if (status === 'completed') return '#0e7490'
  if (status === 'blocked') return '#db2777'
  const p = Math.max(0, Math.min(100, progressPct))
  if (p >= 85) return '#22d3ee'
  if (p >= 50) return '#06b6d4'
  if (p >= 25) return '#0891b2'
  return '#155e75'
}
