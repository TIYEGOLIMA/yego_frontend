import type { ModuloAtencion, Ticket } from './types'

export type TicketeraEventType =
  | 'TICKET_CREATED'
  | 'TICKET_UPDATED'
  | 'TICKET_CALLED'
  | 'TICKET_STARTED'
  | 'TICKET_COMPLETED'
  | 'TICKET_CANCELLED'
  | 'MODULES_UPDATED'

interface TicketeraEventBase {
  eventId: string
  type: TicketeraEventType
  occurredAt: string
  sedeId: number | null
  moduleId: number | null
}

export interface TicketEvent extends TicketeraEventBase {
  type:
    | 'TICKET_CREATED'
    | 'TICKET_UPDATED'
    | 'TICKET_CALLED'
    | 'TICKET_STARTED'
    | 'TICKET_COMPLETED'
    | 'TICKET_CANCELLED'
  data: Ticket
}

export interface ModulesUpdatedEvent extends TicketeraEventBase {
  type: 'MODULES_UPDATED'
  data: {
    available: ModuloAtencion[]
    occupied: Array<{
      moduleId: number
      userId: number
      userName: string
      status: string
    }>
  }
}

export type TicketeraEvent = TicketEvent | ModulesUpdatedEvent

const LEGACY_EVENT_TYPES: Record<string, TicketeraEventType> = {
  ticket_created: 'TICKET_CREATED',
  ticket_updated: 'TICKET_UPDATED',
  ticket_called: 'TICKET_CALLED',
  ticket_started: 'TICKET_STARTED',
  ticket_completed: 'TICKET_COMPLETED',
  ticket_cancelled: 'TICKET_CANCELLED',
  MODULOS_ACTUALIZADOS: 'MODULES_UPDATED',
}

export function normalizeEventType(value: unknown): TicketeraEventType | null {
  if (typeof value !== 'string') return null
  if (value in LEGACY_EVENT_TYPES) return LEGACY_EVENT_TYPES[value]
  const normalized = value.toUpperCase()
  return [
    'TICKET_CREATED',
    'TICKET_UPDATED',
    'TICKET_CALLED',
    'TICKET_STARTED',
    'TICKET_COMPLETED',
    'TICKET_CANCELLED',
    'MODULES_UPDATED',
  ].includes(normalized)
    ? (normalized as TicketeraEventType)
    : null
}

