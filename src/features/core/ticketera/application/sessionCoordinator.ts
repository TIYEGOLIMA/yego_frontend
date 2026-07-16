import { useEffect } from 'react'
import { api } from '@/services/core/api'
import { authService } from '@/services/core/auth-service'
import {
  getDispositivoSession,
  handleDispositivoSesionRevocada,
  refreshDispositivoSession,
} from '@/services/core/device-auth-service'
import SocketService from '@/services/socket-service'
import { useAuthStore } from '@/store/auth-store'

const RENEWAL_LEAD_MS = 24 * 60 * 60 * 1000
const RETRY_MS = 60 * 60 * 1000
const MIN_TIMER_MS = 60 * 1000

function getTokenExpirationMs(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { exp?: number }
    return payload.exp ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

export interface TicketeraSessionCoordinator {
  acquire(): () => void
  renewNow(): Promise<void>
}

class DefaultTicketeraSessionCoordinator implements TicketeraSessionCoordinator {
  private consumers = 0
  private timer: number | null = null
  private renewal: Promise<void> | null = null

  acquire(): () => void {
    this.consumers += 1
    this.schedule()
    return () => {
      this.consumers = Math.max(0, this.consumers - 1)
      if (this.consumers === 0) this.clearTimer()
    }
  }

  async renewNow(): Promise<void> {
    if (this.renewal) return this.renewal
    this.renewal = this.renewCurrentSession()
      .then(() => this.schedule())
      .catch((error) => {
        this.scheduleRetry()
        throw error
      })
      .finally(() => {
        this.renewal = null
      })
    return this.renewal
  }

  private schedule() {
    this.clearTimer()
    if (this.consumers === 0) return

    const humanToken = useAuthStore.getState().token
    const device = getDispositivoSession()
    const token = humanToken ?? device?.accessToken
    if (!token) return

    const expiresAt = getTokenExpirationMs(token) ??
      (device?.expiresAt ? new Date(device.expiresAt).getTime() : null)
    if (!expiresAt) return

    const delay = Math.max(MIN_TIMER_MS, expiresAt - Date.now() - RENEWAL_LEAD_MS)
    this.timer = window.setTimeout(() => {
      void this.renewNow()
    }, delay)
  }

  private async renewCurrentSession() {
    const human = useAuthStore.getState()
    if (human.token) {
      try {
        const refreshed = await authService.refreshToken()
        api.defaults.headers.common.Authorization = `Bearer ${refreshed.accessToken}`
        useAuthStore.setState({
          token: refreshed.accessToken,
          ...(refreshed.user ? { user: refreshed.user } : {}),
        })
        SocketService.forceReconnect()
        return
      } catch (error) {
        if (this.isCurrentTokenExpired(human.token)) {
          await useAuthStore.getState().logout()
          return
        }
        throw error
      }
    }

    const device = getDispositivoSession()
    if (!device) return
    try {
      await refreshDispositivoSession()
      SocketService.forceReconnect()
    } catch (error) {
      if (this.isCurrentTokenExpired(device.accessToken) || this.isUnauthorized(error)) {
        handleDispositivoSesionRevocada()
        return
      }
      throw error
    }
  }

  private scheduleRetry() {
    this.clearTimer()
    if (this.consumers === 0) return
    this.timer = window.setTimeout(() => void this.renewNow(), RETRY_MS)
  }

  private isCurrentTokenExpired(token: string): boolean {
    const expiresAt = getTokenExpirationMs(token)
    return expiresAt != null && expiresAt <= Date.now()
  }

  private isUnauthorized(error: unknown): boolean {
    return (error as { response?: { status?: number } })?.response?.status === 401
  }

  private clearTimer() {
    if (this.timer != null) window.clearTimeout(this.timer)
    this.timer = null
  }
}

export const ticketeraSessionCoordinator: TicketeraSessionCoordinator =
  new DefaultTicketeraSessionCoordinator()

export function useTicketeraSessionRenewal(): void {
  useEffect(() => ticketeraSessionCoordinator.acquire(), [])
}
