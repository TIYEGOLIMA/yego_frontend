interface StorageService {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
  clear: () => void
}

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

class SafeStorage implements StorageService {
  private localStorage: Storage | null = null
  private fallback: MemoryStorage

  constructor() {
    this.fallback = new MemoryStorage()
    this.initializeLocalStorage()
  }

  private initializeLocalStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const testKey = '__test__'
        localStorage.setItem(testKey, 'test')
        localStorage.removeItem(testKey)
        this.localStorage = localStorage
      }
    } catch {
      /* use in-memory fallback */
    }
  }

  getItem(key: string): string | null {
    try {
      if (this.localStorage) {
        return this.localStorage.getItem(key)
      }
    } catch {
      /* fall through */
    }
    return this.fallback.getItem(key)
  }

  setItem(key: string, value: string): void {
    try {
      if (this.localStorage) {
        this.localStorage.setItem(key, value)
        return
      }
    } catch {
      /* fall through */
    }
    this.fallback.setItem(key, value)
  }

  removeItem(key: string): void {
    try {
      if (this.localStorage) {
        this.localStorage.removeItem(key)
        return
      }
    } catch {
      /* fall through */
    }
    this.fallback.removeItem(key)
  }

  clear(): void {
    try {
      if (this.localStorage) {
        this.localStorage.clear()
        return
      }
    } catch {
      /* fall through */
    }
    this.fallback.clear()
  }

  getStatus(): { localStorage: boolean; fallback: boolean } {
    return {
      localStorage: this.localStorage !== null,
      fallback: true
    }
  }
}

export const safeStorage = new SafeStorage()

export const safeGetItem = (key: string): string | null => safeStorage.getItem(key)
export const safeSetItem = (key: string, value: string): void => safeStorage.setItem(key, value)
export const safeRemoveItem = (key: string): void => safeStorage.removeItem(key)
export const safeClear = (): void => safeStorage.clear()

export const debugStorage = () => {
  if (typeof window !== 'undefined') {
    (window as any).debugStorage = debugStorage
  }
}

if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  debugStorage()
}
