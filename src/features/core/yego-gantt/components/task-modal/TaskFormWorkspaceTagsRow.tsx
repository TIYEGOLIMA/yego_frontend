import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/utils/cn'
import type { WorkspaceDto } from '../../types'
import { TASK_MODAL_FOCUS } from '../../lib'

interface TaskFormWorkspaceTagsRowProps {
  workspaces: WorkspaceDto[]
  workspaceId: string
  tagsInput: string
  taskFormSaving: boolean
  onWorkspaceChange: (value: string) => void
  onTagsChange: (value: string) => void
}

export function TaskFormWorkspaceTagsRow({
  workspaces,
  workspaceId,
  tagsInput,
  taskFormSaving,
  onWorkspaceChange,
  onTagsChange,
}: TaskFormWorkspaceTagsRowProps) {
  const hasWorkspaces = workspaces.length > 0

  const workspaceCol = (
    <div className="min-w-0 space-y-1.5 flex-1">
      <Label className="text-sm font-medium">Espacio de trabajo</Label>
      {hasWorkspaces ? (
        <Select value={workspaceId || 'none'} disabled={taskFormSaving} onValueChange={onWorkspaceChange}>
          <SelectTrigger className={cn('h-10 rounded-lg', TASK_MODAL_FOCUS)}>
            <SelectValue placeholder="Sin espacio de trabajo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin espacio de trabajo</SelectItem>
            {workspaces.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="rounded-lg border border-dashed border-border/80 bg-muted/25 px-3 py-2 text-xs text-muted-foreground leading-snug">
          No hay espacios de trabajo en el sistema. La tarea quedará solo en el{' '}
          <strong className="text-foreground font-medium">equipo</strong> (sin proyecto). Podrás asignarla a
          un espacio cuando exista uno.
        </div>
      )}
    </div>
  )

  const tagsCol = (
    <div className="min-w-0 space-y-1.5 flex-1">
      <Label className="text-sm font-medium">Etiquetas</Label>
      <Input
        variant="plain"
        placeholder="ci-devops, seguridad, backend…"
        value={tagsInput}
        disabled={taskFormSaving}
        onChange={(e) => onTagsChange(e.target.value)}
        className={cn('h-10 rounded-lg border border-neutral-300 dark:border-neutral-600', TASK_MODAL_FOCUS)}
      />
    </div>
  )

  return (
    <div className="flex flex-row flex-wrap gap-4 items-start min-w-0">
      {workspaceCol}
      {tagsCol}
    </div>
  )
}
