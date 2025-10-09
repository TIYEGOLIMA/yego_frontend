import { useState, useEffect } from 'react'
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

  const [accountBlockedToast, setAccountBlockedToast] = useState<{
    isVisible: boolean
    event: AccountBlockedEvent | null
  }>({
    isVisible: false,
    event: null
  })

  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) return

    // Configurar listeners para eventos del sistema
    SystemNotificationsService.setOnForcedLogout((event: ForcedLogoutEvent) => {
      console.log('🚨 [SystemNotifications] FORCED_LOGOUT recibido:', event)
      
      // Verificar si el evento es para el usuario actual
      if (event.userId === user.id) {
        setForcedLogoutModal({
          isOpen: true,
          event
        })
      }
    })

    SystemNotificationsService.setOnAccountBlocked((event: AccountBlockedEvent) => {
      console.log('🚨 [SystemNotifications] ACCOUNT_BLOCKED recibido:', event)
      
      // Verificar si el evento es para el usuario actual
      if (event.userId === user.id) {
        setAccountBlockedToast({
          isVisible: true,
          event
        })
      }
    })

    return () => {
      // Cleanup al desmontar
      SystemNotificationsService.setOnForcedLogout(() => {})
      SystemNotificationsService.setOnAccountBlocked(() => {})
    }
  }, [user])

  const handleForcedLogout = async () => {
    console.log('🔄 [SystemNotifications] Procesando FORCED_LOGOUT...')
    
    try {
      // Cerrar modal
      setForcedLogoutModal({ isOpen: false, event: null })
      
      // Ejecutar logout
      await logout()
      
      // Redirigir a login
      navigate('/login')
      
      console.log('✅ [SystemNotifications] FORCED_LOGOUT procesado exitosamente')
    } catch (error) {
      console.error('❌ [SystemNotifications] Error en FORCED_LOGOUT:', error)
      // Forzar redirección incluso si hay error
      navigate('/login')
    }
  }

  const handleAccountBlocked = async () => {
    console.log('🔄 [SystemNotifications] Procesando ACCOUNT_BLOCKED...')
    
    try {
      // Cerrar toast
      setAccountBlockedToast({ isVisible: false, event: null })
      
      // Ejecutar logout
      await logout()
      
      // Redirigir a login
      navigate('/login')
      
      console.log('✅ [SystemNotifications] ACCOUNT_BLOCKED procesado exitosamente')
    } catch (error) {
      console.error('❌ [SystemNotifications] Error en ACCOUNT_BLOCKED:', error)
      // Forzar redirección incluso si hay error
      navigate('/login')
    }
  }

  const closeForcedLogoutModal = () => {
    setForcedLogoutModal({ isOpen: false, event: null })
  }

  const closeAccountBlockedToast = () => {
    setAccountBlockedToast({ isVisible: false, event: null })
  }

  return {
    forcedLogoutModal,
    accountBlockedToast,
    handleForcedLogout,
    handleAccountBlocked,
    closeForcedLogoutModal,
    closeAccountBlockedToast
  }
}
