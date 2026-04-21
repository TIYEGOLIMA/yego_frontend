import axios from 'axios'

export type TipoDispositivo = 'TABLET_PRINCIPAL' | 'TABLET' | 'TV'

export interface DispositivoSession {
  accessToken: string
  dispositivoId: number
  nombre: string
  tipo: TipoDispositivo
  sedeId: number
  sedeNombre: string | null
  moduleId: number | null
}

const STORAGE_KEY = 'dispositivo-session'

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:8080/api' : '/api')

export function getDispositivoSession(): DispositivoSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as DispositivoSession
  } catch {
    return null
  }
}

export function getDispositivoToken(): string | null {
  return getDispositivoSession()?.accessToken ?? null
}

export function clearDispositivoSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

export function getRutaPorTipo(tipo: TipoDispositivo): string {
  switch (tipo) {
    case 'TV':
      return '/tv-display'
    case 'TABLET_PRINCIPAL':
      return '/tablet-interface'
    case 'TABLET':
      return '/rating-tablet'
    default:
      return '/login'
  }
}

export async function autenticarDispositivo(
  rawAccessToken: string,
): Promise<DispositivoSession> {
  const token = rawAccessToken.trim()
  if (!token) {
    throw new Error('Ingresa el token de acceso del dispositivo')
  }

  const { data } = await axios.post(
    `${API_BASE_URL}/ticketera/dispositivos/auth`,
    { accessToken: token },
    { headers: { 'Content-Type': 'application/json' } },
  )

  const session: DispositivoSession = {
    accessToken: data.accessToken,
    dispositivoId: data.dispositivoId,
    nombre: data.nombre,
    tipo: data.tipo,
    sedeId: data.sedeId,
    sedeNombre: data.sedeNombre ?? null,
    moduleId: data.moduleId ?? null,
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  return session
}
