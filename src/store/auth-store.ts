import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authService } from "../services"

export interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  lastLogin: string;
  /** Si el usuario es jefe de un área (manager_id). Se persiste en localStorage vía auth-storage. */
  esJefe?: boolean;
  /** Nombre del área que gestiona (solo si esJefe). */
  nombreArea?: string | null;
}

export interface ModuleGrupo {
  id: number;
  nombre: string;
  icono?: string;
  activo?: boolean;
  fechaCreacion?: string;
}

export interface Module {
  id: number;
  nombre: string;
  descripcion?: string;
  url: string;
  estado: string;
  ultimoCheck?: string;
  activo: boolean;
  fechaCreacion?: string;
  fechaActualizacion?: string;
  icono?: string;
  grupo?: ModuleGrupo | null;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  modules: Module[];
  loading: boolean;
  error: string | null;
  refreshTrigger: number;
  login: (username: string, password: string) => Promise<any>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
  fetchModules: () => Promise<void>;
  clearError: () => void;
  triggerRefresh: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      modules: [],
      loading: false,
      error: null,
      refreshTrigger: 0,
      login: async (username, password) => {
        set({ loading: true, error: null })
        try {
          const response = await authService.login({ username, password })
          
          if (!response.accessToken) {
            throw new Error('No se recibió token de acceso')
          }
          
          set({ 
            user: response.user, 
            token: response.accessToken, 
            loading: false,
            error: null
          })
          localStorage.removeItem("requiereCambioPassword")
          
          // Cargar módulos después del login
          try {
            await get().fetchModules();
          } catch {
            // Continuar aunque falle la carga de módulos
          }
          
          return response
        } catch (error: any) {
          let errorMessage = "Error al iniciar sesión"
          
          if (error.response?.status === 403) {
            errorMessage = "Usuario inactivo. Contacte al administrador del sistema"
          } else if (error.response?.status === 401) {
            errorMessage = "Credenciales inválidas. Verifique su usuario y contraseña"
          } else if (error.message === 'Network Error') {
            errorMessage = "Error de conexión. Verifique su conexión a internet"
          } else {
            errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || "Error al iniciar sesión"
          }
          
          set({ error: errorMessage, loading: false })
          throw new Error(errorMessage)
        }
      },
      logout: async () => {
        try {
          const SocketService = (await import('../services/socket-service')).default
          if (SocketService) {
            SocketService.disconnect()
          }
          await authService.logout()
        } catch {
          // Continuar con logout aunque falle
        } finally {
          set({ user: null, token: null, modules: [], error: null })
          localStorage.removeItem("requiereCambioPassword")
        }
      },
      fetchModules: async () => {
        const token = get().token
        if (!token) return
        
        try {
          const modules = await authService.getMyModules();
          set({ modules });
        } catch (error: any) {
          if (error.message?.includes('Token inválido') || error.response?.status === 401 || error.response?.status === 403) {
            set({ user: null, token: null, modules: [], loading: false });
            localStorage.removeItem('auth-storage');
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
          } else {
            set({ modules: [] });
          }
        }
      },
      fetchProfile: async () => {
        const token = get().token
        if (!token) return
        
        const tryRefreshToken = async () => {
          try {
            const refreshResponse = await authService.refreshToken()
            set({ 
              user: refreshResponse.user, 
              token: refreshResponse.accessToken,
              loading: false 
            })
            return true
          } catch {
            set({ user: null, token: null, loading: false });
            localStorage.removeItem('auth-storage');
            return false
          }
        }
        
        if (!authService.isTokenValid()) {
          await tryRefreshToken()
          return
        }
        
        set({ loading: true })
        try {
          const user = await authService.getProfile(token)
          set({ user, loading: false })
        } catch (error: any) {
          if (error.response?.status === 401 || error.message?.includes('JWT signature')) {
            await tryRefreshToken()
          } else {
            set({ user: null, token: null, loading: false })
            try {
              await authService.logout()
            } catch {
            // Ignorar error de logout
            }
          }
        }
      },
      clearError: () => {
        set({ error: null })
      },
      triggerRefresh: () => {
        set((state) => ({ refreshTrigger: state.refreshTrigger + 1 }))
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        modules: state.modules,
        refreshTrigger: state.refreshTrigger,
      }),
      onRehydrateStorage: () => {
        return (state) => {
            if (state?.token && (!state.modules || state.modules.length === 0)) {
            state.fetchModules().catch(() => {});
          }
        };
      },
    }
  )
)