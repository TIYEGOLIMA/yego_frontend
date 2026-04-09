import { useEffect, useCallback } from 'react'
import { authService, ticketeraAuthService } from '../services'
import api from '../services/core/api'
import { useAuthStore } from '../store/auth-store'

/**
 * Hook específico para manejar la renovación automática de tokens JWT en ticketera
 * Verifica y renueva el token cada cierto tiempo para evitar deslogueos inesperados
 */
export const useTicketeraTokenRefresh = (intervalMinutes: number = 30) => {
  const refreshToken = useCallback(async () => {
    try {
      console.log('🔄 [useTicketeraTokenRefresh] Verificando token de ticketera...')
      
      // Verificar si el token es válido
      const isValid = await ticketeraAuthService.verifyToken()
      
      if (!isValid) {
        console.log('🔄 [useTicketeraTokenRefresh] Token inválido, renovando...')
        const refreshResponse = await ticketeraAuthService.refreshToken()
        api.defaults.headers.common['Authorization'] = `Bearer ${refreshResponse.accessToken}`
        const user =
          refreshResponse.user ??
          (await authService.getProfile(refreshResponse.accessToken))
        useAuthStore.setState({ 
          token: refreshResponse.accessToken,
          user,
        })
        
        console.log('✅ [useTicketeraTokenRefresh] Token de ticketera renovado exitosamente')
      } else {
        console.log('✅ [useTicketeraTokenRefresh] Token de ticketera válido')
      }
    } catch (error) {
      console.warn('⚠️ [useTicketeraTokenRefresh] Error verificando/renovando token:', error)
      
      // Si hay error, hacer logout
      try {
        // Limpiar store (Zustand persist limpiará auth-storage automáticamente)
        useAuthStore.setState({ user: null, token: null })
        
        // Redirigir a login
        window.location.href = '/login'
      } catch (logoutError) {
        console.error('❌ [useTicketeraTokenRefresh] Error en logout:', logoutError)
      }
    }
  }, [])

  useEffect(() => {
    // Solo ejecutar si estamos en el contexto de ticketera
    if (window.location.pathname.includes('/ticketera')) {
      // Verificar token al montar el componente
      refreshToken()

      // Configurar intervalo de verificación
      const interval = setInterval(refreshToken, intervalMinutes * 60 * 1000)

      return () => {
        clearInterval(interval)
      }
    }
  }, [refreshToken, intervalMinutes])

  return { refreshToken }
}
