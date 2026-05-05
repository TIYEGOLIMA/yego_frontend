import type { User } from '../../../../store/auth-store'
import type { AreaFull } from '../types'

/** Fechas del modal detalle (estilo sprint-master-pro: «26 abr 2026»). */
export function formatDetailModalDate(iso: string): string {
  const d = new Date(iso + (iso.length <= 10 ? 'T12:00:00' : ''))
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Fecha local `yyyy-mm-dd` para `min` en `<input type="date">` y validación. */
export function todayYmdLocal(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Id de área/equipo del usuario para precargar tareas privadas (perfil vs lista Gantt).
 */
export function resolveUserDefaultAreaId(user: User | null | undefined, areas: AreaFull[]): string {
  if (!user || areas.length === 0) return ''
  if (user.areaId != null) {
    const sid = String(user.areaId)
    if (areas.some((a) => String(a.id) === sid)) return sid
  }
  const matchLabel = (label: string | null | undefined): string => {
    const raw = (label || '').trim()
    if (!raw) return ''
    const parts = raw.split(',').map((p) => p.trim()).filter(Boolean)
    for (const part of parts) {
      const pl = part.toLowerCase()
      const hit = areas.find((a) => (a.name || '').trim().toLowerCase() === pl)
      if (hit) return String(hit.id)
    }
    return ''
  }
  const fromPrincipal = matchLabel(user.nombreArea)
  if (fromPrincipal) return fromPrincipal
  const fromSupervisor = matchLabel(user.nombreAreaSupervisor)
  if (fromSupervisor) return fromSupervisor
  if (areas.length === 1) return String(areas[0].id)
  return ''
}
