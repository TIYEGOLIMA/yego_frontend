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
  lastActivity: string;
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
  // Obtener reportes de desempeño SAC
  async getSACPerformanceReports(): Promise<ReportData> {
    try {
      console.log('📊 [reportsService] Obteniendo reportes de SAC...');
      const response = await api.get('/ticketera/sac-stats');
      console.log('✅ [reportsService] Reportes obtenidos:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [reportsService] Error obteniendo reportes:', error);
      throw error;
    }
  },

  // Exportar reportes a Excel
  async exportarAExcel(): Promise<Blob> {
    try {
      console.log('📊 [reportsService] Exportando reportes a Excel...');
      const response = await api.get('/ticketera/sac-stats/export/excel', {
        responseType: 'blob'
      });
      console.log('✅ [reportsService] Reportes exportados a Excel');
      return response.data;
    } catch (error) {
      console.error('❌ [reportsService] Error exportando a Excel:', error);
      throw error;
    }
  },

  // Exportar reportes a imagen
  async exportarAImagen(formato: string): Promise<Blob> {
    try {
      console.log('📊 [reportsService] Exportando reportes a imagen:', formato);
      const response = await api.get(`/ticketera/sac-stats/export/image/${formato}`, {
        responseType: 'blob'
      });
      console.log('✅ [reportsService] Reportes exportados a imagen');
      return response.data;
    } catch (error) {
      console.error('❌ [reportsService] Error exportando a imagen:', error);
      throw error;
    }
  }
};
