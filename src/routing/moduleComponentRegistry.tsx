import type { ComponentType } from 'react'
import Dashboard from '@/pages/Dashboard'
import UsersModule from '@/features/core/users/users.module'
import RolesModule from '@/features/core/roles/roles.module'
import PermissionsModule from '@/features/core/permissions/permissions.module'
import ModulesModule from '@/features/core/modules/modules.module'
import { AreasModule } from '@/features/core/areas'
import AuditModule from '@/features/core/audit/audit.module'
import ApiLogsModule from '@/features/core/api-logs/api-logs.module'
import SessionsModule from '@/features/core/sessions/sessions.module'
import { GarantizadoModule } from '@/features/core/garantizado'
import { TicketeraModule, TicketeraReportsModule } from '@/features/core/ticketera'
import YegoPremiumModule from '@/features/core/yego-premium/yego-premium.module'
import YegoProOpsModule from '@/features/core/yego-pro-ops/yego-pro-ops.module'
import { YegoGanttModule } from '@/features/core/yego-gantt'
import { MarketingMensajesModule } from '@/features/core/marketing-mensajes'
import ControlTowerModule from '@/features/core/control-tower/control-tower.module'
import ControlLoopModule from '@/features/core/control-loop/control-loop.module'
import FinanciatorModule from '@/features/core/financiator/financiator.module'
import { CargaMasivaModule } from '@/features/core/carga-masiva'

/**
 * Registro por código estable (columna codigo en queue_modulos).
 * Debe coincidir con los valores que devuelve el backend.
 */
const REGISTRY: Record<string, ComponentType> = {
  DASHBOARD: Dashboard,
  USERS: UsersModule,
  ROLES: RolesModule,
  PERMISSIONS: PermissionsModule,
  MODULES: ModulesModule,
  AREAS: AreasModule,
  AUDIT: AuditModule,
  API_LOGS: ApiLogsModule,
  SESSIONS: SessionsModule,
  TICKETS: TicketeraModule,
  REPORTS: TicketeraReportsModule,
  GARANTIZADO: GarantizadoModule,
  YEGO_PREMIUM: YegoPremiumModule,
  YEGO_PRO_OPS: YegoProOpsModule,
  YEGO_GANTT: YegoGanttModule,
  MENSAJES_MARKETING: MarketingMensajesModule,
  CONTROL_TOWER: ControlTowerModule,
  CONTROL_LOOP: ControlLoopModule,
  FINANCIATOR: FinanciatorModule,
  CARGA_MASIVA: CargaMasivaModule,
}

const CODE_ALIASES: Record<string, string> = {
  TICKETERA: 'TICKETS',
  TICKET: 'TICKETS',
  REPORTES: 'REPORTS',
}

function normalizeModuleCode(value: string): string {
  return value
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .replace(/[?#].*$/, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()
}

export function getComponentByModuleCode(code: string): ComponentType | null {
  const normalizedCode = normalizeModuleCode(code)
  const key = CODE_ALIASES[normalizedCode] ?? normalizedCode
  return REGISTRY[key] ?? null
}

interface ModuleScreenDescriptor {
  codigo?: string | null
  url?: string | null
  nombre?: string | null
}

/**
 * Mantiene compatibilidad con módulos creados antes de existir `codigo`.
 * El código estable tiene prioridad; URL, slug y nombre son solo respaldo de migración.
 */
export function getComponentForModule(
  module: ModuleScreenDescriptor | null | undefined,
  routeSlug: string,
): ComponentType | null {
  const candidates = [module?.codigo, routeSlug, module?.url, module?.nombre]

  for (const candidate of candidates) {
    if (!candidate?.trim()) continue
    const component = getComponentByModuleCode(candidate)
    if (component) return component
  }

  return null
}
