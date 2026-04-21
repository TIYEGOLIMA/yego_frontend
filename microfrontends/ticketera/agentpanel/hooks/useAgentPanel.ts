import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { ticketService } from '../services/ticketService'
import { queueAgentService } from '../services/queueAgentService'
import { validationService } from '../services/validationService'
import { safeSetItem } from '../utils/storage'
import { Ticket } from '../types'
import { normalizeDriverName } from '../utils/utf8Decoder'
import { useSocket } from '../contexts/SocketContext'
import { getSedeActivaId } from '../../shared/utils/sedeContext'

interface UseAgentPanelReturn {
  tickets: Ticket[]
  loading: boolean
  selectedModule: number | null
  modules: any[]
  showModuleSelection: boolean
  ticketsEnProceso: Set<number>
  estaTicketEnProceso: (ticketId: number) => boolean
  ticketsEnEspera: Ticket[]
  ticketsLlamados: Ticket[]
  ticketsAtendiendo: Ticket[]
  error: string | null
  errorMessage: string
  showError: boolean
  lastUpdate: Date | null
  mostrarError: (message: string) => void
  ocultarError: () => void
  cargarTickets: () => Promise<void>
  seleccionarModulo: (moduleId: number) => Promise<void>
  mostrarSeleccionModulo: () => void
  ocultarSeleccionModulo: () => void
  llamarTicket: (ticket: Ticket) => Promise<void>
  atenderTicket: (ticket: Ticket) => Promise<void>
  completarTicket: (ticket: Ticket, notes?: string) => Promise<void>
  cancelarTicket: (ticket: Ticket) => Promise<void>
  marcarTicketEnProceso: (ticketId: number) => void
  desmarcarTicketEnProceso: (ticketId: number) => void
  liberarModulo: () => Promise<void>
  actualizarModulos: () => Promise<void>
  actualizarModulosDesdeLista: (modules: any[]) => void
}

export const useAgentPanel = (sedePickerKey?: number): UseAgentPanelReturn => {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedModule, setSelectedModule] = useState<number | null>(null)
  const [modules, setModules] = useState<any[]>([])
  const [showModuleSelection, setShowModuleSelection] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [showError, setShowError] = useState(false)

  const { isConnected, subscribe } = useSocket()
  const hasLoadedModules = useRef(false)
  const hasRecuperadoModulo = useRef(false)
  const isInicializando = useRef(false)

  const getCurrentUser = useCallback(() => {
    try {
      const authStorageData = localStorage.getItem('auth-storage')
      if (!authStorageData) return null
      
      const parsedData = JSON.parse(authStorageData)
      const user = parsedData?.state?.user || null
      
      if (!user?.id) return null
      return user
    } catch (error) {
      console.error('[useAgentPanel] Error obteniendo usuario:', error)
      return null
    }
  }, [])

  const obtenerNombreConductorAsync = useCallback(async (ticket: any) => {
    if (!ticket.licenseNumber || (ticket.driverName && !ticket.driverName.includes('Conductor:'))) {
      return Promise.resolve()
    }

    try {
      const cache = JSON.parse(localStorage.getItem('driver_names_cache') || '{}')
      if (cache[ticket.licenseNumber]?.name) {
        setTickets(prevTickets => 
          prevTickets.map(t => 
            t.id === ticket.id 
              ? { ...t, driverName: cache[ticket.licenseNumber].name }
              : t
          )
        )
        return Promise.resolve()
      }

      const { validationService } = await import('../services/validationService')
      const driverData = await validationService.getDriverByPhonePublic(ticket.licenseNumber)
      
      if (driverData?.full_name) {
        const normalizedName = normalizeDriverName(driverData.full_name)
        const newCache = { ...cache }
        newCache[ticket.licenseNumber] = { name: normalizedName, timestamp: Date.now() }
        localStorage.setItem('driver_names_cache', JSON.stringify(newCache))
        setTickets(prevTickets => 
          prevTickets.map(t => 
            t.id === ticket.id 
              ? { ...t, driverName: normalizedName }
              : t
          )
        )
        
        return Promise.resolve()
      } else {
        return Promise.resolve()
      }
    } catch (error) {
      return Promise.reject(error)
    }
  }, [])
  
  useEffect(() => {
    if (!isConnected) {
      return
    }
    
    
    const subscriptions: any[] = []
    const ticketsSub = subscribe('/topic/tickets', (message: any) => {
      if (!message || message.type === 'MODULOS_ACTUALIZADOS' || (!message.id && !message.ticketId && !message.ticketNumber)) {
        return;
      }
      
      setTickets(prevTickets => {
        if (message.status === 'WAITING' && (message.moduleId === null || message.moduleId === undefined) && !prevTickets.some(t => t.id === message.id)) {
          const newTicket = {
            ...message,
            _lastUpdated: Date.now()
          }
          if (newTicket.licenseNumber && !newTicket.driverName) {
            obtenerNombreConductorAsync(newTicket)
          }
          
          return [...prevTickets, newTicket]
        }
        if (prevTickets.some(t => t.id === message.id || t.id === message.ticketId)) {
          const updatedTickets = prevTickets.map(t => {
            if (t.id === message.id || t.id === message.ticketId) {
              const updatedTicket = {
                ...t,
                ...message,
                _lastUpdated: Date.now()
              }
              
              return updatedTicket
            }
            return t
          })
          
          return updatedTickets
        }
        
        return prevTickets
      })
      
    })

    const ticketCalledSub = subscribe('/topic/ticket-called', (message: any) => {
      if (!message || message.type === 'MODULOS_ACTUALIZADOS' || !message.ticketId) {
        return;
      }
      
      setTickets(prevTickets => {
        const updatedTickets = prevTickets.map(t => {
          if (t.id === message.ticketId) {
            const updatedTicket = {
              ...t,
              status: 'CALLED' as const,
              userId: message.userId,
              moduleId: message.moduleId,
              calledAt: message.calledAt || new Date().toISOString(),
              _lastUpdated: Date.now()
            }
            if (!updatedTicket.driverName && updatedTicket.licenseNumber) {
              obtenerNombreConductorAsync(updatedTicket)
            }
            
            return updatedTicket
          }
          return t
        })
        
        return updatedTickets
      })
    })
    
    const ticketStartedSub = subscribe('/topic/ticket-started', (message: any) => {
      if (!message || message.type === 'MODULOS_ACTUALIZADOS' || !message.ticketId) {
        return;
      }
      
      setTickets(prevTickets => {
        const updatedTickets = prevTickets.map(t => {
          if (t.id === message.ticketId) {
            return {
              ...t,
              status: 'IN_PROGRESS' as const,
              userId: message.userId,
              moduleId: message.moduleId,
              startedAt: message.startedAt || new Date().toISOString(),
              _lastUpdated: Date.now()
            }
          }
          return t
        })
        
        return updatedTickets
      })
    })
    
    const ticketCompletedSub = subscribe('/topic/ticket-completed', (message: any) => {
      if (!message || message.type === 'MODULOS_ACTUALIZADOS' || !message.ticketId) {
        return;
      }
      
      setTickets(prevTickets => {
        return prevTickets.filter(t => t.id !== message.ticketId)
      })
    })
    
    const newTicketSub = subscribe('/topic/new-ticket', (message: any) => {
      if (!message || message.type === 'MODULOS_ACTUALIZADOS' || (!message.id && !message.ticketNumber)) {
        return;
      }
      if ((message.status === 'WAITING' && (message.moduleId === null || message.moduleId === undefined)) || 
          message.moduleId === selectedModule) {
        setTickets(prevTickets => {
          const exists = prevTickets.some(t => t.id === message.id)
          if (!exists) {
            const newTicket = {
              ...message,
              _lastUpdated: Date.now()
            }
            if (newTicket.licenseNumber && !newTicket.driverName) {
              obtenerNombreConductorAsync(newTicket)
            }
            
            const updatedTickets = [...prevTickets, newTicket]
            return updatedTickets
          }
          return prevTickets
        })
      }
    })
    if (ticketsSub) subscriptions.push(ticketsSub)
    if (ticketCalledSub) subscriptions.push(ticketCalledSub)
    if (ticketStartedSub) subscriptions.push(ticketStartedSub)
    if (ticketCompletedSub) subscriptions.push(ticketCompletedSub)
    if (newTicketSub) subscriptions.push(newTicketSub)
    return () => {
      subscriptions.forEach(sub => {
        try {
          if (sub && typeof sub.unsubscribe === 'function') {
            sub.unsubscribe()
          }
        } catch {
          /* ignore unsubscribe errors */
        }
      })
    }
  }, [isConnected, selectedModule, obtenerNombreConductorAsync])
  const [ticketsEnProceso, setTicketsEnProceso] = useState<Set<number>>(new Set())

  const marcarTicketEnProceso = useCallback((ticketId: number) => {
    setTicketsEnProceso(prev => new Set(prev).add(ticketId))
  }, [])

  const desmarcarTicketEnProceso = useCallback((ticketId: number) => {
    setTicketsEnProceso(prev => {
      const newSet = new Set(prev)
      newSet.delete(ticketId)
      return newSet
    })
  }, [])

  const estaTicketEnProceso = useCallback((ticketId: number) => {
    return ticketsEnProceso.has(ticketId)
  }, [ticketsEnProceso])

  const mostrarError = useCallback((message: string) => {
    setErrorMessage(message)
    setShowError(true)
    setTimeout(() => setShowError(false), 3000)
  }, [])
  const cargarTickets = useCallback(async (esConsultaAutomatica = false) => {
    if (!selectedModule) {
      return
    }
    
    try {
      const todosLosTicketsBackend = await ticketService.getAllTickets()
      const currentUser = getCurrentUser()
      const currentAgentId = currentUser?.id || null
      const ticketsRelevantes = todosLosTicketsBackend.filter(ticket => {
        if (ticket.status === 'WAITING' && (ticket.moduleId === null || ticket.moduleId === undefined)) {
          return true
        }
        if (ticket.moduleId === selectedModule && (ticket.status === 'CALLED' || ticket.status === 'IN_PROGRESS')) {
          return true
        }
        if (currentAgentId && ticket.agentId === currentAgentId && ticket.moduleId === selectedModule && (ticket.status === 'CALLED' || ticket.status === 'IN_PROGRESS')) {
          return true
        }
        return false
      })
      const todosLosTickets = ticketsRelevantes.map(ticket => {
        if (ticket.status === 'WAITING') {
          const processedTicket = {
            ...ticket,
            userId: null,
          }
          return processedTicket
        }
        const processedTicket = {
          ...ticket
        }
        return processedTicket
      })

      if (!esConsultaAutomatica) {
        if (!sessionStorage.getItem('cache_cleaned')) {
          try {
            const cache = JSON.parse(localStorage.getItem('driver_names_cache') || '{}')
            const cleanedCache: any = {}
            let hasCorruption = false
            
            for (const [key, value] of Object.entries(cache)) {
              if (value && typeof value === 'object' && (value as any).name && typeof (value as any).name === 'string') {
                cleanedCache[key] = value
              } else {
                hasCorruption = true
              }
            }
            
            if (hasCorruption) {
              localStorage.setItem('driver_names_cache', JSON.stringify(cleanedCache))
            }
            
            sessionStorage.setItem('cache_cleaned', 'true')
          } catch (error) {
            localStorage.removeItem('driver_names_cache')
          }
        }
      }

      const ticketsConNombres = await Promise.all(
        todosLosTickets.map(async (ticket) => {
          if (ticket.driverName) {
            return ticket
          }
          
          if (!ticket.licenseNumber) {
            return ticket
          }
          
          try {
            try {
              const cache = JSON.parse(localStorage.getItem('driver_names_cache') || '{}')
              const cacheKeys = [
                ticket.licenseNumber,
                ticket.licenseNumber.startsWith('+51') ? ticket.licenseNumber : `+51${ticket.licenseNumber}`,
                ticket.licenseNumber.startsWith('+51') ? ticket.licenseNumber.substring(3) : ticket.licenseNumber,
                ticket.licenseNumber.replace(/[\s\-\(\)]/g, '')
              ]
              
              for (const key of cacheKeys) {
                if (cache[key] && cache[key].name) {
                  return {
                    ...ticket,
                    driverName: cache[key].name
                  }
                }
              }
            } catch (error) {
              /* ignore cache errors */
            }
            let phoneToSearch = ticket.licenseNumber.trim()
            const phoneVariants = []
            phoneVariants.push(phoneToSearch)
            const cleanPhone = phoneToSearch.replace(/[\s\-\(\)]/g, '')
            if (cleanPhone !== phoneToSearch) {
              phoneVariants.push(cleanPhone)
            }
            if (!cleanPhone.startsWith('+51') && cleanPhone.length === 9) {
              phoneVariants.push(`+51${cleanPhone}`)
            }
            if (cleanPhone.startsWith('+51')) {
              phoneVariants.push(cleanPhone.substring(3))
            }
            if (/^\d{9}$/.test(cleanPhone)) {
              phoneVariants.push(`+51${cleanPhone}`)
            }
            if (/^9\d{8}$/.test(cleanPhone)) {
              phoneVariants.push(`+51${cleanPhone}`)
            }
            const uniqueVariants = [...new Set(phoneVariants)]
            
            let driverData = null
            let successfulPhone = null
            for (const phoneVariant of uniqueVariants) {
              if (!phoneVariant) continue
              
              try {
                driverData = await validationService.getDriverByPhonePublic(phoneVariant)
                if (driverData?.full_name) {
                  successfulPhone = phoneVariant
                  break
                }
              } catch (error) {
                continue
              }
            }
            
            if (driverData?.full_name && successfulPhone) {
              const normalizedName = normalizeDriverName(driverData.full_name)
              try {
                const cache = JSON.parse(localStorage.getItem('driver_names_cache') || '{}')
                cache[successfulPhone] = { name: normalizedName, timestamp: Date.now() }
                cache[ticket.licenseNumber] = { name: normalizedName, timestamp: Date.now() }
                localStorage.setItem('driver_names_cache', JSON.stringify(cache))
              } catch (error) {
                /* ignore cache errors */
              }
              
              return {
                ...ticket,
                driverName: normalizedName
              }
            } else {
              return {
                ...ticket,
                driverName: `Conductor: ${ticket.licenseNumber}`
              }
            }
          } catch (error) {
          }
          
          return ticket
        })
      )
      setTickets(ticketsConNombres)
      const ticketsSinNombre = ticketsConNombres.filter(ticket => 
        ticket.licenseNumber && 
        (!ticket.driverName || ticket.driverName.includes('Conductor:'))
      )
      
      if (ticketsSinNombre.length > 0) {
        Promise.all(
          ticketsSinNombre.map(ticket => obtenerNombreConductorAsync(ticket))
        ).catch(() => {
        })
      }
      
    } catch (error: any) {
      console.error('[AgentPanel] Error cargando tickets del backend:', error)
      if (error?.response?.status === 401) {
        mostrarError('Error de autenticación. Por favor, inicie sesión nuevamente.')
        safeSetItem('selectedModule', '')
        setTickets([])
        window.location.href = '/login'
        return
      }
      
      mostrarError('Error al cargar tickets del backend')
    }
  }, [selectedModule, mostrarError, getCurrentUser])

  const llamarTicket = useCallback(async (ticket: Ticket) => {
    if (!selectedModule) {
      mostrarError('Debe seleccionar un módulo primero')
      return
    }
    
    try {
      const currentUser = getCurrentUser()
      if (!currentUser?.id) {
        mostrarError('No se pudo identificar el usuario')
        return
      }
      const userId = currentUser.id
      const updatedTicket = await ticketService.callTicket(ticket.id, userId, selectedModule)
      setTickets(prevTickets => {
        return prevTickets.map(t => {
          if (t.id === ticket.id) {
            const ticketActualizado = {
              ...t,
              ...updatedTicket,
              status: 'CALLED' as const,
              driverName: t.driverName || updatedTicket.driverName,
              _lastUpdated: Date.now()
            }
            if (!ticketActualizado.driverName && ticketActualizado.licenseNumber) {
              obtenerNombreConductorAsync(ticketActualizado)
            }

            return ticketActualizado
          }
          return t
        })
      })
      
    } catch (error) {
      console.error('[AgentPanel] Error llamando ticket:', error)
      mostrarError('Error al llamar el ticket')
    }
  }, [selectedModule, mostrarError, getCurrentUser])

  const atenderTicket = useCallback(async (ticket: Ticket) => {
    if (!selectedModule) {
      mostrarError('Debes seleccionar un módulo primero')
      return
    }

    try {
      marcarTicketEnProceso(ticket.id)
      const currentUser = getCurrentUser()
      const agentId = ticket.userId || currentUser?.id
      
      if (!agentId) {
        mostrarError('No se pudo identificar el agente. Por favor, inicie sesión nuevamente.')
        return
      }
      
      await ticketService.startTicket(ticket.id, agentId)
      setTickets(prev => {
        const updatedTickets = prev.map(t => {
          if (t.id === ticket.id) {
            return {
              ...t,
              status: 'IN_PROGRESS' as const,
              startedAt: new Date().toISOString(),
              _lastUpdated: Date.now()
            }
          }
          return t
        })
        
        return updatedTickets
      })
      
    } catch (error: any) {
      console.error('Error atendiendo ticket:', error)
      mostrarError(error.response?.data?.message || 'Error al atender el ticket')
      setTickets(prev => prev.map(t => 
        t.id === ticket.id 
          ? { ...t, status: 'CALLED', startedAt: undefined }
          : t
      ))
    } finally {
      desmarcarTicketEnProceso(ticket.id)
    }
  }, [selectedModule, marcarTicketEnProceso, desmarcarTicketEnProceso, mostrarError, getCurrentUser])

  const completarTicket = useCallback(async (ticket: Ticket, notes?: string) => {
    if (!selectedModule) {
      mostrarError('Debe seleccionar un módulo primero')
      return
    }
    
    try {
      const currentUser = getCurrentUser()
      const agentId = ticket.userId || currentUser?.id
      
      if (!agentId) {
        mostrarError('No se pudo identificar el agente. Por favor, inicie sesión nuevamente.')
        return
      }
      await ticketService.completeTicket(ticket.id, agentId, notes)
      setTickets(prevTickets => {
        const updatedTickets = prevTickets.filter(t => t.id !== ticket.id)
        
        return updatedTickets
      })
      
      
    } catch (error) {
      console.error('[AgentPanel] Error completando ticket:', error)
      mostrarError('Error al completar el ticket')
    }
  }, [selectedModule, mostrarError, getCurrentUser])

  const cancelarTicket = useCallback(async (ticket: Ticket) => {
    if (!selectedModule) {
      mostrarError('Debe seleccionar un módulo primero')
      return
    }
    
    try {
      const currentUser = getCurrentUser()
      const agentId = ticket.userId || currentUser?.id
      
      if (!agentId) {
        mostrarError('No se pudo identificar el agente. Por favor, inicie sesión nuevamente.')
        return
      }
      
      await ticketService.cancelTicket(ticket.id, agentId)
      await cargarTickets()
      
    } catch (error) {
      console.error('[AgentPanel] Error cancelando ticket:', error)
      mostrarError('Error al cancelar el ticket')
    }
  }, [selectedModule, mostrarError, cargarTickets])

  const handleModuleSelection = useCallback(async (moduleId: number) => {
    try {
      const selectedModuleData = modules.find(m => m.id === moduleId)
      if (!selectedModuleData) {
        mostrarError('Módulo no encontrado')
        return
      }
      
      hasRecuperadoModulo.current = true
      setTickets([])
      setSelectedModule(moduleId)
      setShowModuleSelection(false)
      safeSetItem('selectedModule', moduleId.toString())
      safeSetItem('selectedModuleName', selectedModuleData.name)
      await cargarTickets()
      mostrarError(`Módulo "${selectedModuleData.name}" asignado correctamente`)
    } catch (error: any) {
      console.error('Error seleccionando módulo:', error)
      
      if (error?.response?.status === 401) {
        mostrarError('Error de autenticación. Por favor, inicie sesión nuevamente.')
        safeSetItem('selectedModule', '')
        setTickets([])
        setModules([])
        window.location.href = '/login'
        return
      }
      
      mostrarError('Error al seleccionar el módulo. Intente nuevamente.')
    }
  }, [modules, cargarTickets, mostrarError])


  useEffect(() => {
    if (sedePickerKey !== undefined && sedePickerKey > 0) {
      hasRecuperadoModulo.current = false
      hasLoadedModules.current = false
      isInicializando.current = false
      setSelectedModule(null)
      setModules([])
      setShowModuleSelection(false)
      setLoading(true)
    }
  }, [sedePickerKey])

  useEffect(() => {
    if (hasRecuperadoModulo.current || selectedModule || isInicializando.current) {
      return
    }

    isInicializando.current = true

    const inicializar = async () => {
      try {
        const user = getCurrentUser()
        if (!user?.id) {
          setLoading(false)
          isInicializando.current = false
          return
        }
        
        const { moduloAtencionService } = await import('../services/moduloAtencionService')
        const respuesta = await moduloAtencionService.verificarModuloOListarDisponibles(
          user.id,
          getSedeActivaId()
        )
        
        if (Array.isArray(respuesta)) {
          if (respuesta.length > 0) {
            setModules(respuesta)
            setShowModuleSelection(true)
            hasLoadedModules.current = true
          } else {
            setShowModuleSelection(true)
            mostrarError('No hay módulos disponibles')
          }
        } else if (respuesta && typeof respuesta === 'object' && 'tieneModuloAsignado' in respuesta) {
          const respuestaObj = respuesta as any
          if (respuestaObj.tieneModuloAsignado && respuestaObj.moduloAsignado?.moduleId) {
            const moduloId = respuestaObj.moduloAsignado.moduleId
            setSelectedModule(moduloId)
            setShowModuleSelection(false)
            safeSetItem('selectedModule', moduloId.toString())
            safeSetItem('selectedModuleName', `Módulo ${moduloId}`)
            
            if (respuestaObj.modulosDisponibles) {
              setModules(respuestaObj.modulosDisponibles)
              hasLoadedModules.current = true
            }
          } else {
            setModules([])
            setShowModuleSelection(true)
            hasLoadedModules.current = true
          }
        } else {
          setShowModuleSelection(true)
          mostrarError('No hay módulos disponibles')
        }
        
        hasRecuperadoModulo.current = true
        
      } catch (error: any) {
        console.error('Error en inicialización:', error)
        
        if (error?.response?.status === 401) {
          mostrarError('Error de autenticación. Por favor, inicie sesión nuevamente.')
          window.location.href = '/login'
          return
        }
        
        mostrarError('Error al inicializar. Intente nuevamente.')
        setShowModuleSelection(true)
      } finally {
        setLoading(false)
        isInicializando.current = false
      }
    }

    inicializar()
  }, [getCurrentUser, mostrarError, selectedModule, sedePickerKey])

  useEffect(() => {
    if (selectedModule) {
      cargarTickets()
    }
  }, [selectedModule]) 

  const ticketsEnEspera = useMemo(() => {
    const ticketsWaiting = tickets.filter(t => t.status === 'WAITING')
    const ticketsInProgress = tickets.filter(t => t.status === 'IN_PROGRESS')
    const ticketsOrdenados = [...ticketsWaiting].sort((a, b) => {
      const fechaA = a.createdAt ? new Date(a.createdAt).getTime() : a.id
      const fechaB = b.createdAt ? new Date(b.createdAt).getTime() : b.id
      return fechaA - fechaB
    })
    if (ticketsInProgress.length > 0) {
      return ticketsOrdenados.slice(0, 1)
    }
    return ticketsOrdenados
  }, [tickets])

  const ticketsLlamados = useMemo(() => {
    return tickets.filter(t => t.status === 'CALLED' && t.moduleId === selectedModule)
  }, [tickets, selectedModule])

  const ticketsAtendiendo = useMemo(() => {
    return tickets.filter(t => t.status === 'IN_PROGRESS' && t.moduleId === selectedModule)
  }, [tickets, selectedModule])

  const liberarModulo = useCallback(async () => {
    try {
      const user = getCurrentUser()
      if (!user?.id) {
        mostrarError('No se pudo obtener el usuario')
        return
      }

      await queueAgentService.liberarModuloDelUsuario()
      setSelectedModule(null)
      setTickets([])
      safeSetItem('selectedModule', '')
      safeSetItem('selectedModuleName', '')
      
      try {
        const authStorageData = localStorage.getItem('auth-storage')
        if (authStorageData) {
          const parsedData = JSON.parse(authStorageData)
          const updatedAuthStorage = {
            ...parsedData,
            state: {
              ...parsedData.state,
              user: {
                ...parsedData.state.user,
                moduleId: null
              }
            }
          }
          localStorage.setItem('auth-storage', JSON.stringify(updatedAuthStorage))
        }
      } catch (error) {
        console.error('Error actualizando auth-storage:', error)
      }
      
      setShowModuleSelection(true)
    } catch (error: any) {
      console.error('Error liberando módulo:', error)
      mostrarError('Error al liberar el módulo. Intente nuevamente.')
    }
  }, [mostrarError, getCurrentUser])

  const actualizarModulos = useCallback(async () => {
    try {
      const user = getCurrentUser()
      if (!user?.id) {
        console.error('No se pudo obtener el usuario para actualizar módulos')
        return
      }

      const { moduloAtencionService } = await import('../services/moduloAtencionService')
      const respuesta = await moduloAtencionService.verificarModuloOListarDisponibles(
        user.id,
        getSedeActivaId()
      )
      
      let modulosParaActualizar: any[] = []
      if (Array.isArray(respuesta)) {
        modulosParaActualizar = respuesta
      } else if (respuesta && typeof respuesta === 'object' && 'modulosDisponibles' in respuesta) {
        modulosParaActualizar = (respuesta as any).modulosDisponibles || []
      }
      
      if (modulosParaActualizar.length > 0) {
        setModules(modulosParaActualizar)
        hasLoadedModules.current = true
      } else {
        setModules([])
      }
    } catch (error) {
      console.error('Error actualizando módulos:', error)
    }
  }, [getCurrentUser])

  const actualizarModulosDesdeLista = useCallback((modules: any[]) => {
    setModules(modules)
    hasLoadedModules.current = true
  }, [])

  return {
    tickets,
    loading,
    selectedModule,
    modules,
    showModuleSelection,
    ticketsEnProceso,
    estaTicketEnProceso,
    ticketsEnEspera,
    ticketsLlamados,
    ticketsAtendiendo,
    error: null,
    errorMessage,
    showError,
    lastUpdate: null,
    mostrarError,
    ocultarError: () => setShowError(false),
    cargarTickets,
    seleccionarModulo: handleModuleSelection,
    mostrarSeleccionModulo: () => setShowModuleSelection(true),
    ocultarSeleccionModulo: () => setShowModuleSelection(false),
    llamarTicket,
    atenderTicket,
    completarTicket,
    cancelarTicket,
    marcarTicketEnProceso,
    desmarcarTicketEnProceso,
    liberarModulo,
    actualizarModulos,
    actualizarModulosDesdeLista
  }
}
