import { Loader2, MessageSquareText, SendHorizontal, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/utils/cn'
import type { WorkosTaskMessageDto } from '../../workosTaskMessagesApi'
import type { TaskSubtaskDto } from '../../ganttApi'
import { DeleteWorkosMessageDialog } from './DeleteWorkosMessageDialog'
import { useWorkosTaskChat } from './useWorkosTaskChat'
import {
  THREAD_TASK,
  bubbleClassForMessageType,
  formatChatWhen,
  messageSenderLabel,
} from './workosTaskChatUtils'

export interface WorkosTaskChatPanelProps {
  taskId: number
  currentUserId: number | null
  /** Subtareas ya cargadas por el modal de detalle (un solo GET /subtasks). */
  subtasks: TaskSubtaskDto[]
  subtasksLoading: boolean
}

function ThreadPicker({
  threadKey,
  loadingSubtasks,
  subtasks,
  onChange,
}: {
  threadKey: string
  loadingSubtasks: boolean
  subtasks: TaskSubtaskDto[]
  onChange: (next: string) => void
}) {
  if (subtasks.length === 0) return null

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Hilo</span>
      <Select value={threadKey} disabled={loadingSubtasks} onValueChange={onChange}>
        <SelectTrigger className="h-9 text-xs">
          <SelectValue placeholder="Elegir hilo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={THREAD_TASK}>Toda la tarea</SelectItem>
          {subtasks.map((s) => (
            <SelectItem key={s.id} value={String(s.id)}>
              <span className="line-clamp-2">{s.title?.trim() || `Subtarea #${s.id}`}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function ChatBubbleRow({
  message: m,
  isMine,
  showDelete,
  trashDisabled,
  onRequestDelete,
}: {
  message: WorkosTaskMessageDto
  isMine: boolean
  showDelete: boolean
  trashDisabled: boolean
  onRequestDelete: (msg: WorkosTaskMessageDto) => void
}) {
  return (
    <li className={cn('flex flex-col gap-0.5', isMine && 'items-end')}>
      <div
        className={cn(
          'relative max-w-[95%] rounded-lg border px-2.5 py-2 text-xs shadow-sm',
          bubbleClassForMessageType(m.messageType),
          isMine && 'border-primary-200 bg-primary-50/90 dark:border-primary-900 dark:bg-primary-950/40',
        )}
      >
        <div className="mb-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-0 text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          <span>{messageSenderLabel(m.authorName, m.messageType)}</span>
          <time className="tabular-nums normal-case font-normal opacity-90">{formatChatWhen(m.createdAt)}</time>
        </div>
        <div className="whitespace-pre-wrap leading-snug text-[13px]">{m.content}</div>
        {showDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={trashDisabled}
            className="absolute right-1 top-1 h-7 w-7 text-neutral-500 hover:text-destructive disabled:opacity-40"
            onClick={() => onRequestDelete(m)}
            aria-label="Eliminar mensaje"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>
    </li>
  )
}

export function WorkosTaskChatPanel({
  taskId,
  currentUserId,
  subtasks,
  subtasksLoading,
}: WorkosTaskChatPanelProps) {
  const chat = useWorkosTaskChat({ taskId, subtasks, subtasksLoading })

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
        <MessageSquareText className="h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden />
        Conversación
      </div>

      <ThreadPicker
        threadKey={chat.threadKey}
        loadingSubtasks={chat.loadingSubtasks}
        subtasks={chat.subtasks}
        onChange={chat.setThreadKey}
      />

      {chat.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {chat.error}
        </p>
      ) : null}

      <div
        className={cn(
          'min-h-[140px] flex-1 overflow-y-auto rounded-lg border border-neutral-200/90 bg-neutral-50/60 p-2 dark:border-neutral-700 dark:bg-neutral-950/40',
          chat.loadingMessages && 'flex items-center justify-center',
        )}
      >
        {chat.loadingMessages ? (
          <Loader2 className="h-7 w-7 animate-spin text-neutral-400" aria-label="Cargando mensajes" />
        ) : chat.messages.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-neutral-500 dark:text-neutral-400">{chat.emptyLabel}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {chat.messages.map((m) => {
              const isMine =
                m.messageType === 'USER' && currentUserId != null && m.authorUserId === currentUserId
              return (
                <ChatBubbleRow
                  key={m.id}
                  message={m}
                  isMine={isMine}
                  showDelete={isMine}
                  trashDisabled={chat.blockTrashButtons}
                  onRequestDelete={chat.setMessagePendingDelete}
                />
              )
            })}
          </ul>
        )}
      </div>

      <div className="flex shrink-0 gap-2 pt-1">
        <Textarea
          placeholder="Escribe un mensaje… (@menciones como texto)"
          value={chat.draft}
          disabled={chat.sending}
          rows={2}
          className="min-h-[52px] resize-none text-sm"
          onChange={(e) => chat.setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void chat.sendMessage()
            }
          }}
        />
        <Button
          type="button"
          className="shrink-0 self-end h-10 px-3"
          loading={chat.sending}
          disabled={chat.sending || !chat.draft.trim()}
          leftIcon={<SendHorizontal className="h-4 w-4 shrink-0" />}
          onClick={() => void chat.sendMessage()}
        >
          Enviar
        </Button>
      </div>

      <DeleteWorkosMessageDialog
        message={chat.messagePendingDelete}
        deleting={chat.deleting}
        onDismiss={() => chat.setMessagePendingDelete(null)}
        onConfirm={() => void chat.confirmDeleteMessage()}
      />
    </div>
  )
}
