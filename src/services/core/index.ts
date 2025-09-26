// 🏢 SERVICIOS PRINCIPALES DEL SISTEMA
// Entry point para todos los servicios core del sistema principal

// Servicios principales
export { default as api } from './api';
export { authService } from './auth-service';
export { microfrontendService } from './microfrontend-service';
export { dashboardService } from './dashboard-service';

// Re-exportar tipos de auth-service
export type {
  LoginCredentials,
  RegisterData,
  AuthResponse,
  ChangePasswordData
} from './auth-service';

// Re-exportar tipos de dashboard-service
export type {
  DashboardMetrics,
  RecentActivity,
  SystemStatus,
  WeeklyStats,
  DashboardData
} from './dashboard-service';

// Sistema de integración
export { 
  systemRegistry,
  getAvailableSystems,
  getActiveSystem,
  activateSystem,
  getSystemsForUser,
  canUserAccessSystem,
  type SystemInfo,
  type SystemIntegrationConfig
} from './system-registry';

export {
  systemIntegration,
  initializeUserSystem,
  switchActiveSystem,
  getCurrentSystemState,
  getSystemNavigation,
  onSystemEvent,
  type UserContext,
  type SystemNavigation,
  type IntegrationState
} from './system-integration';

// 🌐 WebSocket global (se mantiene en la raíz)
export { default as SocketService } from '../socket-service';
