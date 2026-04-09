import api from './core/api'
import { getAccessTokenFromResponse } from './core/auth-token-header'
import type { AuthUser } from './core/auth-service'

export interface TicketeraAuthResponse {
  accessToken: string;
  message?: string;
  user?: AuthUser;
}

export const ticketeraAuthService = {
  /**
   * Renueva el token JWT para el módulo de ticketera
   * @returns Nueva respuesta de autenticación con token renovado
   */
  async refreshToken(): Promise<TicketeraAuthResponse> {
    try {
      console.log('🔄 [ticketeraAuthService] Renovando token JWT para ticketera...');
      const response = await api.post<{
        message?: string
        accessToken?: string
        user?: AuthUser
      }>('/ticketera/auth/refresh');
      const accessToken =
        (typeof response.data?.accessToken === 'string' && response.data.accessToken) ||
        getAccessTokenFromResponse(response);
      if (!accessToken) {
        throw new Error('No se recibió token de acceso (cuerpo ni header X-Access-Token)');
      }
      console.log('✅ [ticketeraAuthService] Token renovado exitosamente');
      return { accessToken, message: response.data?.message, user: response.data?.user };
    } catch (error: any) {
      console.error('❌ [ticketeraAuthService] Error renovando token:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Verifica si el token actual es válido para ticketera
   * @returns true si el token es válido, false si no
   */
  async verifyToken(): Promise<boolean> {
    try {
      console.log('🔍 [ticketeraAuthService] Verificando token JWT para ticketera...');
      await api.get('/ticketera/auth/verify');
      console.log('✅ [ticketeraAuthService] Token válido');
      return true;
    } catch (error: any) {
      console.warn('⚠️ [ticketeraAuthService] Token inválido:', error.response?.data || error.message);
      return false;
    }
  }
}
