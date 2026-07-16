import type { Ticket, TicketStatus } from './types'

const TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  WAITING: ['CALLED', 'CANCELLED'],
  CALLED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
}

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return TRANSITIONS[from].includes(to)
}

export function sortTicketsFifo(tickets: readonly Ticket[]): Ticket[] {
  return [...tickets].sort((left, right) => {
    const byCreatedAt = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    return Number.isFinite(byCreatedAt) && byCreatedAt !== 0 ? byCreatedAt : left.id - right.id
  })
}

export function hasActiveTicket(tickets: readonly Ticket[], moduleId: number): boolean {
  return tickets.some(
    (ticket) =>
      ticket.moduleId === moduleId &&
      (ticket.status === 'CALLED' || ticket.status === 'IN_PROGRESS'),
  )
}

export function upsertTicket(tickets: readonly Ticket[], next: Ticket): Ticket[] {
  const index = tickets.findIndex((ticket) => ticket.id === next.id)
  if (index < 0) return [next, ...tickets]
  const copy = [...tickets]
  copy[index] = { ...copy[index], ...next }
  return copy
}

