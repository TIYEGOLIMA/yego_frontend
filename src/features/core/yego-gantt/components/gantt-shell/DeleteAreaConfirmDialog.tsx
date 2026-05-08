import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface DeleteAreaConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  areaName: string | undefined
  deleting: boolean
  onConfirm: () => void
}

export function DeleteAreaConfirmDialog({
  open,
  onOpenChange,
  areaName,
  deleting,
  onConfirm,
}: DeleteAreaConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !deleting && onOpenChange(next)}>
      <DialogContent className="max-w-md p-6 rounded-xl text-center">
        <DialogHeader className="space-y-1 pb-0">
          <DialogTitle className="text-lg font-semibold text-center">Eliminar Área</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed text-center">
          ¿Estás seguro de eliminar <strong>&quot;{areaName}&quot;</strong>? Los equipos asignados quedarán
          sin área. Esta acción no se puede deshacer.
        </p>
        <DialogFooter className="flex-row justify-center gap-3 pt-4 sm:justify-center">
          <Button
            variant="outline"
            className="rounded-lg px-5"
            onClick={() => !deleting && onOpenChange(false)}
            disabled={deleting}
          >
            Cancelar
          </Button>
          <Button
            className="rounded-lg px-5 bg-red-500 hover:bg-red-600 text-white"
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
