import { useState, useEffect, useCallback, useMemo } from 'react'
import { Ticket } from '../types'
import { ticketService, validationService } from '../services'
import { useAudio, normalizeDriverName } from '../utils/audioUtils'
import { TICKET_STATUS } from '../../shared'
import { useTVDisplayWebSocket } from './useWebSocket'

export const useTVDisplay = () => {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [calledTicket, setCalledTicket] = useState<Ticket | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [stats, setStats] = useState({
    enEspera: 0,
    llamados: 0,
    atendidos: 0,
    completados: 0
  })
  const [lastStatsUpdate, setLastStatsUpdate] = useState<Date | null>(null)
  const maxTicketsToShow = 7

  // 🎯 NUEVO: Estados para nombres de conductores
  const [driverNames, setDriverNames] = useState<Record<string, string>>({})
  const [loadingDrivers, setLoadingDrivers] = useState<Set<string>>(new Set())

  const { playNotificationSound } = useAudio()

  // 🎯 WEBSOCKET CENTRALIZADO para TVDisplay
  const {
    isConnected,
    connectionStatus,
    onTicketCreated,
    onTicketUpdated,
    onTicketCalled,
    onTicketCompleted,
    onDisplayUpdated,
    subscribe,
    emitDisplayUpdate
  } = useTVDisplayWebSocket()

  // 🎯 NUEVA FUNCIÓN: Obtener nombre del conductor
  const obtenerNombreConductor = useCallback(async (phoneNumber: string) => {
    if (!phoneNumber || loadingDrivers.has(phoneNumber)) {
      return
    }

    try {
      setLoadingDrivers(prev => new Set(prev).add(phoneNumber))
      
      // 🎯 NUEVO: Primero verificar si ya está en el cache
      try {
        const cache = JSON.parse(localStorage.getItem('driver_names_cache') || '{}')
        const phoneKey = phoneNumber.startsWith('+51') ? phoneNumber : `+51${phoneNumber}`
        
        if (cache[phoneKey] && cache[phoneKey].name) {
          console.log(`✅ [TVDisplay] Nombre encontrado en cache para ${phoneNumber}: ${cache[phoneKey].name}`)
          setDriverNames(prev => ({
            ...prev,
            [phoneNumber]: cache[phoneKey].name
          }))
          return
        }
      } catch (error) {
        console.log(`⚠️ [TVDisplay] Error leyendo cache para ${phoneNumber}:`, error)
      }
      
      // 🎯 NUEVO: Si no está en cache, consultar API
      const driverData = await validationService.getDriverByPhonePublic(phoneNumber)
      
      if (driverData?.full_name) {
        const normalizedName = normalizeDriverName(driverData.full_name)
        setDriverNames(prev => ({
          ...prev,
          [phoneNumber]: normalizedName
        }))
        console.log(`✅ [TVDisplay] Nombre cargado desde API para ${phoneNumber}: ${normalizedName}`)
      }
    } catch (error) {
      console.log(`❌ [TVDisplay] Error cargando nombre para ${phoneNumber}:`, error)
    } finally {
      setLoadingDrivers(prev => {
        const newSet = new Set(prev)
        newSet.delete(phoneNumber)
        return newSet
      })
    }
  }, [loadingDrivers])

  // 🎯 SUSCRIPCIÓN A WEBSOCKET CENTRALIZADO PARA TICKETS EN TIEMPO REAL
  useEffect(() => {
    console.log('🔌 [TVDisplay] Configurando WebSocket centralizado para tickets...')
    console.log('🔌 [TVDisplay] Estado conexión:', { isConnected, connectionStatus })
    
    if (!isConnected) {
      console.log('🚫 [TVDisplay] WebSocket no disponible, usando HTTP polling')
      return
    }

    console.log('🔌 [TVDisplay] WebSocket conectado, suscribiéndose a eventos...')
    
    // Suscribirse a nuevos tickets
    const unsubscribeNewTicket = onTicketCreated(async (ticket: Ticket) => {
      console.log('🎫 [TVDisplay] Nuevo ticket recibido por WebSocket:', ticket.ticketNumber)
      const ticketConNombre = await cargarNombreConductor(ticket)
      setTickets(prev => {
        const ticketExists = prev.find(t => t.id === ticket.id)
        if (ticketExists) {
          return prev.map(t => t.id === ticket.id ? ticketConNombre : t)
        } else {
          return [...prev, ticketConNombre]
        }
      })
      setLastUpdate(new Date())
      if (soundEnabled) { 
        playNotificationSound() 
      }
    })

    // Suscribirse a tickets llamados
    const unsubscribeCalledTicket = onTicketCalled(async (ticket: Ticket) => {
      console.log('📢 [TVDisplay] Ticket llamado por WebSocket:', ticket.ticketNumber)
      const ticketConNombre = await cargarNombreConductor(ticket)
      setCalledTicket(ticketConNombre)
      setTickets(prev => prev.map(t => t.id === ticket.id ? ticketConNombre : t))
      setLastUpdate(new Date())
      if (soundEnabled) { 
        playNotificationSound() 
      }
      setTimeout(() => { 
        setCalledTicket(null) 
      }, 10000)
    })

    // Suscribirse a tickets actualizados (en atención)
    const unsubscribeUpdatedTicket = onTicketUpdated(async (ticket: Ticket) => {
      console.log('⚡ [TVDisplay] Ticket actualizado por WebSocket:', ticket.ticketNumber)
      const ticketConNombre = await cargarNombreConductor(ticket)
      setTickets(prev => prev.map(t => t.id === ticket.id ? ticketConNombre : t))
      setLastUpdate(new Date())
    })

    // Suscribirse a tickets completados
    const unsubscribeCompletedTicket = onTicketCompleted((ticket: Ticket) => {
      console.log('✅ [TVDisplay] Ticket completado por WebSocket:', ticket.ticketNumber)
      setTickets(prev => prev.filter(t => t.id !== ticket.id))
      setLastUpdate(new Date())
    })

    // Suscribirse a actualizaciones de pantalla
    const unsubscribeDisplayUpdate = onDisplayUpdated((displayData: any) => {
      console.log('📺 [TVDisplay] Actualización de pantalla recibida:', displayData)
      // Aquí puedes manejar actualizaciones específicas de configuración de pantalla
    })

    // Limpiar suscripciones al desmontar
    return () => {
      console.log('🧹 [TVDisplay] Limpiando suscripciones WebSocket...')
      unsubscribeNewTicket()
      unsubscribeCalledTicket()
      unsubscribeUpdatedTicket()
      unsubscribeCompletedTicket()
      unsubscribeDisplayUpdate()
    }
  }, [isConnected, onTicketCreated, onTicketCalled, onTicketUpdated, onTicketCompleted, onDisplayUpdated, soundEnabled, playNotificationSound])

  // Función para formatear hora
  const formatearHora = useCallback((date: Date) => {
    try {
      if (isNaN(date.getTime())) {
        return new Date().toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      }
      
      return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    } catch (error) {
      console.warn('⚠️ [TVDisplay] Error formateando hora:', error)
      return new Date().toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }
  }, [])

  // Función para formatear fecha
  const formatearFecha = useCallback((date: Date) => {
    try {
      if (isNaN(date.getTime())) {
        return new Date().toLocaleDateString('es-ES', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      }
      
      return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch (error) {
      console.warn('⚠️ [TVDisplay] Error formateando fecha:', error)
      return new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
  }, [])



  // Función para cargar tickets completos CON nombres de conductores
  const cargarTicketsCompletos = useCallback(async () => {
    try {
      console.log('🔄 [TVDisplay] Cargando tickets...')
      setLoading(true)
      const ticketsData = await ticketService.getTickets()
      console.log(`✅ [TVDisplay] Tickets cargados: ${ticketsData.length}`)
      
      // 🎯 CARGAR NOMBRES DE CONDUCTORES PARA TODOS LOS TICKETS
      console.log('🔍 [TVDisplay] Cargando nombres de conductores...')
      
      // 🎯 DEBUG: Ver qué tickets tenemos
      console.log('🔍 [TVDisplay] Tickets con licenseNumber:', ticketsData.filter(t => t.licenseNumber).length)
      console.log('🔍 [TVDisplay] Tickets con driverName:', ticketsData.filter(t => t.driverName).length)
      console.log('🔍 [TVDisplay] Primer ticket:', ticketsData[0])
      
      // 🎯 DEBUG: Ver todos los tickets con licenseNumber
      ticketsData.forEach((ticket, index) => {
        if (ticket.licenseNumber) {
          console.log(`🔍 [TVDisplay] Ticket ${index + 1}:`, {
            ticketNumber: ticket.ticketNumber,
            licenseNumber: ticket.licenseNumber,
            driverName: ticket.driverName,
            status: ticket.status
          })
        }
      })
      
      // 🎯 CORREGIDO: Usar licenseNumber en lugar de phone
      const phonesToLoad = ticketsData
        .filter(ticket => ticket.licenseNumber && !ticket.driverName)
        .map(ticket => ticket.licenseNumber)
        .filter((phone): phone is string => phone !== undefined)
      
      console.log('🔍 [TVDisplay] Números a precargar:', phonesToLoad)
      
      if (phonesToLoad.length > 0) {
        console.log(`🔍 [TVDisplay] Precargando ${phonesToLoad.length} nombres de conductores...`)
        await validationService.preloadDrivers(phonesToLoad)
        console.log('✅ [TVDisplay] Precarga completada')
      } else {
        console.log('⚠️ [TVDisplay] No hay números para precargar')
      }
      
      // 🎯 CORREGIDO: Aplicar nombres desde el cache usando licenseNumber
      const ticketsConNombres = ticketsData.map(ticket => {
        if (ticket.driverName) {
          console.log(`✅ [TVDisplay] Ticket ${ticket.ticketNumber} ya tiene nombre: ${ticket.driverName}`)
          return ticket // Ya tiene nombre
        }
        
        if (!ticket.licenseNumber) {
          return ticket // No tiene licenseNumber
        }
        
        // 🎯 BUSCAR EN EL CACHE
        try {
          const cache = JSON.parse(localStorage.getItem('driver_names_cache') || '{}')
          const phoneKey = ticket.licenseNumber.startsWith('+51') ? ticket.licenseNumber : `+51${ticket.licenseNumber}`
          
          console.log(`🔍 [TVDisplay] Buscando en cache para ${ticket.licenseNumber} -> ${phoneKey}`)
          console.log(`🔍 [TVDisplay] Cache disponible:`, Object.keys(cache))
          
          if (cache[phoneKey] && cache[phoneKey].name) {
            console.log(`✅ [TVDisplay] Nombre encontrado en cache para ${phoneKey}: ${cache[phoneKey].name}`)
            return {
              ...ticket,
              driverName: cache[phoneKey].name
            }
          } else {
            console.log(`❌ [TVDisplay] No se encontró nombre en cache para ${phoneKey}`)
            console.log(`🔍 [TVDisplay] Buscando variaciones del número...`)
            
            // 🎯 BUSCAR VARIACIONES DEL NÚMERO
            const variations = [
              phoneKey,
              ticket.licenseNumber,
              ticket.licenseNumber.replace('+51', ''),
              `+51${ticket.licenseNumber.replace('+51', '')}`
            ]
            
            for (const variation of variations) {
              if (cache[variation] && cache[variation].name) {
                console.log(`✅ [TVDisplay] Nombre encontrado en variación ${variation}: ${cache[variation].name}`)
                return {
                  ...ticket,
                  driverName: cache[variation].name
                }
              }
            }
          }
        } catch (error) {
          console.log(`⚠️ [TVDisplay] Error leyendo cache para ${ticket.licenseNumber}:`, error)
        }
        
        return ticket
      })
      
      setTickets(ticketsConNombres)
      setLastUpdate(new Date())
      console.log('🚀 [TVDisplay] Tickets cargados con nombres de conductores desde cache')
      
    } catch (error) {
      console.error('❌ [TVDisplay] Error cargando tickets:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Función auxiliar para cargar nombre de conductor de un ticket
  const cargarNombreConductor = useCallback(async (ticket: Ticket): Promise<Ticket> => {
    // Si ya tiene driverName, retornar tal como está
    if (ticket.driverName) {
      return ticket
    }
    
    // Si no tiene licenseNumber, retornar tal como está
    if (!ticket.licenseNumber) {
      return ticket
    }
    
    try {
      // Normalizar número de teléfono
      let phoneToSearch = ticket.licenseNumber.trim()
      if (!phoneToSearch.startsWith('+51') && phoneToSearch.length === 9) {
        phoneToSearch = `+51${phoneToSearch}`
      }
      
      const driverData = await validationService.getDriverByPhonePublic(phoneToSearch)
      if (driverData?.full_name) {
        const normalizedName = normalizeDriverName(driverData.full_name)
        console.log(`✅ [TVDisplay] Nombre cargado para nuevo ticket ${phoneToSearch}: ${normalizedName}`)
        return {
          ...ticket,
          driverName: normalizedName
        }
      }
    } catch (error) {
      console.log(`❌ [TVDisplay] Error cargando nombre para nuevo ticket ${ticket.licenseNumber}:`, error)
    }
    
    return ticket
  }, [])

  // Función para alternar sonido
  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => !prev)
  }, [])

  // Estados derivados
  const ticketsEnEspera = useMemo(() => 
    tickets.filter(t => t.status === TICKET_STATUS.WAITING), 
    [tickets]
  )
  
  const ticketsLlamados = useMemo(() => 
    tickets.filter(t => t.status === TICKET_STATUS.CALLED), 
    [tickets]
  )
  
  const ticketsEnAtencion = useMemo(() => 
    tickets.filter(t => t.status === TICKET_STATUS.IN_PROGRESS), 
    [tickets]
  )
  
  const currentTickets = useMemo(() => 
    ticketsEnEspera
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, maxTicketsToShow),
    [ticketsEnEspera]
  )

  // 🎯 EFECTO PRINCIPAL: Cargar tickets solo una vez al inicio
  useEffect(() => {
    cargarTicketsCompletos()
  }, [cargarTicketsCompletos])

  // 🎯 EFECTO PARA RELOJ: Actualizar tiempo cada segundo
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => {
      clearInterval(timeInterval)
    }
  }, [])

  // 🎯 HTTP POLLING SOLO CUANDO WEBSOCKET NO ESTÉ DISPONIBLE
  useEffect(() => {
    if (isConnected) {
      console.log('🔌 [TVDisplay] WebSocket activo - HTTP polling deshabilitado')
      return
    }

    console.log('🚫 [TVDisplay] WebSocket no disponible - usando HTTP polling cada 10 segundos')
    
    const ticketInterval = setInterval(() => {
      console.log('🔄 [TVDisplay] Cargando tickets automáticamente...')
      cargarTicketsCompletos()
    }, 10000) // 10 segundos
    
    return () => {
      console.log('🧹 [TVDisplay] Limpiando intervalo de tickets automáticos')
      clearInterval(ticketInterval)
    }
  }, [isConnected, cargarTicketsCompletos])

  // 🎯 EFECTO PARA RECONEXIÓN: Solo cuando WebSocket no esté conectado
  useEffect(() => {
    if (isConnected) {
      return
    }

    const timeoutId = setTimeout(() => {
      cargarTicketsCompletos()
    }, 5000)

    return () => clearTimeout(timeoutId)
  }, [isConnected, cargarTicketsCompletos])

  // 🎯 EFECTO PARA ESTADÍSTICAS: Calcular automáticamente
  useEffect(() => {
    const estadisticasCalculadas = {
      enEspera: ticketsEnEspera.length,
      llamados: ticketsLlamados.length,
      atendidos: ticketsEnAtencion.length,
      completados: stats.completados // Mantener el valor del servidor
    }
    setStats(estadisticasCalculadas)
    setLastStatsUpdate(new Date())
  }, [ticketsEnEspera.length, ticketsLlamados.length, ticketsEnAtencion.length, stats.completados])



  return {
    // Estados
    tickets,
    calledTicket,
    currentTime,
    loading,
    soundEnabled,
    lastUpdate,
    stats,
    lastStatsUpdate,
    maxTicketsToShow,
    
    // Estados derivados
    ticketsEnEspera,
    ticketsLlamados,
    ticketsEnAtencion,
    currentTickets,
    isConnected,
    
    // Acciones
    cargarTicketsCompletos,
    formatearHora,
    formatearFecha,
    toggleSound,
    driverNames,
    loadingDrivers,
    obtenerNombreConductor
  }
}
