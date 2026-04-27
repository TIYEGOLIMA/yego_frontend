import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authService } from "../services"
import api from "../services/core/api"
import {
  clearDispositivoSession,
  parseAxiosErrorCode,
} from "../services/core/device-auth-service"

export interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  lastLogin: string;
  esJefe?: boolean;
  nombreArea?: string | null;
  esSupervisor?: boolean;
  nombreAreaSupervisor?: string | null;
  requirePasswordChange?: boolean;
  sedeId?: number | null;
  sedeNombre?: string | null;
}

const SEDE_ACTIVA_KEY = 'sedeActiva'

/** Sincroniza `localStorage['sedeActiva']` con la sede del usuario autenticado. */
const sincronizarSedeActiva = (user: User | null | undefined) => {
  try {
    if (user?.sedeId != null) {
      localStorage.setItem(
        SEDE_ACTIVA_KEY,
        JSON.stringify({ id: user.sedeId, nombre: user.sedeNombre ?? null })
      )
    } else {
      localStorage.removeItem(SEDE_ACTIVA_KEY)
    }
  } catch {
    // localStorage no disponible (SSR / modo privado)
  }
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
  /** Clave estable enlazada al registro de pantallas (moduleComponentRegistry). La URL puede cambiar sin cambiar esto. */
  codigo?: string | null;
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

          api.defaults.headers.common['Authorization'] = `Bearer ${response.accessToken}`
          const user =
            response.user ??
            (await authService.getProfile(response.accessToken))
          
          set({ 
            user, 
            token: response.accessToken, 
            loading: false,
            error: null
          })
          clearDispositivoSession()
          localStorage.removeItem("requiereCambioPassword")
          sincronizarSedeActiva(user)
          
          // Cargar módulos solo si NO debe cambiar contraseña (si debe, no llamar my-modules)
          if (!user?.requirePasswordChange) {
            try {
              await get().fetchModules();
            } catch {
              // Continuar aunque falle la carga de módulos
            }
          }
          
          return { ...response, user }
        } catch (error: any) {
          let errorMessage = "Error al iniciar sesión"
          const status = error.response?.status
          const data = error.response?.data
          const failedUrl = String(error.config?.url ?? "")

          if (status === 403) {
            errorMessage =
              (typeof data?.message === "string" && data.message) ||
              "Usuario inactivo. Contacte al administrador del sistema"
          } else if (status === 401) {
            const code = parseAxiosErrorCode(error)
            if (failedUrl.includes("profile")) {
              errorMessage =
                "No se pudo cargar el perfil tras iniciar sesión. Intente de nuevo."
            } else if (code === "DEVICE_TOKEN_REVOKED" || code === "DEVICE_REVOKED") {
              errorMessage =
                "La sesión de un dispositivo vinculó un token inválido. Use solo usuario y contraseña, o borre datos del sitio e intente de nuevo."
            } else if (typeof data?.message === "string" && data.message.trim()) {
              errorMessage = data.message.trim()
            } else {
              errorMessage =
                "Credenciales inválidas. Verifique su usuario y contraseña"
            }
          } else if (error.message === "Network Error") {
            errorMessage = "Error de conexión. Verifique su conexión a internet"
          } else {
            errorMessage =
              error.response?.data?.message ||
              error.response?.data?.error ||
              error.message ||
              "Error al iniciar sesión"
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
          sincronizarSedeActiva(null)
        }
      },
      fetchModules: async () => {
        const token = get().token
        if (!token) return
        
        try {
          const modules = await authService.getMyModules();
          set({ modules });
        } catch (error: any) {
          // 403 PASSWORD_EXPIRED = debe cambiar contraseña (modal); no hacer logout ni redirigir
          const isPasswordExpired = error.response?.status === 403 && error.response?.data?.error === 'PASSWORD_EXPIRED';
          if (isPasswordExpired) {
            set({ modules: [] });
            return;
          }
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
            api.defaults.headers.common['Authorization'] = `Bearer ${refreshResponse.accessToken}`
            const user =
              refreshResponse.user ??
              (await authService.getProfile(refreshResponse.accessToken))
            set({ 
              user, 
              token: refreshResponse.accessToken,
              loading: false 
            })
            sincronizarSedeActiva(user)
            return true
          } catch {
            set({ user: null, token: null, loading: false });
            localStorage.removeItem('auth-storage');
            sincronizarSedeActiva(null)
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
          sincronizarSedeActiva(user)
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
          if (!state?.token) return;
          state.fetchProfile().catch(() => {}).then(() => {
            const s = useAuthStore.getState();
            if (!s.token || s.user?.requirePasswordChange) return;
            if (!s.modules || s.modules.length === 0) s.fetchModules().catch(() => {});
          });
        };
      },
    }
  )
)