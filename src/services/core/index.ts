// 🏢 SERVICIOS PRINCIPALES DEL SISTEMA
// Entry point para todos los servicios core del sistema principal

// Servicios principales
export { default as api } from './api';
export { authService } from './auth-service';
export { dashboardService } from './dashboard-service';

// Re-exportar tipos de auth-service
export type {
  LoginCredentials,
  RegisterData,
  AuthResponse,
  AuthUser,
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

// 🌐 WebSocket global (se mantiene en la raíz)
export { default as SocketService } from '../socket-service';