// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'

import { getComponentByModuleCode, getComponentForModule } from './moduleComponentRegistry'

describe('moduleComponentRegistry', () => {
  it('acepta TICKETERA como alias del código estable TICKETS', () => {
    expect(getComponentByModuleCode('TICKETERA')).toBe(getComponentByModuleCode('TICKETS'))
  })

  it('recupera Ticketera por la URL cuando el código todavía está vacío', () => {
    const component = getComponentForModule(
      { codigo: null, url: '/ticketera', nombre: 'Ticketera' },
      'ticketera',
    )

    expect(component).toBe(getComponentByModuleCode('TICKETS'))
  })

  it('mantiene el código estable como primera opción', () => {
    const component = getComponentForModule(
      { codigo: 'REPORTS', url: '/ticketera', nombre: 'Ticketera' },
      'ticketera',
    )

    expect(component).toBe(getComponentByModuleCode('REPORTS'))
  })
})
