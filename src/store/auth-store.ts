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
  updateUser: (user: User) => void;
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
          
          // Cargar módulos inmediatamente después del login (sin await para no bloquear)
          // El estado se actualizará reactivamente cuando lleguen los módulos
          console.log('📦 [authStore] Cargando módulos después del login...');
          get().fetchModules().catch((moduleError: any) => {
            console.warn('⚠️ [authStore] Error cargando módulos después del login:', moduleError);
            // No fallar el login si hay error cargando módulos
          });
          
          return response
        } catch (error: any) {
          console.error('Error en login (store):', error);
          
          let errorMessage = "Error al iniciar sesión"
          
          // Manejar error específico de usuario inactivo (403)
          if (error.response?.status === 403) {
            errorMessage = "Usuario inactivo. Contacte al administrador del sistema"
          }
          // Manejar error de credenciales inválidas (401)
          // Siempre mostrar mensaje amigable para 401, ignorando el mensaje del backend
          else if (error.response?.status === 401) {
            errorMessage = "Credenciales inválidas. Verifique su usuario y contraseña"
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
          
          // Limpiar estado del store incluyendo módulos
          set({ user: null, token: null, modules: [], error: null })
          localStorage.removeItem("requiereCambioPassword")
          localStorage.removeItem("user-modules")
          
          console.log('✅ [authStore] Logout completado exitosamente')
        } catch (error) {
          console.error('❌ [authStore] Error en logout:', error)
          // En caso de error, limpiar estado local incluyendo módulos
          set({ user: null, token: null, modules: [], error: null })
          localStorage.removeItem("requiereCambioPassword")
          localStorage.removeItem("user-modules")
        }
      },
      fetchModules: async () => {
        const token = get().token
        if (!token) {
          console.warn('⚠️ [authStore] No hay token para obtener módulos')
          return
        }
        
        try {
          console.log('📦 [authStore] Obteniendo módulos del usuario...');
          const modules = await authService.getMyModules();
          
          set({ modules });
          localStorage.setItem("user-modules", JSON.stringify(modules));
          
          console.log(`✅ [authStore] ${modules.length} módulos guardados exitosamente`);
        } catch (error: any) {
          console.error('❌ [authStore] Error obteniendo módulos:', error);
          
          // Si el error es de token inválido, limpiar sesión
          if (error.message?.includes('Token inválido') || error.response?.status === 401 || error.response?.status === 403) {
            console.log('🚨 [authStore] Token inválido al obtener módulos - limpiando sesión...');
            set({ user: null, token: null, modules: [], loading: false });
            authService.clearLocalStorage();
            // Redirigir a login
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
          } else {
            // Para otros errores, mantener módulos vacíos pero no limpiar sesión
            set({ modules: [] });
          }
        }
      },
      fetchProfile: async () => {
        const token = get().token
        if (!token) return
        
        // Verificar si el token es válido antes de hacer la petición
        if (!authService.isTokenValid()) {
          console.log('🚨 [store] Token inválido detectado en fetchProfile - intentando renovar...');
          
          try {
            // Intentar renovar el token
            const refreshResponse = await authService.refreshToken()
            set({ 
              user: refreshResponse.user, 
              token: refreshResponse.accessToken,
              loading: false 
            })
            localStorage.setItem("token", refreshResponse.accessToken)
            localStorage.setItem("user", JSON.stringify(refreshResponse.user))
            console.log('✅ [store] Token renovado exitosamente en fetchProfile')
            return
          } catch (refreshError) {
            console.log('❌ [store] Error renovando token - limpiando datos...');
            authService.clearLocalStorage();
            set({ user: null, token: null, loading: false });
            return;
          }
        }
        
        set({ loading: true })
        try {
          const user = await authService.getProfile(token)
          console.log('🔄 Perfil actualizado desde API:', user);
          set({ user, loading: false })
          localStorage.setItem("user", JSON.stringify(user))
        } catch (error: any) {
          console.log('🔒 [store] Error en fetchProfile:', error);
          
          // Si es error de token inválido, intentar renovar primero
          if (error.response?.status === 401 || 
              error.message?.includes('JWT signature')) {
            console.log('🚨 [store] Token expirado - intentando renovar...');
            
            try {
              const refreshResponse = await authService.refreshToken()
              set({ 
                user: refreshResponse.user, 
                token: refreshResponse.accessToken,
                loading: false 
              })
              localStorage.setItem("token", refreshResponse.accessToken)
              localStorage.setItem("user", JSON.stringify(refreshResponse.user))
              console.log('✅ [store] Token renovado exitosamente en fetchProfile')
              return
            } catch (refreshError) {
              console.log('❌ [store] Error renovando token - limpiando datos...');
              authService.clearLocalStorage();
              set({ user: null, token: null, loading: false });
              return;
            }
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
        modules: state.modules,
        refreshTrigger: state.refreshTrigger,
      }),
      onRehydrateStorage: () => {
        return (state) => {
          if (state?.user) {
            console.log('🔄 [authStore] Estado restaurado:', {
              user: state.user.name,
              role: state.user.role,
              moduleId: state.user.moduleId,
              modulesCount: state.modules?.length || 0
            });
            
            // Intentar cargar módulos desde localStorage si existen
            try {
              const storedModules = localStorage.getItem('user-modules');
              if (storedModules) {
                const parsedModules = JSON.parse(storedModules);
                if (Array.isArray(parsedModules) && parsedModules.length > 0) {
                  state.modules = parsedModules;
                  console.log(`📦 [authStore] ${parsedModules.length} módulos restaurados desde localStorage`);
                }
              }
            } catch (error) {
              console.warn('⚠️ [authStore] Error restaurando módulos desde localStorage:', error);
            }
            
            // Si hay token pero no módulos, cargar módulos inmediatamente
            if (state?.token && (!state.modules || state.modules.length === 0)) {
              console.log('📦 [authStore] Token presente pero sin módulos - cargando módulos inmediatamente...');
              // Cargar módulos inmediatamente sin delay
              state.fetchModules().catch((error: any) => {
                console.warn('⚠️ [authStore] Error cargando módulos al restaurar:', error);
              });
            }
          }
        };
      },
    }
  )
)