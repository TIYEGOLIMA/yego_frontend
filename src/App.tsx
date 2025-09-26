/**
 * Componente principal de la aplicación Yego Integral
 * Configura rutas, proveedores de estado y autenticación
 */
import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from './store/auth-store'
import { useTheme } from './hooks/useTheme'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import { MainLayout } from './shared/components/MainLayout'
import { MaintenanceOverlay } from './components/MaintenanceOverlay'
import SocketService from './services/socket-service'
import { useAuthEvents } from './shared/hooks/useAuth'
import { microfrontendService } from './services'

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
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

function App() {
  const { token, user } = useAuthStore();
  
  // Aplicar tema inmediatamente
  useTheme();
  
  // Suscribirse a eventos de autenticación
  useAuthEvents();

  // ✅ SocketService (Socket.IO) para backend NestJS (puerto 3000)
  // Este maneja eventos generales de la aplicación
  useEffect(() => {
    const socket = SocketService.getInstance();
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
      socket.connect(sessionId);
    } else {
      socket.disconnect();
    }
  }, [token, user]);

  // Inicializar microfrontends
  useEffect(() => {
    const initializeMicrofrontends = async () => {
      try {
        // Cargar el microfrontend de agentpanel
        await microfrontendService.loadMicrofrontend('agentpanel');
        console.log('Microfrontends inicializados correctamente');
      } catch (error) {
        console.error('Error inicializando microfrontends:', error);
      }
    };

    initializeMicrofrontends();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <MaintenanceOverlay>
                <MainLayout />
              </MaintenanceOverlay>
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
            <Route path="tickets" element={<TicketsModule />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  )
}

export default App