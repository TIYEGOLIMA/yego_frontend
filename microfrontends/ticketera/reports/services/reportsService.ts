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

export const reportsService = {
  async getSACPerformanceReports(params?: { fechaInicio?: string; fechaFin?: string }): Promise<ReportData> {
    try {
      const response = await api.get('/ticketera/sac-stats', { params });
      return response.data;
    } catch (error) {
      console.error('[reportsService] Error obteniendo reportes:', error);
      throw error;
    }
  },

  async obtenerTodoElHistorial(): Promise<ReportData> {
    try {
      const response = await api.get('/ticketera/sac-stats/all');
      return response.data;
    } catch (error) {
      console.error('[reportsService] Error obteniendo todo el historial:', error);
      throw error;
    }
  },

  async exportarAExcel(params?: { fechaInicio?: string; fechaFin?: string }): Promise<Blob> {
    try {
      if (params && params.fechaInicio && params.fechaFin) {
        const response = await api.get('/ticketera/sac-stats/export/excel', {
          params: {
            fechaInicio: params.fechaInicio,
            fechaFin: params.fechaFin
          },
          responseType: 'blob'
        });
        return response.data;
      } else {
        const response = await api.get('/ticketera/sac-stats/export/excel', {
          responseType: 'blob'
        });
        return response.data;
      }
    } catch (error) {
      console.error('[reportsService] Error exportando a Excel:', error);
      throw error;
    }
  },

  async exportarAImagen(formato: string, params?: { fechaInicio?: string; fechaFin?: string }): Promise<Blob> {
    try {
      if (params && params.fechaInicio && params.fechaFin) {
        const response = await api.get(`/ticketera/sac-stats/export/image/${formato}`, {
          params: {
            fechaInicio: params.fechaInicio,
            fechaFin: params.fechaFin
          },
          responseType: 'blob'
        });
        return response.data;
      } else {
        const response = await api.get(`/ticketera/sac-stats/export/image/${formato}`, {
          responseType: 'blob'
        });
        return response.data;
      }
    } catch (error) {
      console.error('[reportsService] Error exportando a imagen:', error);
      throw error;
    }
  }
};
