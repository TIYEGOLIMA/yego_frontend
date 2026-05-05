import { api } from '../../../services/core/api'

export type WorkosTaskMessageType = 'USER' | 'SYSTEM' | 'RESOLUTION'

export interface WorkosTaskMessageDto {
  id: number
  taskId: number
  subtaskId: number | null
  authorUserId: number | null
  authorName: string
  messageType: WorkosTaskMessageType
  content: string
  createdAt: string
  updatedAt: string | null
  deleted: boolean
}

export async function fetchWorkosTaskMessages(
  taskId: number,
  subtaskId?: number | null,
  opts?: { signal?: AbortSignal },
): Promise<WorkosTaskMessageDto[]> {
  const params =
    subtaskId != null && subtaskId !== undefined ? { subtaskId } : ({} as Record<string, string>)
  const res = await api.get<WorkosTaskMessageDto[]>(`/yego-gantt/tasks/${taskId}/messages`, {
    params,
    signal: opts?.signal,
  })
  return Array.isArray(res.data) ? res.data : []
}

export async function createWorkosTaskMessage(
  taskId: number,
  body: { content: string; subtaskId?: number | null },
): Promise<WorkosTaskMessageDto> {
  const res = await api.post<WorkosTaskMessageDto>(`/yego-gantt/tasks/${taskId}/messages`, body)
  return res.data
}

export async function deleteWorkosTaskMessage(taskId: number, messageId: number): Promise<void> {
  await api.delete(`/yego-gantt/tasks/${taskId}/messages/${messageId}`)
}

export async function updateWorkosTaskMessage(
  taskId: number,
  messageId: number,
  body: { content: string },
): Promise<WorkosTaskMessageDto> {
  const res = await api.put<WorkosTaskMessageDto>(`/yego-gantt/tasks/${taskId}/messages/${messageId}`, body)
  return res.data
}
