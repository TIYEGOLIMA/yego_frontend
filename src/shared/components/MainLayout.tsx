import React, { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/auth-store'
import { usePermissions } from '../hooks/usePermissions'
import { useConnectionStatus } from '../hooks/useConnectionStatus'
import { ThemeToggle } from './ThemeToggle'
import { Button } from '../../components/ui/button'
import { ChangePasswordDialog } from '../../components/ChangePasswordDialog'
import { 
  Menu, 
  User, 
  Power, 
  Settings2, 
  LayoutDashboard, 
  UserRound, 
  ShieldCheck, 
  KeyRound, 
  AppWindow, 
  Import, 
  ScrollText, 
  MonitorSmartphone, 
  BarChart4, 
  ChevronLeft, 
  ChevronRight, 
  Bell, 
  HelpCircle, 
  Lock 
} from 'lucide-react'

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  children?: NavItem[];
  requiredPermission?: string | null;
}

export const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const { user, logout, token } = useAuthStore()
  const { hasAnyPermission } = usePermissions()
  const { status } = useConnectionStatus()
  
  const navigate = useNavigate()
  const location = useLocation()

  // Verificar autenticación al cargar el componente
  useEffect(() => {
    // Si no hay token, redirigir a login
    if (!token) {
      navigate('/login')
    }
    
    // Si hay token pero no hay usuario, intentar cargar el perfil
    if (token && !user) {
    }
  }, [token, user, navigate])

  // Si no hay token, no renderizar nada
  if (!token) {
    return null
  }

  // Si hay token pero no hay usuario, mostrar loading
  if (token && !user) {
    return (
      <div className="min-h-screen bg-background-secondary dark:bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-600 dark:text-neutral-400">Cargando perfil de usuario...</p>
        </div>
      </div>
    )
  }


  const handleLogout = async () => {
    try {
      console.log('🚪 [MainLayout] Iniciando logout completo...')
      
      // 🎯 Logout completo (ya incluye limpieza del AgentPanel)
      await logout()
      navigate('/login')
      
      console.log('✅ [MainLayout] Logout completado')
      
    } catch (error) {
      console.error('❌ [MainLayout] Error en logout:', error)
      // Hacer logout del sistema principal aunque haya errores
      await logout()
      navigate('/login')
    }
  }

  // Definición de elementos de navegación con nuevo diseño
  const navItems: NavItem[] = [
    { 
      label: "Dashboard", 
      to: "/dashboard", 
      icon: <LayoutDashboard className="h-5 w-5" />, 
      requiredPermission: null 
    },
    { 
      label: "Tickets", 
      to: "/tickets", 
      icon: <Bell className="h-5 w-5" />, 
      requiredPermission: "tickets"
    },
    { 
      label: "Usuarios", 
      to: "/users", 
      icon: <UserRound className="h-5 w-5" />, 
      requiredPermission: "users"
    },
    { 
      label: "Roles", 
      to: "/roles", 
      icon: <ShieldCheck className="h-5 w-5" />, 
      requiredPermission: "roles"
    },
    { 
      label: "Permisos", 
      to: "/permissions", 
      icon: <KeyRound className="h-5 w-5" />, 
      requiredPermission: "permissions"
    },
    { 
      label: "Módulos", 
      to: "/modules", 
      icon: <AppWindow className="h-5 w-5" />, 
      requiredPermission: "modules"
    },
    { 
      label: "Importaciones", 
      to: "/imports", 
      icon: <Import className="h-5 w-5" />, 
      requiredPermission: "imports"
    },
    { 
      label: "Auditoría", 
      to: "/audit", 
      icon: <ScrollText className="h-5 w-5" />, 
      requiredPermission: "audit"
    },
    { 
      label: "Sesiones", 
      to: "/sessions", 
      icon: <MonitorSmartphone className="h-5 w-5" />, 
      requiredPermission: "sessions"
    },
    { 
      label: "Reportes", 
      to: "/reports", 
      icon: <BarChart4 className="h-5 w-5" />, 
      requiredPermission: "reports"
    },
    { 
      label: "Configuración", 
      to: "/configuration", 
      icon: <Settings2 className="h-5 w-5" />, 
      requiredPermission: "configuration"
    }
  ]

  // Filtrar elementos de navegación según permisos
  const filteredNavItems = navItems.filter(item => {
    // Si el usuario es OPERADOR, solo mostrar Tickets
    const isOperador = user?.role === 'OPERADOR';
    
    if (isOperador) {
      // OPERADOR solo debe ver tickets, NO dashboard
      return item.requiredPermission === 'tickets';
    }
    
    // Para otros roles, usar la lógica normal de permisos
    // Dashboard siempre visible
    if (!item.requiredPermission) return true;
    
    const hasPermission = hasAnyPermission(item.requiredPermission);
    return hasPermission;
  });

  // Verificar si una ruta está activa
  const isActive = (path: string) => {
    // Considerar la ruta raíz como dashboard
    if (path === '/dashboard' && (location.pathname === '/' || location.pathname === '/dashboard')) {
      return true;
    }
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  // Obtener el título de la página actual
  const getCurrentPageTitle = () => {
    // Si estamos en la raíz, mostrar Dashboard
    if (location.pathname === '/') {
      return 'Dashboard';
    }
    const currentItem = filteredNavItems.find(item => isActive(item.to))
    return currentItem?.label || 'Dashboard'
  }

  // Cerrar el menú de usuario al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuOpen && !(event.target as Element).closest('.user-menu-container')) {
        setUserMenuOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen])

  // Cerrar sidebar en móvil al cambiar de ruta
  useEffect(() => {
    if (sidebarOpen) {
      setSidebarOpen(false)
    }
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-background-secondary dark:bg-background-dark">
      {/* Header */}
      <header className="yego-surface sticky top-0 z-40 border-b shadow-sm dark:shadow-dark-sm">
        <div className="flex items-center justify-between h-16 px-4 lg:px-6">
          {/* Lado izquierdo */}
          <div className="flex items-center space-x-4">
            {/* Botón menú móvil */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            {/* Logo y título */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                  <span className="text-white font-black text-lg">Y</span>
                </div>
                <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-surface-dark transition-all duration-300 ${
                  status === 'connected' 
                    ? 'bg-success-500 animate-pulse' 
                    : status === 'connecting' 
                    ? 'bg-warning-500 animate-spin' 
                    : 'bg-error-500'
                }`} title={`Estado de conexión: ${status}`}></div>
              </div>
              
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
                  YEGO <span className="text-primary-500">Integral</span>
                </h1>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                  {getCurrentPageTitle()}
                </p>
              </div>
            </div>
          </div>
          
          {/* Lado derecho */}
          <div className="flex items-center space-x-2">
            {/* Notificaciones */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary-500 rounded-full"></span>
            </Button>
            
            {/* Ayuda */}
            <Button variant="ghost" size="icon">
              <HelpCircle className="h-5 w-5" />
            </Button>
            
            {/* Toggle de tema */}
            <ThemeToggle />
            
            {/* Menú de usuario */}
            <div className="user-menu-container relative">
              <Button
                variant="glassmorphism"
                className="min-w-0 md:w-[200px] px-2 md:px-4 py-2 md:h-12 overflow-hidden shadow-lg backdrop-blur-sm border border-white/30 dark:border-neutral-600/50 bg-white/20 dark:bg-neutral-700/50 rounded-xl transition-all duration-300 flex items-center"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="flex flex-row items-center w-full">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div className="hidden md:flex flex-1 flex-col justify-center min-w-0 ml-3">
                    <span className="text-sm font-semibold text-neutral-900 dark:text-white leading-tight truncate min-w-0">
                      {user?.name?.split(' ')[0] || user?.username || 'Usuario'}
                    </span>
                    <span className="text-xs text-primary-600 dark:text-primary-400 font-medium truncate min-w-0">
                      {user?.role || 'Nivel'}
                    </span>
                  </div>
                </div>
              </Button>
              
              {/* Dropdown del usuario */}
              {userMenuOpen && (
                <div className="absolute right-0 top-12 w-56 yego-surface border shadow-lg dark:shadow-dark-lg rounded-xl py-2 animate-scale-in">
                  <div className="px-4 py-3 border-b border-border dark:border-border-dark">
                    <div className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                      {user?.name || user?.username || 'Usuario'}
                    </div>
                    <div className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
                      {user?.email || 'usuario@yego.com'}
                    </div>
                  </div>
                  
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center space-x-2 transition-colors"
                    onClick={() => {
                      setUserMenuOpen(false);
                      setChangePasswordOpen(true);
                    }}
                  >
                    <Lock className="h-4 w-4" />
                    <span>Cambiar Contraseña</span>
                  </button>
                  
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center space-x-2 transition-colors"
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/configuration');
                    }}
                  >
                    <Settings2 className="h-4 w-4" />
                    <span>Configuración</span>
                  </button>
                  
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 flex items-center space-x-2 transition-colors"
                    onClick={async () => {
                      setUserMenuOpen(false);
                      await handleLogout();
                    }}
                  >
                    <Power className="h-4 w-4" />
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Overlay para sidebar móvil */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`yego-sidebar transform transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 
        ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}
        w-64 pt-16 flex flex-col`}>
        
        {/* Navegación */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const isActiveItem = isActive(item.to);
            return (
              <button
                key={item.to}
                onClick={() => navigate(item.to)}
                className={`${isActiveItem ? 'yego-nav-item-active' : 'yego-nav-item-inactive'} w-full flex items-center relative`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <div className="flex items-center justify-center">
                  {item.icon}
                </div>
                {!sidebarCollapsed && (
                  <span className="ml-3 flex-1 text-left font-medium text-sm truncate">{item.label}</span>
                )}
                {isActiveItem && !sidebarCollapsed && (
                  <span className="yego-nav-indicator" />
                )}
                {isActiveItem && sidebarCollapsed && (
                  <span className="yego-nav-indicator" />
                )}
              </button>
            );
          })}
        </nav>
        
        {/* Botón para colapsar sidebar - Solo desktop */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden lg:flex absolute -right-3 top-32 w-6 h-6 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-full items-center justify-center shadow-md hover:shadow-lg transition-all duration-200"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-3 w-3 text-neutral-600 dark:text-neutral-400" />
          ) : (
            <ChevronLeft className="h-3 w-3 text-neutral-600 dark:text-neutral-400" />
          )}
        </button>
        
        {/* Footer del sidebar pegado abajo */}
        <div className="mt-auto p-4 border-t border-border dark:border-border-dark">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center px-0' : 'justify-start px-3'} py-3 rounded-xl transition-all duration-200 group relative yego-nav-item-inactive text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 font-medium`}
            type="button"
          >
            <Power className={`h-5 w-5 ${!sidebarCollapsed && 'mr-3'}`} />
            {!sidebarCollapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </div>

      {/* Contenido principal */}
      <div className={`transition-all duration-300 ease-in-out
        ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}
        pt-0 min-h-screen`}>
        <main className="p-6">
          <div className="yego-container">
            <Outlet />
          </div>
        </main>
      </div>
      
      {/* Diálogo de cambio de contraseña */}
      <ChangePasswordDialog
        isOpen={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        onSuccess={() => {
          // Opcional: mostrar mensaje de éxito o actualizar estado
        }}
      />
    </div>
  )
}

export default MainLayout