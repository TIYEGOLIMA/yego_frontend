import type { Dispatch, SetStateAction } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PROJECT_ICON_CHOICES } from '../../projectIcons'

interface HeaderWorkspaceFormState {
  name: string
  description: string
  iconKey: string
}

interface CreateWorkspaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: HeaderWorkspaceFormState
  setForm: Dispatch<SetStateAction<HeaderWorkspaceFormState>>
  saving: boolean
  onSave: () => void
}

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
  form,
  setForm,
  saving,
  onSave,
}: CreateWorkspaceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo espacio de trabajo</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-1">
          Crea un espacio desde el selector del header. Podrás elegirlo en el combo y asociar tareas y
          sprints.
        </p>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Icono</Label>
            <p className="text-[11px] text-muted-foreground mb-2">Se muestra en el selector y en Cartera.</p>
            <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-8">
              {PROJECT_ICON_CHOICES.map(({ key, label, Icon }) => {
                const sel = form.iconKey === key
                return (
                  <button
                    key={key}
                    type="button"
                    title={label}
                    onClick={() => setForm((f) => ({ ...f, iconKey: key }))}
                    className={`h-9 w-9 rounded-lg flex items-center justify-center transition-colors border ${
                      sel
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-muted/50 text-muted-foreground border-border/60 hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4 stroke-[2]" />
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <Label>Nombre del espacio de trabajo *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ej: Migración Cloud"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Descripción</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Descripción opcional…"
              className="mt-1 resize-none"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            className="workos-gantt-btn-primary border-0"
            disabled={!form.name.trim() || saving}
            onClick={() => void onSave()}
          >
            {saving ? 'Creando…' : 'Crear espacio'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
