const SEDE_STORAGE_KEY = 'sedeActiva'

export interface SedeActiva {
  id: number
  nombre?: string
}

export function getSedeActiva(): SedeActiva | null {
  try {
    const raw = localStorage.getItem(SEDE_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed.id === 'number' ? parsed : null
  } catch {
    return null
  }
}

export function getSedeActivaId(): number | undefined {
  return getSedeActiva()?.id
}

export function setSedeActiva(sede: SedeActiva): void {
  localStorage.setItem(SEDE_STORAGE_KEY, JSON.stringify(sede))
}

export function clearSedeActiva(): void {
  localStorage.removeItem(SEDE_STORAGE_KEY)
}
