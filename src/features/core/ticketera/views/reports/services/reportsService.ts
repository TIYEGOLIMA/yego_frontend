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
  resolutionPercentage: number;
  averageServiceTime: string;
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

export interface TicketTraceabilityPage {
  content: TicketTraceability[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface OptionSelection {
  optionId: number;
  categoryName: string | null;
  optionName: string;
  count: number;
  percentage: number;
}

export interface OptionSelectionsBySede {
  sedeId: number;
  sedeName: string;
  totalTickets: number;
  options: OptionSelection[];
}

export interface ReportData {
  totalTickets: number;
  averageRating: number;
  totalRatings: number;
  openTickets: number;
  completedTickets: number;
  cancelledTickets: number;
  sacPerformance: SACPerformance[];
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
  optionSelectionsBySede: OptionSelectionsBySede[];
}

export interface ReportFilters {
  fechaInicio?: string;
  fechaFin?: string;
  sedeId?: number;
}

export interface TicketTraceabilityFilters extends ReportFilters {
  page: number;
  size: number;
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

  async getTicketTraceability(
    params: TicketTraceabilityFilters,
    signal?: AbortSignal,
  ): Promise<TicketTraceabilityPage> {
    const response = await api.get('/ticketera/sac-stats/traceability', {
      params: { ...buildParams(params), page: params.page, size: params.size },
      signal,
    });
    return response.data;
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
