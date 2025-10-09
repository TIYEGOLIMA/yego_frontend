import { useAuthStore } from '../../store/auth-store';

export const usePermissions = () => {
  const { user } = useAuthStore();

  const hasPermission = (module: string, _action: string): boolean => {
    if (!user || !user.role) {
      return false;
    }

    // OPERADOR tiene acceso a reportes y usuarios
    if (user.role === 'OPERADOR') {
      return module === 'reports' || module === 'users';
    }
    
    // SAC solo tiene acceso a tickets
    if (user.role === 'SAC') {
      return module === 'tickets';
    }

    // SUPERADMIN NO ve reportes ni tickets
    if (user.role === 'SUPERADMIN') {
      return module !== 'reports' && module !== 'tickets';
    }

    // ADMIN solo ve usuarios, módulos, roles y dashboard
    if (user.role === 'ADMIN') {
      const allowedModules = ['users', 'modules', 'roles', 'dashboard'];
      return allowedModules.includes(module);
    }

    // Otros roles tienen acceso completo
    return true;
  };

  const hasAnyPermission = (module: string): boolean => {
    if (!user || !user.role) {
      return false;
    }

    // OPERADOR tiene acceso a reportes y usuarios
    if (user.role === 'OPERADOR') {
      return module === 'reports' || module === 'users';
    }
    
    // SAC solo tiene acceso a tickets
    if (user.role === 'SAC') {
      return module === 'tickets';
    }

    // SUPERADMIN NO ve reportes ni tickets
    if (user.role === 'SUPERADMIN') {
      return module !== 'reports' && module !== 'tickets';
    }

    // ADMIN solo ve usuarios, módulos, roles y dashboard
    if (user.role === 'ADMIN') {
      const allowedModules = ['users', 'modules', 'roles', 'dashboard'];
      return allowedModules.includes(module);
    }

    // Otros roles tienen acceso completo
    return true;
  };

  const getUserPermissions = () => {
    if (!user || !user.role) {
      return {};
    }

    // OPERADOR tiene acceso a reportes y usuarios (puede crear/editar OPERADOR y SAC)
    if (user.role === 'OPERADOR') {
      return {
        reports: ['read'],
        users: ['read', 'write']
      };
    }
    
    // SAC solo tiene acceso a tickets
    if (user.role === 'SAC') {
      return {
        tickets: ['read', 'write']
      };
    }

    // SUPERADMIN acceso completo EXCEPTO reportes y tickets
    if (user.role === 'SUPERADMIN') {
      return {
        users: ['read', 'write', 'delete'],
        roles: ['read', 'write'],
        modules: ['read', 'write'],
        imports: ['read', 'write'],
        audit: ['read'],
        configuration: ['read', 'write']
      };
    }

    // ADMIN solo tiene acceso a usuarios, módulos, roles y dashboard
    if (user.role === 'ADMIN') {
      return {
        users: ['read', 'write', 'delete'],
        roles: ['read', 'write'],
        modules: ['read', 'write']
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