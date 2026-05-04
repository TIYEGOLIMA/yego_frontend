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
  collaboratorsForArea: (areaId: number) => ColaboradorDto[],
  collaboratorsAll: ColaboradorDto[],
): string[] {
  if (!items?.length) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const it of items) {
    if (isActaSectionHeaderRow(it)) continue
    const respOptions = it.areaId != null ? collaboratorsForArea(it.areaId) : collaboratorsAll
    const meta = actaResponsibleAvatarMeta(it, respOptions, collaboratorsById)
    if (!meta) continue
    const k = meta.line.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(meta.line)
  }
  return out
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
