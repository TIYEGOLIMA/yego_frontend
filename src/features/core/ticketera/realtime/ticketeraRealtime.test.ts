// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import SocketService from '@/services/socket-service'
import { parseTicketeraEvent, ticketeraRealtime } from './ticketeraRealtime'

describe('contrato realtime de Ticketera', () => {
  it('normaliza un evento canónico de ticket', () => {
    const event = parseTicketeraEvent({
      eventId: 'event-ticket-1',
      type: 'TICKET_CALLED',
      occurredAt: '2026-01-01T10:00:00.000Z',
      sedeId: 2,
      moduleId: 7,
      data: {
        id: 22,
        ticketNumber: 'A-022',
        status: 'CALLED',
        createdAt: '2026-01-01T09:50:00.000Z',
        priority: 1,
        sedeId: 2,
        moduleId: 7,
      },
    })

    expect(event).toMatchObject({
      eventId: 'event-ticket-1',
      type: 'TICKET_CALLED',
      sedeId: 2,
      moduleId: 7,
      data: { id: 22, status: 'CALLED' },
    })
  })

  it('deduplica por eventId', () => {
    const payload = {
      eventId: 'duplicate-event',
      type: 'TICKET_UPDATED',
      occurredAt: '2026-01-01T10:00:00.000Z',
      sedeId: 1,
      moduleId: null,
      data: { id: 1, ticketNumber: 'A-001', status: 'WAITING' },
    }
    expect(parseTicketeraEvent(payload)).not.toBeNull()
    expect(parseTicketeraEvent(payload)).toBeNull()
  })

  it('rechaza eventos sin tipo reconocido', () => {
    expect(parseTicketeraEvent({ eventId: 'unknown', type: 'UNKNOWN' })).toBeNull()
  })

  it('parsea una vez y entrega el evento a todos los listeners del mismo topic', () => {
    let brokerCallback: ((payload: unknown) => void) | undefined
    const brokerUnsubscribe = vi.fn()
    const subscribeSpy = vi.spyOn(SocketService, 'subscribeTopic').mockImplementation((_topic, callback) => {
      brokerCallback = callback
      return brokerUnsubscribe
    })
    const first = vi.fn()
    const second = vi.fn()
    const unsubscribeFirst = ticketeraRealtime.subscribeTickets({ sedeId: 91 }, first)
    const unsubscribeSecond = ticketeraRealtime.subscribeTickets({ sedeId: 91 }, second)

    brokerCallback?.({
      eventId: 'fanout-event',
      type: 'TICKET_CREATED',
      occurredAt: '2026-01-01T10:00:00.000Z',
      sedeId: 91,
      moduleId: null,
      data: { id: 9, ticketNumber: 'A-009', status: 'WAITING' },
    })

    expect(subscribeSpy).toHaveBeenCalledTimes(1)
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
    unsubscribeFirst()
    expect(brokerUnsubscribe).not.toHaveBeenCalled()
    unsubscribeSecond()
    expect(brokerUnsubscribe).toHaveBeenCalledTimes(1)
    subscribeSpy.mockRestore()
  })

  it('mantiene los tickets aislados por sede aunque llegue un payload mal enrutado', () => {
    const brokerCallbacks = new Map<string, (payload: unknown) => void>()
    const subscribeSpy = vi.spyOn(SocketService, 'subscribeTopic').mockImplementation((topic, callback) => {
      brokerCallbacks.set(topic, callback)
      return () => brokerCallbacks.delete(topic)
    })
    const sedeLima = vi.fn()
    const sedeCallao = vi.fn()
    const unsubscribeLima = ticketeraRealtime.subscribeTickets({ sedeId: 10 }, sedeLima)
    const unsubscribeCallao = ticketeraRealtime.subscribeTickets({ sedeId: 20 }, sedeCallao)

    brokerCallbacks.get('/topic/ticketera/sedes/10/tickets')?.({
      eventId: 'wrong-sede-payload',
      type: 'TICKET_CREATED',
      occurredAt: '2026-01-01T10:00:00.000Z',
      sedeId: 20,
      moduleId: null,
      data: { id: 50, ticketNumber: 'C-050', status: 'WAITING', sedeId: 20 },
    })
    brokerCallbacks.get('/topic/ticketera/sedes/10/tickets')?.({
      eventId: 'correct-sede-payload',
      type: 'TICKET_CREATED',
      occurredAt: '2026-01-01T10:00:01.000Z',
      sedeId: 10,
      moduleId: null,
      data: { id: 51, ticketNumber: 'L-051', status: 'WAITING', sedeId: 10 },
    })

    expect(sedeLima).toHaveBeenCalledTimes(1)
    expect(sedeLima.mock.calls[0][0]).toMatchObject({ sedeId: 10, data: { id: 51, sedeId: 10 } })
    expect(sedeCallao).not.toHaveBeenCalled()

    unsubscribeLima()
    unsubscribeCallao()
    subscribeSpy.mockRestore()
  })

  it('entrega el rating una sola vez únicamente a la sede y módulo vinculados', () => {
    const brokerCallbacks = new Map<string, (payload: unknown) => void>()
    const subscribeSpy = vi.spyOn(SocketService, 'subscribeTopic').mockImplementation((topic, callback) => {
      brokerCallbacks.set(topic, callback)
      return () => brokerCallbacks.delete(topic)
    })
    const moduloOcho = vi.fn()
    const moduloNueve = vi.fn()
    const unsubscribeOcho = ticketeraRealtime.subscribeRating(
      { sedeId: 3, moduleId: 8 },
      moduloOcho,
    )
    const unsubscribeNueve = ticketeraRealtime.subscribeRating(
      { sedeId: 3, moduleId: 9 },
      moduloNueve,
    )
    const completedEvent = {
      eventId: 'rating-once-module-8',
      type: 'TICKET_COMPLETED',
      occurredAt: '2026-01-01T10:05:00.000Z',
      sedeId: 3,
      moduleId: 8,
      data: {
        id: 88,
        ticketNumber: 'M8-088',
        status: 'COMPLETED',
        sedeId: 3,
        moduleId: 8,
      },
    }

    const moduleEightBroker = brokerCallbacks.get('/topic/ticketera/sedes/3/modules/8/rating')
    moduleEightBroker?.(completedEvent)
    moduleEightBroker?.(completedEvent)

    expect(moduloOcho).toHaveBeenCalledTimes(1)
    expect(moduloOcho.mock.calls[0][0]).toMatchObject({
      sedeId: 3,
      moduleId: 8,
      data: { id: 88 },
    })
    expect(moduloNueve).not.toHaveBeenCalled()

    unsubscribeOcho()
    unsubscribeNueve()
    subscribeSpy.mockRestore()
  })
})
