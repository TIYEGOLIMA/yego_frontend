import { useEffect } from 'react'
import { useAuthStore } from '../store/auth-store'
import { shouldUseFullscreen } from '../utils/role-based-routing'

/**
 * Hook para manejar pantalla completa basada en el rol del usuario
 */
export const useFullscreen = () => {
  const { user } = useAuthStore()

  useEffect(() => {
    if (!user?.role) return

    const needsFullscreen = shouldUseFullscreen(user.role)
    
    if (needsFullscreen) {
      console.log(`🖥️ [useFullscreen] Activando pantalla completa para rol: ${user.role}`)
      
      // Intentar entrar en pantalla completa
      const enterFullscreen = async () => {
        try {
          if (document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen()
          } else if ((document.documentElement as any).webkitRequestFullscreen) {
            await (document.documentElement as any).webkitRequestFullscreen()
          } else if ((document.documentElement as any).mozRequestFullScreen) {
            await (document.documentElement as any).mozRequestFullScreen()
          } else if ((document.documentElement as any).msRequestFullscreen) {
            await (document.documentElement as any).msRequestFullscreen()
          }
          
          console.log('✅ [useFullscreen] Pantalla completa activada')
        } catch (error) {
          console.warn('⚠️ [useFullscreen] No se pudo activar pantalla completa:', error)
        }
      }

      // Pequeño delay para asegurar que el DOM esté listo
      const timer = setTimeout(enterFullscreen, 500)
      
      return () => clearTimeout(timer)
    } else {
      console.log(`🖥️ [useFullscreen] Rol ${user.role} no requiere pantalla completa`)
    }
  }, [user?.role])

  return {
    isFullscreen: shouldUseFullscreen(user?.role || ''),
    role: user?.role
  }
}
