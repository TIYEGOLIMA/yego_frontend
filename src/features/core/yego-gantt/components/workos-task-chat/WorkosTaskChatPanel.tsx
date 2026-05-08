import { CheckCircle2, Circle, Loader2, MessageSquareText, SendHorizontal, Sparkles, Trash2 } from 'lucide-react'
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
  /** Deshabilita hilo, envío y borrados mientras otro pane guarda (p. ej. checklist en detalle). */
  interactionLocked?: boolean
  /** Clases en el contenedor raíz (layout del padre). */
  className?: string
}

function ThreadPicker({
  threadKey,
  loadingSubtasks,
  subtasks,
  interactionLocked,
  onChange,
}: {
  threadKey: string
  loadingSubtasks: boolean
  subtasks: TaskSubtaskDto[]
  interactionLocked?: boolean
  onChange: (next: string) => void
}) {
  if (subtasks.length === 0) return null

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Chat sobre
      </span>
      <Select value={threadKey} disabled={loadingSubtasks || interactionLocked} onValueChange={onChange}>
        <SelectTrigger className="h-auto min-h-9 text-xs py-2">
          <SelectValue placeholder="Elegir hilo" />
        </SelectTrigger>
        <SelectContent align="start" className="max-h-[min(20rem,70vh)] w-[min(100vw-2rem,var(--radix-select-trigger-width))]">
          <SelectItem value={THREAD_TASK} className="py-2.5">
            <span className="flex w-full items-center gap-2 min-w-0">
              <MessageSquareText className="h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden />
              <span className="line-clamp-2 leading-snug">Toda la tarea</span>
            </span>
          </SelectItem>
          {subtasks.map((s) => (
            <SelectItem key={s.id} value={String(s.id)} className="py-2.5 cursor-pointer">
              <span className="flex w-full items-start gap-2 min-w-0">
                <span className="mt-px shrink-0" title={s.done ? 'Subtarea hecha' : 'Pendiente'}>
                  {s.done ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  )}
                </span>
                <span className="line-clamp-3 min-w-0 flex-1 text-left leading-snug">
                  {s.title?.trim() || `Subtarea #${s.id}`}
                </span>
              </span>
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
  /** Feed compacto tipo Bitrix: fila corta + barra lateral, sin tarjeta ámbar. */
  if (m.messageType === 'SYSTEM' || m.messageType === 'RESOLUTION') {
    const isRes = m.messageType === 'RESOLUTION'
    return (
      <li className="flex flex-col gap-0">
        <div
          className={cn(
            'relative max-w-[98%] flex gap-2 rounded-md border-l-[3px] py-1.5 pl-2.5 pr-2 leading-snug',
            'border border-border/50 bg-muted/35 text-foreground/90 shadow-none',
            'dark:border-border/55 dark:bg-muted/25',
            isRes
              ? 'border-l-emerald-600/85 dark:border-l-emerald-500/80'
              : 'border-l-blue-600/85 dark:border-l-blue-500/80',
          )}
          title={`${messageSenderLabel(m.authorName, m.messageType)} · ${formatChatWhen(m.createdAt)}`}
        >
          <Sparkles
            className={cn(
              'h-3.5 w-3.5 shrink-0 mt-0.5 opacity-90',
              isRes
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-blue-600 dark:text-blue-400',
            )}
            aria-hidden
          />
          <div className="min-w-0 flex-1 text-[11.5px] tracking-tight">{m.content}</div>
          <time className="shrink-0 self-start text-[10px] tabular-nums text-muted-foreground pt-px whitespace-nowrap">
            {formatChatWhen(m.createdAt)}
          </time>
        </div>
      </li>
    )
  }

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
  interactionLocked = false,
  className,
}: WorkosTaskChatPanelProps) {
  const chat = useWorkosTaskChat({ taskId, subtasks, subtasksLoading })

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col gap-2', className)}>
      <div className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
        <MessageSquareText className="h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400" aria-hidden />
        Chat de la tarea
      </div>

      <ThreadPicker
        threadKey={chat.threadKey}
        loadingSubtasks={chat.loadingSubtasks}
        subtasks={chat.subtasks}
        interactionLocked={interactionLocked}
        onChange={chat.setThreadKey}
      />

      {chat.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {chat.error}
        </p>
      ) : null}

      <div
        className={cn(
          'flex-1 min-h-0 overflow-y-auto rounded-lg border border-neutral-200/90 bg-neutral-50/60 p-1.5 sm:p-2 dark:border-neutral-700 dark:bg-neutral-950/40',
          chat.loadingMessages && 'flex items-center justify-center',
        )}
      >
        {chat.loadingMessages ? (
          <Loader2 className="h-7 w-7 animate-spin text-neutral-400" aria-label="Cargando mensajes" />
        ) : chat.messages.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-neutral-500 dark:text-neutral-400">{chat.emptyLabel}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {chat.messages.map((m) => {
              const isMine =
                m.messageType === 'USER' && currentUserId != null && m.authorUserId === currentUserId
              return (
                <ChatBubbleRow
                  key={m.id}
                  message={m}
                  isMine={isMine}
                  showDelete={isMine}
                  trashDisabled={chat.blockTrashButtons || interactionLocked}
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
          disabled={chat.sending || interactionLocked}
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
          disabled={chat.sending || !chat.draft.trim() || interactionLocked}
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
