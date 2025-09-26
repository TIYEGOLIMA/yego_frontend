/**
 * Store de autenticación utilizando Zustand
 * Gestiona el estado de autenticación, tokens y datos del usuario
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authService } from "../services"

export interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  role: string;
  moduleId?: string | null;  // Backend devuelve string, no number
  active: boolean;
  lastLogin: string;         // Backend devuelve LocalDateTime como string ISO
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
          
          // 🎯 VALIDAR QUE SOLO OPERADOR Y SUPERADMIN PUEDAN ACCEDER
          const allowedRoles = ['OPERADOR', 'SUPERADMIN'];
          if (!allowedRoles.includes(response.user.role)) {
            throw new Error(`Acceso denegado. Solo usuarios con rol OPERADOR o SUPERADMIN pueden acceder al sistema. Tu rol actual es: ${response.user.role}`)
          }
          
          set({ 
            user: response.user, 
            token: response.accessToken, 
            loading: false,
            error: null
          })
          localStorage.setItem("token", response.accessToken)
          localStorage.setItem("user", JSON.stringify(response.user))
          localStorage.removeItem("requiereCambioPassword")
          return response
        } catch (error: any) {
          console.error('Error en login (store):', error);
          const errorMessage = error.response?.data?.message || error.message || "Error al iniciar sesión"
          set({ error: errorMessage, loading: false })
          throw error
        }
      },
      logout: async () => {
        await authService.logout()
        set({ user: null, token: null, error: null })
        localStorage.removeItem("requiereCambioPassword")
      },
      fetchProfile: async () => {
        const token = get().token
        if (!token) return
        
        set({ loading: true })
        try {
          const user = await authService.getProfile(token)
          console.log('🔄 Perfil actualizado desde API:', user);
          set({ user, loading: false })
          localStorage.setItem("user", JSON.stringify(user))
        } catch (error) {
          console.log('🔒 [store] Error en fetchProfile, ejecutando logout completo...')
          set({ user: null, token: null, loading: false })
          
          // 🎯 USAR LOGOUT COMPLETO del store para liberar módulo  
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
    }
  )
)