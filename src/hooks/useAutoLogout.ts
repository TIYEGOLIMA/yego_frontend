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
      return
    }

    // 🚫 NO configurar ningún evento de auto-logout
    // El usuario debe hacer logout manualmente

    // Cleanup function (vacía por ahora)
    return () => {
      // Cleanup
    }
  }, [user, token, logout])

  return null
}
