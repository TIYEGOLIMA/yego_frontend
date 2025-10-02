import { useEffect } from 'react'
import { useAuthStore } from '../store/auth-store'

/**
 * Hook para manejar logout automático cuando se cierra el navegador
 * o se pierde la conexión
 */
export const useAutoLogout = () => {
  const { logout, user, token } = useAuthStore()

  useEffect(() => {
    // Solo ejecutar si hay usuario autenticado
    if (!user || !token) return

    console.log('🔄 [useAutoLogout] Configurando logout automático...')

    // 🎯 Función para ejecutar logout
    const performLogout = async () => {
      try {
        console.log('🚪 [useAutoLogout] Ejecutando logout automático...')
        await logout()
        console.log('✅ [useAutoLogout] Logout automático completado')
      } catch (error) {
        console.error('❌ [useAutoLogout] Error en logout automático:', error)
        // Forzar limpieza local en caso de error
        localStorage.clear()
        window.location.href = '/login'
      }
    }

    // 🎯 Evento cuando se pierde la conexión (offline)
    const handleOffline = () => {
      console.log('📡 [useAutoLogout] Conexión perdida, ejecutando logout...')
      performLogout()
    }

    // Agregar event listener solo para offline (no beforeunload para evitar problemas con refresh)
    window.addEventListener('offline', handleOffline)

    // Cleanup function
    return () => {
      console.log('🧹 [useAutoLogout] Limpiando event listeners...')
      window.removeEventListener('offline', handleOffline)
    }
  }, [user, token, logout])

  return null
}
