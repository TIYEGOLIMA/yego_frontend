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


  const { playNotificationSound } = useAudio()

  // 🎯 WEBSOCKET CENTRALIZADO para TVDisplay
  const {
    isConnected,
    connectionStatus,
    onTicketCreated,
    onTicketUpdated,
    onTicketCalled,
    onTicketCompleted,
    onDisplayUpdated
  } = useTVDisplayWebSocket()

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

  // 🎯 CONECTAR WEBSOCKET AUTOMÁTICAMENTE AL MONTAR EL COMPONENTE
  useEffect(() => {
    console.log('🔌 [TVDisplay] Montando componente - intentando conectar WebSocket...')
    
    // Importar SocketService y conectar inmediatamente
    import('../../../../src/services/socket-service').then((module) => {
      const socketService = module.default
      const sessionId = `tvdisplay-${Date.now()}`
      
      console.log('🚀 [TVDisplay] Conectando WebSocket con sessionId:', sessionId)
      socketService.connect(sessionId)
    }).catch(error => {
      console.error('❌ [TVDisplay] Error importando SocketService:', error)
    })
  }, []) // Solo se ejecuta al montar el componente

  // 🎯 RECONEXIÓN AUTOMÁTICA cada 3 segundos si está desconectado
  useEffect(() => {
    if (isConnected) {
      console.log('✅ [TVDisplay] WebSocket conectado, no necesita reconexión')
      return
    }

    console.log('🔄 [TVDisplay] Configurando reconexión automática cada 3 segundos...')
    
    const reconexionInterval = setInterval(() => {
      console.log('🔄 [TVDisplay] Intentando reconectar WebSocket...')
      
      import('../../../../src/services/socket-service').then((module) => {
        const socketService = module.default
        const sessionId = `tvdisplay-reconnect-${Date.now()}`
        
        console.log('🚀 [TVDisplay] Reconectando WebSocket con sessionId:', sessionId)
        socketService.connect(sessionId)
      }).catch(error => {
        console.error('❌ [TVDisplay] Error en reconexión:', error)
      })
    }, 2000) // Intentar reconectar cada 2 segundos (más agresivo)

    return () => {
      console.log('🛑 [TVDisplay] Limpiando intervalo de reconexión...')
      clearInterval(reconexionInterval)
    }
  }, [isConnected])

  // 🎯 CONFIGURAR LISTENERS DEL WEBSOCKET
  useEffect(() => {
    console.log('🔍 [TVDisplay] Estado WebSocket:', { isConnected, connectionStatus })
    
    if (!isConnected) {
      console.log('⏳ [TVDisplay] WebSocket no conectado, esperando conexión...')
      return
    }

    console.log('🎧 [TVDisplay] Configurando listeners del WebSocket...')

    // Listener para tickets creados
    const unsubscribeTicketCreated = onTicketCreated(async (newTicket) => {
      console.log('🆕 [TVDisplay] Nuevo ticket creado:', newTicket)
      
      // Cargar nombre del conductor para el nuevo ticket
      const ticketConNombre = await cargarNombreConductor(newTicket)
      
      setTickets(prev => {
        // Verificar si el ticket ya existe
        const exists = prev.some(t => t.id === newTicket.id)
        if (exists) {
          console.log('🔄 [TVDisplay] Ticket ya existe, actualizando...')
          return prev.map(t => t.id === newTicket.id ? ticketConNombre : t)
        } else {
          console.log('➕ [TVDisplay] Agregando nuevo ticket...')
          return [ticketConNombre, ...prev]
        }
      })
      
      setLastUpdate(new Date())
      
      // Reproducir sonido si está habilitado
      if (soundEnabled) {
        playNotificationSound()
      }
    })

    // Listener para tickets actualizados
    const unsubscribeTicketUpdated = onTicketUpdated(async (updatedTicket) => {
      console.log('🔄 [TVDisplay] Ticket actualizado:', updatedTicket)
      
      // Cargar nombre del conductor para el ticket actualizado
      const ticketConNombre = await cargarNombreConductor(updatedTicket)
      
      setTickets(prev => {
        const exists = prev.some(t => t.id === updatedTicket.id)
        if (exists) {
          console.log('🔄 [TVDisplay] Actualizando ticket existente...')
          return prev.map(t => t.id === updatedTicket.id ? ticketConNombre : t)
        } else {
          console.log('➕ [TVDisplay] Agregando ticket actualizado...')
          return [ticketConNombre, ...prev]
        }
      })
      
      setLastUpdate(new Date())
    })

    // Listener para tickets llamados
    const unsubscribeTicketCalled = onTicketCalled(async (calledTicket) => {
      console.log('📢 [TVDisplay] Ticket llamado:', calledTicket)
      
      // Cargar nombre del conductor para el ticket llamado
      const ticketConNombre = await cargarNombreConductor(calledTicket)
      
      setTickets(prev => {
        const exists = prev.some(t => t.id === calledTicket.id)
        if (exists) {
          console.log('🔄 [TVDisplay] Actualizando ticket llamado...')
          return prev.map(t => t.id === calledTicket.id ? ticketConNombre : t)
        } else {
          console.log('➕ [TVDisplay] Agregando ticket llamado...')
          return [ticketConNombre, ...prev]
        }
      })
      
      setCalledTicket(ticketConNombre)
      setLastUpdate(new Date())
      
      // Reproducir sonido si está habilitado
      if (soundEnabled) {
        playNotificationSound()
      }
    })

    // Listener para tickets completados
    const unsubscribeTicketCompleted = onTicketCompleted(async (completedTicket) => {
      console.log('✅ [TVDisplay] Ticket completado:', completedTicket)
      
      setTickets(prev => {
        console.log('🗑️ [TVDisplay] Removiendo ticket completado...')
        return prev.filter(t => t.id !== completedTicket.id)
      })
      
      setLastUpdate(new Date())
    })

    // Listener para actualizaciones de display
    const unsubscribeDisplayUpdated = onDisplayUpdated((displayData) => {
      console.log('📺 [TVDisplay] Display actualizado:', displayData)
      
      if (displayData.tickets) {
        setTickets(displayData.tickets)
      }
      if (displayData.stats) {
        setStats(displayData.stats)
      }
      if (displayData.lastUpdate) {
        setLastUpdate(new Date(displayData.lastUpdate))
      }
    })

    // Cleanup function
    return () => {
      console.log('🧹 [TVDisplay] Limpiando listeners del WebSocket...')
      unsubscribeTicketCreated()
      unsubscribeTicketUpdated()
      unsubscribeTicketCalled()
      unsubscribeTicketCompleted()
      unsubscribeDisplayUpdated()
    }
  }, [isConnected, soundEnabled, cargarNombreConductor, playNotificationSound])

  // 🎯 CARGAR TICKETS INICIALES (fallback si WebSocket no funciona)
  useEffect(() => {
    const cargarTicketsIniciales = async () => {
      try {
        console.log('📋 [TVDisplay] Cargando todos los tickets iniciales...')
        setLoading(true)
        
        // 🎯 NUEVO: Usar getAllTickets() para obtener todos los tickets en una sola llamada
        const ticketsData = await ticketService.getAllTickets()
        console.log('📋 [TVDisplay] Todos los tickets cargados:', ticketsData.length)
        
        // Cargar nombres de conductores para todos los tickets
        const ticketsConNombres = await Promise.all(
          ticketsData.map(ticket => cargarNombreConductor(ticket))
        )
        
        setTickets(ticketsConNombres)
        setLastUpdate(new Date())
        
        // Actualizar estadísticas
        const statsData = {
          enEspera: ticketsData.filter(t => t.status === TICKET_STATUS.WAITING).length,
          llamados: ticketsData.filter(t => t.status === TICKET_STATUS.CALLED).length,
          atendidos: ticketsData.filter(t => t.status === TICKET_STATUS.IN_PROGRESS).length,
          completados: ticketsData.filter(t => t.status === TICKET_STATUS.COMPLETED).length
        }
        setStats(statsData)
        setLastStatsUpdate(new Date())
        
        console.log('📊 [TVDisplay] Estadísticas actualizadas:', statsData)
      } catch (error) {
        console.error('❌ [TVDisplay] Error cargando tickets iniciales:', error)
      } finally {
        setLoading(false)
      }
    }

    cargarTicketsIniciales()
  }, [])

  // 🎯 POLLING COMO RESPALDO (si WebSocket no está conectado)
  useEffect(() => {
    if (!isConnected) {
      console.log('🔄 [TVDisplay] WebSocket no conectado, iniciando polling...')
      
      const interval = setInterval(async () => {
        try {
          console.log('🔄 [TVDisplay] Polling para actualizar todos los tickets...')
          // 🎯 NUEVO: Usar getAllTickets() en el polling también
          const ticketsData = await ticketService.getAllTickets()
          
          // Solo actualizar si hay cambios
          setTickets(prev => {
            if (prev.length !== ticketsData.length || 
                prev.some((t, i) => t.id !== ticketsData[i]?.id || t.status !== ticketsData[i]?.status)) {
              console.log('🔄 [TVDisplay] Cambios detectados, actualizando tickets...')
              // Cargar nombres de conductores de forma asíncrona
              Promise.all(ticketsData.map(ticket => cargarNombreConductor(ticket)))
                .then(ticketsConNombres => {
                  setTickets(ticketsConNombres)
                })
              return prev // Retornar el estado actual mientras se cargan los nombres
            }
            return prev
          })
          
          setLastUpdate(new Date())
        } catch (error) {
          console.error('❌ [TVDisplay] Error en polling:', error)
        }
      }, 5000) // Polling cada 5 segundos
      
      return () => {
        console.log('🛑 [TVDisplay] Deteniendo polling...')
        clearInterval(interval)
      }
    }
  }, [isConnected])

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


  // 🎯 EFECTO PARA RELOJ: Actualizar tiempo cada segundo
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => {
      clearInterval(timeInterval)
    }
  }, [])

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
    connectionStatus,
    
    // Acciones
    formatearHora,
    formatearFecha,
    toggleSound
  }
}
