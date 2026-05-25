import React, { useEffect, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from './store/auth-store'
import { useTheme } from './hooks/useTheme'
import { useSystemNotifications } from './hooks/useSystemNotifications'
import { getRedirectPathForRole } from './utils/role-based-routing'
import Login from './pages/Login'
import { MainLayout } from './shared/components/MainLayout'
import SocketService from './services/socket-service'
import { useAuthEvents } from './shared/hooks/useAuth'
import { authService } from './services'
import {
  getDispositivoSession,
  getRutaPorTipo,
  TipoDispositivo,
} from './services/core/device-auth-service'

import { WelcomeModule } from './features/core/welcome'

import TicketsModule from './features/core/ticketera/tickets/tickets.module'

import { TVDisplay, RatingTablet, TabletInterface } from '../microfrontends'
import { ModuleBySlugRoute } from './routing/ModuleBySlugPage'

import { ForcedLogoutModal } from './components/ForcedLogoutModal'
import { AccountBlockedModal } from './components/AccountBlockedModal'
import { RoleDeactivatedModal } from './components/RoleDeactivatedModal'
import UpdateBanner from './components/UpdateBanner'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token } = useAuthStore()
  return token ? <>{children}</> : <Navigate to="/login" />
}

const DeviceProtectedRoute = ({
  children,
  expectedType,
}: {
  children: React.ReactNode
  expectedType: TipoDispositivo
}) => {
  const session = getDispositivoSession()
  if (!session) return <Navigate to="/login" replace />
  if (session.tipo !== expectedType) {
    return <Navigate to={getRutaPorTipo(session.tipo)} replace />
  }
  return <>{children}</>
}

const RoleRestrictedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { user } = useAuthStore()
  
  if (!user) return <Navigate to="/login" />
  if (!allowedRoles || allowedRoles.length === 0) return <>{children}</>
  
  const isAllowed = allowedRoles.includes(user.role.toUpperCase())
  if (!isAllowed) {
    const { modules } = useAuthStore.getState();
    return <Navigate to={getRedirectPathForRole(user.role, modules)} replace />
  }
  
  return <>{children}</>
}

const SystemNotificationsHandler = () => {
  const {
    forcedLogoutModal,
    accountBlockedModal,
    roleDeactivatedModal,
    handleForcedLogout,
    handleAccountBlocked,
    handleRoleDeactivated
  } = useSystemNotifications()

  return (
    <>
      {forcedLogoutModal.event && (
        <ForcedLogoutModal
          isOpen={forcedLogoutModal.isOpen}
          onLogout={handleForcedLogout}
          message={forcedLogoutModal.event.message}
          username={forcedLogoutModal.event.username}
        />
      )}
      {accountBlockedModal.event && (
        <AccountBlockedModal
          isOpen={accountBlockedModal.isVisible}
          message={accountBlockedModal.event.message}
          username={accountBlockedModal.event.username}
          onAutoLogout={handleAccountBlocked}
        />
      )}
      {roleDeactivatedModal.event && (
        <RoleDeactivatedModal
          isOpen={roleDeactivatedModal.isVisible}
          message={roleDeactivatedModal.event.message}
          autoLogoutDelay={roleDeactivatedModal.event.autoLogoutDelay}
          roleName={roleDeactivatedModal.event.roleName}
          onAutoLogout={handleRoleDeactivated}
        />
      )}
    </>
  )
}

function App() {
  const { token, user } = useAuthStore();
  
  useTheme();
  useAuthEvents();

  useEffect(() => {
    authService.cleanupCorruptedToken();
  }, []);

  // ✅ OPTIMIZADO: Conectar WebSocket solo cuando cambia el token o el ID del usuario
  // Usar useRef para evitar reconexiones innecesarias
  const lastUserIdRef = useRef<number | null>(null);
  const lastTokenRef = useRef<string | null>(null);

  useEffect(() => {
    const currentUserId = user?.id || null;
    const currentToken = token || null;
    const requirePasswordChange = user?.requirePasswordChange === true;

    // No conectar WebSocket si debe cambiar contraseña (backend devuelve 403 PASSWORD_EXPIRED en /ws)
    if (requirePasswordChange) {
      if (lastUserIdRef.current !== null || lastTokenRef.current !== null) {
        SocketService.disconnect();
        lastUserIdRef.current = null;
        lastTokenRef.current = null;
      }
      return;
    }

    // Solo conectar si cambió el usuario o el token
    if (currentToken && currentUserId && user?.username) {
      if (lastUserIdRef.current !== currentUserId || lastTokenRef.current !== currentToken) {
        const currentStatus = SocketService.getConnectionStatus();
        if (currentStatus !== 'connected') {
          console.log(`🔄 [App] Conectando WebSocket para usuario ${currentUserId}`);
          SocketService.connect(`${currentUserId}-${user.username}`);
        } else {
          console.log('✅ [App] WebSocket ya está conectado, no se reconecta');
        }
        lastUserIdRef.current = currentUserId;
        lastTokenRef.current = currentToken;
      }
    } else {
      if (lastUserIdRef.current !== null || lastTokenRef.current !== null) {
        console.log('🔌 [App] Desconectando WebSocket (sin token/usuario)');
        SocketService.disconnect();
        lastUserIdRef.current = null;
        lastTokenRef.current = null;
      }
    }
  }, [token, user?.id, user?.username, user?.requirePasswordChange]);

  // Conectar WebSocket cuando solo hay sesión de dispositivo (sin usuario humano)
  useEffect(() => {
    if (token && user?.id) return;

    const session = getDispositivoSession();
    if (!session?.accessToken) return;

    const status = SocketService.getConnectionStatus();
    if (status === 'connected' || status === 'connecting') return;

    SocketService.connect(`device-${session.tipo}-${session.dispositivoId}`);
  }, [token, user?.id]);

  // Limpiar conexiones WebSocket al cerrar la pestaña o cuando la página pierde visibilidad
  useEffect(() => {
    const handleBeforeUnload = () => {
      SocketService.disconnect();
    };

    const handleVisibilityChange = () => {
      // Si la pestaña se oculta por más de 5 minutos, desconectar para liberar recursos
      if (document.hidden) {
        setTimeout(() => {
          if (document.hidden) {
            SocketService.disconnect();
          }
        }, 5 * 60 * 1000); // 5 minutos
      } else {
        const currentStatus = SocketService.getConnectionStatus();
        if (currentStatus === 'connected') return;

        if (token && user?.id && user?.username && !user?.requirePasswordChange) {
          console.log('🔄 [App] Reconectando WebSocket al volver a ser visible');
          SocketService.connect(`${user.id}-${user.username}`);
          return;
        }

        const session = getDispositivoSession();
        if (session?.accessToken) {
          console.log('🔄 [App] Reconectando WebSocket de dispositivo al volver a ser visible');
          SocketService.connect(`device-${session.tipo}-${session.dispositivoId}`);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [token, user]);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <SystemNotificationsHandler />
        <UpdateBanner />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/tickets" element={
            <ProtectedRoute>
              <RoleRestrictedRoute allowedRoles={['SUPERADMIN', 'OPERADOR', 'SAC']}>
                <MainLayout>
                  <TicketsModule />
                </MainLayout>
              </RoleRestrictedRoute>
            </ProtectedRoute>
          } />
          <Route path="/tv-display" element={
            <DeviceProtectedRoute expectedType="TV">
              <TVDisplay />
            </DeviceProtectedRoute>
          } />
          <Route path="/rating-tablet" element={
            <DeviceProtectedRoute expectedType="TABLET">
              <RatingTablet />
            </DeviceProtectedRoute>
          } />
          <Route path="/tablet-interface" element={
            <DeviceProtectedRoute expectedType="TABLET_PRINCIPAL">
              <TabletInterface />
            </DeviceProtectedRoute>
          } />
          <Route path="/" element={
            <ProtectedRoute>
                <MainLayout />
            </ProtectedRoute>
          }>
            <Route index element={<WelcomeModule />} />
            <Route path=":moduleSlug" element={<ModuleBySlugRoute />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  )
}

export default App