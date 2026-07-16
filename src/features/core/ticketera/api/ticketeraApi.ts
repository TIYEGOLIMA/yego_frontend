import type { AxiosRequestConfig } from 'axios'
import { api } from '@/services/core/api'
import type { Dispositivo, ModuloAtencion, Rating, Sede, Ticket, TicketStatus } from '../domain'
import { TicketeraError } from '../domain'

type UnknownRecord = Record<string, unknown>

export interface CreateTicketInput {
  optionId: number
  licenseNumber: string
  userId?: number
  sedeId: number
}

export interface CompleteTicketInput {
  ticketId: number
  agentId: number
  notes?: string
}

export interface CreateRatingInput {
  ticketId: number
  score: number
  comment?: string
}

export interface TicketeraApi {
  listTickets(sedeId: number, config?: AxiosRequestConfig): Promise<Ticket[]>
  createTicket(input: CreateTicketInput): Promise<Ticket>
  callTicket(ticketId: number, userId: number, moduleId: number): Promise<Ticket>
  startTicket(ticketId: number, agentId: number): Promise<Ticket>
  completeTicket(input: CompleteTicketInput): Promise<Ticket>
  cancelTicket(ticketId: number, agentId: number): Promise<Ticket>
  createRating(input: CreateRatingInput): Promise<Rating>
  listSedes(config?: AxiosRequestConfig): Promise<Sede[]>
  listModules(sedeId?: number, config?: AxiosRequestConfig): Promise<ModuloAtencion[]>
  listDevices(config?: AxiosRequestConfig): Promise<Dispositivo[]>
}

function asNumber(value: unknown, fallback = 0): number {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function asNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function normalizeStatus(value: unknown): TicketStatus {
  const status = typeof value === 'string' ? value.toUpperCase() : 'WAITING'
  return ['WAITING', 'CALLED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(status)
    ? (status as TicketStatus)
    : 'WAITING'
}

export function normalizeTicket(value: unknown): Ticket {
  const source = value && typeof value === 'object' ? (value as UnknownRecord) : {}
  return {
    id: asNumber(source.id),
    ticketNumber: String(source.ticketNumber ?? ''),
    status: normalizeStatus(source.status),
    createdAt: String(source.createdAt ?? new Date(0).toISOString()),
    priority: asNumber(source.priority, 1),
    sedeId: asNullableNumber(source.sedeId),
    moduleId: asNullableNumber(source.moduleId),
    userId: asNullableNumber(source.userId),
    agentId: asNullableNumber(source.agentId ?? source.agent_id),
    optionId: asNullableNumber(source.optionId),
    licenseNumber: asNullableString(source.licenseNumber),
    calledAt: asNullableString(source.calledAt),
    completedAt: asNullableString(source.completedAt),
    driverName: asNullableString(source.driverName) ?? undefined,
    moduleName: asNullableString(source.moduleName) ?? undefined,
    categoryName: asNullableString(source.categoryName) ?? undefined,
    categoryDescription: asNullableString(source.categoryDescription) ?? undefined,
    subcategoryName: asNullableString(source.subcategoryName) ?? undefined,
    subcategoryDescription: asNullableString(source.subcategoryDescription) ?? undefined,
  }
}

function toTicketeraError(error: unknown): TicketeraError {
  const response = (error as { response?: { status?: number; data?: { message?: string } } })?.response
  const status = response?.status
  const code =
    status === 401
      ? 'UNAUTHORIZED'
      : status === 403
        ? 'FORBIDDEN'
        : status === 404
          ? 'NOT_FOUND'
          : status === 409
            ? 'CONFLICT'
            : status === 429
              ? 'RATE_LIMITED'
              : response
                ? 'UNKNOWN'
                : 'NETWORK'
  return new TicketeraError(code, response?.data?.message ?? 'No se pudo completar la operación', error)
}

async function ticketRequest(request: () => Promise<{ data: unknown }>): Promise<Ticket> {
  try {
    return normalizeTicket((await request()).data)
  } catch (error) {
    throw toTicketeraError(error)
  }
}

export const ticketeraApi: TicketeraApi = {
  async listTickets(sedeId, config) {
    try {
      const { data } = await api.get<unknown[]>('/ticketera/tickets/all', {
        ...config,
        params: { ...config?.params, sedeId },
      })
      return data.map(normalizeTicket)
    } catch (error) {
      throw toTicketeraError(error)
    }
  },

  createTicket(input) {
    return ticketRequest(() => api.post('/ticketera/tickets/create', input))
  },

  callTicket(ticketId, userId, moduleId) {
    return ticketRequest(() =>
      api.post(`/ticketera/tickets/${ticketId}/call/${userId}`, undefined, { params: { moduleId } }),
    )
  },

  startTicket(ticketId, agentId) {
    return ticketRequest(() => api.post(`/ticketera/tickets/${ticketId}/start/${agentId}`))
  },

  completeTicket({ ticketId, agentId, notes }) {
    return ticketRequest(() =>
      api.post(`/ticketera/tickets/${ticketId}/complete`, {
        agentId,
        notes: notes?.trim() || null,
      }),
    )
  },

  cancelTicket(ticketId, agentId) {
    return ticketRequest(() => api.post(`/ticketera/tickets/${ticketId}/cancel/${agentId}`))
  },

  async createRating(input) {
    try {
      const { data } = await api.post<Rating>('/ticketera/ratings', input)
      return data
    } catch (error) {
      throw toTicketeraError(error)
    }
  },

  async listSedes(config) {
    const { data } = await api.get<Sede[]>('/ticketera/sedes', config)
    return data
  },

  async listModules(sedeId, config) {
    const { data } = await api.get<ModuloAtencion[]>('/ticketera/modulo-atencion', {
      ...config,
      params: { ...config?.params, ...(sedeId ? { sedeId } : {}) },
    })
    return data
  },

  async listDevices(config) {
    const { data } = await api.get<Dispositivo[]>('/ticketera/dispositivos', config)
    return data
  },
}

