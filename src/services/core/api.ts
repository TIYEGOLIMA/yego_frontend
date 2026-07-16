import axios from 'axios'
import { authService } from './auth-service'
import { getAccessTokenFromResponse } from './auth-token-header'
import {
  esSoloSesionDispositivo,
  esRutaDispositivo,
  getDispositivoSession,
  getJwtActivoParaRuta,
  getHumanJwtFromStorage,
  handleDispositivoSesionRevocada,
  parseAxiosErrorCode,
} from './device-auth-service'

const API_BASE_URL =
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8080/api' : '/api')

function esRutaLoginORegistro(url: string | undefined): boolean {
  if (!url) return false
  const u = url.toLowerCase()
  return u.includes('auth/login') || u.includes('auth/register')
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json;charset=UTF-8',
    Accept: 'application/json',
  },
  timeout: 60000,
})

let refreshEnCurso: Promise<string> | null = null
let invalidandoSesionHumana = false

export function invalidarSesionHumana(): void {
  if (invalidandoSesionHumana) return
  invalidandoSesionHumana = true
  authService.clearLocalStorage()
  delete api.defaults.headers.common.Authorization
  if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
    window.location.replace('/login')
  } else {
    invalidandoSesionHumana = false
  }
}

function renovarTokenUnaVez(currentToken: string): Promise<string> {
  if (refreshEnCurso) return refreshEnCurso

  refreshEnCurso = (async () => {
    const refreshUrl = window.location.pathname.includes('/ticketera')
      ? '/ticketera/auth/refresh'
      : '/auth/refresh'
    const refreshResponse = await api.post(
      refreshUrl,
      {},
      { headers: { Authorization: `Bearer ${currentToken}` } },
    )
    const newToken =
      getAccessTokenFromResponse(refreshResponse) ??
      (refreshResponse.data as { accessToken?: string })?.accessToken

    if (!newToken) {
      throw new Error('La renovación no devolvió un token')
    }

    try {
      const { useAuthStore } = await import('../../store/auth-store')
      useAuthStore.setState({ token: newToken })
    } catch {
      // El interceptor también funciona antes de inicializar el store.
    }
    api.defaults.headers.common.Authorization = `Bearer ${newToken}`
    return newToken
  })().finally(() => {
    refreshEnCurso = null
  })

  return refreshEnCurso
}

api.interceptors.request.use(
  (config) => {
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }

    if (esRutaLoginORegistro(config.url)) {
      delete config.headers.Authorization
      delete (config.headers as Record<string, string | undefined>).authorization
      return config
    }

    const routeToken = getJwtActivoParaRuta()
    if (esRutaDispositivo()) {
      if (routeToken) {
        config.headers.Authorization = `Bearer ${routeToken}`
      } else {
        delete config.headers.Authorization
      }
      return config
    }

    const existingAuth =
      config.headers?.Authorization ??
      (config.headers as Record<string, string | undefined>)?.authorization

    if (existingAuth) {
      return config
    }

    if (routeToken) {
      config.headers.Authorization = `Bearer ${routeToken}`
    } else {
      delete config.headers.Authorization
    }
    return config
  },
  (error) => Promise.reject(error),
)

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const url = error.config?.url ?? ''
    const isLoginRequest = url.includes('/auth/login')
    const isRefreshRequest = url.includes('/auth/refresh')
    const isTicketeraRefreshRequest = url.includes('/ticketera/auth/refresh')

    if (error.response?.status === 401 && !isLoginRequest && !isRefreshRequest && !isTicketeraRefreshRequest) {
      const requestConfig = error.config as typeof error.config & { _retry?: boolean }
      const errCode = parseAxiosErrorCode(error)
      const sesionDispositivo = getDispositivoSession()
      const currentToken = esRutaDispositivo() ? null : getHumanJwtFromStorage()

      const cerrarDispositivo =
        errCode === 'DEVICE_TOKEN_REVOKED' ||
        errCode === 'DEVICE_REVOKED' ||
        (!!sesionDispositivo && (esRutaDispositivo() || !currentToken))

      if (cerrarDispositivo) {
        handleDispositivoSesionRevocada()
        return Promise.reject(error)
      }

      if (requestConfig?._retry) {
        invalidarSesionHumana()
        return Promise.reject(error)
      }

      try {
        if (currentToken) {
          requestConfig._retry = true
          const newToken = await renovarTokenUnaVez(currentToken)
          requestConfig.headers.Authorization = `Bearer ${newToken}`
          return api.request(requestConfig)
        }
      } catch {
        invalidarSesionHumana()
        return Promise.reject(error)
      }

      if (esSoloSesionDispositivo()) {
        handleDispositivoSesionRevocada()
        return Promise.reject(error)
      }

      invalidarSesionHumana()
    }

    if (error.response?.status === 403 && error.response?.data?.error === 'PASSWORD_EXPIRED') {
      try {
        const { useAuthStore } = await import('../../store/auth-store')
        const state = useAuthStore.getState()
        if (state.user) {
          useAuthStore.setState({ user: { ...state.user, requirePasswordChange: true } })
        }
      } catch {
        // ignore
      }
    }

    if (!error.response) {
      const esCancelado =
        error.code === 'ECONNABORTED' ||
        error.code === 'ERR_CANCELED' ||
        error.name === 'AbortError' ||
        error.name === 'CanceledError' ||
        error.message === 'canceled' ||
        error.message === 'Request aborted'
      if (!esCancelado) {
        console.error('Error de conexión con el servidor:', error.message)
      }
    }

    return Promise.reject(error)
  },
)

export default api
