import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth-store'
import SystemNotificationsService from '../services/system-notifications-service'
import { ForcedLogoutEvent, AccountBlockedEvent } from '../types/system-notifications'

export const useSystemNotifications = () => {
  const [forcedLogoutModal, setForcedLogoutModal] = useState<{
    isOpen: boolean
    event: ForcedLogoutEvent | null
  }>({
    isOpen: false,
    event: null
  })

  const [accountBlockedModal, setAccountBlockedModal] = useState<{
    isVisible: boolean
    event: AccountBlockedEvent | null
  }>({
    isVisible: false,
    event: null
  })

  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  // Usar useCallback para mantener referencias estables
  const handleForcedLogoutEvent = useCallback((event: ForcedLogoutEvent) => {
    const currentUser = useAuthStore.getState().user
    if (currentUser && event.userId === currentUser.id) {
      setForcedLogoutModal({
        isOpen: true,
        event
      })
    }
  }, [])

  const handleAccountBlockedEvent = useCallback((event: AccountBlockedEvent) => {
    const currentUser = useAuthStore.getState().user
    if (currentUser && event.userId === currentUser.id) {
      setAccountBlockedModal({
        isVisible: true,
        event
      })
    }
  }, [])

  useEffect(() => {
    if (!user) {
      console.log('⚠️ No hay usuario - callbacks NO registrados')
      return
    }

    console.log('✅ Registrando callbacks para usuario ID:', user.id, 'Nombre:', user.name)
    
    // Reconectar el servicio con el nuevo token
    const token = localStorage.getItem('token')
    if (token && !SystemNotificationsService.getConnectionStatus()) {
      console.log('🔄 Reconectando SystemNotificationsService con token...')
      SystemNotificationsService.reconnect()
    }
    
    // Registrar callbacks
    SystemNotificationsService.setOnForcedLogout(handleForcedLogoutEvent)
    SystemNotificationsService.setOnAccountBlocked(handleAccountBlockedEvent)

    // Cleanup al desmontar o cuando cambie el usuario
    return () => {
      console.log('🧹 Limpiando callbacks para usuario ID:', user.id)
      SystemNotificationsService.setOnForcedLogout(null)
      SystemNotificationsService.setOnAccountBlocked(null)
    }
  }, [user?.id, handleForcedLogoutEvent, handleAccountBlockedEvent])

  const handleForcedLogout = async () => {
    try {
      setForcedLogoutModal({ isOpen: false, event: null })
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Error en logout forzado:', error)
      navigate('/login')
    }
  }

  const handleAccountBlocked = async () => {
    try {
      setAccountBlockedModal({ isVisible: false, event: null })
      await logout()
      localStorage.clear()
      window.location.href = '/login'
    } catch (error) {
      console.error('Error en bloqueo de cuenta:', error)
      localStorage.clear()
      window.location.href = '/login'
    }
  }

  return {
    forcedLogoutModal,
    accountBlockedModal,
    handleForcedLogout,
    handleAccountBlocked
  }
}
