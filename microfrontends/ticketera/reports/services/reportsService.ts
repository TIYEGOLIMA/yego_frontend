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
  // Obtener reportes de desempeño SAC con filtro de fechas
  async getSACPerformanceReports(params?: { fechaInicio?: string; fechaFin?: string }): Promise<ReportData> {
    try {
      console.log('📊 [reportsService] Obteniendo reportes de SAC con filtro de fechas...', params);
      const response = await api.get('/ticketera/sac-stats', { params });
      console.log('✅ [reportsService] Reportes obtenidos con filtro:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [reportsService] Error obteniendo reportes:', error);
      throw error;
    }
  },

  // Obtener todas las estadísticas sin filtro (histórico completo)
  async obtenerTodoElHistorial(): Promise<ReportData> {
    try {
      const response = await api.get('/ticketera/sac-stats/all');
      return response.data;
    } catch (error) {
      console.error('❌ [reportsService] Error obteniendo todo el historial:', error);
      throw error;
    }
  },

  // Exportar reportes a Excel
  async exportarAExcel(params?: { fechaInicio?: string; fechaFin?: string }): Promise<Blob> {
    try {
      // Si hay parámetros de fecha, enviarlos; si no, enviar sin params (historial completo)
      if (params && params.fechaInicio && params.fechaFin) {
        console.log('📊 [reportsService] Exportando reportes a Excel con filtro de fechas:', params);
        const response = await api.get('/ticketera/sac-stats/export/excel', {
          params: {
            fechaInicio: params.fechaInicio,
            fechaFin: params.fechaFin
          },
          responseType: 'blob'
        });
        console.log('✅ [reportsService] Reportes exportados a Excel con filtro');
        return response.data;
      } else {
        console.log('📊 [reportsService] Exportando todo el historial a Excel (sin filtros)');
      const response = await api.get('/ticketera/sac-stats/export/excel', {
        responseType: 'blob'
      });
        console.log('✅ [reportsService] Historial completo exportado a Excel');
      return response.data;
      }
    } catch (error) {
      console.error('❌ [reportsService] Error exportando a Excel:', error);
      throw error;
    }
  },

  // Exportar reportes a imagen
  async exportarAImagen(formato: string, params?: { fechaInicio?: string; fechaFin?: string }): Promise<Blob> {
    try {
      // Si hay parámetros de fecha, enviarlos; si no, enviar sin params (historial completo)
      if (params && params.fechaInicio && params.fechaFin) {
        console.log('📊 [reportsService] Exportando reportes a imagen con filtro de fechas:', formato, params);
        const response = await api.get(`/ticketera/sac-stats/export/image/${formato}`, {
          params: {
            fechaInicio: params.fechaInicio,
            fechaFin: params.fechaFin
          },
          responseType: 'blob'
        });
        console.log('✅ [reportsService] Reportes exportados a imagen con filtro');
        return response.data;
      } else {
        console.log('📊 [reportsService] Exportando todo el historial a imagen (sin filtros):', formato);
      const response = await api.get(`/ticketera/sac-stats/export/image/${formato}`, {
        responseType: 'blob'
      });
        console.log('✅ [reportsService] Historial completo exportado a imagen');
      return response.data;
      }
    } catch (error) {
      console.error('❌ [reportsService] Error exportando a imagen:', error);
      throw error;
    }
  }
};
