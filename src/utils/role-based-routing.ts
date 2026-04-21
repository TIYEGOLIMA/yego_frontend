export interface Module {
  id: number
  nombre: string
  descripcion?: string
  url: string
  estado: string
  ultimoCheck?: string
  activo: boolean
  fechaCreacion?: string
  fechaActualizacion?: string
  icono?: string
  grupo?: {
    id: number
    nombre: string
    icono?: string
    activo?: boolean
    fechaCreacion?: string
  } | null
}

const normalizeUrl = (url?: string): string => {
  if (!url) return '/'
  return url.startsWith('/') ? url : `/${url}`
}

export const getRedirectPathForRole = (_role: string, modules?: Module[]): string => {
  if (modules && modules.length > 0) {
    const activeModules = modules.filter((m) => m.activo)
    if (activeModules.length > 0) {
      const dashboardModule = activeModules.find((m) => {
        const name = m.nombre?.toLowerCase() || ''
        const url = m.url?.toLowerCase() || ''
        return name.includes('dashboard') || url.includes('dashboard')
      })
      return normalizeUrl((dashboardModule ?? activeModules[0]).url)
    }
  }
  return '/'
}
