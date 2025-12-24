import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { yegoProOpsService, type DriverItem, type ViajesCompletosResponse, type RegistroCierre, type DriversResponse, type ContractorDriver, type WorkRulesResponse } from '../../../../services/yego-pro-ops-service'
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
import { User, Search, DollarSign, CreditCard, MapPin, TrendingUp, Calendar, ChevronLeft, ChevronRight, ChevronDown, Car, ChevronsLeft, ChevronsRight, Table2, LayoutGrid, Eye, Pencil, Save, X } from 'lucide-react'
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

const getDriverCode = (item: DriverItem): string => {
  if (item.phone) return item.phone
  if (item.car_number) return item.car_number
  if (item.code) return item.code
  return item.driver_id.substring(0, 3).toUpperCase() + item.driver_id.substring(item.driver_id.length - 3)
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

const parseNumber = (value: string | undefined | null, defaultValue = 0): number => {
  if (!value || value.trim() === '') return defaultValue
  const parsed = parseFloat(value)
  return isNaN(parsed) ? defaultValue : parsed
}

const calcularValoresCierre = (
  totalIngresos: number,
  gnvSoles: string,
  gasolinaSoles: string,
  otrosGastos: string,
  liquidaEfectivo: string,
  liquidaYape: string
) => {
  const totalGastosCombustible = parseNumber(gnvSoles) + parseNumber(gasolinaSoles)
  const totalOtrosGastos = parseNumber(otrosGastos)
  const liquidezFinal = totalIngresos - totalGastosCombustible - totalOtrosGastos
  const totalLiquidacion = parseNumber(liquidaEfectivo) + parseNumber(liquidaYape)
  const calza = Math.abs(liquidezFinal - totalLiquidacion) < 0.01

  return {
    totalGastosCombustible,
    totalOtrosGastos,
    liquidezFinal,
    totalLiquidacion,
    calza
  }
}

// Tipos
interface DetalleViewProps {
}

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

const KPICard: React.FC<KPICardProps> = ({
  icon,
  label,
  value,
  bgColor,
  textColor,
  borderColor,
  iconColor,
  isHighlighted = false
}) => {
  const borderClass = isHighlighted ? 'border-2 shadow-md' : 'border'
  return (
    <div className={`${bgColor} rounded-lg p-3 ${borderClass} ${borderColor}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <div className={iconColor}>{icon}</div>
        <p className={`text-xs font-medium ${textColor}`}>{label}</p>
      </div>
      <div className={`text-lg font-bold ${textColor}`}>
        {typeof value === 'string' ? value : value}
      </div>
    </div>
  )
}

// Componente de Paginación
const Paginacion: React.FC<PaginacionProps> = ({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  startIndex,
  endIndex,
  onPageChange,
  onItemsPerPageChange
}) => {
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

export const DetalleView: React.FC<DetalleViewProps> = () => {
  const { user } = useAuth()
  const { showSuccess, showError, showWarning, notifications, removeNotification } = useToastNotifications()
  const [searchTerm, setSearchTerm] = useState('')
  const [searchTermViajes, setSearchTermViajes] = useState('')
  const [tipoConductorFilter, setTipoConductorFilter] = useState<string | null>(null)
  const [selectedDriver, setSelectedDriver] = useState<DriverItem | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [vistaTabla, setVistaTabla] = useState(true)
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE)
  const [itemsPerPageDrivers, setItemsPerPageDrivers] = useState(DEFAULT_ITEMS_PER_PAGE)
  const [showModalCierre, setShowModalCierre] = useState(false)
  const [showModalVerCierre, setShowModalVerCierre] = useState(false)
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

  useEffect(() => {
    if (!showDatePicker) return
    
    const manejarClicExterno = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false)
      }
    }

    document.addEventListener('mousedown', manejarClicExterno)
    return () => document.removeEventListener('mousedown', manejarClicExterno)
  }, [showDatePicker])

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
    
    // Si ya hay un rango completo, resetear y empezar de nuevo
    if (fechaInicio && fechaFin) {
      setFechaInicio(fechaStr)
      setFechaFin('')
      return
    }
    
    // Si no hay fechaInicio, establecerla
    if (!fechaInicio) {
      setFechaInicio(fechaStr)
      return
    }
    
    // Si hay fechaInicio pero no fechaFin
    if (fechaStr < fechaInicio) {
      // Si la nueva fecha es menor, resetear y establecer como inicio
      setFechaInicio(fechaStr)
      setFechaFin('')
    } else {
      setFechaFin(fechaStr)
      setShowDatePicker(false)
    }
  }

  const formatearRangoFechas = () => {
    if (!fechaInicio && !fechaFin) return 'Seleccionar rango de fechas'
    if (!fechaFin) {
      const [, month, day] = fechaInicio.split('-').map(Number)
      return `${day} de ${MESES[month - 1].toLowerCase()}`
    }
    const [, monthInicio, dayInicio] = fechaInicio.split('-').map(Number)
    const [, monthFin, dayFin] = fechaFin.split('-').map(Number)
    if (monthInicio === monthFin) {
      return `${dayInicio}-${dayFin} de ${MESES[monthInicio - 1].toLowerCase()}`
    }
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

  // Queries
  const { data: driversData, isLoading: loadingDrivers } = useQuery<DriversResponse>({
    queryKey: ['yego-pro-ops-drivers', tipoConductorFilter],
    queryFn: () => yegoProOpsService.obtenerDrivers(tipoConductorFilter || undefined),
    refetchInterval: 30000,
  })

  const { data: workRulesData } = useQuery<WorkRulesResponse>({
    queryKey: ['yego-pro-ops-work-rules'],
    queryFn: () => yegoProOpsService.obtenerReglasTrabajo(),
    refetchInterval: 30000,
  })

  // Query para obtener viajes - ÚNICA FUENTE: /api/pro-ops/driver/viajes-completos
  // Todos los viajes mostrados en esta vista provienen exclusivamente de este endpoint

  // Mapear contractors a DriverItem
  const driversList = useMemo<DriverItem[]>(() => {
    if (!driversData?.contractors) return []
    return driversData.contractors.map((contractor: ContractorDriver) => {
      // Mapear status: 'online' -> 'free', otros se mantienen
      let mappedStatus: DriverItem['status'] = 'offline'
      if (contractor.status === 'online') {
        mappedStatus = 'free'
      } else if (contractor.status === 'busy' || contractor.status === 'in_order') {
        mappedStatus = contractor.status
      } else if (contractor.status === 'offline') {
        mappedStatus = 'offline'
      }
      
      return {
        driver_id: contractor.id,
        full_name: contractor.full_name,
        status: mappedStatus,
        balance: parseFloat(contractor.balance) || 0,
        photo_url: contractor.avatar_url,
        avatar_url: contractor.avatar_url,
        phone: contractor.phone,
        code: undefined,
        car_number: undefined,
        hiring_segment: contractor.hiring_segment,
        groups: contractor.groups || [],
      }
    })
  }, [driversData])


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

  // Detectar si hay un registro de cierre
  const cierreRegistrado = viajesData?.cierre_registrado ?? false

  // Obtener opciones de tipo de trabajo desde las reglas de trabajo
  const tipoTrabajoOptions = useMemo(() => {
    if (!workRulesData?.work_rules) {
      return []
    }

    // Mapear reglas a opciones
    return workRulesData.work_rules.map(rule => ({
      value: rule.id,
      label: rule.name
    }))
  }, [workRulesData])

  // Filtrar conductores
  const filteredDrivers = useMemo(() => {
    if (!driversList || driversList.length === 0) return []
    
    let filtered = driversList

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(driver =>
        driver.full_name.toLowerCase().includes(searchLower) ||
        getDriverCode(driver).toLowerCase().includes(searchLower) ||
        driver.driver_id.toLowerCase().includes(searchLower)
      )
    }

    // El filtrado por tipo de trabajo ya se hace en el backend mediante work_rule_ids
    // No es necesario filtrar aquí porque el endpoint ya devuelve los conductores filtrados

    return filtered
  }, [driversList, searchTerm])

  // Memoizar viajesData para evitar recrear arrays
  // Los viajes provienen exclusivamente de /api/pro-ops/driver/viajes-completos
  const viajesArray = useMemo(() => {
    return viajesData?.viajes ?? []
  }, [viajesData])

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

  // Paginación
  const paginationDrivers = usePagination(filteredDrivers, itemsPerPageDrivers)
  const paginationViajes = usePagination(filteredViajes, itemsPerPage)

  // Resetear página cuando cambia el filtro o búsqueda
  useEffect(() => {
    paginationDrivers.setCurrentPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, tipoConductorFilter])

  const handleDriverClick = (driver: DriverItem) => {
    setSelectedDriver(driver)
    setShowModal(true)
    setSearchTermViajes('')
    paginationViajes.setCurrentPage(1)
    setItemsPerPage(DEFAULT_ITEMS_PER_PAGE)
  }

  const handleItemsPerPageChangeDrivers = (value: string) => {
    const newItemsPerPage = parseInt(value)
    setItemsPerPageDrivers(newItemsPerPage)
    paginationDrivers.handleItemsPerPageChange(newItemsPerPage)
  }

  const handleItemsPerPageChangeViajes = (value: string) => {
    const newItemsPerPage = parseInt(value)
    setItemsPerPage(newItemsPerPage)
    paginationViajes.handleItemsPerPageChange(newItemsPerPage)
  }

  const esUnSoloDia = fechaInicio && fechaFin && fechaInicio === fechaFin

  const handleAbrirModalCierre = () => {
    if (!selectedDriver || !fechaInicio || !esUnSoloDia) return
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
      console.error('Error al obtener cierre:', error)
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

      const valoresCalculados = calcularValoresCierre(
        cierreDetalle.totalIngresos,
        editGnvSoles,
        editGasolinaSoles,
        editOtrosGastos,
        editLiquidaEfectivo,
        editLiquidaYape
      )

      // Validar que la liquidación calce
      if (!valoresCalculados.calza) {
        showWarning(`La liquidación no calza. Liquidez Final: ${formatBalance(valoresCalculados.liquidezFinal)}, Total Liquidación: ${formatBalance(valoresCalculados.totalLiquidacion)}. Por favor, verifica los montos.`)
        return
      }

      await yegoProOpsService.actualizarCierre({
        id: cierreDetalle.id, // ID del cierre en la BD
        driverId: selectedDriver.driver_id,
        userId: user?.id ?? 0, // ID del usuario que está actualizando
        fecha: fechaInicio,
        gnvM3: editGnvM3 || null,
        gnvSoles: parseNumber(editGnvSoles),
        gasolinaGalones: editGasolinaGalones || null,
        gasolinaSoles: editGasolinaSoles ? parseNumber(editGasolinaSoles) : 0,
        liquidaEfectivo: parseNumber(editLiquidaEfectivo),
        liquidaYape: parseNumber(editLiquidaYape),
        otrosGastos: valoresCalculados.totalOtrosGastos,
        otrosGastosDescripcion: editOtrosGastosDescripcion.trim() || null,
        totalIngresos: cierreDetalle.totalIngresos,
        totalGastos: valoresCalculados.totalGastosCombustible + valoresCalculados.totalOtrosGastos,
        resta: valoresCalculados.liquidezFinal,
      })

      // Refrescar datos
      await handleVerCierre()
      await refetchViajes()
      setEditandoCierre(false)
      showSuccess('Cierre actualizado exitosamente')
    } catch (error) {
      console.error('Error al actualizar cierre:', error)
      showError('Error al actualizar el cierre. Por favor, intenta nuevamente.')
    } finally {
      setActualizandoCierre(false)
    }
  }

  const puedeEditar = user?.role?.toUpperCase() !== 'GESTOR'

  const valoresCierre = useMemo(() => {
    if (!metricas?.totalIngresos) return null
    return calcularValoresCierre(
      metricas.totalIngresos,
      gnvSoles,
      gasolinaSoles,
      otrosGastos,
      liquidaEfectivo,
      liquidaYape
    )
  }, [metricas, gnvSoles, gasolinaSoles, otrosGastos, liquidaEfectivo, liquidaYape])

  const handleRegistrarCierre = async () => {
    if (!selectedDriver || !fechaInicio || !esUnSoloDia || !valoresCierre) return

    const errorValidacion = validarFormularioCierre(gnvSoles, gasolinaSoles, liquidaEfectivo, liquidaYape, otrosGastos, otrosGastosDescripcion)
    if (errorValidacion) {
      showWarning(errorValidacion)
      return
    }

    // Validar que la liquidación calce con la liquidez final
    if (!valoresCierre.calza) {
      showWarning(`La liquidación no calza. Liquidez Final: ${formatBalance(valoresCierre.liquidezFinal)}, Total Liquidación: ${formatBalance(valoresCierre.totalLiquidacion)}. Por favor, verifica los montos.`)
      return
    }

    try {
      setRegistrandoCierre(true)

      await yegoProOpsService.registrarCierre({
        driverId: selectedDriver.driver_id,
        userId: user?.id ?? 0, // ID del usuario en sesión
        fecha: fechaInicio, // Fecha del día seleccionado en el calendario (YYYY-MM-DD)
        gnvM3: gnvM3 || null,
        gnvSoles: parseNumber(gnvSoles),
        gasolinaGalones: gasolinaGalones || null,
        gasolinaSoles: gasolinaSoles ? parseNumber(gasolinaSoles) : 0,
        liquidaEfectivo: parseNumber(liquidaEfectivo),
        liquidaYape: parseNumber(liquidaYape),
        otrosGastos: valoresCierre.totalOtrosGastos,
        otrosGastosDescripcion: otrosGastosDescripcion.trim() || null,
        totalIngresos: metricas?.totalIngresos ?? 0,
        totalGastos: valoresCierre.totalGastosCombustible + valoresCierre.totalOtrosGastos,
        resta: valoresCierre.liquidezFinal,
      })
      
      await refetchViajes()
      setShowModalCierre(false)
      showSuccess('Cierre registrado exitosamente')
    } catch (error) {
      console.error('Error al registrar cierre:', error)
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
            {/* Header con búsqueda y filtros */}
            <div className="mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Buscar conductor por nombre, teléfono o ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="w-56">
                  <Select
                    value={tipoConductorFilter || 'all'}
                    onValueChange={(value) => setTipoConductorFilter(value === 'all' ? null : value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Tipo de trabajo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {tipoTrabajoOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Tabla de conductores */}
            {loadingDrivers ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 dark:border-red-400"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando conductores...</p>
              </div>
            ) : filteredDrivers.length === 0 ? (
              <div className="text-center py-12">
                <User className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                <p className="mt-4 text-gray-600 dark:text-gray-400">No se encontraron conductores</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                        <TableHead className="font-semibold text-gray-900 dark:text-gray-100">Conductor</TableHead>
                        <TableHead className="font-semibold text-gray-900 dark:text-gray-100">Teléfono</TableHead>
                        <TableHead className="font-semibold text-gray-900 dark:text-gray-100">Balance</TableHead>
                        <TableHead className="font-semibold text-gray-900 dark:text-gray-100">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginationDrivers.paginatedItems.map((driver: DriverItem) => (
                        <TableRow
                          key={driver.driver_id}
                          className={cn(
                            selectedDriver?.driver_id === driver.driver_id && "bg-red-50 dark:bg-red-900/10 border-l-2 border-l-red-600"
                          )}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {(driver.avatar_url || driver.photo_url) ? (
                                <img
                                  src={driver.avatar_url || driver.photo_url}
                                  alt={driver.full_name}
                                  className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden')
                                  }}
                                />
                              ) : null}
                              <div className={`w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center ${(driver.avatar_url || driver.photo_url) ? 'hidden' : ''}`}>
                                <User className="w-5 h-5 text-gray-500" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                  {driver.full_name}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                                  {driver.driver_id}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{getDriverCode(driver)}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {formatBalance(driver.balance)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => handleDriverClick(driver)}
                              className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white font-medium text-sm transition-colors shadow-sm hover:shadow-md"
                            >
                              Ver detalle
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <Paginacion
                  currentPage={paginationDrivers.currentPage}
                  totalPages={paginationDrivers.totalPages}
                  itemsPerPage={itemsPerPageDrivers}
                  totalItems={filteredDrivers.length}
                  startIndex={paginationDrivers.startIndex}
                  endIndex={paginationDrivers.endIndex}
                  onPageChange={paginationDrivers.setCurrentPage}
                  onItemsPerPageChange={handleItemsPerPageChangeDrivers}
                />
              </>
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
        <DialogContent className="max-w-7xl w-[95vw] max-h-[95vh] overflow-hidden flex flex-col p-6">
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
              
              <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Filtro de rango de fechas con calendario */}
                <div className="mb-4 relative" ref={datePickerRef}>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      Período:
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowDatePicker(!showDatePicker)}
                      className="w-48 px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className={fechaInicio && fechaFin ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}>
                          {formatearRangoFechas()}
                        </span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${showDatePicker ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                
                  {/* Calendario desplegable */}
                  {showDatePicker && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3 z-[100]">
                      <div className="flex items-center justify-between mb-2">
                        <button
                          onClick={() => cambiarMes('anterior')}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {MESES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                        </h3>
                        <button
                          onClick={() => cambiarMes('siguiente')}
                          disabled={esMesFuturo(
                            currentMonth.getFullYear(),
                            currentMonth.getMonth() + 1
                          )}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {DIAS_SEMANA.map((dia, index) => (
                          <div key={index} className="text-center text-xs font-medium text-gray-600 dark:text-gray-400 py-1">
                            {dia}
                          </div>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-7 gap-1">
                        {obtenerDiasDelMes(currentMonth).map((dia, index) => {
                          if (dia === null) {
                            return <div key={index} className="py-1"></div>
                          }
                          const esFutura = esFechaFutura(dia)
                          const estaEnRango = esFechaEnRango(dia)
                          const esInicio = esFechaInicio(dia)
                          const esFin = esFechaFin(dia)
                          
                          return (
                            <button
                              key={index}
                              onClick={() => seleccionarFecha(dia)}
                              disabled={esFutura}
                              className={cn(
                                "py-1.5 rounded text-xs transition-colors",
                                esFutura
                                  ? 'opacity-30 cursor-not-allowed text-gray-400 dark:text-gray-600'
                                  : esInicio || esFin
                                  ? 'bg-red-600 text-white font-semibold'
                                  : estaEnRango
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-100'
                                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                              )}
                              title={esFutura ? 'No se pueden seleccionar fechas futuras' : ''}
                            >
                              {dia}
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
                ) : (viajesData !== undefined && metricas) ? (
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
                              onClick={handleAbrirModalCierre}
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
                ) : (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400 flex-shrink-0">
                    <p>Selecciona un rango de fechas para ver los viajes</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Registro de Cierre */}
      <Dialog open={showModalCierre} onOpenChange={setShowModalCierre}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Registrar Cierre de Día
            </DialogTitle>
            <div className="flex items-center gap-4 mt-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Conductor: <span className="text-gray-900 dark:text-gray-100">{selectedDriver?.full_name}</span>
              </p>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Fecha: <span className="text-gray-900 dark:text-gray-100">
                  {new Date().toLocaleDateString('es-PE', { 
                    weekday: 'long', 
                    day: '2-digit', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </span>
              </p>
            </div>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Sección de Combustible */}
            <div className={SECTION_CARD_CLASS}>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 pb-1.5 border-b border-gray-200 dark:border-gray-700">
                Combustible
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* GNV Combustible M3 - Opcional */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    GNV Combustible (M³) <span className="text-gray-500 text-xs font-normal">(Opcional)</span>
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
                    className="w-full h-9 text-sm"
                  />
                </div>

                {/* GNV Combustible en Soles - Obligatorio */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    GNV Combustible (S/.) <span className="text-red-600">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={gnvSoles}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === '' || parseFloat(value) >= 0) {
                        setGnvSoles(value)
                      }
                    }}
                    placeholder="0.00"
                    className="w-full h-9 text-sm"
                    required
                  />
                </div>

                {/* Gasolina Combustible Galones - Opcional */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Gasolina Combustible (Galones) <span className="text-gray-500 text-xs font-normal">(Opcional)</span>
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
                    className="w-full h-9 text-sm"
                  />
                </div>

                {/* Gasolina Combustible en Soles - Opcional */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Gasolina Combustible (S/.) <span className="text-gray-500 text-xs font-normal">(Opcional)</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={gasolinaSoles}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === '' || parseFloat(value) >= 0) {
                        setGasolinaSoles(value)
                      }
                    }}
                    placeholder="0.00"
                    className="w-full h-9 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Sección de Liquidación */}
            <div className={SECTION_CARD_CLASS}>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 pb-1.5 border-b border-gray-200 dark:border-gray-700">
                Liquidación
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Cuanto liquida en Efectivo - Obligatorio */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Cuanto Liquida en Efectivo (S/.) <span className="text-red-600">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={liquidaEfectivo}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === '' || parseFloat(value) >= 0) {
                        setLiquidaEfectivo(value)
                      }
                    }}
                    placeholder="0.00"
                    className="w-full h-9 text-sm"
                    required
                  />
                </div>

                {/* Cuanto liquida en Yape - Obligatorio */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Cuanto Liquida en Yape (S/.) <span className="text-red-600">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={liquidaYape}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === '' || parseFloat(value) >= 0) {
                        setLiquidaYape(value)
                      }
                    }}
                    placeholder="0.00"
                    className="w-full h-9 text-sm"
                    required
                  />
                </div>

                {/* Otros Gastos - Opcional */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
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
                    className="w-full h-9 text-sm"
                  />
                  {otrosGastos && parseNumber(otrosGastos) > 0 && (
                    <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Descripción del gasto <span className="text-red-600">*</span>
                      </label>
                      <Input
                        type="text"
                        value={otrosGastosDescripcion}
                        onChange={(e) => setOtrosGastosDescripcion(e.target.value)}
                        placeholder="Ej: Mantenimiento, Reparación, etc."
                        className="w-full h-9 text-sm bg-white dark:bg-gray-800"
                        required
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cálculo de resta */}
            {valoresCierre && (
                <div className={SECTION_CARD_CLASS}>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Resumen de Cálculo</h4>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center py-1">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Total Ingresos:</span>
                      <span className="text-sm font-bold text-green-600 dark:text-green-400">{formatBalance(metricas?.totalIngresos ?? 0)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-t border-red-200 dark:border-red-800">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Total Gastos Combustible:</span>
                      <span className="text-sm font-bold text-red-600 dark:text-red-400">
                        {formatBalance(valoresCierre.totalGastosCombustible)}
                      </span>
                    </div>
                    {valoresCierre.totalOtrosGastos > 0 && (
                      <div className="flex justify-between items-center py-1 border-t border-red-200 dark:border-red-800">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Otros Gastos:</span>
                        <span className="text-sm font-bold text-red-600 dark:text-red-400">
                          {formatBalance(valoresCierre.totalOtrosGastos)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-1 border-t border-red-200 dark:border-red-800">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Liquidez Final:</span>
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {formatBalance(valoresCierre.liquidezFinal)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-t border-red-200 dark:border-red-800">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Total Liquidación:</span>
                      <span className={`text-sm font-bold ${valoresCierre.calza ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                        {formatBalance(valoresCierre.totalLiquidacion)}
                      </span>
                    </div>
                    {!valoresCierre.calza && valoresCierre.totalLiquidacion > 0 && (
                      <div className="text-xs font-medium py-1 px-2 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                        {valoresCierre.totalLiquidacion > valoresCierre.liquidezFinal 
                          ? `⚠️ La liquidación excede la liquidez por ${formatBalance(valoresCierre.totalLiquidacion - valoresCierre.liquidezFinal)}`
                          : `⚠️ Falta liquidar ${formatBalance(valoresCierre.liquidezFinal - valoresCierre.totalLiquidacion)}`
                        }
                      </div>
                    )}
                    {valoresCierre.calza && valoresCierre.totalLiquidacion > 0 && (
                      <div className="text-xs font-medium py-1 px-2 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                        ✅ La liquidación calza correctamente
                      </div>
                    )}
                  </div>
                </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Detalles del Cierre de Día
            </DialogTitle>
            <div className="flex items-center gap-4 mt-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Conductor: <span className="text-gray-900 dark:text-gray-100">{selectedDriver?.full_name}</span>
              </p>
              {cierreDetalle && (
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Fecha: <span className="text-gray-900 dark:text-gray-100">
                    {new Date(cierreDetalle.fecha).toLocaleDateString('es-PE', { 
                      weekday: 'long', 
                      day: '2-digit', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </span>
                </p>
              )}
            </div>
          </DialogHeader>

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
                      GNV Combustible (M³) <span className="text-gray-400 text-xs">(Opcional)</span>
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
                        type="number"
                        step="0.01"
                        min="0"
                        value={editGnvSoles}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === '' || parseFloat(value) >= 0) {
                            setEditGnvSoles(value)
                          }
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
                      Gasolina Combustible (Galones) <span className="text-gray-400 text-xs">(Opcional)</span>
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
                        type="number"
                        step="0.01"
                        min="0"
                        value={editGasolinaSoles}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === '' || parseFloat(value) >= 0) {
                            setEditGasolinaSoles(value)
                          }
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
                        type="number"
                        step="0.01"
                        min="0"
                        value={editLiquidaEfectivo}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === '' || parseFloat(value) >= 0) {
                            setEditLiquidaEfectivo(value)
                          }
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
                        type="number"
                        step="0.01"
                        min="0"
                        value={editLiquidaYape}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === '' || parseFloat(value) >= 0) {
                            setEditLiquidaYape(value)
                          }
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
                  if (editandoCierre && cierreDetalle) {
                    const valoresCalculados = calcularValoresCierre(
                      cierreDetalle.totalIngresos,
                      editGnvSoles,
                      editGasolinaSoles,
                      editOtrosGastos,
                      editLiquidaEfectivo,
                      editLiquidaYape
                    )

                    return (
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center py-1">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Total Ingresos:</span>
                          <span className="text-sm font-bold text-green-600 dark:text-green-400">
                            {formatBalance(cierreDetalle.totalIngresos)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-t border-red-200 dark:border-red-800">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Total Gastos Combustible:</span>
                          <span className="text-sm font-bold text-red-600 dark:text-red-400">
                            {formatBalance(valoresCalculados.totalGastosCombustible)}
                          </span>
                        </div>
                        {valoresCalculados.totalOtrosGastos > 0 && (
                          <div className="flex justify-between items-center py-1 border-t border-red-200 dark:border-red-800">
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Otros Gastos:</span>
                            <span className="text-sm font-bold text-red-600 dark:text-red-400">
                              {formatBalance(valoresCalculados.totalOtrosGastos)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center py-1 border-t border-red-200 dark:border-red-800">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Total Gastos:</span>
                          <span className="text-sm font-bold text-red-600 dark:text-red-400">
                            {formatBalance(valoresCalculados.totalGastosCombustible + valoresCalculados.totalOtrosGastos)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-t border-blue-200 dark:border-blue-800">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Liquidez Final:</span>
                          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                            {formatBalance(valoresCalculados.liquidezFinal)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-t border-blue-200 dark:border-blue-800">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Total Liquidación:</span>
                          <span className={`text-sm font-bold ${valoresCalculados.calza ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                            {formatBalance(valoresCalculados.totalLiquidacion)}
                          </span>
                        </div>
                        {!valoresCalculados.calza && valoresCalculados.totalLiquidacion > 0 && (
                          <div className="text-xs font-medium py-1 px-2 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                            {valoresCalculados.totalLiquidacion > valoresCalculados.liquidezFinal 
                              ? `⚠️ La liquidación excede la liquidez por ${formatBalance(valoresCalculados.totalLiquidacion - valoresCalculados.liquidezFinal)}`
                              : `⚠️ Falta liquidar ${formatBalance(valoresCalculados.liquidezFinal - valoresCalculados.totalLiquidacion)}`
                            }
                          </div>
                        )}
                        {valoresCalculados.calza && valoresCalculados.totalLiquidacion > 0 && (
                          <div className="text-xs font-medium py-1 px-2 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                            ✅ La liquidación calza correctamente
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

          <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
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

      {/* Container de notificaciones toast */}
      <NotificationContainer 
        notifications={notifications}
        onRemove={removeNotification}
      />

    </div>
  )
}
