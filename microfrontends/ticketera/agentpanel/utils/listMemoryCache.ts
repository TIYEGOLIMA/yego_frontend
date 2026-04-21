/** TTL por defecto para listas: evita recargar al cambiar de pestaña durante unos segundos. */
export const DEFAULT_LIST_TTL_MS = 45_000

export function createSingleKeyListCache<T>() {
  let entry: { data: T; expires: number } | null = null
  let inflight: Promise<T> | null = null
  let gen = 0

  return {
    async getOrFetch(fetcher: () => Promise<T>, ttlMs: number = DEFAULT_LIST_TTL_MS): Promise<T> {
      const now = Date.now()
      if (entry && now < entry.expires) return entry.data
      if (inflight) return inflight
      const startGen = gen
      inflight = fetcher()
        .then((data) => {
          if (gen === startGen) {
            entry = { data, expires: Date.now() + ttlMs }
          }
          return data
        })
        .finally(() => {
          inflight = null
        })
      return inflight
    },
    invalidate() {
      gen += 1
      entry = null
      inflight = null
    },
  }
}

export function createKeyedListCache<T>() {
  const entries = new Map<string, { data: T; expires: number }>()
  const inflight = new Map<string, Promise<T>>()
  let gen = 0

  return {
    async getOrFetch(
      key: string,
      fetcher: () => Promise<T>,
      ttlMs: number = DEFAULT_LIST_TTL_MS,
    ): Promise<T> {
      const now = Date.now()
      const hit = entries.get(key)
      if (hit && now < hit.expires) return hit.data
      const pending = inflight.get(key)
      if (pending) return pending
      const startGen = gen
      const p = fetcher()
        .then((data) => {
          if (gen === startGen) {
            entries.set(key, { data, expires: Date.now() + ttlMs })
          }
          return data
        })
        .finally(() => inflight.delete(key))
      inflight.set(key, p)
      return p
    },
    invalidate(key?: string) {
      gen += 1
      if (key === undefined) {
        entries.clear()
        inflight.clear()
      } else {
        entries.delete(key)
        inflight.delete(key)
      }
    },
    invalidateAll() {
      gen += 1
      entries.clear()
      inflight.clear()
    },
  }
}
