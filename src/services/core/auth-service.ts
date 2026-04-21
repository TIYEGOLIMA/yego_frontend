import type { AxiosResponse } from 'axios'
import api from './api'
import { getAccessTokenFromResponse } from './auth-token-header'

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

export interface AuthUser {
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

/** Login y refresh: token + mensaje; el usuario puede venir en el cuerpo (mismo shape que getProfile). */
export interface AuthResponse {
  accessToken: string;
  message?: string;
  user?: AuthUser;
}

function resolveAccessToken(
  data: { accessToken?: string } | undefined,
  response: AxiosResponse
): string | undefined {
  if (typeof data?.accessToken === 'string' && data.accessToken.length > 0) {
    return data.accessToken
  }
  return getAccessTokenFromResponse(response)
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const inflightProfile = new Map<string, Promise<AuthUser>>()

export const authService = {
  /**
   * Inicia sesión con credenciales de usuario
   * @param credentials Credenciales (username y password)
   * @returns Respuesta con token y datos del usuario
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await api.post<{
        message?: string
        accessToken?: string
        user?: AuthUser
      }>('/auth/login', credentials)
      const accessToken = resolveAccessToken(response.data, response)
      if (!accessToken) {
        throw new Error('No se recibió token de acceso (cuerpo ni header X-Access-Token)')
      }
      const user =
        response.data?.user != null
          ? response.data.user
          : await authService.getProfile(accessToken)
      return { accessToken, message: response.data?.message, user }
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
   * Obtiene el perfil del usuario autenticado.
   * Deduplica peticiones simultáneas con el mismo token (evita doble call por StrictMode
   * o por providers/hook montados en paralelo).
   * @param token Token de autenticación
   * @returns Datos del perfil del usuario
   */
  async getProfile(token: string): Promise<AuthUser> {
    const existing = inflightProfile.get(token)
    if (existing) return existing

    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    const promise = api
      .get<AuthUser>('/auth/profile')
      .then((response) => response.data)
      .catch((error: any) => {
        console.error('Error obteniendo perfil:', error.response?.data || error.message);
        throw error;
      })
      .finally(() => {
        inflightProfile.delete(token)
      })

    inflightProfile.set(token, promise)
    return promise
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
      const response = await api.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ [authService] Error en cambio de contraseña:', error.response?.data || error.message);
      
      // Extraer mensaje del backend si existe
      const backendMessage = error.response?.data?.message || error.response?.data?.error;
  
      
      // Para errores 400, 401, 403, 422 - probablemente validación de contraseña
      if ([400, 401, 403, 422].includes(error.response?.status)) {
        throw new Error('La contraseña actual es incorrecta');
      }
      
      // Para error 500 - probablemente también es contraseña incorrecta en este contexto
      if (error.response?.status === 500) {
        throw new Error('La contraseña actual es incorrecta');
      }
      
      // Para otros errores, usar el mensaje del backend o mensaje genérico
      throw new Error(backendMessage || 'Error al cambiar la contraseña. Verifique los datos ingresados');
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
   * Renueva el token JWT actual
   * @returns Nueva respuesta de autenticación con token renovado
   */
  async refreshToken(): Promise<AuthResponse> {
    try {
      const response = await api.post<{
        message?: string
        accessToken?: string
        user?: AuthUser
      }>('/auth/refresh')
      const accessToken = resolveAccessToken(response.data, response)
      if (!accessToken) {
        throw new Error('No se recibió token de acceso (cuerpo ni header X-Access-Token)')
      }
      const user =
        response.data?.user != null
          ? response.data.user
          : await authService.getProfile(accessToken)
      return { accessToken, message: response.data?.message, user }
    } catch (error: any) {
      console.error('❌ [authService] Error renovando token:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Verifica si el token actual es válido
   * @returns true si el token es válido, false si no
   */
  async verifyToken(): Promise<boolean> {
    try {
      await api.get('/auth/verify');
      return true;
    } catch (error: any) {
      console.warn('⚠️ [authService] Token inválido:', error.response?.data || error.message);
      return false;
    }
  },

  /**
   * Cierra la sesión del usuario actual
   * Utiliza el endpoint /logout del backend que maneja la invalidación del token
   */
  async logout(): Promise<void> {
    try {
      // Leer token desde auth-storage (Zustand persist)
      let token: string | null = null;
      try {
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
          const parsed = JSON.parse(authStorage);
          token = parsed?.state?.token || null;
        }
      } catch (err) {
        // Fallback: intentar leer desde token directo (compatibilidad temporal)
        token = localStorage.getItem('token');
      }
      
      if (token) {
        try {
          await api.post('/auth/logout', {}, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
        } catch (error: any) {
          console.warn('⚠️ [authService] Error en logout del backend:', error);
        }
      }
      
      // 🎯 Limpiar datos locales SIEMPRE (esto es lo más importante)
      this.clearLocalStorage();
      
    } catch (error) {
      console.error('❌ [authService] Error en logout:', error);
      this.clearLocalStorage();
    }
  },

  /**
   * Verifica si el token actual es válido
   * @returns true si el token es válido, false si está corrupto
   */
  isTokenValid(): boolean {
    // Leer token desde auth-storage (Zustand persist)
    let token: string | null = null;
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        token = parsed?.state?.token || null;
      }
    } catch (err) {
      // Fallback: intentar leer desde token directo (compatibilidad temporal)
      token = localStorage.getItem('token');
    }
    
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
      this.clearLocalStorage();
    }
  },

  /**
   * Fuerza la limpieza completa del localStorage
   * Útil para resolver problemas de tokens corruptos
   */
  forceCleanup(): void {
    this.clearLocalStorage();
    
    if (typeof window !== 'undefined' && window.location) {
      window.location.reload();
    }
  },

  /**
   * Diagnóstico completo del token actual
   */
  diagnoseToken(): void {
    let token: string | null = null;
    let authStorageData: any = null;
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        authStorageData = JSON.parse(authStorage);
        token = authStorageData?.state?.token || null;
      }
    } catch (err) {
      token = localStorage.getItem('token');
    }
    
    const user = authStorageData?.state?.user || null;
    
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          JSON.parse(atob(parts[1]));
        }
      } catch (e) {
      }
    }
    
    if (user) {
      try {
        JSON.parse(user);
      } catch (e) {
      }
    }
  },

  /**
   * Obtiene los módulos permitidos para el usuario autenticado
   * @returns Array de módulos permitidos según el rol del usuario
   */
  async getMyModules(): Promise<any[]> {
    try {
      const response = await api.get('/auth/my-modules');
      const modules = Array.isArray(response.data) ? response.data : [];
      return modules;
    } catch (error: any) {
      console.error('❌ [authService] Error obteniendo módulos:', error.response?.data || error.message);
      // 403 PASSWORD_EXPIRED = política semanal; reenviar el error para que el store no haga logout
      if (error.response?.status === 403 && error.response?.data?.error === 'PASSWORD_EXPIRED') {
        throw error;
      }
      // Si es error de autorización, el token puede estar expirado
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.warn('⚠️ [authService] Token inválido o expirado al obtener módulos');
        throw new Error('Token inválido o expirado');
      }
      throw error;
    }
  },

  /**
   * Limpia todos los datos del localStorage
   */
  clearLocalStorage(): void {
    localStorage.removeItem('auth-storage');
    
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('selectedModule_') || key.startsWith('selectedModuleName_')) {
        localStorage.removeItem(key);
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
    
    // Zustand persist limpiará auth-storage automáticamente, no necesitamos limpiar user-modules por separado
    
    // Limpiar headers de autenticación de la instancia de axios
    delete api.defaults.headers.common['Authorization'];
    delete api.defaults.headers.Authorization;
    
  }
}