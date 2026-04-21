import { useAuthStore } from "../../store/auth-store"
import { useEffect } from 'react';
import SocketService from '../../services/socket-service';

export const useAuth = () => {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const loading = useAuthStore((s) => s.loading)
  const error = useAuthStore((s) => s.error)
  const login = useAuthStore((s) => s.login)
  const logout = useAuthStore((s) => s.logout)
  const fetchProfile = useAuthStore((s) => s.fetchProfile)

  return {
    user,
    token,
    loading,
    error,
    login,
    logout,
    fetchProfile,
    isAuthenticated: !!token && !!user,
    isSuperAdmin: user?.role === "SUPERADMIN",
    hasRole: (role: string) => user?.role === role,
  }
}

export function useAuthEvents() {
  const fetchProfile = useAuthStore((state) => state.fetchProfile);
  const fetchModules = useAuthStore((state) => state.fetchModules);
  const triggerRefresh = useAuthStore((state) => state.triggerRefresh);

  useEffect(() => {
    const socket = SocketService;
    
    const handlePermissionsUpdated = () => {
      fetchProfile().then(() => {
        triggerRefresh();
      });
    };

    const handleModulosActualizados = (event: any) => {
      if (event?.type === 'MODULOS_ACTUALIZADOS') {
        fetchProfile()
          .then(() => {
            triggerRefresh();
          })
          .catch((error) => {
            console.error('❌ [useAuthEvents] Error al actualizar perfil:', error);
          });
      }
      // Ignorar otros eventos silenciosamente
    };

    socket.on('permissions-updated', handlePermissionsUpdated);
    socket.on('ticketera', handleModulosActualizados);
    
    return () => {
      socket.off('permissions-updated', handlePermissionsUpdated);
      socket.off('ticketera', handleModulosActualizados);
    };
  }, [fetchProfile, fetchModules, triggerRefresh]);
} 