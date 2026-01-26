import React, { useEffect, useState, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from './store/auth-store'
import { useTheme } from './hooks/useTheme'
import { useFullscreen } from './hooks/useFullscreen'
import { useAutoLogout } from './hooks/useAutoLogout'
import { useSystemNotifications } from './hooks/useSystemNotifications'
import { getRedirectPathForRole } from './utils/role-based-routing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import { MainLayout } from './shared/components/MainLayout'
import SocketService from './services/socket-service'
import { useAuthEvents } from './shared/hooks/useAuth'
import { authService } from './services'

// Importar módulos de features - CORE (Sistema Principal)
import UsersModule from './features/core/users/users.module'
import RolesModule from './features/core/roles/roles.module'
import PermissionsModule from './features/core/permissions/permissions.module'
import ModulesModule from './features/core/modules/modules.module'
import AuditModule from './features/core/audit/audit.module'
import SessionsModule from './features/core/sessions/sessions.module'
import { AsistenciaModule } from './features/core/asistencia'
import { WelcomeModule } from './features/core/welcome'
import YegoPremiunModule from './features/core/yego-premiun/yego-premiun.module'
import { MarketingMensajesModule } from './features/core/marketing-mensajes'
import YegoProOpsModule from './features/core/yego-pro-ops/yego-pro-ops.module'

// Importar módulos de features - TICKETERA
import TicketsModule from './features/ticketera/tickets/tickets.module'

// Importar microfrontends para roles específicos
import { TVDisplay, RatingTablet, TabletInterface, Reports, GarantizadoModule } from '../microfrontends'

// Importar componentes de notificaciones del sistema
import { ForcedLogoutModal } from './components/ForcedLogoutModal'
import { AccountBlockedModal } from './components/AccountBlockedModal'
import { RoleDeactivatedModal } from './components/RoleDeactivatedModal'


// Crear cliente de React Query
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

const PermissionRoute = ({ children, module }: { children: React.ReactNode, module: string }) => {
  const { user, modules } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)
  
  if (!user) return <Navigate to="/login" />
  
  useEffect(() => {
    if (modules && modules.length > 0) {
      setIsChecking(false)
    } else {
      const timer = setTimeout(() => setIsChecking(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [modules])
  
  if (isChecking && (!modules || modules.length === 0)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg text-gray-600 dark:text-gray-400">Verificando permisos...</p>
        </div>
      </div>
    )
  }
  
    const moduleName = module.toLowerCase().trim();
    
  // Si no hay módulos, permitir acceso (para desarrollo/testing)
  if (!modules || modules.length === 0) {
    return <>{children}</>
  }
  
  const hasPermission = modules.some(m => {
    if (!m.activo) return false;
    
    // Normalizar URL del módulo: quitar barras iniciales/finales y convertir a minúsculas
    const moduleUrl = (m.url || '').toLowerCase().replace(/^\/+|\/+$/g, '');
    const moduleNombre = (m.nombre || '').toLowerCase().trim();
    
    // Comparar de manera más flexible
    const urlMatches = moduleUrl === moduleName || 
           moduleUrl.includes(moduleName) || 
                       moduleName.includes(moduleUrl);
    
    const nameMatches = moduleNombre === moduleName ||
                        moduleNombre.includes(moduleName) ||
                        moduleName.includes(moduleNombre);
    
    return urlMatches || nameMatches;
  });
  
  if (!hasPermission) {
    // Intentar redirigir al primer módulo activo disponible
    const firstActiveModule = modules.find(m => m.activo);
    if (firstActiveModule) {
      const redirectUrl = firstActiveModule.url?.startsWith('/') 
        ? firstActiveModule.url 
        : `/${firstActiveModule.url}`;
      return <Navigate to={redirectUrl} replace />
    }
    return <Navigate to="/" replace />
  }
  
  if (!children) return null;

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
  useAutoLogout();
  useFullscreen();
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
    
    // Solo conectar si cambió el usuario o el token
    if (currentToken && currentUserId && user?.username) {
      if (lastUserIdRef.current !== currentUserId || lastTokenRef.current !== currentToken) {
        // Verificar estado actual antes de conectar
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
      // Si no hay token o usuario, desconectar
      if (lastUserIdRef.current !== null || lastTokenRef.current !== null) {
        console.log('🔌 [App] Desconectando WebSocket (sin token/usuario)');
        SocketService.disconnect();
        lastUserIdRef.current = null;
        lastTokenRef.current = null;
      }
    }
  }, [token, user?.id, user?.username]);

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
        // ✅ OPTIMIZADO: Solo reconectar si no está ya conectado
        if (token && user?.id && user?.username) {
          const currentStatus = SocketService.getConnectionStatus();
          if (currentStatus !== 'connected') {
            console.log('🔄 [App] Reconectando WebSocket al volver a ser visible');
            SocketService.connect(`${user.id}-${user.username}`);
          }
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
            <ProtectedRoute>
              <TVDisplay />
            </ProtectedRoute>
          } />
          <Route path="/rating-tablet" element={
            <ProtectedRoute>
              <RatingTablet />
            </ProtectedRoute>
          } />
          <Route path="/tablet-interface" element={
            <ProtectedRoute>
              <TabletInterface />
            </ProtectedRoute>
          } />
          <Route path="/" element={
            <ProtectedRoute>
                <MainLayout />
            </ProtectedRoute>
          }>
            <Route index element={<WelcomeModule />} />
            <Route path="dashboard" element={
              <PermissionRoute module="dashboard">
                <Dashboard />
              </PermissionRoute>
            } />
            <Route path="users" element={
              <PermissionRoute module="users">
                <UsersModule />
              </PermissionRoute>
            } />
            <Route path="roles" element={
              <PermissionRoute module="roles">
                <RolesModule />
              </PermissionRoute>
            } />
            <Route path="permissions" element={
              <PermissionRoute module="permissions">
                <PermissionsModule />
              </PermissionRoute>
            } />
            <Route path="modules" element={
              <PermissionRoute module="modules">
                <ModulesModule />
              </PermissionRoute>
            } />
            <Route path="audit" element={
              <PermissionRoute module="audit">
                <AuditModule />
              </PermissionRoute>
            } />
            <Route path="sessions" element={
              <PermissionRoute module="sessions">
                <SessionsModule />
              </PermissionRoute>
            } />
            <Route path="tickets" element={
              <PermissionRoute module="tickets">
                <TicketsModule />
              </PermissionRoute>
            } />
            <Route path="reports" element={
              <PermissionRoute module="reports">
                <Reports />
              </PermissionRoute>
            } />
           <Route path="garantizado" element={
             <PermissionRoute module="garantizado">
               <GarantizadoModule />
             </PermissionRoute>
           } />
           <Route path="asistencia" element={
             <PermissionRoute module="asistencia">
               <AsistenciaModule />
             </PermissionRoute>
           } />
           <Route path="yego-premiun" element={
             <PermissionRoute module="yego-premiun">
               <YegoPremiunModule />
             </PermissionRoute>
           } />
           <Route path="yego-pro-ops" element={
             <PermissionRoute module="yego-pro-ops">
               <YegoProOpsModule />
             </PermissionRoute>
           } />
           <Route path="mensajes-marketing" element={
             <PermissionRoute module="mensajes-marketing">
               <MarketingMensajesModule />
             </PermissionRoute>
           } />
          </Route>
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  )
}

export default App