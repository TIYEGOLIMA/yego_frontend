// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getTicketTraceability: vi.fn(),
}))

vi.mock('../services/reportsService', async () => {
  const actual = await vi.importActual('../services/reportsService')
  return {
    ...actual,
    reportsService: {
      getTicketTraceability: mocks.getTicketTraceability,
    },
  }
})

import { PaginatedTicketTraceability } from './PaginatedTicketTraceability'

describe('PaginatedTicketTraceability', () => {
  afterEach(() => {
    cleanup()
    mocks.getTicketTraceability.mockReset()
  })

  it('solicita solo la página seleccionada y reinicia al cambiar el tamaño', async () => {
    mocks.getTicketTraceability.mockImplementation(({ page, size }) => Promise.resolve({
      content: [],
      page,
      size,
      totalElements: 21,
      totalPages: Math.ceil(21 / size),
      first: page === 0,
      last: page + 1 >= Math.ceil(21 / size),
    }))

    render(<PaginatedTicketTraceability filters={{ sedeId: 10 }} />)

    await waitFor(() => expect(mocks.getTicketTraceability).toHaveBeenCalledWith(
      { fechaInicio: undefined, fechaFin: undefined, sedeId: 10, page: 0, size: 20 },
      expect.any(AbortSignal),
    ))

    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    await waitFor(() => expect(mocks.getTicketTraceability).toHaveBeenCalledWith(
      expect.objectContaining({ sedeId: 10, page: 1, size: 20 }),
      expect.any(AbortSignal),
    ))

    fireEvent.change(screen.getByLabelText('Filas por página'), { target: { value: '50' } })
    await waitFor(() => expect(mocks.getTicketTraceability).toHaveBeenCalledWith(
      expect.objectContaining({ sedeId: 10, page: 0, size: 50 }),
      expect.any(AbortSignal),
    ))
  })
})
