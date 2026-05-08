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

export interface TaskConvertToSubtaskCandidate {
  id: number
  title: string
  secondary: string
}

export function TaskConvertToSubtaskDialog(props: {
  open: boolean
  candidates: TaskConvertToSubtaskCandidate[]
  selectedParentId: string
  onSelectedParentIdChange: (v: string) => void
  loading: boolean
  editing: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
}) {
  const {
    open,
    candidates,
    selectedParentId,
    onSelectedParentIdChange,
    loading,
    editing,
    onClose,
    onConfirm,
  } = props

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent className="max-w-md sm:rounded-xl">
        <DialogHeader>
          <DialogTitle>Convertir a subtarea</DialogTitle>
          <DialogDescription>
            La tarea actual pasará a ser una subtarea de la tarea que elijas. Su chat y comentarios se mantendrán.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-1">
          <Label className="text-sm font-medium">Tarea padre destino</Label>
          <Select
            value={selectedParentId}
            onValueChange={onSelectedParentIdChange}
            disabled={loading || candidates.length === 0}
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
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="workos-gantt-btn-primary text-white"
            disabled={loading || !editing || selectedParentId === ''}
            onClick={() => void onConfirm()}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 shrink-0 animate-spin mr-2" aria-hidden />
                Convirtiendo…
              </>
            ) : (
              'Convertir'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
