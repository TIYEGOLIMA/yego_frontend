import { useAuthStore } from '../../store/auth-store';

export const usePermissions = () => {
  const { user, refreshTrigger } = useAuthStore();

  const hasPermission = (module: string, action: string): boolean => {
    if (!user || !user.role) {
      return false;
    }

    // Operadores solo tienen acceso a tickets
    if (user.role === 'OPERADOR') {
      return module === 'tickets';
    }

    // Otros roles tienen acceso completo
    return true;
  };

  const hasAnyPermission = (module: string): boolean => {
    if (!user || !user.role) {
      return false;
    }

    // Operadores solo tienen acceso a tickets
    if (user.role === 'OPERADOR') {
      return module === 'tickets';
    }

    // Otros roles tienen acceso completo
    return true;
  };

  const getUserPermissions = () => {
    if (!user || !user.role) {
      return {};
    }

    // Operadores solo tickets
    if (user.role === 'OPERADOR') {
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
      tickets: ['read', 'write']
    };
  };

  return {
    hasPermission,
    hasAnyPermission,
    getUserPermissions,
    userPermissions: getUserPermissions()
  };
}; 