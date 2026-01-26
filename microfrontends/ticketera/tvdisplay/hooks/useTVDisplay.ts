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
  const [vibratingTickets, setVibratingTickets] = useState<Set<number>>(new Set())
  const [displayQueue, setDisplayQueue] = useState<Ticket[]>([])
  const [currentDisplayTicket, setCurrentDisplayTicket] = useState<Ticket | null>(null)
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
    onTicketCancelled,
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
        return {
          ...ticket,
          driverName: normalizedName
        }
      }
    } catch (error) {
      // Error silencioso
    }
    
    return ticket
  }, [])

  // 🎯 CONECTAR WEBSOCKET AUTOMÁTICAMENTE AL MONTAR EL COMPONENTE
  // ✅ OPTIMIZADO: Solo conectar si no está ya conectado Y hay token
  useEffect(() => {
    // Verificar token ANTES de intentar conectar
    let token: string | null = null;
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        token = parsed?.state?.token || null;
      }
    } catch (err) {
      token = localStorage.getItem('token');
    }
    
    if (!token) {
      return;
    }
    
    // Importar SocketService y conectar inmediatamente
    import('../../../../src/services/socket-service').then((module) => {
      const socketService = module.default
      
      // ✅ Verificar estado antes de conectar
      const currentStatus = socketService.getConnectionStatus();
      if (currentStatus === 'connected') {
        return;
      }
      
      const sessionId = `tvdisplay-${Date.now()}`
      socketService.connect(sessionId)
    }).catch(error => {
      // Silencioso
    })
  }, []) // Solo se ejecuta al montar el componente

  // 🎯 RECONEXIÓN AUTOMÁTICA cada 10 segundos si está desconectado (optimizado)
  useEffect(() => {
    if (isConnected) {
      return
    }

    // Evitar múltiples intervalos simultáneos
    let reconexionInterval: NodeJS.Timeout | null = null
    let isReconnecting = false

    const attemptReconnect = () => {
      if (isReconnecting || isConnected) {
        return
      }
      
      // Verificar token ANTES de intentar reconectar
      let token: string | null = null;
      try {
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
          const parsed = JSON.parse(authStorage);
          token = parsed?.state?.token || null;
        }
      } catch (err) {
        token = localStorage.getItem('token');
      }
      
      if (!token) {
        return;
      }
      
      isReconnecting = true
      import('../../../../src/services/socket-service').then((module) => {
        const socketService = module.default
        
        // ✅ Verificar si ya está conectado ANTES de intentar reconectar
        const currentStatus = socketService.getConnectionStatus();
        if (currentStatus === 'connected') {
          isReconnecting = false
          return
        }
        
        // ✅ Verificar si ya está intentando conectar
        if (currentStatus === 'connecting') {
          isReconnecting = false
          return
        }
        
        const sessionId = `tvdisplay-reconnect-${Date.now()}`
        socketService.connect(sessionId)
        setTimeout(() => {
          isReconnecting = false
        }, 5000)
      }).catch(error => {
        isReconnecting = false
      })
    }

    reconexionInterval = setInterval(attemptReconnect, 10000) // Reducido a 10 segundos

    return () => {
      if (reconexionInterval) {
      clearInterval(reconexionInterval)
      }
      isReconnecting = false
    }
  }, [isConnected])

  // 🎯 CONFIGURAR LISTENERS DEL WEBSOCKET
  useEffect(() => {
    if (!isConnected) {
      return
    }

    // Listener para tickets creados
    const unsubscribeTicketCreated = onTicketCreated(async (newTicket) => {
      // Cargar nombre del conductor para el nuevo ticket
      const ticketConNombre = await cargarNombreConductor(newTicket)
      
      setTickets(prev => {
        // Verificar si el ticket ya existe
        const exists = prev.some(t => t.id === newTicket.id)
        if (exists) {
          return prev.map(t => t.id === newTicket.id ? ticketConNombre : t)
        } else {
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
      // 🎯 Si el ticket está completado, removerlo de la lista
      if (updatedTicket.status === 'COMPLETED') {
        setTickets(prev => {
          return prev.filter(t => t.id !== updatedTicket.id)
        })
        setLastUpdate(new Date())
        return
      }
      
      // Cargar nombre del conductor para el ticket actualizado
      const ticketConNombre = await cargarNombreConductor(updatedTicket)
      
      setTickets(prev => {
        const exists = prev.some(t => t.id === updatedTicket.id)
        if (exists) {
          // 🎯 Detectar cambio de estado de WAITING a CALLED
          const ticketAnterior = prev.find(t => t.id === updatedTicket.id)
          if (ticketAnterior?.status === TICKET_STATUS.WAITING && 
              updatedTicket.status === TICKET_STATUS.CALLED) {
            // 🎵 Reproducir sonido si está habilitado
            if (soundEnabled) {
              playNotificationSound()
            }
            
            // 📳 Activar animación de vibración en el card
            setVibratingTickets(prev => new Set(prev).add(updatedTicket.id))
            // Remover la animación después de 3 segundos
            setTimeout(() => {
              setVibratingTickets(prev => {
                const newSet = new Set(prev)
                newSet.delete(updatedTicket.id)
                return newSet
              })
            }, 3000)
            
            // 🎬 Agregar a la cola de visualización en pantalla completa
            setDisplayQueue(prev => [...prev, ticketConNombre])
          }
          
          return prev.map(t => t.id === updatedTicket.id ? ticketConNombre : t)
        } else {
          return [ticketConNombre, ...prev]
        }
      })
      
      setLastUpdate(new Date())
    })

    // Listener para tickets llamados
    const unsubscribeTicketCalled = onTicketCalled(async (calledTicket) => {
      // Cargar nombre del conductor para el ticket llamado
      const ticketConNombre = await cargarNombreConductor(calledTicket)
      
      setTickets(prev => {
        const exists = prev.some(t => t.id === calledTicket.id)
        if (exists) {
          return prev.map(t => t.id === calledTicket.id ? ticketConNombre : t)
        } else {
          return [ticketConNombre, ...prev]
        }
      })
      
      setCalledTicket(ticketConNombre)
      setLastUpdate(new Date())
      
      // 🎵 Reproducir sonido si está habilitado
      if (soundEnabled) {
        playNotificationSound()
      }
      
      // 📳 Activar animación de vibración en el card
      setVibratingTickets(prev => new Set(prev).add(calledTicket.id))
      // Remover la animación después de 3 segundos
      setTimeout(() => {
        setVibratingTickets(prev => {
          const newSet = new Set(prev)
          newSet.delete(calledTicket.id)
          return newSet
        })
      }, 3000)
      
      // 🎬 Agregar a la cola de visualización en pantalla completa
      setDisplayQueue(prev => [...prev, ticketConNombre])
    })

    // Listener para tickets completados
    const unsubscribeTicketCompleted = onTicketCompleted(async (completedTicket) => {
      setTickets(prev => {
        return prev.filter(t => t.id !== completedTicket.id)
      })
      
      setLastUpdate(new Date())
    })

    // Listener para tickets cancelados
    const unsubscribeTicketCancelled = onTicketCancelled(async (cancelledTicket) => {
      setTickets(prev => {
        return prev.filter(t => t.id !== cancelledTicket.id)
      })
      
      setLastUpdate(new Date())
    })

    // Listener para actualizaciones de display
    const unsubscribeDisplayUpdated = onDisplayUpdated((displayData) => {
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
      unsubscribeTicketCreated()
      unsubscribeTicketUpdated()
      unsubscribeTicketCalled()
      unsubscribeTicketCompleted()
      unsubscribeTicketCancelled()
      unsubscribeDisplayUpdated()
    }
  }, [isConnected, soundEnabled, cargarNombreConductor, playNotificationSound])

  // 🎯 CARGAR TICKETS INICIALES (fallback si WebSocket no funciona)
  useEffect(() => {
    const cargarTicketsIniciales = async () => {
      try {
        setLoading(true)
        
        // 🎯 NUEVO: Usar getAllTickets() para obtener todos los tickets en una sola llamada
        const ticketsData = await ticketService.getAllTickets()
        
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
      } catch (error) {
        console.error('❌ [TVDisplay] Error cargando tickets iniciales:', error)
      } finally {
        setLoading(false)
      }
    }

    cargarTicketsIniciales()
  }, [])

  // 🎯 POLLING COMO RESPALDO (si WebSocket no está conectado)
  // ⚠️ OPTIMIZADO: Intervalo aumentado a 15 segundos para reducir carga en servidor
  useEffect(() => {
    if (!isConnected) {
      const controller = new AbortController()
      
      const interval = setInterval(async () => {
        try {
          // 🎯 NUEVO: Usar getAllTickets() en el polling también
          const ticketsData = await ticketService.getAllTickets()
          
          // Solo actualizar si hay cambios
          setTickets(prev => {
            if (prev.length !== ticketsData.length || 
                prev.some((t, i) => t.id !== ticketsData[i]?.id || t.status !== ticketsData[i]?.status)) {
              
              // 🎯 Detectar tickets que cambiaron de WAITING a CALLED
              ticketsData.forEach(ticketNuevo => {
                const ticketAnterior = prev.find(t => t.id === ticketNuevo.id)
                if (ticketAnterior?.status === TICKET_STATUS.WAITING && 
                    ticketNuevo.status === TICKET_STATUS.CALLED) {
                  // 🎵 Reproducir sonido si está habilitado
                  if (soundEnabled) {
                    playNotificationSound()
                  }
                  
                  // 📳 Activar animación de vibración en el card
                  setVibratingTickets(prev => new Set(prev).add(ticketNuevo.id))
                  // Remover la animación después de 3 segundos
                  setTimeout(() => {
                    setVibratingTickets(prev => {
                      const newSet = new Set(prev)
                      newSet.delete(ticketNuevo.id)
                      return newSet
                    })
                  }, 3000)
                  
                  // 🎬 Agregar a la cola de visualización en pantalla completa
                  // Cargar el ticket con nombre primero
                  cargarNombreConductor(ticketNuevo).then(ticketConNombre => {
                    setDisplayQueue(prev => [...prev, ticketConNombre])
                  })
                }
              })
              
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
        } catch (error: any) {
          // Ignorar errores de cancelación
          if (error?.name !== 'AbortError' && error?.code !== 'ERR_CANCELED') {
          console.error('❌ [TVDisplay] Error en polling:', error)
          }
        }
      }, 15000) // ✅ AUMENTADO: Polling cada 15 segundos (antes 5s)
      
      return () => {
        controller.abort() // ✅ Cancelar requests pendientes
        clearInterval(interval)
      }
    }
  }, [isConnected, soundEnabled, playNotificationSound])

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

  // 🎬 EFECTO PARA PROCESAR LA COLA DE VISUALIZACIÓN
  useEffect(() => {
    // Si ya hay un ticket mostrándose o la cola está vacía, no hacer nada
    if (currentDisplayTicket !== null || displayQueue.length === 0) {
      return
    }
    
    // Obtener el primer ticket de la cola
    const [nextTicket, ...remainingQueue] = displayQueue
    
    // Mostrar el ticket
    setCurrentDisplayTicket(nextTicket)
    setDisplayQueue(remainingQueue)
    
  }, [displayQueue, currentDisplayTicket])

  // 🎬 EFECTO PARA OCULTAR EL TICKET DESPUÉS DE 5 SEGUNDOS
  useEffect(() => {
    if (currentDisplayTicket === null) {
      return
    }
    
    // Ocultar después de 5 segundos
    const timeout = setTimeout(() => {
      setCurrentDisplayTicket(null)
    }, 5000)
    
    return () => {
      clearTimeout(timeout)
    }
  }, [currentDisplayTicket])



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
    vibratingTickets,
    currentDisplayTicket,
    
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
