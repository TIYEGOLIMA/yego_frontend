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

    // Estos usuarios deben mantenerse logueados hasta que presionen logout manualmente
    if (user.role === 'TABLET1' || user.role === 'TABLET2' || user.role === 'SAC' || user.role === 'TV' || user.role === 'PRINCIPAL') {
      console.log('📱 [useAutoLogout] Rol', user.role, '- Auto-logout deshabilitado')
      return
    }

    console.log('🔄 [useAutoLogout] Configurando logout automático para rol:', user.role)

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

    // 🚫 NO configurar ningún evento de auto-logout
    // El usuario debe hacer logout manualmente
    console.log('✅ [useAutoLogout] Auto-logout configurado pero sin eventos activos')

    // Cleanup function (vacía por ahora)
    return () => {
      console.log('🧹 [useAutoLogout] Limpiando...')
    }
  }, [user, token, logout])

  return null
}
