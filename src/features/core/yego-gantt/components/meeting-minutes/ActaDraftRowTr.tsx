import { useMemo, type KeyboardEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/utils/cn'
import type { AreaFull, ColaboradorDto, WorkosMeetingItemStatus } from '../../types'
import { Avatar } from '../common'
import type { ActaNewRowDraft } from './actaDraftTypes'
import {
  ACTA_ACTION_ORANGE_BTN,
  ACTA_ACTION_ORANGE_ICON,
  ACTA_SELECT_NONE,
  EXCEL_ACTA_DATE_INPUT,
  EXCEL_ACTA_SELECT_TRIGGER,
  EXCEL_ACTA_STATUS_SELECT,
} from './actaTableStyles'
import { ITEM_STATUSES, ITEM_STATUS_LABEL } from './labels'

export function ActaDraftRowTr({
  rowIndex,
  value,
  onChange,
  onSave,
  onDiscard,
  sheetBusy,
  areas,
  collaboratorsForArea,
  collaboratorsAll,
  minActaCalendarYmd,
  discardAriaLabel,
}: {
  rowIndex: number
  value: ActaNewRowDraft
  onChange: (next: ActaNewRowDraft) => void
  onSave: () => void
  onDiscard: () => void
  sheetBusy: boolean
  areas: AreaFull[]
  collaboratorsForArea: (areaId: number) => ColaboradorDto[]
  collaboratorsAll: ColaboradorDto[]
  minActaCalendarYmd: string
  discardAriaLabel: string
}) {
  const draftRespOptions = useMemo(
    () => (value.areaId != null ? collaboratorsForArea(value.areaId) : collaboratorsAll),
    [value.areaId, collaboratorsForArea, collaboratorsAll],
  )
  const draftResponsibleAvatarName = useMemo(() => {
    if (value.responsibleUserId != null) {
      const c = draftRespOptions.find((x) => x.id === value.responsibleUserId)
      const n = c?.nombreCompleto?.trim() || value.responsibleNameSnapshot?.trim()
      if (n) return n
    }
    return value.responsibleNameSnapshot?.trim() || null
  }, [value.responsibleUserId, value.responsibleNameSnapshot, draftRespOptions])

  const keyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      void onSave()
    }
  }

  return (
    <tr className="excel-acta-row group">
      <td className="excel-acta-cell text-center tabular-nums text-muted-foreground text-[11px] px-0.5">
        {rowIndex}
      </td>
      <td className="excel-acta-cell p-0 align-middle">
        <div className="px-0.5 py-0 min-w-0">
          <Select
            value={value.areaId != null ? String(value.areaId) : ACTA_SELECT_NONE}
            onValueChange={(v) => {
              if (v === ACTA_SELECT_NONE) {
                onChange({
                  ...value,
                  areaId: undefined,
                  areaNameSnapshot: '',
                  responsibleUserId:
                    value.responsibleUserId != null &&
                    !collaboratorsAll.some((c) => c.id === value.responsibleUserId)
                      ? undefined
                      : value.responsibleUserId,
                })
                return
              }
              const aid = Number(v)
              const aname = areas.find((ar) => ar.id === aid)?.name
              const areaCollabs = collaboratorsForArea(aid)
              onChange({
                ...value,
                areaId: aid,
                areaNameSnapshot: aname?.trim() ?? '',
                responsibleUserId:
                  value.responsibleUserId != null &&
                  !areaCollabs.some((c) => c.id === value.responsibleUserId)
                    ? undefined
                    : value.responsibleUserId,
              })
            }}
            disabled={sheetBusy || areas.length === 0}
          >
            <SelectTrigger className={cn(EXCEL_ACTA_SELECT_TRIGGER)}>
              <SelectValue placeholder="Equipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ACTA_SELECT_NONE}>— Elegir equipo</SelectItem>
              {areas.map((ar) => (
                <SelectItem key={ar.id} value={String(ar.id)}>
                  {ar.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </td>
      <td className="excel-acta-cell p-0">
        <textarea
          className="excel-acta-input max-h-24"
          rows={2}
          value={value.situation}
          onChange={(e) => onChange({ ...value, situation: e.target.value })}
          onKeyDown={keyDown}
          placeholder="Situación (## para bloque sin tarea)"
          disabled={sheetBusy}
          aria-label="Nueva fila situación"
        />
      </td>
      <td className="excel-acta-cell p-0">
        <textarea
          className="excel-acta-input max-h-24"
          rows={2}
          value={value.taskTitle}
          onChange={(e) => onChange({ ...value, taskTitle: e.target.value })}
          onKeyDown={keyDown}
          placeholder="Tarea"
          disabled={sheetBusy}
          aria-label="Nueva fila tarea"
        />
      </td>
      <td className="excel-acta-cell p-0 align-middle">
        <div className="px-0.5 py-0 min-w-0">
          <Select
            value={value.responsibleUserId != null ? String(value.responsibleUserId) : ACTA_SELECT_NONE}
            onValueChange={(v) => {
              if (v === ACTA_SELECT_NONE) {
                onChange({ ...value, responsibleUserId: undefined, responsibleNameSnapshot: '' })
                return
              }
              const rid = Number(v)
              const c = draftRespOptions.find((x) => x.id === rid)
              onChange({
                ...value,
                responsibleUserId: rid,
                responsibleNameSnapshot: c?.nombreCompleto?.trim() ?? '',
              })
            }}
            disabled={sheetBusy}
          >
            <SelectTrigger
              className={cn(
                EXCEL_ACTA_SELECT_TRIGGER,
                'flex flex-row items-center gap-1.5 min-w-0 [&>span]:min-w-0 [&>span]:truncate',
              )}
            >
              {draftResponsibleAvatarName ? (
                <Avatar
                  name={draftResponsibleAvatarName}
                  size="xs"
                  variant="picker"
                  className="shrink-0"
                  title={draftResponsibleAvatarName}
                />
              ) : null}
              <SelectValue placeholder="Responsable" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ACTA_SELECT_NONE}>— Elegir responsable</SelectItem>
              {draftRespOptions.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.nombreCompleto ?? '—'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </td>
      <td className="excel-acta-cell p-0 align-middle">
        <input
          type="date"
          className={EXCEL_ACTA_DATE_INPUT}
          min={minActaCalendarYmd}
          value={value.startDate}
          onChange={(e) => onChange({ ...value, startDate: e.target.value })}
          onKeyDown={keyDown}
          disabled={sheetBusy}
        />
      </td>
      <td className="excel-acta-cell p-0 align-middle">
        <input
          type="date"
          className={EXCEL_ACTA_DATE_INPUT}
          min={minActaCalendarYmd}
          value={value.deadline}
          onChange={(e) => onChange({ ...value, deadline: e.target.value })}
          onKeyDown={keyDown}
          disabled={sheetBusy}
        />
      </td>
      <td className="excel-acta-cell px-0.5 py-0 align-middle">
        <div className="min-w-0">
          <select
            className={EXCEL_ACTA_STATUS_SELECT}
            value={value.status}
            disabled={sheetBusy}
            onChange={(e) =>
              onChange({ ...value, status: e.target.value as WorkosMeetingItemStatus })
            }
            aria-label="Nueva fila estado"
          >
            {ITEM_STATUSES.map((st) => (
              <option key={st} value={st}>
                {ITEM_STATUS_LABEL[st]}
              </option>
            ))}
          </select>
        </div>
      </td>
      <td className="excel-acta-cell text-left align-middle">
        <div className="inline-flex flex-row items-center justify-start gap-0.5 pl-0.5 pr-0.5 py-0">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={ACTA_ACTION_ORANGE_BTN}
            disabled={sheetBusy}
            onClick={() => void onSave()}
            aria-label="Guardar esta fila en el acta"
          >
            Guardar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={ACTA_ACTION_ORANGE_ICON}
            disabled={sheetBusy}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onDiscard()
            }}
            aria-label={discardAriaLabel}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  )
}
