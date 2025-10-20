import api from './core/api'

export interface TicketeraAuthResponse {
  accessToken: string;
  user: {
    id: number;
    username: string;
    email: string;
    name: string;
    role: string;
    moduleId?: string | null;
    active: boolean;
    lastLogin: string;
  };
}

export const ticketeraAuthService = {
  /**
   * Renueva el token JWT para el módulo de ticketera
   * @returns Nueva respuesta de autenticación con token renovado
   */
  async refreshToken(): Promise<TicketeraAuthResponse> {
    try {
      console.log('🔄 [ticketeraAuthService] Renovando token JWT para ticketera...');
      const response = await api.post<TicketeraAuthResponse>('/ticketera/auth/refresh');
      console.log('✅ [ticketeraAuthService] Token renovado exitosamente');
      return response.data;
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
