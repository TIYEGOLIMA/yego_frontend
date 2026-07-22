import { useEffect, useMemo, useState } from 'react'
import { ListFilter, MapPin, Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { OptionSelectionsBySede } from '../services/reportsService'
import { ReportPagination } from './ReportPagination'

interface Props {
  data: OptionSelectionsBySede[]
}

export function OptionInsightsPanel({ data }: Props) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)

  useEffect(() => {
    setPage(0)
  }, [data])

  const optionRows = useMemo(() => data.flatMap((sede) => sede.options.map((option, index) => ({
    ...option,
    sedeId: sede.sedeId,
    sedeName: sede.sedeName,
    totalTickets: sede.totalTickets,
    position: index + 1,
  }))), [data])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es')
    return optionRows.filter((option) => !query || [
      option.sedeName,
      option.categoryName,
      option.optionName,
      option.optionId.toString(),
    ].some((value) => value?.toLocaleLowerCase('es').includes(query)))
  }, [optionRows, search])

  const totalPages = Math.ceil(filteredRows.length / size)
  const currentPage = Math.min(page, Math.max(totalPages - 1, 0))
  const pagedRows = filteredRows.slice(currentPage * size, (currentPage + 1) * size)

  const visibleSedes = useMemo(() => {
    const grouped = new Map<number, {
      sedeId: number
      sedeName: string
      totalTickets: number
      options: typeof pagedRows
    }>()
    pagedRows.forEach((row) => {
      const sede = grouped.get(row.sedeId) ?? {
        sedeId: row.sedeId,
        sedeName: row.sedeName,
        totalTickets: row.totalTickets,
        options: [],
      }
      sede.options.push(row)
      grouped.set(row.sedeId, sede)
    })
    return Array.from(grouped.values())
  }, [pagedRows])

  if (data.length === 0) {
    return (
      <Card className="border-slate-200 shadow-none dark:border-slate-700">
        <CardContent className="py-16 text-center">
          <ListFilter className="mx-auto h-9 w-9 text-slate-300 dark:text-slate-600" />
          <p className="mt-3 font-medium text-slate-700 dark:text-slate-200">No hay opciones registradas</p>
          <p className="mt-1 text-sm text-slate-500">Ajusta la sede o el rango de fechas para consultar actividad.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <section className="space-y-5" aria-labelledby="option-insights-title">
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900/40 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 id="option-insights-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Opciones elegidas por sede
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Frecuencia real de las opciones marcadas al generar cada ticket.
          </p>
        </div>
        <label className="relative w-full lg:w-80 lg:flex-none">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(0)
            }}
            placeholder="Buscar sede, categoría u opción"
            className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </label>
      </div>

      <Card className="overflow-hidden border-slate-200 shadow-none dark:border-slate-700">
        <CardContent className="p-0">
          {filteredRows.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No hay opciones que coincidan con la búsqueda.
            </div>
          ) : visibleSedes.map((sede, index) => (
            <section key={sede.sedeId} className={index > 0 ? 'border-t border-slate-200 dark:border-slate-700' : undefined}>
              <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/60 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-500" />
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">{sede.sedeName}</h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{sede.totalTickets} tickets generados</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      <th className="w-16 px-5 py-3 text-center">Pos.</th>
                      <th className="px-3 py-3">Opción seleccionada</th>
                      <th className="w-28 px-3 py-3 text-right">Tickets</th>
                      <th className="w-64 px-5 py-3">Participación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sede.options.map((option) => (
                      <tr key={option.optionId} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                        <td className="px-5 py-4 text-center text-sm font-semibold text-slate-500">{option.position}</td>
                        <td className="px-3 py-4">
                          <p className="font-medium text-slate-900 dark:text-slate-100">{option.optionName}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {option.categoryName ?? 'Sin categoría'} · ID {option.optionId}
                          </p>
                        </td>
                        <td className="px-3 py-4 text-right text-sm font-semibold text-slate-800 dark:text-slate-100">{option.count}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                              <div
                                className="h-full rounded-full bg-blue-600"
                                style={{ width: `${Math.min(option.percentage, 100)}%` }}
                              />
                            </div>
                            <span className="w-14 text-right text-sm font-medium text-slate-600 dark:text-slate-300">{option.percentage}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </CardContent>
        <ReportPagination
          page={currentPage}
          size={size}
          totalPages={totalPages}
          onPageChange={setPage}
          onPageSizeChange={(nextSize) => {
            setSize(nextSize)
            setPage(0)
          }}
        />
      </Card>
    </section>
  )
}
