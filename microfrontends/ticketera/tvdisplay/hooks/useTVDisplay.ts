import { useState, useEffect, useCallback, useMemo } from 'react'
import { Ticket } from '../types'
import { ticketService, validationService } from '../services'
import { useAudio, normalizeDriverName } from '../utils/audioUtils'
import { TICKET_STATUS } from '../../shared'
import { useTVDisplayWebSocket } from './useWebSocket'

export const useTVDisplay = () => {
  const [tickets, setTickets] = useState<Ticket[]>([])
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

  const cargarNombreConductor = useCallback(async (ticket: Ticket): Promise<Ticket> => {
    if (ticket.driverName) {
      return ticket
    }
    
    if (!ticket.licenseNumber) {
      return ticket
    }
    
    try {
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
    } catch {
      // ignore
    }
    
    return ticket
  }, [])

  useEffect(() => {
    if (!isConnected) {
      return
    }

    const unsubscribeTicketCreated = onTicketCreated(async (newTicket) => {
      const ticketConNombre = await cargarNombreConductor(newTicket)
      
      setTickets(prev => {
        const exists = prev.some(t => t.id === newTicket.id)
        if (exists) {
          return prev.map(t => t.id === newTicket.id ? ticketConNombre : t)
        } else {
          return [ticketConNombre, ...prev]
        }
      })
      
      setLastUpdate(new Date())
      
      if (soundEnabled) {
        playNotificationSound()
      }
    })

    const unsubscribeTicketUpdated = onTicketUpdated(async (updatedTicket) => {
      if (updatedTicket.status === 'COMPLETED') {
        setTickets(prev => {
          return prev.filter(t => t.id !== updatedTicket.id)
        })
        setLastUpdate(new Date())
        return
      }
      
      const ticketConNombre = await cargarNombreConductor(updatedTicket)
      
      setTickets(prev => {
        const exists = prev.some(t => t.id === updatedTicket.id)
        if (exists) {
          const ticketAnterior = prev.find(t => t.id === updatedTicket.id)
          if (ticketAnterior?.status === TICKET_STATUS.WAITING && 
              updatedTicket.status === TICKET_STATUS.CALLED) {
            if (soundEnabled) {
              playNotificationSound()
            }
            
            setVibratingTickets(prev => new Set(prev).add(updatedTicket.id))
            setTimeout(() => {
              setVibratingTickets(prev => {
                const newSet = new Set(prev)
                newSet.delete(updatedTicket.id)
                return newSet
              })
            }, 3000)
            
            setDisplayQueue(prev => [...prev, ticketConNombre])
          }
          
          return prev.map(t => t.id === updatedTicket.id ? ticketConNombre : t)
        } else {
          return [ticketConNombre, ...prev]
        }
      })
      
      setLastUpdate(new Date())
    })

    const unsubscribeTicketCalled = onTicketCalled(async (calledTicket) => {
      const ticketConNombre = await cargarNombreConductor(calledTicket)
      
      setTickets(prev => {
        const exists = prev.some(t => t.id === calledTicket.id)
        if (exists) {
          return prev.map(t => t.id === calledTicket.id ? ticketConNombre : t)
        } else {
          return [ticketConNombre, ...prev]
        }
      })
      
      setLastUpdate(new Date())
      
      if (soundEnabled) {
        playNotificationSound()
      }
      
      setVibratingTickets(prev => new Set(prev).add(calledTicket.id))
      setTimeout(() => {
        setVibratingTickets(prev => {
          const newSet = new Set(prev)
          newSet.delete(calledTicket.id)
          return newSet
        })
      }, 3000)
      
      setDisplayQueue(prev => [...prev, ticketConNombre])
    })

    const unsubscribeTicketCompleted = onTicketCompleted(async (completedTicket) => {
      setTickets(prev => {
        return prev.filter(t => t.id !== completedTicket.id)
      })
      
      setLastUpdate(new Date())
    })

    const unsubscribeTicketCancelled = onTicketCancelled(async (cancelledTicket) => {
      setTickets(prev => {
        return prev.filter(t => t.id !== cancelledTicket.id)
      })
      
      setLastUpdate(new Date())
    })

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

    return () => {
      unsubscribeTicketCreated()
      unsubscribeTicketUpdated()
      unsubscribeTicketCalled()
      unsubscribeTicketCompleted()
      unsubscribeTicketCancelled()
      unsubscribeDisplayUpdated()
    }
  }, [isConnected, soundEnabled, cargarNombreConductor, playNotificationSound])

  useEffect(() => {
    const cargarTicketsIniciales = async () => {
      try {
        setLoading(true)
        
        const ticketsData = await ticketService.getAllTickets()
        
        const ticketsConNombres = await Promise.all(
          ticketsData.map(ticket => cargarNombreConductor(ticket))
        )
        
        setTickets(ticketsConNombres)
        setLastUpdate(new Date())
        
        const statsData = {
          enEspera: ticketsData.filter(t => t.status === TICKET_STATUS.WAITING).length,
          llamados: ticketsData.filter(t => t.status === TICKET_STATUS.CALLED).length,
          atendidos: ticketsData.filter(t => t.status === TICKET_STATUS.IN_PROGRESS).length,
          completados: ticketsData.filter(t => t.status === TICKET_STATUS.COMPLETED).length
        }
        setStats(statsData)
        setLastStatsUpdate(new Date())
      } catch (error) {
        console.error('[TVDisplay] Error cargando tickets iniciales:', error)
      } finally {
        setLoading(false)
      }
    }

    cargarTicketsIniciales()
  }, [])

  useEffect(() => {
    if (!isConnected) {
      const controller = new AbortController()
      
      const interval = setInterval(async () => {
        try {
          const ticketsData = await ticketService.getAllTickets()
          
          setTickets(prev => {
            if (prev.length !== ticketsData.length || 
                prev.some((t, i) => t.id !== ticketsData[i]?.id || t.status !== ticketsData[i]?.status)) {
              
              ticketsData.forEach(ticketNuevo => {
                const ticketAnterior = prev.find(t => t.id === ticketNuevo.id)
                if (ticketAnterior?.status === TICKET_STATUS.WAITING && 
                    ticketNuevo.status === TICKET_STATUS.CALLED) {
                  if (soundEnabled) {
                    playNotificationSound()
                  }
                  
                  setVibratingTickets(prev => new Set(prev).add(ticketNuevo.id))
                  setTimeout(() => {
                    setVibratingTickets(prev => {
                      const newSet = new Set(prev)
                      newSet.delete(ticketNuevo.id)
                      return newSet
                    })
                  }, 3000)
                  
                  cargarNombreConductor(ticketNuevo).then(ticketConNombre => {
                    setDisplayQueue(prev => [...prev, ticketConNombre])
                  })
                }
              })
              
              Promise.all(ticketsData.map(ticket => cargarNombreConductor(ticket)))
                .then(ticketsConNombres => {
                  setTickets(ticketsConNombres)
                })
              return prev
            }
            return prev
          })
          
          setLastUpdate(new Date())
        } catch (error: any) {
          if (error?.name !== 'AbortError' && error?.code !== 'ERR_CANCELED') {
            console.error('[TVDisplay] Error en polling:', error)
          }
        }
      }, 15000)
      
      return () => {
        controller.abort()
        clearInterval(interval)
      }
    }
  }, [isConnected, soundEnabled, playNotificationSound])

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
    } catch {
      return new Date().toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }
  }, [])

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
    } catch {
      return new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
  }, [])

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => !prev)
  }, [])

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


  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => {
      clearInterval(timeInterval)
    }
  }, [])

  useEffect(() => {
    const estadisticasCalculadas = {
      enEspera: ticketsEnEspera.length,
      llamados: ticketsLlamados.length,
      atendidos: ticketsEnAtencion.length,
      completados: stats.completados
    }
    setStats(estadisticasCalculadas)
    setLastStatsUpdate(new Date())
  }, [ticketsEnEspera.length, ticketsLlamados.length, ticketsEnAtencion.length, stats.completados])

  useEffect(() => {
    if (currentDisplayTicket !== null || displayQueue.length === 0) {
      return
    }
    
    const [nextTicket, ...remainingQueue] = displayQueue
    
    setCurrentDisplayTicket(nextTicket)
    setDisplayQueue(remainingQueue)
    
  }, [displayQueue, currentDisplayTicket])

  useEffect(() => {
    if (currentDisplayTicket === null) {
      return
    }
    
    const timeout = setTimeout(() => {
      setCurrentDisplayTicket(null)
    }, 5000)
    
    return () => {
      clearTimeout(timeout)
    }
  }, [currentDisplayTicket])



  return {
    currentTime,
    loading,
    soundEnabled,
    lastUpdate,
    stats,
    lastStatsUpdate,
    maxTicketsToShow,
    vibratingTickets,
    currentDisplayTicket,

    ticketsEnEspera,
    ticketsLlamados,
    ticketsEnAtencion,
    currentTickets,
    isConnected,
    connectionStatus,

    formatearHora,
    formatearFecha,
    toggleSound
  }
}
