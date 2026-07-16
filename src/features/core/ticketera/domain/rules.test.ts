import { describe, expect, it } from 'vitest'
import type { Ticket } from './types'
import { canTransition, hasActiveTicket, sortTicketsFifo, upsertTicket } from './rules'

const ticket = (overrides: Partial<Ticket> = {}): Ticket => ({
  id: 1,
  ticketNumber: 'A-001',
  status: 'WAITING',
  createdAt: '2026-01-01T10:00:00.000Z',
  priority: 1,
  sedeId: 1,
  moduleId: null,
  userId: null,
  agentId: null,
  optionId: 1,
  licenseNumber: '+51999999999',
  calledAt: null,
  completedAt: null,
  ...overrides,
})

describe('reglas de dominio de Ticketera', () => {
  it('conserva las transiciones operativas y rechaza saltos inválidos', () => {
    expect(canTransition('WAITING', 'CALLED')).toBe(true)
    expect(canTransition('CALLED', 'IN_PROGRESS')).toBe(true)
    expect(canTransition('IN_PROGRESS', 'COMPLETED')).toBe(true)
    expect(canTransition('WAITING', 'COMPLETED')).toBe(false)
    expect(canTransition('COMPLETED', 'CALLED')).toBe(false)
  })

  it('ordena FIFO por creación y usa id como desempate estable', () => {
    const tickets = [
      ticket({ id: 3, createdAt: '2026-01-01T10:01:00.000Z' }),
      ticket({ id: 2, createdAt: '2026-01-01T10:00:00.000Z' }),
      ticket({ id: 1, createdAt: '2026-01-01T10:00:00.000Z' }),
    ]
    expect(sortTicketsFifo(tickets).map(({ id }) => id)).toEqual([1, 2, 3])
  })

  it('bloquea un módulo cuando ya tiene un ticket llamado o en atención', () => {
    expect(hasActiveTicket([ticket({ status: 'CALLED', moduleId: 4 })], 4)).toBe(true)
    expect(hasActiveTicket([ticket({ status: 'IN_PROGRESS', moduleId: 4 })], 4)).toBe(true)
    expect(hasActiveTicket([ticket({ status: 'WAITING', moduleId: 4 })], 4)).toBe(false)
    expect(hasActiveTicket([ticket({ status: 'CALLED', moduleId: 5 })], 4)).toBe(false)
  })

  it('actualiza un ticket sin duplicarlo', () => {
    const result = upsertTicket([ticket()], ticket({ status: 'CALLED', moduleId: 3 }))
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ status: 'CALLED', moduleId: 3 })
  })
})
