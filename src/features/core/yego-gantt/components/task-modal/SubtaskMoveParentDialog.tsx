import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import type { TaskSubtaskDto } from '../../ganttApi'
import type { SubtaskModalBusy } from '../../lib/ganttTaskModalStyles'

export interface SubtaskMoveParentCandidateRow {
  id: number
  title: string
  secondary: string
}

export function SubtaskMoveParentDialog(props: {
  open: boolean
  targetSubtask: TaskSubtaskDto | null
  parentChoice: string
  onParentChoiceChange: (v: string) => void
  candidates: SubtaskMoveParentCandidateRow[]
  subtaskModalBusy: SubtaskModalBusy
  editingTaskId: number | null
  onClose: () => void
  onConfirmMove: () => void | Promise<void>
}) {
  const {
    open,
    targetSubtask,
    parentChoice,
    onParentChoiceChange,
    candidates,
    subtaskModalBusy,
    editingTaskId,
    onClose,
    onConfirmMove,
  } = props

  const idle = subtaskModalBusy === 'idle'

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent className="max-w-md sm:rounded-xl">
        <DialogHeader>
          <DialogTitle>Mover subtarea</DialogTitle>
          <DialogDescription>
            La subtarea «{targetSubtask?.title?.trim() || (targetSubtask != null ? `#${targetSubtask.id}` : '')}» pasará a
            formar parte de la tarea que elijas. El chat de la subtarea se mantendrá; equipo y espacio heredados se
            alinean con el nuevo padre.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-1">
          <Label className="text-sm font-medium">Nueva tarea padre</Label>
          <Select
            value={parentChoice}
            onValueChange={onParentChoiceChange}
            disabled={!idle || candidates.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Elegir tarea…" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {candidates.map((c) => (
                <SelectItem key={c.id} value={String(c.id)} textValue={`${c.title} ${c.secondary}`}>
                  {`${c.title} (${c.secondary})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {candidates.length === 0 && (
            <p className="text-xs text-muted-foreground">No hay otras tareas en la vista actual.</p>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={!idle}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="workos-gantt-btn-primary text-white"
            disabled={
              !idle || editingTaskId == null || targetSubtask == null || parentChoice === ''
            }
            onClick={() => void onConfirmMove()}
          >
            {!idle ? (
              <>
                <Loader2 className="h-4 w-4 shrink-0 animate-spin mr-2" aria-hidden />
                Moviendo…
              </>
            ) : (
              'Mover'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
