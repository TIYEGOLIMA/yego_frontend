import { api } from './core/api';

export interface SistemaExternoResponse {
  id: number;
  nombre: string;
  descripcion: string;
  path: string;
  urlCompleta: string;
  estado: 'ACTIVO' | 'MANTENIMIENTO' | 'ERROR' | 'INACTIVO';
  tipo: string;
  ultimoCheck: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSistemaExternoData {
  nombre: string;
  descripcion: string;
  url: string;
}

export interface SistemaEstadoCambiadoEvent {
  sistemaId: number;
  nombre: string;
  path: string;
  urlCompleta: string;
  estadoAnterior: string;
  estadoNuevo: string;
  tipo: string;
  timestamp: string;
}

export interface SistemaVerificadoEvent {
  sistemaId: number;
  nombre: string;
  path: string;
  urlCompleta: string;
  estado: string;
  tipo: string;
  timestamp: string;
  exitoso: boolean;
  mensaje: string;
}

export class SistemasExternosService {
  private static readonly BASE_URL = '/sistemas-externos';

  /**
   * Obtener todos los sistemas externos
   */
  static async getAll(): Promise<SistemaExternoResponse[]> {
    const response = await api.get(this.BASE_URL);
    return response.data;
  }

  /**
   * Obtener sistema externo por ID
   */
  static async getById(id: number): Promise<SistemaExternoResponse> {
    const response = await api.get(`${this.BASE_URL}/${id}`);
    return response.data;
  }

  /**
   * Crear nuevo sistema externo
   */
  static async create(data: CreateSistemaExternoData): Promise<SistemaExternoResponse> {
    const response = await api.post(this.BASE_URL, data);
    return response.data;
  }

  /**
   * Actualizar sistema externo
   */
  static async update(id: number, data: CreateSistemaExternoData): Promise<SistemaExternoResponse> {
    const response = await api.put(`${this.BASE_URL}/${id}`, data);
    return response.data;
  }

  /**
   * Cambiar estado de un sistema externo
   */
  static async changeEstado(id: number, estado: string): Promise<void> {
    await api.put(`${this.BASE_URL}/${id}/estado?estado=${estado}`);
  }

  /**
   * Verificar estado de un sistema externo (ping)
   */
  static async verificar(id: number): Promise<void> {
    await api.post(`${this.BASE_URL}/${id}/verificar`);
  }

  /**
   * Eliminar sistema externo
   */
  static async delete(id: number): Promise<void> {
    await api.delete(`${this.BASE_URL}/${id}`);
  }

  /**
   * Buscar sistemas externos por término
   */
  static async search(termino: string): Promise<SistemaExternoResponse[]> {
    const response = await api.get(`${this.BASE_URL}/buscar?termino=${encodeURIComponent(termino)}`);
    return response.data;
  }

  /**
   * Construir URL completa basada en el path
   */
  static construirUrlCompleta(path: string): string {
    const baseUrl = import.meta.env.VITE_BASE_URL || 'http://localhost:5173';
    return baseUrl + path;
  }

  /**
   * Formatear timestamp para mostrar
   */
  static formatTimestamp(timestamp: string): string {
    return new Date(timestamp).toLocaleString('es-PE');
  }

  /**
   * Obtener color según estado
   */
  static getEstadoColor(estado: string): string {
    const colors = {
      'ACTIVO': 'green',
      'MANTENIMIENTO': 'orange',
      'ERROR': 'red',
      'INACTIVO': 'gray'
    };
    return colors[estado as keyof typeof colors] || 'gray';
  }

  /**
   * Obtener icono según estado
   */
  static getEstadoIcon(estado: string): string {
    const icons = {
      'ACTIVO': 'check-circle',
      'MANTENIMIENTO': 'pause',
      'ERROR': 'alert-circle',
      'INACTIVO': 'x'
    };
    return icons[estado as keyof typeof icons] || 'activity';
  }
}

export default SistemasExternosService;
