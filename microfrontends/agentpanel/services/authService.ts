import { User } from '../types'
import api from './api'
import { queueAgentService } from './index'
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/storage'

class AuthService {
  async login(username: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      console.log('🔐 [authService] ===== INICIANDO LOGIN =====')
      console.log('🔐 [authService] Usuario:', username)
      console.log('🔐 [authService] Endpoint:', '/auth/login')
      
      const response = await api.post('/auth/login', { username, password })
      
      console.log('🔍 [authService] Respuesta completa del backend:', response)
      console.log('🔍 [authService] Status:', response.status)
      console.log('🔍 [authService] Data:', response.data)
      
      // Si el status es 200, asumimos que el login fue exitoso
      if (response.status === 200 && response.data) {
        const data = response.data
        
        // 🎯 VERIFICAR SI EXISTE TOKEN
        if (!data.token) {
          console.log('❌ [authService] NO HAY TOKEN en la respuesta')
          return { success: false, error: 'El backend no devolvió token en data.token' }
        }
        
        // 🎯 VERIFICAR SI EXISTE USER
        if (!data.user && !data.id) {
          console.log('❌ [authService] NO HAY USER en la respuesta')
          return { success: false, error: 'El backend no devuelve estructura user correcta' }
        }
        
        // Construir user desde la respuesta
        const user = data.user || {
          id: data.id || 0,
          username: data.username || username,
          name: data.name || data.username || username,
          email: data.email || '',
          role: data.role || 'operador',
          active: data.active !== undefined ? data.active : true,
          lastLogin: data.lastLogin || data.last_login || new Date().toISOString()
        }
        
        console.log('🔍 [authService] User construido:', user)
        
        // 🎯 VERIFICAR SI EL TOKEN ES JWT VÁLIDO
        const tokenFromBackend = data.token
        const isJWT = tokenFromBackend && 
          typeof tokenFromBackend === 'string' && 
          tokenFromBackend.length > 50 && 
          tokenFromBackend.split('.').length === 3 &&
          tokenFromBackend.startsWith('eyJ')
        
        console.log('🔍 [authService] ===== VALIDACIÓN JWT =====')
        console.log('🔍 [authService] Token del backend:', tokenFromBackend)
        console.log('🔍 [authService] ¿Es JWT válido?', isJWT)
        
        // 🎯 SOLO ACEPTAR JWT VÁLIDOS
        if (isJWT) {
          safeSetItem('token', tokenFromBackend)
          safeSetItem('user', JSON.stringify(user))
          
          console.log('✅ [authService] ===== LOGIN EXITOSO =====')
          console.log('✅ [authService] JWT válido guardado en localStorage')
          console.log('✅ [authService] Usuario:', user.name, 'Rol:', user.role)
          return { success: true, user }
        } 
        // 🎯 SI NO ES JWT VÁLIDO, ERROR DETALLADO
        else {
          console.log('❌ [authService] ===== JWT INVÁLIDO =====')
          console.log('❌ [authService] Token recibido:', tokenFromBackend)
          return { success: false, error: `El backend debe devolver un JWT válido en data.token. Se recibió: ${tokenFromBackend || 'no recibido'}` }
        }
      } else {
        // Status no exitoso
        console.log('❌ [authService] ===== LOGIN FALLIDO =====')
        console.log('❌ [authService] Status:', response.status)
        console.log('❌ [authService] Data:', response.data)
        const errorMsg = response.data?.message || response.data?.error || `Error del servidor: ${response.status}`
        console.log('❌ [authService] Error:', errorMsg)
        return { success: false, error: errorMsg }
      }
    } catch (error: any) {
      console.error('❌ [authService] Error en login:', error)
      
      let errorMessage = 'Error de conexión'
      if (error.response?.status === 401) {
        errorMessage = 'Credenciales inválidas'
      } else if (error.response?.status === 429) {
        errorMessage = 'Demasiados intentos. Intente más tarde'
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }
      
      console.log('❌ [authService] ===== LOGIN CON ERROR =====')
      console.log('❌ [authService] Error final:', errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  async validateToken(): Promise<boolean> {
    try {
      const token = this.getToken()
      if (!token) {
        console.log('❌ [authService] No hay token para validar')
        return false
      }

      // Verificar que sea un JWT válido
      const isJWT = token && 
        typeof token === 'string' && 
        token.includes('.') && 
        token.split('.').length === 3 &&
        token.startsWith('eyJ')
      
      if (!isJWT) {
        console.log('❌ [authService] Token no es JWT válido:', token)
        return false
      }

      console.log('🔍 [authService] Token válido, validando con backend...')
      const response = await api.get('/auth/validate')
      
      if (response.data?.valid === true) {
        console.log('✅ [authService] Token válido según backend')
        return true
      } else {
        console.log('❌ [authService] Token inválido según backend')
        return false
      }
    } catch (error) {
      console.error('❌ [authService] Error validando token:', error)
      return false
    }
  }

  // 🎯 FUNCIÓN: Renovar token automáticamente
  async refreshToken(): Promise<boolean> {
    try {
      const token = this.getToken()
      if (!token) {
        console.log('❌ [authService] No hay token para renovar')
        return false
      }

      // Verificar que sea un JWT válido
      const isJWT = token && 
        typeof token === 'string' && 
        token.includes('.') && 
        token.split('.').length === 3 &&
        token.startsWith('eyJ')
      
      if (!isJWT) {
        console.log('❌ [authService] Token no es JWT válido, no se puede renovar:', token)
        return false
      }

      console.log('🔄 [authService] Renovando token...')
      const response = await api.post('/auth/refresh')
      
      if (response.data?.token) {
        // Verificar que el nuevo token sea JWT válido
        const newToken = response.data.token
        const isNewTokenJWT = newToken.includes('.') && 
          newToken.split('.').length === 3 &&
          newToken.startsWith('eyJ')
        
        if (isNewTokenJWT) {
          // 🎯 GUARDAR NUEVO JWT
          this.setToken(newToken)
          console.log('✅ [authService] JWT renovado exitosamente')
          return true
        } else {
          console.log('❌ [authService] Nuevo token no es JWT válido')
          return false
        }
      }
      
      console.log('❌ [authService] No se recibió nuevo token en la renovación')
      return false
    } catch (error) {
      console.error('❌ [authService] Error renovando token:', error)
      return false
    }
  }

  async getUserRole(): Promise<'tablet1' | 'superadmin' | 'principal' | 'tv' | 'tablet2' | 'operador' | null> {
    try {
      const token = this.getToken()
      if (!token) {
        return null
      }

      const response = await api.get('/auth/role')
      return response.data.role
    } catch (error) {
      console.error('❌ [authService] Error obteniendo rol:', error)
      return null
    }
  }

  async logout(): Promise<void> {
    try {
      const token = this.getToken()
      const currentUser = this.getUser()
      
      // 🆕 LIBERAR MÓDULO ASIGNADO EN EL BACKEND ANTES DE HACER LOGOUT
      if (currentUser?.id) {
        try {
          console.log('🔄 [authService] Liberando módulo asignado en backend...')
          await queueAgentService.liberarModuloDelUsuario()
          console.log('✅ [authService] Módulo liberado exitosamente en backend')
        } catch (moduleError) {
          console.warn('⚠️ [authService] No se pudo liberar módulo en backend:', moduleError)
          // Continuar con el logout aunque falle la liberación del módulo
        }
      }
      
      if (token) {
        try {
          await api.post('/auth/logout')
          console.log('✅ [authService] Logout exitoso en backend')
        } catch (error) {
          console.warn('⚠️ [authService] No se pudo hacer logout en backend:', error)
        }
      }
      
      this.clearLocalData()
      
      if (currentUser?.id) {
        safeRemoveItem(`selectedModule_${currentUser.id}`)
        safeRemoveItem(`selectedModuleName_${currentUser.id}`)
      }
      
      safeRemoveItem('selectedModule')
      safeRemoveItem('selectedModuleName')
      
      console.log('✅ [authService] Logout completado')
    } catch (error) {
      console.error('❌ [authService] Error en logout:', error)
      this.clearLocalData()
    }
  }

  setToken(token: string) {
    safeSetItem('token', token)
  }

  getToken(): string | null {
    return safeGetItem('token')
  }

  setUser(user: User) {
    safeSetItem('user', JSON.stringify(user))
  }

  getUser(): User | null {
    const userStr = safeGetItem('user')
    return userStr ? JSON.parse(userStr) : null
  }

  private clearLocalData() {
    safeRemoveItem('token')
    safeRemoveItem('user')
  }

  isAuthenticated(): boolean {
    const token = this.getToken()
    const userData = safeGetItem('user')
    
    // Verificar que haya token y usuario
    if (!token || !userData) {
      return false
    }
    
    // Verificar que sea un JWT válido
    const isJWT = token && 
      typeof token === 'string' && 
      token.includes('.') && 
      token.split('.').length === 3 &&
      token.startsWith('eyJ')
    
    if (!isJWT) {
      console.log('❌ [authService] Token no es JWT válido en isAuthenticated:', token)
      return false
    }
    
    return true
  }
}

export const authService = new AuthService()