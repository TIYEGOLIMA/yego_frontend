import { omitUndefinedKeys, type CreateMeetingMinuteItemPayload } from '../../ganttApi'
import type { WorkosMeetingItemStatus, WorkosMeetingItemType } from '../../types'

const ITEM_TYPES: WorkosMeetingItemType[] = ['ACCION', 'DECISION', 'RIESGO', 'SEGUIMIENTO', 'INFORMACION']

function parseItemType(raw: string | undefined): WorkosMeetingItemType {
  const u = (raw || '').trim().toUpperCase()
  if (ITEM_TYPES.includes(u as WorkosMeetingItemType)) return u as WorkosMeetingItemType
  return 'ACCION'
}

function parseItemStatus(raw: string | undefined): WorkosMeetingItemStatus {
  const u = (raw || '').trim().toUpperCase().replace(/\s/g, '_')
  const map: Record<string, WorkosMeetingItemStatus> = {
    PENDIENTE: 'PENDIENTE',
    ABIERTA: 'PENDIENTE',
    PROGRESO: 'EN_PROGRESO',
    EN_PROGRESO: 'EN_PROGRESO',
    BLOQUEADA: 'BLOQUEADA',
    COMPLETADA: 'COMPLETADA',
    HECHO: 'COMPLETADA',
    CANCELADA: 'CANCELADA',
  }
  return map[u] ?? 'PENDIENTE'
}

function normalizeHeaderCell(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/°/g, '')
}

function findHeaderCol(norm: string[], candidates: string[], mode: 'loose' | 'exact' = 'loose'): number {
  for (const c of candidates) {
    const i = norm.findIndex((cell) => {
      if (mode === 'exact') return cell === c
      return cell === c || cell.includes(c)
    })
    if (i >= 0) return i
  }
  return -1
}

/** Fechas dd/mm, dd/mm/aaaa, ISO; «ongoing» / «en curso» → sin fecha fija (null). */
function parseFlexibleDateToIso(raw: string | undefined): string | null {
  const s = (raw ?? '').trim()
  if (!s) return null
  const lower = s.toLowerCase()
  if (
    lower === 'ongoing' ||
    lower === 'en curso' ||
    lower === 'curso' ||
    lower === 'abierta' ||
    lower === '—' ||
    lower === '-'
  ) {
    return null
  }
  const m = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/.exec(s)
  if (m) {
    const d = parseInt(m[1]!, 10)
    const mo = parseInt(m[2]!, 10)
    let y = m[3] ? parseInt(m[3]!, 10) : new Date().getFullYear()
    if (y < 100) y += y < 70 ? 2000 : 1900
    const dt = new Date(y, mo - 1, d)
    if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10)
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  return null
}

type ComiteColMap = {
  n: number
  area: number
  situacion: number
  tarea: number
  responsable: number
  inicio: number
  plazo: number
}

function mapComiteHeaderRow(parts: string[]): ComiteColMap | null {
  const norm = parts.map(normalizeHeaderCell)
  const situacion = findHeaderCol(norm, ['situacion'], 'loose')
  const tarea = findHeaderCol(norm, ['tarea'], 'exact')
  if (situacion < 0 || tarea < 0) return null
  const nCol = findHeaderCol(norm, ['n', 'nro', 'num', 'numero', 'item', 'no', 'orden'], 'loose')
  return {
    n: nCol,
    area: findHeaderCol(norm, ['area', 'equipo', 'departamento', 'dpto'], 'loose'),
    situacion,
    tarea,
    responsable: findHeaderCol(norm, ['responsable', 'asignado', 'owner'], 'loose'),
    inicio: findHeaderCol(norm, ['inicio', 'start', 'desde'], 'loose'),
    plazo: findHeaderCol(
      norm,
      ['plazo', 'deadline', 'fin', 'vencimiento', 'hasta', 'fecha fin', 'fechafin', 'fecha cierre'],
      'loose',
    ),
  }
}

function comiteCell(parts: string[], idx: number): string {
  if (idx < 0) return ''
  return (parts[idx] ?? '').trim()
}

function rowFromComiteCols(
  parts: string[],
  map: ComiteColMap,
  order: number,
): CreateMeetingMinuteItemPayload {
  const situation = comiteCell(parts, map.situacion) || null
  const taskTitle = comiteCell(parts, map.tarea) || null
  const isSection = Boolean(situation?.startsWith('##') && !(taskTitle ?? '').trim())
  const areaText = comiteCell(parts, map.area)
  const respText = comiteCell(parts, map.responsable)
  const startRaw = comiteCell(parts, map.inicio)
  const plazoRaw = comiteCell(parts, map.plazo)

  return omitUndefinedKeys({
    itemType: isSection ? 'INFORMACION' : 'ACCION',
    status: 'PENDIENTE',
    itemOrder: order,
    situation,
    taskTitle: isSection ? null : taskTitle,
    areaNameSnapshot: areaText || undefined,
    responsibleNameSnapshot: respText || undefined,
    startDate: parseFlexibleDateToIso(startRaw) ?? undefined,
    deadline: parseFlexibleDateToIso(plazoRaw) ?? undefined,
  } as CreateMeetingMinuteItemPayload)
}

function tryParseComiteDataOnlyLines(lines: string[]): CreateMeetingMinuteItemPayload[] | null {
  if (lines.length === 0) return null
  const first = lines[0]!.split('\t').map((x) => x.trim())
  if (first.length < 6) return null
  if (!/^\d+$/.test(first[0]!)) return null

  const hasPlazo = first.length >= 7
  const map: ComiteColMap = {
    n: 0,
    area: 1,
    situacion: 2,
    tarea: 3,
    responsable: 4,
    inicio: 5,
    plazo: hasPlazo ? 6 : -1,
  }
  const out: CreateMeetingMinuteItemPayload[] = []
  let order = 0
  for (const line of lines) {
    const parts = line.split('\t')
    if (parts.every((p) => !(p ?? '').trim())) continue
    out.push(rowFromComiteCols(parts, map, order++))
  }
  return out
}

function parseMeetingItemsTsvLegacy(lines: string[]): CreateMeetingMinuteItemPayload[] {
  const startIdx = /^situacion/i.test(lines[0]!.split('\t')[0] ?? '') ? 1 : 0
  const out: CreateMeetingMinuteItemPayload[] = []
  let order = 0
  for (let i = startIdx; i < lines.length; i++) {
    const parts = lines[i]!.split('\t')
    const situation = (parts[0] ?? '').trim() || null
    const decision = (parts[1] ?? '').trim() || null
    const taskTitle = (parts[2] ?? '').trim() || null
    const itemType = parseItemType(parts[3])
    const status = parseItemStatus(parts[4])
    const priority = (parts[5] ?? '').trim() || null
    const areaRaw = (parts[6] ?? '').trim()
    const projectRaw = (parts[7] ?? '').trim()
    const sprintRaw = (parts[8] ?? '').trim()
    const respRaw = (parts[9] ?? '').trim()
    const startRaw = (parts[10] ?? '').trim()
    const deadlineRaw = (parts[11] ?? '').trim()

    const areaId = areaRaw ? Number(areaRaw) : undefined
    const projectId = projectRaw ? Number(projectRaw) : undefined
    const sprintId = sprintRaw ? Number(sprintRaw) : undefined
    const responsibleUserId = respRaw ? Number(respRaw) : undefined
    const startDateIso = parseFlexibleDateToIso(startRaw)
    const deadlineIso = parseFlexibleDateToIso(deadlineRaw)

    out.push(
      omitUndefinedKeys({
        itemOrder: order++,
        situation,
        decision,
        taskTitle,
        itemType,
        status,
        priority: priority || undefined,
        areaId: Number.isFinite(areaId) ? areaId : undefined,
        projectId: Number.isFinite(projectId) ? projectId : undefined,
        sprintId: Number.isFinite(sprintId) ? sprintId : undefined,
        responsibleUserId: Number.isFinite(responsibleUserId) ? responsibleUserId : undefined,
        startDate: startDateIso ?? undefined,
        deadline: deadlineIso ?? undefined,
      } as CreateMeetingMinuteItemPayload),
    )
  }
  return out
}

/** TSV: comité (columnas Situación+Tarea) o formato extendido legacy. */
export function parseMeetingItemsTsv(raw: string): CreateMeetingMinuteItemPayload[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return []

  const firstParts = lines[0]!.split('\t')
  const norm = firstParts.map(normalizeHeaderCell)
  const looksComiteHeader =
    norm.some((c) => c.includes('situacion')) && norm.some((c) => c === 'tarea')

  if (looksComiteHeader) {
    const colMap = mapComiteHeaderRow(firstParts)
    if (colMap) {
      const out: CreateMeetingMinuteItemPayload[] = []
      let order = 0
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i]!.split('\t')
        if (parts.every((p) => !(p ?? '').trim())) continue
        out.push(rowFromComiteCols(parts, colMap, order++))
      }
      return out
    }
  }

  const comiteOnly = tryParseComiteDataOnlyLines(lines)
  if (comiteOnly) return comiteOnly

  return parseMeetingItemsTsvLegacy(lines)
}
