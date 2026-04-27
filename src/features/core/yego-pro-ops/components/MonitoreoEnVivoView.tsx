import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useInfiniteQuery, useQueryClient, useQueries } from '@tanstack/react-query'
import { useToastNotifications } from '../../../../hooks/useToastNotifications'
import { NotificationContainer } from '../../../../components/NotificationToast'
import { Card, CardContent } from '../../../../components/ui/card'
import { Badge } from '../../../../components/ui/badge'
import { Input } from '../../../../components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/ui/dialog'
import { Activity, Search, User, Car, DollarSign, Navigation } from 'lucide-react'
import { cn } from '../../../../utils/cn'
import SocketService from '../../../../services/socket-service'
import { useConnectionStatus } from '../../../../shared/hooks/useConnectionStatus'
import { yegoProOpsService, type ConductoresEnOrdenResponse, type ConductorEnOrden } from '../../../../services/yego-pro-ops-service'

const ITEMS_PER_PAGE = 4
const OBSERVER_THRESHOLD = 0.1
const TIMELINE_HOURS = 48
const HOURS_PER_DAY = 24

type OrderInfo = { bookedAt: string; endedAt: string; status: string; hourIndex: number }
type ViajePorFecha = {
  status: string
  short_id: number
  id: string
  ended_at: string | null
  booked_at: string
}

const getAyerYHoyDates = () => {
  const today = new Date()
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const yesterdayDate = new Date(todayDate)
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  return { todayDate, yesterdayDate }
}

const formatDateToString = (date: Date): string => date.toISOString().split('T')[0]

const getDayLabels = (): { day1Label: string; day2Label: string } => {
  const { yesterdayDate, todayDate } = getAyerYHoyDates()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const getRelativeDayLabel = (date: Date): string => {
    const diffDays = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Hoy'
    if (diffDays === -1) return 'Ayer'
    if (diffDays === 1) return 'Mañana'
    return date.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' })
  }
  
  return { day1Label: getRelativeDayLabel(yesterdayDate), day2Label: getRelativeDayLabel(todayDate) }
}

const formatBalance = (balance: string | number): string => {
  const numBalance = typeof balance === 'string' ? parseFloat(balance) : balance
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numBalance)
}

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const formatDistance = (distance: number): string => {
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(distance)
}

const formatActivityTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${secs}s`
  return `${secs}s`
}

const formatTime = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

const getStatusInfo = (status: string | undefined) => {
  const normalizedStatus = status?.toLowerCase() || ''
  
  if (normalizedStatus === 'completed' || normalizedStatus === 'complete') {
    return {
      label: 'Completado',
      className: 'bg-green-500/20 text-green-300 border border-green-500/30'
    }
  }
  
  if (normalizedStatus === 'cancelled' || normalizedStatus === 'canceled') {
    return {
      label: 'Cancelado',
      className: 'bg-red-500/20 text-red-300 border border-red-500/30'
    }
  }
  
  if (normalizedStatus === 'in_progress' || normalizedStatus === 'in progress') {
    return {
      label: 'En curso',
      className: 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
    }
  }
  
  return {
    label: status || 'Desconocido',
    className: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
  }
}

const processTimelineData = (trips: ViajePorFecha[]): { hourActivity: boolean[]; hourOrders: Map<number, OrderInfo[]> } => {
  if (!trips || trips.length === 0) {
    return { hourActivity: Array(TIMELINE_HOURS).fill(false), hourOrders: new Map<number, OrderInfo[]>() }
  }

  const hourActivity: boolean[] = Array(TIMELINE_HOURS).fill(false)
  const hourOrders = new Map<number, OrderInfo[]>()
  const { yesterdayDate, todayDate } = getAyerYHoyDates()

  trips.forEach((trip) => {
    if (trip.booked_at) {
      const bookedDate = new Date(trip.booked_at)
      const endedDate = trip.ended_at ? new Date(trip.ended_at) : bookedDate
      const bookedDay = new Date(bookedDate.getFullYear(), bookedDate.getMonth(), bookedDate.getDate())
      
      const isDay1 = bookedDay.getTime() === yesterdayDate.getTime()
      const isDay2 = bookedDay.getTime() === todayDate.getTime()
      
      if (isDay1 || isDay2) {
        const baseHour = isDay1 ? 0 : HOURS_PER_DAY
        const startHour = bookedDate.getHours()
        const startHourIndex = baseHour + startHour

        if (startHourIndex >= 0 && startHourIndex < TIMELINE_HOURS) {
          hourActivity[startHourIndex] = true
        }
        
        if (!hourOrders.has(startHourIndex)) {
          hourOrders.set(startHourIndex, [])
        }
        hourOrders.get(startHourIndex)!.push({
          bookedAt: formatTime(bookedDate),
          endedAt: trip.ended_at ? formatTime(endedDate) : formatTime(bookedDate),
          status: trip.status,
          hourIndex: startHourIndex
        })
      }
    }
  })

  return { hourActivity, hourOrders }
}

const processTimelineCompact = (trips: ViajePorFecha[]): boolean[] => {
  if (!trips || trips.length === 0) {
    return Array(24).fill(false)
  }

  const hourActivity: boolean[] = Array(24).fill(false)
  const { todayDate } = getAyerYHoyDates()
  
  trips.forEach((trip) => {
    if (!trip.booked_at) return
    
    const bookedDate = new Date(trip.booked_at)
    const bookedDay = new Date(bookedDate.getFullYear(), bookedDate.getMonth(), bookedDate.getDate())
    
    if (bookedDay.getTime() !== todayDate.getTime()) return
    
    const startHour = bookedDate.getHours()
    const endedDate = trip.ended_at ? new Date(trip.ended_at) : bookedDate
    const endHour = endedDate.getHours()
    
    for (let h = startHour; h <= endHour; h++) {
      if (h >= 0 && h < 24) {
        hourActivity[h] = true
      }
    }
  })

  return hourActivity
}

const LoadingState = () => (
  <Card className="h-full bg-[#1A1A1A]">
    <CardContent className="p-6">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Cargando conductores en orden...</p>
        </div>
      </div>
    </CardContent>
  </Card>
)

const EmptyState = ({ searchQuery, isConnected }: { searchQuery: string; isConnected: boolean }) => (
  <Card className="h-full bg-[#1A1A1A]">
    <CardContent className="p-6">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-700 flex items-center justify-center">
            <Activity className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-400 text-lg">
            {searchQuery ? 'No se encontraron conductores' : 'No hay conductores en orden'}
          </p>
          {!isConnected && !searchQuery && (
            <p className="text-red-400 text-xs mt-4">
              ⚠️ Sin conexión WebSocket. Los datos se actualizarán cada 30 segundos.
            </p>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
)

const StatsCard = ({ icon: Icon, label, value, iconColor }: { 
  icon: any
  label: string
  value: string | number
  iconColor: string
}) => (
  <Card className="bg-[#2A2A2A] border-gray-700">
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", iconColor)}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
      </div>
    </CardContent>
  </Card>
)

const ConductorCard = ({ 
  conductor, 
  onOpenModal
}: { 
  conductor: ConductorEnOrden
  onOpenModal?: () => void
}) => {
  const viajes = conductor.viajes || []
  const hourActivity = useMemo(() => processTimelineCompact(viajes), [viajes])
  const currentHour = new Date().getHours()

  return (
    <Card className="bg-[#2A2A2A] border-gray-700 hover:border-orange-500 transition-colors">
      <CardContent className="p-3">
        {/* Header */}
        <div className="flex items-start gap-2 mb-2">
          <div className="relative">
            {conductor.avatar_url ? (
              <img
                src={conductor.avatar_url}
                alt={`${conductor.first_name} ${conductor.last_name}`}
                className="w-12 h-12 rounded-lg object-cover border-2 border-orange-500"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gray-600 flex items-center justify-center border-2 border-orange-500">
                <User className="w-6 h-6 text-gray-400" />
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-orange-500 rounded-full border-2 border-[#2A2A2A] flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="text-white font-bold text-sm line-clamp-1 flex-1 pt-0.5">
                {conductor.first_name} {conductor.last_name}
              </h3>
              <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                {conductor.completed_trips_total_price !== undefined && (
                  <div className="px-1.5 py-0 rounded-md bg-green-500/10 border border-green-500/30">
                    <span className="text-[10px] font-semibold text-green-300 leading-tight">
                      {formatBalance(conductor.completed_trips_total_price)}
                    </span>
                  </div>
                )}
                {conductor.completed_trips_count !== undefined && (
                  <div className="px-1.5 py-0 rounded-md bg-orange-500/10 border border-orange-500/30">
                    <span className="text-[10px] font-semibold text-orange-300 leading-tight">
                      {conductor.completed_trips_count} viajes
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Badge de vehículo */}
            {conductor.vehicle_number && (
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <Badge variant="outline" className="text-[10px] border-gray-500/50 text-gray-200 px-2 py-1 bg-gray-700/30">
                  <Car className="w-3 h-3 mr-1" />
                  {conductor.vehicle_number}
                </Badge>
              </div>
            )}

            {/* Métricas */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {conductor.summary_distance?.free !== undefined && conductor.summary_distance.free > 0 && (
                <Badge variant="outline" className="text-[10px] border-yellow-500/40 text-yellow-300 px-2 py-1 bg-yellow-500/15">
                  <Navigation className="w-3 h-3 mr-1" />
                  {formatDistance(conductor.summary_distance.free)} km libre
                </Badge>
              )}
              {conductor.summary_distance?.not_active !== undefined && conductor.summary_distance.not_active > 0 && (
                <Badge variant="outline" className="text-[10px] border-gray-500/40 text-gray-300 px-2 py-1 bg-gray-500/15">
                  <Navigation className="w-3 h-3 mr-1" />
                  {formatDistance(conductor.summary_distance.not_active)} km inactivo
                </Badge>
              )}
              {conductor.summary_distance?.active !== undefined && conductor.summary_distance.active > 0 && (
                <Badge variant="outline" className="text-[10px] border-blue-500/40 text-blue-300 px-2 py-1 bg-blue-500/15">
                  <Navigation className="w-3 h-3 mr-1" />
                  {formatDistance(conductor.summary_distance.active)} km activo
                </Badge>
              )}
              {conductor.total_activity_time !== undefined && conductor.total_activity_time !== null && (
                <Badge variant="outline" className="text-[10px] border-purple-500/40 text-purple-300 px-2 py-1 bg-purple-500/15">
                  <Activity className="w-3 h-3 mr-1" />
                  {formatActivityTime(conductor.total_activity_time)}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Timeline compacto */}
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-300">Hoy</span>
          </div>
          <div 
            onClick={onOpenModal}
            className="relative bg-gradient-to-br from-[#2A2A2A] to-[#1F1F1F] rounded-lg p-2 border border-gray-800/50 cursor-pointer hover:border-orange-500/50 transition-colors"
          >
            <div className="flex justify-between mb-1 px-1">
              {Array.from({ length: 24 }, (_, hourIndex) => {
                const hour = hourIndex
                const isCurrentHour = hour === currentHour
                
                return (
                  <span
                    key={hourIndex}
                    className={cn(
                      'text-[10px] w-[calc(100%/24)] text-center transition-all',
                      isCurrentHour
                        ? 'text-blue-400 font-bold'
                        : hour % 6 === 0
                          ? 'text-gray-400 font-medium'
                          : 'text-transparent'
                    )}
                  >
                    {hour % 6 === 0 || isCurrentHour ? hour.toString().padStart(2, '0') : ''}
                  </span>
                )
              })}
            </div>
            
            <div className="flex gap-0.5">
              {Array.from({ length: 24 }, (_, hourIndex) => {
                const hour = hourIndex
                const hourIsActive = hourActivity[hourIndex]
                const isCurrentHour = hour === currentHour
                const isPastHour = hour < currentHour
                const isFutureHour = hour > currentHour
                
                return (
                  <div
                    key={hourIndex}
                    className={cn(
                      'flex-1 rounded-sm transition-all relative group',
                      hourIsActive
                        ? 'bg-gradient-to-b from-green-500 to-green-600 hover:from-green-400 hover:to-green-500'
                        : isPastHour
                          ? 'bg-gray-700/60'
                          : isFutureHour
                            ? 'bg-gray-800/40'
                            : 'bg-gray-600/60',
                      isCurrentHour && 'ring-1 ring-blue-400'
                    )}
                    style={{ height: '24px' }}
                    title={`Hoy ${hour.toString().padStart(2, '0')}:00${hourIsActive ? ' - Con viajes' : ''}`}
                  >
                    {hourIsActive && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[8px] font-bold text-white opacity-0 group-hover:opacity-100 transition-all bg-black/60 px-1 py-0.5 rounded">
                          ✓
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const InfiniteScrollObserver = ({ 
  hasNextPage, 
  isFetchingNextPage, 
  observerRef 
}: { 
  hasNextPage: boolean
  isFetchingNextPage: boolean
  observerRef: React.RefObject<HTMLDivElement | null>
}) => {
  if (!hasNextPage) return null

  return (
    <div ref={observerRef} className="flex items-center justify-center py-6">
      {isFetchingNextPage ? (
        <div className="flex items-center gap-2 text-gray-400">
          <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Cargando más conductores...</span>
        </div>
      ) : (
        <div className="h-1" />
      )}
    </div>
  )
}

const useFilteredConductores = (
  conductores: ConductorEnOrden[] | undefined,
  searchQuery: string
) => {
  return useMemo(() => {
    if (!conductores) return []
    if (!searchQuery.trim()) return conductores

    const query = searchQuery.toLowerCase()
    return conductores.filter(c => 
      c.first_name?.toLowerCase().includes(query) ||
      c.last_name?.toLowerCase().includes(query) ||
      (c.vehicle_number?.toLowerCase() || '').includes(query) ||
      c.id.toLowerCase().includes(query)
    )
  }, [conductores, searchQuery])
}

const useConductoresData = (data: any) => {
  return useMemo(() => {
    if (!data) return null

    const conductoresMap = new Map<string, ConductorEnOrden>()
    
    data.pages.forEach((page: ConductoresEnOrdenResponse) => {
      if (page.conductores && Array.isArray(page.conductores)) {
        page.conductores.forEach((conductor: ConductorEnOrden) => {
          conductoresMap.set(conductor.id, conductor)
        })
      }
    })

    const conductoresUnicos = Array.from(conductoresMap.values())

    return {
      type: 'DRIVERS_IN_ORDER_UPDATE',
      total: data.pages[0]?.total || 0,
      timestamp: data.pages[0]?.timestamp || new Date().toISOString(),
      conductores: conductoresUnicos,
    }
  }, [data])
}

export function MonitoreoEnVivoView() {
  const { notifications, removeNotification } = useToastNotifications()
  const { isConnected } = useConnectionStatus()
  const [searchQuery, setSearchQuery] = useState('')
  const observerTarget = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const [selectedDriverForModal, setSelectedDriverForModal] = useState<{ driverId: string; conductor: ConductorEnOrden } | null>(null)
  const [hoveredHourIndex, setHoveredHourIndex] = useState<number | null>(null)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isSuccess
  } = useInfiniteQuery({
    queryKey: ['pro-ops-conductores-en-orden'],
    queryFn: ({ pageParam = 0 }) => yegoProOpsService.obtenerConductoresEnOrden(pageParam, ITEMS_PER_PAGE),
    getNextPageParam: (lastPage, allPages) => {
      const totalCargados = allPages.reduce((acc, page) => acc + page.conductores.length, 0)
      return totalCargados < lastPage.total ? allPages.length : undefined
    },
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    staleTime: Infinity,
    gcTime: Infinity,
    initialPageParam: 0,
  })

  const conductoresEnOrden = useConductoresData(data)
  const conductoresFiltrados = useFilteredConductores(conductoresEnOrden?.conductores, searchQuery)

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [target] = entries
    if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  useEffect(() => {
    const element = observerTarget.current
    if (!element) return

    const observer = new IntersectionObserver(handleObserver, {
      threshold: OBSERVER_THRESHOLD
    })

    observer.observe(element)
    return () => observer.unobserve(element)
  }, [handleObserver])

  useEffect(() => {
    if (!isSuccess || !data) return

    const handleConductoresEnOrdenUpdate = (wsData: ConductoresEnOrdenResponse) => {
      if (wsData?.type === 'DRIVERS_IN_ORDER_UPDATE' && wsData.conductores) {
        queryClient.setQueryData(['pro-ops-conductores-en-orden'], (oldData: any) => {
          if (!oldData) return oldData

          const conductoresMap = new Map<string, ConductorEnOrden>()
          
          for (let i = 1; i < oldData.pages.length; i++) {
            const page = oldData.pages[i]
            if (page?.conductores && Array.isArray(page.conductores)) {
              page.conductores.forEach((conductor: ConductorEnOrden) => {
                conductoresMap.set(conductor.id, conductor)
              })
            }
          }
          
          wsData.conductores.forEach((conductor: ConductorEnOrden) => {
            conductoresMap.set(conductor.id, conductor)
          })

          const updatedTimestamp = new Date().toISOString()

          const updatedPages = [
            {
              ...wsData,
              type: 'DRIVERS_IN_ORDER_UPDATE',
              total: wsData.total,
              timestamp: updatedTimestamp,
              conductores: wsData.conductores,
            },
            ...oldData.pages.slice(1).map((page: ConductoresEnOrdenResponse) => ({
              ...page,
              conductores: page.conductores?.filter((c: ConductorEnOrden) => 
                !wsData.conductores.some((wc: ConductorEnOrden) => wc.id === c.id)
              ) || []
            }))
          ]

          return {
            ...oldData,
            pages: updatedPages
          }
        })
      }
    }

    SocketService.on('pro-ops-conductores-en-orden', handleConductoresEnOrdenUpdate)
    return () => {
      SocketService.off('pro-ops-conductores-en-orden', handleConductoresEnOrdenUpdate)
    }
  }, [isSuccess, data, queryClient])

  const modalDateQueries = useMemo(() => {
    const queries: Array<{ driverId: string; fecha: string }> = []

    if (!selectedDriverForModal) return queries

    const { yesterdayDate } = getAyerYHoyDates()
    const fechaAyer = formatDateToString(yesterdayDate)

    queries.push({ driverId: selectedDriverForModal.driverId, fecha: fechaAyer })

    return queries
  }, [selectedDriverForModal])

  const viajesModalQueries = useQueries({
    queries: modalDateQueries.map(({ driverId, fecha }) => ({
      queryKey: ['pro-ops-viajes-por-fecha', driverId, fecha],
      queryFn: () => yegoProOpsService.obtenerViajesPorFecha(driverId, fecha),
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      staleTime: 5 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      enabled: !!selectedDriverForModal,
    })),
  })

  const isLoadingViajesAyer = viajesModalQueries.some(query => query.isLoading || query.isFetching)

  const hasNoViajesAyer = useMemo(() => {
    if (!selectedDriverForModal) return false
    if (isLoadingViajesAyer) return false

    const allQueriesFinished = viajesModalQueries.every(query => !query.isLoading && !query.isFetching)
    if (!allQueriesFinished) return false

    const viajesAyer: ViajePorFecha[] = []
    viajesModalQueries.forEach((query, index) => {
      if (query.data && modalDateQueries[index]) {
        viajesAyer.push(...(query.data.trips || []))
      }
    })

    return viajesAyer.length === 0
  }, [viajesModalQueries, modalDateQueries, selectedDriverForModal, isLoadingViajesAyer])

  const viajesPorConductorModal = useMemo(() => {
    const map = new Map<string, ViajePorFecha[]>()

    if (!selectedDriverForModal) return map

    const { driverId, conductor } = selectedDriverForModal

    const viajesAyer: ViajePorFecha[] = []
    viajesModalQueries.forEach((query, index) => {
      if (query.data && modalDateQueries[index]) {
        viajesAyer.push(...(query.data.trips || []))
      }
    })

    const viajesHoy: ViajePorFecha[] = conductor.viajes || []
    map.set(driverId, [...viajesAyer, ...viajesHoy])

    return map
  }, [viajesModalQueries, modalDateQueries, selectedDriverForModal])

  const stats = useMemo(() => {
    if (!conductoresEnOrden) return null

    return {
      total: conductoresEnOrden.total,
      totalViajes: conductoresEnOrden.conductores.reduce((sum: number, c: ConductorEnOrden) => sum + (c.completed_trips_count || 0), 0),
      totalPlata: conductoresEnOrden.conductores.reduce((sum: number, c: ConductorEnOrden) => sum + (c.completed_trips_total_price || 0), 0)
    }
  }, [conductoresEnOrden])

  const handleOpenModal = useCallback((driverId: string) => {
    const conductor = conductoresEnOrden?.conductores.find(c => c.id === driverId)
    if (conductor) {
      setSelectedDriverForModal({ driverId, conductor })
    }
  }, [conductoresEnOrden])

  const { day1Label, day2Label } = getDayLabels()
                
  return (
    <div className="relative">
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">Monitoreo en Vivo</h2>
            <Badge 
              variant="outline"
              className={cn(
                "flex items-center gap-2",
                isConnected ? "border-green-500 text-green-400" : "border-red-500 text-red-400"
              )}
            >
              <div className={cn(
                "w-2 h-2 rounded-full",
                isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
              )} />
              {isConnected ? "En Vivo" : "Desconectado"}
            </Badge>
          </div>
          {conductoresEnOrden?.timestamp && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Activity className="w-4 h-4" />
              <span>Última actualización: {formatTimestamp(conductoresEnOrden.timestamp)}</span>
            </div>
          )}
        </div>
            
        {/* Estadísticas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatsCard
              icon={Activity}
              label="Conductores en Orden"
              value={stats.total}
              iconColor="bg-orange-500/20 text-orange-400"
            />
            <StatsCard
              icon={Car}
              label="Cantidad de Viajes"
              value={stats.totalViajes}
              iconColor="bg-blue-500/20 text-blue-400"
            />
            <StatsCard
              icon={DollarSign}
              label="Plata Generada"
              value={formatBalance(stats.totalPlata)}
              iconColor="bg-green-500/20 text-green-400"
            />
          </div>
        )}

        {/* Búsqueda */}
        <div className="flex items-center gap-4 flex-wrap justify-between">
          <Input
            placeholder="Buscar por nombre, vehículo o ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            className="w-full max-w-md"
          />
          {conductoresEnOrden && (
            <div className="text-sm text-gray-400">
              Mostrando {conductoresFiltrados.length} de {conductoresEnOrden.total} conductores
            </div>
          )}
        </div>

        {/* Lista de conductores */}
        {isLoading ? (
          <LoadingState />
        ) : !conductoresEnOrden ? (
          <EmptyState searchQuery="" isConnected={isConnected} />
        ) : conductoresFiltrados.length === 0 ? (
          <EmptyState searchQuery={searchQuery} isConnected={isConnected} />
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {conductoresFiltrados.map((conductor) => (
                <ConductorCard 
                  key={conductor.id} 
                  conductor={conductor}
                  onOpenModal={() => handleOpenModal(conductor.id)}
                />
              ))}
            </div>
            <InfiniteScrollObserver
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              observerRef={observerTarget}
            />
          </>
        )}
      </div>

      {/* Modal con Timeline */}
      {selectedDriverForModal && (() => {
        const { driverId, conductor } = selectedDriverForModal
        const viajes = viajesPorConductorModal.get(driverId) || []
        const { hourActivity, hourOrders } = processTimelineData(viajes)
        const currentHour = new Date().getHours()
        const currentHourIndex = HOURS_PER_DAY + currentHour

        return (
          <Dialog open={!!selectedDriverForModal} onOpenChange={(open) => {
            if (!open) {
              setSelectedDriverForModal(null)
              setHoveredHourIndex(null) // Limpiar hover al cerrar el modal
            }
          }}>
            <DialogContent className="max-w-5xl max-h-[90vh] bg-[#1A1A1A] border-gray-700" style={{ overflow: 'visible' }}>
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-3">
                  {conductor.avatar_url ? (
                    <img
                      src={conductor.avatar_url}
                      alt={`${conductor.first_name} ${conductor.last_name}`}
                      className="w-10 h-10 rounded-lg object-cover border-2 border-orange-500"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-600 flex items-center justify-center border-2 border-orange-500">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <div className="text-lg font-bold">{conductor.first_name} {conductor.last_name}</div>
                    <div className="text-sm text-gray-400">{conductor.vehicle_number || 'Sin vehículo'}</div>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="mt-4">
                <div className="relative overflow-visible bg-gradient-to-br from-[#2A2A2A] to-[#1F1F1F] rounded-lg p-4 border border-gray-800/50">
                  {/* Loading overlay solo para la parte de AYER (lado izquierdo) */}
                  {isLoadingViajesAyer && (
                    <div className="absolute left-0 top-0 bottom-0 w-1/2 z-30 bg-black/60 rounded-l-lg flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-orange-400 text-xs font-medium">
                          Cargando viajes del día anterior...
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Mensaje cuando no hay viajes de ayer */}
                  {!isLoadingViajesAyer && hasNoViajesAyer && (
                    <div className="absolute left-0 top-0 bottom-0 w-1/2 z-30 bg-black/40 rounded-l-lg flex items-center justify-center">
                      <p className="text-gray-400 text-sm font-medium">
                        No hay viajes
                      </p>
                    </div>
                  )}
                  
                  <div className="absolute left-1/2 top-0 bottom-0 w-px z-10 bg-blue-500/30" />
                  
                  <div className="flex justify-between mb-2 px-1">
                    {Array.from({ length: TIMELINE_HOURS }, (_, hourIndex) => {
                      const hour = hourIndex < HOURS_PER_DAY ? hourIndex : hourIndex - HOURS_PER_DAY
                      const isDay1 = hourIndex < HOURS_PER_DAY
                      const isCurrentHour = hourIndex === currentHourIndex
                      
                      return (
                        <span
                          key={hourIndex}
                          className={cn(
                            'text-xs w-[calc(100%/48)] text-center transition-all',
                            isCurrentHour
                              ? 'text-blue-400 font-bold text-sm'
                              : hour % 6 === 0
                                ? 'text-gray-400 font-medium'
                                : 'text-transparent'
                          )}
                        >
                          {hour % 6 === 0 || isCurrentHour ? (
                            <div className="flex flex-col items-center">
                              {(isDay1 && hourIndex === 0) || (!isDay1 && hourIndex === HOURS_PER_DAY) ? (
                                <span className={cn(
                                  "text-[10px] font-semibold mb-0.5",
                                  isDay1 ? "text-gray-500" : "text-blue-400"
                                )}>
                                  {isDay1 ? day1Label : day2Label}
                                </span>
                              ) : null}
                              <span>{hour.toString().padStart(2, '0')}</span>
                            </div>
                          ) : ''}
                        </span>
                      )
                    })}
                  </div>
                  
                  <div className="flex gap-0.5 relative mb-2">
                    {Array.from({ length: TIMELINE_HOURS }, (_, hourIndex) => {
                      const hour = hourIndex < HOURS_PER_DAY ? hourIndex : hourIndex - HOURS_PER_DAY
                      const isDay2 = hourIndex >= HOURS_PER_DAY
                      const hourIsActive = hourActivity[hourIndex]
                      const isCurrentHour = hourIndex === currentHourIndex
                      const isPastHour = hourIndex < currentHourIndex
                      const isFutureHour = hourIndex > currentHourIndex
                      const ordersInHour = hourOrders.get(hourIndex) || []
                      
                      return (
                        <div
                          key={hourIndex}
                          className={cn(
                            'flex-1 rounded-sm transition-all relative cursor-pointer group',
                            hourIsActive
                              ? 'bg-gradient-to-b from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 shadow-md'
                              : isPastHour
                                ? 'bg-gray-700/60'
                                : isFutureHour
                                  ? 'bg-gray-800/40'
                                  : 'bg-gray-600/60',
                            isCurrentHour && 'ring-2 ring-blue-400 ring-offset-1 ring-offset-[#2A2A2A]',
                            isDay2 && 'opacity-90',
                            hourIndex === HOURS_PER_DAY && 'border-l-2 border-blue-500/50'
                          )}
                          style={{ height: '40px' }}
                          onMouseEnter={() => hourIsActive && ordersInHour.length > 0 && setHoveredHourIndex(hourIndex)}
                          onMouseLeave={() => setHoveredHourIndex(null)}
                        >
                          {hourIsActive && ordersInHour.length > 0 && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-all bg-black/60 px-2 py-1 rounded-md">
                                {ordersInHour.length}
                              </span>
                            </div>
                          )}
                          {hourIndex === HOURS_PER_DAY && (
                            <div className="absolute -left-0.5 top-0 bottom-0 w-0.5 bg-purple-500/50 z-20" />
                          )}
                          
                          {/* Tooltip con información de viajes */}
                          {hoveredHourIndex === hourIndex && ordersInHour.length > 0 && (
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-[100] w-64 pointer-events-auto">
                              <div className="bg-[#1A1A1A] border border-gray-600 rounded-lg shadow-xl p-3">
                                <div className="text-xs text-gray-400 mb-2 font-semibold">
                                  {isDay2 ? day2Label : day1Label} - {hour.toString().padStart(2, '0')}:00
                                </div>
                                <div className="space-y-2 max-h-64 overflow-y-auto pr-1 tooltip-scroll">
                                  {ordersInHour.map((order, idx) => (
                                    <div key={idx} className="bg-[#2A2A2A] rounded-md p-2 border border-gray-700">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-semibold text-white">
                                          Viaje #{idx + 1}
                                        </span>
                                        {(() => {
                                          const statusInfo = getStatusInfo(order.status)
                                          return (
                                            <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", statusInfo.className)}>
                                              {statusInfo.label}
                                            </span>
                                          )
                                        })()}
                                      </div>
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-xs">
                                          <span className="text-gray-400">Inicio:</span>
                                          <span className="text-white font-medium">{order.bookedAt}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                          <span className="text-gray-400">Fin:</span>
                                          <span className="text-white font-medium">{order.endedAt}</span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {ordersInHour.length > 1 && (
                                  <div className="text-xs text-gray-500 mt-2 text-center">
                                    {ordersInHour.length} viaje{ordersInHour.length > 1 ? 's' : ''} en esta hora
                                  </div>
                                )}
                              </div>
                              {/* Flecha del tooltip */}
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 -mb-1">
                                <div className="w-3 h-3 bg-[#1A1A1A] border-l border-t border-gray-600 transform rotate-45"></div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex justify-between text-xs text-gray-400 px-1">
                    <span>{day1Label} 00:00</span>
                    <span>{day2Label} 23:59</span>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )
      })()}
    </div>
  )
}
