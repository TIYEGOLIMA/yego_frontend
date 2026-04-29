import type { IntegralNotification } from '../../../types/integral-notification'

type TaskLike = {
  id: number
  title: string
  endDate: string
  status: string
}

/** Alertas derivadas del estado bloqueado para el feed del header */
export function buildTaskAlertNotifications(
  tasks: TaskLike[],
  dismissedTaskIds: number[],
): IntegralNotification[] {
  return tasks
    .filter((t) => t.status === 'BLOCKED' && !dismissedTaskIds.includes(t.id))
    .map((t) => ({
      id: `gantt-blocked-${t.id}`,
      type: 'error' as const,
      title: 'Tarea bloqueada',
      message: t.title,
      timestamp: new Date(`${t.endDate}T12:00:00`),
      read: false,
    }))
}
