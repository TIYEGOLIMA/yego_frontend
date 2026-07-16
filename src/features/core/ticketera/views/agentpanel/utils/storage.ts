interface StorageService {
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

class MemoryStorage implements StorageService {
  private store = new Map<string, string>()

  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }

  removeItem(key: string): void {
    this.store.delete(key)
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

}

const safeStorage = new SafeStorage()

export const safeSetItem = (key: string, value: string): void => safeStorage.setItem(key, value)
export const safeRemoveItem = (key: string): void => safeStorage.removeItem(key)
