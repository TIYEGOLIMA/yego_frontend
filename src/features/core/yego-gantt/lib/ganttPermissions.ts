import type { User } from '../../../../store/auth-store'

/**
 * Todas las pestañas: admin/jefe, supervisores (rol o área) y supervisor lead.
 * El resto solo Timeline y Board.
 */
export function ganttHasFullTabAccess(u: User | null | undefined): boolean {
  if (!u) return false
  const r = (u.role || '').toUpperCase().trim()
  const roleNorm = r.replace(/[\s-]+/g, '_')
  if (r === 'ADMIN' || r === 'SUPERADMIN') return true
  if (r === 'SUPERVISOR' || roleNorm === 'SUPERVISOR_LEAD') return true
  if (roleNorm.includes('SUPERVISOR') && roleNorm.includes('LEALTAD')) return true
  if (u.esJefe === true) return true
  if (u.esSupervisor === true) return true
  return false
}

/** Crear/editar/eliminar espacios de trabajo (gantt_projects): solo roles operativos (ver backend). */
export function ganttCanManageWorkspaces(u: User | null | undefined): boolean {
  if (!u) return false
  const r = (u.role || '').toUpperCase().trim()
  const roleNorm = r.replace(/[\s-]+/g, '_')
  if (r === 'ADMIN' || r === 'SUPERADMIN') return true
  if (r === 'SUPERVISOR' || roleNorm === 'SUPERVISOR_LEAD') return true
  if (roleNorm.includes('SUPERVISOR') && roleNorm.includes('LEALTAD')) return true
  return false
}

/** Eliminar sprints en API: solo ADMIN / SUPERADMIN. */
export function ganttIsPlatformAdmin(u: User | null | undefined): boolean {
  if (!u) return false
  const r = (u.role || '').toUpperCase().trim()
  return r === 'ADMIN' || r === 'SUPERADMIN'
}
