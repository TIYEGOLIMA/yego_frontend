import api from '../../../../src/services/core/api';

export interface SACPerformance {
  id: number;
  name: string;
  username: string;
  totalTickets: number;
  completedTickets: number;
  averageRating: number;
  totalRatings: number;
  satisfactionPercentage: number;
  averageResponseTime: string;
  ratings: Array<{
    id: number;
    score: number;
    comment: string;
    ticketNumber: string;
    date: string;
  }>;
}

export interface ReportData {
  totalSACs: number;
  totalTickets: number;
  averageRating: number;
  totalRatings: number;
  sacPerformance: SACPerformance[];
  topPerformers: SACPerformance[];
  recentRatings: Array<{
    id: number;
    sacName: string;
    score: number;
    comment: string;
    ticketNumber: string;
    date: string;
  }>;
}

export interface ReportFilters {
  fechaInicio?: string;
  fechaFin?: string;
  sedeId?: number;
}

const buildParams = (params?: ReportFilters): Record<string, string | number> | undefined => {
  if (!params) return undefined;
  const out: Record<string, string | number> = {};
  if (params.fechaInicio) out.fechaInicio = params.fechaInicio;
  if (params.fechaFin) out.fechaFin = params.fechaFin;
  if (params.sedeId !== undefined && params.sedeId !== null) out.sedeId = params.sedeId;
  return Object.keys(out).length ? out : undefined;
};

export const reportsService = {
  async getSACPerformanceReports(params?: ReportFilters): Promise<ReportData> {
    try {
      const response = await api.get('/ticketera/sac-stats', { params: buildParams(params) });
      return response.data;
    } catch (error) {
      console.error('[reportsService] Error obteniendo reportes:', error);
      throw error;
    }
  },

  async obtenerTodoElHistorial(params?: Pick<ReportFilters, 'sedeId'>): Promise<ReportData> {
    try {
      const response = await api.get('/ticketera/sac-stats', { params: buildParams(params) });
      return response.data;
    } catch (error) {
      console.error('[reportsService] Error obteniendo todo el historial:', error);
      throw error;
    }
  },

  async exportarAExcel(params?: ReportFilters): Promise<Blob> {
    try {
      const response = await api.get('/ticketera/sac-stats/export/excel', {
        params: buildParams(params),
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('[reportsService] Error exportando a Excel:', error);
      throw error;
    }
  },

  async exportarAImagen(formato: string, params?: ReportFilters): Promise<Blob> {
    try {
      const response = await api.get(`/ticketera/sac-stats/export/image/${formato}`, {
        params: buildParams(params),
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('[reportsService] Error exportando a imagen:', error);
      throw error;
    }
  }
};
