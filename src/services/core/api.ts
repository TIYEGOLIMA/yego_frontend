import axios from 'axios'
import { authService } from './auth-service'
import { getAccessTokenFromResponse } from './auth-token-header'
import {
  esSoloSesionDispositivo,
  getDispositivoSession,
  getDispositivoToken,
  getHumanJwtFromStorage,
  handleDispositivoSesionRevocada,
  parseAxiosErrorCode,
} from './device-auth-service'

const API_BASE_URL =
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8080/api' : '/api')

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json;charset=UTF-8',
    Accept: 'application/json',
  },
  timeout: 60000,
})

api.interceptors.request.use(
  (config) => {
    const token = getHumanJwtFromStorage() || getDispositivoToken()
    const existingAuth =
      config.headers?.Authorization ??
      (config.headers as Record<string, string | undefined>)?.authorization

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    } else if (!existingAuth) {
      delete config.headers.Authorization
    }

    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
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
      const errCode = parseAxiosErrorCode(error)
      const sesionDispositivo = getDispositivoSession()
      const currentToken = getHumanJwtFromStorage()

      const cerrarDispositivo =
        errCode === 'DEVICE_TOKEN_REVOKED' ||
        errCode === 'DEVICE_REVOKED' ||
        (!!sesionDispositivo && !currentToken)

      if (cerrarDispositivo) {
        handleDispositivoSesionRevocada()
        return Promise.reject(error)
      }

      try {
        if (currentToken) {
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

          try {
            const { useAuthStore } = await import('../../store/auth-store')
            useAuthStore.setState({ token: newToken })
          } catch {
            // store opcional
          }

          api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
          error.config.headers['Authorization'] = `Bearer ${newToken}`
          return api.request(error.config)
        }
      } catch {
        // sigue a logout humano
      }

      if (esSoloSesionDispositivo()) {
        handleDispositivoSesionRevocada()
        return Promise.reject(error)
      }

      try {
        await authService.logout()
      } catch {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        localStorage.removeItem('auth-storage')
      }

      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
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
