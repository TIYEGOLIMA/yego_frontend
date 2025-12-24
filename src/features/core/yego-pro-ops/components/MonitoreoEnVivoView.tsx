import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useToastNotifications } from '../../../../hooks/useToastNotifications'
import { NotificationContainer } from '../../../../components/NotificationToast'
import { Card, CardContent } from '../../../../components/ui/card'
import { Badge } from '../../../../components/ui/badge'
import { Input } from '../../../../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select'
import { Activity, Search, User, MapPin, Car, DollarSign, Radio, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Navigation } from 'lucide-react'
import { Button } from '../../../../components/ui/button'
import { cn } from '../../../../utils/cn'
import SocketService from '../../../../services/socket-service'
import { useConnectionStatus } from '../../../../shared/hooks/useConnectionStatus'
import { yegoProOpsService, type ConductoresEnOrdenResponse } from '../../../../services/yego-pro-ops-service'

interface MonitoreoEnVivoViewProps {}

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
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

export function MonitoreoEnVivoView({}: MonitoreoEnVivoViewProps) {
  const { notifications, removeNotification } = useToastNotifications()
  const { isConnected } = useConnectionStatus()
  const [searchQuery, setSearchQuery] = useState('')
  const [conductoresEnOrden, setConductoresEnOrden] = useState<ConductoresEnOrdenResponse | null>(null)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  // Query para inicializar datos desde la API solo una vez
  const { data: initialData, isLoading } = useQuery({
    queryKey: ['pro-ops-conductores-en-orden'],
    queryFn: () => yegoProOpsService.obtenerConductoresEnOrden(),
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  // Sincronizar datos iniciales con el estado solo una vez
  useEffect(() => {
    if (initialData && !conductoresEnOrden) {
      console.log('📊 [MonitoreoEnVivo] Datos iniciales recibidos:', initialData)
      console.log('📊 [MonitoreoEnVivo] summary_distance:', initialData.summary_distance)
      setConductoresEnOrden(initialData)
    }
  }, [initialData, conductoresEnOrden])

  // WebSocket para actualizaciones en tiempo real
  useEffect(() => {
    const handleConductoresEnOrdenUpdate = (data: ConductoresEnOrdenResponse) => {
      try {
        console.log('🚗 [MonitoreoEnVivo] Conductores en orden actualizados por WebSocket:', data)
        console.log('🚗 [MonitoreoEnVivo] summary_distance en WebSocket:', data.summary_distance)
        if (data && data.type === 'DRIVERS_IN_ORDER_UPDATE') {
          setConductoresEnOrden(data)
        }
      } catch (error) {
        console.error('❌ [MonitoreoEnVivo] Error actualizando conductores en orden:', error)
      }
    }

    SocketService.on('pro-ops-conductores-en-orden', handleConductoresEnOrdenUpdate)

    return () => {
      SocketService.off('pro-ops-conductores-en-orden', handleConductoresEnOrdenUpdate)
    }
  }, [])

  const conductoresFiltrados = conductoresEnOrden?.conductores?.filter(c => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      c.first_name?.toLowerCase().includes(query) ||
      c.last_name?.toLowerCase().includes(query) ||
      (c.vehicle_number?.toLowerCase() || '').includes(query) ||
      c.id.toLowerCase().includes(query)
    )
  }) || []

  // Resetear página cuando cambia el filtro
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  // Calcular paginación
  const totalPages = Math.ceil(conductoresFiltrados.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const conductoresPaginados = conductoresFiltrados.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value))
    setCurrentPage(1)
  }

  return (
    <div className="relative">
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />
      <div className="space-y-6">
        {/* Header con indicador de conexión */}
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
              )}></div>
              {isConnected ? "En Vivo" : "Desconectado"}
            </Badge>
          </div>
          {conductoresEnOrden?.timestamp && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Radio className="w-4 h-4" />
              <span>Última actualización: {formatTimestamp(conductoresEnOrden.timestamp)}</span>
            </div>
          )}
        </div>

        {/* Estadísticas generales */}
        {conductoresEnOrden && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-[#2A2A2A] border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center">
                      <Activity className="w-6 h-6 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Conductores en Orden</p>
                      <p className="text-2xl font-bold text-white">{conductoresEnOrden.total}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#2A2A2A] border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Balance Total</p>
                      <p className="text-2xl font-bold text-white">
                        {formatBalance(
                          conductoresEnOrden.conductores.reduce((sum, c) => sum + parseFloat(c.balance || '0'), 0)
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Búsqueda y selector de paginación */}
        <div className="flex items-center gap-4 flex-wrap justify-between">
          <Input
            placeholder="Buscar por nombre, vehículo o ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            className="w-full max-w-md"
          />
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Por página:</span>
            <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Lista de conductores */}
        {isLoading ? (
          <Card className="h-full bg-[#1A1A1A] dark:bg-[#1A1A1A]">
            <CardContent className="p-6">
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-400 text-lg">Cargando conductores en orden...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : !conductoresEnOrden ? (
          <Card className="h-full bg-[#1A1A1A] dark:bg-[#1A1A1A]">
            <CardContent className="p-6">
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-700 flex items-center justify-center">
                    <Activity className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-400 text-lg">Monitoreo en Vivo</p>
                  <p className="text-gray-500 text-sm mt-2">
                    Esperando datos de conductores en orden...
                  </p>
                  {!isConnected && (
                    <p className="text-red-400 text-xs mt-4">
                      ⚠️ Sin conexión WebSocket. Los datos se actualizarán cada 30 segundos.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : conductoresFiltrados.length === 0 ? (
          <Card className="h-full bg-[#1A1A1A] dark:bg-[#1A1A1A]">
            <CardContent className="p-6">
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="text-center">
                  <p className="text-gray-400 text-lg">
                    {searchQuery ? 'No se encontraron conductores' : 'No hay conductores en orden'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {conductoresPaginados.map((conductor) => (
              <Card 
                key={conductor.id}
                className="bg-[#2A2A2A] border-gray-700 hover:border-orange-500 transition-colors"
              >
                <CardContent className="p-3">
                  {/* Header del conductor */}
                  <div className="flex items-start gap-2 mb-3">
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
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-white font-bold text-sm line-clamp-1 flex-1">
                          {conductor.first_name} {conductor.last_name}
                        </h3>
                        {/* Balance compacto en el costado */}
                        {(() => {
                          const balance = parseFloat(conductor.balance || '0')
                          const isNegative = balance < 0
                          return (
                            <div className={cn(
                              "flex items-center gap-1 px-2 py-0.5 rounded-md border",
                              isNegative 
                                ? "bg-red-500/10 border-red-500/30" 
                                : "bg-green-500/10 border-green-500/30"
                            )}>
                              <span className={cn(
                                "text-xs font-semibold",
                                isNegative ? "text-red-400" : "text-green-400"
                              )}>
                                S/ {balance.toFixed(2)}
                              </span>
                            </div>
                          )
                        })()}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="secondary" className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5">
                          En Orden
                        </Badge>
                        {conductor.vehicle_number && (
                          <Badge variant="outline" className="text-[10px] border-gray-600 text-gray-300 px-1.5 py-0.5">
                            <Car className="w-2.5 h-2.5 mr-1" />
                            {conductor.vehicle_number}
                          </Badge>
                        )}
                        {conductor.summary_distance && (
                          <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-400 px-1.5 py-0.5 bg-blue-500/10">
                            <Navigation className="w-2.5 h-2.5 mr-1" />
                            {formatDistance(conductor.summary_distance.common)} km
                          </Badge>
                        )}
                        {conductor.total_activity_time !== undefined && conductor.total_activity_time !== null && (
                          <Badge variant="outline" className="text-[10px] border-purple-500/30 text-purple-400 px-1.5 py-0.5 bg-purple-500/10">
                            <Activity className="w-2.5 h-2.5 mr-1" />
                            {formatActivityTime(conductor.total_activity_time)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ruta */}
                  {conductor.route && conductor.route.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <MapPin className="w-3 h-3 text-orange-400" />
                        <span className="text-xs font-semibold text-gray-300">Ruta</span>
                      </div>
                      <div className="space-y-1.5">
                        {conductor.route.map((punto, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <div className="flex flex-col items-center mt-0.5">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                index === 0 ? "bg-green-500" : "bg-blue-500"
                              )}></div>
                              {index < conductor.route.length - 1 && (
                                <div className="w-0.5 h-6 bg-gray-600 my-0.5"></div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-gray-400 mb-0.5">
                                {index === 0 ? 'Origen' : index === conductor.route.length - 1 ? 'Destino' : `Parada ${index + 1}`}
                              </p>
                              <p className="text-xs text-white break-words line-clamp-2">
                                {punto.address}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sin ruta */}
                  {(!conductor.route || conductor.route.length === 0) && (
                    <div className="p-2 bg-[#1A1A1A] rounded-lg border border-gray-700">
                      <p className="text-xs text-gray-400 text-center">
                        Sin ruta asignada
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Controles de navegación de páginas */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    className="h-8 w-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
