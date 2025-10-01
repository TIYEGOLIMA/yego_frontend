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
   * Utiliza el endpoint /logout del backend que maneja la invalidación del token
   */
  async logout(): Promise<void> {
    console.log('🔄 [authService] Iniciando proceso de logout...');
    
    try {
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          console.log('🔄 [authService] Notificando logout al backend...');
          console.log('🔑 [authService] Token a enviar:', token.substring(0, 20) + '...');
          
          // Usar el endpoint correcto /auth/logout del backend
          await api.post('/auth/logout', {}, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          console.log('✅ [authService] Logout exitoso en backend');
        } catch (error: any) {
          console.warn('⚠️ [authService] Error en logout del backend:', error);
          
          // Si es error de token inválido (401), continuar con logout local
          if (error.response?.status === 401) {
            console.log('🔧 [authService] Token inválido detectado - continuando con logout local');
          }
          
          // Si el error contiene "JWT signature does not match", es token corrupto
          if (error.response?.data?.message?.includes('JWT signature') || 
              error.message?.includes('JWT signature')) {
            console.log('🚨 [authService] Token JWT corrupto detectado - continuando con logout local');
          }
          
          // Si hay error de red, continuar con logout local
          if (error.message === 'Network Error') {
            console.log('🌐 [authService] Error de red - continuando con logout local');
          }
        }
      } else {
        console.log('⚠️ [authService] No hay token - procediendo solo con logout local');
      }
      
      // 🎯 Limpiar datos locales SIEMPRE (esto es lo más importante)
      this.clearLocalStorage();
      console.log('✅ [authService] Logout completado exitosamente');
      
    } catch (error) {
      console.error('❌ [authService] Error en logout:', error);
      // En caso de error, al menos limpiar datos locales
      this.clearLocalStorage();
      console.log('✅ [authService] Logout local completado por error');
    }
  },

  /**
   * Verifica si el token actual es válido
   * @returns true si el token es válido, false si está corrupto
   */
  isTokenValid(): boolean {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    try {
      // Verificar que el token tenga el formato JWT correcto (3 partes separadas por puntos)
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.warn('⚠️ [authService] Token no tiene formato JWT válido');
        return false;
      }
      
      // Intentar decodificar el payload (sin verificar la firma)
      const payload = JSON.parse(atob(parts[1]));
      
      // Verificar que tenga campos básicos esperados
      if (!payload.sub || !payload.exp || !payload.iat) {
        console.warn('⚠️ [authService] Token no tiene campos JWT requeridos');
        return false;
      }
      
      // Verificar que no haya expirado
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        console.warn('⚠️ [authService] Token ha expirado');
        return false;
      }
      
      return true;
    } catch (error) {
      console.warn('⚠️ [authService] Error al validar token:', error);
      return false;
    }
  },

  /**
   * Limpia tokens corruptos automáticamente
   */
  cleanupCorruptedToken(): void {
    if (!this.isTokenValid()) {
      console.log('🧹 [authService] Limpiando token corrupto...');
      this.clearLocalStorage();
    }
  },

  /**
   * Fuerza la limpieza completa del localStorage
   * Útil para resolver problemas de tokens corruptos
   */
  forceCleanup(): void {
    console.log('🚨 [authService] FORZANDO limpieza completa...');
    this.clearLocalStorage();
    
    // Limpiar también el store de Zustand
    if (typeof window !== 'undefined' && window.location) {
      console.log('🔄 [authService] Recargando página para aplicar cambios...');
      window.location.reload();
    }
  },

  /**
   * Diagnóstico completo del token actual
   */
  diagnoseToken(): void {
    console.log('🔍 [authService] === DIAGNÓSTICO DE TOKEN ===');
    
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    console.log('🔑 Token presente:', !!token);
    console.log('👤 Usuario presente:', !!user);
    
    if (token) {
      console.log('🔑 Token (primeros 30 chars):', token.substring(0, 30) + '...');
      console.log('🔑 Longitud del token:', token.length);
      console.log('🔑 Token válido (formato):', this.isTokenValid());
      
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          console.log('📋 Payload del token:', payload);
          console.log('⏰ Expira en:', new Date(payload.exp * 1000).toLocaleString());
          console.log('⏰ Creado en:', new Date(payload.iat * 1000).toLocaleString());
        }
      } catch (e) {
        console.log('❌ Error decodificando token:', e);
      }
    }
    
    if (user) {
      try {
        const userData = JSON.parse(user);
        console.log('👤 Datos del usuario:', userData);
      } catch (e) {
        console.log('❌ Error parseando usuario:', e);
      }
    }
    
    console.log('🔍 === FIN DIAGNÓSTICO ===');
  },

  /**
   * Limpia todos los datos del localStorage
   */
  clearLocalStorage(): void {
    console.log('🧹 [authService] Limpiando todos los datos locales...');
    
    // Limpiar datos de autenticación del sistema principal
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('auth-storage');
    
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
    
    // Limpiar headers de autenticación de la instancia de axios
    delete api.defaults.headers.common['Authorization'];
    delete api.defaults.headers.Authorization;
    
    console.log('✅ [authService] Limpieza local completada');
  }
}