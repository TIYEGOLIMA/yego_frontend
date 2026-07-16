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
  expiresAt: string
}

const STORAGE_KEY = 'dispositivo-session'

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:8080/api' : '/api')

export function getDispositivoSession(): DispositivoSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as DispositivoSession
    if (!session.accessToken || !session.expiresAt || new Date(session.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

export function getDispositivoToken(): string | null {
  return getDispositivoSession()?.accessToken ?? null
}

function getJwtExpiresAt(token: string): string {
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { exp?: number }
    if (payload.exp) return new Date(payload.exp * 1000).toISOString()
  } catch {
    // El backend también devuelve expiresAt; este fallback cubre despliegues escalonados.
  }
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
}

function toDispositivoSession(data: Record<string, unknown>): DispositivoSession {
  const accessToken = String(data.accessToken ?? '')
  return {
    accessToken,
    dispositivoId: Number(data.dispositivoId),
    nombre: String(data.nombre ?? ''),
    tipo: data.tipo as TipoDispositivo,
    sedeId: Number(data.sedeId),
    sedeNombre: typeof data.sedeNombre === 'string' ? data.sedeNombre : null,
    moduleId: data.moduleId != null ? Number(data.moduleId) : null,
    expiresAt:
      typeof data.expiresAt === 'string' ? data.expiresAt : getJwtExpiresAt(accessToken),
  }
}

export function getHumanJwtFromStorage(): string | null {
  try {
    const raw = localStorage.getItem('auth-storage')
    if (raw) {
      const t = JSON.parse(raw)?.state?.token
      if (t) return t
    }
  } catch {
    // ignore
  }
  return localStorage.getItem('token')
}

export function esSoloSesionDispositivo(): boolean {
  return !!getDispositivoSession() && !getHumanJwtFromStorage()
}

export function parseAxiosErrorCode(error: unknown): string | undefined {
  const data = (error as { response?: { data?: unknown } })?.response?.data
  if (data && typeof data === 'object' && 'error' in data) {
    return String((data as { error?: string }).error)
  }
  return undefined
}

export function clearDispositivoSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

let revocandoSesion = false

export function handleDispositivoSesionRevocada(): void {
  if (revocandoSesion) return
  revocandoSesion = true
  void import('../socket-service')
    .then(({ default: SocketService }) => {
      try {
        SocketService.disconnect()
      } catch {
        // ignore
      }
    })
    .catch(() => {})
  clearDispositivoSession()
  if (typeof window !== 'undefined') {
    window.location.replace('/login')
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

  const session = toDispositivoSession(data as Record<string, unknown>)

  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  return session
}

export async function refreshDispositivoSession(): Promise<DispositivoSession> {
  const current = getDispositivoSession()
  if (!current?.accessToken) throw new Error('No hay sesión de dispositivo para renovar')

  const { data } = await axios.post(
    `${API_BASE_URL}/ticketera/dispositivos/refresh`,
    {},
    {
      headers: { Authorization: `Bearer ${current.accessToken}` },
      timeout: 30000,
    },
  )
  const session = toDispositivoSession(data as Record<string, unknown>)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  return session
}
