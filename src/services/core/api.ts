/**
 * Configuración centralizada de Axios para comunicación con la API
 * Incluye interceptores para manejo de tokens y errores
 */
import axios from 'axios'
import { authService } from './auth-service'

// URL base de la API usando variable de entorno
const API_BASE_URL = import.meta.env.VITE_API_URL || (
  import.meta.env.DEV ? 'http://localhost:3030/api' : '/api'
)

// Crear instancia de axios con configuración base
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 segundos de timeout
})

// Interceptor para agregar el token de autenticación a todas las peticiones
api.interceptors.request.use(
  (config) => {
    // Intentar obtener el token desde auth-storage (Zustand persist)
    let token: string | null = null
    try {
      const authStorage = localStorage.getItem('auth-storage')
      if (authStorage) {
        const parsed = JSON.parse(authStorage)
        token = parsed?.state?.token || null
      }
    } catch (err) {
      // Si no se puede leer auth-storage, intentar token directo (compatibilidad temporal)
      token = localStorage.getItem('token')
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    } else {
      // Si no hay token, remover el header de Authorization
      delete config.headers.Authorization
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor para manejar errores de respuesta
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Verificar si el error es del endpoint de login o refresh
    const isLoginRequest = error.config?.url?.includes('/auth/login')
    const isRefreshRequest = error.config?.url?.includes('/auth/refresh')
    const isTicketeraRefreshRequest = error.config?.url?.includes('/ticketera/auth/refresh')
    
    // Manejar errores de autenticación (401)
    // NO interceptar errores 401 del login o refresh (credenciales incorrectas o token inválido)
    if (error.response?.status === 401 && !isLoginRequest && !isRefreshRequest && !isTicketeraRefreshRequest) {
      console.log('🔒 [api] Error 401 - Token expirado, intentando renovar...')
      
      // Intentar renovar el token antes de hacer logout
      try {
        // Leer token desde auth-storage (Zustand persist)
        let currentToken: string | null = null;
        try {
          const authStorage = localStorage.getItem('auth-storage');
          if (authStorage) {
            const parsed = JSON.parse(authStorage);
            currentToken = parsed?.state?.token || null;
          }
        } catch (err) {
          // Fallback: intentar leer desde token directo (compatibilidad temporal)
          currentToken = localStorage.getItem('token');
        }
        
        if (currentToken) {
          console.log('🔄 [api] Intentando renovar token...')
          
          // Determinar qué endpoint de refresh usar según el contexto
          const refreshUrl = window.location.pathname.includes('/ticketera') 
            ? '/ticketera/auth/refresh' 
            : '/auth/refresh'
          
          const refreshResponse = await api.post(refreshUrl, {}, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
          })
          
          // Actualizar token en store (Zustand persist guardará en auth-storage automáticamente)
          const newToken = refreshResponse.data.accessToken
          // Actualizar directamente en el store para que Zustand persist lo guarde en auth-storage
          // Usamos import dinámico para evitar dependencia circular
          try {
            const { useAuthStore } = await import('../../store/auth-store')
            useAuthStore.setState({ token: newToken })
          } catch (err) {
            console.warn('⚠️ [api] No se pudo actualizar store, usando localStorage temporalmente');
            // Fallback: actualizar header aunque no se actualice el store
          }
          
          // Actualizar header de autorización
          api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
          
          // Reintentar request original con nuevo token
          error.config.headers['Authorization'] = `Bearer ${newToken}`
          console.log('✅ [api] Token renovado exitosamente, reintentando request...')
          
          return api.request(error.config)
        }
      } catch (refreshError) {
        console.warn('⚠️ [api] Error renovando token, ejecutando logout...', refreshError)
      }
      
      // Si la renovación falla, hacer logout completo
      try {
        await authService.logout()
        console.log('✅ [api] Logout automático completado')
      } catch (logoutError) {
        console.warn('⚠️ [api] Error en logout automático, limpiando localmente:', logoutError)
        // Fallback: al menos limpiar datos básicos
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        localStorage.removeItem('auth-storage')
      }
      
      // Redireccionar a login si no estamos ya en la página de login
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    
    // Manejar errores de conexión
    if (!error.response) {
      console.error('Error de conexión con el servidor:', error.message)
    }
    
    return Promise.reject(error)
  }
)

export default api