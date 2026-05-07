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
  type AuthUser,
  type ChangePasswordData
} from './core';

// 📊 SERVICIOS ESPECÍFICOS
export {
  yegoPremiumService,
  type DriverMonthlyStat,
  type DriverMonthlyStatsResponse,
  type FlotaPartnerOption,
  type DriverSummaryResponse,
  type DriverSnapshot,
  type DriverSummaryBlock,
  type DriverSummaryIncome,
  type DriverSummaryPeriod,
  type DriverSummaryGoal,
  type DriverSummaryGoalStep,
  type DriverTripsMonthResponse,
  type TripCompletedItem,
  type DailyTripsPoint,
  type DriverTripsYearResponse,
  type MonthlyTripsAggregate,
  type FetchDriverSummaryParams,
} from './yego-premium-service';
