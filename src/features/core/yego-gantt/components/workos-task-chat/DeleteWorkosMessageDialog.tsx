import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { WorkosTaskMessageDto } from '../../workosTaskMessagesApi'
import { briefMessagePreview } from './workosTaskChatUtils'

interface DeleteWorkosMessageDialogProps {
  message: WorkosTaskMessageDto | null
  deleting: boolean
  onConfirm: () => void
  onDismiss: () => void
}

export function DeleteWorkosMessageDialog({
  message,
  deleting,
  onConfirm,
  onDismiss,
}: DeleteWorkosMessageDialogProps) {
  const open = message != null

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !deleting) {
          onDismiss()
        }
      }}
    >
      <DialogContent
        className="max-w-sm"
        closable={!deleting}
        onPointerDownOutside={(e) => {
          if (deleting) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (deleting) e.preventDefault()
        }}
      >
        <div className="flex flex-col items-center text-center pt-2 pb-1" aria-busy={deleting || undefined}>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden />
          </div>
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-base">Eliminar mensaje</DialogTitle>
          </DialogHeader>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            ¿Seguro que deseas eliminar este mensaje? En el servidor se marca como borrado; esta acción no se puede
            deshacer desde la aplicación.
          </p>
          {message?.content?.trim() ? (
            <blockquote className="mt-3 max-h-24 w-full overflow-y-auto rounded-md border border-border/80 bg-muted/40 px-3 py-2 text-left text-xs text-foreground/90 italic">
              “{briefMessagePreview(message.content)}”
            </blockquote>
          ) : null}
        </div>
        <DialogFooter className="flex-row gap-2 pt-2 sm:justify-center">
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-lg"
            disabled={deleting}
            aria-disabled={deleting || undefined}
            onClick={() => {
              if (deleting) return
              onDismiss()
            }}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="flex-1 rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground disabled:opacity-60"
            disabled={deleting}
            loading={deleting}
            onClick={onConfirm}
          >
            {deleting ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
