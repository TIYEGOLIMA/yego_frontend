import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { yegoProOpsService, type DriverItem, type ViajesCompletosResponse, type RegistroCierre, type FechasTurnosResponse, type ResumenPagosResponse, type ConductorResumenPagos, type TurnosPagadosResponse } from '../../../../services/yego-pro-ops-service'
import { useAuth } from '../../../../shared/hooks/useAuth'
import { useToastNotifications } from '../../../../hooks/useToastNotifications'
import { NotificationContainer } from '../../../../components/NotificationToast'
import { Card, CardContent } from '../../../../components/ui/card'
import { Input } from '../../../../components/ui/input'
import { Badge } from '../../../../components/ui/badge'
import { Button } from '../../../../components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select'
import { User, Search, DollarSign, CreditCard, MapPin, TrendingUp, Calendar, ChevronLeft, ChevronRight, ChevronDown, Car, ChevronsLeft, ChevronsRight, Table2, LayoutGrid, Eye, Pencil, Save, X, CheckCircle2, Clock, AlertCircle, Sunrise, Moon } from 'lucide-react'
import { cn } from '../../../../utils/cn'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const ITEMS_PER_PAGE_OPTIONS = [5, 10] as const
const DEFAULT_ITEMS_PER_PAGE = 10
const SECTION_CARD_CLASS = "bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
const formatBalance = (balance: number): string => {
  const formatted = new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(balance)
  return `S/. ${formatted}`
}

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatearFechaLocal = (year: number, month: number, day: number): string => {
  const mes = (month + 1).toString().padStart(2, '0')
  const dia = day.toString().padStart(2, '0')
  return `${year}-${mes}-${dia}`
}

const obtenerFechaAyer = (): string => {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return formatearFechaLocal(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())
}

const obtenerFechaHoy = (): string => {
  const hoy = new Date()
  return formatearFechaLocal(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
}

// Función para parsear fecha YYYY-MM-DD sin problemas de zona horaria
const parsearFechaLocal = (fechaStr: string): Date => {
  const [year, month, day] = fechaStr.split('-').map(Number)
  // month - 1 porque los meses en Date van de 0-11
  return new Date(year, month - 1, day)
}

// Función para formatear fecha YYYY-MM-DD a texto legible sin problemas de zona horaria
const formatearFechaLegible = (fechaStr: string): string => {
  const fecha = parsearFechaLocal(fechaStr)
  return fecha.toLocaleDateString('es-PE', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  })
}

// Función para formatear fecha YYYY-MM-DD con día de la semana
const formatearFechaConDia = (fechaStr: string): string => {
  const fecha = parsearFechaLocal(fechaStr)
  return fecha.toLocaleDateString('es-PE', { 
    weekday: 'long', 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  })
}

const parseNumber = (value: string | undefined | null, defaultValue = 0): number => {
  if (!value || value.trim() === '') return defaultValue
  const parsed = parseFloat(value)
  return isNaN(parsed) ? defaultValue : parsed
}

// Función para validar y filtrar solo números positivos (sin letras ni negativos)
const validarNumeroPositivo = (value: string): string => {
  // Permitir cadena vacía
  if (value === '') return ''
  
  // Rechazar si contiene signo negativo
  if (value.includes('-')) return ''
  
  // Remover cualquier carácter que no sea número o punto decimal
  let cleaned = value.replace(/[^0-9.]/g, '')
  
  // Si después de limpiar está vacío, retornar vacío
  if (cleaned === '') return ''
  
  // Permitir solo un punto decimal
  const parts = cleaned.split('.')
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('')
  }
  
  // Asegurar que no comience con punto
  if (cleaned.startsWith('.')) {
    cleaned = '0' + cleaned
  }
  
  // Convertir a número y verificar que sea positivo o cero
  const num = parseFloat(cleaned)
  if (isNaN(num) || num < 0) {
    return ''
  }
  
  return cleaned
}

const calcularValoresCierre = (
  montoTotalPagar: number,
  gnvSoles: string,
  gasolinaSoles: string,
  otrosGastos: string,
  liquidaEfectivo: string,
  liquidaYape: string
) => {
  const totalGastosCombustible = parseNumber(gnvSoles) + parseNumber(gasolinaSoles)
  const totalOtrosGastos = parseNumber(otrosGastos)
  const totalGastos = totalGastosCombustible + totalOtrosGastos
  const montoRestante = montoTotalPagar - totalGastos
  const totalLiquidacion = parseNumber(liquidaEfectivo) + parseNumber(liquidaYape)
  const diferencia = montoRestante - totalLiquidacion
  const calza = Math.abs(diferencia) < 0.01

  return {
    montoTotalPagar,
    totalGastosCombustible,
    totalOtrosGastos,
    totalGastos,
    montoRestante,
    totalLiquidacion,
    diferencia,
    calza
  }
}

// Tipos
interface PaginacionProps {
  currentPage: number
  totalPages: number
  itemsPerPage: number
  totalItems: number
  startIndex: number
  endIndex: number
  onPageChange: (page: number) => void
  onItemsPerPageChange: (value: string) => void
}

interface Metricas {
  totalViajes: number
  totalEfectivo: number
  totalTarjeta: number
  totalIngresos: number
  totalDistancia: number
  totalBonos: number
  totalPromocion: number
  promedioPorViaje: number
}

// Componente KPI reutilizable
interface KPICardProps {
  icon: React.ReactNode
  label: string
  value: string | React.ReactNode
  bgColor: string
  textColor: string
  borderColor: string
  iconColor: string
  isHighlighted?: boolean
}

const KPICard = ({
  icon,
  label,
  value,
  bgColor,
  textColor,
  borderColor,
  iconColor,
  isHighlighted = false
}: KPICardProps) => {
  const borderClass = isHighlighted ? 'border-2 shadow-md' : 'border'
  return (
    <div className={`${bgColor} rounded-lg p-3 ${borderClass} ${borderColor}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <div className={iconColor}>{icon}</div>
        <p className={`text-xs font-medium ${textColor}`}>{label}</p>
      </div>
      <div className={`text-lg font-bold ${textColor}`}>
        {value}
      </div>
    </div>
  )
}

// Componente de Paginación
const Paginacion = ({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  startIndex,
  endIndex,
  onPageChange,
  onItemsPerPageChange
}: PaginacionProps) => {
  const calcularNumerosPagina = (current: number, total: number): number[] => {
    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1)
    }
    if (current <= 3) {
      return [1, 2, 3, 4, 5]
    }
    if (current >= total - 2) {
      return Array.from({ length: 5 }, (_, i) => total - 4 + i)
    }
    return Array.from({ length: 5 }, (_, i) => current - 2 + i)
  }

  if (totalItems === 0) return null

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Mostrando {startIndex + 1} a {Math.min(endIndex, totalItems)} de {totalItems}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Por página:</span>
          <Select value={itemsPerPage.toString()} onValueChange={onItemsPerPageChange}>
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ITEMS_PER_PAGE_OPTIONS.map((value) => (
                <SelectItem key={value} value={value.toString()}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onPageChange(1)} disabled={currentPage === 1} className="h-8 w-8 p-0">
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="h-8 w-8 p-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1">
            {calcularNumerosPagina(currentPage, totalPages).map((pageNum) => (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? 'primary' : 'outline'}
                size="sm"
                onClick={() => onPageChange(pageNum)}
                className="h-8 w-8 p-0"
              >
                {pageNum}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages} className="h-8 w-8 p-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onPageChange(totalPages)} disabled={currentPage >= totalPages} className="h-8 w-8 p-0">
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

// Hook personalizado para paginación
const usePagination = <T,>(items: T[], itemsPerPage: number) => {
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = useMemo(() => Math.ceil(items.length / itemsPerPage), [items.length, itemsPerPage])
  const startIndex = useMemo(() => (currentPage - 1) * itemsPerPage, [currentPage, itemsPerPage])
  const endIndex = useMemo(() => startIndex + itemsPerPage, [startIndex, itemsPerPage])
  const paginatedItems = useMemo(() => items.slice(startIndex, endIndex), [items, startIndex, endIndex])

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(1)
    }
  }, [totalPages])

  const handleItemsPerPageChange = (_newItemsPerPage: number) => {
    setCurrentPage(1)
  }

  return {
    currentPage,
    setCurrentPage,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems,
    handleItemsPerPageChange
  }
}

export const DetalleView = () => {
  const { user } = useAuth()
  const { showSuccess, showError, showWarning, notifications, removeNotification } = useToastNotifications()
  const [searchTermPendientes, setSearchTermPendientes] = useState('')
  const [searchTermLiquidados, setSearchTermLiquidados] = useState('')
  const [searchTermViajes, setSearchTermViajes] = useState('')
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(obtenerFechaHoy())
  const [selectedDriver, setSelectedDriver] = useState<DriverItem | null>(null)
  const [selectedConductorResumen, setSelectedConductorResumen] = useState<ConductorResumenPagos | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [vistaTabla, setVistaTabla] = useState(true)
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE)
  const [showModalCierre, setShowModalCierre] = useState(false)
  const [showModalVerCierre, setShowModalVerCierre] = useState(false)
  const [showModalTurnos, setShowModalTurnos] = useState(false)
  const [conductorParaTurnos, setConductorParaTurnos] = useState<ConductorResumenPagos | null>(null)
  const [cierreDetalle, setCierreDetalle] = useState<RegistroCierre | null>(null)
  const [cargandoCierre, setCargandoCierre] = useState(false)
  const [registrandoCierre, setRegistrandoCierre] = useState(false)
  const [editandoCierre, setEditandoCierre] = useState(false)
  const [actualizandoCierre, setActualizandoCierre] = useState(false)
  const [editGnvM3, setEditGnvM3] = useState('')
  const [editGnvSoles, setEditGnvSoles] = useState('')
  const [editGasolinaGalones, setEditGasolinaGalones] = useState('')
  const [editGasolinaSoles, setEditGasolinaSoles] = useState('')
  const [editLiquidaEfectivo, setEditLiquidaEfectivo] = useState('')
  const [editLiquidaYape, setEditLiquidaYape] = useState('')
  const [editOtrosGastos, setEditOtrosGastos] = useState('')
  const [editOtrosGastosDescripcion, setEditOtrosGastosDescripcion] = useState('')
  const [gnvM3, setGnvM3] = useState('')
  const [gnvSoles, setGnvSoles] = useState('')
  const [gasolinaGalones, setGasolinaGalones] = useState('')
  const [gasolinaSoles, setGasolinaSoles] = useState('')
  const [liquidaEfectivo, setLiquidaEfectivo] = useState('')
  const [liquidaYape, setLiquidaYape] = useState('')
  const [otrosGastos, setOtrosGastos] = useState('')
  const [otrosGastosDescripcion, setOtrosGastosDescripcion] = useState('')
  
  const [fechaInicio, setFechaInicio] = useState<string>(obtenerFechaAyer)
  const [fechaFin, setFechaFin] = useState<string>(obtenerFechaAyer)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const datePickerRef = useRef<HTMLDivElement>(null)
  

  // Resetear estado del calendario cuando se abre/cierra el modal
  useEffect(() => {
    if (showModal) {
      setShowDatePicker(false)
    } else {
      setShowDatePicker(false)
      setFechaInicio(obtenerFechaAyer())
      setFechaFin(obtenerFechaAyer())
      setCurrentMonth(new Date())
    }
  }, [showModal])

  // Funciones del calendario
  const obtenerDiasDelMes = (fecha: Date) => {
    const año = fecha.getFullYear()
    const mes = fecha.getMonth()
    const primerDia = new Date(año, mes, 1)
    const ultimoDia = new Date(año, mes + 1, 0)
    const diasEnMes = ultimoDia.getDate()
    const diaInicioSemana = (primerDia.getDay() + 6) % 7
    
    const dias: (number | null)[] = []
    for (let i = 0; i < diaInicioSemana; i++) {
      dias.push(null)
    }
    for (let i = 1; i <= diasEnMes; i++) {
      dias.push(i)
    }
    return dias
  }

  const esFechaFutura = (dia: number) => {
    const fecha = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dia)
    const hoy = new Date()
    hoy.setHours(23, 59, 59, 999)
    return fecha > hoy
  }

  const seleccionarFecha = (dia: number) => {
    if (esFechaFutura(dia)) return
    
    const fechaStr = obtenerFechaStr(dia)
    
    // Si ya hay un rango completo seleccionado, resetear y empezar de nuevo
    if (fechaInicio && fechaFin) {
      setFechaInicio(fechaStr)
      setFechaFin('')
      // NO cerrar el calendario, permitir seleccionar la segunda fecha
      return
    }
    
    // Si no hay fechaInicio, establecerla (primera fecha)
    if (!fechaInicio) {
      setFechaInicio(fechaStr)
      setFechaFin('')
      // NO cerrar el calendario, esperar a que se seleccione la segunda fecha
      return
    }
    
    // Si hay fechaInicio pero no fechaFin (seleccionando la segunda fecha)
    if (fechaStr < fechaInicio) {
      // Si la nueva fecha es menor, resetear y establecer como nueva fecha inicio
      setFechaInicio(fechaStr)
      setFechaFin('')
      // NO cerrar el calendario, esperar a que se seleccione la segunda fecha
    } else {
      // Establecer rango de fechas y cerrar el calendario
      setFechaFin(fechaStr)
      setShowDatePicker(false)
    }
  }

  const formatearRangoFechas = () => {
    if (!fechaInicio && !fechaFin) return 'Seleccionar rango de fechas'
    if (!fechaFin) {
      // Solo hay fecha inicio seleccionada
      const [, month, day] = fechaInicio.split('-').map(Number)
      return `${day} de ${MESES[month - 1].toLowerCase()}...`
    }
    
    const [, monthInicio, dayInicio] = fechaInicio.split('-').map(Number)
    const [, monthFin, dayFin] = fechaFin.split('-').map(Number)
    
    // Si es la misma fecha, mostrar solo una fecha
    if (fechaInicio === fechaFin) {
      return `${dayInicio} de ${MESES[monthInicio - 1].toLowerCase()}`
    }
    
    // Si es rango del mismo mes
    if (monthInicio === monthFin) {
      return `${dayInicio}-${dayFin} de ${MESES[monthInicio - 1].toLowerCase()}`
    }
    
    // Rango de diferentes meses
    return `${dayInicio} ${MESES[monthInicio - 1].toLowerCase()} - ${dayFin} ${MESES[monthFin - 1].toLowerCase()}`
  }

  const obtenerFechaStr = (dia: number) => formatearFechaLocal(currentMonth.getFullYear(), currentMonth.getMonth(), dia)

  const esFechaEnRango = (dia: number) => {
    if (!fechaInicio || !fechaFin) return false
    const fechaStr = obtenerFechaStr(dia)
    return fechaStr >= fechaInicio && fechaStr <= fechaFin
  }

  const esFechaInicio = (dia: number) => fechaInicio ? obtenerFechaStr(dia) === fechaInicio : false

  const esFechaFin = (dia: number) => fechaFin ? obtenerFechaStr(dia) === fechaFin : false

  const tieneTurno = (dia: number) => {
    const fechaStr = obtenerFechaStr(dia)
    return fechasConTurnos.has(fechaStr)
  }

  const esMesFuturo = (year: number, month: number): boolean => {
    const hoy = new Date()
    return year > hoy.getFullYear() || (year === hoy.getFullYear() && month > hoy.getMonth())
  }

  const cambiarMes = (direccion: 'anterior' | 'siguiente') => {
    setCurrentMonth(prev => {
      const nuevoMes = new Date(prev)
      if (direccion === 'anterior') {
        nuevoMes.setMonth(prev.getMonth() - 1)
      } else {
        const mesSiguiente = prev.getMonth() + 1
        const añoSiguiente = prev.getFullYear()
        if (esMesFuturo(añoSiguiente, mesSiguiente)) {
          return prev
        }
        nuevoMes.setMonth(mesSiguiente)
      }
      return nuevoMes
    })
  }

  // Query para obtener resumen de pagos (solo se actualiza cuando se registra o actualiza un cierre)
  const { data: resumenPagosData, isLoading: loadingResumenPagos, refetch: refetchResumenPagos } = useQuery<ResumenPagosResponse>({
    queryKey: ['yego-pro-ops-resumen-pagos', fechaSeleccionada],
    queryFn: () => yegoProOpsService.obtenerResumenPagos(fechaSeleccionada),
    refetchOnWindowFocus: false,
  })

  // Query para obtener turnos pagados (se actualiza solo cuando se registra o actualiza un cierre)
  const { data: _turnosPagadosData, refetch: refetchTurnosPagados } = useQuery<TurnosPagadosResponse>({
    queryKey: ['yego-pro-ops-turnos-pagados', fechaSeleccionada],
    queryFn: () => yegoProOpsService.obtenerTurnosPagados(fechaSeleccionada),
    refetchOnWindowFocus: false,
  })


  // Query para obtener fechas de turnos cuando se abre el modal de detalles
  const { data: fechasTurnosData } = useQuery<FechasTurnosResponse>({
    queryKey: ['yego-pro-ops-fechas-turnos', selectedDriver?.driver_id],
    queryFn: () => {
      if (!selectedDriver) {
        throw new Error('No hay conductor seleccionado')
      }
      return yegoProOpsService.obtenerFechasTurnos(selectedDriver.driver_id)
    },
    enabled: showModal && !!selectedDriver,
    refetchOnWindowFocus: false,
  })

  // Crear un Set con las fechas que tienen turnos para fácil búsqueda
  const fechasConTurnos = useMemo(() => {
    if (!fechasTurnosData?.fechas) return new Set<string>()
    return new Set(fechasTurnosData.fechas.map(f => f.fecha))
  }, [fechasTurnosData])



  const { data: viajesData, isLoading: loadingViajes, isError: errorViajes, refetch: refetchViajes } = useQuery<ViajesCompletosResponse>({
    queryKey: ['yego-pro-ops-viajes', selectedDriver?.driver_id, fechaInicio, fechaFin],
    queryFn: () => {
      if (!selectedDriver || !fechaInicio || !fechaFin) {
        return Promise.resolve({ tipo: 'viajes', viajes: [], cierre_registrado: false })
      }
      return yegoProOpsService.obtenerViajesCompletos(selectedDriver.driver_id, fechaInicio, fechaFin)
    },
    enabled: showModal && !!selectedDriver && !!fechaInicio && !!fechaFin,
    refetchOnWindowFocus: false,
  })

  const datosParaMostrar = viajesData

  // Detectar si hay un registro de cierre (solo de los datos actuales, no de los anteriores)
  const cierreRegistrado = viajesData?.cierre_registrado ?? false


  // Separar conductores en pendientes (tienen turnos sin pagar) y liquidados (todos pagados)
  const { conductoresPendientes, conductoresLiquidados } = useMemo(() => {
    if (!resumenPagosData?.conductores) {
      return { conductoresPendientes: [], conductoresLiquidados: [] }
    }
    
    const pendientes: ConductorResumenPagos[] = []
    const liquidados: ConductorResumenPagos[] = []
    
    resumenPagosData.conductores.forEach(conductor => {
      // Si tiene al menos un turno sin pagar, está pendiente
      const tieneTurnosSinPagar = conductor.turnos.some(turno => !turno.pagado)
      if (tieneTurnosSinPagar) {
        pendientes.push(conductor)
      } else {
        liquidados.push(conductor)
      }
    })
    
    return { conductoresPendientes: pendientes, conductoresLiquidados: liquidados }
  }, [resumenPagosData])

  // Filtrar conductores pendientes por búsqueda
  const conductoresPendientesFiltrados = useMemo(() => {
    if (!searchTermPendientes.trim()) return conductoresPendientes
    
    const searchLower = searchTermPendientes.toLowerCase().trim()
    return conductoresPendientes.filter(conductor =>
      conductor.driver_id.toLowerCase().includes(searchLower) ||
      (conductor.nombre && conductor.nombre.toLowerCase().includes(searchLower)) ||
      (conductor.telefono && conductor.telefono.toLowerCase().includes(searchLower))
    )
  }, [conductoresPendientes, searchTermPendientes])

  // Filtrar conductores liquidados por búsqueda
  const conductoresLiquidadosFiltrados = useMemo(() => {
    if (!searchTermLiquidados.trim()) return conductoresLiquidados
    
    const searchLower = searchTermLiquidados.toLowerCase().trim()
    return conductoresLiquidados.filter(conductor =>
      conductor.driver_id.toLowerCase().includes(searchLower) ||
      (conductor.nombre && conductor.nombre.toLowerCase().includes(searchLower)) ||
      (conductor.telefono && conductor.telefono.toLowerCase().includes(searchLower))
    )
  }, [conductoresLiquidados, searchTermLiquidados])

  const viajesArray = useMemo(() => {
    return datosParaMostrar?.viajes ?? []
  }, [datosParaMostrar])

  // Filtrar viajes por ID
  const filteredViajes = useMemo(() => {
    if (!searchTermViajes.trim()) return viajesArray
    
    const searchLower = searchTermViajes.toLowerCase().trim()
    return viajesArray.filter(viaje => 
      viaje.short_id.toString().includes(searchLower) ||
      viaje.id.toLowerCase().includes(searchLower)
    )
  }, [viajesArray, searchTermViajes])

  const metricas = useMemo<Metricas | null>(() => {
    if (!viajesArray || viajesArray.length === 0) return null

    const { totalEfectivo, totalTarjeta, totalIngresos, totalDistancia, totalBonos, totalPromocion } = viajesArray.reduce(
      (acc, viaje) => ({
        totalEfectivo: acc.totalEfectivo + (viaje.cash ?? 0),
        totalTarjeta: acc.totalTarjeta + (viaje.card ?? 0),
        totalIngresos: acc.totalIngresos + (viaje.price ?? 0),
        totalDistancia: acc.totalDistancia + (viaje.distance ?? 0),
        totalBonos: acc.totalBonos + (viaje.price_bonus ?? 0),
        totalPromocion: acc.totalPromocion + (viaje.price_promotion ?? 0),
      }),
      { totalEfectivo: 0, totalTarjeta: 0, totalIngresos: 0, totalDistancia: 0, totalBonos: 0, totalPromocion: 0 }
    )

    const totalViajes = viajesArray.length

    return {
      totalViajes,
      totalEfectivo,
      totalTarjeta,
      totalIngresos,
      totalDistancia,
      totalBonos,
      totalPromocion,
      promedioPorViaje: totalViajes > 0 ? totalIngresos / totalViajes : 0,
    }
  }, [viajesArray])

  // Paginación (solo para viajes, ya no para conductores)
  const paginationViajes = usePagination(filteredViajes, itemsPerPage)

  const handleItemsPerPageChangeViajes = (value: string) => {
    const newItemsPerPage = parseInt(value)
    setItemsPerPage(newItemsPerPage)
    paginationViajes.handleItemsPerPageChange(newItemsPerPage)
  }

  const esUnSoloDia = fechaInicio && fechaFin && fechaInicio === fechaFin

  const handleAbrirModalCierre = (conductor?: ConductorResumenPagos) => {
    // Si se pasa un conductor, usarlo; si no, usar el selectedDriver
    const conductorParaUsar = conductor || selectedConductorResumen
    if (!conductorParaUsar) return
    
    // Crear un DriverItem temporal para el modal (necesario para compatibilidad)
    const driverItem: DriverItem = {
      driver_id: conductorParaUsar.driver_id,
      full_name: conductorParaUsar.nombre || conductorParaUsar.driver_id,
      status: 'offline',
      balance: 0,
      avatar_url: conductorParaUsar.avatar_url,
      photo_url: conductorParaUsar.avatar_url,
      phone: conductorParaUsar.telefono,
    }
    
    setSelectedDriver(driverItem)
    setSelectedConductorResumen(conductorParaUsar)
    setFechaInicio(fechaSeleccionada)
    setFechaFin(fechaSeleccionada)
    
    // Resetear formulario
    setGnvM3('')
    setGnvSoles('')
    setGasolinaGalones('')
    setGasolinaSoles('')
    setLiquidaEfectivo('')
    setLiquidaYape('')
    setOtrosGastos('')
    setOtrosGastosDescripcion('')
    setShowModalCierre(true)
  }

  const handleVerCierre = async () => {
    if (!selectedDriver || !fechaInicio) return
    
    try {
      setCargandoCierre(true)
      const cierre = await yegoProOpsService.obtenerCierre(selectedDriver.driver_id, fechaInicio)
      if (cierre) {
        setCierreDetalle(cierre)
        inicializarValoresEdicion(cierre)
        setEditandoCierre(false)
        setShowModalVerCierre(true)
      } else {
        showError('No se encontró el registro de cierre')
      }
    } catch (error) {
      showError('Error al obtener el cierre. Por favor, intenta nuevamente.')
    } finally {
      setCargandoCierre(false)
    }
  }

  // Inicializar valores de edición desde el cierre
  const inicializarValoresEdicion = (cierre: RegistroCierre) => {
    setEditGnvM3(cierre.gnvM3 || '')
    setEditGnvSoles(cierre.gnvSoles.toString())
    setEditGasolinaGalones(cierre.gasolinaGalones || '')
    setEditGasolinaSoles(cierre.gasolinaSoles.toString())
    setEditLiquidaEfectivo(cierre.liquidaEfectivo.toString())
    setEditLiquidaYape(cierre.liquidaYape.toString())
    setEditOtrosGastos(cierre.otrosGastos.toString())
    setEditOtrosGastosDescripcion(cierre.otrosGastosDescripcion || '')
  }

  const handleIniciarEdicion = () => {
    setEditandoCierre(true)
  }

  const handleCancelarEdicion = () => {
    if (!cierreDetalle) return
    inicializarValoresEdicion(cierreDetalle)
    setEditandoCierre(false)
  }

  // Helper: Obtener IDs de turnos por fecha
  const obtenerTurnoIdsPorFecha = (fecha: string): number[] => {
    return selectedConductorResumen?.turnos
      ?.filter(turno => turno.fecha === fecha)
      ?.map(turno => turno.id) || []
  }

  // Helper: Validar liquidación y mostrar mensaje si no calza
  const validarLiquidacion = (valoresCierre: ReturnType<typeof calcularValoresCierre>): boolean => {
    if (!valoresCierre.calza) {
      if (valoresCierre.diferencia > 0) {
        showWarning(`Falta liquidar ${formatBalance(valoresCierre.diferencia)}. Monto Restante: ${formatBalance(valoresCierre.montoRestante)}, Total Liquidación: ${formatBalance(valoresCierre.totalLiquidacion)}.`)
      } else {
        showWarning(`La liquidación excede el monto restante por ${formatBalance(Math.abs(valoresCierre.diferencia))}. Monto Restante: ${formatBalance(valoresCierre.montoRestante)}, Total Liquidación: ${formatBalance(valoresCierre.totalLiquidacion)}.`)
      }
      return false
    }
    return true
  }

  // Helper: Refrescar datos después de un cierre (solo resumen de pagos y turnos pagados)
  const refrescarDatosDespuesCierre = async () => {
    await Promise.all([
      refetchResumenPagos(),
      refetchTurnosPagados()
    ])
  }

  // Validar formulario de cierre (compartido entre registro y actualización)
  // gasolinaSoles es opcional, puede ser 0 o vacío
  const validarFormularioCierre = (gnvSoles: string, _gasolinaSoles: string, liquidaEfectivo: string, liquidaYape: string, otrosGastos: string, otrosGastosDescripcion: string): string | null => {
    if (!gnvSoles || !liquidaEfectivo || !liquidaYape) {
      return 'Por favor, completa todos los campos obligatorios'
    }
    if (otrosGastos && parseNumber(otrosGastos) > 0 && !otrosGastosDescripcion.trim()) {
      return 'Por favor, ingresa la descripción del gasto'
    }
    return null
  }

  const handleActualizarCierre = async () => {
    if (!cierreDetalle || !selectedDriver || !fechaInicio) return

    const errorValidacion = validarFormularioCierre(editGnvSoles, editGasolinaSoles, editLiquidaEfectivo, editLiquidaYape, editOtrosGastos, editOtrosGastosDescripcion)
    if (errorValidacion) {
      showWarning(errorValidacion)
      return
    }

    try {
      setActualizandoCierre(true)

      // Usar el monto total a pagar del conductor o el totalIngresos del cierre como fallback
      const montoBase = selectedConductorResumen?.monto_total_pagado ?? cierreDetalle.totalIngresos
      
      const valoresCalculados = calcularValoresCierre(
        montoBase,
        editGnvSoles,
        editGasolinaSoles,
        editOtrosGastos,
        editLiquidaEfectivo,
        editLiquidaYape
      )

      // Validar que la liquidación calce
      if (!validarLiquidacion(valoresCalculados)) {
        return
      }

      await yegoProOpsService.actualizarCierre({
        id: cierreDetalle.id,
        driverId: selectedDriver.driver_id,
        userId: user?.id ?? 0,
        fecha: fechaInicio,
        turnoIds: obtenerTurnoIdsPorFecha(fechaInicio),
        gnvM3: editGnvM3 || null,
        gnvSoles: parseNumber(editGnvSoles),
        gasolinaGalones: editGasolinaGalones || null,
        gasolinaSoles: editGasolinaSoles ? parseNumber(editGasolinaSoles) : 0,
        liquidaEfectivo: parseNumber(editLiquidaEfectivo),
        liquidaYape: parseNumber(editLiquidaYape),
        otrosGastos: valoresCalculados.totalOtrosGastos,
        otrosGastosDescripcion: editOtrosGastosDescripcion.trim() || null,
        totalIngresos: montoBase,
        totalGastos: valoresCalculados.totalGastos,
        resta: valoresCalculados.montoRestante,
      })

      setEditandoCierre(false)
      setShowModalVerCierre(false)
    } catch (error) {
      showError('Error al actualizar el cierre. Por favor, intenta nuevamente.')
    } finally {
      setActualizandoCierre(false)
    }
  }

  const puedeEditar = user?.role?.toUpperCase() !== 'GESTOR'

  const valoresCierre = useMemo(() => {
    // Priorizar monto_total_pagado del conductor resumen si está disponible
    const montoBase = selectedConductorResumen?.monto_total_pagado ?? metricas?.totalIngresos
    
    if (!montoBase || montoBase === 0) return null
    
    return calcularValoresCierre(
      montoBase,
      gnvSoles,
      gasolinaSoles,
      otrosGastos,
      liquidaEfectivo,
      liquidaYape
    )
  }, [selectedConductorResumen, metricas, gnvSoles, gasolinaSoles, otrosGastos, liquidaEfectivo, liquidaYape])

  // Valores calculados para el modo de edición (memoizado para evitar lag)
  const valoresCierreEdicion = useMemo(() => {
    if (!editandoCierre || !cierreDetalle) return null
    
    const montoBase = selectedConductorResumen?.monto_total_pagado ?? cierreDetalle.totalIngresos
    if (!montoBase || montoBase === 0) return null
    
    return calcularValoresCierre(
      montoBase,
      editGnvSoles,
      editGasolinaSoles,
      editOtrosGastos,
      editLiquidaEfectivo,
      editLiquidaYape
    )
  }, [editandoCierre, cierreDetalle, selectedConductorResumen, editGnvSoles, editGasolinaSoles, editOtrosGastos, editLiquidaEfectivo, editLiquidaYape])

  const handleRegistrarCierre = async () => {
    if (!selectedDriver || !fechaInicio || !esUnSoloDia || !valoresCierre) return

    const errorValidacion = validarFormularioCierre(gnvSoles, gasolinaSoles, liquidaEfectivo, liquidaYape, otrosGastos, otrosGastosDescripcion)
    if (errorValidacion) {
      showWarning(errorValidacion)
      return
    }

    // Validar que la liquidación calce con el monto restante
    if (!validarLiquidacion(valoresCierre)) {
      return
    }

    try {
      setRegistrandoCierre(true)

      await yegoProOpsService.registrarCierre({
        driverId: selectedDriver.driver_id,
        userId: user?.id ?? 0,
        fecha: fechaInicio,
        turnoIds: obtenerTurnoIdsPorFecha(fechaInicio),
        gnvM3: gnvM3 || null,
        gnvSoles: parseNumber(gnvSoles),
        gasolinaGalones: gasolinaGalones || null,
        gasolinaSoles: gasolinaSoles ? parseNumber(gasolinaSoles) : 0,
        liquidaEfectivo: parseNumber(liquidaEfectivo),
        liquidaYape: parseNumber(liquidaYape),
        otrosGastos: valoresCierre.totalOtrosGastos,
        otrosGastosDescripcion: otrosGastosDescripcion.trim() || null,
        totalIngresos: selectedConductorResumen?.monto_total_pagado ?? 0,
        totalGastos: valoresCierre.totalGastos,
        resta: valoresCierre.montoRestante,
      })
      
      await refrescarDatosDespuesCierre()
      setShowModalCierre(false)
      showSuccess('Cierre registrado exitosamente')
    } catch (error) {
      showError('Error al registrar el cierre. Por favor, intenta nuevamente.')
    } finally {
      setRegistrandoCierre(false)
    }
  }


  const firstTripVehicle = viajesArray.length > 0 
    ? viajesArray[0].car_brand_model 
    : null

  return (
    <div className="relative">
      <div>
        <Card>
          <CardContent className="p-6">
            {/* Header con fecha */}
            <div className="mb-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
                    <Calendar className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Fecha de liquidación</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {formatearFechaLegible(fechaSeleccionada)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    Cambiar fecha:
                  </label>
                  <Input
                    type="date"
                    value={fechaSeleccionada}
                    onChange={(e) => setFechaSeleccionada(e.target.value)}
                    className="w-40 h-10 text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
            </div>

            {/* Vista de Liquidación: Pendientes y Liquidados */}
            {loadingResumenPagos ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 dark:border-red-400"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando conductores...</p>
              </div>
            ) : (!resumenPagosData?.conductores || resumenPagosData.conductores.length === 0) ? (
              <div className="text-center py-12">
                <User className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                <p className="mt-4 text-gray-600 dark:text-gray-400">No se encontraron conductores</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Dos columnas: Pendientes y Liquidados */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Sección: Pendientes de Liquidar */}
                  <div className="space-y-4">
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-lg space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded-lg">
                          <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-orange-900 dark:text-orange-100">
                            Pendientes de Liquidar
                          </h3>
                          <p className="text-sm text-orange-700 dark:text-orange-300">
                            {conductoresPendientesFiltrados.length} de {conductoresPendientes.length} conductor{conductoresPendientes.length !== 1 ? 'es' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          type="text"
                          placeholder="Buscar en pendientes..."
                          value={searchTermPendientes}
                          onChange={(e) => setSearchTermPendientes(e.target.value)}
                          className="pl-9 h-9 text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                      {conductoresPendientesFiltrados.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                          {searchTermPendientes ? (
                            <>
                              <AlertCircle className="mx-auto h-10 w-10 text-orange-500 dark:text-orange-400 mb-2" />
                              <p className="text-sm text-gray-600 dark:text-gray-400">No se encontraron conductores pendientes con ese criterio</p>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mx-auto h-10 w-10 text-green-500 dark:text-green-400 mb-2" />
                              <p className="text-sm text-gray-600 dark:text-gray-400">¡Todos los conductores están liquidados!</p>
                            </>
                          )}
                        </div>
                      ) : (
                        conductoresPendientesFiltrados.map((conductor) => (
                          <div
                            key={conductor.driver_id}
                            className={cn(
                              "p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-orange-200 dark:border-orange-800 hover:border-orange-300 dark:hover:border-orange-700 transition-all shadow-sm hover:shadow-md"
                            )}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1">
                                {conductor.avatar_url ? (
                                  <img
                                    src={conductor.avatar_url}
                                    alt={conductor.driver_id}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-orange-200 dark:border-orange-700 flex-shrink-0"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                      e.currentTarget.nextElementSibling?.classList.remove('hidden')
                                    }}
                                  />
                                ) : null}
                                <div className={`w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center flex-shrink-0 ${conductor.avatar_url ? 'hidden' : ''}`}>
                                  <User className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                                    {conductor.nombre || conductor.driver_id}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">
                                    {conductor.telefono || conductor.driver_id}
                                  </p>
                                  <div className="flex items-center gap-3 mt-2">
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors"
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        setConductorParaTurnos(conductor)
                                        setShowModalTurnos(true)
                                      }}
                                    >
                                      {conductor.cantidad_turnos} turno{conductor.cantidad_turnos !== 1 ? 's' : ''}
                                    </Badge>
                                    <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                                      {formatBalance(conductor.monto_total_pagado)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleAbrirModalCierre(conductor)
                                }}
                                className="px-4 py-2 rounded-md bg-orange-600 hover:bg-orange-700 text-white font-medium text-sm transition-colors shadow-sm hover:shadow-md flex-shrink-0"
                              >
                                Liquidar
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Sección: Ya Liquidados */}
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
                          <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-green-900 dark:text-green-100">
                            Ya Liquidados
                          </h3>
                          <p className="text-sm text-green-700 dark:text-green-300">
                            {conductoresLiquidadosFiltrados.length} de {conductoresLiquidados.length} conductor{conductoresLiquidados.length !== 1 ? 'es' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          type="text"
                          placeholder="Buscar en liquidados..."
                          value={searchTermLiquidados}
                          onChange={(e) => setSearchTermLiquidados(e.target.value)}
                          className="pl-9 h-9 text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                      {conductoresLiquidadosFiltrados.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                          {searchTermLiquidados ? (
                            <>
                              <AlertCircle className="mx-auto h-10 w-10 text-orange-500 dark:text-orange-400 mb-2" />
                              <p className="text-sm text-gray-600 dark:text-gray-400">No se encontraron conductores liquidados con ese criterio</p>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="mx-auto h-10 w-10 text-orange-500 dark:text-orange-400 mb-2" />
                              <p className="text-sm text-gray-600 dark:text-gray-400">No hay conductores liquidados aún</p>
                            </>
                          )}
                        </div>
                      ) : (
                        conductoresLiquidadosFiltrados.map((conductor) => (
                          <div
                            key={conductor.driver_id}
                            className={cn(
                              "p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-700 transition-all shadow-sm hover:shadow-md"
                            )}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1">
                                {conductor.avatar_url ? (
                                  <img
                                    src={conductor.avatar_url}
                                    alt={conductor.driver_id}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-green-200 dark:border-green-700 flex-shrink-0"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                      e.currentTarget.nextElementSibling?.classList.remove('hidden')
                                    }}
                                  />
                                ) : null}
                                <div className={`w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0 ${conductor.avatar_url ? 'hidden' : ''}`}>
                                  <User className="w-6 h-6 text-green-600 dark:text-green-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                                      {conductor.nombre || conductor.driver_id}
                                    </p>
                                    <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">
                                    {conductor.telefono || conductor.driver_id}
                                  </p>
                                  <div className="flex items-center gap-3 mt-2">
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        setConductorParaTurnos(conductor)
                                        setShowModalTurnos(true)
                                      }}
                                    >
                                      {conductor.cantidad_turnos} turno{conductor.cantidad_turnos !== 1 ? 's' : ''}
                                    </Badge>
                                    <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                      {formatBalance(conductor.monto_total_pagado)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={async () => {
                                  try {
                                    setCargandoCierre(true)
                                    // Crear un DriverItem temporal para compatibilidad
                                    const driverItem: DriverItem = {
                                      driver_id: conductor.driver_id,
                                      full_name: conductor.nombre || conductor.driver_id,
                                      status: 'offline',
                                      balance: 0,
                                      avatar_url: conductor.avatar_url,
                                      photo_url: conductor.avatar_url,
                                      phone: conductor.telefono,
                                    }
                                    setSelectedDriver(driverItem)
                                    setSelectedConductorResumen(conductor)
                                    setFechaInicio(fechaSeleccionada)
                                    setFechaFin(fechaSeleccionada)
                                    
                                    // Obtener el cierre del conductor para la fecha seleccionada
                                    const cierre = await yegoProOpsService.obtenerCierre(conductor.driver_id, fechaSeleccionada)
                                    if (cierre) {
                                      setCierreDetalle(cierre)
                                      inicializarValoresEdicion(cierre)
                                      setEditandoCierre(false)
                                      setShowModalVerCierre(true)
                                    } else {
                                      showError('No se encontró el registro de cierre para este conductor')
                                    }
                                  } catch (error) {
                                    showError('Error al obtener el cierre. Por favor, intenta nuevamente.')
                                  } finally {
                                    setCargandoCierre(false)
                                  }
                                }}
                                className="px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white font-medium text-sm transition-colors shadow-sm hover:shadow-md flex-shrink-0"
                                disabled={cargandoCierre}
                              >
                                {cargandoCierre ? 'Cargando...' : 'Ver detalle'}
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal con resumen de viajes */}
      <Dialog 
        open={showModal} 
        onOpenChange={(open) => {
          setShowModal(open)
          if (!open) {
            setShowDatePicker(false)
            setFechaInicio(obtenerFechaAyer())
            setFechaFin(obtenerFechaAyer())
            setCurrentMonth(new Date())
            setSearchTermViajes('')
          }
        }}
      >
        <DialogContent className="max-w-7xl w-[95vw] max-h-[95vh] overflow-y-auto overflow-x-hidden flex flex-col p-6">
          {selectedDriver && (
            <>
              <DialogHeader className="flex-shrink-0">
                <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                  <span>{selectedDriver.full_name}</span>
                  {firstTripVehicle && (
                    <span className="text-lg font-normal text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <Car className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      {firstTripVehicle}
                    </span>
                  )}
                </DialogTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Resumen de viajes
                </p>
              </DialogHeader>
              
              <div className="relative flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden">
                {/* Filtro de rango de fechas con calendario */}
                <div className="mb-4 relative z-50" ref={datePickerRef}>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      Período:
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowDatePicker(!showDatePicker)}
                      className="w-56 px-4 py-2.5 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center gap-2.5">
                        <Calendar className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <span className={fechaInicio && fechaFin ? 'text-gray-900 dark:text-gray-100 font-semibold' : 'text-gray-500 dark:text-gray-400'}>
                          {formatearRangoFechas()}
                        </span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${showDatePicker ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                
                  {/* Calendario desplegable */}
                  {showDatePicker && (
                    <div 
                      className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-3 z-[9999]"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      {/* Header del calendario */}
                      <div className="flex items-center justify-between mb-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            cambiarMes('anterior')
                          }}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {MESES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                        </h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            cambiarMes('siguiente')
                          }}
                          disabled={esMesFuturo(
                            currentMonth.getFullYear(),
                            currentMonth.getMonth() + 1
                          )}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      </div>
                      
                      {/* Días de la semana */}
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {DIAS_SEMANA.map((dia, index) => (
                          <div key={index} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1">
                            {dia}
                          </div>
                        ))}
                      </div>
                      
                      {/* Días del mes */}
                      <div className="grid grid-cols-7 gap-1">
                        {obtenerDiasDelMes(currentMonth).map((dia, index) => {
                          if (dia === null) {
                            return <div key={index} className="py-1.5"></div>
                          }
                          const esFutura = esFechaFutura(dia)
                          const estaEnRango = esFechaEnRango(dia)
                          const esInicio = esFechaInicio(dia)
                          const esFin = esFechaFin(dia)
                          const tieneTurnoEnFecha = tieneTurno(dia)
                          
                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                seleccionarFecha(dia)
                              }}
                              onMouseDown={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                              }}
                              disabled={esFutura}
                              className={cn(
                                "py-1.5 rounded text-xs font-medium transition-colors relative",
                                esFutura
                                  ? 'opacity-30 cursor-not-allowed text-gray-400 dark:text-gray-600'
                                  : esInicio || esFin
                                  ? 'bg-red-600 text-white font-semibold'
                                  : estaEnRango
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-100'
                                  : tieneTurnoEnFecha
                                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                              )}
                              title={esFutura ? 'No se pueden seleccionar fechas futuras' : tieneTurnoEnFecha ? 'Esta fecha tiene turnos asignados' : ''}
                            >
                              {dia}
                              {tieneTurnoEnFecha && !esInicio && !esFin && !estaEnRango && (
                                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full"></span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Métricas resumen */}
                {loadingViajes ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 dark:border-red-400"></div>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Cargando viajes...</p>
                  </div>
                ) : errorViajes ? (
                  <div className="text-center py-8 text-red-600 dark:text-red-400">
                    <p className="text-sm font-medium">Error al cargar los viajes</p>
                  </div>
                ) : (datosParaMostrar !== undefined && metricas) ? (
                  <>
                    {/* Métricas compactas */}
                    {metricas && (
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
                      <KPICard
                        icon={<TrendingUp className="w-4 h-4" />}
                        label="Viajes"
                        value={metricas.totalViajes.toString()}
                        bgColor="bg-red-50 dark:bg-red-900/20"
                        textColor="text-red-700 dark:text-red-300"
                        borderColor="border-red-200 dark:border-red-800"
                        iconColor="text-red-600 dark:text-red-400"
                      />
                      <KPICard
                        icon={<MapPin className="w-4 h-4" />}
                        label="Distancia"
                        value={`${(metricas.totalDistancia ?? 0).toFixed(1)} km`}
                        bgColor="bg-blue-50 dark:bg-blue-900/20"
                        textColor="text-blue-700 dark:text-blue-300"
                        borderColor="border-blue-200 dark:border-blue-800"
                        iconColor="text-blue-600 dark:text-blue-400"
                      />
                      <KPICard
                        icon={<DollarSign className="w-4 h-4" />}
                        label="Efectivo"
                        value={formatBalance(metricas.totalEfectivo)}
                        bgColor="bg-green-50 dark:bg-green-900/20"
                        textColor="text-green-700 dark:text-green-300"
                        borderColor="border-green-200 dark:border-green-800"
                        iconColor="text-green-600 dark:text-green-400"
                      />
                      <KPICard
                        icon={<CreditCard className="w-4 h-4" />}
                        label="Tarjeta"
                        value={formatBalance(metricas.totalTarjeta)}
                        bgColor="bg-purple-50 dark:bg-purple-900/20"
                        textColor="text-purple-700 dark:text-purple-300"
                        borderColor="border-purple-200 dark:border-purple-800"
                        iconColor="text-purple-600 dark:text-purple-400"
                      />
                      <KPICard
                        icon={<DollarSign className="w-4 h-4" />}
                        label="Bonos y Promo"
                        value={
                          <span className="whitespace-nowrap">
                            <span>{formatBalance(metricas.totalBonos)}</span>
                            <span className="mx-2 text-gray-400">|</span>
                            <span>{formatBalance(metricas.totalPromocion)}</span>
                          </span>
                        }
                        bgColor="bg-green-50 dark:bg-green-900/20"
                        textColor="text-green-700 dark:text-green-300"
                        borderColor="border-green-200 dark:border-green-800"
                        iconColor="text-green-600 dark:text-green-400"
                      />
                      <KPICard
                        icon={<DollarSign className="w-4 h-4" />}
                        label="Total"
                        value={formatBalance(metricas.totalIngresos)}
                        bgColor="bg-red-100 dark:bg-red-900/30"
                        textColor="text-red-700 dark:text-red-300"
                        borderColor="border-red-600 dark:border-red-500"
                        iconColor="text-red-600 dark:text-red-400"
                        isHighlighted
                      />
                    </div>
                    )}

                    {/* Promedio por viaje */}
                    {metricas && (
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 bg-gray-100 dark:bg-gray-800/50 px-3 py-2 rounded-md inline-block flex-shrink-0">
                      Promedio por viaje: <span className="text-red-600 dark:text-red-400">{formatBalance(metricas.promedioPorViaje)}</span>
                    </div>
                    )}

                    {/* Tabla de viajes - Solo mostrar si hay viajes */}
                    {viajesArray.length > 0 && (
                    <div className="mt-4 flex-1 flex flex-col min-h-0">
                      <div className="flex items-center gap-4 mb-3 border-b border-gray-200 dark:border-gray-700 pb-2 flex-shrink-0">
                        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                          Detalle de Viajes
                        </h3>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <Input
                            type="text"
                            placeholder="Buscar por ID..."
                            value={searchTermViajes}
                            onChange={(e) => {
                              setSearchTermViajes(e.target.value)
                              paginationViajes.setCurrentPage(1)
                            }}
                            className="pl-9 h-8 text-sm w-48"
                          />
                        </div>
                        <div className="flex items-center gap-2 ml-auto">
                          <Button
                            variant={vistaTabla ? "outline" : "ghost"}
                            size="sm"
                            onClick={() => setVistaTabla(true)}
                            className="h-8 w-8 p-0"
                            title="Vista de tabla"
                          >
                            <Table2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant={!vistaTabla ? "outline" : "ghost"}
                            size="sm"
                            onClick={() => setVistaTabla(false)}
                            className="h-8 w-8 p-0"
                            title="Vista de cards"
                          >
                            <LayoutGrid className="h-4 w-4" />
                          </Button>
                          {esUnSoloDia && !cierreRegistrado && (
                            <Button
                              onClick={() => handleAbrirModalCierre()}
                              className="bg-red-600 text-white"
                            >
                              Registrar Cierre
                            </Button>
                          )}
                          {esUnSoloDia && cierreRegistrado && (
                            <Button
                              onClick={handleVerCierre}
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title="Ver detalles del cierre"
                              disabled={cargandoCierre}
                            >
                              {cargandoCierre ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                      {paginationViajes.paginatedItems.length > 0 ? (
                        <>
                          {vistaTabla ? (
                            <div className="overflow-x-auto overflow-y-auto max-h-[calc(95vh-400px)] mb-4">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-16">ID</TableHead>
                                    <TableHead>Inicio</TableHead>
                                    <TableHead>Fin</TableHead>
                                    <TableHead className="min-w-[500px]">Dirección</TableHead>
                                    <TableHead className="text-right">Distancia</TableHead>
                                    <TableHead className="text-right">Efectivo</TableHead>
                                    <TableHead className="text-right">Tarjeta</TableHead>
                                  <TableHead className="text-right">Com. Servicio</TableHead>
                                  <TableHead className="text-right">Com. Empresa</TableHead>
                                  <TableHead className="text-right">Otros Pagos</TableHead>
                                  <TableHead className="text-right">Promoción</TableHead>
                                  <TableHead className="text-right">Bonos</TableHead>
                                  <TableHead className="text-right">Total</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {paginationViajes.paginatedItems.map((viaje) => (
                                    <TableRow key={viaje.id}>
                                      <TableCell>
                                        <Badge variant="outline" className="text-xs">
                                          #{viaje.short_id}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                          {formatDateTime(viaje.booked_at)}
                                        </span>
                                      </TableCell>
                                      <TableCell>
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                          {formatDateTime(viaje.ended_at)}
                                        </span>
                                      </TableCell>
                                      <TableCell className="min-w-[500px]">
                                        <span className="text-xs text-gray-700 dark:text-gray-300 whitespace-normal break-words">
                                          {viaje.address_from || ''} {viaje.address_from && viaje.address_to && '→'} {viaje.address_to && <><br />{viaje.address_to}</>}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                          {(viaje.distance ?? 0).toFixed(2)} km
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                                          {formatNumber(viaje.cash ?? 0)}
                                        </span>
                                      </TableCell>
                                    <TableCell className="text-right">
                                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                                        {formatNumber(viaje.card ?? 0)}
                                      </span>
                                    </TableCell>
                                      <TableCell className="text-right">
                                        <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                                          {formatNumber(viaje.price_commission_service ?? 0)}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                                          {formatNumber(viaje.price_commission_park ?? 0)}
                                        </span>
                                      </TableCell>
                                    <TableCell className="text-right">
                                      <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                                        {formatNumber(viaje.price_other ?? 0)}
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                                        {formatNumber(viaje.price_promotion ?? 0)}
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                                        {formatNumber(viaje.price_bonus ?? 0)}
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                        {formatNumber(viaje.price ?? 0)}
                                      </span>
                                    </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          ) : (
                            <div className="flex-1 overflow-y-auto min-h-0">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                              {paginationViajes.paginatedItems.map((viaje) => (
                                <Card key={viaje.id} className="border border-gray-200 dark:border-gray-700">
                                  <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                                      <Badge variant="outline" className="text-xs">
                                        #{viaje.short_id}
                                      </Badge>
                                      <div className="text-right">
                                        <span className="text-xs text-gray-500 dark:text-gray-400 block">Total</span>
                                        <span className="text-lg font-bold text-green-600 dark:text-green-400">
                                          {formatNumber(viaje.price ?? 0)}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    <div className="space-y-2 text-xs">
                                      <div className="flex justify-between">
                                        <span className="text-gray-500 dark:text-gray-400">Inicio:</span>
                                        <span className="text-gray-700 dark:text-gray-300 font-medium">
                                          {formatDateTime(viaje.booked_at)}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-500 dark:text-gray-400">Fin:</span>
                                        <span className="text-gray-700 dark:text-gray-300 font-medium">
                                          {formatDateTime(viaje.ended_at)}
                                        </span>
                                      </div>
                                      {(viaje.address_from || viaje.address_to) && (
                                        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                          <span className="text-gray-500 dark:text-gray-400 text-[10px] block mb-1.5">Dirección:</span>
                                          <span className="text-gray-700 dark:text-gray-300 text-xs whitespace-normal break-words">
                                            {viaje.address_from || ''} {viaje.address_from && viaje.address_to && '→'} {viaje.address_to && <><br />{viaje.address_to}</>}
                                          </span>
                                        </div>
                                      )}
                                      <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                                        <span className="text-gray-500 dark:text-gray-400">Distancia:</span>
                                        <span className="text-blue-600 dark:text-blue-400 font-semibold">
                                          {(viaje.distance ?? 0).toFixed(2)} km
                                        </span>
                                      </div>
                                      
                                      <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700 space-y-1.5">
                                        <div className="flex justify-between">
                                          <span className="text-gray-500 dark:text-gray-400">Efectivo:</span>
                                          <span className="text-green-600 dark:text-green-400 font-semibold">
                                            {formatNumber(viaje.cash ?? 0)}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-500 dark:text-gray-400">Tarjeta:</span>
                                          <span className="text-green-600 dark:text-green-400 font-semibold">
                                            {formatNumber(viaje.card ?? 0)}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-500 dark:text-gray-400">Bonos:</span>
                                          <span className="text-green-600 dark:text-green-400 font-semibold">
                                            {formatNumber(viaje.price_bonus ?? 0)}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-500 dark:text-gray-400">Promo:</span>
                                          <span className="text-green-600 dark:text-green-400 font-semibold">
                                            {formatNumber(viaje.price_promotion ?? 0)}
                                          </span>
                                        </div>
                                        {(viaje.price_other ?? 0) !== 0 && (
                                          <div className="flex justify-between">
                                            <span className="text-gray-500 dark:text-gray-400">Otros Pagos:</span>
                                            <span className="text-red-600 dark:text-red-400 font-semibold">
                                              {formatNumber(viaje.price_other ?? 0)}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                              </div>
                            </div>
                          )}
                          
                          {viajesArray.length > 0 && (
                            <div className="flex-shrink-0">
                              <Paginacion
                                currentPage={paginationViajes.currentPage}
                                totalPages={paginationViajes.totalPages}
                                itemsPerPage={itemsPerPage}
                                totalItems={filteredViajes.length}
                                startIndex={paginationViajes.startIndex}
                                endIndex={paginationViajes.endIndex}
                                onPageChange={paginationViajes.setCurrentPage}
                                onItemsPerPageChange={handleItemsPerPageChangeViajes}
                              />
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400 flex-shrink-0">
                          <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No hay viajes registrados para el período seleccionado</p>
                        </div>
                      )}
                    </div>
                    )}
                  </>
                ) : (!fechaInicio || !fechaFin) ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400 flex-shrink-0">
                    <p>Selecciona un rango de fechas para ver los viajes</p>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400 flex-shrink-0">
                    <p>No hay viajes registrados para el período seleccionado</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Registro de Cierre */}
      <Dialog open={showModalCierre} onOpenChange={setShowModalCierre}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1.5">
              Registrar Cierre de Día
            </DialogTitle>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <User className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">Conductor:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{selectedDriver?.full_name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">Fecha:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {fechaInicio ? formatearFechaConDia(fechaInicio) : 'No seleccionada'}
                </span>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-2.5 mt-2.5 overflow-y-auto flex-1 pr-1">
            {/* Sección de Combustible */}
            <div className={SECTION_CARD_CLASS}>
              <h3 className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-2 pb-1 border-b border-gray-200 dark:border-gray-700 flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Combustible
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {/* GNV Combustible M3 - Opcional */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    GNV Combustible (M³)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={gnvM3}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === '' || parseFloat(value) >= 0) {
                        setGnvM3(value)
                      }
                    }}
                    placeholder="0.00"
                    className="w-full h-8 text-xs"
                  />
                </div>

                {/* GNV Combustible en Soles - Obligatorio */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    GNV Combustible (S/.) <span className="text-red-600">*</span>
                  </label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={gnvSoles}
                    onChange={(e) => {
                      const value = validarNumeroPositivo(e.target.value)
                        setGnvSoles(value)
                    }}
                    placeholder="0.00"
                    className="w-full h-8 text-xs"
                    required
                  />
                </div>

                {/* Gasolina Combustible Galones - Opcional */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Gasolina Combustible (Galones)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={gasolinaGalones}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === '' || parseFloat(value) >= 0) {
                        setGasolinaGalones(value)
                      }
                    }}
                    placeholder="0.00"
                    className="w-full h-8 text-xs"
                  />
                </div>

                {/* Gasolina Combustible en Soles - Opcional */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Gasolina Combustible (S/.) <span className="text-gray-500 text-xs font-normal">(Opcional)</span>
                  </label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={gasolinaSoles}
                    onChange={(e) => {
                      const value = validarNumeroPositivo(e.target.value)
                        setGasolinaSoles(value)
                    }}
                    placeholder="0.00"
                    className="w-full h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Sección de Liquidación */}
            <div className={SECTION_CARD_CLASS}>
              <h3 className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-2 pb-1 border-b border-gray-200 dark:border-gray-700 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                Liquidación
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {/* Cuanto liquida en Efectivo - Obligatorio */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cuanto Liquida en Efectivo (S/.) <span className="text-red-600">*</span>
                  </label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={liquidaEfectivo}
                    onChange={(e) => {
                      const value = validarNumeroPositivo(e.target.value)
                        setLiquidaEfectivo(value)
                    }}
                    placeholder="0.00"
                    className="w-full h-8 text-xs"
                    required
                  />
                </div>

                {/* Cuanto liquida en Yape - Obligatorio */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cuanto Liquida en Yape (S/.) <span className="text-red-600">*</span>
                  </label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={liquidaYape}
                    onChange={(e) => {
                      const value = validarNumeroPositivo(e.target.value)
                        setLiquidaYape(value)
                    }}
                    placeholder="0.00"
                    className="w-full h-8 text-xs"
                    required
                  />
                </div>

                {/* Otros Gastos - Opcional */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Otros Gastos (S/.) <span className="text-gray-500 text-xs font-normal">(Opcional)</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={otrosGastos}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === '' || parseFloat(value) >= 0) {
                        setOtrosGastos(value)
                      }
                    }}
                    placeholder="0.00"
                    className="w-full h-8 text-xs"
                  />
                  {otrosGastos && parseNumber(otrosGastos) > 0 && (
                    <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Descripción del gasto <span className="text-red-600">*</span>
                      </label>
                      <Input
                        type="text"
                        value={otrosGastosDescripcion}
                        onChange={(e) => setOtrosGastosDescripcion(e.target.value)}
                        placeholder="Ej: Mantenimiento, Reparación, etc."
                        className="w-full h-8 text-xs bg-white dark:bg-gray-800"
                        required
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cálculo dinámico intuitivo - Siempre visible */}
            {valoresCierre ? (
              <div className={SECTION_CARD_CLASS}>
                <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-1.5 pb-1 border-b border-gray-200 dark:border-gray-700">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Resumen de Cálculo
                </h4>
                <div className="space-y-1.5">
                  {/* Monto Total a Pagar */}
                  <div className="flex justify-between items-center py-1.5 px-2.5 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-300 dark:border-blue-700">
                    <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">Monto Total a Pagar:</span>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      {formatBalance(valoresCierre.montoTotalPagar)}
                    </span>
                  </div>

                  {/* Gastos */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Gastos Combustible:</span>
                      <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                        {formatBalance(valoresCierre.totalGastosCombustible)}
                      </span>
                    </div>
                    {valoresCierre.totalOtrosGastos > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600 dark:text-gray-400">Otros Gastos:</span>
                        <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                          {formatBalance(valoresCierre.totalOtrosGastos)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-1 border-t border-gray-300 dark:border-gray-600">
                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">Total Gastos:</span>
                      <span className="text-xs font-bold text-red-600 dark:text-red-400">
                        {formatBalance(valoresCierre.totalGastos)}
                      </span>
                    </div>
                  </div>

                  {/* Monto que debe liquidarse (después de restar gastos) */}
                  <div className={`py-1 px-2 rounded border ${
                    valoresCierre.montoRestante >= 0 
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' 
                      : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                        {valoresCierre.montoRestante >= 0 ? 'Monto que Debe Liquidarse:' : 'Los gastos exceden el monto a pagar:'}
                      </span>
                      <span className={`text-xs font-bold ${
                        valoresCierre.montoRestante >= 0 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {formatBalance(Math.abs(valoresCierre.montoRestante))}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                      (Monto Total - Total Gastos)
                    </div>
                  </div>

                  {/* Liquidación */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Liquida en Efectivo:</span>
                      <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                        {formatBalance(parseNumber(liquidaEfectivo))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Liquida en Yape:</span>
                      <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                        {formatBalance(parseNumber(liquidaYape))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-gray-300 dark:border-gray-600">
                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">Total Liquidado:</span>
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                        {formatBalance(valoresCierre.totalLiquidacion)}
                      </span>
                    </div>
                  </div>

                  {/* Diferencia Final - Estado */}
                  {valoresCierre.totalLiquidacion > 0 && (
                    <div className={`flex justify-between items-center py-1 px-2 rounded border ${
                      valoresCierre.calza 
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' 
                        : valoresCierre.diferencia > 0
                        ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                    }`}>
                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                        {valoresCierre.calza 
                          ? 'Calza Correctamente' 
                          : valoresCierre.diferencia > 0
                          ? 'Falta Liquidar:'
                          : 'Excede la Liquidación:'
                        }
                      </span>
                      <span className={`text-xs font-bold ${
                        valoresCierre.calza 
                          ? 'text-green-600 dark:text-green-400' 
                          : valoresCierre.diferencia > 0
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {valoresCierre.calza ? 'S/. 0.00' : formatBalance(Math.abs(valoresCierre.diferencia))}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={SECTION_CARD_CLASS}>
                <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                  {selectedConductorResumen?.monto_total_pagado 
                    ? 'Ingrese los datos para ver el cálculo' 
                    : 'No hay monto disponible para calcular'}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => setShowModalCierre(false)}
              disabled={registrandoCierre}
              className="px-6"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRegistrarCierre}
              disabled={registrandoCierre || !gnvSoles || !liquidaEfectivo || !liquidaYape}
              className="bg-red-600 text-white px-6"
            >
              {registrandoCierre ? 'Registrando...' : 'Registrar Cierre'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Ver Cierre */}
      <Dialog open={showModalVerCierre} onOpenChange={setShowModalVerCierre}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Detalles del Cierre de Día
            </DialogTitle>
            <div className="mt-3 flex items-start gap-6">
              <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Conductor:
              </p>
                <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-1">
                  {selectedDriver?.full_name || 'Conductor no disponible'}
                </p>
              </div>
              {cierreDetalle && (
                <>
                  <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Fecha:
                    </p>
                    <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-1">
                      {formatearFechaConDia(cierreDetalle.fecha)}
                </p>
                  </div>
                  {cierreDetalle.tiposTurno && cierreDetalle.tiposTurno.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {cierreDetalle.tiposTurno.map((tipo, index) => (
                        <Badge 
                          key={index}
                          variant="outline"
                          className="capitalize bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                        >
                          {tipo}
                        </Badge>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1">
          {cargandoCierre ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 dark:border-red-400"></div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Cargando detalles del cierre...</p>
            </div>
          ) : cierreDetalle ? (
            <div className="space-y-4 mt-4">
              {/* Sección de Combustible */}
              <div className={SECTION_CARD_CLASS}>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 pb-1.5 border-b border-gray-200 dark:border-gray-700">
                  Combustible
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      GNV Combustible (M³)
                    </label>
                    {editandoCierre ? (
                      <Input
                        type="text"
                        value={editGnvM3}
                        onChange={(e) => setEditGnvM3(e.target.value)}
                        placeholder="0.00"
                        className="w-full h-9 text-sm"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {cierreDetalle.gnvM3 || '-'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      GNV Combustible (S/.) <span className="text-red-600">*</span>
                    </label>
                    {editandoCierre ? (
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={editGnvSoles}
                        onChange={(e) => {
                          const value = validarNumeroPositivo(e.target.value)
                            setEditGnvSoles(value)
                        }}
                        placeholder="0.00"
                        className="w-full h-9 text-sm"
                        required
                      />
                    ) : (
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {formatBalance(cierreDetalle.gnvSoles)}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Gasolina Combustible (Galones)
                    </label>
                    {editandoCierre ? (
                      <Input
                        type="text"
                        value={editGasolinaGalones}
                        onChange={(e) => setEditGasolinaGalones(e.target.value)}
                        placeholder="0.00"
                        className="w-full h-9 text-sm"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {cierreDetalle.gasolinaGalones || '-'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Gasolina Combustible (S/.) <span className="text-gray-500 text-xs font-normal">(Opcional)</span>
                    </label>
                    {editandoCierre ? (
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={editGasolinaSoles}
                        onChange={(e) => {
                          const value = validarNumeroPositivo(e.target.value)
                            setEditGasolinaSoles(value)
                        }}
                        placeholder="0.00"
                        className="w-full h-9 text-sm"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {formatBalance(cierreDetalle.gasolinaSoles)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Sección de Liquidación */}
              <div className={SECTION_CARD_CLASS}>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 pb-1.5 border-b border-gray-200 dark:border-gray-700">
                  Liquidación
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Liquida en Efectivo (S/.) <span className="text-red-600">*</span>
                    </label>
                    {editandoCierre ? (
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={editLiquidaEfectivo}
                        onChange={(e) => {
                          const value = validarNumeroPositivo(e.target.value)
                            setEditLiquidaEfectivo(value)
                        }}
                        placeholder="0.00"
                        className="w-full h-9 text-sm"
                        required
                      />
                    ) : (
                      <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                        {formatBalance(cierreDetalle.liquidaEfectivo)}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Liquida en Yape (S/.) <span className="text-red-600">*</span>
                    </label>
                    {editandoCierre ? (
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={editLiquidaYape}
                        onChange={(e) => {
                          const value = validarNumeroPositivo(e.target.value)
                            setEditLiquidaYape(value)
                        }}
                        placeholder="0.00"
                        className="w-full h-9 text-sm"
                        required
                      />
                    ) : (
                      <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                        {formatBalance(cierreDetalle.liquidaYape)}
                      </p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Otros Gastos (S/.) <span className="text-gray-400 text-xs">(Opcional)</span>
                    </label>
                    {editandoCierre ? (
                      <>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editOtrosGastos}
                          onChange={(e) => {
                            const value = e.target.value
                            if (value === '' || parseFloat(value) >= 0) {
                              setEditOtrosGastos(value)
                            }
                          }}
                          placeholder="0.00"
                          className="w-full h-9 text-sm"
                        />
                        {editOtrosGastos && parseNumber(editOtrosGastos) > 0 && (
                          <div className="mt-2">
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                              Descripción del Gasto <span className="text-red-600">*</span>
                            </label>
                            <Input
                              type="text"
                              value={editOtrosGastosDescripcion}
                              onChange={(e) => setEditOtrosGastosDescripcion(e.target.value)}
                              placeholder="Ej: Mantenimiento, Reparación, etc."
                              className="w-full h-9 text-sm"
                              required
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {cierreDetalle.otrosGastos > 0 ? (
                          <>
                            <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                              {formatBalance(cierreDetalle.otrosGastos)}
                            </p>
                            {cierreDetalle.otrosGastosDescripcion && (
                              <div className="mt-2">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                  Descripción del Gasto
                                </label>
                                <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                                  {cierreDetalle.otrosGastosDescripcion}
                                </p>
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400">-</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Resumen */}
              <div className={SECTION_CARD_CLASS}>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Resumen</h4>
                {(() => {
                  if (editandoCierre && valoresCierreEdicion) {
                    const montoBase = selectedConductorResumen?.monto_total_pagado ?? cierreDetalle.totalIngresos
                    const valoresCalculados = valoresCierreEdicion

                    return (
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center py-1.5 px-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">Monto Total a Pagar:</span>
                          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                            {formatBalance(montoBase)}
                          </span>
                        </div>
                        <div className="space-y-1.5 pl-2 border-l-2 border-red-200 dark:border-red-800">
                          <div className="flex justify-between items-center py-1">
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Gastos Combustible:</span>
                            <span className="text-sm font-bold text-red-600 dark:text-red-400">
                              {formatBalance(valoresCalculados.totalGastosCombustible)}
                            </span>
                          </div>
                          {valoresCalculados.totalOtrosGastos > 0 && (
                            <div className="flex justify-between items-center py-1">
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Otros Gastos:</span>
                              <span className="text-sm font-bold text-red-600 dark:text-red-400">
                                {formatBalance(valoresCalculados.totalOtrosGastos)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between items-center py-1 border-t border-red-200 dark:border-red-800 pt-1.5">
                            <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">Total Gastos:</span>
                            <span className="text-sm font-bold text-red-600 dark:text-red-400">
                              {formatBalance(valoresCalculados.totalGastos)}
                            </span>
                          </div>
                        </div>
                        <div className={`flex justify-between items-center py-1.5 px-2 rounded-lg border-2 ${
                          valoresCalculados.montoRestante >= 0 
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        }`}>
                          <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                            {valoresCalculados.montoRestante >= 0 ? 'Monto Restante:' : '⚠️ Exceso de Gastos:'}
                          </span>
                          <span className={`text-sm font-bold ${
                            valoresCalculados.montoRestante >= 0 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {formatBalance(Math.abs(valoresCalculados.montoRestante))}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-t border-blue-200 dark:border-blue-800">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Total Liquidación:</span>
                          <span className={`text-sm font-bold ${valoresCalculados.calza ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                            {formatBalance(valoresCalculados.totalLiquidacion)}
                          </span>
                        </div>
                        {valoresCalculados.totalLiquidacion > 0 && (
                          <div className={`flex justify-between items-center py-1.5 px-2 rounded-lg border-2 ${
                            valoresCalculados.calza 
                              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                              : valoresCalculados.diferencia > 0
                              ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                          }`}>
                            <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                              {valoresCalculados.calza 
                                ? '✅ Diferencia:' 
                                : valoresCalculados.diferencia > 0
                                ? '⚠️ Falta Liquidar:'
                                : '❌ Exceso de Liquidación:'
                              }
                            </span>
                            <span className={`text-sm font-bold ${
                              valoresCalculados.calza 
                                ? 'text-green-600 dark:text-green-400' 
                                : valoresCalculados.diferencia > 0
                                ? 'text-orange-600 dark:text-orange-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {formatBalance(Math.abs(valoresCalculados.diferencia))}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  }

                  return (
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center py-1">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Total Ingresos:</span>
                        <span className="text-sm font-bold text-green-600 dark:text-green-400">
                          {formatBalance(cierreDetalle.totalIngresos)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Total Gastos:</span>
                        <span className="text-sm font-bold text-red-600 dark:text-red-400">
                          {formatBalance(cierreDetalle.totalGastos)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-t border-blue-200 dark:border-blue-800">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Resta (Liquidez Final):</span>
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          {formatBalance(cierreDetalle.resta)}
                        </span>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Información del registro */}
              <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-3 rounded border border-gray-200 dark:border-gray-700">
                <p>Registrado el {new Date(cierreDetalle.createdAt).toLocaleString('es-PE')} por {cierreDetalle.userName}</p>
                {cierreDetalle.updatedAt !== cierreDetalle.createdAt && (
                  <p className="mt-1">
                    Última actualización: {new Date(cierreDetalle.updatedAt).toLocaleString('es-PE')}
                    {cierreDetalle.userNameModificado && (
                      <span> por {cierreDetalle.userNameModificado}</span>
                    )}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No se encontró el registro de cierre</p>
            </div>
          )}
          </div>

          <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            {puedeEditar && !editandoCierre && (
              <Button
                variant="outline"
                onClick={handleIniciarEdicion}
                className="flex items-center gap-2"
              >
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
            )}
            <div className="flex justify-end gap-3 ml-auto">
              {editandoCierre ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleCancelarEdicion}
                    disabled={actualizandoCierre}
                    className="px-6 flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleActualizarCierre}
                    disabled={actualizandoCierre}
                    className="bg-red-600 text-white px-6 flex items-center gap-2"
                  >
                    {actualizandoCierre ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Actualizando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Guardar
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowModalVerCierre(false)
                    setEditandoCierre(false)
                  }}
                  className="px-6"
                >
                  Cerrar
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Turnos del Conductor */}
      <Dialog open={showModalTurnos} onOpenChange={setShowModalTurnos}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Turnos del Conductor
            </DialogTitle>
            {conductorParaTurnos && (
              <div className="flex items-center justify-between gap-3 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  {conductorParaTurnos.avatar_url && (
                    <img 
                      src={conductorParaTurnos.avatar_url} 
                      alt={conductorParaTurnos.nombre || conductorParaTurnos.driver_id}
                      className="w-14 h-14 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                    />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {conductorParaTurnos.nombre || conductorParaTurnos.driver_id}
                    </p>
                    {conductorParaTurnos.telefono && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {conductorParaTurnos.telefono}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total a Pagar</p>
                  <p className="text-base font-bold text-blue-600 dark:text-blue-400">
                    {formatBalance(conductorParaTurnos.monto_total_pagado)}
                  </p>
                </div>
              </div>
            )}
          </DialogHeader>

          <div className="mt-2 space-y-2">
            {conductorParaTurnos?.turnos && conductorParaTurnos.turnos.length > 0 ? (
              conductorParaTurnos.turnos.map((turno, index) => {
                const fechaInicio = new Date(turno.hora_inicio)
                const fechaFin = turno.hora_fin ? new Date(turno.hora_fin) : null
                const duracionHoras = Math.floor(turno.duracion_minutos / 60)
                const duracionMinutos = turno.duracion_minutos % 60

                return (
                  <Card key={turno.id || index} className="border hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className={`text-xs flex items-center gap-1 ${
                                turno.tipo_turno === 'diurno' 
                                  ? 'border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300' 
                                  : 'border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                              }`}
                            >
                              {turno.tipo_turno === 'diurno' ? (
                                <Sunrise className="w-3 h-3" />
                              ) : (
                                <Moon className="w-3 h-3" />
                              )}
                              <span className="capitalize">{turno.tipo_turno}</span>
                            </Badge>
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              ID: {turno.id}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3 h-3 text-gray-400" />
                              <span className="text-gray-500 dark:text-gray-400">Fecha:</span>
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                {formatearFechaLegible(turno.fecha)}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-gray-400" />
                              <span className="text-gray-500 dark:text-gray-400">Duración:</span>
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                {duracionHoras > 0 && `${duracionHoras}h `}
                                {duracionMinutos > 0 && `${duracionMinutos}min`}
                                {turno.duracion_minutos === 0 && '0min'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-gray-400" />
                              <span className="text-gray-500 dark:text-gray-400">Inicio:</span>
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                {fechaInicio.toLocaleTimeString('es-PE', { 
                                  hour: '2-digit', 
                                  minute: '2-digit',
                                  hour12: false 
                                })}
                              </span>
                            </div>

                            {fechaFin && (
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-gray-400" />
                                <span className="text-gray-500 dark:text-gray-400">Fin:</span>
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  {fechaFin.toLocaleTimeString('es-PE', { 
                                    hour: '2-digit', 
                                    minute: '2-digit',
                                    hour12: false 
                                  })}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right min-w-[100px]">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Monto</p>
                          <p className="text-base font-bold text-green-600 dark:text-green-400">
                            {formatBalance(turno.monto_total)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            ) : (
              <div className="text-center py-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <AlertCircle className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-xs text-gray-600 dark:text-gray-400">No hay turnos registrados</p>
              </div>
            )}
          </div>

          <div className="flex justify-end mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            <Button
              onClick={() => setShowModalTurnos(false)}
              variant="outline"
              className="px-4 h-8 text-xs"
            >
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Container de notificaciones toast */}
      <NotificationContainer 
        notifications={notifications}
        onRemove={removeNotification}
      />

    </div>
  )
}
