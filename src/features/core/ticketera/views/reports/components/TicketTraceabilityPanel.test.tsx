// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { TicketTraceability } from '../services/reportsService'
import { TicketTraceabilityPanel } from './TicketTraceabilityPanel'

const tickets: TicketTraceability[] = [
  {
    id: 101,
    ticketNumber: 'M-101',
    status: 'COMPLETED',
    sedeId: 10,
    sedeName: 'Sede Lima',
    optionId: 12,
    categoryName: 'Cuenta del conductor',
    optionName: 'Actualización de datos',
    licenseNumber: '+51999999999',
    moduleId: 4,
    moduleName: 'Módulo 4',
    operatorId: 8,
    operatorName: 'María Operadora',
    createdAt: '2026-07-16T10:00:00',
    calledAt: '2026-07-16T10:01:00',
    completedAt: '2026-07-16T10:05:00',
    rating: 5,
    events: [
      { status: 'GENERATED', label: 'Ticket generado', occurredAt: '2026-07-16T10:00:00', notes: null },
      { status: 'COMPLETED', label: 'Atención completada', occurredAt: '2026-07-16T10:05:00', notes: 'Atención finalizada' },
    ],
  },
  {
    id: 202,
    ticketNumber: 'C-202',
    status: 'WAITING',
    sedeId: 20,
    sedeName: 'Sede Callao',
    optionId: 21,
    categoryName: 'Pagos',
    optionName: 'Consulta de liquidación',
    licenseNumber: '+51888888888',
    moduleId: null,
    moduleName: null,
    operatorId: null,
    operatorName: null,
    createdAt: '2026-07-16T11:00:00',
    calledAt: null,
    completedAt: null,
    rating: null,
    events: [
      { status: 'GENERATED', label: 'Ticket generado', occurredAt: '2026-07-16T11:00:00', notes: null },
    ],
  },
]

describe('TicketTraceabilityPanel', () => {
  afterEach(cleanup)

  it('muestra la sede y las opciones marcadas y permite consultar el recorrido', () => {
    render(<TicketTraceabilityPanel tickets={tickets} total={2} />)

    expect(screen.getByText('Cuenta del conductor → Actualización de datos')).toBeTruthy()
    expect(screen.getByText('Sede Lima')).toBeTruthy()
    expect(screen.getByText('María Operadora')).toBeTruthy()

    fireEvent.click(screen.getByText('#M-101'))

    expect(screen.getByText('Ticket generado')).toBeTruthy()
    expect(screen.getByText('Atención completada')).toBeTruthy()
    expect(screen.getByText('Atención finalizada')).toBeTruthy()
  })

  it('filtra por sede, opción o estado sin mezclar tickets', () => {
    render(<TicketTraceabilityPanel tickets={tickets} total={2} />)

    fireEvent.change(screen.getByPlaceholderText('Ticket, opción, conductor u operador'), {
      target: { value: 'Callao' },
    })

    expect(screen.getByText('#C-202')).toBeTruthy()
    expect(screen.queryByText('#M-101')).toBeNull()

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'COMPLETED' } })
    expect(screen.getByText('No hay tickets que coincidan con los filtros.')).toBeTruthy()
  })
})
