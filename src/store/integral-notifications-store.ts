import { create } from 'zustand'
import type { IntegralNotification } from '../types/integral-notification'

/** Acciones delegadas al módulo que publica el feed (p. ej. WorkOS) */
export type IntegralFeedHandlers = {
  markRead: (id: string) => void
  clearAll: () => void
}

type State = {
  items: IntegralNotification[]
  handlers: IntegralFeedHandlers | null
  setItems: (items: IntegralNotification[]) => void
  registerHandlers: (h: IntegralFeedHandlers | null) => void
  /** Delegación desde header (campana) */
  applyMarkRead: (id: string) => void
  applyClearAll: () => void
}

export const useIntegralNotificationsStore = create<State>((set, get) => ({
  items: [],
  handlers: null,
  setItems: (items) => set({ items }),
  registerHandlers: (handlers) => set({ handlers }),
  applyMarkRead: (id) => get().handlers?.markRead(id),
  applyClearAll: () => get().handlers?.clearAll(),
}))
