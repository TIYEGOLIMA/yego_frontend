// 🏢 FEATURES DEL SISTEMA PRINCIPAL (CORE)
// Export de todas las features de administración y gestión general

// Módulos de administración
export { default as AuditModule } from './audit/audit.module';
export { default as UsersModule } from './users/users.module';
export { default as PermissionsModule } from './permissions/permissions.module';
export { default as RolesModule } from './roles/roles.module';
export { default as SessionsModule } from './sessions/sessions.module';

// Módulos de funcionalidades
export { default as ReportsModule } from './reports/reports.module';
export { default as ModulesModule } from './modules/modules.module';
export { AsistenciaModule } from './asistencia';
export { default as YegoPremiunModule } from './yego-premiun/yego-premiun.module';
export { default as YegoProOpsModule } from './yego-pro-ops/yego-pro-ops.module';
export { WelcomeModule } from './welcome';
export { MarketingMensajesModule } from './marketing-mensajes';

// 🎯 CONFIGURACIÓN DE FEATURES CORE
export const CORE_FEATURES_CONFIG = {
  name: 'Sistema Principal',
  description: 'Features de administración y gestión general del sistema',
  version: '1.0.0',
  features: [
    'audit', 'users', 'permissions', 'roles', 
    'sessions', 'reports', 'modules', 'asistencia', 'yego-premiun', 'yego-pro-ops'
  ]
} as const;
