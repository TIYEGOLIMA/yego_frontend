import { useAuthStore } from '../../store/auth-store';

export const usePermissions = () => {
  const { user } = useAuthStore();

  const hasPermission = (module: string, _action: string): boolean => {
    if (!user || !user.role) {
      return false;
    }

    // Solo OPERADOR tiene acceso a reportes (NO tickets)
    if (user.role === 'OPERADOR') {
      return module === 'reports';
    }
    
    // SAC solo tiene acceso a tickets
    if (user.role === 'SAC') {
      return module === 'tickets';
    }

    // Otros roles tienen acceso completo
    return true;
  };

  const hasAnyPermission = (module: string): boolean => {
    if (!user || !user.role) {
      return false;
    }

    // Solo OPERADOR tiene acceso a reportes (NO tickets)
    if (user.role === 'OPERADOR') {
      return module === 'reports';
    }
    
    // SAC solo tiene acceso a tickets
    if (user.role === 'SAC') {
      return module === 'tickets';
    }

    // Otros roles tienen acceso completo
    return true;
  };

  const getUserPermissions = () => {
    if (!user || !user.role) {
      return {};
    }

    // Solo OPERADOR tiene acceso a reportes (NO tickets)
    if (user.role === 'OPERADOR') {
      return {
        reports: ['read']
      };
    }
    
    // SAC solo tiene acceso a tickets
    if (user.role === 'SAC') {
      return {
        tickets: ['read', 'write']
      };
    }

    // Otros roles acceso completo
    return {
      users: ['read', 'write', 'delete'],
      roles: ['read', 'write'],
      modules: ['read', 'write'],
      imports: ['read', 'write'],
      audit: ['read'],
      configuration: ['read', 'write'],
      tickets: ['read', 'write'],
      reports: ['read', 'write']
    };
  };

  return {
    hasPermission,
    hasAnyPermission,
    getUserPermissions,
    userPermissions: getUserPermissions()
  };
}; 