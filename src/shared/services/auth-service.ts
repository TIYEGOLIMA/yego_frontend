export interface LoginPayload {
  username: string
  password: string
}

export interface AuthResponse {
  access_token: string
  user: {
    id: string
    username: string
    email: string
    roles: string[]
    // otros campos relevantes
  }
}

const API_URL = import.meta.env.VITE_API_URL || (
  import.meta.env.DEV ? "http://localhost:3000/api" : "/api"
)

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error((await res.json()).message || "Login failed")
    return res.json()
  },
  async getProfile(token: string) {
    const res = await fetch(`${API_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error("Unauthorized")
    return res.json()
  },
  async logout() {
    try {
      const token = localStorage.getItem("token");
      
      // 🎯 PASO 1: Notificar al backend para liberar el módulo ANTES de limpiar localStorage  
      if (token) {
        try {
          console.log('🔄 [shared/authService] Notificando logout al backend para liberar módulo...');
          const API_BASE_URL = import.meta.env.VITE_API_URL || "http://10.10.12.117:3030/api"; // Backend de ticketera para liberar módulo
          
          const response = await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            console.log('✅ [shared/authService] Backend notificado - módulo liberado');
          } else {
            console.warn('⚠️ [shared/authService] Backend respondió con error:', response.status);
          }
        } catch (backendError) {
          console.warn('⚠️ [shared/authService] Error notificando logout al backend:', backendError);
          // Continuar con la limpieza local aunque falle el backend
        }
      }
      
      // 🎯 PASO 2: Limpiar datos locales
      this.clearLocalStorage();
      
    } catch (error) {
      console.error('❌ [shared/authService] Error en logout:', error);
      // En caso de error, al menos limpiar datos locales
      this.clearLocalStorage();
    }
  },

  clearLocalStorage() {
    console.log('🧹 [shared/authService] Limpiando todos los datos locales...');
    
    // Solo borra el token local, el backend puede invalidar con refresh tokens en el futuro
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    
    // Limpiar módulos seleccionados (para cualquier usuario)
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('selectedModule_') || key.startsWith('selectedModuleName_')) {
        localStorage.removeItem(key);
        console.log('🗑️ Eliminada clave:', key);
      }
    });
    
    // Limpiar claves genéricas del módulo
    localStorage.removeItem('selectedModule');
    localStorage.removeItem('selectedModuleName');
    
    // Limpiar tokens y datos del usuario del microfrontend
    localStorage.removeItem('ticketera_token');
    localStorage.removeItem('ticketera_user'); 
    localStorage.removeItem('ticketera_validated');
    
    // Limpiar caché de conductores
    localStorage.removeItem('driver_names_cache');
    
    // Limpiar otros datos del microfrontend
    localStorage.removeItem('agentpanel_lastActivity');
    localStorage.removeItem('agentpanel_moduleAssignment');
    
    console.log('✅ [shared/authService] Limpieza local completada');
  },
} 