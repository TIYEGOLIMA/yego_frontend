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
const RUTAS_DISPOSITIVO = new Set([
  '/tv-display',
  '/tablet-interface',
  '/rating-tablet',
])

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

export function esRutaDispositivo(
  pathname = typeof window !== 'undefined' ? window.location.pathname : '',
): boolean {
  return RUTAS_DISPOSITIVO.has(pathname.replace(/\/$/, ''))
}

/** El dispositivo siempre domina en sus pantallas físicas, incluso si quedó un JWT humano legacy. */
export function getJwtActivoParaRuta(): string | null {
  const deviceToken = getDispositivoToken()
  if (deviceToken && esRutaDispositivo()) return deviceToken
  return getHumanJwtFromStorage() || deviceToken
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

/**
 * Una pantalla física no debe conservar credenciales ni alcance de una sesión
 * humana anterior. Si permanecen, Axios o el WebSocket pueden elegir el JWT
 * humano en lugar del JWT del dispositivo.
 */
export function clearHumanSessionForDevice(): void {
  try {
    localStorage.removeItem('auth-storage')
    localStorage.removeItem('token')
    localStorage.removeItem('ticketera_token')
    localStorage.removeItem('ticketera_user')
    localStorage.removeItem('ticketera_validated')
    localStorage.removeItem('sedeActiva')
  } catch {
    // ignore
  }
}

export async function aplicarSesionDispositivo(
  session: DispositivoSession,
): Promise<void> {
  clearHumanSessionForDevice()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))

  try {
    const [{ default: api }, { useAuthStore }] = await Promise.all([
      import('./api'),
      import('../../store/auth-store'),
    ])
    useAuthStore.setState({
      user: null,
      token: null,
      modules: [],
      loading: false,
      error: null,
    })
    api.defaults.headers.common.Authorization = `Bearer ${session.accessToken}`
  } catch {
    // La sesión persistida del dispositivo sigue siendo autoritativa.
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
  await aplicarSesionDispositivo(session)
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
