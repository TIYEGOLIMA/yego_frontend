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
    // Configurar callbacks para eventos del sistema
    systemNotificationsService.setOnForcedLogout((event: ForcedLogoutEvent) => {
      console.log('🚪 [SystemNotifications] Forced logout event received:', event);
      setForcedLogoutModal({
        isOpen: true,
        event
      });
    });

    systemNotificationsService.setOnAccountBlocked((event: AccountBlockedEvent) => {
      console.log('🚫 [SystemNotifications] Account blocked event received:', event);
      setAccountBlockedModal({
        isVisible: true,
        event
      });
    });

    // Cleanup al desmontar
    return () => {
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
    logout();
    setAccountBlockedModal({
      isVisible: false,
      event: null
    });
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