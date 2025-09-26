// 🎯 CONFIGURACIÓN ESPECÍFICA DE TICKETERA
export const TICKETERA_SERVICE_CONFIG = {
  name: 'Ticketera Services',
  version: '1.0.0',
  description: 'Servicios para gestión de tickets y colas de atención',
  endpoints: {
    tickets: '/api/ticketera/tickets',
    queues: '/api/ticketera/queues',
    modules: '/api/ticketera/modulo-atencion',
    ratings: '/api/ticketera/ratings'
  }
} as const;
