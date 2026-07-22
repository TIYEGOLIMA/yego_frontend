import { beforeEach, describe, expect, it, vi } from 'vitest';

import api from '@/services/core/api';
import { reportsService } from './reportsService';

vi.mock('@/services/core/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockedGet = vi.mocked(api.get);

describe('reportsService', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('envía sede y fechas al consultar el reporte', async () => {
    mockedGet.mockResolvedValueOnce({ data: { totalTickets: 1 } });

    await reportsService.getSACPerformanceReports({
      fechaInicio: '2026-07-01',
      fechaFin: '2026-07-16',
      sedeId: 10,
    });

    expect(mockedGet).toHaveBeenCalledWith('/ticketera/sac-stats', expect.objectContaining({
      params: { fechaInicio: '2026-07-01', fechaFin: '2026-07-16', sedeId: 10 },
    }));
  });

  it('mantiene sedeId al exportar Excel e imagen', async () => {
    mockedGet.mockResolvedValue({ data: new Blob() });

    await reportsService.exportarAExcel({ sedeId: 20 });
    await reportsService.exportarAImagen('png', { sedeId: 20 });

    expect(mockedGet).toHaveBeenNthCalledWith(1, '/ticketera/sac-stats/export/excel', {
      params: { sedeId: 20 },
      responseType: 'blob',
    });
    expect(mockedGet).toHaveBeenNthCalledWith(2, '/ticketera/sac-stats/export/image/png', {
      params: { sedeId: 20 },
      responseType: 'blob',
    });
  });

  it('envía página, tamaño y filtros al consultar trazabilidad', async () => {
    mockedGet.mockResolvedValueOnce({ data: { content: [], totalElements: 0 } });

    await reportsService.getTicketTraceability({
      fechaInicio: '2026-07-01',
      fechaFin: '2026-07-16',
      sedeId: 10,
      page: 2,
      size: 50,
    });

    expect(mockedGet).toHaveBeenCalledWith('/ticketera/sac-stats/traceability', {
      params: {
        fechaInicio: '2026-07-01',
        fechaFin: '2026-07-16',
        sedeId: 10,
        page: 2,
        size: 50,
      },
      signal: undefined,
    });
  });
});
