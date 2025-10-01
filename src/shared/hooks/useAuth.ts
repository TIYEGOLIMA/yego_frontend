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
  const triggerRefresh = useAuthStore((s) => s.triggerRefresh)

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
  const triggerRefresh = useAuthStore((state) => state.triggerRefresh);

  useEffect(() => {
    const socket = SocketService;
    const handlePermissionsUpdated = () => {
      fetchProfile().then(() => {
        triggerRefresh();
      });
    };
    socket.on('permissions-updated', handlePermissionsUpdated);
    return () => {
      socket.off('permissions-updated', handlePermissionsUpdated);
    };
  }, [fetchProfile, triggerRefresh]);
} 