import SocketService from '@/services/socket-service'
import type { TicketeraEvent, TicketeraEventType } from '../domain'
import { normalizeEventType } from '../domain'
import { normalizeTicket } from '../api'

type UnknownRecord = Record<string, unknown>

export interface TicketeraScope {
  sedeId: number
  moduleId?: number | null
}

export interface TicketeraRealtime {
  subscribeTickets(scope: TicketeraScope, callback: (event: TicketeraEvent) => void): () => void
  subscribeModules(scope: TicketeraScope, callback: (event: TicketeraEvent) => void): () => void
  subscribeRating(scope: { sedeId: number; moduleId: number }, callback: (event: TicketeraEvent) => void): () => void
}

const seenEventIds = new Set<string>()
const eventIdQueue: string[] = []
const MAX_SEEN_EVENTS = 500

interface SharedTopicSubscription {
  callbacks: Set<(event: TicketeraEvent) => void>
  unsubscribeBroker: () => void
}

const sharedTopicSubscriptions = new Map<string, SharedTopicSubscription>()

function rememberEvent(eventId: string): boolean {
  if (seenEventIds.has(eventId)) return false
  seenEventIds.add(eventId)
  eventIdQueue.push(eventId)
  if (eventIdQueue.length > MAX_SEEN_EVENTS) {
    const oldest = eventIdQueue.shift()
    if (oldest) seenEventIds.delete(oldest)
  }
  return true
}

export function parseTicketeraEvent(payload: unknown): TicketeraEvent | null {
  if (!payload || typeof payload !== 'object') return null
  const source = payload as UnknownRecord
  const type = normalizeEventType(source.type)
  if (!type) return null

  const rawData = source.data ?? source.ticket ?? source
  const dataRecord = rawData && typeof rawData === 'object' ? (rawData as UnknownRecord) : {}
  const eventId = String(
    source.eventId ?? `${type}:${dataRecord.id ?? 'unknown'}:${source.occurredAt ?? source.timestamp ?? ''}`,
  )
  if (!rememberEvent(eventId)) return null

  const base = {
    eventId,
    occurredAt: String(source.occurredAt ?? source.timestamp ?? new Date().toISOString()),
    sedeId: numericOrNull(source.sedeId ?? dataRecord.sedeId),
    moduleId: numericOrNull(source.moduleId ?? dataRecord.moduleId),
  }

  if (type === 'MODULES_UPDATED') {
    const availableRaw = dataRecord.modulosDisponibles ?? dataRecord.available
    const occupiedRaw = dataRecord.modulosOcupados ?? dataRecord.occupied
    return {
      ...base,
      type,
      data: {
        available: Array.isArray(availableRaw)
          ? availableRaw.map((value) => normalizeModule(value))
          : [],
        occupied: Array.isArray(occupiedRaw)
          ? occupiedRaw.map((value) => normalizeOccupiedModule(value))
          : [],
      },
    }
  }

  return {
    ...base,
    type: type as Exclude<TicketeraEventType, 'MODULES_UPDATED'>,
    data: normalizeTicket(rawData),
  }
}

function normalizeModule(value: unknown) {
  const source = value && typeof value === 'object' ? value as UnknownRecord : {}
  return {
    id: Number(source.id ?? source.moduleId ?? 0),
    name: String(source.name ?? source.moduleName ?? ''),
    description: typeof source.description === 'string' ? source.description : null,
    isActive: source.isActive !== false,
    sedeId: numericOrNull(source.sedeId),
    sedeNombre: typeof source.sedeNombre === 'string' ? source.sedeNombre : null,
  }
}

function normalizeOccupiedModule(value: unknown) {
  const source = value && typeof value === 'object' ? value as UnknownRecord : {}
  return {
    moduleId: Number(source.moduleId ?? source.id ?? 0),
    userId: Number(source.userId ?? 0),
    userName: String(source.userName ?? ''),
    status: String(source.status ?? 'assigned'),
  }
}

function numericOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function subscribe(topic: string, callback: (event: TicketeraEvent) => void): () => void {
  let shared = sharedTopicSubscriptions.get(topic)
  if (!shared) {
    const callbacks = new Set<(event: TicketeraEvent) => void>()
    const unsubscribeBroker = SocketService.subscribeTopic(topic, (payload) => {
      const event = parseTicketeraEvent(payload)
      if (event) callbacks.forEach((listener) => listener(event))
    })
    shared = { callbacks, unsubscribeBroker }
    sharedTopicSubscriptions.set(topic, shared)
  }

  shared.callbacks.add(callback)
  return () => {
    const current = sharedTopicSubscriptions.get(topic)
    if (!current) return
    current.callbacks.delete(callback)
    if (current.callbacks.size === 0) {
      current.unsubscribeBroker()
      sharedTopicSubscriptions.delete(topic)
    }
  }
}

export const ticketeraRealtime: TicketeraRealtime = {
  subscribeTickets({ sedeId }, callback) {
    return subscribe(`/topic/ticketera/sedes/${sedeId}/tickets`, (event) => {
      if (event.sedeId === sedeId) callback(event)
    })
  },

  subscribeModules({ sedeId }, callback) {
    return subscribe(`/topic/ticketera/sedes/${sedeId}/modules`, (event) => {
      if (event.sedeId === sedeId) callback(event)
    })
  },

  subscribeRating({ sedeId, moduleId }, callback) {
    return subscribe(`/topic/ticketera/sedes/${sedeId}/modules/${moduleId}/rating`, (event) => {
      if (event.sedeId === sedeId && event.moduleId === moduleId) callback(event)
    })
  },
}
