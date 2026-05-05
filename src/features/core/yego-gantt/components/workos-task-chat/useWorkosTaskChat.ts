import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import type { TaskSubtaskDto } from '../../ganttApi'
import {
  createWorkosTaskMessage,
  deleteWorkosTaskMessage,
  fetchWorkosTaskMessages,
  type WorkosTaskMessageDto,
} from '../../workosTaskMessagesApi'
import { THREAD_TASK, parseThreadSubtaskId } from './workosTaskChatUtils'

export interface UseWorkosTaskChatOptions {
  taskId: number
  /** Una sola carga en el padre (modal detalle); evita GET /subtasks duplicado. */
  subtasks: TaskSubtaskDto[]
  subtasksLoading: boolean
}

export function useWorkosTaskChat({ taskId, subtasks, subtasksLoading }: UseWorkosTaskChatOptions) {
  const [messages, setMessages] = useState<WorkosTaskMessageDto[]>([])
  const [threadKey, setThreadKey] = useState(THREAD_TASK)
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [messagePendingDelete, setMessagePendingDelete] = useState<WorkosTaskMessageDto | null>(null)
  const [deleting, setDeleting] = useState(false)

  const selectedSubtaskId = useMemo(() => parseThreadSubtaskId(threadKey), [threadKey])

  useEffect(() => {
    setThreadKey(THREAD_TASK)
  }, [taskId])

  useEffect(() => {
    const ac = new AbortController()
    setLoadingMessages(true)
    setError(null)
    void fetchWorkosTaskMessages(taskId, selectedSubtaskId, { signal: ac.signal })
      .then((data) => {
        setMessages(data)
      })
      .catch((e: unknown) => {
        if (axios.isCancel(e)) return
        setError('No se pudieron cargar los mensajes.')
        setMessages([])
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoadingMessages(false)
      })
    return () => ac.abort()
  }, [taskId, selectedSubtaskId])

  const sendMessage = useCallback(async () => {
    const text = draft.trim()
    if (!text || sending) return
    try {
      setSending(true)
      setError(null)
      const created = await createWorkosTaskMessage(taskId, {
        content: text,
        subtaskId: selectedSubtaskId,
      })
      setMessages((prev) => [...prev, created])
      setDraft('')
    } catch {
      setError('No se pudo enviar el mensaje.')
    } finally {
      setSending(false)
    }
  }, [draft, sending, taskId, selectedSubtaskId])

  const confirmDeleteMessage = useCallback(async () => {
    if (!messagePendingDelete || deleting) return
    const id = messagePendingDelete.id
    try {
      setDeleting(true)
      setError(null)
      await deleteWorkosTaskMessage(taskId, id)
      setMessages((prev) => prev.filter((x) => x.id !== id))
      setMessagePendingDelete(null)
    } catch {
      setError('No se pudo eliminar el mensaje.')
    } finally {
      setDeleting(false)
    }
  }, [messagePendingDelete, deleting, taskId])

  const emptyLabel =
    selectedSubtaskId != null
      ? 'Aún no hay mensajes en esta subtarea.'
      : 'Aún no hay mensajes en esta tarea.'

  const blockTrashButtons = deleting || messagePendingDelete != null

  return {
    THREAD_TASK,
    messages,
    subtasks,
    loadingSubtasks: subtasksLoading,
    threadKey,
    setThreadKey,
    loadingMessages,
    error,
    draft,
    setDraft,
    sending,
    deleting,
    messagePendingDelete,
    setMessagePendingDelete,
    selectedSubtaskId,
    sendMessage,
    confirmDeleteMessage,
    emptyLabel,
    blockTrashButtons,
  }
}
