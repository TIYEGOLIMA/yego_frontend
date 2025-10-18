import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import systemNotificationsService from '../services/system-notifications-service';
import { ForcedLogoutEvent, AccountBlockedEvent } from '../types/system-notifications';

export interface SystemNotificationsState {
  forcedLogoutModal: {
    isOpen: boolean;
    event: ForcedLogoutEvent | null;
  };
  accountBlockedModal: {
    isVisible: boolean;
    event: AccountBlockedEvent | null;
  };
}

export const useSystemNotifications = () => {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  
  const [forcedLogoutModal, setForcedLogoutModal] = useState({
    isOpen: false,
    event: null as ForcedLogoutEvent | null
  });
  
  const [accountBlockedModal, setAccountBlockedModal] = useState({
    isVisible: false,
    event: null as AccountBlockedEvent | null
  });

  useEffect(() => {
    console.log('🔧 [SystemNotifications] Configurando callbacks del hook...');
    
    // Configurar callbacks para eventos del sistema
    systemNotificationsService.setOnForcedLogout((event: ForcedLogoutEvent) => {
      console.log('🚪 [SystemNotifications] Forced logout event received:', event);
      
      // Verificar si el usuario actual está realmente autenticado
      const currentUser = useAuthStore.getState().user;
      if (!currentUser || !currentUser.id) {
        console.log('🚪 [SystemNotifications] Usuario no autenticado, ignorando evento FORCED_LOGOUT');
        return;
      }
      
      // Verificar si el evento es para el usuario actual
      if (event.userId && event.userId !== currentUser.id) {
        console.log(`🚪 [SystemNotifications] FORCED_LOGOUT ignorado - destinado para userId ${event.userId}, usuario actual ${currentUser.id}`);
        return;
      }
      
      // Verificar si el evento tiene username y no coincide con el usuario actual
      if (event.username && event.username !== currentUser.username) {
        console.log(`🚪 [SystemNotifications] FORCED_LOGOUT ignorado - destinado para username ${event.username}, usuario actual ${currentUser.username}`);
        return;
      }
      
      console.log('🚪 [SystemNotifications] Mostrando modal FORCED_LOGOUT para usuario actual');
      setForcedLogoutModal({
        isOpen: true,
        event
      });
    });

    systemNotificationsService.setOnAccountBlocked((event: AccountBlockedEvent) => {
      console.log('🚫 [SystemNotifications] Account blocked event received:', event);
      
      // Verificar si el usuario actual está realmente autenticado
      const currentUser = useAuthStore.getState().user;
      if (!currentUser || !currentUser.id) {
        console.log('🚫 [SystemNotifications] Usuario no autenticado, ignorando evento ACCOUNT_BLOCKED');
        return;
      }
      
      // Verificar si el evento es para el usuario actual
      if (event.userId && event.userId !== currentUser.id) {
        console.log(`🚫 [SystemNotifications] ACCOUNT_BLOCKED ignorado - destinado para userId ${event.userId}, usuario actual ${currentUser.id}`);
        return;
      }
      
      // Verificar si el evento tiene username y no coincide con el usuario actual
      if (event.username && event.username !== currentUser.username) {
        console.log(`🚫 [SystemNotifications] ACCOUNT_BLOCKED ignorado - destinado para username ${event.username}, usuario actual ${currentUser.username}`);
        return;
      }
      
      console.log('🚫 [SystemNotifications] Mostrando modal ACCOUNT_BLOCKED para usuario actual');
      setAccountBlockedModal({
        isVisible: true,
        event
      });
    });

    // Verificar si el servicio está conectado, si no, reconectar
    setTimeout(() => {
      if (!systemNotificationsService.getConnectionStatus()) {
        console.log('🔄 [SystemNotifications] Servicio no conectado, forzando reconexión...');
        systemNotificationsService.forceReconnect();
      }
    }, 2000);

    // Cleanup al desmontar
    return () => {
      console.log('🧹 [SystemNotifications] Limpiando callbacks...');
      systemNotificationsService.setOnForcedLogout(null);
      systemNotificationsService.setOnAccountBlocked(null);
    };
  }, []);

  const handleForcedLogout = () => {
    console.log('🚪 [SystemNotifications] Handling forced logout');
    logout();
    setForcedLogoutModal({
      isOpen: false,
      event: null
    });
    navigate('/login');
  };

  const handleAccountBlocked = () => {
    console.log('🚫 [SystemNotifications] Handling account blocked');
    setAccountBlockedModal({
      isVisible: false,
      event: null
    });
    logout();
    navigate('/login');
  };

  return {
    forcedLogoutModal,
    accountBlockedModal,
    handleForcedLogout,
    handleAccountBlocked
  };
};

export default useSystemNotifications;