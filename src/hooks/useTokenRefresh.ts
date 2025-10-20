import { useEffect, useCallback } from 'react'
import { authService } from '../services'

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
        
        // Actualizar localStorage
        localStorage.setItem('token', refreshResponse.accessToken)
        localStorage.setItem('user', JSON.stringify(refreshResponse.user))
        
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
