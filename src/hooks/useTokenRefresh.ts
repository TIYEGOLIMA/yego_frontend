import { useEffect, useCallback } from 'react'
import { authService } from '../services'
import api from '../services/core/api'
import { useAuthStore } from '../store/auth-store'

/**
 * Hook para manejar la renovación automática de tokens JWT
 * Verifica y renueva el token cada cierto tiempo para evitar deslogueos inesperados
 */
export const useTokenRefresh = (intervalMinutes: number = 30) => {
  const refreshToken = useCallback(async () => {
    try {
      console.log('🔄 [useTokenRefresh] Verificando token...')
      
      // Verificar si el token es válido
      const isValid = await authService.verifyToken()
      
      if (!isValid) {
        console.log('🔄 [useTokenRefresh] Token inválido, renovando...')
        const refreshResponse = await authService.refreshToken()
        api.defaults.headers.common['Authorization'] = `Bearer ${refreshResponse.accessToken}`
        const user = await authService.getProfile(refreshResponse.accessToken)
        useAuthStore.setState({ 
          token: refreshResponse.accessToken,
          user,
        })
        
        console.log('✅ [useTokenRefresh] Token renovado exitosamente')
      } else {
        console.log('✅ [useTokenRefresh] Token válido')
      }
    } catch (error) {
      console.warn('⚠️ [useTokenRefresh] Error verificando/renovando token:', error)
      
      // Si hay error, hacer logout
      try {
        await authService.logout()
        window.location.href = '/login'
      } catch (logoutError) {
        console.error('❌ [useTokenRefresh] Error en logout:', logoutError)
      }
    }
  }, [])

  useEffect(() => {
    // Verificar token al montar el componente
    refreshToken()

    // Configurar intervalo de verificación
    const interval = setInterval(refreshToken, intervalMinutes * 60 * 1000)

    return () => {
      clearInterval(interval)
    }
  }, [refreshToken, intervalMinutes])

  return { refreshToken }
}
