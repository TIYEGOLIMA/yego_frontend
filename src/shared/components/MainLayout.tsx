import React, { useState, useEffect, useMemo } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore, Module } from '../../store/auth-store'
import { useConnectionStatus } from '../hooks/useConnectionStatus'
import { ThemeToggle } from './ThemeToggle'
import { Button } from '../../components/ui/button'
import { ChangePasswordDialog } from '../../components/ChangePasswordDialog'
import { 
  Menu, 
  User, 
  Power, 
  AppWindow, 
  ChevronLeft, 
  ChevronRight, 
  Bell, 
  HelpCircle, 
  Lock,
  ChevronDown
} from 'lucide-react'
import { ICON_MAP } from '../utils/moduleIcons'

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
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set())
  const { user, logout, token, modules, fetchModules, refreshTrigger } = useAuthStore()
  const { status } = useConnectionStatus()
  
  
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }
    
    if (token && (!modules || modules.length === 0)) {
      const timeout = setTimeout(() => {
        const currentModules = useAuthStore.getState().modules;
        if (!currentModules || currentModules.length === 0) {
          fetchModules().catch((error: any) => {
            if (error.message?.includes('Token inválido') || error.response?.status === 401 || error.response?.status === 403) {
              logout();
              navigate('/login');
            }
          });
        }
      }, 2000);
      
      return () => clearTimeout(timeout);
    }
  }, [token])

  if (!token) return null

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

  // Helper functions
  const getModuleIcon = (icono?: string) => {
    if (icono && ICON_MAP[icono]) {
      const IconComponent = ICON_MAP[icono];
      return <IconComponent className="h-5 w-5" />;
    }
    return <AppWindow className="h-5 w-5" />;
  };

  const normalizeUrl = (url?: string): string => {
    if (!url) return '';
    return url.startsWith('/') ? url : `/${url}`;
  };

  const createNavItemFromModule = (module: Module): NavItem => ({
    label: module.nombre || '',
    to: normalizeUrl(module.url),
    icon: getModuleIcon(module.icono),
    requiredPermission: null
  });

  const isDashboard = (module: Module): boolean => {
    const name = module.nombre?.toLowerCase() || '';
    const url = module.url?.toLowerCase() || '';
    return name.includes('dashboard') || url.includes('dashboard');
  };

  const buildNavItemsFromModules = (modulesList: Module[] = modules): NavItem[] => {
    if (!modulesList || modulesList.length === 0) return [];

    const activeModules = modulesList.filter(module => module.activo);
    const navItems: NavItem[] = [];
    const modulesWithGroup = new Map<string, Module[]>();
    const modulesWithoutGroup: Module[] = [];

    activeModules.forEach(module => {
      if (isDashboard(module)) {
        navItems.push(createNavItemFromModule(module));
      } else if (module.grupo?.nombre) {
        const grupoName = module.grupo.nombre;
        if (!modulesWithGroup.has(grupoName)) {
          modulesWithGroup.set(grupoName, []);
        }
        modulesWithGroup.get(grupoName)!.push(module);
      } else {
        modulesWithoutGroup.push(module);
      }
    });

    modulesWithGroup.forEach((grupoModules, grupoName) => {
      const grupoIconName = grupoModules[0]?.grupo?.icono;
      const GrupoIcon = grupoIconName && ICON_MAP[grupoIconName] ? ICON_MAP[grupoIconName] : AppWindow;
      
        navItems.push({
          label: grupoName,
          to: `dropdown-${grupoName.toLowerCase().replace(/\s+/g, '-')}`,
        icon: <GrupoIcon className="h-5 w-5" />,
          requiredPermission: null,
          children: grupoModules.map(module => createNavItemFromModule(module))
      });
    });

    modulesWithoutGroup.forEach(module => {
      navItems.push(createNavItemFromModule(module));
    });

    return navItems;
  };

  // Re-calcular navItems cuando cambien los módulos o el refreshTrigger
  const navItems = useMemo(() => {
    return buildNavItemsFromModules(modules);
  }, [modules, refreshTrigger]);

  const isActive = (path: string) => {
    if (path === '/dashboard' && (location.pathname === '/' || location.pathname === '/dashboard')) return true;
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const getCurrentPageTitle = () => {
    if (location.pathname === '/') return 'Dashboard';
    return navItems.find(item => isActive(item.to))?.label || 'Dashboard'
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuOpen && !(event.target as Element).closest('.user-menu-container')) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [userMenuOpen])

  useEffect(() => {
    if (sidebarOpen) setSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    // Gestionar automáticamente los dropdowns basándose en la ruta activa
    // También se ejecuta cuando cambian los módulos (refreshTrigger) para actualizar navegación
    const newOpenDropdowns = new Set<string>();
    
    navItems.forEach(item => {
      if (item.to.startsWith('dropdown-') && item.children) {
        const hasActiveOption = item.children.some(child => isActive(child.to));
        if (hasActiveOption) {
          newOpenDropdowns.add(item.to);
        }
      }
    });
    
    // Comparar si hay cambios antes de actualizar para evitar re-renders innecesarios
    const currentDropdowns = Array.from(openDropdowns).sort().join(',');
    const nextDropdowns = Array.from(newOpenDropdowns).sort().join(',');
    
    if (currentDropdowns !== nextDropdowns) {
      setOpenDropdowns(newOpenDropdowns);
    }
  }, [location.pathname, navItems, refreshTrigger])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdowns.size > 0 && !(event.target as Element).closest('.dropdown-menu-container')) {
        // Solo cerrar dropdowns que NO tienen una opción activa
        // para evitar el parpadeo de re-render
        const dropdownsToKeep = new Set<string>();
        navItems.forEach(item => {
          if (item.to.startsWith('dropdown-') && item.children) {
            const hasActiveOption = item.children.some(child => isActive(child.to));
            if (hasActiveOption && openDropdowns.has(item.to)) {
              dropdownsToKeep.add(item.to);
            }
          }
        });
        
        if (dropdownsToKeep.size !== openDropdowns.size) {
          setOpenDropdowns(dropdownsToKeep);
        }
      }
    }
    if (openDropdowns.size > 0) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openDropdowns, navItems])

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
          {navItems.length === 0 ? (
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
            navItems.map((item) => {
            const isActiveItem = isActive(item.to);
            
            // Manejar menús expandibles (dropdowns)
            if (item.to.startsWith('dropdown-') && item.children) {
              const dropdownId = item.to;
              const isDropdownOpen = openDropdowns.has(dropdownId);
              const hasActiveOption = item.children.some(child => isActive(child.to));
              
              return (
                <div key={item.label} className="dropdown-menu-container">
                  {/* Botón principal del dropdown */}
                  <button
                    onClick={() => {
                      setOpenDropdowns(prev => {
                        const newSet = new Set(prev);
                        if (isDropdownOpen) {
                          newSet.delete(dropdownId);
                        } else {
                          newSet.add(dropdownId);
                        }
                        return newSet;
                      });
                    }}
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
                        <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                      </>
                    )}
                    {(hasActiveOption || isDropdownOpen) && !sidebarCollapsed && (
                      <span className="yego-nav-indicator" />
                    )}
                    {(hasActiveOption || isDropdownOpen) && sidebarCollapsed && (
                      <span className="yego-nav-indicator" />
                    )}
                  </button>
                  
                  {/* Submenú expandible dentro del sidebar */}
                  {isDropdownOpen && !sidebarCollapsed && (
                    <div className="ml-4 mt-2 space-y-1 border-l-2 border-gray-200 dark:border-gray-700 pl-3">
                      {item.children.map((child) => {
                        const isOptionActive = isActive(child.to);
                        return (
                          <button
                            key={child.to}
                            onClick={() => {
                              navigate(child.to);
                            }}
                            className={`${isOptionActive ? 'bg-transparent border-2 border-red-500 rounded-lg text-gray-800 dark:text-white' : 'yego-nav-item-inactive'} w-full flex items-center relative text-sm pl-3 py-3`}
                          >
                            <div className="flex items-center justify-center">
                              {child.icon}
                            </div>
                            <span className="ml-3 flex-1 text-left font-medium text-sm truncate">{child.label}</span>
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
                  // El useEffect se encarga de cerrar dropdowns que ya no tienen opción activa
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