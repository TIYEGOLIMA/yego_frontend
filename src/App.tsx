/**
 * Componente principal de la aplicación Yego Integral
 * Configura rutas, proveedores de estado y autenticación
 */
import React, { useEffect } from 'react'
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
// import { MaintenanceOverlay } from './components/MaintenanceOverlay'
import SocketService from './services/socket-service'
import { useAuthEvents } from './shared/hooks/useAuth'
import { authService } from './services'
// import ModuleSelection from './components/ModuleSelection' // Ahora se maneja en el microfrontend

// Importar módulos de features - CORE (Sistema Principal)
import UsersModule from './features/core/users/users.module'
import RolesModule from './features/core/roles/roles.module'
import PermissionsModule from './features/core/permissions/permissions.module'
import ModulesModule from './features/core/modules/modules.module'
import ImportsModule from './features/core/imports/imports.module'
import AuditModule from './features/core/audit/audit.module'
import SessionsModule from './features/core/sessions/sessions.module'
import ConfigurationModule from './features/core/configuration/configuration.module'
import { AsistenciaModule } from './features/core/asistencia'

// Importar módulos de features - TICKETERA
import TicketsModule from './features/ticketera/tickets/tickets.module'

// Importar microfrontends para roles específicos
import { TVDisplay, RatingTablet, TabletInterface, Reports, GarantizadoModule } from '../microfrontends'

// Importar componentes de notificaciones del sistema
import { ForcedLogoutModal } from './components/ForcedLogoutModal'
import { AccountBlockedModal } from './components/AccountBlockedModal'


// Crear cliente de React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

/**
 * Componente para proteger rutas que requieren autenticación
 * Redirecciona a login si el usuario no está autenticado
 */
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token } = useAuthStore()
  
  // Permitir acceso si hay token
  const isAuthenticated = !!token
  
  console.log('🔍 [ProtectedRoute] Verificando autenticación:', {
    token: !!token,
    isAuthenticated,
    pathname: window.location.pathname
  })
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

/**
 * Componente para restringir acceso según rol
 * Roles de visualización (TV, TABLET1, TABLET2) solo pueden acceder a sus rutas específicas
 */
const RoleRestrictedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { user } = useAuthStore()
  
  if (!user) {
    return <Navigate to="/login" />
  }
  
  // Si no se especifican roles permitidos, permitir acceso
  if (!allowedRoles || allowedRoles.length === 0) {
    return <>{children}</>
  }
  
  // Verificar si el rol del usuario está en los roles permitidos
  const isAllowed = allowedRoles.includes(user.role.toUpperCase())
  
  if (!isAllowed) {
    // Redirigir al usuario a su ruta correspondiente según su rol
    const redirectPath = getRedirectPathForRole(user.role)
    return <Navigate to={redirectPath} replace />
  }
  
  return <>{children}</>
}

/**
 * Componente para proteger rutas según permisos del módulo
 */
const PermissionRoute = ({ children, module }: { children: React.ReactNode, module: string }) => {
  const { user } = useAuthStore()
  
  if (!user) {
    return <Navigate to="/login" />
  }
  
  // Módulos permitidos por rol
  const allowedModules: Record<string, string[]> = {
    'SUPERADMIN': ['users', 'roles', 'permissions', 'modules', 'imports', 'audit', 'sessions', 'configuration', 'reports', 'garantizado', 'asistencia'],
    'ADMIN': ['users', 'roles', 'modules', 'dashboard', 'reports', 'garantizado', 'asistencia'],
    'OPERADOR': ['reports', 'users', 'asistencia'],
    'SAC': ['tickets', 'asistencia']
  }
  
  const userAllowedModules = allowedModules[user.role.toUpperCase()] || []
  
  if (!userAllowedModules.includes(module)) {
    const redirectPath = getRedirectPathForRole(user.role)
    return <Navigate to={redirectPath} replace />
  }
  
  return <>{children}</>
}

/**
 * Componente para redirección basada en el rol del usuario
 */
const RoleBasedRedirect = () => {
  const { user, token } = useAuthStore()
  
  if (!token || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg text-gray-600 dark:text-gray-400">Cargando...</p>
        </div>
      </div>
    )
  }
  
  if (!user?.role) {
    return <Navigate to="/dashboard" replace />
  }
  
  // Para SUPERADMIN y ADMIN, renderizar Dashboard directamente
  if (user.role === 'SUPERADMIN' || user.role === 'ADMIN') {
    return <Dashboard />
  }
  
  const redirectPath = getRedirectPathForRole(user.role)
  return <Navigate to={redirectPath} replace />
}

/**
 * Componente interno que maneja las notificaciones del sistema
 * Debe estar dentro del Router para usar useNavigate
 */
const SystemNotificationsHandler = () => {
  const {
    forcedLogoutModal,
    accountBlockedModal,
    handleForcedLogout,
    handleAccountBlocked
  } = useSystemNotifications()

  console.log('🔍 [SystemNotificationsHandler] Renderizando - forcedLogoutModal:', forcedLogoutModal);
  console.log('🔍 [SystemNotificationsHandler] Renderizando - accountBlockedModal:', accountBlockedModal);

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
    </>
  )
}

function App() {
  const { token, user } = useAuthStore();
  
  // Aplicar tema inmediatamente
  useTheme();
  
  // Configurar logout automático cuando se cierre el navegador
  useAutoLogout();
  
  // Manejar pantalla completa basada en el rol
  useFullscreen();
  

  useEffect(() => {
    authService.cleanupCorruptedToken();
  }, []);
  
  // Suscribirse a eventos de autenticación
  useAuthEvents();

  useEffect(() => {
    if (token && user) {
      const sessionId = user.id + '-' + user.username;
      SocketService.connect(sessionId);
    } else {
      SocketService.disconnect();
    }
  }, [token, user]);

  // Los microfrontends se cargan dinámicamente cuando se necesitan

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        {/* Notificaciones del sistema para TODOS los roles */}
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
          <Route path="/reports" element={
            <ProtectedRoute>
              <RoleRestrictedRoute allowedRoles={['SUPERADMIN', 'ADMIN', 'OPERADOR']}>
                <MainLayout>
                  <TicketsModule />
                </MainLayout>
              </RoleRestrictedRoute>
            </ProtectedRoute>
          } />
          {/* Rutas específicas para roles con pantalla completa */}
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
              <RoleRestrictedRoute allowedRoles={['SUPERADMIN', 'ADMIN', 'OPERADOR', 'SAC', 'PRINCIPAL']}>
                <MainLayout />
              </RoleRestrictedRoute>
            </ProtectedRoute>
          }>
            <Route index element={<RoleBasedRedirect />} />
            <Route path="dashboard" element={<Dashboard />} />
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
            <Route path="imports" element={
              <PermissionRoute module="imports">
                <ImportsModule />
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
            <Route path="configuration" element={
              <PermissionRoute module="configuration">
                <ConfigurationModule />
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
          </Route>
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  )
}

export default App