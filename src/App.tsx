/**
 * Componente principal de la aplicación Yego Integral
 * Configura rutas, proveedores de estado y autenticación
 */
import React, { useEffect, useState } from 'react'
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

// Función auxiliar para obtener el primer módulo disponible (usada en otros lugares si es necesario)
// const getFirstAvailableModuleUrl = (modules: Module[]): string | null => {
//   if (!modules || modules.length === 0) {
//     return null; // No hay módulos disponibles, devolver null
//   }
//   
//   // Buscar Dashboard primero si existe
//   const dashboard = modules.find(m => {
//     const url = m.url?.toLowerCase().replace(/^\/+|\/+$/g, '') || '';
//     const name = m.nombre?.toLowerCase().trim() || '';
//     return (url === 'dashboard' || name === 'dashboard') && m.activo;
//   });
//   
//   if (dashboard) {
//     const dashboardUrl = dashboard.url?.startsWith('/') ? dashboard.url : `/${dashboard.url}`;
//     return dashboardUrl;
//   }
//   
//   // Si no hay Dashboard, devolver el primer módulo activo
//   const firstActiveModule = modules.find(m => m.activo);
//   if (firstActiveModule) {
//     const moduleUrl = firstActiveModule.url?.startsWith('/') ? firstActiveModule.url : `/${firstActiveModule.url}`;
//     return moduleUrl;
//   }
//   
//   return null; // No hay módulos activos
// };
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
import { WelcomeModule } from './features/core/welcome'

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
 * Ahora usa los módulos dinámicos del backend en lugar de una lista hardcodeada
 */
const PermissionRoute = ({ children, module }: { children: React.ReactNode, module: string }) => {
  const { user, modules } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)
  
  console.log(`🚀 [PermissionRoute] Componente renderizado para módulo '${module}'`);
  console.log(`   Usuario:`, user ? `${user.username} (${user.role})` : 'null');
  console.log(`   Módulos disponibles:`, modules ? `${modules.length} módulos` : 'null');
  console.log(`   Módulos:`, modules?.map(m => ({ nombre: m.nombre, url: m.url, activo: m.activo })));
  
  if (!user) {
    console.warn(`⚠️ [PermissionRoute] No hay usuario, redirigiendo a login`);
    return <Navigate to="/login" />
  }
  
  // Esperar un momento para que los módulos se carguen si aún no están disponibles
  useEffect(() => {
    // Si hay módulos o ya pasó suficiente tiempo, dejar de verificar
    if (modules && modules.length > 0) {
      setIsChecking(false)
    } else {
      // Esperar máximo 2 segundos para que carguen los módulos
      const timer = setTimeout(() => setIsChecking(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [modules])
  
  // Mostrar loading mientras se verifican los módulos
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
  
  // Si hay módulos del backend cargados, usar esos
  // Si no hay módulos, usar lista hardcodeada como fallback
  let hasPermission = false;
  
  if (modules && modules.length > 0) {
    // Normalizar el nombre del módulo solicitado
    const moduleName = module.toLowerCase().trim();
    
    console.log(`🔍 [PermissionRoute] Verificando acceso al módulo '${module}' para usuario ${user.role}`);
    console.log(`📦 [PermissionRoute] Módulos disponibles:`, modules.map(m => ({ nombre: m.nombre, url: m.url, activo: m.activo })));
    
    // Función para extraer la ruta de una URL completa o parcial
    const extractPath = (url: string): string => {
      if (!url) return '';
      
      try {
        let path = '';
        
        // Si es una URL completa (http://...), extraer el pathname
        if (url.includes('://')) {
          const urlObj = new URL(url);
          path = urlObj.pathname;
        } else {
          // Si es una ruta relativa (/reports o reports), usarla directamente
          path = url;
        }
        
        // Normalizar: convertir a minúsculas, remover slashes iniciales/finales y espacios
        path = path.toLowerCase().trim();
        path = path.replace(/^\/+|\/+$/g, '');
        
        return path;
      } catch (error) {
        // Si no es una URL válida, tratarla como ruta relativa
        console.warn(`⚠️ [PermissionRoute] Error parseando URL "${url}":`, error);
        let path = url.toLowerCase().trim();
        path = path.replace(/^\/+|\/+$/g, '');
        return path;
      }
    };
    
    console.log(`🔍 [PermissionRoute] Iniciando verificación para módulo '${module}' (normalizado: '${moduleName}')`);
    console.log(`📦 [PermissionRoute] Total módulos disponibles: ${modules.length}`);
    
    // Verificar si el módulo solicitado está en los módulos del backend
    hasPermission = modules.some((m, index) => {
      if (!m.activo) {
        return false;
      }
      
      // Extraer la ruta de la URL del módulo
      const moduleUrlPath = extractPath(m.url || '');
      const moduleNombre = m.nombre?.toLowerCase().trim() || '';
      const moduleUrlLower = (m.url || '').toLowerCase().trim();
      
      // Comparaciones principales (más simples y directas)
      const pathMatch = moduleUrlPath === moduleName;
      const urlMatch = moduleUrlLower.replace(/^\/+|\/+$/g, '') === moduleName;
      const nameMatch = moduleNombre === moduleName;
      
      // Comparaciones secundarias (más flexibles)
      const pathContains = moduleUrlPath.includes(moduleName) || moduleName.includes(moduleUrlPath);
      const urlContains = moduleUrlLower.includes(moduleName) || moduleUrlLower.includes(`/${moduleName}`) || moduleUrlLower.includes(`${moduleName}/`);
      const nameContains = moduleNombre.includes(moduleName) || moduleName.includes(moduleNombre);
      
      // Comparación especial para Dashboard - si está en los módulos, permitir acceso
      const isDashboardRequest = moduleName === 'dashboard';
      const isDashboardModule = moduleUrlPath === 'dashboard' || 
                                moduleUrlLower.includes('dashboard') ||
                                moduleNombre === 'dashboard' ||
                                moduleNombre.includes('dashboard');
      const dashboardMatch = isDashboardRequest && isDashboardModule;
      
      // Si alguna comparación principal o secundaria es verdadera, hay coincidencia
      const matches = pathMatch || urlMatch || nameMatch || pathContains || urlContains || nameContains || dashboardMatch;
      
      // Log detallado para debugging (especialmente para Dashboard)
      if (matches || index < 3 || isDashboardRequest) {
        console.log(`🔎 [PermissionRoute] [${index}] "${m.nombre}" (${m.url}):`, {
          buscando: moduleName,
          urlPath: moduleUrlPath,
          urlLower: moduleUrlLower.replace(/^\/+|\/+$/g, ''),
          nombre: moduleNombre,
          pathMatch,
          urlMatch,
          nameMatch,
          pathContains,
          urlContains,
          nameContains,
          dashboardMatch: isDashboardRequest ? (isDashboardModule ? '✅ SÍ' : '❌ NO') : 'N/A',
          matches: matches ? '✅ SÍ' : '❌ NO'
        });
      }
      
      if (matches) {
        console.log(`✅ [PermissionRoute] ✅✅✅ COINCIDENCIA ENCONTRADA para '${module}' = "${m.nombre}" (${m.url})`);
      }
      
      return matches;
    });
    
    if (!hasPermission) {
      console.warn(`⚠️ [PermissionRoute] ⚠️ Módulo '${module}' NO encontrado en módulos del backend`);
      console.warn(`   Buscando: '${moduleName}'`);
      console.warn(`   Módulos disponibles:`, modules.map(m => ({
        nombre: m.nombre,
        url: m.url,
        rutaExtraida: extractPath(m.url || ''),
        nombreNormalizado: m.nombre?.toLowerCase().trim(),
        activo: m.activo
      })));
      
      // VERIFICACIÓN ADICIONAL: Si el módulo es parte del sistema core y el usuario es SUPERADMIN/ADMIN, permitir acceso
      // Esto es un fallback de seguridad para módulos que deberían estar disponibles pero no están en la lista del backend
      const coreModules = ['users', 'usuarios', 'roles', 'permissions', 'permisos', 'modules', 'módulos', 'modules ', 'imports', 'audit', 'sessions', 'configuration', 'dashboard'];
      const isCoreModule = coreModules.includes(moduleName);
      const isPrivilegedUser = user.role === 'SUPERADMIN' || user.role === 'ADMIN' || user.role === 'supervisor';
      
      // También verificar si hay algún módulo que contenga "dashboard" en su URL o nombre
      const hasDashboardModule = modules.some(m => {
        const url = (m.url || '').toLowerCase();
        const name = (m.nombre || '').toLowerCase();
        return (url.includes('dashboard') || name.includes('dashboard')) && m.activo;
      });
      
      if ((isCoreModule && isPrivilegedUser) || (moduleName === 'dashboard' && hasDashboardModule)) {
        console.warn(`⚠️ [PermissionRoute] PERO es módulo core/dashboard y usuario tiene acceso - PERMITIENDO ACCESO`);
        hasPermission = true;
      }
    }
  } else {
    // Fallback a lista hardcodeada solo si no hay módulos del backend
    const allowedModules: Record<string, string[]> = {
      'SUPERADMIN': ['users', 'roles', 'permissions', 'modules', 'imports', 'audit', 'sessions', 'configuration', 'reports', 'garantizado', 'asistencia'],
      'ADMIN': ['users', 'roles', 'modules', 'dashboard', 'reports', 'garantizado', 'asistencia'],
      'OPERADOR': ['reports', 'users', 'asistencia'],
      'SAC': ['tickets', 'asistencia']
    }
    
    const userAllowedModules = allowedModules[user.role.toUpperCase()] || []
    hasPermission = userAllowedModules.includes(module)
    
    console.log(`📋 [PermissionRoute] Usando lista hardcodeada para rol ${user.role}, módulo '${module}': ${hasPermission}`);
  }
  
  // Si no tiene permiso, redirigir a la vista de bienvenida
  if (!hasPermission) {
    console.warn(`❌ [PermissionRoute] ACCESO DENEGADO para módulo '${module}'`);
    console.warn(`   Usuario: ${user.role} (${user.username})`);
    console.warn(`   Redirigiendo a vista de bienvenida...`);
    return <Navigate to="/" replace />
  }

  console.log(`✅ [PermissionRoute] ✅ ACCESO PERMITIDO para módulo '${module}'`);
  console.log(`   Usuario: ${user.role} (${user.username})`);
  console.log(`   Renderizando contenido del módulo...`);
  console.log(`   Children type:`, typeof children);

  // Verificar si children es null o undefined
  if (!children) {
    console.error(`⚠️ [PermissionRoute] Children es null o undefined para módulo '${module}'`);
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-600 dark:text-red-400">
            Error: No se puede renderizar el componente del módulo
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>
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
              <RoleRestrictedRoute allowedRoles={['SUPERADMIN', 'ADMIN', 'OPERADOR', 'SAC', 'PRINCIPAL', 'SUPERVISOR', 'supervisor']}>
                <MainLayout />
              </RoleRestrictedRoute>
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