import { useState, useEffect, useRef } from 'react'
import { authService } from '../services/authService'
import { User } from '../types'
import { safeGetItem, safeRemoveItem } from '../utils/storage'

// Cache global para evitar consultas repetitivas

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const isInitialized = useRef(false)

  useEffect(() => {
    // Evitar múltiples inicializaciones
    if (isInitialized.current) {
      return
    }
    
    isInitialized.current = true
    
    console.log('🚀 [useAuth] Iniciando verificación de usuario...')
    
    // 🧹 LIMPIAR TOKEN INVALIDO AL INICIAR
    clearInvalidToken()
    
            const verificarUsuario = async () => {
          try {
            console.log('🚀 [useAuth] ===== INICIANDO VERIFICACIÓN =====')
            console.log('🚀 [useAuth] Ruta actual:', window.location.pathname)
            
            // 🎯 VERIFICAR ALMACENAMIENTO LOCAL PRIMERO
            const userData = safeGetItem('user')
            const token = safeGetItem('token')

            console.log('🔍 [useAuth] Datos locales:', { userData: !!userData, token: !!token })
        
        if (userData && token) {
          try {
            const user = JSON.parse(userData)
            console.log('🔍 [useAuth] Usuario parseado:', user)
            
            // ✅ USUARIO ENCONTRADO - ESTABLECER ESTADO
            setCurrentUser(user)
            setLoading(false)
            console.log('✅ [useAuth] Sesión restaurada:', user.username, 'Rol:', user.role)
            return
          } catch (parseError) {
            console.error('❌ [useAuth] Error parseando datos de usuario:', parseError)
          }
        }
        
        // 🎯 SI NO HAY DATOS LOCALES, VERIFICAR AUTENTICACIÓN
        console.log('🔍 [useAuth] Verificando autenticación...')
        const isAuth = authService.isAuthenticated()
        console.log('🔍 [useAuth] ¿Está autenticado?', isAuth)
        
        if (isAuth) {
          const user = authService.getUser()
          console.log('🔍 [useAuth] Usuario obtenido:', user)
          
          if (user && user.id && user.username) {
            setCurrentUser(user)
            console.log('✅ [useAuth] Usuario validado:', user.username, 'Rol:', user.role)
          } else {
            console.log('❌ Usuario inválido o incompleto:', user)
            setCurrentUser(null)
          }
        } else {
          console.log('🔍 [useAuth] No hay sesión activa')
          setCurrentUser(null)
        }
      } catch (error) {
        console.warn('⚠️ [useAuth] Error en verificación:', error)
        setCurrentUser(null)
      } finally {
        console.log('🔍 [useAuth] Finalizando verificación, estableciendo loading=false')
        setLoading(false)
      }
    }

    verificarUsuario()
    
  }, [])

  const logout = async () => {
    try {
      console.log('🚪 [useAuth] Iniciando logout...')
      
      // Limpiar cache
      
      // Limpiar módulo guardado del usuario actual
      if (currentUser?.id) {
        console.log('🧹 [useAuth] Limpiando módulo guardado para usuario:', currentUser.id)
        safeRemoveItem(`selectedModule_${currentUser.id}`)
        safeRemoveItem(`selectedModuleName_${currentUser.id}`)
      }
      
      // Limpiar datos de sesión
      await authService.logout()
      
      // Limpiar estado local
      setCurrentUser(null)
      
      console.log('✅ [useAuth] Logout completado')
      
      // 🎯 REDIRIGIR DIRECTAMENTE AL LOGIN
      console.log('🔄 [useAuth] Redirigiendo al login...')
      window.location.href = '/login'
      
    } catch (error) {
      console.error('❌ [useAuth] Error en logout:', error)
      // 🎯 EN CASO DE ERROR, TAMBIÉN REDIRIGIR AL LOGIN
      setCurrentUser(null)
      console.log('🔄 [useAuth] Redirigiendo al login por error...')
      window.location.href = '/login'
    }
  }

  // Función para limpiar cache manualmente
  const clearCache = () => {
    console.log('🧹 [useAuth] Cache limpiado manualmente')
  }

  // 🧹 FUNCIÓN PARA LIMPIAR TOKEN INVALIDO
  const clearInvalidToken = () => {
    const token = safeGetItem('token')
    
    // Detectar tokens que no sean JWT válidos
    const isJWT = token && 
      typeof token === 'string' && 
      token.length > 50 && 
      token.includes('.') &&
      token.split('.').length === 3 &&
      token.startsWith('eyJ')
    
    const isInvalidToken = token && !isJWT
    
    if (token && isInvalidToken) {
      safeRemoveItem('token')
      safeRemoveItem('user')
      console.log('🧹 [useAuth] Token inválido limpiado del localStorage:', token)
      
      // 🚨 FORZAR REDIRECCIÓN A LOGIN SI HAY TOKEN INVÁLIDO
      if (window.location.pathname !== '/login') {
        console.log('🚨 [useAuth] Redirigiendo a login por token inválido')
        window.location.href = '/login'
      }
    }
  }

  // 🎯 EFECTO PARA RENOVAR TOKEN AUTOMÁTICAMENTE
  useEffect(() => {
    if (!currentUser) return

    // Renovar token cada 4 minutos (antes de que expire)
    const tokenRefreshInterval = setInterval(async () => {
      try {
        console.log('🔄 [useAuth] Renovando token automáticamente...')
        const success = await authService.refreshToken()
        
        if (success) {
          console.log('✅ [useAuth] Token renovado automáticamente')
        } else {
          console.log('⚠️ [useAuth] No se pudo renovar el token automáticamente')
        }
      } catch (error) {
        console.error('❌ [useAuth] Error renovando token automáticamente:', error)
      }
    }, 4 * 60 * 1000) // 4 minutos

    return () => clearInterval(tokenRefreshInterval)
  }, [currentUser])

  return {
    currentUser,
    loading,
    logout,
    clearCache,
    clearInvalidToken,
    isAuthenticated: !!currentUser
  }
}