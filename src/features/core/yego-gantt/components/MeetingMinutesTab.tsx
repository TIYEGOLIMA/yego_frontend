import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  addMeetingMinuteItems,
  convertMeetingItemToTask,
  createMeetingMinute,
  deleteMeetingMinuteItem,
  fetchMeetingMinuteById,
  omitUndefinedKeys,
  parseGanttLoadError,
  patchMeetingMinuteStatus,
  softDeleteMeetingMinute,
  updateMeetingMinute,
  updateMeetingMinuteItem,
  type CreateMeetingMinuteItemPayload,
  type CreateMeetingMinutePayload,
  type ConvertMeetingItemPayload,
  type UpdateMeetingMinuteItemPayload,
} from '../ganttApi'
import type {
  AreaFull,
  AreaTaskStatus,
  ColaboradorDto,
  GanttOpenTaskHint,
  MeetingMinuteItemResponse,
  MeetingMinuteResponse,
  MeetingMinuteStatus,
  MeetingMinuteType,
  SprintDto,
  TaskPriority,
  WorkspaceDto,
  WorkosMeetingItemStatus,
  WorkosMeetingItemType,
} from '../types'
import { PRIORITY_LABEL, STATUS_LABEL } from '../utils'
import { ActaDraftRowTr } from './meeting-minutes/ActaDraftRowTr'
import {
  actaListAssigneeDisplayNames,
  actaResponsibleAvatarMeta,
  displayActaArea,
  fetchAllActasFromApi,
  isActaSectionHeaderRow,
  meetingItemDeletePreviewLine,
  sortActasByMeetingDateDesc,
} from './meeting-minutes/actaHelpers'
import { actaDetailPermissions } from './meeting-minutes/actaDetailPermissions'
import {
  type ActaNewRowDraft,
  type LocalActaDraftRow,
  meetingMinuteDraftNewRowIsEmpty,
  stickyResetActaNewRowKeepTeam,
} from './meeting-minutes/actaDraftTypes'
import {
  ACTAS_FETCH_SIZE,
  ACTAS_LIST_PAGE_SIZE,
  ACTA_ACTION_ORANGE_BTN,
  ACTA_ACTION_ORANGE_ICON,
  ACTA_SELECT_NONE,
  EXCEL_ACTA_DATE_INPUT,
  EXCEL_ACTA_SELECT_TRIGGER,
  EXCEL_ACTA_STATUS_SELECT,
} from './meeting-minutes/actaTableStyles'
import {
  formatListRowDate,
  formatShortDate,
  itemStatusBadgeClass,
  itemTypeBadgeClass,
  MEETING_STATUS_LABEL,
  MEETING_TYPE_LABEL,
  ITEM_STATUS_LABEL,
  ITEM_STATUSES,
  ITEM_TYPE_LABEL,
  meetingStatusBadgeClass,
  RESTRICTED_ACTA_VIEW_NOTICE,
  taskStatusLabel,
} from './meeting-minutes/labels'
import { parseMeetingItemsTsv } from './meeting-minutes/parseMeetingItemsTsv'
import { WorkosTabLoading } from './WorkosLoading'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/utils/cn'
import { ArrowLeft, ClipboardPaste, ChevronRight, FileText, Loader2, PencilLine, Plus, Trash2 } from 'lucide-react'
import { Avatar, AvatarGroup, ProgressBar } from './common'

export interface MeetingMinutesTabProps {
  areas: AreaFull[]
  workspaces: WorkspaceDto[]
  allSprints: SprintDto[]
  collaboratorsForArea: (areaId: number) => ColaboradorDto[]
  manage: boolean
  onOpenTaskById: (taskId: number, hint?: GanttOpenTaskHint) => void | Promise<void>
  /** Si viene del calendario: abre el alta de acta con esta fecha y se consume al aplicar. */
  initialMeetingDate?: string | null
  onConsumedInitialMeetingDate?: () => void
}

export function MeetingMinutesTab({
  areas,
  workspaces,
  allSprints,
  collaboratorsForArea,
  manage,
  onOpenTaskById,
  initialMeetingDate,
  onConsumedInitialMeetingDate,
}: MeetingMinutesTabProps) {
  const [page, setPage] = useState(0)
  const [allActas, setAllActas] = useState<MeetingMinuteResponse[]>([])
  const [listBusy, setListBusy] = useState(true)
  /** Evita disparar varias cargas completas del listado en paralelo (misma URL repetida). */
  const listLoadInFlightRef = useRef<Promise<void> | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<MeetingMinuteStatus | 'all'>('all')
  const [filterType, setFilterType] = useState<MeetingMinuteType | 'all'>('all')

  const [detailId, setDetailId] = useState<number | null>(null)
  const [detail, setDetail] = useState<MeetingMinuteResponse | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [minuteDialogOpen, setMinuteDialogOpen] = useState(false)
  const [minuteSaving, setMinuteSaving] = useState(false)
  const [editingMinuteId, setEditingMinuteId] = useState<number | null>(null)
  const [minuteForm, setMinuteForm] = useState<CreateMeetingMinutePayload>({
    title: '',
    meetingDate: new Date().toISOString().slice(0, 10),
    meetingType: 'OPERATIVA',
    summary: '',
    status: 'ABIERTA',
  })

  const [draftNewRow, setDraftNewRow] = useState({
    areaId: undefined as number | undefined,
    responsibleUserId: undefined as number | undefined,
    areaNameSnapshot: '',
    situation: '',
    taskTitle: '',
    responsibleNameSnapshot: '',
    startDate: '',
    deadline: '',
    status: 'PENDIENTE' as WorkosMeetingItemStatus,
  })
  const draftNewRowRef = useRef(draftNewRow)
  draftNewRowRef.current = draftNewRow
  const [localDraftRows, setLocalDraftRows] = useState<LocalActaDraftRow[]>([])
  const [showBottomDraftRow, setShowBottomDraftRow] = useState(true)
  const [sheetBusy, setSheetBusy] = useState(false)

  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [pasteBusy, setPasteBusy] = useState(false)

  const [convertItem, setConvertItem] = useState<MeetingMinuteItemResponse | null>(null)
  const [convertBusy, setConvertBusy] = useState(false)
  const [convertForm, setConvertForm] = useState<ConvertMeetingItemPayload>({})
  const [deleteItemTarget, setDeleteItemTarget] = useState<MeetingMinuteItemResponse | null>(null)
  const [deleteItemBusy, setDeleteItemBusy] = useState(false)
  const [softDeleteActaOpen, setSoftDeleteActaOpen] = useState(false)
  const [softDeleteActaBusy, setSoftDeleteActaBusy] = useState(false)

  const collaboratorsAll = useMemo(() => {
    const m = new Map<number, ColaboradorDto>()
    for (const ar of areas) {
      for (const c of collaboratorsForArea(ar.id)) {
        if (!m.has(c.id)) m.set(c.id, c)
      }
    }
    return [...m.values()].sort((a, b) =>
      (a.nombreCompleto || '').localeCompare(b.nombreCompleto || '', 'es', { sensitivity: 'base' }),
    )
  }, [areas, collaboratorsForArea])

  const collaboratorsById = useMemo(
    () => new Map(collaboratorsAll.map((c) => [c.id, c])),
    [collaboratorsAll],
  )

  /** KPI: solo `GET` detalle (incluye kpis); sin conversiones → avance 0 %. */
  const detailKpiDisplay = useMemo(() => {
    const k = detail?.kpis
    if (!k) return null
    const convertedItems = k.convertedItems
    const completionPercentage =
      convertedItems === 0 ? 0 : Math.round(Number(k.completionPercentage ?? 0))
    return {
      totalItems: k.totalItems,
      convertedItems,
      pendingWithoutTask: k.pendingWithoutTask,
      completionPercentage,
    }
  }, [detail?.kpis])

  const actaPerms = useMemo(() => actaDetailPermissions(manage, detail), [manage, detail])

  /** Carga todas las actas (sin filtros). Varias llamadas seguidas comparten la misma petición. */
  const loadList = useCallback(async () => {
    if (listLoadInFlightRef.current != null) return listLoadInFlightRef.current
    const run = (async () => {
      setErr(null)
      setListBusy(true)
      try {
        setAllActas(await fetchAllActasFromApi(ACTAS_FETCH_SIZE))
      } catch (e) {
        setErr(parseGanttLoadError(e))
      } finally {
        setListBusy(false)
      }
    })()
    listLoadInFlightRef.current = run.finally(() => {
      listLoadInFlightRef.current = null
    })
    return listLoadInFlightRef.current
  }, [])

  useEffect(() => {
    void loadList()
  }, [loadList])

  const { totalElements, totalPages, maxPage, safePage, pagedActas } = useMemo(() => {
    const filtered = allActas.filter((row) => {
      if (filterStatus !== 'all' && row.status !== filterStatus) return false
      if (filterType !== 'all' && row.meetingType !== filterType) return false
      return true
    })
    const n = filtered.length
    const pages = Math.max(1, Math.ceil(n / ACTAS_LIST_PAGE_SIZE))
    const maxIdx = Math.max(0, pages - 1)
    const safe = Math.min(page, maxIdx)
    const start = safe * ACTAS_LIST_PAGE_SIZE
    return {
      totalElements: n,
      totalPages: pages,
      maxPage: maxIdx,
      safePage: safe,
      pagedActas: filtered.slice(start, start + ACTAS_LIST_PAGE_SIZE),
    }
  }, [allActas, filterStatus, filterType, page])

  const openDetail = useCallback(async (id: number) => {
    setDetailId(id)
    setDetailLoading(true)
    setErr(null)
    try {
      setDetail(await fetchMeetingMinuteById(id))
    } catch (e) {
      setErr(parseGanttLoadError(e))
      setDetailId(null)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    setLocalDraftRows([])
    setShowBottomDraftRow(true)
    setSoftDeleteActaOpen(false)
  }, [detailId])

  useEffect(() => {
    if (initialMeetingDate) {
      setMinuteForm((f) => ({
        ...f,
        meetingDate: initialMeetingDate,
        title: f.title || `Acta ${formatShortDate(initialMeetingDate)}`,
      }))
      setEditingMinuteId(null)
      setMinuteDialogOpen(true)
      onConsumedInitialMeetingDate?.()
    }
  }, [initialMeetingDate, onConsumedInitialMeetingDate])

  /** Actualiza una fila del listado en memoria (sin volver a pedir page=0&size=100). */
  const syncActaRowInAllActas = useCallback((updated: MeetingMinuteResponse) => {
    setAllActas((rows) => {
      const idx = rows.findIndex((r) => r.id === updated.id)
      if (idx < 0) return rows
      const next = [...rows]
      next[idx] = updated
      return next
    })
  }, [])

  // Tras mutación: detalle + KPIs en un paso; sincroniza fila del listado.
  const applyMeetingMinuteFromMutation = useCallback(
    (res: MeetingMinuteResponse) => {
      setDetail(res)
      syncActaRowInAllActas(res)
    },
    [syncActaRowInAllActas],
  )

  const sprintsForWorkspace = useMemo(() => {
    const wid = convertForm.workspaceId
    if (wid == null) return []
    return allSprints.filter(
      (s) =>
        s.workspaceId === wid &&
        s.status !== 'COMPLETED' &&
        s.status !== 'CANCELLED',
    )
  }, [allSprints, convertForm.workspaceId])

  const persistItemPatch = useCallback(
    async (itemId: number, patch: UpdateMeetingMinuteItemPayload) => {
      if (detailId == null) return
      if (!actaPerms.canEditRows) return
      setSheetBusy(true)
      setErr(null)
      try {
        const res = await updateMeetingMinuteItem(
          detailId,
          itemId,
          omitUndefinedKeys(patch as Record<string, unknown>) as UpdateMeetingMinuteItemPayload,
        )
        applyMeetingMinuteFromMutation(res)
      } catch (e) {
        setErr(parseGanttLoadError(e))
      } finally {
        setSheetBusy(false)
      }
    },
    [detailId, actaPerms.canEditRows, applyMeetingMinuteFromMutation],
  )

  const commitActaNewRowDraft = useCallback(
    async (draft: ActaNewRowDraft): Promise<MeetingMinuteItemResponse | null> => {
      if (detailId == null || !manage) return null
      if (meetingMinuteDraftNewRowIsEmpty(draft)) return null
      const aid = draft.areaId
      const rid = draft.responsibleUserId
      const a = draft.areaNameSnapshot.trim()
      const s = draft.situation.trim()
      const t = draft.taskTitle.trim()
      const r = draft.responsibleNameSnapshot.trim()
      const sd = draft.startDate.trim()
      const dl = draft.deadline.trim()
      const isSection = s.startsWith('##') && !t
      const areaName =
        a || (aid != null ? areas.find((ar) => ar.id === aid)?.name?.trim() : '') || undefined
      const respList = aid != null ? collaboratorsForArea(aid) : collaboratorsAll
      const respName =
        r ||
        (rid != null ? respList.find((c) => c.id === rid)?.nombreCompleto?.trim() : '') ||
        undefined
      setSheetBusy(true)
      setErr(null)
      try {
        const res = await addMeetingMinuteItems(detailId, [
          omitUndefinedKeys({
            itemType: (isSection ? 'INFORMACION' : 'ACCION') as WorkosMeetingItemType,
            status: draft.status,
            areaId: aid,
            areaNameSnapshot: areaName || undefined,
            situation: s || undefined,
            taskTitle: isSection ? undefined : t || undefined,
            responsibleUserId: rid,
            responsibleNameSnapshot: respName || undefined,
            startDate: sd ? sd.slice(0, 10) : undefined,
            deadline: dl ? dl.slice(0, 10) : undefined,
          } as CreateMeetingMinuteItemPayload),
        ])
        const items = res.items ?? []
        const created =
          items.length === 0
            ? null
            : items.reduce((best, cur) => (cur.id >= best.id ? cur : best), items[0])
        applyMeetingMinuteFromMutation(res)
        return created
      } catch (e) {
        setErr(parseGanttLoadError(e))
        return null
      } finally {
        setSheetBusy(false)
      }
    },
    [detailId, manage, applyMeetingMinuteFromMutation, areas, collaboratorsForArea, collaboratorsAll],
  )

  const tryCommitDraftNewRow = useCallback(async () => {
    if (!showBottomDraftRow) return
    const created = await commitActaNewRowDraft(draftNewRowRef.current)
    if (created) {
      setDraftNewRow((prev) => stickyResetActaNewRowKeepTeam(prev))
    }
  }, [commitActaNewRowDraft, showBottomDraftRow])

  const saveLocalDraftRow = useCallback(
    async (row: LocalActaDraftRow) => {
      const { tempId, ...draft } = row
      const created = await commitActaNewRowDraft(draft)
      if (created) {
        setLocalDraftRows((prev) => prev.filter((r) => r.tempId !== tempId))
      }
    },
    [commitActaNewRowDraft],
  )

  const patchLocalDraftRow = useCallback((tempId: string, next: ActaNewRowDraft) => {
    setLocalDraftRows((prev) =>
      prev.map((r) => (r.tempId === tempId ? { tempId, ...next } : r)),
    )
  }, [])

  const removeLocalDraftRow = useCallback((tempId: string) => {
    setLocalDraftRows((prev) => prev.filter((r) => r.tempId !== tempId))
  }, [])

  const clearDraftNewRow = useCallback(() => {
    setDraftNewRow({
      areaId: undefined,
      responsibleUserId: undefined,
      areaNameSnapshot: '',
      situation: '',
      taskTitle: '',
      responsibleNameSnapshot: '',
      startDate: '',
      deadline: '',
      status: 'PENDIENTE',
    })
  }, [])

  const appendOrRevealDraftRow = useCallback(() => {
    if (!showBottomDraftRow) {
      setShowBottomDraftRow(true)
      setDraftNewRow((prev) => stickyResetActaNewRowKeepTeam(prev))
      return
    }
    setLocalDraftRows((prev) => [
      ...prev,
      { tempId: crypto.randomUUID(), ...stickyResetActaNewRowKeepTeam(draftNewRowRef.current) },
    ])
  }, [showBottomDraftRow])

  const openConvert = useCallback(
    (it: MeetingMinuteItemResponse) => {
      if (it.converted) return
      const areaId = it.areaId ?? areas[0]?.id
      const workspaceId = it.projectId ?? undefined
      let sprintId = it.sprintId ?? undefined
      if (sprintId != null && workspaceId != null) {
        const sp = allSprints.find((s) => s.id === sprintId && s.workspaceId === workspaceId)
        if (!sp || sp.status === 'COMPLETED' || sp.status === 'CANCELLED') {
          sprintId = undefined
        }
      }
      const start = it.startDate ?? detail?.meetingDate ?? new Date().toISOString().slice(0, 10)
      const end = it.deadline ?? start
      setConvertItem(it)
      setConvertForm(
        omitUndefinedKeys({
          title: it.taskTitle ?? undefined,
          description: it.taskDescription ?? undefined,
          areaId: areaId ?? undefined,
          workspaceId,
          sprintId,
          startDate: start,
          endDate: end,
          status: 'PENDING',
          priority: 'MEDIUM',
          assignedUserId: it.responsibleUserId ?? undefined,
          privateTask: false,
        } as ConvertMeetingItemPayload),
      )
    },
    [areas, allSprints, detail?.meetingDate],
  )

  const confirmDeleteMeetingItem = useCallback(async () => {
    const it = deleteItemTarget
    if (it == null || it.converted || detailId == null) return
    setDeleteItemBusy(true)
    setErr(null)
    try {
      await deleteMeetingMinuteItem(detailId, it.id)
      const res = await fetchMeetingMinuteById(detailId)
      applyMeetingMinuteFromMutation(res)
      setDeleteItemTarget(null)
    } catch (e) {
      setErr(parseGanttLoadError(e))
    } finally {
      setDeleteItemBusy(false)
    }
  }, [deleteItemTarget, detailId, applyMeetingMinuteFromMutation])

  const saveMinute = async () => {
    if (!minuteForm.title.trim() || !minuteForm.meetingDate) return
    setMinuteSaving(true)
    setErr(null)
    try {
      if (editingMinuteId != null) {
        const res = await updateMeetingMinute(editingMinuteId, minuteForm)
        setMinuteDialogOpen(false)
        setAllActas((rows) => {
          const idx = rows.findIndex((r) => r.id === res.id)
          if (idx < 0) return rows
          const next = [...rows]
          next[idx] = res
          return sortActasByMeetingDateDesc(next)
        })
        if (detailId === res.id) {
          setDetail(res)
        }
      } else {
        const res = await createMeetingMinute(minuteForm)
        setMinuteDialogOpen(false)
        setAllActas((rows) =>
          sortActasByMeetingDateDesc([res, ...rows.filter((r) => r.id !== res.id)]),
        )
      }
    } catch (e) {
      setErr(parseGanttLoadError(e))
    } finally {
      setMinuteSaving(false)
    }
  }

  const patchStatus = async (id: number, status: MeetingMinuteStatus) => {
    try {
      await patchMeetingMinuteStatus(id, status)
      setAllActas((rows) => rows.map((r) => (r.id === id ? { ...r, status } : r)))
      if (detailId === id) {
        setDetail((d) => (d ? { ...d, status } : d))
      }
    } catch (e) {
      setErr(parseGanttLoadError(e))
    }
  }

  const confirmSoftDeleteActa = useCallback(async () => {
    if (detailId == null) return
    const id = detailId
    setSoftDeleteActaBusy(true)
    setErr(null)
    try {
      await softDeleteMeetingMinute(id)
      setSoftDeleteActaOpen(false)
      setDetailId(null)
      setDetail(null)
      setAllActas((rows) => rows.filter((r) => r.id !== id))
    } catch (e) {
      setErr(parseGanttLoadError(e))
    } finally {
      setSoftDeleteActaBusy(false)
    }
  }, [detailId])

  const submitPaste = async () => {
    if (detailId == null) return
    const items = parseMeetingItemsTsv(pasteText)
    if (items.length === 0) {
      setErr('No hay filas válidas')
      return
    }
    setPasteBusy(true)
    setErr(null)
    try {
      const res = await addMeetingMinuteItems(detailId, items)
      setPasteOpen(false)
      setPasteText('')
      applyMeetingMinuteFromMutation(res)
    } catch (e) {
      setErr(parseGanttLoadError(e))
    } finally {
      setPasteBusy(false)
    }
  }

  const submitConvert = async () => {
    if (detailId == null || convertItem == null) return
    setConvertBusy(true)
    setErr(null)
    try {
      const conv = await convertMeetingItemToTask(detailId, convertItem.id, convertForm)
      setConvertItem(null)
      const updated = await fetchMeetingMinuteById(detailId)
      applyMeetingMinuteFromMutation(updated)
      await onOpenTaskById(conv.task.id, {
        workspaceId: conv.task.workspaceId,
        privateTask: conv.task.privateTask === true,
      })
    } catch (e) {
      setErr(parseGanttLoadError(e))
    } finally {
      setConvertBusy(false)
    }
  }

  const actaNumberedRowCount = useMemo(
    () => (detail?.items ?? []).filter((it) => !isActaSectionHeaderRow(it)).length,
    [detail?.items],
  )

  if (listBusy && allActas.length === 0 && detailId == null) {
    return <WorkosTabLoading srLabel="Cargando actas…" />
  }

  return (
    <div className="space-y-4 relative">
      {err && (
        <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2 border border-destructive/20">
          {err}
        </div>
      )}

      {detailId != null && (
        <div className="space-y-4">
          {detailLoading ? (
            <>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto shrink-0 gap-1.5 rounded-md border-border/60 px-3 py-1.5 text-sm font-medium shadow-none"
                  onClick={() => {
                    setDetailId(null)
                    setDetail(null)
                  }}
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                  Listado
                </Button>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span
                    className="h-5 max-w-md flex-1 rounded bg-muted/40 animate-pulse"
                    aria-hidden
                  />
                </div>
              </div>
              <WorkosTabLoading srLabel="Cargando acta…" />
            </>
          ) : detail ? (
            <>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto shrink-0 gap-1.5 rounded-md border-border/60 px-3 py-1.5 text-sm font-medium shadow-none"
                  onClick={() => {
                    setDetailId(null)
                    setDetail(null)
                  }}
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                  Listado
                </Button>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <h1 className="min-w-0 truncate text-base font-bold uppercase tracking-tight text-foreground sm:text-lg">
                    {detail.title}
                  </h1>
                </div>
              </div>

              {actaPerms.restrictedView ? (
                <div
                  role="status"
                  className="rounded-lg border border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/35 px-3 py-2.5 text-sm text-foreground/90 leading-snug"
                >
                  {RESTRICTED_ACTA_VIEW_NOTICE}
                </div>
              ) : null}

              {/* Cabecera: fecha, tipo/estado, resumen, estado del acta, acciones */}
              <div className="rounded-xl border border-border/80 bg-card workos-shadow-soft shadow-sm p-4 sm:p-5">
                <div className="flex flex-col xl:flex-row gap-5 xl:gap-8">
                  <div className="flex gap-4 flex-1 min-w-0">
                    {(() => {
                      const { day, rest } = formatListRowDate(detail.meetingDate)
                      return (
                        <div className="flex flex-col items-center justify-center shrink-0 w-[4.75rem] rounded-xl border border-border/80 bg-background px-2 py-3 text-center">
                          <span className="yego-heading-3 tabular-nums leading-none">{day}</span>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-1.5 leading-tight">
                            {rest}
                          </span>
                        </div>
                      )
                    })()}
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex text-[11px] px-2 py-0.5 rounded-md border border-border/70 bg-background font-medium text-muted-foreground">
                          {MEETING_TYPE_LABEL[detail.meetingType]}
                        </span>
                        <span
                          className={cn(
                            'inline-flex text-[11px] px-2 py-0.5 rounded-md border font-semibold',
                            meetingStatusBadgeClass(detail.status),
                          )}
                        >
                          {MEETING_STATUS_LABEL[detail.status]}
                        </span>
                      </div>
                      {detail.summary ? (
                        <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                          {detail.summary}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Sin resumen.</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row xl:flex-col gap-3 shrink-0 xl:w-[240px]">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">
                        Estado del acta
                      </Label>
                      <Select
                        value={detail.status}
                        disabled={actaPerms.restrictedView}
                        onValueChange={(v) => void patchStatus(detail.id, v as MeetingMinuteStatus)}
                      >
                        <SelectTrigger className="w-full h-10 rounded-lg border-border/80">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(MEETING_STATUS_LABEL) as MeetingMinuteStatus[]).map((s) => (
                            <SelectItem key={s} value={s}>
                              {MEETING_STATUS_LABEL[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {actaPerms.canManageFullActa ? (
                      <div className="flex flex-wrap gap-2 xl:flex-col">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="inline-flex h-auto min-h-9 w-full min-w-0 items-center justify-center gap-1.5 rounded-full !border-2 !border-destructive !bg-transparent !text-destructive hover:!bg-destructive/10 hover:!text-destructive [&_svg]:!text-destructive"
                          onClick={() => {
                            setEditingMinuteId(detail.id)
                            setMinuteForm({
                              title: detail.title,
                              meetingDate: detail.meetingDate.slice(0, 10),
                              meetingType: detail.meetingType,
                              summary: detail.summary ?? '',
                              status: detail.status,
                              nextMeetingDate: detail.nextMeetingDate?.slice(0, 10),
                              ownerUserId: detail.ownerUserId ?? undefined,
                            })
                            setMinuteDialogOpen(true)
                          }}
                        >
                          <PencilLine className="h-4 w-4 shrink-0" aria-hidden />
                          Editar cabecera
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="inline-flex h-auto min-h-9 w-full min-w-0 items-center justify-center gap-1.5 rounded-full !border-2 !border-destructive !bg-transparent !text-destructive hover:!bg-destructive/10 hover:!text-destructive [&_svg]:!text-destructive"
                          onClick={() => setSoftDeleteActaOpen(true)}
                        >
                          <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
                          Dar de baja
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {detailKpiDisplay != null && (
                <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-border/70 bg-muted/25 dark:bg-muted/15 px-4 py-3 border-l-[3px] border-l-sky-500 shadow-sm">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Ítems
                    </div>
                    <div className="text-2xl font-bold tabular-nums mt-1">
                      {detailKpiDisplay.totalItems}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-muted/25 dark:bg-muted/15 px-4 py-3 border-l-[3px] border-l-violet-500 shadow-sm">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Convertidos
                    </div>
                    <div className="text-2xl font-bold tabular-nums mt-1">
                      {detailKpiDisplay.convertedItems}
                    </div>
                  </div>
                  <div
                    className="rounded-lg border border-border/70 bg-muted/25 dark:bg-muted/15 px-4 py-3 border-l-[3px] border-l-amber-500 shadow-sm"
                    title="Puntos del acta que aún no tienen tarea en el Gantt (no se ha pulsado Convertir). Incluye todos los ítems sin tarea vinculada, sea cual sea su estado en el acta."
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Sin convertir
                    </div>
                    <div className="text-2xl font-bold tabular-nums mt-1">
                      {detailKpiDisplay.pendingWithoutTask}
                    </div>
                  </div>
                  <div
                    className="rounded-lg border border-border/70 bg-muted/25 dark:bg-muted/15 px-4 py-3 border-l-[3px] border-l-emerald-500 shadow-sm"
                    title="Solo sobre puntos ya convertidos en tarea Gantt: porcentaje cuyas tareas están terminadas (DONE). Si aún no hay ninguno convertido, el avance es 0 %."
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Avance en tareas
                    </div>
                    <div className="text-2xl font-bold tabular-nums mt-1 text-foreground">
                      {detailKpiDisplay.completionPercentage}%
                    </div>
                  </div>
                </section>
              )}

              <section
                className="rounded-xl border border-border/80 bg-card workos-shadow-soft shadow-sm overflow-hidden"
                aria-labelledby="acta-puntos-heading"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-3 sm:px-4 py-2.5 border-b border-border/50 bg-muted/10 dark:bg-muted/5">
                  <div>
                    <h2 id="acta-puntos-heading" className="text-xs font-semibold text-foreground tracking-tight">
                      Puntos del acta
                    </h2>
                    {sheetBusy ? (
                      <p className="text-[11px] text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                        Guardando…
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-md gap-1 text-[11px] border-border/80 px-2.5"
                      disabled={actaPerms.restrictedView}
                      onClick={() => setPasteOpen(true)}
                    >
                      <ClipboardPaste className="h-4 w-4" />
                      Pegar filas
                    </Button>
                  </div>
                </div>

                <div className="excel-acta-sheet excel-acta-sheet--compact w-full min-w-0 overflow-x-auto pb-4">
                <table className="w-full min-w-0 text-[11px] leading-tight">
                  <thead>
                    <tr className="excel-acta-head">
                      <th className="w-9 text-center" title="Correlativo">
                        N°
                      </th>
                      <th className="w-[14%] min-w-0" title="Equipo / unidad (texto libre)">
                        Área
                      </th>
                      <th className="w-[14%] min-w-0" title="Contexto o problema (el «por qué»)">
                        Situación
                      </th>
                      <th className="w-[14%] min-w-0" title="Acción acordada (el «qué»); se usa al convertir a tarea Gantt">
                        Tarea
                      </th>
                      <th className="w-[18%] min-w-0" title="Personas asignadas (texto libre, varios nombres)">
                        Responsable
                      </th>
                      <th className="w-[8%] min-w-0" title="Inicio; vacío equivale a «en curso / ongoing»">
                        Inicio
                      </th>
                      <th className="w-[8%] min-w-0" title="Fecha de término acordada">
                        Fecha fin
                      </th>
                      <th className="w-[8%] min-w-0">Estado</th>
                      <th className="text-left w-[4.25rem] min-w-[4rem] whitespace-nowrap pl-1">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.items ?? []).length === 0 && !actaPerms.canEditRows && !actaPerms.restrictedView ? (
                      <tr>
                        <td colSpan={9} className="excel-acta-cell text-center text-muted-foreground py-10">
                          Sin puntos en esta acta.
                        </td>
                      </tr>
                    ) : null}
                    {(() => {
                      let displayN = 0
                      return (detail.items ?? []).map((it) => {
                        if (isActaSectionHeaderRow(it)) {
                          const canEdit = actaPerms.canEditRows && !it.converted
                          const canDeleteRow = actaPerms.canManageFullActa
                          return (
                            <tr key={it.id} className="excel-acta-section-row">
                              <td colSpan={9} className="excel-acta-cell">
                                <div className="flex flex-wrap items-center gap-2">
                                  {canEdit ? (
                                    <textarea
                                      key={`${it.id}-sec-${it.updatedAt}`}
                                      className="excel-acta-input min-h-[1.75rem] flex-1 font-semibold text-[11px]"
                                      defaultValue={it.situation ?? ''}
                                      disabled={sheetBusy}
                                      placeholder="## Encabezado de bloque"
                                      onBlur={(e) =>
                                        void persistItemPatch(it.id, {
                                          situation: e.target.value.trim() || null,
                                        })
                                      }
                                    />
                                  ) : (
                                    <span className="flex-1">
                                      {it.situation?.replace(/^##\s*/, '').trim() || '—'}
                                    </span>
                                  )}
                                  {canEdit && canDeleteRow ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 shrink-0 p-0 rounded-md text-orange-700 hover:text-orange-900 hover:bg-orange-500/15 dark:text-orange-300 dark:hover:text-orange-200 dark:hover:bg-orange-950/35"
                                      onClick={() => setDeleteItemTarget(it)}
                                      aria-label="Eliminar bloque"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          )
                        }

                        displayN += 1
                        const rowCorrelative = displayN

                        const canEdit = actaPerms.canEditRows && !it.converted
                        const canDeleteRow = actaPerms.canManageFullActa
                      const inicioText = it.startDate ? formatShortDate(it.startDate) : null
                      const respOptions =
                        it.areaId != null ? collaboratorsForArea(it.areaId) : collaboratorsAll
                      const rspMeta = actaResponsibleAvatarMeta(it, respOptions, collaboratorsById)

                      return (
                        <tr key={it.id} className="excel-acta-row group">
                          <td className="excel-acta-cell text-center tabular-nums text-muted-foreground text-[11px] px-0.5">
                            {rowCorrelative}
                          </td>
                          <td className="excel-acta-cell p-0 align-middle">
                            {canEdit ? (
                              <div className="px-0.5 py-0 min-w-0" key={`${it.id}-arbox-${it.updatedAt}`}>
                                <Select
                                  value={it.areaId != null ? String(it.areaId) : ACTA_SELECT_NONE}
                                  onValueChange={(v) => {
                                    if (v === ACTA_SELECT_NONE) return
                                    const aid = Number(v)
                                    const aname = areas.find((ar) => ar.id === aid)?.name
                                    void persistItemPatch(it.id, {
                                      areaId: aid,
                                      areaNameSnapshot: aname?.trim() || null,
                                    })
                                  }}
                                  disabled={sheetBusy || areas.length === 0}
                                >
                                  <SelectTrigger className={EXCEL_ACTA_SELECT_TRIGGER}>
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
                            ) : (
                              <span className="block px-1 py-0.5 text-[11px]">{displayActaArea(it, areas)}</span>
                            )}
                          </td>
                          <td className="excel-acta-cell p-0 align-middle">
                            {canEdit ? (
                              <textarea
                                key={`${it.id}-si-${it.updatedAt}`}
                                className="excel-acta-input max-h-24 px-0.5"
                                rows={2}
                                defaultValue={it.situation ?? ''}
                                disabled={sheetBusy}
                                placeholder="Situación"
                                onBlur={(e) =>
                                  void persistItemPatch(it.id, {
                                    situation: e.target.value.trim() || null,
                                  })
                                }
                              />
                            ) : (
                              <div className="min-w-0 w-full px-1 py-0.5">
                                <div className="font-medium text-[11px] whitespace-pre-wrap break-words">
                                  {[it.situation?.trim(), it.decision?.trim()]
                                    .filter(Boolean)
                                    .join('\n\n') || '—'}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="excel-acta-cell p-0 align-middle">
                            {canEdit ? (
                              <textarea
                                key={`${it.id}-tt-${it.updatedAt}`}
                                className="excel-acta-input max-h-24"
                                rows={2}
                                defaultValue={it.taskTitle ?? ''}
                                disabled={sheetBusy}
                                placeholder="Tarea"
                                onBlur={(e) =>
                                  void persistItemPatch(it.id, {
                                    taskTitle: e.target.value.trim() || null,
                                  })
                                }
                              />
                            ) : (
                              <div className="px-1 py-0.5">
                                {it.taskTitle ? (
                                  <div className="font-medium text-[11px] whitespace-pre-wrap break-words">{it.taskTitle}</div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </div>
                            )}
                            {it.convertedTaskId != null && (
                              <div className="px-1 pb-0.5">
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline underline-offset-2"
                                  onClick={() => {
                                    const sprintWs =
                                      it.sprintId != null
                                        ? allSprints.find((s) => s.id === it.sprintId)?.workspaceId
                                        : undefined
                                    void onOpenTaskById(
                                      it.convertedTaskId!,
                                      sprintWs != null ? { workspaceId: sprintWs } : undefined,
                                    )
                                  }}
                                >
                                  Ver tarea #{it.convertedTaskId}
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="excel-acta-cell p-0 align-middle">
                            {canEdit ? (
                              <div className="px-0.5 py-0 min-w-0" key={`${it.id}-rspbox-${it.updatedAt}`}>
                                <Select
                                  value={
                                    it.responsibleUserId != null
                                      ? String(it.responsibleUserId)
                                      : ACTA_SELECT_NONE
                                  }
                                  onValueChange={(v) => {
                                    if (v === ACTA_SELECT_NONE) return
                                    const rid = Number(v)
                                    const c = respOptions.find((x) => x.id === rid)
                                    void persistItemPatch(it.id, {
                                      responsibleUserId: rid,
                                      responsibleNameSnapshot: c?.nombreCompleto?.trim() || null,
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
                                    {rspMeta ? (
                                      <Avatar
                                        name={rspMeta.seed}
                                        size="xs"
                                        variant="picker"
                                        className="shrink-0"
                                        title={rspMeta.line}
                                      />
                                    ) : null}
                                    <SelectValue placeholder="Responsable" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={ACTA_SELECT_NONE}>— Elegir responsable</SelectItem>
                                    {respOptions.map((c) => (
                                      <SelectItem key={c.id} value={String(c.id)}>
                                        {c.nombreCompleto ?? '—'}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            ) : rspMeta ? (
                              <div className="flex items-center gap-1.5 min-w-0 px-1 py-0.5">
                                <Avatar
                                  name={rspMeta.seed}
                                  size="xs"
                                  variant="picker"
                                  title={rspMeta.line}
                                  className="shrink-0"
                                />
                                <span className="text-[11px] leading-tight whitespace-pre-wrap break-words min-w-0">
                                  {rspMeta.line}
                                </span>
                              </div>
                            ) : (
                              <span className="block px-1 py-0.5 text-[11px] text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="excel-acta-cell p-0 align-middle">
                            {canEdit ? (
                              <input
                                key={`${it.id}-sd-${it.updatedAt}`}
                                type="date"
                                className={EXCEL_ACTA_DATE_INPUT}
                                defaultValue={it.startDate ? it.startDate.slice(0, 10) : ''}
                                disabled={sheetBusy}
                                onBlur={(e) => {
                                  const v = e.target.value.trim()
                                  if (!v) return
                                  void persistItemPatch(it.id, { startDate: v })
                                }}
                              />
                            ) : inicioText ? (
                              <span className="block px-1 py-0.5 text-[11px] tabular-nums">{inicioText}</span>
                            ) : (
                              <span className="block px-1 py-0.5 italic text-[11px] text-muted-foreground">En curso</span>
                            )}
                          </td>
                          <td className="excel-acta-cell p-0 align-middle">
                            {canEdit ? (
                              <input
                                key={`${it.id}-dl-${it.updatedAt}`}
                                type="date"
                                className={EXCEL_ACTA_DATE_INPUT}
                                defaultValue={it.deadline ? it.deadline.slice(0, 10) : ''}
                                disabled={sheetBusy}
                                onBlur={(e) => {
                                  const v = e.target.value.trim()
                                  if (!v) return
                                  void persistItemPatch(it.id, { deadline: v })
                                }}
                              />
                            ) : (
                              <span className="block px-1 py-0.5 text-[11px] tabular-nums">
                                {it.deadline ? formatShortDate(it.deadline) : '—'}
                              </span>
                            )}
                          </td>
                          <td className="excel-acta-cell px-0.5 py-0 align-middle">
                            {canEdit ? (
                              <div className="min-w-0">
                                <select
                                  key={`${it.id}-st-${it.updatedAt}`}
                                  className={EXCEL_ACTA_STATUS_SELECT}
                                  defaultValue={it.status}
                                  disabled={sheetBusy}
                                  onChange={(e) =>
                                    void persistItemPatch(it.id, {
                                      status: e.target.value as WorkosMeetingItemStatus,
                                    })
                                  }
                                  aria-label="Estado del ítem"
                                >
                                  {ITEM_STATUSES.map((s) => (
                                    <option key={s} value={s}>
                                      {ITEM_STATUS_LABEL[s]}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-0.5 px-0.5 py-0.5 min-w-0">
                                <span
                                  className={cn(
                                    'inline-flex w-fit text-[9px] px-1 py-0.5 rounded border font-medium',
                                    itemTypeBadgeClass(it.itemType),
                                  )}
                                >
                                  {ITEM_TYPE_LABEL[it.itemType]}
                                </span>
                                {it.converted ? (
                                  <>
                                    <span className="inline-flex w-fit text-[9px] px-1 py-0.5 rounded border bg-emerald-500/12 text-emerald-800 dark:text-emerald-200 border-emerald-500/25 font-semibold uppercase">
                                      En tarea
                                    </span>
                                    <span className="text-[10px] text-muted-foreground leading-tight">
                                      {it.taskStatus
                                        ? `${taskStatusLabel(it.taskStatus)}${
                                            it.taskProgress != null ? ` · ${it.taskProgress}%` : ''
                                          }`
                                        : ''}
                                    </span>
                                  </>
                                ) : (
                                  <span
                                    className={cn(
                                      'inline-flex w-fit text-[10px] px-1.5 py-0.5 rounded border font-medium',
                                      itemStatusBadgeClass(it.status),
                                    )}
                                  >
                                    {ITEM_STATUS_LABEL[it.status]}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="excel-acta-cell text-left align-middle">
                            {!it.converted && actaPerms.canEditRows ? (
                              <div className="inline-flex flex-row items-center justify-start gap-0.5 pl-0.5 pr-0.5 py-0">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className={ACTA_ACTION_ORANGE_BTN}
                                  disabled={sheetBusy}
                                  onClick={() => openConvert(it)}
                                >
                                  Convertir
                                </Button>
                                {canDeleteRow ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className={ACTA_ACTION_ORANGE_ICON}
                                    disabled={sheetBusy}
                                    onClick={() => setDeleteItemTarget(it)}
                                    aria-label="Eliminar ítem"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                ) : null}
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      )
                    })
                    })()}
                    {actaPerms.canManageFullActa ? (
                      <>
                        {localDraftRows.map((lr, i) => (
                          <ActaDraftRowTr
                            key={lr.tempId}
                            rowIndex={actaNumberedRowCount + i + 1}
                            value={lr}
                            onChange={(next) => patchLocalDraftRow(lr.tempId, next)}
                            onSave={() => void saveLocalDraftRow(lr)}
                            onDiscard={() => removeLocalDraftRow(lr.tempId)}
                            sheetBusy={sheetBusy}
                            areas={areas}
                            collaboratorsForArea={collaboratorsForArea}
                            collaboratorsAll={collaboratorsAll}
                            discardAriaLabel="Quitar esta fila (solo vista local; sin servidor)"
                          />
                        ))}
                        {showBottomDraftRow ? (
                          <ActaDraftRowTr
                            rowIndex={actaNumberedRowCount + localDraftRows.length + 1}
                            value={draftNewRow}
                            onChange={(next) => setDraftNewRow(next)}
                            onSave={() => void tryCommitDraftNewRow()}
                            onDiscard={() => {
                              clearDraftNewRow()
                              setShowBottomDraftRow(false)
                            }}
                            sheetBusy={sheetBusy}
                            areas={areas}
                            collaboratorsForArea={collaboratorsForArea}
                            collaboratorsAll={collaboratorsAll}
                            discardAriaLabel="Quitar fila de entrada (solo en pantalla; sin llamar al servidor)"
                          />
                        ) : null}
                        <tr className="excel-acta-row">
                          <td
                            colSpan={9}
                            className="excel-acta-cell !bg-background border-t-2 border-dashed border-orange-400/70 dark:border-orange-500/45 px-3 py-2"
                          >
                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                              <button
                                type="button"
                                disabled={sheetBusy}
                                title={
                                  showBottomDraftRow
                                    ? 'Añade otra fila solo en pantalla (sin guardar en el servidor)'
                                    : 'Vuelve a mostrar la fila de entrada (sin guardar en el servidor)'
                                }
                                aria-label={
                                  showBottomDraftRow ? 'Agregar fila editable local' : 'Mostrar fila de entrada del acta'
                                }
                                onClick={() => appendOrRevealDraftRow()}
                                className={cn(
                                  'inline-flex items-center gap-1.5 rounded-md border border-orange-500/55 bg-background px-2 py-0.5 text-xs font-semibold tracking-tight text-orange-600 transition-colors hover:bg-orange-50 disabled:pointer-events-none disabled:opacity-45 dark:text-orange-400 dark:hover:bg-orange-950/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                                )}
                              >
                                <Plus
                                  className="h-3.5 w-3.5 shrink-0"
                                  strokeWidth={2.25}
                                  aria-hidden
                                />
                                Agregar fila
                              </button>
                            </div>
                          </td>
                        </tr>
                      </>
                    ) : null}
                  </tbody>
                </table>
              </div>
              </section>
            </>
          ) : null}
        </div>
      )}

      {detailId == null && (
        <div className="rounded-xl border border-border/80 bg-card workos-shadow-soft overflow-hidden">
          <div className="flex flex-nowrap items-center justify-between gap-3 px-4 py-3 border-b border-border/60 bg-muted/25 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-0 shrink">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground leading-tight whitespace-nowrap sm:whitespace-normal">
                  Actas de reunión
                </h2>
                <p className="text-[11px] text-muted-foreground leading-snug whitespace-nowrap">
                  {totalElements} registro{totalElements === 1 ? '' : 's'}
                  {listBusy && allActas.length === 0 ? ' · Cargando…' : ''}
                </p>
              </div>
            </div>
            <div className="flex flex-nowrap items-center gap-2 shrink-0 ml-auto">
              <Select
                value={filterStatus}
                onValueChange={(v) => {
                  setPage(0)
                  setFilterStatus(v as MeetingMinuteStatus | 'all')
                }}
              >
                <SelectTrigger className="h-9 w-auto min-w-[13.5rem] shrink-0 flex-nowrap whitespace-nowrap rounded-lg border-border/80 text-sm">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {(Object.keys(MEETING_STATUS_LABEL) as MeetingMinuteStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {MEETING_STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filterType}
                onValueChange={(v) => {
                  setPage(0)
                  setFilterType(v as MeetingMinuteType | 'all')
                }}
              >
                <SelectTrigger className="h-9 w-auto min-w-[13.5rem] shrink-0 flex-nowrap whitespace-nowrap rounded-lg border-border/80 text-sm">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {(Object.keys(MEETING_TYPE_LABEL) as MeetingMinuteType[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {MEETING_TYPE_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                className="h-9 rounded-lg gap-1.5 px-4 text-sm workos-gantt-btn-primary border-0 shrink-0"
                onClick={() => {
                  setEditingMinuteId(null)
                  setMinuteForm({
                    title: '',
                    meetingDate: new Date().toISOString().slice(0, 10),
                    meetingType: 'OPERATIVA',
                    summary: '',
                    status: 'ABIERTA',
                  })
                  setMinuteDialogOpen(true)
                }}
              >
                <Plus className="h-4 w-4" />
                Nueva acta
              </Button>
            </div>
          </div>

          <ul className="divide-y divide-border/60 list-none m-0 p-0" role="list">
            {pagedActas.length === 0 ? (
              <li className="px-4 py-14 text-center text-sm text-muted-foreground">
                No hay actas con estos filtros.
              </li>
            ) : (
              pagedActas.map((row) => {
                const { day, rest } = formatListRowDate(row.meetingDate)
                const nItems = row.kpis?.totalItems ?? 0
                const nConverted = row.kpis?.convertedItems ?? 0
                const pct = nConverted === 0 ? 0 : (row.kpis?.completionPercentage ?? 0)
                const listAssignees = actaListAssigneeDisplayNames(
                  row.items,
                  collaboratorsById,
                  collaboratorsForArea,
                  collaboratorsAll,
                )
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => void openDetail(row.id)}
                      className={cn(
                        'w-full text-left flex flex-col sm:flex-row sm:items-stretch gap-3 sm:gap-0',
                        'px-4 py-3.5 sm:py-3 hover:bg-muted/45 transition-colors group',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background',
                      )}
                    >
                      <div
                        className={cn(
                          'flex flex-row sm:flex-col items-baseline sm:items-center justify-start sm:justify-center',
                          'gap-2 sm:gap-0.5 shrink-0 sm:w-[5.25rem] sm:min-h-[3.5rem]',
                          'sm:border-r sm:border-border/55 sm:pr-3 sm:mr-1',
                        )}
                      >
                        <span className="text-3xl sm:text-4xl font-bold tabular-nums leading-none text-foreground tracking-tight">
                          {day}
                        </span>
                        <span className="text-[11px] uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                          {rest}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center gap-2 sm:pr-3">
                        <span className="font-semibold text-sm text-foreground leading-snug group-hover:text-primary underline-offset-2 transition-colors line-clamp-2">
                          {row.title}
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex text-[11px] px-2 py-0.5 rounded-md border border-border/70 bg-background/90 text-muted-foreground font-medium">
                            {MEETING_TYPE_LABEL[row.meetingType]}
                          </span>
                          <span
                            className={cn(
                              'inline-flex text-[11px] px-2 py-0.5 rounded-md border font-medium',
                              meetingStatusBadgeClass(row.status),
                            )}
                          >
                            {MEETING_STATUS_LABEL[row.status]}
                          </span>
                        </div>
                        {listAssignees.length > 0 ? (
                          <div
                            className="flex items-center gap-2 min-w-0 pt-0.5"
                            title={listAssignees.join(', ')}
                          >
                            <AvatarGroup names={listAssignees} max={5} size="xs" variant="picker" />
                            <span className="text-[11px] text-muted-foreground truncate min-w-0">
                              {listAssignees.join(' · ')}
                            </span>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0 sm:w-[7.5rem] sm:pl-2">
                        <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                          {nItems} ítem{nItems === 1 ? '' : 's'}
                        </span>
                        <div className="flex w-full items-center gap-2 min-w-0">
                          <div className="flex min-w-0 flex-1 flex-col gap-1 sm:items-stretch">
                            <ProgressBar
                              value={Math.min(100, Math.max(0, pct))}
                              size="md"
                              showLabel={false}
                              className="w-full min-w-[4rem]"
                            />
                            <span
                              className="text-[11px] tabular-nums text-muted-foreground sm:text-right"
                              title={
                                nConverted === 0
                                  ? 'Ningún punto convertido a tarea Gantt aún'
                                  : `${Math.round(pct)} % de las ${nConverted} tarea(s) vinculada(s) están terminadas`
                              }
                            >
                              {row.kpis != null
                                ? nConverted === 0
                                  ? '0 % · sin Gantt'
                                  : `${Math.round(pct)} % tareas`
                                : 'Sin datos de avance'}
                            </span>
                          </div>
                          <ChevronRight
                            className="h-4 w-4 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground self-center"
                            aria-hidden
                          />
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })
            )}
          </ul>

          {totalPages > 1 && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t border-border/60 bg-muted/15 text-sm">
              <span className="text-muted-foreground tabular-nums">
                Página {safePage + 1} de {totalPages} · {totalElements} actas
              </span>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  disabled={safePage <= 0}
                  onClick={() => setPage(safePage - 1)}
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  disabled={safePage >= maxPage}
                  onClick={() => setPage(safePage + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog
        open={minuteDialogOpen}
        onOpenChange={(o) => {
          setMinuteDialogOpen(o)
          if (!o) setEditingMinuteId(null)
        }}
      >
        <DialogContent className="max-w-lg rounded-xl">
          <DialogHeader>
            <DialogTitle>{editingMinuteId != null ? 'Editar acta' : 'Nueva acta'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input value={minuteForm.title} onChange={(e) => setMinuteForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fecha reunión</Label>
                <Input
                  type="date"
                  value={minuteForm.meetingDate}
                  onChange={(e) => setMinuteForm((f) => ({ ...f, meetingDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Próxima reunión</Label>
                <Input
                  type="date"
                  value={minuteForm.nextMeetingDate ?? ''}
                  onChange={(e) =>
                    setMinuteForm((f) => ({ ...f, nextMeetingDate: e.target.value || undefined }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select
                value={minuteForm.meetingType ?? 'OPERATIVA'}
                onValueChange={(v) => setMinuteForm((f) => ({ ...f, meetingType: v as MeetingMinuteType }))}
              >
                <SelectTrigger className="rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(MEETING_TYPE_LABEL) as MeetingMinuteType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {MEETING_TYPE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Resumen</Label>
              <Textarea
                value={minuteForm.summary ?? ''}
                onChange={(e) => setMinuteForm((f) => ({ ...f, summary: e.target.value }))}
                rows={4}
                className="rounded-lg"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setMinuteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void saveMinute()} disabled={minuteSaving}>
              {minuteSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
        <DialogContent className="max-w-xl rounded-xl">
          <DialogHeader>
            <DialogTitle>Pegar ítems (TSV)</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground space-y-1">
            <span className="block">
              <strong>Comité (Excel):</strong> cabecera con columnas que incluyan exactamente «Tarea» y «Situación» (tab):
              N°, Área, Situación, Tarea, Responsable, Inicio, Fecha fin. Fechas dd/mm o ISO; «ongoing» / «en curso» en
              Inicio = sin fecha fija.
            </span>
            <span className="block">
              <strong>Extendido:</strong> situación, decisión, título tarea, tipo, estado, prioridad, id área, id
              proyecto, id sprint, id responsable, inicio, fin.
            </span>
            <span className="block">Fila bloque: en Situación usa texto que empiece por «##» y deja la columna Tarea vacía al pegar comité.</span>
          </p>
          <Textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} rows={10} className="font-mono text-xs rounded-lg" />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPasteOpen(false)}>
              Cerrar
            </Button>
            <Button type="button" onClick={() => void submitPaste()} disabled={pasteBusy}>
              {pasteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Añadir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={softDeleteActaOpen && detail != null}
        onOpenChange={(open) => {
          if (!open && !softDeleteActaBusy) setSoftDeleteActaOpen(false)
        }}
      >
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>¿Dar de baja esta acta?</DialogTitle>
            {detail ? (
              <DialogDescription asChild>
                <div className="space-y-3 text-left">
                  <p>
                    Es una <strong>baja lógica</strong>: el registro deja de mostrarse en el listado habitual. Los datos
                    asociados pueden conservarse según las políticas del sistema.
                  </p>
                  <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-sm text-foreground space-y-1">
                    <p className="font-semibold leading-snug break-words">{detail.title || 'Sin título'}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatShortDate(detail.meetingDate)} · {MEETING_TYPE_LABEL[detail.meetingType]} ·{' '}
                      <span className="font-medium text-foreground">{MEETING_STATUS_LABEL[detail.status]}</span>
                    </p>
                    {detail.items?.length ? (
                      <p className="text-xs text-muted-foreground pt-0.5">
                        {detail.items.length} punto{detail.items.length === 1 ? '' : 's'} en el acta
                      </p>
                    ) : null}
                  </div>

                </div>
              </DialogDescription>
            ) : null}
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={softDeleteActaBusy}
              onClick={() => setSoftDeleteActaOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              loading={softDeleteActaBusy}
              onClick={() => void confirmSoftDeleteActa()}
            >
              Dar de baja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteItemTarget != null}
        onOpenChange={(open) => {
          if (!open && !deleteItemBusy) setDeleteItemTarget(null)
        }}
      >
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>¿Eliminar este punto del acta?</DialogTitle>
            {deleteItemTarget ? (
              <DialogDescription asChild>
                <div className="space-y-3 text-left">
                  <p>
                    Vas a quitar del acta un ítem que <strong>ya está guardado</strong> (tiene acciones como{' '}
                    <strong>Convertir</strong>, no es una fila nueva con botón Guardar). Esta acción no se puede deshacer
                    aquí.
                  </p>
                  <div className="rounded-lg border border-border/80 bg-muted/30 px-3 py-2 text-sm text-foreground">
                    <p className="font-medium leading-snug break-words">{meetingItemDeletePreviewLine(deleteItemTarget)}</p>
                    {!isActaSectionHeaderRow(deleteItemTarget) ? (
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Estado en acta:{' '}
                        <span className="font-medium text-foreground">
                          {ITEM_STATUS_LABEL[deleteItemTarget.status]}
                        </span>
                      </p>
                    ) : null}
                  </div>
                  {!isActaSectionHeaderRow(deleteItemTarget) &&
                  deleteItemTarget.status === 'PENDIENTE' &&
                  !deleteItemTarget.converted ? (
                    <p className="text-xs text-muted-foreground">
                      Está pendiente y aún puedes convertirlo en tarea Gantt; si eliminas, solo quedará reflejado en el
                      acta que ya no incluye este acuerdo.
                    </p>
                  ) : null}
                </div>
              </DialogDescription>
            ) : null}
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={deleteItemBusy}
              onClick={() => setDeleteItemTarget(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              loading={deleteItemBusy}
              onClick={() => void confirmDeleteMeetingItem()}
            >
              Eliminar del acta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={convertItem != null}
        onOpenChange={(open) => {
          if (!open && !convertBusy) setConvertItem(null)
        }}
      >
        <DialogContent className="max-w-lg rounded-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Convertir ítem en tarea</DialogTitle>
          </DialogHeader>
          {convertItem && (
            <div className="space-y-3 py-1">
              <div className="space-y-1.5">
                <Label>Título</Label>
                <Input
                  value={convertForm.title ?? ''}
                  onChange={(e) => setConvertForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Descripción</Label>
                <Textarea
                  value={convertForm.description ?? ''}
                  onChange={(e) => setConvertForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Equipo</Label>
                  <Select
                    value={convertForm.areaId != null ? String(convertForm.areaId) : ''}
                    onValueChange={(v) => setConvertForm((f) => ({ ...f, areaId: Number(v) }))}
                  >
                    <SelectTrigger className="rounded-lg">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {areas.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Espacio</Label>
                  <Select
                    value={convertForm.workspaceId != null ? String(convertForm.workspaceId) : 'none'}
                    onValueChange={(v) =>
                      setConvertForm((f) => ({
                        ...f,
                        workspaceId: v === 'none' ? undefined : Number(v),
                        sprintId: undefined,
                      }))
                    }
                  >
                    <SelectTrigger className="rounded-lg">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {workspaces.map((w) => (
                        <SelectItem key={w.id} value={String(w.id)}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {sprintsForWorkspace.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Sprint</Label>
                  <Select
                    value={convertForm.sprintId != null ? String(convertForm.sprintId) : 'none'}
                    onValueChange={(v) =>
                      setConvertForm((f) => ({ ...f, sprintId: v === 'none' ? undefined : Number(v) }))
                    }
                  >
                    <SelectTrigger className="rounded-lg">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {sprintsForWorkspace.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Inicio</Label>
                  <Input
                    type="date"
                    value={convertForm.startDate ?? ''}
                    onChange={(e) => setConvertForm((f) => ({ ...f, startDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Fin</Label>
                  <Input
                    type="date"
                    value={convertForm.endDate ?? ''}
                    onChange={(e) => setConvertForm((f) => ({ ...f, endDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Estado tarea</Label>
                  <Select
                    value={convertForm.status ?? 'PENDING'}
                    onValueChange={(v) => setConvertForm((f) => ({ ...f, status: v as AreaTaskStatus }))}
                  >
                    <SelectTrigger className="rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(['PENDING', 'IN_PROGRESS', 'DONE', 'BLOCKED'] as const).map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Prioridad</Label>
                  <Select
                    value={convertForm.priority ?? 'MEDIUM'}
                    onValueChange={(v) => setConvertForm((f) => ({ ...f, priority: v as TaskPriority }))}
                  >
                    <SelectTrigger className="rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((s) => (
                        <SelectItem key={s} value={s}>
                          {PRIORITY_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-lg"
              disabled={convertBusy}
              onClick={() => setConvertItem(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="rounded-lg gap-2"
              onClick={() => void submitConvert()}
              disabled={convertBusy}
            >
              {convertBusy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                  Creando…
                </>
              ) : (
                'Crear tarea'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
