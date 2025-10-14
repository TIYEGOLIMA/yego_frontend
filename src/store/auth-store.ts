import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authService } from "../services"

export interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  role: string;
  moduleId?: string | null;  
  active: boolean;
  lastLogin: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  refreshTrigger: number;
  login: (username: string, password: string) => Promise<any>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
  clearError: () => void;
  updateUser: (user: User) => void;
  triggerRefresh: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: false,
      error: null,
      refreshTrigger: 0,
      login: async (username, password) => {
        set({ loading: true, error: null })
        try {
          const response = await authService.login({ username, password })
          
          
          // Login normal con token
          if (!response.accessToken) {
            throw new Error('No se recibió token de acceso')
          }
          
          // 🎯 TODOS LOS ROLES PUEDEN ACCEDER AL SISTEMA
          console.log(`✅ [authStore] Usuario con rol ${response.user.role} autorizado para acceder`)
          
          console.log('✅ [authStore] Login exitoso, guardando estado:', {
            user: response.user,
            token: response.accessToken ? 'presente' : 'ausente'
          })
          
          set({ 
            user: response.user, 
            token: response.accessToken, 
            loading: false,
            error: null
          })
          localStorage.setItem("token", response.accessToken)
          localStorage.setItem("user", JSON.stringify(response.user))
          localStorage.removeItem("requiereCambioPassword")
          
          console.log('✅ [authStore] Estado guardado en localStorage')
          
          return response
        } catch (error: any) {
          console.error('Error en login (store):', error);
          
          let errorMessage = "Error al iniciar sesión"
          
          // Manejar error específico de usuario inactivo (403)
          if (error.response?.status === 403) {
            errorMessage = "Usuario inactivo. Contacte al administrador del sistema"
          }
          // Manejar error de credenciales inválidas (401)
          else if (error.response?.status === 401) {
            errorMessage = error.response?.data?.message || error.response?.data?.error || "Credenciales inválidas. Verifique su usuario y contraseña"
          }
          // Manejar error de red
          else if (error.message === 'Network Error') {
            errorMessage = "Error de conexión. Verifique su conexión a internet"
          }
          // Otros errores
          else {
            errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || "Error al iniciar sesión"
          }
          
          set({ error: errorMessage, loading: false })
          throw new Error(errorMessage)
        }
      },
      logout: async () => {
        console.log('🔄 [authStore] Iniciando logout...')
        
        try {
          // Desconectar WebSocket antes del logout
          const SocketService = (await import('../services/socket-service')).default
          if (SocketService) {
            console.log('🔌 [authStore] Desconectando WebSocket...')
            SocketService.disconnect()
          }
          
          // Ejecutar logout del servicio
          await authService.logout()
          
          // Limpiar estado del store
          set({ user: null, token: null, error: null })
          localStorage.removeItem("requiereCambioPassword")
          
          console.log('✅ [authStore] Logout completado exitosamente')
        } catch (error) {
          console.error('❌ [authStore] Error en logout:', error)
          // En caso de error, limpiar estado local
          set({ user: null, token: null, error: null })
          localStorage.removeItem("requiereCambioPassword")
        }
      },
      fetchProfile: async () => {
        const token = get().token
        if (!token) return
        
        // Verificar si el token es válido antes de hacer la petición
        if (!authService.isTokenValid()) {
          console.log('🚨 [store] Token inválido detectado en fetchProfile - limpiando...');
          authService.clearLocalStorage();
          set({ user: null, token: null, loading: false });
          return;
        }
        
        set({ loading: true })
        try {
          const user = await authService.getProfile(token)
          console.log('🔄 Perfil actualizado desde API:', user);
          set({ user, loading: false })
          localStorage.setItem("user", JSON.stringify(user))
        } catch (error: any) {
          console.log('🔒 [store] Error en fetchProfile:', error);
          
          // Si es error de token inválido, limpiar inmediatamente
          if (error.response?.status === 401 || 
              error.message?.includes('JWT signature')) {
            console.log('🚨 [store] Token corrupto/inválido - limpiando datos...');
            authService.clearLocalStorage();
            set({ user: null, token: null, loading: false });
            return;
          }
          
          // Para otros errores, intentar logout normal
          set({ user: null, token: null, loading: false })
          
          try {
            await authService.logout()
            console.log('✅ [store] Logout automático completado desde fetchProfile')
          } catch (logoutError) {
            console.warn('⚠️ [store] Error en logout desde fetchProfile:', logoutError)
          }
        }
      },
      clearError: () => {
        set({ error: null })
      },
      updateUser: (user: User) => {
        set({ user })
        localStorage.setItem("user", JSON.stringify(user))
        localStorage.removeItem("requiereCambioPassword")
        
        console.log(`🔄 [authStore] Usuario actualizado: ${user.name}`);
        console.log(`🔄 [authStore] ModuleId: ${user.moduleId}`);
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
        refreshTrigger: state.refreshTrigger,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.user) {
          console.log('🔄 [authStore] Estado restaurado:', {
            user: state.user.name,
            role: state.user.role,
            moduleId: state.user.moduleId
          });
        }
      },
    }
  )
)