import { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { yegoProOpsService, type DriverKpiResponse, type DriverItem, type DriverTimelineResponse } from '../../../../services/yego-pro-ops-service'
import { useToastNotifications } from '../../../../hooks/useToastNotifications'
import { NotificationContainer } from '../../../../components/NotificationToast'
import { Card, CardContent } from '../../../../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/ui/dialog'
import { Input } from '../../../../components/ui/input'
import { Badge } from '../../../../components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'
import { User, ChevronRight, MapPin, Search, Activity, XCircle, CheckCircle, X, Calendar } from 'lucide-react'
import { cn } from '../../../../utils/cn'
import SocketService from '../../../../services/socket-service'

// Constantes
const TRES_HORAS_EN_MS = 3 * 60 * 60 * 1000
const HORA_DIURNO_INICIO = 6
const HORA_DIURNO_FIN = 18

// Helper functions
const formatBalance = (balance: number): string => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(balance)
}

const getDriverCode = (item: DriverItem): string => {
  if (item.car_number) return item.car_number
  if (item.code) return item.code
  return item.driver_id.substring(0, 3).toUpperCase() + item.driver_id.substring(item.driver_id.length - 3)
}

const getStatusText = (status: string): string => {
  switch (status) {
    case 'busy':
      return 'Ocupado'
    case 'in_order':
      return 'En orden'
    case 'free':
    default:
      return 'Disponible'
  }
}

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  const parts: string[] = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`)
  
  return parts.join(' ')
}

const formatTime = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString + 'T00:00:00')
  return date.toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const getTurnoType = (bookedAt: string | Date): 'diurno' | 'nocturno' => {
  const bookedDate = bookedAt instanceof Date ? bookedAt : new Date(bookedAt)
  const hour = bookedDate.getHours()
  return hour >= HORA_DIURNO_INICIO && hour < HORA_DIURNO_FIN ? 'diurno' : 'nocturno'
}

const matchesFilter = (item: DriverItem, filter: 'free' | 'busy' | 'in_order' | 'no-gps'): boolean => {
  if (filter === 'free') return item.status === 'free'
  if (filter === 'busy') return item.status === 'busy'
  if (filter === 'in_order') return item.status === 'in_order'
  if (filter === 'no-gps') {
    const coordinates = item.coordinates || { lat: 0, lon: 0 }
    const hasValidCoordinates = coordinates && 
                                 typeof coordinates.lat === 'number' && 
                                 typeof coordinates.lon === 'number' &&
                                 coordinates.lat !== 0 &&
                                 coordinates.lon !== 0
    return !hasValidCoordinates
  }
  return false
}

const sortItems = (items: DriverItem[], statusFilter: 'free' | 'busy' | 'in_order' | 'no-gps' | null = null): DriverItem[] => {
  return [...items].sort((a, b) => {
    if (statusFilter) {
      const aMatches = matchesFilter(a, statusFilter)
      const bMatches = matchesFilter(b, statusFilter)
      
      if (aMatches && !bMatches) return -1
      if (!aMatches && bMatches) return 1
    } else {
      if (a.status === 'free' && b.status !== 'free') return -1
      if (a.status !== 'free' && b.status === 'free') return 1
    }
    
    const durationA = typeof a.status_duration === 'number' ? a.status_duration : 0
    const durationB = typeof b.status_duration === 'number' ? b.status_duration : 0
    return durationB - durationA
  })
}

const hasValidCoordinates = (coordinates: DriverItem['coordinates']): boolean => {
  if (!coordinates) return false
  return typeof coordinates.lat === 'number' && 
         typeof coordinates.lon === 'number' &&
         coordinates.lat !== 0 &&
         coordinates.lon !== 0
}

interface EnCursoViewProps {
  statusFilter?: 'free' | 'busy' | 'in_order' | 'no-gps' | null
  onFilterChange?: (filter: 'free' | 'busy' | 'in_order' | 'no-gps' | null) => void
}

// Hook para procesar timeline
const useTimelineData = (timeline: DriverTimelineResponse | null | undefined) => {
  return useMemo(() => {
    if (!timeline?.orders || timeline.orders.length === 0) {
      return { hourActivity: Array(24).fill(false), hourOrders: new Map() }
    }

    const hourActivity: boolean[] = Array(24).fill(false)
    type OrderInfo = { bookedAt: string, endedAt: string, status: string, turnoType: 'diurno' | 'nocturno' }
    const hourOrders: Map<number, Array<OrderInfo>> = new Map()

    timeline.orders.forEach((order) => {
      const isComplete = order.status === 'complete'
      const isCancelled = order.status === 'cancelled' || order.status === 'canceled'
      
      if ((isComplete || isCancelled) && order.booked_at) {
        const bookedDate = new Date(order.booked_at)
        const endedDate = order.ended_at ? new Date(order.ended_at) : bookedDate
        const startHour = bookedDate.getHours()
        const endHour = endedDate.getHours()
        const turnoType = getTurnoType(bookedDate)
        
        // Marcar todas las horas que cruza como activas
        for (let h = startHour; h <= endHour; h++) {
          if (h >= 0 && h < 24) {
            hourActivity[h] = true
          }
        }
        
        // Solo agregar el viaje a la hora donde comienza
        if (!hourOrders.has(startHour)) {
          hourOrders.set(startHour, [])
        }
        hourOrders.get(startHour)!.push({
          bookedAt: formatTime(bookedDate),
          endedAt: order.ended_at ? formatTime(endedDate) : formatTime(bookedDate),
          status: order.status,
          turnoType
        })
      }
    })

    return { hourActivity, hourOrders }
  }, [timeline])
}

// Función para generar UUID
const generateUUID = (): string => {
  return crypto.randomUUID()
}

// Función para calcular duración en minutos
const calcularDuracionMinutos = (inicio: Date, fin: Date | null): number | null => {
  if (!fin) return null
  return Math.floor((fin.getTime() - inicio.getTime()) / (1000 * 60))
}

// Hook para calcular turnos
const useCalculateTurnos = (timeline: DriverTimelineResponse | null | undefined) => {
  return useMemo(() => {
    if (!timeline?.orders || timeline.orders.length === 0) {
      return []
    }
    
    const sortedOrders = [...timeline.orders].sort((a, b) => {
      return new Date(a.booked_at).getTime() - new Date(b.booked_at).getTime()
    })
    
    type TurnoCalculado = {
      id: string
      inicio: Date
      fin: Date | null
      activo: boolean
      tipoTurno: 'diurno' | 'nocturno'
      duracionMinutos: number | null
    }
    
    const turnos: TurnoCalculado[] = []
    
    if (sortedOrders.length === 0) return turnos
    
    let turnoInicio = new Date(sortedOrders[0].booked_at)
    let ultimoViaje = new Date(sortedOrders[0].booked_at)
    
    for (let i = 1; i < sortedOrders.length; i++) {
      const currentViaje = new Date(sortedOrders[i].booked_at)
      const tiempoDesdeUltimoViaje = currentViaje.getTime() - ultimoViaje.getTime()
      
      if (tiempoDesdeUltimoViaje > TRES_HORAS_EN_MS) {
        const turnoFin = new Date(ultimoViaje.getTime() + TRES_HORAS_EN_MS)
        const tipoTurno = getTurnoType(turnoInicio)
        turnos.push({
          id: generateUUID(),
          inicio: turnoInicio,
          fin: turnoFin,
          activo: false,
          tipoTurno,
          duracionMinutos: calcularDuracionMinutos(turnoInicio, turnoFin)
        })
        turnoInicio = currentViaje
      }
      
      ultimoViaje = currentViaje
    }
    
    const ahora = new Date()
    const tiempoDesdeUltimoViaje = ahora.getTime() - ultimoViaje.getTime()
    const tipoTurno = getTurnoType(turnoInicio)
    
    if (tiempoDesdeUltimoViaje > TRES_HORAS_EN_MS) {
      const turnoFin = new Date(ultimoViaje.getTime() + TRES_HORAS_EN_MS)
      turnos.push({
        id: generateUUID(),
        inicio: turnoInicio,
        fin: turnoFin,
        activo: false,
        tipoTurno,
        duracionMinutos: calcularDuracionMinutos(turnoInicio, turnoFin)
      })
    } else {
      turnos.push({
        id: generateUUID(),
        inicio: turnoInicio,
        fin: null,
        activo: true,
        tipoTurno,
        duracionMinutos: null
      })
    }
    
    return turnos
  }, [timeline])
}

export function EnCursoView({ statusFilter = null, onFilterChange }: EnCursoViewProps) {
  const queryClient = useQueryClient()
  const { showSuccess, showError, showWarning, notifications, removeNotification } = useToastNotifications()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null)
  const [hoveredHour, setHoveredHour] = useState<number | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  const [pinnedHour, setPinnedHour] = useState<number | null>(null)
  const [fechaTurnos, setFechaTurnos] = useState<string>(new Date().toISOString().split('T')[0])
  const [showFechaModal, setShowFechaModal] = useState(false)
  const [fechaTemporal, setFechaTemporal] = useState<string>(new Date().toISOString().split('T')[0])
  const [showRegistrarModal, setShowRegistrarModal] = useState(false)
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [tipoTurnoManual, setTipoTurnoManual] = useState<'diurno' | 'nocturno' | null>(null)
  
  // Calcular tipo de turno automáticamente basado en las fechas/horas
  const calcularTipoTurno = (fechaInicioStr: string, fechaFinStr: string): 'diurno' | 'nocturno' | null => {
    if (!fechaInicioStr || !fechaFinStr) return null
    
    try {
      const fechaInicio = new Date(fechaInicioStr.replace(' ', 'T'))
      const fechaFin = new Date(fechaFinStr.replace(' ', 'T'))
      
      const horaInicioNum = fechaInicio.getHours()
      const minutoInicioNum = fechaInicio.getMinutes()
      const horaFinNum = fechaFin.getHours()
      const minutoFinNum = fechaFin.getMinutes()
      
      const horaInicioTotal = horaInicioNum * 60 + minutoInicioNum
      const horaFinTotal = horaFinNum * 60 + minutoFinNum
      
      // Diurno: si ambas horas están entre 6:00 AM (360 min) y 6:00 PM (1080 min)
      if (horaInicioTotal >= 360 && horaInicioTotal <= 1080 && horaFinTotal >= 360 && horaFinTotal <= 1080) {
        return 'diurno'
      }
      
      // Nocturno: si la hora inicio es desde las 18:00 (1080 min) o la hora fin es antes de las 6:00 AM
      if (horaInicioTotal >= 1080 || horaFinTotal <= 360) {
        return 'nocturno'
      }
      
      return null
    } catch (error) {
      return null
    }
  }
  
  const tipoTurnoCalculado = calcularTipoTurno(fechaInicio, fechaFin)
  const tipoTurno = tipoTurnoManual || tipoTurnoCalculado || 'diurno'
  
  const { data: kpis, isLoading, error } = useQuery({
    queryKey: ['yego-pro-ops-kpis'],
    queryFn: () => yegoProOpsService.obtenerKpis(),
    retry: 2,
  })

  const { data: timeline, isLoading: isLoadingTimeline } = useQuery({
    queryKey: ['yego-pro-ops-timeline', selectedDriverId],
    queryFn: () => selectedDriverId ? yegoProOpsService.obtenerTimelineConductor(selectedDriverId) : null,
    enabled: !!selectedDriverId,
    retry: 2,
  })

  // Obtener turnos calculados guardados del backend
  const { data: turnosGuardados, isLoading: isLoadingTurnosGuardados, refetch: refetchTurnos } = useQuery({
    queryKey: ['yego-pro-ops-turnos-calculados', selectedDriverId, fechaTurnos],
    queryFn: () => selectedDriverId ? yegoProOpsService.obtenerTurnosCalculados(selectedDriverId, fechaTurnos) : null,
    enabled: !!selectedDriverId,
    retry: 2,
  })

  // Mutation para crear turno
  const crearTurnoMutation = useMutation({
    mutationFn: (data: { driverId: string; fecha: string; horaInicio: string; horaFin: string; tipoTurno: 'diurno' | 'nocturno' }) => {
      return yegoProOpsService.crearTurno({
        driverId: data.driverId,
        fecha: data.fecha,
        horaInicio: data.horaInicio,
        horaFin: data.horaFin,
        tipoTurno: data.tipoTurno,
      })
    },
    onSuccess: () => {
      // Invalidar la query para forzar la actualización automática de la lista
      queryClient.invalidateQueries({ queryKey: ['yego-pro-ops-turnos-calculados', selectedDriverId, fechaTurnos] })
      refetchTurnos()
      setShowRegistrarModal(false)
      setFechaInicio('')
      setFechaFin('')
      setTipoTurnoManual(null)
      showSuccess('Turno registrado exitosamente')
    },
    onError: (error: any) => {
      console.error('Error al registrar turno:', error)
      showError(error.response?.data?.message || 'Error al registrar el turno')
    },
  })

  const handleRegistrarTurno = () => {
    if (!selectedDriverId) {
      showWarning('Debe seleccionar un conductor')
      return
    }
    if (!fechaInicio || !fechaFin) {
      showWarning('Debe ingresar fecha de inicio y fecha de fin')
      return
    }
    
    // Validar que fecha inicio no sea mayor a fecha fin
    const fechaInicioObj = new Date(fechaInicio.replace(' ', 'T'))
    const fechaFinObj = new Date(fechaFin.replace(' ', 'T'))
    
    if (fechaInicioObj >= fechaFinObj) {
      showWarning('La fecha de inicio debe ser menor que la fecha de fin')
      return
    }

    // Validar que el tipo de turno coincida con las horas
    const horaInicioNum = fechaInicioObj.getHours()
    const minutoInicioNum = fechaInicioObj.getMinutes()
    const horaFinNum = fechaFinObj.getHours()
    const minutoFinNum = fechaFinObj.getMinutes()
    
    const horaInicioTotal = horaInicioNum * 60 + minutoInicioNum
    const horaFinTotal = horaFinNum * 60 + minutoFinNum

    // Diurno: desde las 6am (360 min) hasta las 18pm (1080 min)
    if (tipoTurno === 'diurno') {
      // Validar que ambas horas estén entre 6:00 AM y 6:00 PM (18:00)
      if (horaInicioTotal < 360 || horaInicioTotal > 1080) {
        showWarning('Para turno diurno, la hora de inicio debe estar entre las 6:00 AM y las 6:00 PM (18:00)')
        return
      }
      if (horaFinTotal < 360 || horaFinTotal > 1080) {
        showWarning('Para turno diurno, la hora de fin debe estar entre las 6:00 AM y las 6:00 PM (18:00)')
        return
      }
    }

    // Nocturno: más flexible - puede empezar a las 6 AM si no empezó el día anterior
    // o puede terminar a las 11 AM del día siguiente, todo depende de la fecha de inicio
    // No se valida estrictamente porque el turno nocturno puede variar según el día

    // Formatear fecha y hora completa: "YYYY-MM-DD HH:mm:ss"
    const fechaHoraInicio = fechaInicio.replace('T', ' ').substring(0, 19)
    const fechaHoraFin = fechaFin.replace('T', ' ').substring(0, 19)
    // Extraer solo la fecha (YYYY-MM-DD) sin la hora - siempre usar la fecha de inicio
    const fecha = fechaInicio.split('T')[0].split(' ')[0]

    crearTurnoMutation.mutate({
      driverId: selectedDriverId,
      fecha: fecha,
      horaInicio: fechaHoraInicio,
      horaFin: fechaHoraFin,
      tipoTurno,
    })
  }

  const { hourActivity, hourOrders } = useTimelineData(timeline)
  const turnos = useCalculateTurnos(timeline)


  const filteredAndSortedItems: DriverItem[] = useMemo(() => {
    if (!Array.isArray(kpis?.items)) return []
    
    let filtered = kpis.items
    
    if (statusFilter) {
      filtered = filtered.filter(item => matchesFilter(item, statusFilter))
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(item => 
        item.full_name?.toLowerCase().includes(query) ||
        item.car_number?.toLowerCase().includes(query) ||
        item.code?.toLowerCase().includes(query) ||
        item.driver_id.toLowerCase().includes(query)
      )
    }
    
    return sortItems(filtered, statusFilter)
  }, [kpis?.items, searchQuery, statusFilter])

  useEffect(() => {
    const handleKpisUpdate = (updatedKpis: DriverKpiResponse) => {
      try {
        console.log('📊 [EnCursoView] KPIs actualizados por WebSocket:', updatedKpis)
        if (updatedKpis && typeof updatedKpis === 'object') {
          queryClient.setQueriesData(
            { queryKey: ['yego-pro-ops-kpis'] },
            (oldData: DriverKpiResponse | undefined) => {
              if (oldData) {
                return {
                  ...oldData,
                  items: updatedKpis.items || oldData.items
                }
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
    return () => {
      SocketService.off('pro-ops-kpis', handleKpisUpdate)
    }
  }, [queryClient])


  const getBorderColor = (item: DriverItem): string => {
    if (!statusFilter && item.status === 'free') {
      return 'border-2 border-green-500'
    }
    
    if (statusFilter) {
      if (statusFilter === 'free' && item.status === 'free') return 'border-2 border-green-500'
      if (statusFilter === 'busy' && item.status === 'busy') return 'border-2 border-purple-500'
      if (statusFilter === 'in_order' && item.status === 'in_order') return 'border-2 border-orange-500'
      if (statusFilter === 'no-gps' && !hasValidCoordinates(item.coordinates)) return 'border-2 border-red-500'
    }
    
    return ''
  }

  const getStatusCircleColor = (item: DriverItem): string => {
    if (item.status === 'free') return 'bg-green-500'
    if (item.status === 'busy') return 'bg-purple-500'
    if (item.status === 'in_order') return 'bg-orange-500'
    if (!hasValidCoordinates(item.coordinates)) return 'bg-red-500'
    return 'bg-gray-500'
  }

  const renderDriverItem = (item: DriverItem) => {
    if (!item?.driver_id) return null
    
    const balance = typeof item.balance === 'number' ? item.balance : 0
    const statusDuration = typeof item.status_duration === 'number' ? item.status_duration : 0
    const isInOrder = item.status === 'in_order'
    const coordinates = item.coordinates || { lat: 0, lon: 0 }
    const validCoordinates = hasValidCoordinates(item.coordinates)
    const isSelected = selectedDriverId === item.driver_id
    
    return (
      <div
        key={item.driver_id}
        onClick={() => setSelectedDriverId(item.driver_id)}
        className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all duration-200 cursor-pointer',
          isSelected
            ? 'bg-[#2A2A2A] dark:bg-[#2A2A2A] ring-2 ring-blue-500'
            : 'bg-[#1A1A1A] dark:bg-[#1A1A1A] hover:bg-[#2A2A2A] dark:hover:bg-[#2A2A2A]',
          getBorderColor(item)
        )}
      >
        <div className="relative flex-shrink-0">
          {item.photo_url ? (
            <img
              src={item.photo_url}
              alt={item.full_name || 'Conductor'}
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gray-600 dark:bg-gray-700 flex items-center justify-center">
              <User className="w-6 h-6 text-gray-400" />
            </div>
          )}
          {(!statusFilter || (statusFilter && matchesFilter(item, statusFilter))) && (
            <div className={cn(
              'absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full border-2 border-gray-700 dark:border-gray-800',
              getStatusCircleColor(item)
            )}></div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-bold text-white text-sm uppercase truncate">
              {item.full_name || 'Sin nombre'}
            </h3>
            {!validCoordinates && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-gray-600 text-white">
                NO GPS
              </Badge>
            )}
          </div>
          <p className="text-gray-400 text-xs mb-0.5">
            {getStatusText(item.status || 'free')} {formatDuration(statusDuration)}
          </p>
          {isInOrder && validCoordinates && (
            <p className="text-gray-400 text-xs mb-0.5 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>Lat: {coordinates.lat.toFixed(6)}, Lon: {coordinates.lon.toFixed(6)}</span>
            </p>
          )}
          <div className="flex items-center gap-1 text-white text-sm">
            <span className="font-medium">{formatBalance(balance)}</span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-400">{getDriverCode(item)}</span>
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </div>
    )
  }

  const handleHourClick = (hour: number, hourIsActive: boolean, ordersInHour: any[], e: React.MouseEvent<HTMLDivElement>) => {
    if (!hourIsActive || ordersInHour.length === 0) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    if (pinnedHour === hour) {
      setPinnedHour(null)
      setTooltipPosition(null)
    } else {
      setPinnedHour(hour)
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.bottom + 10
      })
    }
  }

  const handleHourMouseEnter = (hour: number, hourIsActive: boolean, ordersInHour: any[], e: React.MouseEvent<HTMLDivElement>) => {
    if (pinnedHour || !hourIsActive || ordersInHour.length === 0) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    setHoveredHour(hour)
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 10
    })
  }

  const handleHourMouseLeave = () => {
    if (!pinnedHour) {
      setHoveredHour(null)
      setTooltipPosition(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
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

  const totalDrivers = kpis?.items?.length || 0
  const selectedDriver = selectedDriverId ? filteredAndSortedItems.find(item => item.driver_id === selectedDriverId) : null
  const currentHour = new Date().getHours()
  const currentMinute = new Date().getMinutes()

  const miniStats = [
    {
      title: 'Viaje activo',
      value: kpis?.viajeActivo || 0,
      icon: Activity,
      gradient: 'from-orange-500 to-orange-600',
      iconBg: 'bg-orange-100 dark:bg-orange-900/30',
      iconColor: 'text-orange-600 dark:text-orange-400',
      filter: 'in_order' as const,
    },
    {
      title: 'No disponible(s)',
      value: kpis?.noDisponibles || 0,
      icon: XCircle,
      gradient: 'from-purple-500 to-purple-600',
      iconBg: 'bg-purple-100 dark:bg-purple-900/30',
      iconColor: 'text-purple-600 dark:text-purple-400',
      filter: 'busy' as const,
    },
    {
      title: 'Disponible(s)',
      value: kpis?.disponibles || 0,
      icon: CheckCircle,
      gradient: 'from-green-500 to-green-600',
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400',
      filter: 'free' as const,
    },
    {
      title: 'Sin GPS',
      value: kpis?.sinGPS || 0,
      icon: MapPin,
      gradient: 'from-red-500 to-red-600',
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400',
      filter: 'no-gps' as const,
    },
  ]

  const getFilterColor = (filter: string) => {
    switch (filter) {
      case 'free': return 'bg-green-500'
      case 'busy': return 'bg-purple-500'
      case 'in_order': return 'bg-orange-500'
      case 'no-gps': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="relative">
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-250px)] max-h-[calc(100vh-250px)] overflow-hidden">
      <div className="flex flex-col h-full overflow-hidden lg:col-span-1">
        <div className="flex-shrink-0 mb-4">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
            {totalDrivers} contratistas
          </h2>
        </div>

        <div className="flex-shrink-0 mb-4">
          <div className="grid grid-cols-2 gap-2">
            {miniStats.map((stat) => {
              const Icon = stat.icon
              const isSelected = statusFilter === stat.filter
              
              return (
                <div
                  key={stat.title}
                  onClick={() => onFilterChange?.(statusFilter === stat.filter ? null : stat.filter)}
                  className={cn(
                    'overflow-hidden rounded-lg transition-all duration-300 p-2',
                    isSelected
                      ? 'bg-white dark:bg-white border border-neutral-200'
                      : 'bg-[#1A1A1A] dark:bg-[#1A1A1A]',
                    onFilterChange && 'cursor-pointer hover:scale-105'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <div className={`${stat.iconBg} p-1 rounded flex-shrink-0`}>
                        <Icon className={`w-3 h-3 ${stat.iconColor}`} />
                      </div>
                      <span className={cn(
                        'text-sm font-medium truncate',
                        isSelected
                          ? 'text-neutral-600 dark:text-neutral-600' 
                          : 'text-gray-300 dark:text-gray-300'
                      )}>
                        {stat.title}
                      </span>
                      {isSelected && (
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 ml-auto bg-white flex items-center justify-center">
                          <div className={cn('w-1.5 h-1.5 rounded-full', getFilterColor(stat.filter))}></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={cn(
                    'text-2xl font-bold',
                    isSelected
                      ? 'text-neutral-900 dark:text-neutral-900' 
                      : 'text-white dark:text-white'
                  )}>
                    {stat.value}
                  </div>
                  <div className={`h-0.5 w-full bg-gradient-to-r ${stat.gradient} rounded-full mt-1`}></div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex-shrink-0 mb-4">
          <Input
            placeholder="Buscar"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            className="w-full"
          />
        </div>

        <Card className="flex-1 min-h-0 bg-[#1A1A1A] dark:bg-[#1A1A1A]">
          <CardContent className="p-1 h-full overflow-y-auto">
            <div className="space-y-1.5">
              {filteredAndSortedItems.length === 0 ? (
                <div className="text-center py-12 text-neutral-700 dark:text-neutral-300 font-medium">
                  {searchQuery ? 'No se encontraron conductores con ese criterio' : 'No hay conductores activos'}
                </div>
              ) : (
                filteredAndSortedItems.map(renderDriverItem)
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card className="h-full bg-[#1A1A1A] dark:bg-[#1A1A1A]">
          <CardContent className="p-4 h-full overflow-visible">
            {!selectedDriverId ? (
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-700 flex items-center justify-center">
                    <User className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-400 text-lg">Selecciona un conductor</p>
                  <p className="text-gray-500 text-sm mt-2">para ver su línea de tiempo</p>
                </div>
              </div>
            ) : !selectedDriver ? (
              <div className="text-center py-12 text-gray-400">
                Conductor no encontrado
              </div>
            ) : (
              <>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Línea de Tiempo - Actividad del Día</h3>
                  <div className="bg-[#2A2A2A] rounded-lg p-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {selectedDriver.photo_url ? (
                          <img
                            src={selectedDriver.photo_url}
                            alt={selectedDriver.full_name || 'Conductor'}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                        <span className="text-white text-sm font-medium truncate">
                          {selectedDriver.full_name || 'Sin nombre'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isLoadingTimeline ? (
                          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <span className="text-xs text-gray-400">
                            {timeline?.orders?.length || 0} viajes
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {isLoadingTimeline ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      <>
                        <div className="relative overflow-visible">
                          <div className="flex justify-between mb-2 px-1">
                            {Array.from({ length: 24 }, (_, hour) => (
                              <span
                                key={hour}
                                className={cn(
                                  'text-xs w-8 text-center',
                                  hour === currentHour
                                    ? 'text-blue-400 font-bold'
                                    : hour % 3 === 0
                                      ? 'text-gray-400'
                                      : 'text-gray-600'
                                )}
                              >
                                {hour % 3 === 0 || hour === currentHour ? hour : ''}
                              </span>
                            ))}
                          </div>
                          
                          <div className="flex gap-0.5 relative">
                            {Array.from({ length: 24 }, (_, hour) => {
                              const hourIsActive = hourActivity[hour]
                              const isCurrentHour = hour === currentHour
                              const isPastHour = hour < currentHour
                              const isFutureHour = hour > currentHour
                              const ordersInHour = hourOrders.get(hour) || []
                              
                              return (
                                <div
                                  key={hour}
                                  className={cn(
                                    'flex-1 rounded-sm transition-all relative cursor-pointer',
                                    hourIsActive
                                      ? 'bg-green-500'
                                      : isPastHour
                                        ? 'bg-gray-700'
                                        : isFutureHour
                                          ? 'bg-gray-800'
                                          : 'bg-gray-600',
                                    isCurrentHour && 'ring-2 ring-blue-400'
                                  )}
                                  style={{ height: '40px' }}
                                  onClick={(e) => handleHourClick(hour, hourIsActive, ordersInHour, e)}
                                  onMouseEnter={(e) => handleHourMouseEnter(hour, hourIsActive, ordersInHour, e)}
                                  onMouseLeave={handleHourMouseLeave}
                                >
                                  {isCurrentHour && (
                                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-400 rounded-full"></div>
                                  )}
                                </div>
                              )
                            })}
                            
                            {((hoveredHour !== null || pinnedHour !== null) && tooltipPosition) && (() => {
                              const activeHour = pinnedHour !== null ? pinnedHour : hoveredHour
                              const orders = hourOrders.get(activeHour!)
                              if (!orders || orders.length === 0) return null
                              
                              return (
                                <div
                                  className="fixed z-[9999] bg-gray-900 text-white rounded-lg shadow-2xl p-4 min-w-[320px] max-w-[400px] border border-gray-700"
                                  style={{
                                    left: `${tooltipPosition.x}px`,
                                    top: `${tooltipPosition.y}px`,
                                    transform: 'translate(-50%, 0)',
                                    pointerEvents: 'auto'
                                  }}
                                >
                                  <div className="flex items-center justify-between mb-3 border-b border-gray-700 pb-2">
                                    <div className="text-sm font-semibold text-gray-200">
                                      Hora {activeHour}:00 - {orders.length} viaje{orders.length > 1 ? 's' : ''}
                                    </div>
                                    {pinnedHour !== null && (
                                      <button
                                        onClick={() => {
                                          setPinnedHour(null)
                                          setTooltipPosition(null)
                                        }}
                                        className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-gray-800"
                                        aria-label="Cerrar"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                                    {orders.map((order: { bookedAt: string, endedAt: string, status: string, turnoType: 'diurno' | 'nocturno' }, index: number) => {
                                      const statusLabel = order.status === 'complete' ? 'Completado' : 
                                                         (order.status === 'cancelled' || order.status === 'canceled') ? 'Cancelado' : 
                                                         order.status
                                      
                                      return (
                                        <div
                                          key={index}
                                          className="border-l-4 border-green-500 pl-3 py-2 bg-gray-800 rounded-r hover:bg-gray-750 transition-colors"
                                        >
                                          <div className="flex items-center justify-between gap-2 mb-1.5">
                                            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                              <span className="text-sm font-semibold text-green-400">
                                                {order.bookedAt} - {order.endedAt}
                                              </span>
                                              <span className="text-xs text-gray-400">
                                                {statusLabel}
                                              </span>
                                            </div>
                                            <Badge
                                              variant="secondary"
                                              className={cn(
                                                'text-xs px-2 py-1 font-medium flex-shrink-0',
                                                order.turnoType === 'diurno'
                                                  ? 'bg-blue-500 text-white'
                                                  : 'bg-purple-500 text-white'
                                              )}
                                            >
                                              {order.turnoType === 'diurno' ? 'Diurno' : 'Nocturno'}
                                            </Badge>
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )
                            })()}
                          </div>
                          
                          <div className="flex justify-between mt-2 px-1">
                            <span className="text-xs text-gray-500">00:00</span>
                            <span className="text-xs text-blue-400 font-medium">
                              Hora actual: {currentHour}:{currentMinute.toString().padStart(2, '0')}
                            </span>
                            <span className="text-xs text-gray-500">23:59</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-700">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-green-500 rounded-sm"></div>
                            <span className="text-xs text-gray-400">Activo (con viajes)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gray-700 rounded-sm"></div>
                            <span className="text-xs text-gray-400">Inactivo</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                {selectedDriverId && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-md font-semibold text-white">Histórico de Gestión de Turnos</h4>
                      <div className="flex items-center gap-2">
                        {fechaTurnos === new Date().toISOString().split('T')[0] && (
                        <button
                          onClick={() => {
                              const ahora = new Date()
                              const fechaHoraInicio = ahora.toISOString().slice(0, 16) // YYYY-MM-DDTHH:mm
                              const fechaHoraFin = new Date(ahora.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16) // +8 horas
                              setFechaInicio(fechaHoraInicio)
                              setFechaFin(fechaHoraFin)
                              setTipoTurnoManual(null) // Resetear selección manual para que calcule automáticamente
                              setShowRegistrarModal(true)
                          }}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                        >
                            <Activity className="w-4 h-4" />
                            <span>Registrar</span>
                        </button>
                        )}
                        <button
                          onClick={() => {
                            setFechaTemporal(fechaTurnos)
                            setShowFechaModal(true)
                          }}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#2A2A2A] text-white hover:bg-[#353432] transition-colors border border-gray-700"
                        >
                          <Calendar className="w-4 h-4" />
                          <span>Consultando: {formatDate(fechaTurnos)}</span>
                        </button>
                      </div>
                    </div>
                    
                    <Dialog open={showFechaModal} onOpenChange={setShowFechaModal}>
                      <DialogContent className="bg-[#1A1A1A] border-gray-700">
                        <DialogHeader>
                          <DialogTitle className="text-white">Seleccionar Fecha</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Fecha
                            </label>
                            <Input
                              type="date"
                              value={fechaTemporal}
                              max={new Date().toISOString().split('T')[0]}
                              onChange={(e) => {
                                const fechaSeleccionada = e.target.value
                                const hoy = new Date().toISOString().split('T')[0]
                                if (fechaSeleccionada <= hoy) {
                                  setFechaTemporal(fechaSeleccionada)
                                }
                              }}
                              className="w-full bg-[#2A2A2A] border-gray-700 text-white"
                            />
                            {fechaTemporal > new Date().toISOString().split('T')[0] && (
                              <p className="text-red-400 text-xs mt-1">
                                No se puede seleccionar una fecha mayor al día de hoy
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 justify-end">
                            <button
                              onClick={() => {
                                const hoy = new Date().toISOString().split('T')[0]
                                if (fechaTemporal > hoy) {
                                  showWarning('No se puede consultar una fecha mayor al día de hoy')
                                  return
                                }
                                setFechaTurnos(fechaTemporal)
                                setShowFechaModal(false)
                              }}
                              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                            >
                              Visualizar
                            </button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Modal para registrar turno */}
                    <Dialog open={showRegistrarModal} onOpenChange={setShowRegistrarModal}>
                      <DialogContent className="bg-[#1A1A1A] border-gray-700">
                        <DialogHeader>
                          <DialogTitle className="text-white">Registrar Turno</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Fecha Inicio
                            </label>
                            <Input
                              type="datetime-local"
                              value={fechaInicio}
                              max={(() => {
                                const ahora = new Date()
                                ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset())
                                return ahora.toISOString().slice(0, 16)
                              })()}
                              min={(() => {
                                const ayer = new Date()
                                ayer.setDate(ayer.getDate() - 1)
                                ayer.setMinutes(ayer.getMinutes() - ayer.getTimezoneOffset())
                                return ayer.toISOString().slice(0, 16)
                              })()}
                              onChange={(e) => setFechaInicio(e.target.value)}
                              className="w-full bg-[#2A2A2A] border-gray-700 text-white"
                            />
                            <p className="text-gray-400 text-xs mt-1">
                              Puede seleccionar desde ayer hasta hoy
                            </p>
                            {fechaInicio && fechaFin && new Date(fechaInicio.replace(' ', 'T')) >= new Date(fechaFin.replace(' ', 'T')) && (
                              <p className="text-red-400 text-xs mt-1">
                                La fecha de inicio debe ser menor que la fecha de fin
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Fecha Fin
                            </label>
                            <Input
                              type="datetime-local"
                              value={fechaFin}
                              max={(() => {
                                const ahora = new Date()
                                ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset())
                                return ahora.toISOString().slice(0, 16)
                              })()}
                              min={(() => {
                                const ayer = new Date()
                                ayer.setDate(ayer.getDate() - 1)
                                ayer.setMinutes(ayer.getMinutes() - ayer.getTimezoneOffset())
                                return ayer.toISOString().slice(0, 16)
                              })()}
                              onChange={(e) => setFechaFin(e.target.value)}
                              className="w-full bg-[#2A2A2A] border-gray-700 text-white"
                            />
                            {fechaInicio && fechaFin && new Date(fechaFin.replace(' ', 'T')) <= new Date(fechaInicio.replace(' ', 'T')) && (
                              <p className="text-red-400 text-xs mt-1">
                                La fecha de fin debe ser mayor que la fecha de inicio
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Tipo de Turno
                            </label>
                            <select
                              value={tipoTurno}
                              onChange={(e) => setTipoTurnoManual(e.target.value as 'diurno' | 'nocturno')}
                              className="w-full bg-[#2A2A2A] border border-gray-700 text-white rounded-md px-3 py-2"
                            >
                              <option value="diurno">Diurno</option>
                              <option value="nocturno">Nocturno</option>
                            </select>
                            {tipoTurnoCalculado && tipoTurnoManual === null && (
                              <p className="text-gray-400 text-xs mt-1">
                                Tipo calculado automáticamente: {tipoTurnoCalculado === 'diurno' ? 'Diurno' : 'Nocturno'}
                              </p>
                            )}
                            {!fechaInicio || !fechaFin ? (
                              <p className="text-gray-400 text-xs mt-1">
                                El tipo de turno se calculará automáticamente según las fechas y horas ingresadas
                              </p>
                            ) : tipoTurnoCalculado === null ? (
                              <p className="text-yellow-400 text-xs mt-1">
                                Las fechas y horas ingresadas no corresponden a un turno válido. Seleccione el tipo manualmente.
                              </p>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-3 justify-end">
                            <button
                              onClick={() => {
                                setShowRegistrarModal(false)
                                setFechaInicio('')
                                setFechaFin('')
                                setTipoTurnoManual(null)
                              }}
                              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-600 text-white hover:bg-gray-700 transition-colors"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={handleRegistrarTurno}
                              disabled={crearTurnoMutation.isPending || !tipoTurno || tipoTurno === null || !fechaInicio || !fechaFin}
                              className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {crearTurnoMutation.isPending ? 'Registrando...' : 'Registrar'}
                            </button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Card className="bg-[#2A2A2A] border-gray-700">
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-[#1A1A1A] hover:bg-[#1A1A1A] border-gray-700">
                                <TableHead className="text-gray-300 font-semibold">Hora Inicio</TableHead>
                                <TableHead className="text-gray-300 font-semibold">Hora Fin</TableHead>
                                <TableHead className="text-gray-300 font-semibold">Turno</TableHead>
                                <TableHead className="text-gray-300 font-semibold">Estado</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(() => {
                                if (isLoadingTurnosGuardados) {
                                  return (
                                    <TableRow>
                                      <TableCell colSpan={4} className="text-center py-8">
                                        <div className="flex items-center justify-center">
                                          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )
                                }

                                // Componente para renderizar una fila de turno
                                const renderTurnoRow = (turno: { id: string; inicio: Date; fin: Date | null; activo: boolean; tipoTurno: 'diurno' | 'nocturno' }) => (
                                        <TableRow key={turno.id} className="border-gray-700 hover:bg-[#1A1A1A]">
                                          <TableCell className="text-gray-300">
                                            {formatTime(turno.inicio)}
                                          </TableCell>
                                          <TableCell className="text-gray-300">
                                            {turno.fin ? formatTime(turno.fin) : 'En curso'}
                                          </TableCell>
                                          <TableCell>
                                            <Badge
                                              variant="secondary"
                                              className={cn(
                                                'text-xs px-2 py-1',
                                                turno.tipoTurno === 'diurno'
                                                  ? 'bg-blue-500 text-white'
                                                  : 'bg-purple-500 text-white'
                                              )}
                                            >
                                              {turno.tipoTurno === 'diurno' ? 'Diurno' : 'Nocturno'}
                                            </Badge>
                                          </TableCell>
                                          <TableCell>
                                            <Badge
                                              variant="secondary"
                                              className={cn(
                                                'text-xs px-2 py-1',
                                                turno.activo
                                                  ? 'bg-green-500 text-white'
                                                  : 'bg-gray-500 text-white'
                                              )}
                                            >
                                              {turno.activo ? 'Activo' : 'Finalizado'}
                                            </Badge>
                                          </TableCell>
                                        </TableRow>
                                      )

                                // Si hay respuesta del backend (aunque sea array vacío), usar esa respuesta
                                if (turnosGuardados !== null && turnosGuardados !== undefined) {
                                  if (turnosGuardados.turnos && turnosGuardados.turnos.length > 0) {
                                    const turnosParaMostrar = turnosGuardados.turnos.map(t => ({
                                      id: t.id,
                                      inicio: new Date(t.hora_inicio),
                                      fin: t.hora_fin ? new Date(t.hora_fin) : null,
                                      activo: t.estado === 'activo',
                                      tipoTurno: t.tipo_turno,
                                    }))
                                    
                                    return turnosParaMostrar.map(renderTurnoRow)
                                  } else {
                                    return (
                                      <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-gray-400">
                                          No se encontraron turnos para este conductor en esta fecha
                                        </TableCell>
                                      </TableRow>
                                    )
                                  }
                                }

                                // Si no hay respuesta del backend, usar los turnos calculados del timeline
                                if (timeline && timeline.orders && timeline.orders.length > 0 && turnos.length > 0) {
                                  return turnos.map(renderTurnoRow)
                                }

                                // Si no hay turnos calculados ni guardados
                                return (
                                  <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-gray-400">
                                      No hay turnos registrados para este conductor en esta fecha
                                    </TableCell>
                                  </TableRow>
                                )
                              })()}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  )
}
