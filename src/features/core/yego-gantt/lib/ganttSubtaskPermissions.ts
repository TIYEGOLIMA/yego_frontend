import type { TaskRowLike, TaskSubtaskDto } from '../types'

/** Explicación al intentar completar una subtarea sin rol / asignación adecuada (UI timeline y modal). */
export const SUBTASK_DONE_NOT_ALLOWED_HINT =
  'No puedes marcar esta subtarea como hecha porque no eres el colaborador asignado para cumplirla. Solo puede hacerlo quien está asignado a esta subtarea, quien puede gestionar la tarea o un gestor.'

export function principalUserIdFromTask(task: TaskRowLike): number | undefined {
  if (task.assignedUserIds?.length) return task.assignedUserIds[0]
  if (task.assignedUserId != null) return task.assignedUserId
  return undefined
}

/** Quién puede marcar `done` en una subtarea sin ser gestor de la tarea padre. */
export function canUserToggleSubtaskDone(
  parent: TaskRowLike,
  sub: Pick<TaskSubtaskDto, 'assignedUserId' | 'createdByUserId'>,
  currentUserId: number | null | undefined,
  canManageParentTask: boolean,
): boolean {
  if (canManageParentTask) return true
  if (currentUserId == null) return false
  const uid = Number(currentUserId)
  const subAssignee = sub.assignedUserId != null ? Number(sub.assignedUserId) : null
  const subCreator = sub.createdByUserId != null ? Number(sub.createdByUserId) : null
  const parentCreator = parent.createdByUserId != null ? Number(parent.createdByUserId) : null
  if (subAssignee != null && !Number.isNaN(subAssignee) && subAssignee === uid) return true
  if (subCreator != null && !Number.isNaN(subCreator) && subCreator === uid) return true
  if (parentCreator != null && !Number.isNaN(parentCreator) && parentCreator === uid) return true
  const principal = principalUserIdFromTask(parent)
  const p = principal != null ? Number(principal) : null
  return p != null && !Number.isNaN(p) && p === uid
}
