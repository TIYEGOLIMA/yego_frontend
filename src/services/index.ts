// 🏢 SERVICIOS PRINCIPALES - ENTRY POINT UNIFICADO
// Punto de entrada para todos los servicios del sistema empresarial

// 🌐 SERVICIOS GLOBALES
export { default as SocketService } from './socket-service';

// 🏢 SERVICIOS PRINCIPALES (CORE)
export {
  // API y Auth principales
  api,
  authService,
  
  // Dashboard del sistema principal
  dashboardService,
  
  // Tipos de dashboard
  type DashboardMetrics,
  type RecentActivity,
  type SystemStatus,
  type WeeklyStats,
  type DashboardData,
  
  // Tipos de auth
  type LoginCredentials,
  type RegisterData,
  type AuthResponse,
  type ChangePasswordData
} from './core';

// 📊 SERVICIOS ESPECÍFICOS
export {
  yegoPremiunService,
  type DriverMonthlyStat,
  type DriverMonthlyStatsResponse,
  type FetchDriverMonthlyStatsParams
} from './yego-premiun-service';

// 🎫 SERVICIOS TICKETERA
export {
  ticketeraAuthService,
  type TicketeraAuthResponse
} from './ticketera-auth-service';