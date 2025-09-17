// Configuración optimizada para WebSocket - Ultra rápida
export const WEBSOCKET_CONFIG = {
  // Configuración de conexión
  connection: {
    reconnectDelay: 10, // Reconexión ultra rápida
    heartbeatIncoming: 100, // Heartbeat muy frecuente
    heartbeatOutgoing: 100, // Heartbeat muy frecuente
    connectionTimeout: 500, // Timeout agresivo
    maxReconnectAttempts: 20, // Más intentos de reconexión
  },
  
  // Configuración de actualizaciones en lote
  batchUpdates: {
    enabled: false, // Desactivar para actualizaciones instantáneas
    defaultDelay: 0, // Sin delay
    tvDisplayDelay: 0, // Sin delay
    agentPanelDelay: 0, // Sin delay
    maxBatchSize: 1, // Sin batching
  },
  
  // Configuración de latencia
  latency: {
    monitoringEnabled: true,
    updateInterval: 5000, // Actualizar latencia cada 5 segundos
    maxLatency: 1000, // Latencia máxima aceptable (ms)
    minLatency: 10, // Latencia mínima simulada (ms)
    maxSimulatedLatency: 60, // Latencia máxima simulada (ms)
  },
  
  // Configuración de tópicos
  topics: {
    newTicket: '/topic/new-ticket',
    ticketCalled: '/topic/ticket-called',
    ticketStarted: '/topic/ticket-started',
    ticketCompleted: '/topic/ticket-completed',
    ticketCancelled: '/topic/ticket-cancelled',
  },
  
  // Configuración de rendimiento
  performance: {
    enableDebug: false, // Desactivar debug para mejor rendimiento
    enableLogs: false, // Desactivar logs para mejor rendimiento
    maxPendingUpdates: 100, // Máximo de actualizaciones pendientes
    cleanupInterval: 30000, // Limpiar cada 30 segundos
  }
}

// Función para obtener configuración específica por componente
export const getWebSocketConfig = (component: 'tv' | 'agent' | 'tablet') => {
  const baseConfig = {
    enableBatchUpdates: WEBSOCKET_CONFIG.batchUpdates.enabled,
    maxBatchSize: WEBSOCKET_CONFIG.batchUpdates.maxBatchSize,
  }
  
  switch (component) {
    case 'tv':
      return {
        ...baseConfig,
        batchDelay: WEBSOCKET_CONFIG.batchUpdates.tvDisplayDelay,
        enableLatencyMonitoring: true,
      }
    case 'agent':
      return {
        ...baseConfig,
        batchDelay: WEBSOCKET_CONFIG.batchUpdates.agentPanelDelay,
        enableLatencyMonitoring: true,
      }
    case 'tablet':
      return {
        ...baseConfig,
        batchDelay: WEBSOCKET_CONFIG.batchUpdates.defaultDelay,
        enableLatencyMonitoring: false,
      }
    default:
      return baseConfig
  }
}

// Función para calcular delay de reconexión exponencial
export const calculateReconnectDelay = (attempt: number): number => {
  const baseDelay = WEBSOCKET_CONFIG.connection.reconnectDelay
  const maxDelay = 5000
  return Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
}

// Función para validar latencia
export const isLatencyAcceptable = (latency: number): boolean => {
  return latency <= WEBSOCKET_CONFIG.latency.maxLatency
}