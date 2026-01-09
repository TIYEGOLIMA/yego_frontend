import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useToastNotifications } from '../../../../hooks/useToastNotifications'
import { NotificationContainer } from '../../../../components/NotificationToast'
import { Card, CardContent } from '../../../../components/ui/card'
import { Badge } from '../../../../components/ui/badge'
import { Input } from '../../../../components/ui/input'
import { Activity, Search, User, MapPin, Car, DollarSign, Navigation } from 'lucide-react'
import { cn } from '../../../../utils/cn'
import SocketService from '../../../../services/socket-service'
import { useConnectionStatus } from '../../../../shared/hooks/useConnectionStatus'
import { yegoProOpsService, type ConductoresEnOrdenResponse, type ConductorEnOrden } from '../../../../services/yego-pro-ops-service'

// Constantes
const ITEMS_PER_PAGE = 4
const OBSERVER_THRESHOLD = 0.1

// Utilidades de formato
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

// Componentes
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

const ConductorCard = ({ conductor }: { conductor: ConductorEnOrden }) => {
  const hasRoute = conductor.route && conductor.route.length > 0

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

        {/* Ruta */}
        {hasRoute ? (
          <div className="space-y-1 mt-2">
            <div className="flex items-center gap-1.5 mb-1">
              <MapPin className="w-3 h-3 text-orange-400" />
              <span className="text-xs font-semibold text-gray-300">Ruta</span>
            </div>
            <div className="space-y-1">
              {conductor.route!.map((punto, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="flex flex-col items-center mt-0.5">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      index === 0 ? "bg-green-500" : "bg-blue-500"
                    )} />
                    {index < conductor.route!.length - 1 && (
                      <div className="w-0.5 h-6 bg-gray-600 my-0.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-400 mb-0.5">
                      {index === 0 ? 'Origen' : index === conductor.route!.length - 1 ? 'Destino' : `Parada ${index + 1}`}
                    </p>
                    <p className="text-xs text-white break-words line-clamp-2">
                      {punto.address}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-2 bg-[#1A1A1A] rounded-lg border border-gray-700 mt-2">
            <p className="text-xs text-gray-400 text-center">Sin ruta asignada</p>
          </div>
        )}
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

// Hook personalizado para filtrado
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

// Hook personalizado para datos combinados
const useConductoresData = (data: any) => {
  return useMemo(() => {
    if (!data) return null

    // Combinar todos los conductores de todas las páginas y eliminar duplicados por ID
    const conductoresMap = new Map<string, ConductorEnOrden>()
    
    data.pages.forEach((page: ConductoresEnOrdenResponse) => {
      if (page.conductores && Array.isArray(page.conductores)) {
        page.conductores.forEach((conductor: ConductorEnOrden) => {
          // Si ya existe, mantener el más reciente (último en aparecer)
          conductoresMap.set(conductor.id, conductor)
        })
      }
    })

    // Convertir el Map a Array
    const conductoresUnicos = Array.from(conductoresMap.values())

    return {
      type: 'DRIVERS_IN_ORDER_UPDATE',
      total: data.pages[0]?.total || 0,
      timestamp: data.pages[0]?.timestamp || new Date().toISOString(),
      conductores: conductoresUnicos,
      summary_distance: data.pages[0]?.summary_distance,
      completed_trips_count: data.pages[0]?.completed_trips_count,
      completed_trips_total_price: data.pages[0]?.completed_trips_total_price
    }
  }, [data])
}

// Componente principal
export function MonitoreoEnVivoView() {
  const { notifications, removeNotification } = useToastNotifications()
  const { isConnected } = useConnectionStatus()
  const [searchQuery, setSearchQuery] = useState('')
  const observerTarget = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  // Infinite Query - Con cache persistente, no refetch automático
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
    refetchOnMount: false, // No refetch al montar si ya hay datos en cache
    staleTime: Infinity, // Los datos nunca se consideran "stale", solo se actualizan por WebSocket
    gcTime: 24 * 60 * 60 * 1000, // Mantener en cache por 24 horas
    initialPageParam: 0,
  })

  const conductoresEnOrden = useConductoresData(data)
  const conductoresFiltrados = useFilteredConductores(conductoresEnOrden?.conductores, searchQuery)

  // Intersection Observer para scroll infinito
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

  // WebSocket - Actualiza el cache directamente, NO vuelve a llamar al endpoint
  useEffect(() => {
    if (!isSuccess || !data) return

    const handleConductoresEnOrdenUpdate = (wsData: ConductoresEnOrdenResponse) => {
      if (wsData?.type === 'DRIVERS_IN_ORDER_UPDATE' && wsData.conductores) {
        // Actualizar el cache directamente con los datos del WebSocket
        queryClient.setQueryData(['pro-ops-conductores-en-orden'], (oldData: any) => {
          if (!oldData) return oldData

          // Crear un Map para eliminar duplicados: IDs del WebSocket tienen prioridad
          const conductoresMap = new Map<string, ConductorEnOrden>()
          
          // Primero agregar todos los conductores de las páginas existentes (excepto la primera)
          for (let i = 1; i < oldData.pages.length; i++) {
            const page = oldData.pages[i]
            if (page?.conductores && Array.isArray(page.conductores)) {
              page.conductores.forEach((conductor: ConductorEnOrden) => {
                conductoresMap.set(conductor.id, conductor)
              })
            }
          }
          
          // Luego agregar los conductores del WebSocket (tienen prioridad, sobrescriben duplicados)
          wsData.conductores.forEach((conductor: ConductorEnOrden) => {
            conductoresMap.set(conductor.id, conductor)
          })

          // Timestamp actualizado con la hora actual cuando llega el WebSocket
          const updatedTimestamp = new Date().toISOString()

          // Actualizar la primera página con los datos del WebSocket
          const updatedPages = [
            {
              ...wsData,
              type: 'DRIVERS_IN_ORDER_UPDATE',
              total: wsData.total,
              timestamp: updatedTimestamp, // Siempre actualizar con timestamp actual
              conductores: wsData.conductores,
              summary_distance: wsData.summary_distance,
              completed_trips_count: wsData.completed_trips_count,
              completed_trips_total_price: wsData.completed_trips_total_price
            },
            // Mantener las demás páginas pero sin duplicados que ya están en la primera
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

  // Estadísticas calculadas
  const stats = useMemo(() => {
    if (!conductoresEnOrden) return null

    return {
      total: conductoresEnOrden.total,
      totalViajes: conductoresEnOrden.conductores.reduce((sum: number, c: ConductorEnOrden) => sum + (c.completed_trips_count || 0), 0),
      totalPlata: conductoresEnOrden.conductores.reduce((sum: number, c: ConductorEnOrden) => sum + (c.completed_trips_total_price || 0), 0)
    }
  }, [conductoresEnOrden])

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
                <ConductorCard key={conductor.id} conductor={conductor} />
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
    </div>
  )
}
