// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { OptionSelectionsBySede } from '../services/reportsService'
import { OptionInsightsPanel } from './OptionInsightsPanel'

const data: OptionSelectionsBySede[] = [
  {
    sedeId: 10,
    sedeName: 'Sede Lima',
    totalTickets: 4,
    options: [
      { optionId: 12, categoryName: 'Cuenta', optionName: 'Actualizar datos', count: 3, percentage: 75 },
      { optionId: 13, categoryName: 'Cuenta', optionName: 'Recuperar acceso', count: 1, percentage: 25 },
    ],
  },
  {
    sedeId: 20,
    sedeName: 'Sede Callao',
    totalTickets: 2,
    options: [
      { optionId: 21, categoryName: 'Pagos', optionName: 'Consultar liquidación', count: 2, percentage: 100 },
    ],
  },
]

describe('OptionInsightsPanel', () => {
  afterEach(cleanup)

  it('ordena y presenta las opciones elegidas dentro de cada sede', () => {
    render(<OptionInsightsPanel data={data} />)

    expect(screen.getAllByText('Sede Lima').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sede Callao').length).toBeGreaterThan(0)
    expect(screen.getByText('Actualizar datos')).toBeTruthy()
    expect(screen.getByText('75%')).toBeTruthy()
    expect(screen.getByText('Consultar liquidación')).toBeTruthy()
    expect(screen.queryByText(/tickets analizados/)).toBeNull()
    expect(screen.queryByText(/con opción registrada/)).toBeNull()
    expect(screen.getByPlaceholderText('Buscar sede, categoría u opción')).toBeTruthy()
  })

  it('usa el filtro principal de sede y permite buscar una opción', () => {
    render(<OptionInsightsPanel data={data} />)

    expect(screen.queryByRole('button', { name: 'Todas las sedes' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Sede Callao' })).toBeNull()

    fireEvent.change(screen.getByPlaceholderText('Buscar sede, categoría u opción'), {
      target: { value: 'acceso' },
    })
    expect(screen.getByText('Recuperar acceso')).toBeTruthy()
    expect(screen.queryByText('Consultar liquidación')).toBeNull()
  })

  it('pagina las opciones y permite cambiar la cantidad de filas', () => {
    const paginatedData: OptionSelectionsBySede[] = [{
      sedeId: 10,
      sedeName: 'Sede Lima',
      totalTickets: 12,
      options: Array.from({ length: 12 }, (_, index) => ({
        optionId: index + 1,
        categoryName: 'Cuenta',
        optionName: `Opción ${index + 1}`,
        count: 12 - index,
        percentage: Math.round(((12 - index) / 12) * 100),
      })),
    }]

    render(<OptionInsightsPanel data={paginatedData} />)

    expect(screen.getByText('Opción 1')).toBeTruthy()
    expect(screen.queryByText('Opción 12')).toBeNull()
    expect(screen.getByText('Página 1 de 2')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    expect(screen.getByText('Opción 12')).toBeTruthy()
    expect(screen.getByText('Página 2 de 2')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Filas por página'), { target: { value: '20' } })
    expect(screen.getByText('Opción 1')).toBeTruthy()
    expect(screen.getByText('Página 1 de 1')).toBeTruthy()
  })
})
