import React, { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore, Module } from '../../store/auth-store'
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
  Lock,
  ChevronDown,
  Server,
  Shield,
  Clock
} from 'lucide-react'

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  children?: NavItem[];
  requiredPermission?: string | null;
}

interface MainLayoutProps {
  children?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [sistemasDropdownOpen, setSistemasDropdownOpen] = useState(false)
  const { user, logout, token, modules, fetchModules } = useAuthStore()
  const { hasAnyPermission } = usePermissions()
  const { status } = useConnectionStatus()
  
  
  const navigate = useNavigate()
  const location = useLocation()

  // Verificar autenticación
  useEffect(() => {
    // Si no hay token, redirigir a login
    if (!token) {
      navigate('/login')
      return
    }
    
    // Los módulos ya se cargan en el login con await antes de redirigir
    // Solo cargar si realmente faltan después de recargar la página (onRehydrateStorage)
    if (token && (!modules || modules.length === 0)) {
      // Esperar 2 segundos para dar tiempo al onRehydrateStorage de Zustand
      const timeout = setTimeout(() => {
        // Verificar de nuevo antes de cargar (puede que ya se hayan cargado)
        const currentModules = useAuthStore.getState().modules;
        if (!currentModules || currentModules.length === 0) {
          console.log('📦 [MainLayout] Módulos faltantes después de recarga, cargando...');
          fetchModules().catch((error: any) => {
            console.warn('⚠️ [MainLayout] Error cargando módulos:', error);
            // Si es error de autorización, redirigir a login
            if (error.message?.includes('Token inválido') || error.response?.status === 401 || error.response?.status === 403) {
              logout();
              navigate('/login');
            }
          });
        }
      }, 2000); // Esperar 2 segundos para dar tiempo al rehydrate
      
      return () => clearTimeout(timeout);
    }
  }, [token]) // Solo depender de token para evitar ejecuciones múltiples cuando modules cambia

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
      await logout()
      navigate('/login')
    } catch (error) {
      await logout()
      navigate('/login')
    }
  }

  // Mapeo de nombres/URLs de módulos a iconos
  const getModuleIcon = (module: { nombre: string; url: string }) => {
    const name = module.nombre.toLowerCase();
    const url = module.url?.toLowerCase() || '';
    
    // Mapeo basado en nombre del módulo
    if (name.includes('dashboard') || url.includes('/dashboard')) {
      return <LayoutDashboard className="h-5 w-5" />;
    }
    if (name.includes('usuario') || url.includes('/users')) {
      return <UserRound className="h-5 w-5" />;
    }
    if (name.includes('rol') || url.includes('/roles')) {
      return <ShieldCheck className="h-5 w-5" />;
    }
    if (name.includes('permiso') || url.includes('/permissions')) {
      return <KeyRound className="h-5 w-5" />;
    }
    if (name.includes('módulo') || url.includes('/modules')) {
      return <AppWindow className="h-5 w-5" />;
    }
    if (name.includes('import') || url.includes('/imports')) {
      return <Import className="h-5 w-5" />;
    }
    if (name.includes('auditor') || url.includes('/audit')) {
      return <ScrollText className="h-5 w-5" />;
    }
    if (name.includes('sesión') || url.includes('/sessions')) {
      return <MonitorSmartphone className="h-5 w-5" />;
    }
    if (name.includes('configuración') || name.includes('configuracion') || url.includes('/configuration')) {
      return <Settings2 className="h-5 w-5" />;
    }
    if (name.includes('ticket') || url.includes('/tickets')) {
      return <Bell className="h-5 w-5" />;
    }
    if (name.includes('sistema') || url.includes('/sistemas')) {
      return <Server className="h-5 w-5" />;
    }
    if (name.includes('reporte') || url.includes('/reports')) {
      return <BarChart4 className="h-5 w-5" />;
    }
    if (name.includes('garantizado') || url.includes('/garantizado')) {
      return <Shield className="h-5 w-5" />;
    }
    if (name.includes('asistencia') || url.includes('/asistencia')) {
      return <Clock className="h-5 w-5" />;
    }
    
    // Icono por defecto
    return <AppWindow className="h-5 w-5" />;
  };

  // Determinar si un módulo debe ir al dropdown de Sistemas
  const isSistemaModule = (module: { nombre: string; url: string }) => {
    const name = module.nombre?.toLowerCase().trim() || '';
    const url = module.url?.toLowerCase().trim() || '';
    
    // Normalizar URL: remover leading/trailing slashes para comparación
    const normalizedUrl = url.startsWith('/') ? url.substring(1) : url;
    const urlWithoutSlash = normalizedUrl.replace(/\/$/, '');
    
    // Módulos que van al dropdown de Sistemas
    const sistemasPaths = ['garantizado', 'reports', 'reportes', 'asistencia'];
    const sistemasNames = ['garantizado', 'reporte', 'reportes', 'asistencia'];
    
    // Verificar por URL (sin slashes iniciales/finales)
    const matchesUrl = sistemasPaths.some(path => 
      urlWithoutSlash === path || 
      urlWithoutSlash.includes(path) ||
      url.includes(`/${path}`) ||
      url.includes(`${path}/`)
    );
    
    // Verificar por nombre
    const matchesName = sistemasNames.some(sistemaName => 
      name === sistemaName || 
      name.includes(sistemaName)
    );
    
    return matchesUrl || matchesName;
  };

  // Convertir módulos del backend a NavItems
  const buildNavItemsFromModules = (): NavItem[] => {
    const navItems: NavItem[] = [];
    const sistemaModules: Module[] = [];
    const mainModules: Module[] = [];

    // Si hay módulos del backend, organizarlos
    if (modules && modules.length > 0) {
      modules.forEach((module: Module) => {
        if (module.activo) {
          // Identificar si es Dashboard (buscar en URL y nombre)
          const moduleUrl = module.url?.toLowerCase().replace(/^\/+|\/+$/g, '') || '';
          const moduleNombre = module.nombre?.toLowerCase().trim() || '';
          const isDashboard = moduleUrl === 'dashboard' || 
                              moduleUrl.includes('dashboard') ||
                              moduleNombre === 'dashboard' ||
                              moduleNombre.includes('dashboard');
          
          if (isDashboard) {
            // Agregar Dashboard primero al inicio si está en los módulos permitidos
            const dashboardUrl = module.url?.startsWith('/') ? module.url : `/${module.url}`;
            navItems.unshift({
              label: module.nombre || "Dashboard",
              to: dashboardUrl,
              icon: <LayoutDashboard className="h-5 w-5" />,
              requiredPermission: null
            });
            console.log('📊 [MainLayout] Dashboard agregado al menú:', {
              nombre: module.nombre,
              url: dashboardUrl,
              activo: module.activo
            });
            return;
          }
          
          if (isSistemaModule(module)) {
            sistemaModules.push(module);
          } else {
            mainModules.push(module);
          }
        }
      });

      // Si hay módulos del sistema, crear dropdown de Sistemas
      if (sistemaModules.length > 0) {
        navItems.push({
          label: "Sistemas",
          to: "dropdown",
          icon: <Server className="h-5 w-5" />,
          requiredPermission: null,
          children: sistemaModules.map(module => ({
            label: module.nombre,
            to: module.url.startsWith('/') ? module.url : `/${module.url}`,
            icon: getModuleIcon(module),
            requiredPermission: null
          }))
        });
      }

      // Agregar módulos principales directamente al menú
      mainModules.forEach((module) => {
        navItems.push({
          label: module.nombre,
          to: module.url.startsWith('/') ? module.url : `/${module.url}`,
          icon: getModuleIcon(module),
          requiredPermission: null // Los permisos ya están manejados por el backend
        });
      });
    }
    // Nota: No usar fallback estático aquí - los módulos se cargarán dinámicamente
    // y el menú se actualizará reactivamente cuando lleguen
    
    return navItems;
  };

  // Obtener elementos de navegación (dinámicos o estáticos como fallback)
  const navItems = buildNavItemsFromModules();

  // Filtrar elementos de navegación según permisos (solo si tienen requiredPermission)
  // Los módulos dinámicos del backend ya vienen filtrados, así que solo filtramos los estáticos
  const filteredNavItems = navItems.filter(item => {
    // Si no tiene requiredPermission, siempre visible (Dashboard o módulos dinámicos)
    if (!item.requiredPermission) {
      return true;
    }
    
    // Aplicar filtros solo para items estáticos (fallback)
    // OPERADOR ve Sistemas y Usuarios
    if (user?.role === 'OPERADOR') {
      return item.requiredPermission === 'users' || item.requiredPermission === 'systems';
    }
    
    // SAC solo ve Tickets
    if (user?.role === 'SAC') {
      return item.requiredPermission === 'tickets';
    }
    
    // SUPERADMIN ve todo EXCEPTO tickets
    if (user?.role === 'SUPERADMIN') {
      return item.requiredPermission !== 'tickets';
    }
    
    // ADMIN ve usuarios, roles, módulos y sistemas
    if (user?.role === 'ADMIN') {
      const allowedModules = ['users', 'roles', 'modules', 'systems'];
      return allowedModules.includes(item.requiredPermission);
    }
    
    return hasAnyPermission(item.requiredPermission);
  });

  // Verificar si una ruta está activa
  const isActive = (path: string) => {
    // Considerar la ruta raíz como dashboard
    if (path === '/dashboard' && (location.pathname === '/' || location.pathname === '/dashboard')) {
      return true;
    }
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  // Obtener opciones disponibles del dropdown de Sistemas
  const getSistemasOptions = () => {
    // Si hay módulos cargados, usar los módulos del sistema del backend
    if (modules && modules.length > 0) {
      const sistemaModules = modules
        .filter(module => module.activo && isSistemaModule(module))
        .map(module => ({
          label: module.nombre,
          to: module.url.startsWith('/') ? module.url : `/${module.url}`,
          icon: getModuleIcon(module),
          permission: module.url.replace('/', '').toLowerCase()
        }));
      return sistemaModules;
    }

    // Fallback a lista estática si no hay módulos cargados
    const options = [];

    // Solo ADMIN y SUPERADMIN pueden ver Reportes en el dropdown de Sistemas
    if (user?.role === 'ADMIN' || user?.role === 'SUPERADMIN') {
      options.push({
        label: "Reportes", 
        to: "/reports", 
        icon: <BarChart4 className="h-4 w-4" />, 
        permission: "reports"
      });
    }

    // Solo ADMIN y SUPERADMIN pueden ver Garantizado
    if (user?.role === 'ADMIN' || user?.role === 'SUPERADMIN') {
      options.push({
        label: "Garantizado", 
        to: "/garantizado", 
        icon: <Shield className="h-4 w-4" />, 
        permission: "garantizado"
      });
    }

    // Todos los usuarios pueden ver Asistencia
    options.push({
      label: "Asistencia", 
      to: "/asistencia", 
      icon: <Clock className="h-4 w-4" />, 
      permission: "asistencia"
    });

    return options;
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

  // Expandir automáticamente el menú de Sistemas cuando una opción está activa
  useEffect(() => {
    const sistemasOptions = getSistemasOptions();
    const hasActiveOption = sistemasOptions.some(option => isActive(option.to));
    
    // Solo auto-expandir si hay una opción activa, no forzar cierre
    if (hasActiveOption && !sistemasDropdownOpen) {
      setSistemasDropdownOpen(true);
    }
  }, [location.pathname])

  // Cerrar menú de Sistemas al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sistemasDropdownOpen && !(event.target as Element).closest('.sistemas-menu-container')) {
        setSistemasDropdownOpen(false);
      }
    }
    
    if (sistemasDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [sistemasDropdownOpen])

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
                  
                  {hasAnyPermission('configuration') && (
                    <button
                      className="w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center space-x-2 transition-colors"
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate('/configuration');
                        setSistemasDropdownOpen(false);
                      }}
                    >
                      <Settings2 className="h-4 w-4" />
                      <span>Configuración</span>
                    </button>
                  )}
                  
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
          {filteredNavItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <AppWindow className="h-8 w-8 text-neutral-400 dark:text-neutral-600 mb-3" />
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                No tienes módulos asignados en tu perfil.
              </p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                Contacta al administrador.
              </p>
            </div>
          ) : (
            filteredNavItems.map((item) => {
            const isActiveItem = isActive(item.to);
            
            // Manejar el menú expandible de Sistemas
            if (item.to === 'dropdown') {
              const sistemasOptions = getSistemasOptions();
              const hasActiveOption = sistemasOptions.some(option => isActive(option.to));
              
              return (
                <div key={item.label} className="sistemas-menu-container">
                  {/* Botón principal de Sistemas */}
                  <button
                    onClick={() => setSistemasDropdownOpen(!sistemasDropdownOpen)}
                    className={`w-full flex items-center relative transition-colors ${
                      hasActiveOption 
                        ? 'yego-nav-item-active' 
                        : 'yego-nav-item-inactive'
                    }`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <div className="flex items-center justify-center">
                      {item.icon}
                    </div>
                    {!sidebarCollapsed && (
                      <>
                        <span className="ml-3 flex-1 text-left font-medium text-sm truncate">{item.label}</span>
                        <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${sistemasDropdownOpen ? 'rotate-180' : ''}`} />
                      </>
                    )}
                    {(hasActiveOption || sistemasDropdownOpen) && !sidebarCollapsed && (
                      <span className="yego-nav-indicator" />
                    )}
                    {(hasActiveOption || sistemasDropdownOpen) && sidebarCollapsed && (
                      <span className="yego-nav-indicator" />
                    )}
                  </button>
                  
                  {/* Submenú expandible dentro del sidebar */}
                  {sistemasDropdownOpen && !sidebarCollapsed && (
                    <div className="ml-4 mt-2 space-y-1 border-l-2 border-gray-200 pl-3">
                      {sistemasOptions.map((option) => {
                        const isOptionActive = isActive(option.to);
                        return (
                          <button
                            key={option.to}
                            onClick={() => {
                              navigate(option.to);
                              setSistemasDropdownOpen(false);
                            }}
                            className={`${isOptionActive ? 'bg-transparent border-2 border-red-500 rounded-lg text-gray-800 dark:text-white p-' : 'yego-nav-item-inactive'} w-full flex items-center relative text-sm pl-3 py-3`}
                          >
                            <div className="flex items-center justify-center">
                              {option.icon}
                            </div>
                            <span className="ml-3 flex-1 text-left font-medium text-sm truncate">{option.label}</span>
                            {isOptionActive && (
                              <span className="yego-nav-indicator" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            
            // Elementos normales de navegación
            return (
              <button
                key={item.to}
                onClick={() => {
                  navigate(item.to);
                  // Cerrar menú de Sistemas al navegar a otra sección
                  setSistemasDropdownOpen(false);
                }}
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
          })
          )}
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
            {children || <Outlet />}
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