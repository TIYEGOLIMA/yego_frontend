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
import ReportsModule from './features/core/reports/reports.module'
import SessionsModule from './features/core/sessions/sessions.module'
import ConfigurationModule from './features/core/configuration/configuration.module'

// Importar módulos de features - TICKETERA
import TicketsModule from './features/ticketera/tickets/tickets.module'

// Importar microfrontends para roles específicos
import { TVDisplay, RatingTablet, TabletInterface } from '../microfrontends'

// Debug: Verificar que los componentes se importen correctamente
console.log('🔍 [App] Componentes importados:', {
  TVDisplay: !!TVDisplay,
  RatingTablet: !!RatingTablet,
  TabletInterface: !!TabletInterface
})

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
 * Componente para redirección basada en el rol del usuario
 */
const RoleBasedRedirect = () => {
  const { user, token } = useAuthStore()
  
  // Mostrar loading mientras se carga el usuario
  if (!token || !user) {
    console.log('⏳ [RoleBasedRedirect] Esperando datos del usuario...')
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
    console.warn('⚠️ [RoleBasedRedirect] Usuario sin rol, redirigiendo al dashboard')
    return <Navigate to="/dashboard" replace />
  }
  
  const redirectPath = getRedirectPathForRole(user.role)
  console.log(`🎯 [RoleBasedRedirect] Redirigiendo usuario ${user.name} (${user.role}) a: ${redirectPath}`)
  
  return <Navigate to={redirectPath} replace />
}

function App() {
  const { token, user } = useAuthStore();
  
  // Aplicar tema inmediatamente
  useTheme();
  
  // Manejar pantalla completa basada en el rol
  useFullscreen();
  
  // Log detallado del estado del store
  console.log('🔍 [App] Estado completo del store:', {
    token: !!token,
    user: user ? { id: user.id, name: user.name, role: user.role, moduleId: user.moduleId } : null,
    pathname: window.location.pathname
  });
  
  // Verificar localStorage
  console.log('🔍 [App] Estado del localStorage:', {
    token: localStorage.getItem('token') ? 'presente' : 'ausente',
    user: localStorage.getItem('user') ? 'presente' : 'ausente'
  });

  // Verificar token corrupto al inicializar la aplicación
  useEffect(() => {
    authService.cleanupCorruptedToken();
    
    // Exponer métodos útiles para debugging en la consola
    if (typeof window !== 'undefined') {
      (window as any).authService = authService;
      (window as any).debugAuth = {
        diagnose: () => authService.diagnoseToken(),
        cleanup: () => authService.forceCleanup(),
        isValid: () => authService.isTokenValid(),
        logout: () => authService.logout()
      };
      console.log('🔧 [App] Métodos de debug disponibles en window.debugAuth');
    }
  }, []);
  
  // Suscribirse a eventos de autenticación
  useAuthEvents();

  // ✅ SocketService (Socket.IO) para backend NestJS (puerto 3000)
  // Este maneja eventos generales de la aplicación
  useEffect(() => {
    const socket = SocketService;
    
    // Siempre intentar conectar el socket si hay usuario y token
    if (
      token &&
      typeof token === 'string' &&
      token.trim() !== '' &&
      user &&
      user.id &&
      user.username
    ) {
      const sessionId = user.id + '-' + user.username;
      
      // Conectar o reconectar el socket
      if (socket.getConnectionStatus() === 'connected') {
        console.log('🔄 [App] Token o usuario cambió, reconectando socket...');
        socket.disconnect();
        socket.connect(sessionId);
      } else {
        console.log('🚀 [App] Iniciando conexión socket...');
        socket.connect(sessionId);
      }
    } else {
      console.log('🔌 [App] Sin token/usuario válido, desconectando socket...');
      socket.disconnect();
    }
  }, [token, user]);

  // Los microfrontends se cargan dinámicamente cuando se necesitan

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/tickets" element={
            <ProtectedRoute>
              <MainLayout>
                <TicketsModule />
              </MainLayout>
            </ProtectedRoute>
          } />
          {/* Rutas específicas para roles con pantalla completa */}
          <Route path="/tv-display" element={
            <ProtectedRoute>
              {(() => { console.log('🎬 [App] Renderizando TVDisplay'); return null })()}
              <TVDisplay />
            </ProtectedRoute>
          } />
          <Route path="/rating-tablet" element={
            <ProtectedRoute>
              {(() => { console.log('🎬 [App] Renderizando RatingTablet'); return null })()}
              <RatingTablet />
            </ProtectedRoute>
          } />
          <Route path="/tablet-interface" element={
            <ProtectedRoute>
              {(() => { console.log('🎬 [App] Renderizando TabletInterface'); return null })()}
              <TabletInterface />
            </ProtectedRoute>
          } />
          <Route path="/" element={
            <ProtectedRoute>
              <RoleBasedRedirect />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            {/* Features: users, roles, permissions, modules, imports, audit, reports, sessions, configuration */}
            <Route path="users" element={<UsersModule />} />
            <Route path="roles" element={<RolesModule />} />
            <Route path="permissions" element={<PermissionsModule />} />
            <Route path="modules" element={<ModulesModule />} />
            <Route path="imports" element={<ImportsModule />} />
            <Route path="audit" element={<AuditModule />} />
            <Route path="reports" element={<ReportsModule />} />
            <Route path="sessions" element={<SessionsModule />} />
            <Route path="configuration" element={<ConfigurationModule />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  )
}

export default App