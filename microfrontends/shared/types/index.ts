// 🎯 TIPOS GLOBALES PARA TODOS LOS SISTEMAS

// 👤 Usuario base para todos los sistemas
export interface BaseUser {
  id: number
  email: string
  name: string
  role: string
  active: boolean
  createdAt: string
  updatedAt: string
}

// 🔐 Contexto de autenticación
export interface AuthContext {
  user: BaseUser | null
  token: string | null
  isAuthenticated: boolean
  permissions: string[]
}

// 📱 Configuración de dispositivos
export interface DeviceInfo {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  screenWidth: number
  screenHeight: number
  touchSupported: boolean
}

// 🎨 Variantes de componentes comunes
export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'ghost' | 'outline'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export type AlertType = 'info' | 'success' | 'warning' | 'error'
export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

// 📊 Estado base para operaciones
export interface OperationState<T = any> {
  data: T | null
  loading: boolean
  error: string | null
  lastUpdated: Date | null
}

// 🌐 Respuesta API estándar
export interface ApiResponse<T = any> {
  data: T
  message?: string
  success: boolean
  timestamp: string
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

// 🔍 Filtros y ordenamiento
export interface FilterOptions {
  search?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// 📝 Configuración de formularios
export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'checkbox' | 'date'
  required?: boolean
  placeholder?: string
  options?: { value: any; label: string }[]
  validation?: {
    min?: number
    max?: number
    pattern?: RegExp
    message?: string
  }
}

// 🎯 Configuración de sistema
export interface SystemConfig {
  name: string
  version: string
  apiUrl: string
  features: string[]
  maintenance: boolean
}
