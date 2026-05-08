import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, FileText, ListTodo } from 'lucide-react'
import type {
  AreaTaskStatus,
  GanttOpenTaskHint,
  MeetingMinuteResponse,
  MeetingMinuteStatus,
  MeetingMinuteType,
  TaskRow,
} from '../types'
import { fetchMeetingMinutesPage, parseGanttLoadError } from '../ganttApi'
import { cn } from '@/utils/cn'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function compareYmd(a: string, b: string): number {
  return a.localeCompare(b)
}

/** «mayo de 20262026» → «Mayo De 2026» */
function formatMonthHeader(viewYear: number, viewMonth: number): string {
  const raw = new Date(viewYear, viewMonth, 1).toLocaleDateString('es', { month: 'long', year: 'numeric' })
  return raw.replace(/\b[\p{L}]/gu, (ch) => ch.toUpperCase())
}

const MEETING_TYPE_LABEL: Record<MeetingMinuteType, string> = {
  COMITE: 'Comité',
  SEGUIMIENTO: 'Seguimiento',
  OPERATIVA: 'Operativa',
  ESTRATEGICA: 'Estratégica',
  OTRO: 'Otro',
}

const MEETING_STATUS_LABEL: Record<MeetingMinuteStatus, string> = {
  ABIERTA: 'Abierta',
  EN_SEGUIMIENTO: 'En seguimiento',
  CERRADA: 'Cerrada',
  CANCELADA: 'Cancelada',
}

function meetingStatusBadgeClass(s: MeetingMinuteStatus): string {
  switch (s) {
    case 'ABIERTA':
      return 'bg-sky-500/12 text-sky-800 dark:text-sky-200 border-sky-400/35'
    case 'EN_SEGUIMIENTO':
      return 'bg-amber-500/12 text-amber-900 dark:text-amber-100 border-amber-500/25'
    case 'CERRADA':
      return 'bg-emerald-500/12 text-emerald-800 dark:text-emerald-200 border-emerald-500/20'
    case 'CANCELADA':
      return 'bg-muted text-muted-foreground border-border/80'
    default:
      return 'bg-muted text-muted-foreground border-border/80'
  }
}

function taskStatusLabel(status: AreaTaskStatus | string | null | undefined): string {
  if (status == null || status === '') return ''
  const m: Record<string, string> = {
    PENDING: 'Pendiente',
    IN_PROGRESS: 'En curso',
    DONE: 'Hecha',
    BLOCKED: 'Bloqueada',
  }
  return m[String(status)] ?? String(status)
}

function taskStatusBadgeClass(status: AreaTaskStatus | string | null | undefined): string {
  switch (status) {
    case 'IN_PROGRESS':
      return 'bg-sky-500/12 text-sky-800 dark:text-sky-200 border-sky-400/35'
    case 'DONE':
      return 'bg-emerald-500/12 text-emerald-800 dark:text-emerald-200 border-emerald-500/25'
    case 'BLOCKED':
      return 'bg-red-500/10 text-red-800 dark:text-red-200 border-red-400/30'
    default:
      return 'bg-muted/80 text-muted-foreground border-border/70'
  }
}

const NAV_BTN =
  'h-9 rounded-[10px] border-orange-300/90 bg-background text-orange-600 hover:bg-orange-50 dark:border-orange-600/60 dark:text-orange-400 dark:hover:bg-orange-950/40 shadow-none'

const MAX_CELL_BADGES = 3

export interface WorkosCalendarTabProps {
  tasks: TaskRow[]
  loadingTasks: boolean
  onPickCreateTask: (isoDay: string) => void
  onPickCreateActa: (isoDay: string) => void
  /** Clic en una tarea del detalle del día */
  onOpenTaskById?: (taskId: number, hint?: GanttOpenTaskHint) => void | Promise<void>
}

export function WorkosCalendarTab({
  tasks,
  loadingTasks,
  onPickCreateTask,
  onPickCreateActa,
  onOpenTaskById,
}: WorkosCalendarTabProps) {
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [monthActas, setMonthActas] = useState<MeetingMinuteResponse[]>([])
  const [calErr, setCalErr] = useState<string | null>(null)
  const [calLoading, setCalLoading] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(() => toYmd(new Date()))

  const firstYmd = useMemo(
    () => toYmd(new Date(viewYear, viewMonth, 1)),
    [viewYear, viewMonth],
  )
  const lastYmd = useMemo(
    () => toYmd(new Date(viewYear, viewMonth + 1, 0)),
    [viewYear, viewMonth],
  )
  const lastDay = useMemo(() => new Date(viewYear, viewMonth + 1, 0).getDate(), [viewYear, viewMonth])

  const actasByDay = useMemo(() => {
    const m = new Map<string, MeetingMinuteResponse[]>()
    for (const a of monthActas) {
      const k = a.meetingDate.slice(0, 10)
      const arr = m.get(k) ?? []
      arr.push(a)
      m.set(k, arr)
    }
    return m
  }, [monthActas])

  const tasksByDay = useMemo(() => {
    const m = new Map<string, TaskRow[]>()
    for (const t of tasks) {
      const s = t.startDate.slice(0, 10)
      const e = t.endDate.slice(0, 10)
      const from = compareYmd(s, firstYmd) < 0 ? firstYmd : s
      const to = compareYmd(e, lastYmd) > 0 ? lastYmd : e
      if (compareYmd(from, to) > 0) continue
      const cursor = new Date(from + 'T12:00:00')
      const endD = new Date(to + 'T12:00:00')
      for (; cursor <= endD; cursor.setDate(cursor.getDate() + 1)) {
        const k = toYmd(cursor)
        const arr = m.get(k) ?? []
        arr.push(t)
        m.set(k, arr)
      }
    }
    return m
  }, [tasks, firstYmd, lastYmd])

  const loadActas = useCallback(async () => {
    setCalLoading(true)
    setCalErr(null)
    try {
      const res = await fetchMeetingMinutesPage({
        dateFrom: firstYmd,
        dateTo: lastYmd,
        size: 500,
        page: 0,
        sort: 'meetingDate,asc',
      })
      setMonthActas(res.content)
    } catch (e) {
      setCalErr(parseGanttLoadError(e))
    } finally {
      setCalLoading(false)
    }
  }, [firstYmd, lastYmd])

  useEffect(() => {
    void loadActas()
  }, [loadActas])

  const monthHeader = formatMonthHeader(viewYear, viewMonth)

  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1)
    const startPad = first.getDay()
    const dim = lastDay
    const totalCells = Math.ceil((startPad + dim) / 7) * 7
    const out: (number | null)[] = []
    for (let i = 0; i < startPad; i++) out.push(null)
    for (let d = 1; d <= dim; d++) out.push(d)
    while (out.length < totalCells) out.push(null)
    return out
  }, [viewYear, viewMonth, lastDay])

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
    setSelectedDay(null)
  }

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
    setSelectedDay(null)
  }

  const goToday = () => {
    const n = new Date()
    setViewYear(n.getFullYear())
    setViewMonth(n.getMonth())
    setSelectedDay(toYmd(n))
  }

  const selectedActas = selectedDay ? actasByDay.get(selectedDay) ?? [] : []
  const selectedTasks = selectedDay
    ? Array.from(
        new Map((tasksByDay.get(selectedDay) ?? []).map((t) => [t.id, t])).values(),
      )
    : []

  return (
    <div className="space-y-4">
      {calErr && (
        <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2 border border-destructive/20">
          {calErr}
        </div>
      )}

      <div
        className={cn(
          'rounded-xl border border-neutral-200/90 dark:border-border/70 bg-card overflow-hidden shadow-sm',
        )}
      >
        <div className="p-4 sm:p-5 border-b border-neutral-200/80 dark:border-border/60 bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-baseline gap-2 min-w-0">
              <h2 className="text-base font-bold text-foreground tracking-tight truncate">{monthHeader}</h2>
              {(calLoading || loadingTasks) && (
                <span className="text-[11px] font-normal text-muted-foreground shrink-0">Cargando…</span>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button type="button" variant="outline" size="sm" className={NAV_BTN} onClick={goPrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="sm" className={cn(NAV_BTN, 'px-3')} onClick={goToday}>
                Hoy
              </Button>
              <Button type="button" variant="outline" size="sm" className={NAV_BTN} onClick={goNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-[11px] text-muted-foreground mt-5 mb-2 font-medium lowercase">
            {['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'].map((d) => (
              <div key={d} className="py-0.5">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {cells.map((d, idx) => {
              if (d == null) {
                return (
                  <div
                    key={`e-${idx}`}
                    className="rounded-[10px] min-h-[5.5rem] sm:min-h-[6.25rem] bg-muted/15 border border-transparent"
                  />
                )
              }
              const keyD = toYmd(new Date(viewYear, viewMonth, d))
              const actas = actasByDay.get(keyD) ?? []
              const dayTasks = Array.from(
                new Map((tasksByDay.get(keyD) ?? []).map((t) => [t.id, t])).values(),
              )
              const sel = selectedDay === keyD
              const badges: { kind: 'acta' | 'task'; id: number; label: string }[] = [
                ...actas.map((a) => ({ kind: 'acta' as const, id: a.id, label: a.title })),
                ...dayTasks.map((t) => ({ kind: 'task' as const, id: t.id, label: t.title })),
              ]
              const shown = badges.slice(0, MAX_CELL_BADGES)
              const extra = badges.length - shown.length

              return (
                <button
                  key={keyD}
                  type="button"
                  onClick={() => setSelectedDay(keyD)}
                  className={cn(
                    'rounded-[10px] border min-h-[5.5rem] sm:min-h-[6.25rem] p-1.5 sm:p-2 text-left transition-colors',
                    'bg-background hover:bg-muted/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40',
                    sel
                      ? 'border-[#3B82F6] ring-2 ring-[#3B82F6] ring-offset-0 shadow-sm'
                      : 'border-neutral-200/90 dark:border-border/70',
                  )}
                >
                  <div className="text-base sm:text-lg font-bold tabular-nums text-foreground leading-none tracking-tight">
                    {d}
                  </div>
                  <div className="mt-1.5 flex flex-col gap-1">
                    {shown.map((b) =>
                      b.kind === 'acta' ? (
                        <div
                          key={`a-${b.id}`}
                          className={cn(
                            'flex items-center gap-0.5 min-w-0 rounded-md px-1 py-0.5',
                            'bg-red-50 border border-red-200/80 text-red-700',
                            'dark:bg-red-950/35 dark:border-red-800/50 dark:text-red-300',
                          )}
                          title={b.label}
                        >
                          <FileText className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
                          <span className="text-[10px] font-medium truncate leading-tight">{b.label}</span>
                        </div>
                      ) : (
                        <div
                          key={`t-${b.id}`}
                          className={cn(
                            'flex items-center gap-0.5 min-w-0 rounded-md px-1 py-0.5',
                            'bg-sky-50 border border-sky-200/80 text-sky-800',
                            'dark:bg-sky-950/40 dark:border-sky-800/45 dark:text-sky-200',
                          )}
                          title={b.label}
                        >
                          <ListTodo className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
                          <span className="text-[10px] font-medium truncate leading-tight">{b.label}</span>
                        </div>
                      )
                    )}
                    {extra > 0 ? (
                      <span className="text-[10px] text-muted-foreground pl-0.5">+{extra} más</span>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {selectedDay && (
          <div className="p-4 sm:p-5 bg-muted/10 dark:bg-muted/5 border-t border-neutral-200/80 dark:border-border/60">
            <p className="text-sm text-muted-foreground capitalize mb-3">
              {new Date(selectedDay + 'T12:00:00').toLocaleDateString('es', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  'rounded-[10px] gap-2 border-red-300 text-red-600 bg-background',
                  'hover:bg-red-50 dark:border-red-700/60 dark:text-red-400 dark:hover:bg-red-950/35',
                )}
                onClick={() => onPickCreateActa(selectedDay)}
              >
                <FileText className="h-4 w-4" />
                Nueva acta
              </Button>
              <Button type="button" variant="outline" size="sm" className={cn(NAV_BTN, 'gap-1.5')} onClick={() => onPickCreateTask(selectedDay)}>
                <ListTodo className="h-4 w-4" />
                Nuevo proyecto
              </Button>
            </div>

            {selectedActas.length === 0 && selectedTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No hay actas ni tareas este día.</p>
            ) : (
              <ul className="space-y-2 list-none m-0 p-0">
                {selectedActas.map((a) => (
                  <li
                    key={`acta-${a.id}`}
                    className={cn(
                      'rounded-[10px] border border-neutral-200/90 dark:border-border/70 bg-background px-3 py-2.5',
                      'flex flex-wrap items-center justify-between gap-2',
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileText className="h-4 w-4 text-red-500 shrink-0" aria-hidden />
                      <span className="font-semibold text-sm text-foreground truncate">{a.title}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <span className="inline-flex text-[11px] px-2 py-0.5 rounded-md border border-neutral-200/80 dark:border-border/70 bg-muted/40 text-muted-foreground font-medium">
                        {MEETING_TYPE_LABEL[a.meetingType]}
                      </span>
                      <span
                        className={cn(
                          'inline-flex text-[11px] px-2 py-0.5 rounded-md border font-medium',
                          meetingStatusBadgeClass(a.status),
                        )}
                      >
                        {MEETING_STATUS_LABEL[a.status]}
                      </span>
                    </div>
                  </li>
                ))}
                {selectedTasks.map((t) => (
                  <li key={`task-${t.id}`}>
                    <button
                      type="button"
                      disabled={!onOpenTaskById}
                      onClick={() =>
                        void onOpenTaskById?.(t.id, {
                          workspaceId: t.workspaceId,
                          privateTask: t.privateTask === true,
                        })
                      }
                      className={cn(
                        'w-full rounded-[10px] border border-neutral-200/90 dark:border-border/70 bg-background px-3 py-2.5',
                        'flex flex-wrap items-center justify-between gap-2 text-left transition-colors',
                        onOpenTaskById && 'hover:bg-muted/35 cursor-pointer',
                        !onOpenTaskById && 'cursor-default opacity-95',
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <ListTodo className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" aria-hidden />
                        <span className="font-semibold text-sm text-foreground truncate">{t.title}</span>
                      </div>
                      <span
                        className={cn(
                          'inline-flex text-[11px] px-2 py-0.5 rounded-md border font-medium shrink-0',
                          taskStatusBadgeClass(t.status),
                        )}
                      >
                        {taskStatusLabel(t.status)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
