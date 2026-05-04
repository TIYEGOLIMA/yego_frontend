/**
 * Vista única de colaboradores a partir de `areaCollaborators` + catálogo `areas`.
 * Centraliza la agregación por usuario (evita varios useMemo que re-barrían el mismo mapa).
 */
import type { AreaFull, ColaboradorDto } from './types'

export type AssigneePickerRow = ColaboradorDto & { areaNamesLabel: string }

/** Una entrada por usuario con lista de equipos ordenada y etiqueta «A · B». */
export function buildAssigneePickerRows(
  areas: AreaFull[],
  areaCollaborators: Map<number, ColaboradorDto[]>,
): AssigneePickerRow[] {
  const areaNameById = new Map(areas.map((a) => [a.id, (a.name || `Área ${a.id}`).trim()]))
  const byUser = new Map<number, { collab: ColaboradorDto; areaIds: Set<number> }>()
  for (const [areaId, list] of areaCollaborators.entries()) {
    for (const c of list) {
      const existing = byUser.get(c.id)
      if (existing) {
        existing.areaIds.add(areaId)
      } else {
        byUser.set(c.id, { collab: c, areaIds: new Set([areaId]) })
      }
    }
  }
  return [...byUser.values()]
    .map(({ collab, areaIds }) => {
      const names = [...areaIds]
        .map((id) => areaNameById.get(id) || `Área ${id}`)
        .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
      return { ...collab, areaNamesLabel: names.join(' · ') }
    })
    .sort((a, b) =>
      (a.nombreCompleto || '').localeCompare(b.nombreCompleto || '', 'es', { sensitivity: 'base' }),
    )
}

/** Primer resultado por id (orden de aparición en el mapa). */
export function buildAllCollaboratorsDeduped(
  areaCollaborators: Map<number, ColaboradorDto[]>,
): ColaboradorDto[] {
  const seen = new Set<number>()
  const result: ColaboradorDto[] = []
  for (const list of areaCollaborators.values()) {
    for (const c of list) {
      if (!seen.has(c.id)) {
        seen.add(c.id)
        result.push(c)
      }
    }
  }
  return result
}

/** Misma `nombreCompleto` que la fila del picker (fuente única). */
export function buildCollaboratorNameMap(rows: AssigneePickerRow[]): Map<number, string> {
  return new Map(rows.map((r) => [r.id, r.nombreCompleto]))
}

export function buildCollaboratorAreaLabelMap(rows: AssigneePickerRow[]): Map<number, string> {
  const m = new Map<number, string>()
  for (const r of rows) {
    if (r.areaNamesLabel) m.set(r.id, r.areaNamesLabel)
  }
  return m
}

export function collaboratorAreaLabel(
  row: ColaboradorDto | AssigneePickerRow | undefined,
  fallbackAreaId: number | undefined,
  areas: AreaFull[],
): string {
  if (row && 'areaNamesLabel' in row && (row as AssigneePickerRow).areaNamesLabel) {
    return (row as AssigneePickerRow).areaNamesLabel
  }
  if (fallbackAreaId != null) {
    const n = areas.find((a) => a.id === fallbackAreaId)?.name?.trim()
    return n || ''
  }
  return ''
}

function principalLineTitle(nombre: string, area: string): string {
  const a = area.trim()
  return a ? `${nombre} -- ${a}` : nombre
}

/** Responsable principal (modal): fila pública / select; área = `areaNamesLabel`. */
export function principalOwnerPublicParts(
  row: AssigneePickerRow | undefined,
  ownerId: number,
): { nombre: string; area: string; lineTitle: string } {
  const nombre = row?.nombreCompleto ?? `Usuario ${ownerId}`
  const area = row?.areaNamesLabel?.trim() ?? ''
  return { nombre, area, lineTitle: principalLineTitle(nombre, area) }
}

/** Responsable principal en tarea privada: área vía `collaboratorAreaLabel` + equipo del formulario. */
export function principalOwnerPrivateParts(
  row: AssigneePickerRow | undefined,
  ownerId: number,
  user: { id?: number; name?: string } | null | undefined,
  formAreaId: string | undefined,
  areas: AreaFull[],
): { nombre: string; area: string; lineTitle: string } {
  const nombre =
    row?.nombreCompleto ?? (user?.id === ownerId ? user.name : null) ?? `Usuario ${ownerId}`
  const aid = formAreaId ? Number(formAreaId) : undefined
  const area = collaboratorAreaLabel(
    row,
    Number.isFinite(aid) ? aid : undefined,
    areas,
  ).trim()
  return { nombre, area, lineTitle: principalLineTitle(nombre, area) }
}

/** `textValue` del ítem del select (misma cadena que la línea visible). */
export function principalSelectItemTextValue(c: AssigneePickerRow): string {
  return principalOwnerPublicParts(c, c.id).lineTitle
}
