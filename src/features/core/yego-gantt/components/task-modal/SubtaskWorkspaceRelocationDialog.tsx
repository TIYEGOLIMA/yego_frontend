import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/utils/cn'
import type { TaskRow } from '../../types'
import type { TaskSubtaskDto } from '../../ganttApi'
import type { SubtaskModalBusy } from '../../lib/ganttTaskModalStyles'

export function SubtaskWorkspaceRelocationDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  relocation: {
    subtask: TaskSubtaskDto
    nextWorkspaceId: number
  } | null
  destinationWorkspaceName: string
  editingTaskId: number | null
  subtaskModalBusy: SubtaskModalBusy
  relocationTargetTasksLoading: boolean
  relocationTargetTasks: TaskRow[] | null
  relocationSelectedParentId: string
  onRelocationSelectedParentIdChange: (id: string) => void
  onConfirmStandalone: () => void
  onConfirmExisting: () => void
  onConfirmNested: () => void
}) {
  const {
    open,
    onOpenChange,
    relocation,
    destinationWorkspaceName,
    editingTaskId,
    subtaskModalBusy,
    relocationTargetTasksLoading,
    relocationTargetTasks,
    relocationSelectedParentId,
    onRelocationSelectedParentIdChange,
    onConfirmStandalone,
    onConfirmExisting,
    onConfirmNested,
  } = props

  const idle = subtaskModalBusy === 'idle'
  const relocationReady = relocation != null

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && idle) {
          onOpenChange(false)
        }
      }}
    >
      <DialogContent
        className={cn(
          'max-h-[85vh] w-[min(100%,28rem)] max-w-md gap-0 overflow-y-auto p-0 sm:max-w-md sm:rounded-xl',
          'border-border/80 shadow-lg',
        )}
      >
        <DialogHeader className="min-w-0 space-y-0 px-4 pb-3 pt-4 text-left">
          <DialogTitle className="pr-9 text-base font-semibold leading-tight text-foreground">
            Cambio de espacio
          </DialogTitle>
          <DialogDescription asChild>
            <div className="mt-2.5 min-w-0 space-y-2 text-xs leading-snug text-muted-foreground">
              <p>
                Destino:{' '}
                <span className="font-medium text-foreground">{destinationWorkspaceName}</span>
              </p>
              <p className="break-words rounded-md bg-muted/50 px-2 py-1.5 text-[13px] text-foreground [overflow-wrap:anywhere]">
                {relocation?.subtask.title?.trim() ??
                  (relocation != null ? `#${relocation.subtask.id}` : '')}
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-2 border-t border-border/50 px-4 py-3">
          {!idle && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
              Aplicando…
            </p>
          )}
          <div className="flex min-w-0 flex-col gap-2">
            <button
              type="button"
              disabled={!idle || editingTaskId == null || !relocationReady}
              className={cn(
                'flex min-w-0 flex-col items-stretch gap-0.5 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2.5 text-left outline-none transition-colors',
                'hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-primary/25',
                'disabled:pointer-events-none disabled:opacity-50',
                'dark:bg-primary/15 dark:hover:bg-primary/25',
              )}
              onClick={() => void onConfirmStandalone()}
            >
              <span className="text-sm font-medium leading-snug text-foreground">Convertir en tarea</span>
              <span className="text-[11px] leading-snug text-muted-foreground">
                Independiente en el nuevo espacio, mismo contenido
              </span>
            </button>
            <div className="my-2 border-t border-border/50" />
            <Label className="text-[13px] font-medium text-foreground">
              O mover a una tarea en el nuevo espacio:
            </Label>
            {relocationTargetTasksLoading ? (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-2">
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                Cargando tareas…
              </div>
            ) : (
              <>
                <Select
                  value={relocationSelectedParentId}
                  onValueChange={onRelocationSelectedParentIdChange}
                  disabled={!idle || !(relocationTargetTasks?.length ?? 0)}
                >
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue
                      placeholder={
                        relocationTargetTasks?.length
                          ? 'Selecciona una tarea…'
                          : 'No hay tareas en este espacio'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(relocationTargetTasks ?? []).map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.title?.trim() || `Tarea #${t.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  disabled={
                    !idle ||
                    editingTaskId == null ||
                    !relocationReady ||
                    !relocationSelectedParentId
                  }
                  className={cn(
                    'mt-1 flex min-w-0 flex-col items-stretch gap-0.5 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-left shadow-sm outline-none transition-colors',
                    'hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-primary/25',
                    'disabled:pointer-events-none disabled:opacity-50',
                  )}
                  onClick={() => void onConfirmExisting()}
                >
                  <span className="text-sm font-medium leading-snug text-primary text-center">
                    Mover a la tarea seleccionada
                  </span>
                </button>

                {!relocationTargetTasks?.length && (
                  <button
                    type="button"
                    disabled={!idle || editingTaskId == null || !relocationReady}
                    className={cn(
                      'mt-2 flex min-w-0 flex-col items-stretch gap-0.5 rounded-lg border border-border bg-background px-3 py-2 text-left shadow-sm outline-none transition-colors',
                      'hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring',
                      'disabled:pointer-events-none disabled:opacity-50',
                    )}
                    onClick={() => void onConfirmNested()}
                  >
                    <span className="text-[13px] font-medium leading-snug text-foreground">
                      Subtarea con padre «Por definir»
                    </span>
                    <span className="text-[11px] leading-snug text-muted-foreground">
                      Se crea la tarea padre y se mueve debajo
                    </span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-border/50 px-3 py-2.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
            disabled={!idle}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
