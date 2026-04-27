import type { Module } from '@/store/auth-store'

/**
 * Coincide la lógica de PermissionRoute: slug de la URL vs url/nombre del módulo en BD.
 */
export function moduleMatchesSlug(slug: string, m: Module): boolean {
  if (!m.activo) return false
  const moduleName = slug.toLowerCase().trim()
  const moduleUrl = (m.url || '').toLowerCase().replace(/^\/+|\/+$/g, '')
  const moduleNombre = (m.nombre || '').toLowerCase().trim()
  const urlMatches =
    moduleUrl === moduleName ||
    moduleUrl.includes(moduleName) ||
    moduleName.includes(moduleUrl)
  const nameMatches =
    moduleNombre === moduleName ||
    moduleNombre.includes(moduleName) ||
    moduleName.includes(moduleNombre)
  return urlMatches || nameMatches
}

export function userHasModuleAccess(modules: Module[], slug: string): boolean {
  return modules.some((m) => moduleMatchesSlug(slug, m))
}

export function findFirstModuleForSlug(modules: Module[], slug: string): Module | undefined {
  return modules.find((m) => moduleMatchesSlug(slug, m))
}
