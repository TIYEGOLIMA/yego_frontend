// 🎯 CONFIGURACIÓN ESPECÍFICA DEL AGENTPANEL
export const AGENT_CONFIG = {
  // 🔄 Configuración de refresco (fallback para cuando no hay WebSocket)
  AUTO_REFRESH_INTERVAL: 30000, // 30 segundos
  
  // 💾 Configuración de almacenamiento local
  STORAGE_KEYS: {
    USER_MODULE_NAME_PREFIX: 'user_module_name_',
    USER_MODULE_PREFIX: 'selectedModule_'
  },
  
  // 🎫 Configuración de tickets
  MAX_TICKETS_PER_STATUS: 50,
  TICKET_REFRESH_INTERVAL: 5000, // 5 segundos para HTTP polling fallback
}

export const getModuleStorageKey = (userId: number, key: string) => {
  return `${AGENT_CONFIG.STORAGE_KEYS.USER_MODULE_PREFIX}${userId}_${key}`
}

export const getModuleNameStorageKey = (userId: number) => {
  return `${AGENT_CONFIG.STORAGE_KEYS.USER_MODULE_NAME_PREFIX}${userId}`
}