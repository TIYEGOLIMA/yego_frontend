import api from '@/services/core/api';

export interface SACPerformance {
  id: number;
  name: string;
  username: string;
  sedeId: number | null;
  sedeName: string;
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

export interface TicketTraceEvent {
  status: string;
  label: string;
  occurredAt: string;
  notes: string | null;
}

export interface TicketTraceability {
  id: number;
  ticketNumber: string;
  status: 'WAITING' | 'CALLED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  sedeId: number | null;
  sedeName: string;
  optionId: number | null;
  categoryName: string | null;
  optionName: string;
  licenseNumber: string | null;
  moduleId: number | null;
  moduleName: string | null;
  operatorId: number | null;
  operatorName: string | null;
  createdAt: string;
  calledAt: string | null;
  completedAt: string | null;
  rating: number | null;
  events: TicketTraceEvent[];
}

export interface ReportData {
  totalSACs: number;
  totalTickets: number;
  averageRating: number;
  totalRatings: number;
  openTickets?: number;
  completedTickets?: number;
  cancelledTickets?: number;
  traceabilityTotal?: number;
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
  hourlyDistribution: Array<{
    hour: number;
    label: string;
    count: number;
  }>;
  hourlyBySede: Array<{
    sedeId: number;
    sedeName: string;
    hourlyDistribution: Array<{
      hour: number;
      label: string;
      count: number;
    }>;
  }>;
  ticketTraceability?: TicketTraceability[];
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
  async getSACPerformanceReports(params?: ReportFilters, signal?: AbortSignal): Promise<ReportData> {
    try {
      const response = await api.get('/ticketera/sac-stats', { params: buildParams(params), signal });
      return response.data;
    } catch (error) {
      console.error('[reportsService] Error obteniendo reportes:', error);
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
