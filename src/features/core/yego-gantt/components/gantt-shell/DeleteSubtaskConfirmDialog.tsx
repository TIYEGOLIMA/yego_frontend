import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface DeleteSubtaskConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subtaskTitle: string | undefined
  deleting: boolean
  onConfirm: () => void
}

export function DeleteSubtaskConfirmDialog({
  open,
  onOpenChange,
  subtaskTitle,
  deleting,
  onConfirm,
}: DeleteSubtaskConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !deleting && onOpenChange(next)}>
      <DialogContent className="max-w-sm">
        <div className="flex flex-col items-center text-center pt-2 pb-1">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4 gantt-scale-in">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-base">Eliminar subtarea</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            ¿Estás seguro de que deseas eliminar la subtarea{' '}
            <span className="font-semibold text-foreground">&quot;{subtaskTitle}&quot;</span>?
            Esta acción no se puede deshacer.
          </p>
        </div>
        <DialogFooter className="flex-row gap-2 sm:justify-center pt-2">
          <Button
            variant="outline"
            className="flex-1 rounded-lg"
            onClick={() => !deleting && onOpenChange(false)}
            disabled={deleting}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
