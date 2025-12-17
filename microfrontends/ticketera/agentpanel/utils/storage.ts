// 🔒 SERVICIO DE ALMACENAMIENTO SEGURO
// Maneja errores de localStorage y proporciona fallbacks

interface StorageService {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
  clear: () => void
}

// 🚫 FALLBACK: Almacenamiento en memoria cuando localStorage no está disponible
class MemoryStorage implements StorageService {
  private store = new Map<string, string>()

  getItem(key: string): string | null {
    return this.store.get(key) || null
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }
}

// 🔒 ALMACENAMIENTO SEGURO CON FALLBACKS
class SafeStorage implements StorageService {
  private localStorage: Storage | null = null
  private fallback: MemoryStorage

  constructor() {
    this.fallback = new MemoryStorage()
    this.initializeLocalStorage()
  }

  private initializeLocalStorage(): void {
    try {
      // Verificar si localStorage está disponible
      if (typeof window !== 'undefined' && window.localStorage) {
        // Probar acceso a localStorage
        const testKey = '__test__'
        localStorage.setItem(testKey, 'test')
        localStorage.removeItem(testKey)
        this.localStorage = localStorage
      } else {
        console.warn('⚠️ [SafeStorage] localStorage no disponible, usando fallback en memoria')
      }
    } catch (error) {
      console.warn('⚠️ [SafeStorage] Error accediendo a localStorage, usando fallback en memoria:', error)
    }
  }

  getItem(key: string): string | null {
    try {
      if (this.localStorage) {
        return this.localStorage.getItem(key)
      }
    } catch (error) {
      console.warn(`⚠️ [SafeStorage] Error obteniendo ${key} del localStorage:`, error)
    }
    
    // Fallback a memoria
    return this.fallback.getItem(key)
  }

  setItem(key: string, value: string): void {
    try {
      if (this.localStorage) {
        this.localStorage.setItem(key, value)
        return
      }
    } catch (error) {
      console.warn(`⚠️ [SafeStorage] Error guardando ${key} en localStorage:`, error)
    }
    
    // Fallback a memoria
    this.fallback.setItem(key, value)
  }

  removeItem(key: string): void {
    try {
      if (this.localStorage) {
        this.localStorage.removeItem(key)
        return
      }
    } catch (error) {
      console.warn(`⚠️ [SafeStorage] Error removiendo ${key} del localStorage:`, error)
    }
    
    // Fallback a memoria
    this.fallback.removeItem(key)
  }

  clear(): void {
    try {
      if (this.localStorage) {
        this.localStorage.clear()
        return
      }
    } catch (error) {
      console.warn('⚠️ [SafeStorage] Error limpiando localStorage:', error)
    }
    
    // Fallback a memoria
    this.fallback.clear()
  }

  // 🔍 FUNCIÓN DE DEBUG: Verificar estado del almacenamiento
  getStatus(): { localStorage: boolean; fallback: boolean } {
    return {
      localStorage: this.localStorage !== null,
      fallback: true
    }
  }
}

// 📦 INSTANCIA GLOBAL DEL SERVICIO DE ALMACENAMIENTO SEGURO
export const safeStorage = new SafeStorage()

// 🔧 FUNCIONES DE CONVENIENCIA
export const safeGetItem = (key: string): string | null => safeStorage.getItem(key)
export const safeSetItem = (key: string, value: string): void => safeStorage.setItem(key, value)
export const safeRemoveItem = (key: string): void => safeStorage.removeItem(key)
export const safeClear = (): void => safeStorage.clear()

// 🔍 FUNCIÓN DE DEBUG GLOBAL
export const debugStorage = () => {
  // Exponer funciones de debug globalmente
  if (typeof window !== 'undefined') {
    (window as any).debugStorage = debugStorage
  }
}

// 🚀 INICIALIZAR DEBUG EN DESARROLLO
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  // Llamar la función sin argumentos
  debugStorage()
}