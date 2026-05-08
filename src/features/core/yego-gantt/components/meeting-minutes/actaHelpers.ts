import type { AreaFull, ColaboradorDto, MeetingMinuteItemResponse, MeetingMinuteResponse } from '../../types'
import { fetchMeetingMinutesPage } from '../../ganttApi'

export function isActaSectionHeaderRow(it: MeetingMinuteItemResponse): boolean {
  const s = it.situation?.trim() ?? ''
  return s.startsWith('##') && !(it.taskTitle?.trim())
}

export function meetingItemDeletePreviewLine(it: MeetingMinuteItemResponse): string {
  if (isActaSectionHeaderRow(it)) {
    const t = (it.situation ?? '').replace(/^##\s*/, '').trim()
    return t || 'Encabezado de bloque'
  }
  const s = it.situation?.trim()
  const t = it.taskTitle?.trim()
  if (s && t) return `${s} · ${t}`
  return s || t || 'Sin texto descriptivo'
}

export function displayActaArea(it: MeetingMinuteItemResponse, areaList: AreaFull[]): string {
  if (it.areaNameSnapshot?.trim()) return it.areaNameSnapshot.trim()
  if (it.areaId != null)
    return areaList.find((a) => a.id === it.areaId)?.name ?? `Área #${it.areaId}`
  return '—'
}

/** Contenido sugerido para descripción Gantt al convertir: situación primero, luego decisión y descripción complementaria del ítem. */
export function buildConvertTaskDescriptionDraft(it: MeetingMinuteItemResponse): string {
  const parts = [it.situation?.trim(), it.decision?.trim(), it.taskDescription?.trim()].filter(Boolean) as string[]
  return parts.join('\n\n')
}

export function actaResponsibleAvatarMeta(
  it: MeetingMinuteItemResponse,
  respOptions: ColaboradorDto[],
  byId: Map<number, ColaboradorDto>,
): { line: string; seed: string } | null {
  const snap = it.responsibleNameSnapshot?.trim()
  if (it.responsibleUserId != null) {
    const fromList = respOptions.find((x) => x.id === it.responsibleUserId)
    const pick = fromList?.nombreCompleto?.trim()
    if (pick) return { line: pick, seed: pick }
  }
  if (snap) return { line: snap, seed: snap }
  if (it.responsibleUserId != null) {
    const c = byId.get(it.responsibleUserId)
    const n = c?.nombreCompleto?.trim()
    if (n) return { line: n, seed: n }
    return { line: `#${it.responsibleUserId}`, seed: `Usuario ${it.responsibleUserId}` }
  }
  return null
}

export function actaListAssigneeDisplayNames(
  items: MeetingMinuteItemResponse[] | null | undefined,
  collaboratorsById: Map<number, ColaboradorDto>,
  collaboratorsAll: ColaboradorDto[],
): string[] {
  if (!items?.length) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const it of items) {
    if (isActaSectionHeaderRow(it)) continue
    const meta = actaResponsibleAvatarMeta(it, collaboratorsAll, collaboratorsById)
    if (!meta) continue
    const k = meta.line.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(meta.line)
  }
  return out
}

/** Fecha `yyyy-mm-dd` o `null` si no es un valor ISO de día válido (actas / ítems). */
export function sliceActaIsoDateYmd(v: unknown): string | null {
  if (v == null) return null
  const t = String(v).trim().slice(0, 10)
  if (t.length < 10) return null
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null
}

/** Si inicio y fin están ambos definidos, la fin no puede ser anterior al inicio (comparación lexical ISO). */
export function actaItemDeadlineBeforeStartMessage(startYmd: unknown, deadlineYmd: unknown): string | null {
  const s = sliceActaIsoDateYmd(startYmd)
  const e = sliceActaIsoDateYmd(deadlineYmd)
  if (!s || !e) return null
  if (e < s) return 'La fecha fin no puede ser anterior a la fecha de inicio'
  return null
}

/** `min` recomendado para el input de fecha fin: al menos hoy y no antes del inicio si ya hay inicio. */
export function actaDeadlineInputMin(minCalendarYmd: string, startYmd: unknown): string {
  const s = sliceActaIsoDateYmd(startYmd)
  return s !== null && s >= minCalendarYmd ? s : minCalendarYmd
}

export function sortActasByMeetingDateDesc(rows: MeetingMinuteResponse[]): MeetingMinuteResponse[] {
  return [...rows].sort(
    (a, b) =>
      (b.meetingDate || '').localeCompare(a.meetingDate || '', undefined, { sensitivity: 'base' }) ||
      b.id - a.id,
  )
}

export async function fetchAllActasFromApi(fetchSize: number): Promise<MeetingMinuteResponse[]> {
  const acc: MeetingMinuteResponse[] = []
  let page = 0
  let totalPages = 1
  while (page < totalPages) {
    const res = await fetchMeetingMinutesPage({
      page,
      size: fetchSize,
      sort: 'meetingDate,desc',
    })
    acc.push(...res.content)
    totalPages = res.totalPages
    page++
  }
  return acc
}
