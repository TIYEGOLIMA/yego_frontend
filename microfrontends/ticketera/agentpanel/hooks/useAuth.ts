import { useState, useEffect } from 'react'
import { User } from '../types'

/**
 * Hook de autenticación para microfrontends
 * SOLO lee datos de autenticación del sistema principal
 * NO hace login/logout - eso es responsabilidad del sistema principal
 */
export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUserFromStorage = () => {
      // console.log('🔐 [AgentPanel] Cargando datos de usuario del sistema principal...')
      
      try {
        const userData = localStorage.getItem('user')
        const token = localStorage.getItem('token')
        
        if (!userData || !token) {
          console.log('❌ [AgentPanel] No hay datos de autenticación - usuario no logueado')
          setCurrentUser(null)
          setLoading(false)
          return
        }
        
        const user = JSON.parse(userData)
        
        // Validar que el usuario tenga los campos necesarios
        if (!user.id || !user.username || !user.role) {
          console.log('❌ [AgentPanel] Datos de usuario inválidos:', user)
          setCurrentUser(null)
          setLoading(false)
          return
        }
        
        // console.log('✅ [AgentPanel] Usuario cargado:', {
        //   username: user.username,
        //   role: user.role,
        //   moduleId: user.moduleId
        // })
        
        setCurrentUser(user)
        setLoading(false)
        
      } catch (error) {
        console.error('❌ [AgentPanel] Error cargando datos de usuario:', error)
        setCurrentUser(null)
        setLoading(false)
      }
    }

    // Cargar datos inicialmente
    loadUserFromStorage()

    // Escuchar cambios en localStorage (para cuando el usuario haga login/logout desde otra pestaña)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user' || e.key === 'token') {
        console.log('🔄 [AgentPanel] Cambio detectado en localStorage, recargando usuario...')
        loadUserFromStorage()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  // Función para verificar si el usuario puede acceder al AgentPanel
  const canAccessAgentPanel = (): boolean => {
    if (!currentUser) {
      console.log('❌ [AgentPanel] Sin acceso: No hay usuario')
      return false
    }

    // 🎯 TODOS LOS ROLES PUEDEN ACCEDER AL AGENT PANEL
    console.log(`✅ [AgentPanel] Usuario con rol ${currentUser.role} autorizado para acceder`)

    console.log('✅ [AgentPanel] Acceso permitido para:', currentUser.username)
    return true
  }

  // Función para obtener información de display del usuario
  const getUserDisplayInfo = () => {
    if (!currentUser) return null
    
    return {
      name: currentUser.name || currentUser.username,
      username: currentUser.username,
      role: currentUser.role,
      moduleId: currentUser.moduleId
    }
  }

  return {
    currentUser,
    loading,
    canAccessAgentPanel,
    getUserDisplayInfo,
    // Mantener compatibilidad con código existente
    isAuthenticated: !!currentUser
  }
}

export default useAuth