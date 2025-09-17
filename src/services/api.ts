/**
 * Configuración centralizada de Axios para comunicación con la API
 * Incluye interceptores para manejo de tokens y errores
 */
import axios from 'axios'

// URL base de la API, con fallback a localhost en desarrollo (sistema principal NestJS)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'

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
    // Intentar obtener el token desde localStorage
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // También intentar obtener desde el store persistido
    const authStorage = localStorage.getItem('auth-storage')
    if (!token && authStorage) {
      try {
        const authData = JSON.parse(authStorage)
        if (authData.state?.token) {
          config.headers.Authorization = `Bearer ${authData.state.token}`
        }
      } catch (error) {
        console.error('Error al parsear auth-storage:', error)
      }
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
    // Manejar errores de autenticación (401)
    if (error.response?.status === 401) {
      console.log('🔒 [api] Error 401 - Token expirado, ejecutando logout completo...')
      
      // 🎯 USAR EL MISMO MÉTODO QUE EL LOGOUT MANUAL
      try {
        // Importar dinámicamente el authService para evitar dependencias circulares
        const { authService } = await import('./auth-service')
        await authService.logout()
        console.log('✅ [api] Logout automático completado con limpieza del AgentPanel')
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