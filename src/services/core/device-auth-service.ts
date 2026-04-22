import axios, { type AxiosInstance } from 'axios'

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

export function attachDeviceAuthInterceptor(instance: AxiosInstance): void {
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error?.response?.status
      const errorCode = parseAxiosErrorCode(error)
      const esDispositivo = !!getDispositivoSession()
      if (
        esDispositivo &&
        (status === 401 ||
          errorCode === 'DEVICE_TOKEN_REVOKED' ||
          errorCode === 'DEVICE_REVOKED' ||
          errorCode === 'TOKEN_EXPIRED')
      ) {
        handleDispositivoSesionRevocada()
      }
      return Promise.reject(error)
    },
  )
}

function getRequestToken(): string | null {
  return getHumanJwtFromStorage() || getDispositivoToken()
}

const DEFAULT_API_BASE_URL =
  import.meta.env.VITE_AGENT_API_URL || 'https://api-int.yego.pro/api/ticketera'

export function createDeviceApiClient(baseURL: string = DEFAULT_API_BASE_URL): AxiosInstance {
  const instance = axios.create({
    baseURL,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
  })

  instance.interceptors.request.use((config) => {
    const token = getRequestToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  attachDeviceAuthInterceptor(instance)
  return instance
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
