// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Ticket } from '../../domain'

const mocks = vi.hoisted(() => ({
  completedCallback: undefined as ((ticket: Ticket) => void) | undefined,
  unsubscribe: vi.fn(),
  onTicketCompleted: vi.fn(),
}))

vi.mock('@/services/core/device-auth-service', () => ({
  getDispositivoSession: () => ({
    token: 'device-token',
    expiresAt: '2026-01-08T10:00:00.000Z',
    dispositivoId: 12,
    nombre: 'Tablet módulo 8',
    tipo: 'TABLET',
    sedeId: 3,
    sedeNombre: 'Sede Lima',
    moduleId: 8,
  }),
  clearDispositivoSession: vi.fn(),
}))

vi.mock('./hooks/useWebSocket', () => ({
  useRatingWebSocket: () => ({
    isConnected: true,
    connectionStatus: 'connected',
    onTicketCompleted: mocks.onTicketCompleted,
  }),
}))

import RatingTablet from './RatingTablet'

describe('tablet de calificación vinculada', () => {
  afterEach(() => {
    cleanup()
    mocks.completedCallback = undefined
    mocks.unsubscribe.mockReset()
    mocks.onTicketCompleted.mockReset()
  })

  it('escucha su módulo y muestra un único mensaje para el ticket completado', () => {
    mocks.onTicketCompleted.mockImplementation((callback: (ticket: Ticket) => void) => {
      mocks.completedCallback = callback
      return mocks.unsubscribe
    })

    render(
      <MemoryRouter>
        <RatingTablet />
      </MemoryRouter>,
    )

    expect(mocks.onTicketCompleted).toHaveBeenCalledTimes(1)
    expect(mocks.onTicketCompleted).toHaveBeenCalledWith(expect.any(Function), '8')

    const completedTicket: Ticket = {
      id: 88,
      ticketNumber: 'M8-088',
      status: 'COMPLETED',
      createdAt: '2026-01-01T10:00:00.000Z',
      completedAt: '2026-01-01T10:05:00.000Z',
      priority: 1,
      sedeId: 3,
      moduleId: 8,
      userId: 7,
      agentId: 7,
      optionId: 1,
      licenseNumber: '+51999999999',
      calledAt: '2026-01-01T10:01:00.000Z',
    }

    act(() => {
      mocks.completedCallback?.(completedTicket)
    })

    expect(screen.getAllByText('¿Cómo fue tu experiencia?')).toHaveLength(1)
    expect(screen.getAllByText('Ticket #M8-088')).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: '5 de 5 estrellas' }))
    expect(screen.getByText('¡Muy satisfecho!')).toBeTruthy()

    act(() => {
      mocks.completedCallback?.(completedTicket)
    })

    expect(screen.getAllByText('¿Cómo fue tu experiencia?')).toHaveLength(1)
    expect(screen.getByText('¡Muy satisfecho!')).toBeTruthy()
  })
})
