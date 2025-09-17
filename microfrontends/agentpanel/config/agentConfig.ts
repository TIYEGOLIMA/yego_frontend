// 🎯 CONFIGURACIÓN DEL PANEL DE AGENTE
export const AGENT_CONFIG = {
  // 🎯 Configuración de WebSocket
  DISABLE_WEBSOCKET: false, // WebSocket habilitado globalmente
  WEBSOCKET_ONLY_TVDISPLAY: false, // WebSocket disponible para más componentes
  
  // 🎯 Configuración de polling automático
  AUTO_REFRESH_INTERVAL: 30000, // 30 segundos (reducido para WebSocket)
  
  // 🎯 Configuración de almacenamiento
  STORAGE_KEYS: {
    USER_MODULE_NAME_PREFIX: 'user_module_name_',
    USER_MODULE_PREFIX: 'selectedModule_'
  }
}

export const getModuleStorageKey = (userId: number, key: string) => {
  return `${AGENT_CONFIG.STORAGE_KEYS.USER_MODULE_PREFIX}${userId}_${key}`
}

export const getModuleNameStorageKey = (userId: number) => {
  return `${AGENT_CONFIG.STORAGE_KEYS.USER_MODULE_NAME_PREFIX}${userId}`
}