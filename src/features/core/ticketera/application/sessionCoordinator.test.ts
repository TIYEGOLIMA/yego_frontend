// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { calculateRenewalSchedule } from './sessionCoordinator'

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

describe('calculateRenewalSchedule', () => {
  it('segmenta un token de 30 días sin provocar renovación inmediata', () => {
    const now = Date.UTC(2026, 6, 16)

    expect(calculateRenewalSchedule(now + 30 * DAY, now)).toEqual({
      delayMs: DAY,
      renewAtEnd: false,
    })
  })

  it('renueva 24 horas antes cuando la fecha ya cabe en un timeout seguro', () => {
    const now = Date.UTC(2026, 6, 16)

    expect(calculateRenewalSchedule(now + 25 * HOUR, now)).toEqual({
      delayMs: HOUR,
      renewAtEnd: true,
    })
  })

  it('respeta una demora mínima para tokens ya próximos a vencer', () => {
    const now = Date.UTC(2026, 6, 16)

    expect(calculateRenewalSchedule(now + HOUR, now)).toEqual({
      delayMs: MINUTE,
      renewAtEnd: true,
    })
  })
})
