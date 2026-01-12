// 🌐 SHARED - COMPONENTES Y HOOKS COMPARTIDOS
// Entry point para todos los recursos compartidos de la aplicación

// 🎭 HOOKS COMPARTIDOS
export { useAuth, useAuthEvents } from './hooks/useAuth';
export { useConnectionStatus } from './hooks/useConnectionStatus';

// 🧩 COMPONENTES COMPARTIDOS  
export { default as AccessRestricted } from './components/AccessRestricted';
export { default as MainLayout } from './components/MainLayout';
export { ThemeToggle } from './components/ThemeToggle';

// 🎯 CONFIGURACIÓN DE SHARED
export const SHARED_CONFIG = {
  name: 'Shared Resources',
  version: '1.0.0',
  description: 'Componentes y hooks compartidos entre todos los sistemas',
  components: ['AccessRestricted', 'MainLayout', 'ThemeToggle'],
  hooks: ['useAuth', 'useConnectionStatus']
} as const;
