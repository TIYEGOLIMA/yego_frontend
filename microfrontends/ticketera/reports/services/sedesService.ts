import api from '../../../../src/services/core/api';

export interface SedeInfo {
  id: number;
  name: string;
  description: string;
  active: boolean;
}

export const sedesService = {
  async listarSedesActivas(): Promise<SedeInfo[]> {
    const response = await api.get('/ticketera/sedes');
    return response.data.filter((s: SedeInfo) => s.active);
  },
};
