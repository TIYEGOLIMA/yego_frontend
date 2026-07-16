import { useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import SocketService from '@/services/socket-service'
import { ticketeraApi, type CompleteTicketInput, type CreateTicketInput } from '../api'
import type { Ticket } from '../domain'
import { sortTicketsFifo, upsertTicket } from '../domain'
import { ticketeraRealtime } from '../realtime'

export const ticketeraQueryKeys = {
  all: ['ticketera'] as const,
  tickets: (sedeId: number) => [...ticketeraQueryKeys.all, 'tickets', sedeId] as const,
}

/**
 * Snapshot HTTP autoritativo + aplicación incremental de eventos canónicos.
 * Tras cada reconexión vuelve a consultar el snapshot para recuperar eventos perdidos.
 */
export function useTicketsQuery(sedeId: number | null) {
  const queryClient = useQueryClient()
  const wasConnected = useRef(SocketService.getConnectionStatus() === 'connected')
  const query = useQuery({
    queryKey: ticketeraQueryKeys.tickets(sedeId ?? 0),
    queryFn: ({ signal }) => ticketeraApi.listTickets(sedeId!, { signal }),
    enabled: sedeId != null,
    select: sortTicketsFifo,
  })

  useEffect(() => {
    if (sedeId == null) return
    return ticketeraRealtime.subscribeTickets({ sedeId }, (event) => {
      if (event.type === 'MODULES_UPDATED') return
      queryClient.setQueryData<Ticket[]>(ticketeraQueryKeys.tickets(sedeId), (current = []) => {
        const updated = upsertTicket(current, event.data)
        return sortTicketsFifo(updated)
      })
    })
  }, [queryClient, sedeId])

  useEffect(() => {
    if (sedeId == null) return
    const onStatusChange = (status: string) => {
      const connected = status === 'connected'
      if (connected && !wasConnected.current) {
        void queryClient.invalidateQueries({ queryKey: ticketeraQueryKeys.tickets(sedeId) })
      }
      wasConnected.current = connected
    }
    SocketService.onStatusChange(onStatusChange)
    return () => SocketService.offStatusChange(onStatusChange)
  }, [queryClient, sedeId])

  return query
}

export function useTicketActions(sedeId: number) {
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries({ queryKey: ticketeraQueryKeys.tickets(sedeId) })

  return {
    create: useMutation({ mutationFn: (input: CreateTicketInput) => ticketeraApi.createTicket(input), onSettled: refresh }),
    call: useMutation({
      mutationFn: ({ ticketId, userId, moduleId }: { ticketId: number; userId: number; moduleId: number }) =>
        ticketeraApi.callTicket(ticketId, userId, moduleId),
      onSettled: refresh,
    }),
    start: useMutation({
      mutationFn: ({ ticketId, agentId }: { ticketId: number; agentId: number }) =>
        ticketeraApi.startTicket(ticketId, agentId),
      onSettled: refresh,
    }),
    complete: useMutation({ mutationFn: (input: CompleteTicketInput) => ticketeraApi.completeTicket(input), onSettled: refresh }),
    cancel: useMutation({
      mutationFn: ({ ticketId, agentId }: { ticketId: number; agentId: number }) =>
        ticketeraApi.cancelTicket(ticketId, agentId),
      onSettled: refresh,
    }),
  }
}
