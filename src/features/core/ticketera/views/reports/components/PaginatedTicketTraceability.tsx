import { useEffect, useState } from 'react'
import { isCancelledRequest } from '../../../domain'
import {
  reportsService,
  type ReportFilters,
  type TicketTraceabilityPage,
} from '../services/reportsService'
import { TicketTraceabilityPanel } from './TicketTraceabilityPanel'

interface Props {
  filters: ReportFilters
}

const EMPTY_PAGE: TicketTraceabilityPage = {
  content: [],
  page: 0,
  size: 20,
  totalElements: 0,
  totalPages: 0,
  first: true,
  last: true,
}

export function PaginatedTicketTraceability({ filters }: Props) {
  const { fechaInicio, fechaFin, sedeId } = filters
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [data, setData] = useState<TicketTraceabilityPage>(EMPTY_PAGE)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setPage(0)
  }, [fechaInicio, fechaFin, sedeId])

  useEffect(() => {
    const controller = new AbortController()

    const loadPage = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await reportsService.getTicketTraceability(
          { fechaInicio, fechaFin, sedeId, page, size },
          controller.signal,
        )
        if (response.totalPages > 0 && response.page >= response.totalPages) {
          setPage(response.totalPages - 1)
          return
        }
        setData(response)
      } catch (requestError) {
        if (isCancelledRequest(requestError)) return
        setError('No se pudo cargar la trazabilidad. Intenta nuevamente.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void loadPage()
    return () => controller.abort()
  }, [fechaInicio, fechaFin, page, sedeId, size])

  return (
    <TicketTraceabilityPanel
      tickets={data.content}
      page={data.page}
      size={data.size}
      totalPages={data.totalPages}
      loading={loading}
      error={error}
      onPageChange={setPage}
      onPageSizeChange={(nextSize) => {
        setSize(nextSize)
        setPage(0)
      }}
    />
  )
}
