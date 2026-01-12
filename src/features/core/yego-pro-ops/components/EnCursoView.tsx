import { useState, useEffect, useMemo, useCallback } from 'react'
import { useQuery, useQueryClient, useQueries } from '@tanstack/react-query'
import { yegoProOpsService, type DriverKpiResponse, type DriverItem, type DriverTimelineResponse } from '../../../../services/yego-pro-ops-service'
import { useToastNotifications } from '../../../../hooks/useToastNotifications'
import { NotificationContainer } from '../../../../components/NotificationToast'
import { Card, CardContent } from '../../../../components/ui/card'
import { Badge } from '../../../../components/ui/badge'
import { Input } from '../../../../components/ui/input'
import { User, Activity, X, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../../../utils/cn'
import SocketService from '../../../../services/socket-service'

// ==================== CONSTANTES ====================
const HORA_DIURNO_INICIO = 6
const HORA_DIURNO_FIN = 18
const TIMELINE_HOURS = 48
const HOURS_PER_DAY = 24

// ==================== TIPOS ====================
type ViewMode = 'ayer-hoy' | 'hoy-manana'
type DriverViewState = { viewMode: ViewMode; dateOffset: number }
type OrderInfo = { bookedAt: string; endedAt: string; status: string; turnoType: 'diurno' | 'nocturno'; hourIndex: number }
type TimelineData = {
  timeline: DriverTimelineResponse
  driver: DriverItem
  hourActivity: boolean[]
  hourOrders: Map<number, OrderInfo[]>
  viewMode: ViewMode
  dateOffset: number
  baseDate: Date
}


interface EnCursoViewProps {
  statusFilter?: 'free' | 'busy' | 'in_order' | 'no-gps' | null
  onFilterChange?: (filter: 'free' | 'busy' | 'in_order' | 'no-gps' | null) => void
}

// ==================== HELPER FUNCTIONS ====================
const getDriverCode = (item: DriverItem): string => {
  if (item.car_number) return item.car_number
  if (item.code) return item.code
  return item.driver_id.substring(0, 3).toUpperCase() + item.driver_id.substring(item.driver_id.length - 3)
}

const formatTime = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

const getTurnoType = (bookedAt: string | Date): 'diurno' | 'nocturno' => {
  const bookedDate = bookedAt instanceof Date ? bookedAt : new Date(bookedAt)
  const hour = bookedDate.getHours()
  return hour >= HORA_DIURNO_INICIO && hour < HORA_DIURNO_FIN ? 'diurno' : 'nocturno'
}

const sortItems = (items: DriverItem[]): DriverItem[] => {
  return [...items].sort((a, b) => {
    const durationA = typeof a.status_duration === 'number' ? a.status_duration : 0
    const durationB = typeof b.status_duration === 'number' ? b.status_duration : 0
    return durationB - durationA
  })
}

const getDayLabels = (viewMode: ViewMode, dateOffset: number): { day1Label: string; day2Label: string } => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const baseDay = new Date(today)
  baseDay.setDate(baseDay.getDate() + dateOffset)
  
  const getRelativeDayLabel = (date: Date): string => {
    const diffDays = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Hoy'
    if (diffDays === -1) return 'Ayer'
    if (diffDays === -2) return 'Anteayer'
    if (diffDays === 1) return 'Mañana'
    if (diffDays === 2) return 'Pasado Mañana'
    return date.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' })
  }
  
  if (viewMode === 'ayer-hoy') {
    const day1 = new Date(baseDay)
    day1.setDate(day1.getDate() - 1)
    return { day1Label: getRelativeDayLabel(day1), day2Label: getRelativeDayLabel(baseDay) }
  } else {
    const day2 = new Date(baseDay)
    day2.setDate(day2.getDate() + 1)
    return { day1Label: getRelativeDayLabel(baseDay), day2Label: getRelativeDayLabel(day2) }
  }
}

const processTimelineData = (timeline: DriverTimelineResponse | null | undefined, baseDate: Date, viewMode: ViewMode) => {
    if (!timeline?.orders || timeline.orders.length === 0) {
    return { hourActivity: Array(TIMELINE_HOURS).fill(false), hourOrders: new Map<number, OrderInfo[]>() }
    }

  const hourActivity: boolean[] = Array(TIMELINE_HOURS).fill(false)
  const hourOrders = new Map<number, OrderInfo[]>()
  const baseDay = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate())
  
  const day1 = new Date(baseDay)
  const day2 = new Date(baseDay)
  if (viewMode === 'ayer-hoy') {
    day1.setDate(day1.getDate() - 1)
  } else {
    day2.setDate(day2.getDate() + 1)
  }

    timeline.orders.forEach((order) => {
      const isComplete = order.status === 'complete'
      const isCancelled = order.status === 'cancelled' || order.status === 'canceled'
      
      if ((isComplete || isCancelled) && order.booked_at) {
        const bookedDate = new Date(order.booked_at)
        const endedDate = order.ended_at ? new Date(order.ended_at) : bookedDate
      const bookedDay = new Date(bookedDate.getFullYear(), bookedDate.getMonth(), bookedDate.getDate())
      
      const isDay1 = bookedDay.getTime() === day1.getTime()
      const isDay2 = bookedDay.getTime() === day2.getTime()
      
      if (isDay1 || isDay2) {
        const baseHour = isDay1 ? 0 : HOURS_PER_DAY
        const startHour = bookedDate.getHours()
        const endHour = endedDate.getHours()
        const startHourIndex = baseHour + startHour
        const endHourIndex = baseHour + endHour
        
        for (let h = startHourIndex; h <= endHourIndex; h++) {
          if (h >= 0 && h < TIMELINE_HOURS) {
            hourActivity[h] = true
          }
        }
        
        if (!hourOrders.has(startHourIndex)) {
          hourOrders.set(startHourIndex, [])
        }
        hourOrders.get(startHourIndex)!.push({
          bookedAt: formatTime(bookedDate),
          endedAt: order.ended_at ? formatTime(endedDate) : formatTime(bookedDate),
          status: order.status,
          turnoType: getTurnoType(bookedDate),
          hourIndex: startHourIndex
        })
      }
      }
    })

    return { hourActivity, hourOrders }
}


// ==================== HOOKS ====================
const useDriverViewStates = () => {
  const [states, setStates] = useState<Map<string, DriverViewState>>(new Map())
  
  const update = useCallback((driverId: string, updates: Partial<DriverViewState>) => {
    setStates(prev => {
      const newMap = new Map(prev)
      const current = newMap.get(driverId) || { viewMode: 'hoy-manana', dateOffset: 0 }
      newMap.set(driverId, { ...current, ...updates })
      return newMap
    })
  }, [])
  
  const get = useCallback((driverId: string): DriverViewState => {
    return states.get(driverId) || { viewMode: 'hoy-manana', dateOffset: 0 }
  }, [states])
  
  return { update, get, states }
}

const getFirstTripInfo = (timeline: DriverTimelineResponse | null | undefined) => {
  if (!timeline?.orders || timeline.orders.length === 0) return null
    
  const sortedTrips = [...timeline.orders].sort((a, b) => {
    const timeA = new Date(a.booked_at || 0).getTime()
    const timeB = new Date(b.booked_at || 0).getTime()
    return timeA - timeB
  })
  
  const firstTrip = sortedTrips[0]
  if (!firstTrip?.booked_at) return null
  
  const bookedDate = new Date(firstTrip.booked_at)
  return {
    hour: bookedDate.getHours(),
    minute: bookedDate.getMinutes(),
    time: formatTime(bookedDate),
    date: bookedDate,
    tripId: firstTrip.short_id || firstTrip.id?.slice(-6) || 'N/A'
  }
}

const getCurrentHourIndex = (viewMode: ViewMode, dateOffset: number, currentHour: number): number | null => {
  if (dateOffset !== 0) return null
  return viewMode === 'ayer-hoy' ? HOURS_PER_DAY + currentHour : currentHour
}

const getFirstTripHourIndex = (firstTripInfo: ReturnType<typeof getFirstTripInfo>, baseDate: Date, viewMode: ViewMode): number | null => {
  if (!firstTripInfo) return null
  
  const firstTripDate = new Date(firstTripInfo.date)
  const firstTripDay = new Date(firstTripDate.getFullYear(), firstTripDate.getMonth(), firstTripDate.getDate())
  const baseDay = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate())
  
  const day1 = new Date(baseDay)
  const day2 = new Date(baseDay)
  if (viewMode === 'ayer-hoy') {
    day1.setDate(day1.getDate() - 1)
    } else {
    day2.setDate(day2.getDate() + 1)
  }
  
  if (firstTripDay.getTime() === day1.getTime()) return firstTripInfo.hour
  if (firstTripDay.getTime() === day2.getTime()) return HOURS_PER_DAY + firstTripInfo.hour
  return null
}

// ==================== COMPONENTES ====================
interface NavigationControlsProps {
  driverId: string
  viewMode: ViewMode
  dateOffset: number
  onUpdate: (driverId: string, updates: Partial<DriverViewState>) => void
}

const NavigationControls = ({ driverId, viewMode, dateOffset, onUpdate }: NavigationControlsProps) => (
  <div className="flex items-center gap-3">
    <div className="flex items-center gap-1.5 bg-gray-800/50 rounded-lg p-1">
      <button
        onClick={() => onUpdate(driverId, { dateOffset: dateOffset - 1 })}
        className="p-1 rounded hover:bg-gray-700 text-white transition-colors"
        aria-label="Día anterior"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onUpdate(driverId, { viewMode: 'ayer-hoy' })}
        className={cn(
          "px-2.5 py-1 rounded text-xs font-medium transition-colors",
          viewMode === 'ayer-hoy'
            ? "bg-orange-500 text-white"
            : "text-gray-400 hover:text-white hover:bg-gray-700"
        )}
      >
        Ayer y Hoy
      </button>
      <button
        onClick={() => onUpdate(driverId, { dateOffset: dateOffset + 1 })}
        className="p-1 rounded hover:bg-gray-700 text-white transition-colors"
        aria-label="Día siguiente"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
    {dateOffset !== 0 && (
      <button
        onClick={() => onUpdate(driverId, { dateOffset: 0 })}
        className="px-2 py-1 text-xs font-medium text-gray-400 hover:text-white transition-colors bg-gray-800/50 rounded-lg"
      >
        Hoy
      </button>
    )}
  </div>
)

interface TimelineHourProps {
  hourIndex: number
  isDay2: boolean
  hourIsActive: boolean
  isCurrentHour: boolean
  isPastHour: boolean
  isFutureHour: boolean
  isFirstTripHour: boolean
  isHovered: boolean
  isPinned: boolean
  viewMode: ViewMode
  ordersInHour: OrderInfo[]
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void
  onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => void
  onMouseLeave: () => void
  title: string
}

const TimelineHour = ({
  hourIndex,
  isDay2,
  hourIsActive,
  isCurrentHour,
  isPastHour,
  isFutureHour,
  isFirstTripHour,
  isHovered,
  isPinned,
  viewMode,
  ordersInHour,
  onClick,
  onMouseEnter,
  onMouseLeave,
  title
}: TimelineHourProps) => (
  <div
    className={cn(
      'flex-1 rounded-sm transition-all relative cursor-pointer group',
      hourIsActive
        ? 'bg-gradient-to-b from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 shadow-md hover:shadow-lg'
        : isPastHour
          ? 'bg-gray-700/60'
          : isFutureHour
            ? 'bg-gray-800/40'
            : 'bg-gray-600/60',
      isCurrentHour && 'ring-2 ring-blue-400 ring-offset-1 ring-offset-[#2A2A2A] shadow-[0_0_12px_rgba(96,165,250,0.4)]',
      isFirstTripHour && 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-[#2A2A2A] shadow-[0_0_12px_rgba(250,204,21,0.4)]',
      (isHovered || isPinned) && hourIsActive && 'ring-2 ring-green-300 ring-offset-1 shadow-[0_0_12px_rgba(134,239,172,0.4)]',
      isDay2 && 'opacity-90',
      hourIndex === HOURS_PER_DAY && (viewMode === 'ayer-hoy' ? 'border-l-2 border-blue-500/50' : 'border-l-2 border-purple-500/50')
    )}
    style={{ height: '40px' }}
    onClick={onClick}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    title={title}
  >
    {isFirstTripHour && (
      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-yellow-400 rounded-full shadow-lg z-10 border-2 border-[#2A2A2A] animate-pulse" />
    )}
    {isCurrentHour && !isFirstTripHour && (
      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-2.5 h-2.5 bg-blue-400 rounded-full shadow-lg z-10 animate-pulse" />
    )}
    {hourIsActive && ordersInHour.length > 0 && (
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-all bg-black/60 px-2 py-1 rounded-md shadow-lg backdrop-blur-sm">
          {ordersInHour.length}
        </span>
      </div>
    )}
    {hourIndex === HOURS_PER_DAY && (
      <div className="absolute -left-0.5 top-0 bottom-0 w-0.5 bg-purple-500/50 z-20" />
    )}
  </div>
)

// ==================== COMPONENTE PRINCIPAL ====================
export function EnCursoView({}: EnCursoViewProps) {
  const queryClient = useQueryClient()
  const { notifications, removeNotification } = useToastNotifications()
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredHour, setHoveredHour] = useState<{ driverId: string; hour: number } | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  const [pinnedHour, setPinnedHour] = useState<{ driverId: string; hour: number } | null>(null)
  const { update: updateDriverViewState, get: getDriverViewState } = useDriverViewStates()
  
  const { data: kpis, isLoading, error } = useQuery({
    queryKey: ['yego-pro-ops-kpis'],
    queryFn: () => yegoProOpsService.obtenerKpis(),
    retry: 2,
  })

  const filteredAndSortedItems: DriverItem[] = useMemo(() => {
    if (!Array.isArray(kpis?.items)) return []
    
    let filtered = kpis.items.filter(item => item.status === 'in_order')
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(item => 
        item.full_name?.toLowerCase().includes(query) ||
        item.car_number?.toLowerCase().includes(query) ||
        item.code?.toLowerCase().includes(query) ||
        item.driver_id.toLowerCase().includes(query) ||
        getDriverCode(item).toLowerCase().includes(query)
      )
    }
    
    return sortItems(filtered)
  }, [kpis?.items, searchQuery])

  // Agrupar conductores por rango de fechas
  const driversByDateRange = useMemo(() => {
    const groups = new Map<string, { driverIds: string[], dateFrom: string, dateTo: string }>()
    
    filteredAndSortedItems.forEach((driver) => {
      const driverState = getDriverViewState(driver.driver_id)
      const baseDate = new Date()
      baseDate.setDate(baseDate.getDate() + driverState.dateOffset)
      
      // Determinar rango de fechas según el modo
      const day1 = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate())
      const day2 = new Date(day1)
      if (driverState.viewMode === 'ayer-hoy') {
        day1.setDate(day1.getDate() - 1)
      } else {
        day2.setDate(day2.getDate() + 1)
      }
      
      // Formatear fechas en formato ISO 8601 con zona horaria
      const formatISO = (date: Date, isStart: boolean) => {
        const offset = -date.getTimezoneOffset()
        const offsetHours = Math.floor(Math.abs(offset) / 60)
        const offsetMinutes = Math.abs(offset) % 60
        const sign = offset >= 0 ? '+' : '-'
        const timeStr = isStart ? '00:00:00' : '23:59:59'
        return `${date.toISOString().slice(0, 10)}T${timeStr}${sign}${offsetHours.toString().padStart(2, '0')}:${offsetMinutes.toString().padStart(2, '0')}`
      }
      
      const dateFrom = formatISO(day1, true)
      const dateTo = formatISO(day2, false)
      const key = `${dateFrom}_${dateTo}`
      
      if (!groups.has(key)) {
        groups.set(key, { driverIds: [], dateFrom, dateTo })
      }
      groups.get(key)!.driverIds.push(driver.driver_id)
    })
    
    return Array.from(groups.values())
  }, [filteredAndSortedItems, getDriverViewState])

  const timelineQueries = useQueries({
    queries: driversByDateRange.map((group) => ({
      queryKey: ['yego-pro-ops-viajes-simplificados', group.driverIds.join(','), group.dateFrom, group.dateTo],
      queryFn: () => yegoProOpsService.obtenerViajesSimplificados(group.driverIds, group.dateFrom, group.dateTo),
      retry: 2,
      enabled: filteredAndSortedItems.length > 0,
    })),
  })

  const driversTimelineMap = useMemo(() => {
    const map = new Map<string, TimelineData>()
    
    // Crear un mapa de driverId -> datos de timeline desde las respuestas
    const timelineDataByDriver = new Map<string, { trips: any[], dateFrom: string, dateTo: string }>()
    
    timelineQueries.forEach((query) => {
      if (query?.data) {
        query.data.drivers.forEach((driverData) => {
          timelineDataByDriver.set(driverData.driver_id, {
            trips: driverData.trips,
            dateFrom: query.data.date_from,
            dateTo: query.data.date_to
          })
        })
      }
    })
    
    filteredAndSortedItems.forEach((driver) => {
      const driverTimelineData = timelineDataByDriver.get(driver.driver_id)
      if (driverTimelineData) {
        const driverState = getDriverViewState(driver.driver_id)
        const baseDate = new Date()
        baseDate.setDate(baseDate.getDate() + driverState.dateOffset)
        
        // Convertir la respuesta a DriverTimelineResponse para mantener compatibilidad
        const timelineResponse: DriverTimelineResponse = {
          date_from: driverTimelineData.dateFrom,
          date_to: driverTimelineData.dateTo,
          orders: driverTimelineData.trips
  }

        const { hourActivity, hourOrders } = processTimelineData(timelineResponse, baseDate, driverState.viewMode)
        
        map.set(driver.driver_id, {
          timeline: timelineResponse,
          driver: driver,
          hourActivity,
          hourOrders,
          viewMode: driverState.viewMode,
          dateOffset: driverState.dateOffset,
          baseDate
        })
    }
    })
    
    return map
  }, [filteredAndSortedItems, timelineQueries, driversByDateRange, getDriverViewState])

  const isLoadingTimeline = timelineQueries.some(query => query.isLoading)

  useEffect(() => {
    const handleKpisUpdate = (updatedKpis: DriverKpiResponse) => {
      try {
        if (updatedKpis && typeof updatedKpis === 'object') {
          queryClient.setQueriesData(
            { queryKey: ['yego-pro-ops-kpis'] },
            (oldData: DriverKpiResponse | undefined) => {
              if (oldData) {
                return { ...oldData, items: updatedKpis.items || oldData.items }
              }
              return updatedKpis
            }
          )
        }
      } catch (error) {
        console.error('❌ [EnCursoView] Error actualizando KPIs:', error)
      }
    }

    SocketService.on('pro-ops-kpis', handleKpisUpdate)
    return () => SocketService.off('pro-ops-kpis', handleKpisUpdate)
  }, [queryClient])

  const handleHourClick = useCallback((driverId: string, hour: number, hourIsActive: boolean, ordersInHour: OrderInfo[], e: React.MouseEvent<HTMLDivElement>) => {
    if (!hourIsActive || ordersInHour.length === 0) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const hourKey = { driverId, hour }
    
    if (pinnedHour && pinnedHour.driverId === driverId && pinnedHour.hour === hour) {
      setPinnedHour(null)
      setTooltipPosition(null)
    } else {
      setPinnedHour(hourKey)
      setTooltipPosition({ x: rect.left + rect.width / 2, y: rect.bottom + 10 })
    }
  }, [pinnedHour])

  const handleHourMouseEnter = useCallback((driverId: string, hour: number, hourIsActive: boolean, ordersInHour: OrderInfo[], e: React.MouseEvent<HTMLDivElement>) => {
    if (pinnedHour || !hourIsActive || ordersInHour.length === 0) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    setHoveredHour({ driverId, hour })
    setTooltipPosition({ x: rect.left + rect.width / 2, y: rect.bottom + 10 })
  }, [pinnedHour])

  const handleHourMouseLeave = useCallback((driverId: string) => {
    if (!pinnedHour || pinnedHour.driverId !== driverId) {
      setHoveredHour(null)
      setTooltipPosition(null)
    }
  }, [pinnedHour])

  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12 text-red-600 dark:text-red-400">
            Error al cargar los datos. Por favor, intenta nuevamente.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="relative">
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />
      
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
            <Activity className="w-6 h-6 text-white" />
                      </div>
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
              {filteredAndSortedItems.length} conductor{filteredAndSortedItems.length !== 1 ? 'es' : ''} activo{filteredAndSortedItems.length !== 1 ? 's' : ''}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Personal de flota en viaje
            </p>
                        </div>
          </div>
        </div>

      <Card className="mb-6 bg-[#1A1A1A] dark:bg-[#1A1A1A]">
        <CardContent className="p-0">
          <div className="p-3 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="flex-1 max-w-md">
          <Input
                  placeholder="Buscar conductor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            className="w-full"
          />
        </div>
              {searchQuery && (
                <p className="text-xs text-gray-400 whitespace-nowrap">
                  {filteredAndSortedItems.length} resultado{filteredAndSortedItems.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
      </div>

          <div className="max-h-[calc(100vh-400px)] overflow-y-auto">
            {isLoadingTimeline ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  </div>
            ) : filteredAndSortedItems.length === 0 ? (
              <div className="text-center py-12 text-neutral-700 dark:text-neutral-300 font-medium">
                No hay conductores con viaje activo
              </div>
            ) : (
              <div className="space-y-4 p-4">
                {filteredAndSortedItems.map((driver) => {
                  const timelineData = driversTimelineMap.get(driver.driver_id)
                  if (!timelineData) return null
                  
                  const { timeline, hourActivity, hourOrders, viewMode, dateOffset, baseDate } = timelineData
                  const firstTripInfo = getFirstTripInfo(timeline)
                  const totalTrips = timeline?.orders?.length || 0
                  const currentHourIndex = getCurrentHourIndex(viewMode, dateOffset, currentHour)
                  const firstTripHourIndex = getFirstTripHourIndex(firstTripInfo, baseDate, viewMode)
                  const { day1Label, day2Label } = getDayLabels(viewMode, dateOffset)
                  
                  return (
                    <Card key={driver.driver_id} className="bg-gradient-to-br from-[#1A1A1A] to-[#252525] border border-gray-800/50 shadow-lg hover:shadow-xl transition-all duration-300">
                      <CardContent className="p-3">
                        <div className="mb-3 pb-3 border-b border-gray-800">
                    <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                {driver.photo_url ? (
                          <img
                                    src={driver.photo_url}
                                    alt={driver.full_name || 'Conductor'}
                                    className="w-12 h-12 rounded-lg object-cover border-2 border-orange-500/30"
                          />
                        ) : (
                                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center border-2 border-gray-600">
                                    <User className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-orange-500 rounded-full border-2 border-[#1A1A1A]" />
                      </div>
                              <div className="flex-1">
                                <h3 className="font-bold text-white text-base mb-1">
                                  {driver.full_name || 'Sin nombre'}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  <Badge variant="outline" className="bg-gray-800/50 text-gray-300 border-gray-700 px-1.5 py-0.5">
                                    {getDriverCode(driver)}
                                  </Badge>
                                  {firstTripInfo && (
                                    <>
                                      <span className="text-gray-500">•</span>
                                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/10 rounded border border-blue-500/20">
                                        <span className="text-blue-400 font-medium">Primer viaje:</span>
                                        <span className="text-blue-300">{firstTripInfo.time}</span>
                                        <span className="text-gray-500">(ID: {firstTripInfo.tripId})</span>
                                      </div>
                                    </>
                                  )}
                                  <span className="text-gray-500">•</span>
                                  <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30 px-1.5 py-0.5 font-medium">
                                    {totalTrips} viaje{totalTrips !== 1 ? 's' : ''}
                                  </Badge>
                      </div>
                              </div>
                            </div>
                            <Badge variant="secondary" className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 text-orange-300 border border-orange-500/40 px-3 py-1 font-semibold">
                              En viaje
                            </Badge>
                    </div>
                    
                          <NavigationControls
                            driverId={driver.driver_id}
                            viewMode={viewMode}
                            dateOffset={dateOffset}
                            onUpdate={updateDriverViewState}
                          />
                      </div>
                  
                        <div className="relative overflow-visible bg-gradient-to-br from-[#2A2A2A] to-[#1F1F1F] rounded-lg p-2.5 border border-gray-800/50 shadow-inner">
                          <div className={cn(
                            "absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent to-transparent z-10",
                            viewMode === 'ayer-hoy' ? "via-blue-500/30" : "via-purple-500/30"
                          )} />
                          
                          <div className="flex justify-between mb-2 px-1">
                            {Array.from({ length: TIMELINE_HOURS }, (_, hourIndex) => {
                              const hour = hourIndex < HOURS_PER_DAY ? hourIndex : hourIndex - HOURS_PER_DAY
                              const isDay1 = hourIndex < HOURS_PER_DAY
                              const isDay2 = hourIndex >= HOURS_PER_DAY
                              const isCurrentHour = currentHourIndex !== null && hourIndex === currentHourIndex
                              
                              return (
                              <span
                                  key={hourIndex}
                                className={cn(
                                    'text-xs w-[calc(100%/48)] text-center transition-all',
                                    isCurrentHour
                                      ? 'text-blue-400 font-bold text-sm drop-shadow-[0_0_4px_rgba(96,165,250,0.5)]'
                                      : hour % 6 === 0
                                        ? 'text-gray-400 font-medium'
                                        : 'text-transparent'
                                )}
                                  title={isDay1 ? `${day1Label} ${hour}:00` : `${day2Label} ${hour}:00`}
                              >
                                  {hour % 6 === 0 || isCurrentHour ? (
                                    <div className="flex flex-col items-center">
                                      {(isDay1 && hourIndex === 0) || (isDay2 && hourIndex === HOURS_PER_DAY) ? (
                                        <span className={cn(
                                          "text-[10px] font-semibold mb-0.5",
                                          isDay1 
                                            ? (viewMode === 'ayer-hoy' ? "text-gray-500" : "text-blue-400")
                                            : (viewMode === 'ayer-hoy' ? "text-blue-400" : "text-purple-400")
                                        )}>
                                          {isDay1 ? day1Label : day2Label}
                              </span>
                                      ) : null}
                                      <span className={cn(isCurrentHour && "bg-blue-500/20 px-1.5 py-0.5 rounded")}>
                                        {hour.toString().padStart(2, '0')}
                                      </span>
                                    </div>
                                  ) : ''}
                                </span>
                              )
                            })}
                          </div>
                          
                          <div className="flex gap-0.5 relative mb-2">
                            {Array.from({ length: TIMELINE_HOURS }, (_, hourIndex) => {
                              const hour = hourIndex < HOURS_PER_DAY ? hourIndex : hourIndex - HOURS_PER_DAY
                              const isDay1 = hourIndex < HOURS_PER_DAY
                              const isDay2 = hourIndex >= HOURS_PER_DAY
                              const hourIsActive = hourActivity[hourIndex]
                              const isCurrentHour = currentHourIndex !== null && hourIndex === currentHourIndex
                              const isPastHour = currentHourIndex !== null && hourIndex < currentHourIndex
                              const isFutureHour = currentHourIndex !== null ? hourIndex > currentHourIndex : isDay2
                              const ordersInHour = hourOrders.get(hourIndex) || []
                              const isFirstTripHour = firstTripHourIndex !== null && hourIndex === firstTripHourIndex
                              const isHovered = hoveredHour?.driverId === driver.driver_id && hoveredHour?.hour === hourIndex
                              const isPinned = pinnedHour?.driverId === driver.driver_id && pinnedHour?.hour === hourIndex
                              
                              const title = isFirstTripHour 
                                ? `Primer viaje a las ${firstTripInfo?.time}` 
                                : hourIsActive 
                                  ? `${ordersInHour.length} viaje${ordersInHour.length > 1 ? 's' : ''} ${isDay1 ? day1Label : day2Label} a las ${hour.toString().padStart(2, '0')}:00` 
                                  : `${isDay1 ? day1Label.charAt(0).toUpperCase() + day1Label.slice(1) : day2Label.charAt(0).toUpperCase() + day2Label.slice(1)} ${hour.toString().padStart(2, '0')}:00`
                              
                              return (
                                <TimelineHour
                                  key={hourIndex}
                                  hourIndex={hourIndex}
                                  isDay2={isDay2}
                                  hourIsActive={hourIsActive}
                                  isCurrentHour={isCurrentHour}
                                  isPastHour={isPastHour}
                                  isFutureHour={isFutureHour}
                                  isFirstTripHour={isFirstTripHour}
                                  isHovered={isHovered}
                                  isPinned={isPinned}
                                  viewMode={viewMode}
                                  ordersInHour={ordersInHour}
                                  onClick={(e) => handleHourClick(driver.driver_id, hourIndex, hourIsActive, ordersInHour, e)}
                                  onMouseEnter={(e) => handleHourMouseEnter(driver.driver_id, hourIndex, hourIsActive, ordersInHour, e)}
                                  onMouseLeave={() => handleHourMouseLeave(driver.driver_id)}
                                  title={title}
                                />
                              )
                            })}
                      
                            {((hoveredHour?.driverId === driver.driver_id && hoveredHour?.hour !== null && hoveredHour?.hour !== undefined) || 
                              (pinnedHour?.driverId === driver.driver_id && pinnedHour?.hour !== null && pinnedHour?.hour !== undefined)) && 
                              tooltipPosition && (() => {
                              const activeHourIndex = pinnedHour?.driverId === driver.driver_id ? pinnedHour.hour : hoveredHour?.hour
                              if (activeHourIndex === null || activeHourIndex === undefined) return null
                              const orders = hourOrders.get(activeHourIndex)
                              if (!orders || orders.length === 0) return null
                              
                              const isDay1 = activeHourIndex < HOURS_PER_DAY
                              const realHour = isDay1 ? activeHourIndex : activeHourIndex - HOURS_PER_DAY
                              const dayLabel = isDay1 ? day1Label : day2Label
                              
                              return (
                                <div
                                  className="fixed z-[9999] bg-[#1A1D29] text-white rounded-xl shadow-2xl min-w-[320px] max-w-[380px] border border-gray-700/30 backdrop-blur-md overflow-hidden"
                                  style={{
                                    left: `${tooltipPosition.x}px`,
                                    top: `${tooltipPosition.y}px`,
                                    transform: 'translate(-50%, 0)',
                                    pointerEvents: 'auto'
                                  }}
                                >
                                  <div className="bg-gradient-to-r from-[#1F222E] to-[#1A1D29] px-3 py-2.5 border-b border-gray-700/30">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className={cn(
                                          "w-2 h-2 rounded-full",
                                          activeHourIndex < HOURS_PER_DAY 
                                            ? (viewMode === 'ayer-hoy' ? "bg-gray-500" : "bg-blue-400")
                                            : (viewMode === 'ayer-hoy' ? "bg-blue-400" : "bg-purple-400")
                                        )} />
                                        <div>
                                          <div className="text-sm font-bold text-white">
                                            {dayLabel} {realHour.toString().padStart(2, '0')}:00
                                    </div>
                                          <div className="text-xs text-gray-400">
                                            {orders.length} viaje{orders.length > 1 ? 's' : ''} registrado{orders.length > 1 ? 's' : ''}
                                          </div>
                                        </div>
                                      </div>
                                      {pinnedHour?.driverId === driver.driver_id && pinnedHour?.hour === activeHourIndex && (
                                      <button
                                        onClick={() => {
                                          setPinnedHour(null)
                                          setTooltipPosition(null)
                                        }}
                                          className="text-gray-400 hover:text-white transition-all p-1 rounded hover:bg-gray-800/50"
                                        aria-label="Cerrar"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                  </div>
                                  
                                  <div className="p-3 space-y-2 max-h-[300px] overflow-y-auto">
                                    {orders.map((order, index) => {
                                      const statusLabel = order.status === 'complete' ? 'Completado' : 
                                                         (order.status === 'cancelled' || order.status === 'canceled') ? 'Cancelado' : 
                                                         order.status
                                      const isCompleted = order.status === 'complete'
                                      
                                      return (
                                        <div
                                          key={index}
                                          className="bg-[#1F222E] rounded-lg p-3 border border-gray-800/50 hover:border-gray-700/50 transition-all relative overflow-hidden"
                                        >
                                          <div className={cn(
                                            "absolute left-0 top-0 bottom-0 w-1 rounded-l-lg",
                                            isCompleted ? "bg-green-500" : "bg-red-500"
                                          )} />
                                          
                                          <div className="pl-3">
                                            <div className="flex items-center gap-2 mb-2">
                                              <span className="text-sm font-bold text-green-400">{order.bookedAt}</span>
                                              <span className="text-gray-600">→</span>
                                              <span className="text-sm font-bold text-green-300">{order.endedAt}</span>
                                            </div>
                                            
                                            <div className="flex items-center gap-2">
                                              <Badge
                                                variant="outline"
                                                className={cn(
                                                  'text-xs px-2 py-0.5 font-medium border-0',
                                                  isCompleted
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : 'bg-red-500/20 text-red-400'
                                                )}
                                              >
                                                {statusLabel}
                                              </Badge>
                                            <Badge
                                              variant="secondary"
                                              className={cn(
                                                  'text-xs px-2 py-0.5 font-medium border-0',
                                                order.turnoType === 'diurno'
                                                  ? 'bg-blue-500 text-white'
                                                  : 'bg-purple-500 text-white'
                                              )}
                                            >
                                              {order.turnoType === 'diurno' ? 'Diurno' : 'Nocturno'}
                                            </Badge>
                                            </div>
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )
                            })()}
                          </div>
                          
                          <div className="flex justify-between items-center mt-2 px-1 pt-1.5 border-t border-gray-800">
                            <span className="text-xs text-gray-500 font-medium">{day1Label} 00:00</span>
                            {currentHourIndex !== null && (
                              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 rounded border border-blue-500/30">
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                                <span className="text-xs text-blue-400 font-semibold">
                                  {currentHour.toString().padStart(2, '0')}:{currentMinute.toString().padStart(2, '0')}
                            </span>
                          </div>
                            )}
                            <span className="text-xs text-gray-500 font-medium">{day2Label} 23:59</span>
                  </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
                  </div>
                )}
          </div>
          </CardContent>
        </Card>
    </div>
  )
}
