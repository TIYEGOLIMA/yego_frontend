// @vitest-environment jsdom

import axios from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  autenticarDispositivo,
  clearHumanSessionForDevice,
} from './device-auth-service'

describe('clearHumanSessionForDevice', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('elimina credenciales humanas y conserva la sesión del dispositivo', () => {
    localStorage.setItem('auth-storage', '{"state":{"token":"human-jwt"}}')
    localStorage.setItem('token', 'legacy-human-jwt')
    localStorage.setItem('ticketera_token', 'ticketera-human-jwt')
    localStorage.setItem('ticketera_user', '{"id":1}')
    localStorage.setItem('ticketera_validated', 'true')
    localStorage.setItem('sedeActiva', '{"id":99}')
    localStorage.setItem('dispositivo-session', '{"accessToken":"device-jwt"}')

    clearHumanSessionForDevice()

    expect(localStorage.getItem('auth-storage')).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('ticketera_token')).toBeNull()
    expect(localStorage.getItem('ticketera_user')).toBeNull()
    expect(localStorage.getItem('ticketera_validated')).toBeNull()
    expect(localStorage.getItem('sedeActiva')).toBeNull()
    expect(localStorage.getItem('dispositivo-session')).toBe(
      '{"accessToken":"device-jwt"}',
    )
  })

  it('reemplaza la sesión humana en memoria y el header HTTP al activar', async () => {
    const [{ default: api }, { useAuthStore }] = await Promise.all([
      import('./api'),
      import('../../store/auth-store'),
    ])
    useAuthStore.setState({ token: 'human-jwt' })
    api.defaults.headers.common.Authorization = 'Bearer human-jwt'
    vi.spyOn(axios, 'post').mockResolvedValue({
      data: {
        accessToken: 'device-jwt',
        dispositivoId: 10,
        nombre: 'TV',
        tipo: 'TV',
        sedeId: 3,
        sedeNombre: 'Sede Centro',
        moduleId: null,
        expiresAt: '2099-01-01T00:00:00.000Z',
      },
    })

    const session = await autenticarDispositivo('codigo-tv')

    expect(session.accessToken).toBe('device-jwt')
    expect(useAuthStore.getState().token).toBeNull()
    expect(api.defaults.headers.common.Authorization).toBe('Bearer device-jwt')
    expect(getStoredSessionToken()).toBe('device-jwt')
  })
})

function getStoredSessionToken(): string | undefined {
  const raw = localStorage.getItem('dispositivo-session')
  if (!raw) return undefined
  return (JSON.parse(raw) as { accessToken?: string }).accessToken
}
