/**
 * Años disponibles para tablas {@code trips_YYYY} en base de datos.
 * El rango crece con el calendario: desde el primer año con tabla hasta el año actual.
 */

/** Primer año en el que existen tablas trips_* en el proyecto. */
export const TRIPS_TABLE_FIRST_YEAR = 2026

export function getTripsYearSelectOptions(): { value: string; label: string }[] {
  const currentYear = new Date().getFullYear()
  const endYear = Math.max(TRIPS_TABLE_FIRST_YEAR, currentYear)
  const options: { value: string; label: string }[] = []
  for (let y = TRIPS_TABLE_FIRST_YEAR; y <= endYear; y++) {
    options.push({ value: String(y), label: String(y) })
  }
  return options
}

/** Año por defecto para consultas: año calendario actual, sin bajar del primer año con tabla. */
export function getDefaultTripsYear(): string {
  const currentYear = new Date().getFullYear()
  return String(Math.max(TRIPS_TABLE_FIRST_YEAR, currentYear))
}
