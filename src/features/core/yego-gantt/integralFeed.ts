import type { IntegralNotification } from '../../../types/integral-notification'

type TaskLike = {
  id: number
  title: string
  endDate: string
  status: string
}

/** Alertas derivadas del estado de las tareas (riesgo / bloqueo) para el feed del header */
export function buildTaskAlertNotifications(
  tasks: TaskLike[],
  dismissedTaskIds: number[],
): IntegralNotification[] {
  return tasks
    .filter(
      (t) =>
        (t.status === 'AT_RISK' || t.status === 'BLOCKED') && !dismissedTaskIds.includes(t.id),
    )
    .map((t) => ({
      id: t.status === 'AT_RISK' ? `gantt-at-risk-${t.id}` : `gantt-blocked-${t.id}`,
      type: t.status === 'AT_RISK' ? ('warning' as const) : ('error' as const),
      title: t.status === 'AT_RISK' ? 'Tarea en riesgo' : 'Tarea bloqueada',
      message: t.title,
      timestamp: new Date(`${t.endDate}T12:00:00`),
      read: false,
    }))
}
