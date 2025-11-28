import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth-store';
import systemNotificationsService from '../services/system-notifications-service';
import { ForcedLogoutEvent, AccountBlockedEvent, RoleDeactivatedEvent } from '../types/system-notifications';

export interface SystemNotificationsState {
  forcedLogoutModal: {
    isOpen: boolean;
    event: ForcedLogoutEvent | null;
  };
  accountBlockedModal: {
    isVisible: boolean;
    event: AccountBlockedEvent | null;
  };
  roleDeactivatedModal: {
    isVisible: boolean;
    event: RoleDeactivatedEvent | null;
  };
}

export const useSystemNotifications = () => {
  const navigate = useNavigate();
  const { logout, token, user } = useAuthStore();
  
  const [forcedLogoutModal, setForcedLogoutModal] = useState({
    isOpen: false,
    event: null as ForcedLogoutEvent | null
  });
  
  const [accountBlockedModal, setAccountBlockedModal] = useState({
    isVisible: false,
    event: null as AccountBlockedEvent | null
  });
  
  const [roleDeactivatedModal, setRoleDeactivatedModal] = useState({
    isVisible: false,
    event: null as RoleDeactivatedEvent | null
  });

  // Configurar callbacks - esto debe ejecutarse siempre
  useEffect(() => {
    systemNotificationsService.setOnForcedLogout((event: ForcedLogoutEvent) => {
      const currentUser = useAuthStore.getState().user;
      if (!currentUser?.id) return;
      if (event.userId && event.userId !== currentUser.id) return;
      if (event.username && event.username !== currentUser.username) return;
      
      setForcedLogoutModal({ isOpen: true, event });
    });

    systemNotificationsService.setOnAccountBlocked((event: AccountBlockedEvent) => {
      const currentUser = useAuthStore.getState().user;
      if (!currentUser?.id) return;
      if (event.userId && event.userId !== currentUser.id) return;
      if (event.username && event.username !== currentUser.username) return;
      
      setAccountBlockedModal({ isVisible: true, event });
    });

    systemNotificationsService.setOnRoleDeactivated((event: RoleDeactivatedEvent) => {
      setRoleDeactivatedModal({ isVisible: true, event });
    });

    return () => {
      systemNotificationsService.setOnForcedLogout(null);
      systemNotificationsService.setOnAccountBlocked(null);
      systemNotificationsService.setOnRoleDeactivated(null);
    };
  }, []);

  // Reconectar cuando cambia el token/usuario (nuevo login)
  useEffect(() => {
    if (token && user) {
      // Esperar un momento para asegurar que el token esté guardado
      const timer = setTimeout(() => {
        if (!systemNotificationsService.getConnectionStatus()) {
          systemNotificationsService.forceReconnect();
        }
      }, 500);
      
      return () => clearTimeout(timer);
    } else {
      // Si no hay token, desconectar
      systemNotificationsService.disconnect();
    }
  }, [token, user]);

  const handleForcedLogout = () => {
    logout();
    setForcedLogoutModal({ isOpen: false, event: null });
    navigate('/login');
  };

  const handleAccountBlocked = () => {
    setAccountBlockedModal({ isVisible: false, event: null });
    logout();
    navigate('/login');
  };

  const handleRoleDeactivated = useCallback(async () => {
    setRoleDeactivatedModal({ isVisible: false, event: null });
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      navigate('/login');
    }
  }, [logout, navigate]);

  return {
    forcedLogoutModal,
    accountBlockedModal,
    roleDeactivatedModal,
    handleForcedLogout,
    handleAccountBlocked,
    handleRoleDeactivated
  };
};

export default useSystemNotifications;