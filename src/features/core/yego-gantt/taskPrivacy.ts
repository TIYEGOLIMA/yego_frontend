/**
 * Privacidad de tareas Gantt: `privateTask` en API y etiquetas legacy (privada / private).
 */
import type { TaskRow } from './types'

export function tagsIndicatePrivate(tags: string[] | undefined | null): boolean {
  if (!tags?.length) return false
  return tags.some((tag) => {
    const t = tag.toLowerCase().trim()
    return (
      t === 'privada' ||
      t === 'privado' ||
      t === 'private' ||
      t.startsWith('privada:') ||
      t.startsWith('private:')
    )
  })
}

export function tagsWithoutPrivateLabels(tags: string[]): string[] {
  return tags.filter((tag) => {
    const t = tag.toLowerCase().trim()
    return (
      t !== 'privada' &&
      t !== 'privado' &&
      t !== 'private' &&
      !t.startsWith('privada:') &&
      !t.startsWith('private:')
    )
  })
}

export function taskRowIsPrivate(t: { privateTask?: boolean; tags?: string[] | null | undefined }): boolean {
  if (t.privateTask === true) return true
  return tagsIndicatePrivate(t.tags)
}

function taskAssigneeIds(t: { assignedUserIds?: number[]; assignedUserId?: number | null }): number[] {
  if (t.assignedUserIds?.length) return t.assignedUserIds
  if (t.assignedUserId != null) return [t.assignedUserId]
  return []
}

export function taskIsMine(t: TaskRow, userId: number | null | undefined): boolean {
  if (userId == null) return false
  return taskAssigneeIds(t).includes(userId)
}

/** Privadas que el usuario ve en API (creadas por él si no es admin global). */
export function taskIsMyPrivate(t: TaskRow, userId: number | null | undefined): boolean {
  if (userId == null) return false
  if (!taskRowIsPrivate(t)) return false
  return t.createdByUserId === userId
}

/**
 * Filtro del timeline: por defecto sin tareas privadas; el usuario puede ver todas / suyas / solo privadas.
 */
export type TimelineVisibilityFilter = 'default' | 'all' | 'mine' | 'private'

export function filterTasksForTimeline(
  tasks: TaskRow[],
  scope: TimelineVisibilityFilter,
  userId: number | null | undefined,
): TaskRow[] {
  switch (scope) {
    case 'default':
      return tasks.filter((t) => !taskRowIsPrivate(t))
    case 'all':
      return tasks
    case 'mine':
      if (userId == null) return tasks
      return tasks.filter((t) => taskIsMine(t, userId))
    case 'private':
      if (userId == null) return []
      return tasks.filter((t) => taskIsMyPrivate(t, userId))
    default:
      return tasks
  }
}
