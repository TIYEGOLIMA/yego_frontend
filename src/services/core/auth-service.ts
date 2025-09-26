/**
 * Servicio de autenticación para comunicación con el backend
 * Gestiona login, registro, perfil y cierre de sesión
 */
import api from './api'

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  nombre: string;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: number;
    username: string;
    email: string;
    name: string;
    role: string;
    moduleId?: string | null;  // Backend devuelve string, no number
    active: boolean;
    lastLogin: string;         // Backend devuelve LocalDateTime como string ISO
  };
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const authService = {
  /**
   * Inicia sesión con credenciales de usuario
   * @param credentials Credenciales (username y password)
   * @returns Respuesta con token y datos del usuario
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/auth/login', credentials);
      return response.data;
    } catch (error: any) {
      console.error('Error en login:', error.response?.data || error.message);
      if (error.message === 'Network Error') {
        throw new Error('Error de conexión con el servidor. Verifique que el backend esté en ejecución.');
      }
      throw error;
    }
  },

  /**
   * Registra un nuevo usuario en el sistema
   * @param data Datos del nuevo usuario
   * @returns Respuesta con token y datos del usuario creado
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await api.post<AuthResponse>('/auth/register', data);
      return response.data;
    } catch (error: any) {
      console.error('Error en registro:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Obtiene el perfil del usuario autenticado
   * @param token Token de autenticación
   * @returns Datos del perfil del usuario
   */
  async getProfile(token: string): Promise<AuthResponse['user']> {
    try {
      // Configurar el token para esta petición específica
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const response = await api.get<AuthResponse['user']>('/auth/profile');
      return response.data;
    } catch (error: any) {
      console.error('Error obteniendo perfil:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Crea un usuario superadmin (solo para desarrollo/testing)
   */
  async createSuperAdmin(): Promise<{ message: string }> {
    try {
      const response = await api.post<{ message: string }>('/auth/create-superadmin');
      return response.data;
    } catch (error: any) {
      console.error('Error creando superadmin:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Cambia la contraseña del usuario autenticado
   * @param data Datos para cambio de contraseña
   * @returns Respuesta del servidor
   */
  async changePassword(data: ChangePasswordData): Promise<any> {
    try {
      const response = await api.post('/auth/change-password', data);
      return response.data;
    } catch (error: any) {
      console.error('Error en cambio de contraseña:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Reset de contraseña (sin autenticación)
   * @param data Datos para cambio de contraseña incluyendo username
   * @returns Respuesta del servidor
   */
  async resetPassword(data: ChangePasswordData & { username: string }): Promise<any> {
    try {
      const response = await api.post('/auth/reset-password', data);
      return response.data;
    } catch (error: any) {
      console.error('Error en reset de contraseña:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Cierra la sesión del usuario actual
   */
  async logout(): Promise<void> {
    try {
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          console.log('🔄 [authService] Notificando logout al backend...');
          // 🎯 UNA SOLA LLAMADA: Tu backend maneja todo internamente
          await api.post('/auth/logout');
          console.log('✅ [authService] Logout exitoso en backend');
        } catch (error) {
          console.warn('⚠️ [authService] No se pudo hacer logout en backend:', error);
          // Continuar con la limpieza local aunque falle el backend
        }
      }
      
      // 🎯 Limpiar datos locales
      this.clearLocalStorage();
      
    } catch (error) {
      console.error('❌ [authService] Error en logout:', error);
      // En caso de error, al menos limpiar datos locales
      this.clearLocalStorage();
    }
  },

  /**
   * Limpia todos los datos del localStorage
   */
  clearLocalStorage(): void {
    console.log('🧹 [authService] Limpiando todos los datos locales...');
    
    // Limpiar datos de autenticación del sistema principal
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
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
    
    // Limpiar headers de autenticación
    delete api.defaults.headers.common['Authorization'];
    
    console.log('✅ [authService] Limpieza local completada');
  }
}