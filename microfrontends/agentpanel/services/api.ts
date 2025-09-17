import axios from 'axios'
import { API_BASE_URL } from '../utils/constants'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config: any) => {
    // 🎯 SSO: Usar siempre el token del sistema principal (Identity Provider)
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null
    const ticketeraValidated = typeof window !== 'undefined' ? window.localStorage.getItem('ticketera_validated') : null
    
    if (token && ticketeraValidated === 'true') {
      console.log('✅ [api] Usando token SSO del sistema principal')
    } else if (token) {
      console.log('⚠️ [api] Token presente pero no validado para ticketera')
    } else {
      console.log('❌ [api] No hay token de autenticación')
    }
    
    // 🎯 DEBUGGING COMPLETO DEL TOKEN
    console.log('🔍 [api] ===== DEBUGGING COMPLETO DEL TOKEN =====')
    console.log('🔍 [api] Token encontrado:', !!token)
    console.log('🔍 [api] Tipo de token:', typeof token)
    console.log('🔍 [api] Longitud del token:', token ? token.length : 0)
    console.log('🔍 [api] Token completo:', token)
    
    if (token) {
      // 🎯 VERIFICAR FORMATO DEL TOKEN
      const isJWT = token && 
        typeof token === 'string' && 
        token.includes('.') && 
        token.split('.').length === 3 &&
        token.startsWith('eyJ')
      
      console.log('🔍 [api] ¿Es JWT válido?', isJWT)
      console.log('🔍 [api] Partes del token:', token ? token.split('.').length : 0)
      console.log('🔍 [api] ¿Empieza con eyJ?', token ? token.startsWith('eyJ') : false)
      
      // 🎯 CONSTRUIR HEADER DE AUTORIZACIÓN
      const authHeader = `Bearer ${token}`
      config.headers.Authorization = authHeader
      
      console.log('🔍 [api] Header Authorization construido:', authHeader)
      console.log('🔍 [api] Header completo:', config.headers.Authorization)
    } else {
      console.log('❌ [api] NO HAY TOKEN - Header Authorization NO se enviará')
    }
    
    // 🎯 DEBUGGING COMPLETO DE LA CONFIGURACIÓN
    console.log('🔍 [api] ===== CONFIGURACIÓN COMPLETA =====')
    console.log('🔍 [api] URL:', config.url)
    console.log('🔍 [api] Método:', config.method?.toUpperCase())
    console.log('🔍 [api] Headers completos:', config.headers)
    console.log('🔍 [api] ¿Authorization presente?', !!config.headers.Authorization)
    console.log('🔍 [api] Content-Type:', config.headers['Content-Type'])
    
    // 🎯 VERIFICACIÓN ESPECÍFICA PARA queue-agents/asignar
    if (config.url?.includes('queue-agents/asignar')) {
      console.log('🎯 [api] ===== PETICIÓN ESPECÍFICA queue-agents/asignar =====')
      console.log('🎯 [api] Token que se enviará:', token)
      console.log('🎯 [api] Header Authorization completo:', config.headers.Authorization)
      console.log('🎯 [api] ¿Token empieza con eyJ?', token ? token.startsWith('eyJ') : false)
      console.log('🎯 [api] URL completa:', config.baseURL + config.url)
      console.log('🎯 [api] Headers completos que se enviarán:', config.headers)
      console.log('🎯 [api] ===== FIN VERIFICACIÓN ESPECÍFICA =====')
    }
    
    // 🎯 VERIFICACIÓN ESPECÍFICA PARA tickets/call
    if (config.url?.includes('/tickets/') && config.url?.includes('/call')) {
      console.log('🎯 [api] ===== PETICIÓN ESPECÍFICA TICKET CALL =====')
      console.log('🎯 [api] Token que se enviará:', token)
      console.log('🎯 [api] Header Authorization completo:', config.headers.Authorization)
      console.log('🎯 [api] ¿Token empieza con eyJ?', token ? token.startsWith('eyJ') : false)
      console.log('🎯 [api] URL completa:', config.baseURL + config.url)
      console.log('🎯 [api] Headers completos que se enviarán:', config.headers)
      console.log('🎯 [api] ===== FIN VERIFICACIÓN ESPECÍFICA TICKET CALL =====')
    }
    
    console.log('🔍 [api] ===== FIN DEBUGGING =====')
    
    return config
  },
  (error: any) => {
    console.error('❌ [api] Error en request:', error)
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response: any) => {
    console.log('✅ [api] Response:', {
      url: response.config.url,
      status: response.status,
      method: response.config.method?.toUpperCase()
    })
    return response
  },
  async (error: any) => {
    // 🎯 DEBUGGING COMPLETO DEL ERROR
    console.error('❌ [api] ===== ERROR COMPLETO EN RESPUESTA =====')
    console.error('❌ [api] Status:', error.response?.status)
    console.error('❌ [api] URL:', error.config?.url)
    console.error('❌ [api] Método:', error.config?.method?.toUpperCase())
    console.error('❌ [api] Mensaje:', error.response?.data?.message || error.message)
    
    // 🎯 DEBUGGING COMPLETO DE LA RESPUESTA DEL BACKEND
    if (error.response) {
      console.error('🔍 [api] ===== RESPUESTA DEL BACKEND =====')
      console.error('🔍 [api] Status:', error.response.status)
      console.error('🔍 [api] Status Text:', error.response.statusText)
      console.error('🔍 [api] Headers:', error.response.headers)
      console.error('🔍 [api] Data:', error.response.data)
      console.error('🔍 [api] Config:', error.response.config)
    }
    
    // 🎯 DEBUGGING COMPLETO DE LA CONFIGURACIÓN DE LA PETICIÓN
    if (error.config) {
      console.error('🔍 [api] ===== CONFIGURACIÓN DE LA PETICIÓN =====')
      console.error('🔍 [api] URL:', error.config.url)
      console.error('🔍 [api] Método:', error.config.method)
      console.error('🔍 [api] Headers:', error.config.headers)
      console.error('🔍 [api] Data enviada:', error.config.data)
      console.error('🔍 [api] Authorization header:', error.config.headers?.Authorization)
    }
    
    // 🎯 DEBUGGING COMPLETO DEL TOKEN EN EL ERROR
    const tokenEnError = error.config?.headers?.Authorization
    console.error('🔍 [api] ===== TOKEN EN EL ERROR =====')
    console.error('🔍 [api] ¿Header Authorization presente?', !!tokenEnError)
    console.error('🔍 [api] Header Authorization completo:', tokenEnError)
    console.error('🔍 [api] ¿Empieza con Bearer?', tokenEnError ? tokenEnError.startsWith('Bearer ') : false)
    
    // 🎯 MANEJAR ERROR 401: Token expirado o inválido
    if (error.response?.status === 401) {
      console.log('🔑 [api] ===== ERROR 401 DETECTADO =====')
      console.log('🔑 [api] URL que falló:', error.config?.url)
      console.log('🔑 [api] Método que falló:', error.config?.method)
      console.log('🔑 [api] Headers que se enviaron:', error.config?.headers)
      console.log('🔑 [api] Token expirado o inválido, intentando renovar...')
      
      try {
        // Intentar renovar el token automáticamente
        const currentToken = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null
        const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
          headers: {
            'Authorization': `Bearer ${currentToken}`
          }
        })
        
        if (refreshResponse.data?.token) {
          // 🎯 GUARDAR NUEVO TOKEN en el localStorage del proyecto principal
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('token', refreshResponse.data.token)
          }
          
          // 🎯 REINTENTAR LA PETICIÓN ORIGINAL
          console.log('🔄 [api] Token JWT renovado, reintentando petición original...')
          error.config.headers.Authorization = `Bearer ${refreshResponse.data.token}`
          return axios.request(error.config)
        } else {
          console.log('❌ [api] No se recibió nuevo token en la renovación')
          console.log('❌ [api] Respuesta del refresh:', refreshResponse.data)
        }
      } catch (refreshError) {
        console.log('❌ [api] No se pudo renovar el token')
        console.log('❌ [api] Error del refresh:', refreshError)
        // 🎯 NO REDIRIGIR AUTOMÁTICAMENTE, SOLO LANZAR EL ERROR
        // El componente debe manejar este error
        console.log('⚠️ [api] El componente debe manejar el error de autenticación')
      }
    }
    
    console.error('❌ [api] ===== FIN DEBUGGING ERROR =====')
    return Promise.reject(error)
  }
)

export default api