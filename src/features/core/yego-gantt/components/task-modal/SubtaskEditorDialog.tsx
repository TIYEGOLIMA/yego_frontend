import { useEffect, useMemo, useState } from 'react'
import { ListChecks, Plus, Target, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from '@/components/ui/dialog'
import {
  SubtaskAreaWorkspaceRow,
  SubtaskAssigneeDateGrid,
} from '../SubtaskFormFields'
import type { ColaboradorDto } from '../../types'
import { cn } from '@/utils/cn'

export type SubtaskEditorForm = {
  title: string
  description: string
  objectives: string
  checklist: { key: string; text: string; done: boolean }[]
  assignedUserId: number | null
  dueDate: string | null
  areaId: number
  workspaceId: number | null
}

function cloneForm(f: SubtaskEditorForm): SubtaskEditorForm {
  return {
    title: f.title,
    description: f.description,
    objectives: f.objectives,
    checklist: f.checklist.map((c) => ({ ...c })),
    assignedUserId: f.assignedUserId,
    dueDate: f.dueDate,
    areaId: f.areaId,
    workspaceId: f.workspaceId,
  }
}

function newChecklistKey() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `ck-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function SubtaskEditorDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  headerTitle: string
  /** Título de la tarea/proyecto padre (línea «De: …»). */
  parentTaskTitle?: string | null
  saving: boolean
  canEdit: boolean
  initial: SubtaskEditorForm
  minDueDate?: string
  areas: { id: number; name: string }[]
  workspaces: { id: number; name: string }[]
  resolveCollaborators: (areaId: number) => ColaboradorDto[]
  readOnlyAssigneeLabel?: string | null
  onSave: (form: SubtaskEditorForm) => void | Promise<void>
}) {
  const {
    open,
    onOpenChange,
    headerTitle,
    parentTaskTitle,
    saving,
    canEdit,
    initial,
    minDueDate,
    areas,
    workspaces,
    resolveCollaborators,
    readOnlyAssigneeLabel,
    onSave,
  } = props

  const [form, setForm] = useState<SubtaskEditorForm>(() => cloneForm(initial))
  const [checklistDraft, setChecklistDraft] = useState('')

  useEffect(() => {
    if (open) {
      setForm(cloneForm(initial))
      setChecklistDraft('')
    }
  }, [open, initial])

  const collaborators = useMemo(
    () => resolveCollaborators(form.areaId),
    [resolveCollaborators, form.areaId],
  )

  const idle = !saving
  const canSubmit = canEdit && idle && form.title.trim().length > 0

  const checklistProgress = useMemo(() => {
    const withText = form.checklist.filter((c) => c.text.trim().length > 0)
    const done = withText.filter((c) => c.done).length
    const total = withText.length
    const pct = total === 0 ? 0 : Math.round((100 * done) / total)
    return { done, total, pct }
  }, [form.checklist])

  const addChecklistLine = (text = '') => {
    setForm((f) => ({
      ...f,
      checklist: [...f.checklist, { key: newChecklistKey(), text, done: false }],
    }))
  }

  const commitChecklistDraft = () => {
    const t = checklistDraft.trim()
    if (!t) return
    addChecklistLine(t)
    setChecklistDraft('')
  }

  const checklistForApi = useMemo(
    () =>
      form.checklist
        .map((c) => ({ text: c.text.trim(), done: c.done }))
        .filter((c) => c.text.length > 0),
    [form.checklist],
  )

  return (
    <Dialog open={open} onOpenChange={(next) => idle && onOpenChange(next)}>
      <DialogContent
        closable={idle}
        className={cn(
          'max-h-[min(92vh,720px)] w-[min(100%,28rem)] max-w-xl gap-0 overflow-y-auto overflow-x-hidden p-0 sm:rounded-xl',
          'border border-neutral-200 dark:border-neutral-700',
          'bg-white dark:bg-neutral-900 shadow-xl',
        )}
      >
        <DialogHeader className="px-5 pt-5 pb-3 text-left space-y-2 border-b border-neutral-200/90 dark:border-neutral-700/90 bg-white dark:bg-neutral-900 shrink-0 rounded-t-xl">
          <div className="flex items-start gap-3 pr-10">
            <div
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary"
              aria-hidden
            >
              <ListChecks className="h-4 w-4" strokeWidth={2.25} />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-lg font-semibold leading-tight text-foreground">{headerTitle}</p>
              {parentTaskTitle != null && parentTaskTitle.trim() !== '' ? (
                <p className="text-xs text-muted-foreground leading-snug">
                  De: <span className="font-medium text-foreground/90">{parentTaskTitle.trim()}</span>
                </p>
              ) : null}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4 bg-white dark:bg-neutral-900">
          <div className="space-y-1.5">
            <Label htmlFor="subtask-editor-title" className="text-xs font-semibold">
              Título
            </Label>
            <Input
              id="subtask-editor-title"
              variant="plain"
              value={form.title}
              disabled={!canEdit || saving}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="h-10 rounded-lg text-sm border-neutral-300 dark:border-neutral-600"
              placeholder="Nombre de la subtarea"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subtask-editor-description" className="text-xs font-semibold">
              Descripción
            </Label>
            <Textarea
              id="subtask-editor-description"
              value={form.description}
              disabled={!canEdit || saving}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="text-sm resize-y min-h-[64px] rounded-lg border-neutral-300 dark:border-neutral-600"
              placeholder="Detalle opcional"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subtask-editor-objectives" className="flex items-center gap-1.5 text-xs font-semibold">
              <Target className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden />
              Objetivos
            </Label>
            <Textarea
              id="subtask-editor-objectives"
              value={form.objectives}
              disabled={!canEdit || saving}
              onChange={(e) => setForm((f) => ({ ...f, objectives: e.target.value }))}
              rows={3}
              className="text-sm resize-y min-h-[80px] rounded-lg border-neutral-300 dark:border-neutral-600"
              placeholder="Qué se pretende lograr con esta subtarea"
            />
          </div>

          <div
            className={cn(
              'rounded-xl border p-3 sm:p-3.5 shadow-sm space-y-2.5',
              'border-rose-200 dark:border-rose-900/60',
              'bg-rose-50 dark:bg-rose-950/80',
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground">Checklist</span>
              <div className="flex items-center gap-2">
                <span className="inline-flex shrink-0 items-center rounded-full border border-rose-300 bg-white px-2 py-0.5 text-[10px] font-bold tabular-nums text-rose-900 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-100">
                  {checklistProgress.done}/{checklistProgress.total} · {checklistProgress.pct}%
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(
                    'h-7 text-xs gap-1 rounded-md border-rose-300 bg-white hover:bg-rose-50 dark:border-rose-700 dark:bg-rose-950 dark:hover:bg-rose-900',
                  )}
                  disabled={!canEdit || saving}
                  onClick={() => addChecklistLine()}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ítem
                </Button>
              </div>
            </div>

            {form.checklist.length === 0 ? (
              <p className="text-[11px] text-muted-foreground/90 dark:text-muted-foreground">
                Añade pasos con el botón o el campo de abajo.
              </p>
            ) : (
              <ul className="space-y-1.5 max-h-[min(40vh,220px)] overflow-y-auto overscroll-contain pr-0.5">
                {form.checklist.map((row, idx) => (
                  <li key={row.key} className="flex items-start gap-2">
                    <span
                      className="mt-1.5 w-6 shrink-0 text-center text-[10px] font-bold tabular-nums text-rose-700/75 dark:text-rose-300/90"
                      aria-hidden
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <input
                      type="checkbox"
                      className="mt-1.5 h-3.5 w-3.5 shrink-0 rounded border-rose-400 text-rose-600 accent-rose-600 dark:border-rose-600"
                      checked={row.done}
                      disabled={!canEdit || saving}
                      onChange={() =>
                        setForm((f) => ({
                          ...f,
                          checklist: f.checklist.map((c) =>
                            c.key === row.key ? { ...c, done: !c.done } : c,
                          ),
                        }))
                      }
                    />
                    <Input
                      variant="plain"
                      value={row.text}
                      disabled={!canEdit || saving}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          checklist: f.checklist.map((c) =>
                            c.key === row.key ? { ...c, text: e.target.value } : c,
                          ),
                        }))
                      }
                      className="h-9 text-xs flex-1 min-w-0 rounded-lg border-neutral-300 bg-white dark:border-neutral-600 dark:bg-neutral-900"
                      placeholder="Texto del paso"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                      disabled={!canEdit || saving}
                      aria-label="Quitar ítem"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          checklist: f.checklist.filter((c) => c.key !== row.key),
                        }))
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <Input
              variant="plain"
              value={checklistDraft}
              disabled={!canEdit || saving}
              onChange={(e) => setChecklistDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                e.preventDefault()
                commitChecklistDraft()
              }}
              className="h-9 rounded-lg border-neutral-300 bg-white text-xs dark:border-neutral-600 dark:bg-neutral-900"
              placeholder="Añadir paso y pulsar Enter…"
            />
          </div>

          <div className="space-y-3 pt-1">
            <SubtaskAreaWorkspaceRow
              areas={areas}
              workspaces={workspaces}
              areaId={form.areaId}
              workspaceId={form.workspaceId}
              disabled={!canEdit || saving}
              noIndent
              labeled
              onAreaCommit={(nextArea) => setForm((f) => ({ ...f, areaId: nextArea }))}
              onWorkspaceCommit={(nextWs) => setForm((f) => ({ ...f, workspaceId: nextWs }))}
            />

            <SubtaskAssigneeDateGrid
              assignees={collaborators}
              assignedUserId={form.assignedUserId}
              dueDate={form.dueDate}
              min={minDueDate || undefined}
              disabled={!canEdit || saving}
              readOnlyAssigneeLabel={readOnlyAssigneeLabel ?? null}
              noIndent
              labeled
              onAssigneeCommit={(nextAssignee) =>
                setForm((f) => ({ ...f, assignedUserId: nextAssignee }))
              }
              onDueDateCommit={(v) => setForm((f) => ({ ...f, dueDate: v }))}
            />
          </div>

          {checklistForApi.length > 0 && (
            <p className="text-[10px] text-muted-foreground sr-only" aria-live="polite">
              {checklistForApi.filter((x) => x.done).length} de {checklistForApi.length} ítems listos
            </p>
          )}
        </div>

        <DialogFooter className="border-t border-neutral-200/90 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/98 px-4 py-3 gap-2 sm:gap-3 flex-row flex-wrap justify-end shrink-0 rounded-b-xl">
          <Button
            type="button"
            variant="outline"
            className="min-w-[6.5rem] rounded-lg border-neutral-300 bg-white dark:border-neutral-600 dark:bg-neutral-900"
            disabled={!idle}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="workos-gantt-btn-primary min-w-[6.5rem] rounded-lg text-white border-0 shadow-sm px-6"
            disabled={!canSubmit}
            onClick={() => void onSave({ ...form, checklist: form.checklist })}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
