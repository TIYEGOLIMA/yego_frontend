import type { AreaTaskStatus, TaskPriority } from '../types'
import { tagsWithoutPrivateLabels } from '../taskPrivacy'

export function httpSubtaskMutateStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('response' in error)) return undefined
  return (error as { response?: { status?: number } }).response?.status
}

/** Campos comparados contra la línea base para habilitar «Guardar cambios». */
export type TaskModalFormDirtyFields = {
  areaId: string
  workspaceId: string
  sprintId: string
  title: string
  description: string
  startDate: string
  endDate: string
  status: AreaTaskStatus
  priority: TaskPriority
  assignedUserIds: number[]
  tagsInput: string
  isPrivateTask: boolean
}

/** Fingerprint del formulario de tarea (sin % de progreso: las subtareas lo gestionan aparte). */
export function taskModalFormDirtyFingerprint(f: TaskModalFormDirtyFields): string {
  const tags = tagsWithoutPrivateLabels(
    f.tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
  )
  tags.sort()
  const assignees = [...f.assignedUserIds].sort((a, b) => a - b)
  return JSON.stringify({
    areaId: f.areaId,
    workspaceId: f.workspaceId,
    sprintId: f.sprintId,
    title: f.title.trim(),
    description: f.description.trim(),
    startDate: f.startDate,
    endDate: f.endDate,
    status: f.status,
    priority: f.priority,
    isPrivateTask: f.isPrivateTask,
    assignedUserIds: assignees,
    tags: tags.join(','),
  })
}
