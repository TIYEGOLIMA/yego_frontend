// 🎫 FEATURES DEL SISTEMA TICKETERA
// Export de todas las features relacionadas con gestión de tickets

// Módulos de ticketera
export { default as TicketsModule } from './tickets/tickets.module';

// Componentes específicos de tickets
export { default as AgentPanelAdapted } from './tickets/AgentPanelAdapted';
export { default as TicketeraWrapper } from './tickets/TicketeraWrapper';

// 🎯 CONFIGURACIÓN DE FEATURES TICKETERA
export const TICKETERA_FEATURES_CONFIG = {
  name: 'Sistema Ticketera',
  description: 'Features de gestión de tickets, colas y atención al cliente',
  version: '1.0.0',
  features: [
    'tickets'
    // 🎯 FUTURO: 'queues', 'ratings', 'analytics'
  ]
} as const;
