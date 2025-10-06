import { useState, useEffect, useCallback, useMemo } from 'react'
import { ticketService } from '../services/ticketService'
import { queueAgentService } from '../services/queueAgentService'
import { validationService } from '../services/validationService'
import { safeGetItem, safeSetItem } from '../utils/storage'
import { Ticket } from '../types'
import { normalizeDriverName } from '../utils/utf8Decoder'
import { useSocket } from '../contexts/SocketContext'

interface UseAgentPanelReturn {
  // Estados básicos
  tickets: Ticket[]
  loading: boolean
  selectedModule: number | null
  modules: any[]
  showModuleSelection: boolean
  
  // 🎯 NUEVO: Estado de tickets en proceso
  ticketsEnProceso: Set<number>
  estaTicketEnProceso: (ticketId: number) => boolean
  
  // Estados derivados (SIMPLE)
  ticketsEnEspera: Ticket[]
  ticketsLlamados: Ticket[]
  ticketsAtendiendo: Ticket[]
  
  // Estados de error
  error: string | null
  errorMessage: string
  showError: boolean
  
  // Estados de actualización
  lastUpdate: Date | null
  
  // Acciones básicas
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
  refreshModules: () => Promise<void>
  
  // 🎯 NUEVO: Funciones de manejo de loading
  marcarTicketEnProceso: (ticketId: number) => void
  desmarcarTicketEnProceso: (ticketId: number) => void
  
  // 🆕 Funciones de verificación automática
  verificarModuloAsignadoAutomaticamente: () => Promise<void>
  
}

export const useAgentPanel = (): UseAgentPanelReturn => {
  // Estados básicos
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedModule, setSelectedModule] = useState<number | null>(null)
  const [modules, setModules] = useState<any[]>([])
  const [showModuleSelection, setShowModuleSelection] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [showError, setShowError] = useState(false)
  
  
  // 🎯 WebSocket para AgentPanel
  const { client, isConnected, subscribe } = useSocket()
  
  // 🎯 SUSCRIPCIONES DE WEBSOCKET PARA ACTUALIZACIONES EN TIEMPO REAL
  useEffect(() => {
    if (!isConnected) {
      // console.log('🔌 [AgentPanel] WebSocket no conectado - esperando conexión...')
      return
    }
    
    console.log('🔌 [AgentPanel] Configurando suscripciones WebSocket (módulo actual:', selectedModule, ')')
    console.log('✅ [AgentPanel] WebSocket conectado - creando suscripciones para TODOS los tickets')
    
    const subscriptions: any[] = []
    
    // 🎯 SUSCRIPCIÓN PRINCIPAL: Escuchar todos los eventos de tickets
    const ticketsSub = subscribe('/topic/tickets', (message: any) => {
      console.log('📊 [WebSocket] Evento de tickets recibido:', message)
      
      setTickets(prevTickets => {
        // Si es un nuevo ticket WAITING sin módulo (moduleId = null), agregarlo (visible para todos los módulos)
        if (message.status === 'WAITING' && (message.moduleId === null || message.moduleId === undefined) && !prevTickets.some(t => t.id === message.id)) {
          console.log('🆕 [WebSocket] Agregando nuevo ticket WAITING:', message.ticketNumber)
          console.log('🆕 [WebSocket] Datos del nuevo ticket:', {
            ticketNumber: message.ticketNumber,
            licenseNumber: message.licenseNumber,
            driverName: message.driverName,
            optionId: message.optionId,
            status: message.status
          })
          
          // Conservar TODA la información del ticket nuevo
          const newTicket = {
            ...message, // Conservar toda la información del mensaje
            _lastUpdated: Date.now()
          }
          
          // 🎯 OBTENER NOMBRE DEL CONDUCTOR SI NO LO TIENE
          if (newTicket.licenseNumber && !newTicket.driverName) {
            obtenerNombreConductorAsync(newTicket)
          }
          
          return [...prevTickets, newTicket]
        }
        
        // Si es una actualización de ticket existente
        if (prevTickets.some(t => t.id === message.id || t.id === message.ticketId)) {
          const updatedTickets = prevTickets.map(t => {
            if (t.id === message.id || t.id === message.ticketId) {
              // 🎯 CONSERVAR TODA LA INFORMACIÓN EXISTENTE Y AGREGAR LA NUEVA
              const updatedTicket = {
                ...t, // Mantener toda la información existente
                ...message, // Agregar/sobrescribir con nueva información
                _lastUpdated: Date.now()
              }
              console.log('🔄 [WebSocket] Actualizando ticket:', updatedTicket.ticketNumber, 'status:', updatedTicket.status, 'moduleId:', updatedTicket.moduleId)
              console.log('🔄 [WebSocket] Información conservada:', {
                driverName: updatedTicket.driverName,
                licenseNumber: updatedTicket.licenseNumber,
                optionId: updatedTicket.optionId
              })
              
              return updatedTicket
            }
            return t
          })
          
          return updatedTickets
        }
        
        return prevTickets
      })
      
      console.log('✅ [WebSocket] Evento procesado desde /topic/tickets:', message.id || message.ticketId)
    })

    // Suscripción para tickets llamados (fallback)
    const ticketCalledSub = subscribe('/topic/ticket-called', (message: any) => {
      console.log('📞 [WebSocket] Ticket llamado recibido:', message)
      
      setTickets(prevTickets => {
        const updatedTickets = prevTickets.map(t => {
          if (t.id === message.ticketId) {
            const updatedTicket = {
              ...t, // Conserva toda la información existente incluyendo driverName
              status: 'CALLED' as const,
              userId: message.userId,
              moduleId: message.moduleId,
              calledAt: message.calledAt || new Date().toISOString(),
              _lastUpdated: Date.now()
            }
            
            // 🎯 SI NO TIENE NOMBRE DEL CONDUCTOR, OBTENERLO
            if (!updatedTicket.driverName && updatedTicket.licenseNumber) {
              console.log('🔍 [WebSocket] Obteniendo nombre para ticket llamado por WebSocket:', updatedTicket.ticketNumber)
              obtenerNombreConductorAsync(updatedTicket)
            }
            
            console.log('📞 [WebSocket] Ticket actualizado a CALLED:', updatedTicket.ticketNumber, 'para módulo:', updatedTicket.moduleId, 'con nombre:', updatedTicket.driverName || 'PENDIENTE')
            return updatedTicket
          }
          return t
        })
        
        return updatedTickets
      })
    })
    
    // Suscripción para tickets iniciados
    const ticketStartedSub = subscribe('/topic/ticket-started', (message: any) => {
      console.log('🚀 [WebSocket] Ticket iniciado recibido:', message)
      
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
    
    // Suscripción para tickets completados
    const ticketCompletedSub = subscribe('/topic/ticket-completed', (message: any) => {
      console.log('✅ [WebSocket] Ticket completado recibido:', message)
      
      setTickets(prevTickets => {
        return prevTickets.filter(t => t.id !== message.ticketId)
      })
      console.log('✅ [WebSocket] Ticket removido de la lista:', message.ticketId)
    })
    
    // Suscripción para nuevos tickets
    const newTicketSub = subscribe('/topic/new-ticket', (message: any) => {
      console.log('🚨 [AGENTPANEL] ¡NUEVO TICKET RECIBIDO VIA WEBSOCKET!', {
        ticketNumber: message.ticketNumber,
        status: message.status,
        id: message.id
      })
      console.log('🆕 [WebSocket] Nuevo ticket recibido:', message)
      console.log('🆕 [WebSocket] Datos del ticket:', {
        ticketNumber: message.ticketNumber,
        licenseNumber: message.licenseNumber,
        driverName: message.driverName,
        optionId: message.optionId,
        status: message.status,
        moduleId: message.moduleId
      })
      
      // Los tickets nuevos WAITING sin módulo están disponibles para todos
      if ((message.status === 'WAITING' && (message.moduleId === null || message.moduleId === undefined)) || 
          message.moduleId === selectedModule) {
        setTickets(prevTickets => {
          // Verificar si el ticket ya existe
          const exists = prevTickets.some(t => t.id === message.id)
          if (!exists) {
            // Conservar TODA la información del ticket nuevo
            const newTicket = {
              ...message, // Conservar toda la información
              _lastUpdated: Date.now()
            }
            
            // 🎯 OBTENER NOMBRE DEL CONDUCTOR SI NO LO TIENE
            if (newTicket.licenseNumber && !newTicket.driverName) {
              obtenerNombreConductorAsync(newTicket)
            }
            
            console.log('✅ [WebSocket] Nuevo ticket agregado:', newTicket.ticketNumber)
            console.log('🎯 [WebSocket] Agregando ticket a la lista. Tickets antes:', prevTickets.length, 'después:', prevTickets.length + 1)
            
            const updatedTickets = [...prevTickets, newTicket]
            console.log('📋 [WebSocket] Lista actualizada con nuevo ticket:', updatedTickets.map(t => `${t.ticketNumber}(${t.status})`))
            return updatedTickets
          }
          return prevTickets
        })
      }
    })
    
    // Guardar suscripciones
    if (ticketsSub) subscriptions.push(ticketsSub)
    if (ticketCalledSub) subscriptions.push(ticketCalledSub)
    if (ticketStartedSub) subscriptions.push(ticketStartedSub)
    if (ticketCompletedSub) subscriptions.push(ticketCompletedSub)
    if (newTicketSub) subscriptions.push(newTicketSub)
    
    console.log('🔌 [AgentPanel] Suscripciones WebSocket configuradas:', subscriptions.length)
    
    // Cleanup
    return () => {
      console.log('🧹 [AgentPanel] Limpiando suscripciones WebSocket')
      subscriptions.forEach(sub => {
        try {
          if (sub && typeof sub.unsubscribe === 'function') {
            sub.unsubscribe()
          }
        } catch (error) {
          console.warn('⚠️ [AgentPanel] Error desuscribiendo:', error)
        }
      })
    }
  }, [isConnected]) // ✅ Solo depende de la conexión, no del módulo seleccionado
       
  
  // 🎯 ESTADO PARA TICKETS EN PROCESO (loading)
  const [ticketsEnProceso, setTicketsEnProceso] = useState<Set<number>>(new Set())

  // 🎯 NUEVO: Función para marcar ticket como en proceso
  const marcarTicketEnProceso = useCallback((ticketId: number) => {
    setTicketsEnProceso(prev => new Set(prev).add(ticketId))
  }, [])

  // 🎯 NUEVO: Función para desmarcar ticket como en proceso
  const desmarcarTicketEnProceso = useCallback((ticketId: number) => {
    setTicketsEnProceso(prev => {
      const newSet = new Set(prev)
      newSet.delete(ticketId)
      return newSet
    })
  }, [])

  // 🎯 NUEVO: Función para verificar si un ticket está en proceso
  const estaTicketEnProceso = useCallback((ticketId: number) => {
    return ticketsEnProceso.has(ticketId)
  }, [ticketsEnProceso])

  // 🎯 FUNCIÓN SIMPLE: Mostrar errores
  const mostrarError = useCallback((message: string) => {
    setErrorMessage(message)
    setShowError(true)
    setTimeout(() => setShowError(false), 3000)
  }, [])

  // 🎯 FUNCIÓN ASÍNCRONA: Obtener nombre del conductor y actualizar estado
  const obtenerNombreConductorAsync = useCallback(async (ticket: any) => {
    if (!ticket.licenseNumber || (ticket.driverName && !ticket.driverName.includes('Conductor:'))) {
      return Promise.resolve()
    }

    try {
      // Verificar caché primero
      const cache = JSON.parse(localStorage.getItem('driver_names_cache') || '{}')
      if (cache[ticket.licenseNumber]?.name) {
        console.log('📋 [AgentPanel] Nombre desde caché:', cache[ticket.licenseNumber].name, 'para', ticket.ticketNumber)
        // Actualizar el estado inmediatamente con el nombre del caché
        setTickets(prevTickets => 
          prevTickets.map(t => 
            t.id === ticket.id 
              ? { ...t, driverName: cache[ticket.licenseNumber].name }
              : t
          )
        )
        return Promise.resolve()
      }

      // Si no está en caché, consultar API
      console.log('🔍 [AgentPanel] Consultando nombre para:', ticket.ticketNumber, ticket.licenseNumber)
      const { validationService } = await import('../services/validationService')
      const driverData = await validationService.getDriverByPhonePublic(ticket.licenseNumber)
      
      if (driverData?.full_name) {
        const normalizedName = normalizeDriverName(driverData.full_name)
        
        // Guardar en caché
        const newCache = { ...cache }
        newCache[ticket.licenseNumber] = { name: normalizedName, timestamp: Date.now() }
        localStorage.setItem('driver_names_cache', JSON.stringify(newCache))
        
        // Actualizar el estado inmediatamente
        setTickets(prevTickets => 
          prevTickets.map(t => 
            t.id === ticket.id 
              ? { ...t, driverName: normalizedName }
              : t
          )
        )
        
        console.log('✅ [AgentPanel] Nombre encontrado y actualizado:', normalizedName, 'para', ticket.ticketNumber)
        return Promise.resolve()
      } else {
        console.log('❌ [AgentPanel] No se encontró nombre para:', ticket.ticketNumber, ticket.licenseNumber)
        return Promise.resolve()
      }
    } catch (error) {
      console.log('❌ [AgentPanel] Error obteniendo nombre para:', ticket.ticketNumber, error)
      return Promise.reject(error)
    }
  }, [])

  // 🎯 FUNCIÓN SIMPLE: Cargar módulos
  const cargarModulos = useCallback(async () => {
    try {
      const { moduloAtencionService } = await import('../services/moduloAtencionService')
      const modulos = await moduloAtencionService.getFrontendModules()
      setModules(modulos)
      console.log('✅ Módulos cargados del backend:', modulos.length)
    } catch (error: any) {
      console.error('Error cargando módulos:', error)
      
      // 🎯 MANEJAR ERRORES DE AUTENTICACIÓN ESPECÍFICAMENTE
      if (error?.response?.status === 401) {
        console.log('🔑 [useAgentPanel] Error de autenticación al cargar módulos')
        mostrarError('Error de autenticación. Por favor, inicie sesión nuevamente.')
        
        // 🎯 MICROFRONTEND: Solo limpiar datos locales (NO hacer logout completo)
        console.log('🧹 [AgentPanel] Limpiando datos locales del microfrontend')
        safeSetItem('selectedModule', '')
        
        // Redirigir al login (el sistema principal manejará el logout completo)
        window.location.href = '/login'
        return
      }
      
      mostrarError('Error al cargar módulos')
    }
  }, [mostrarError])

  // 🎯 FUNCIÓN REAL: Cargar tickets del backend
  const cargarTickets = useCallback(async (esConsultaAutomatica = false) => {
    if (!selectedModule) {
      console.log('❌ [AgentPanel] No hay módulo seleccionado para cargar tickets')
      return
    }
    
    try {
      if (!esConsultaAutomatica) {
        console.log('🎯 [AgentPanel] Cargando tickets reales para módulo:', selectedModule)
      }
      
      // 🎯 OBTENER TODOS LOS TICKETS usando /tickets/all
      const todosLosTicketsBackend = await ticketService.getAllTickets()
      if (!esConsultaAutomatica) {
        console.log('🎯 [AgentPanel] Todos los tickets del backend:', todosLosTicketsBackend.length)
        console.log('🔍 [AgentPanel] DETALLES de cada ticket:')
        todosLosTicketsBackend.forEach((ticket, index) => {
          console.log(`  ${index + 1}. ${ticket.ticketNumber}: status="${ticket.status}", moduleId=${ticket.moduleId}, agentId=${ticket.agentId}`)
        })
        console.log('🎯 [AgentPanel] Módulo seleccionado actual:', selectedModule)
      }
      
      // 🎯 OBTENER AGENT ID DEL USUARIO ACTUAL
      let currentAgentId: number | null = null
      const userData = localStorage.getItem('user')
      if (userData) {
        try {
          const user = JSON.parse(userData)
          currentAgentId = user.id
        } catch (error) {
          console.error('❌ [AgentPanel] Error parseando datos del usuario:', error)
        }
      }
      
      // 🎯 FILTRAR TICKETS RELEVANTES PARA ESTE MÓDULO
      const ticketsRelevantes = todosLosTicketsBackend.filter(ticket => {
        // Mostrar tickets WAITING (sin módulo asignado - moduleId = null)
        if (ticket.status === 'WAITING' && (ticket.moduleId === null || ticket.moduleId === undefined)) {
          if (!esConsultaAutomatica) {
            console.log(`✅ [AgentPanel] Ticket ${ticket.ticketNumber} incluido: WAITING sin módulo (disponible para todos)`)
          }
          return true
        }
        
        // Mostrar tickets asignados a este módulo específico
        if (ticket.moduleId === selectedModule && (ticket.status === 'CALLED' || ticket.status === 'IN_PROGRESS')) {
          if (!esConsultaAutomatica) {
            console.log(`✅ [AgentPanel] Ticket ${ticket.ticketNumber} incluido: ${ticket.status} del módulo ${selectedModule}`)
          }
          return true
        }
        
        // Mostrar tickets CALLED/IN_PROGRESS asignados a este agente Y módulo
        if (currentAgentId && ticket.agentId === currentAgentId && ticket.moduleId === selectedModule && (ticket.status === 'CALLED' || ticket.status === 'IN_PROGRESS')) {
          if (!esConsultaAutomatica) {
            console.log(`✅ [AgentPanel] Ticket ${ticket.ticketNumber} incluido: ${ticket.status} asignado a agente ${currentAgentId} del módulo ${selectedModule}`)
          }
          return true
        }
        
        if (!esConsultaAutomatica) {
          console.log(`❌ [AgentPanel] Ticket ${ticket.ticketNumber} excluido: status="${ticket.status}", moduleId=${ticket.moduleId}, agentId=${ticket.agentId} (no cumple criterios)`)
        }
        return false
      })
      
      if (!esConsultaAutomatica) {
        console.log('🎯 [AgentPanel] Tickets relevantes para módulo', selectedModule, ':', ticketsRelevantes.length)
      }
      
      // 🎯 PROCESAR TICKETS FILTRADOS CONSERVANDO TODOS LOS DATOS
      const todosLosTickets = ticketsRelevantes.map(ticket => {
        if (ticket.status === 'WAITING') {
          // Los tickets en espera no tienen módulo asignado aún, pero conservan toda su información
          const processedTicket = {
            ...ticket, // Conservar TODA la información del ticket
            userId: null, // Solo limpiar el userId para tickets en espera
          }
          
          if (!esConsultaAutomatica) {
            console.log('📋 [AgentPanel] Procesando ticket WAITING:', processedTicket.ticketNumber, 'licenseNumber:', processedTicket.licenseNumber, 'driverName:', processedTicket.driverName)
          }
          
          return processedTicket
        }
        
        // Los tickets llamados/atendiendo mantienen TODA su información
        const processedTicket = {
          ...ticket // Conservar TODA la información del ticket
        }
        
        if (!esConsultaAutomatica) {
          console.log('📋 [AgentPanel] Procesando ticket', ticket.status + ':', processedTicket.ticketNumber, 'licenseNumber:', processedTicket.licenseNumber, 'driverName:', processedTicket.driverName)
        }
        
        return processedTicket
      })

      // 🎯 CARGAR NOMBRES DE CONDUCTORES PARA TODOS LOS TICKETS
      if (!esConsultaAutomatica) {
        console.log('🔍 [AgentPanel] Iniciando carga de nombres de conductores para:', todosLosTickets.length, 'tickets')
        console.log('🔍 [AgentPanel] Tickets con licenseNumber:', todosLosTickets.filter(t => t.licenseNumber).length)
        console.log('🔍 [AgentPanel] Tickets sin licenseNumber:', todosLosTickets.filter(t => !t.licenseNumber).length)
        
        // 🧹 Limpiar cache corrupto si es necesario (una vez por sesión)
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
                console.log('🧹 [AgentPanel] Eliminando entrada corrupta de cache:', key, value)
              }
            }
            
            if (hasCorruption) {
              localStorage.setItem('driver_names_cache', JSON.stringify(cleanedCache))
              console.log('🧹 [AgentPanel] Cache limpiado y reparado')
            }
            
            sessionStorage.setItem('cache_cleaned', 'true')
          } catch (error) {
            console.log('🧹 [AgentPanel] Error limpiando cache, eliminando completamente:', error)
            localStorage.removeItem('driver_names_cache')
          }
        }
      }

      const ticketsConNombres = await Promise.all(
        todosLosTickets.map(async (ticket) => {
          // Si ya tiene driverName, no hacer nada
          if (ticket.driverName) {
            if (!esConsultaAutomatica) {
              console.log('🔍 [AgentPanel] Ticket', ticket.ticketNumber, 'ya tiene driverName:', ticket.driverName)
            }
            return ticket
          }
          
          if (!ticket.licenseNumber) {
            if (!esConsultaAutomatica) {
              console.log('⚠️ [AgentPanel] Ticket', ticket.ticketNumber, 'NO tiene licenseNumber')
              console.log('⚠️ [AgentPanel] Datos del ticket sin licenseNumber:', ticket)
            }
            return ticket
          }
          
          try {
            if (!esConsultaAutomatica) {
              console.log('🔍 [AgentPanel] Buscando nombre para ticket', ticket.ticketNumber, 'con licenseNumber:', ticket.licenseNumber)
            }

            // 🎯 NUEVO: Primero verificar si ya está en el cache con diferentes formatos
            try {
              const cache = JSON.parse(localStorage.getItem('driver_names_cache') || '{}')
              
              // Probar diferentes formatos en cache
              const cacheKeys = [
                ticket.licenseNumber, // Formato original
                ticket.licenseNumber.startsWith('+51') ? ticket.licenseNumber : `+51${ticket.licenseNumber}`, // Con +51
                ticket.licenseNumber.startsWith('+51') ? ticket.licenseNumber.substring(3) : ticket.licenseNumber, // Sin +51
                ticket.licenseNumber.replace(/[\s\-\(\)]/g, '') // Sin espacios ni caracteres especiales
              ]
              
              for (const key of cacheKeys) {
                if (cache[key] && cache[key].name) {
                  if (!esConsultaAutomatica) {
                    console.log('✅ [AgentPanel] Nombre encontrado en cache para', ticket.ticketNumber, 'con clave', key, ':', cache[key].name)
                  }
                  return {
                    ...ticket,
                    driverName: cache[key].name
                  }
                }
              }
              
              if (!esConsultaAutomatica) {
                console.log('🔍 [AgentPanel] No se encontró en cache para', ticket.ticketNumber, 'probando claves:', cacheKeys)
              }
            } catch (error) {
              // Ignorar errores de cache
              if (!esConsultaAutomatica) {
                console.log('⚠️ [AgentPanel] Error leyendo cache:', error)
              }
            }
            
            // 🎯 NUEVO: Si no está en cache, consultar API
            let phoneToSearch = ticket.licenseNumber.trim()
            
            // Intentar diferentes formatos de teléfono
            const phoneVariants = []
            
            // Formato original
            phoneVariants.push(phoneToSearch)
            
            // Limpiar espacios y caracteres especiales
            const cleanPhone = phoneToSearch.replace(/[\s\-\(\)]/g, '')
            if (cleanPhone !== phoneToSearch) {
              phoneVariants.push(cleanPhone)
            }
            
            // Si no empieza con +51, agregarlo
            if (!cleanPhone.startsWith('+51') && cleanPhone.length === 9) {
              phoneVariants.push(`+51${cleanPhone}`)
            }
            
            // Si empieza con +51, también probar sin el +51
            if (cleanPhone.startsWith('+51')) {
              phoneVariants.push(cleanPhone.substring(3))
            }
            
            // Si el teléfono es solo números de 9 dígitos, agregarlo con +51
            if (/^\d{9}$/.test(cleanPhone)) {
              phoneVariants.push(`+51${cleanPhone}`)
            }
            
            // Si el teléfono empieza con 9 y tiene 9 dígitos, es un celular peruano válido
            if (/^9\d{8}$/.test(cleanPhone)) {
              phoneVariants.push(`+51${cleanPhone}`)
            }
            
            // Remover duplicados
            const uniqueVariants = [...new Set(phoneVariants)]
            
            if (!esConsultaAutomatica) {
              console.log('🔍 [AgentPanel] Variantes de teléfono para', ticket.ticketNumber, ':', uniqueVariants)
            }
            
            let driverData = null
            let successfulPhone = null
            
            // Probar cada variante hasta encontrar una que funcione
            for (const phoneVariant of uniqueVariants) {
              if (!phoneVariant) continue
              
              if (!esConsultaAutomatica) {
                console.log('🔍 [AgentPanel] Probando teléfono', phoneVariant, 'para ticket', ticket.ticketNumber)
              }
              
              try {
                driverData = await validationService.getDriverByPhonePublic(phoneVariant)
                if (driverData?.full_name) {
                  successfulPhone = phoneVariant
                  if (!esConsultaAutomatica) {
                    console.log('✅ [AgentPanel] Nombre encontrado con teléfono', phoneVariant, 'para', ticket.ticketNumber, ':', driverData.full_name)
                  }
                  break
                }
              } catch (error) {
                if (!esConsultaAutomatica) {
                  console.log('❌ [AgentPanel] Error consultando', phoneVariant, 'para', ticket.ticketNumber, ':', error)
                }
                continue
              }
            }
            
            if (driverData?.full_name && successfulPhone) {
              const normalizedName = normalizeDriverName(driverData.full_name)
              if (!esConsultaAutomatica) {
                console.log('✅ [AgentPanel] Nombre normalizado para', ticket.ticketNumber, ':', normalizedName)
              }
              
              // Guardar en cache con el teléfono que funcionó
              try {
                const cache = JSON.parse(localStorage.getItem('driver_names_cache') || '{}')
                cache[successfulPhone] = { name: normalizedName, timestamp: Date.now() }
                // También guardar con el teléfono original
                cache[ticket.licenseNumber] = { name: normalizedName, timestamp: Date.now() }
                localStorage.setItem('driver_names_cache', JSON.stringify(cache))
              } catch (error) {
                // Ignorar errores de cache
              }
              
              return {
                ...ticket,
                driverName: normalizedName
              }
            } else {
              if (!esConsultaAutomatica) {
                console.log('❌ [AgentPanel] No se encontró nombre para', ticket.ticketNumber, 'después de probar todas las variantes')
                console.log('❌ [AgentPanel] Datos del ticket sin nombre:', {
                  ticketNumber: ticket.ticketNumber,
                  licenseNumber: ticket.licenseNumber,
                  originalLicense: ticket.licenseNumber,
                  variants: uniqueVariants
                })
              }
              
              // 🎯 FALLBACK: Si no se encontró nombre, usar el teléfono como identificador temporal
              // Esto es mejor que no mostrar nada
              return {
                ...ticket,
                driverName: `Conductor: ${ticket.licenseNumber}` // Temporal hasta que se encuentre el nombre real
              }
            }
          } catch (error) {
            if (!esConsultaAutomatica) {
              console.error('❌ [AgentPanel] Error buscando nombre para', ticket.ticketNumber, ':', error)
            }
          }
          
          return ticket
        })
      )
      
      if (!esConsultaAutomatica) {
        console.log('✅ [AgentPanel] Tickets con nombres cargados:', ticketsConNombres.filter(t => t.driverName).length, 'de', ticketsConNombres.length)
        ticketsConNombres.forEach(ticket => {
          console.log('📋 [AgentPanel] Ticket:', ticket.ticketNumber, 'driverName:', ticket.driverName || 'SIN NOMBRE', 'licenseNumber:', ticket.licenseNumber)
        })
      }
      
      // 🎯 MOSTRAR TICKETS INMEDIATAMENTE CON TODOS LOS DETALLES
      setTickets(ticketsConNombres)
      if (!esConsultaAutomatica) {
        console.log('✅ [AgentPanel] Tickets cargados del backend con detalles:', ticketsConNombres.length)
        console.log('📋 [AgentPanel] Ejemplo de detalles cargados:', ticketsConNombres[0] || 'No hay tickets')
      }

      // 🎯 OBTENER NOMBRES ASINCRÓNICAMENTE (SIN BLOQUEAR LA UI)
      const ticketsSinNombre = ticketsConNombres.filter(ticket => 
        ticket.licenseNumber && 
        (!ticket.driverName || ticket.driverName.includes('Conductor:'))
      )
      
      if (ticketsSinNombre.length > 0) {
        console.log('🔍 [AgentPanel] Obteniendo nombres asincrónicamente para', ticketsSinNombre.length, 'tickets')
        // Procesar en paralelo todos los nombres
        Promise.all(
          ticketsSinNombre.map(ticket => obtenerNombreConductorAsync(ticket))
        ).then(() => {
          console.log('✅ [AgentPanel] Todos los nombres obtenidos')
        }).catch(error => {
          console.log('❌ [AgentPanel] Error obteniendo nombres:', error)
        })
      }
      
    } catch (error: any) {
      console.error('❌ [AgentPanel] Error cargando tickets del backend:', error)
      
      // 🎯 MANEJAR ERRORES DE AUTENTICACIÓN ESPECÍFICAMENTE
      if (error?.response?.status === 401) {
        console.log('🔑 [useAgentPanel] Error de autenticación al cargar tickets')
        mostrarError('Error de autenticación. Por favor, inicie sesión nuevamente.')
        
        // 🎯 MICROFRONTEND: Solo limpiar datos locales (NO hacer logout completo)
        console.log('🧹 [AgentPanel] Limpiando datos locales del microfrontend')
        safeSetItem('selectedModule', '')
        setTickets([])
        
        // Redirigir al login (el sistema principal manejará el logout completo)
        window.location.href = '/login'
        return
      }
      
      mostrarError('Error al cargar tickets del backend')
    }
  }, [selectedModule, mostrarError])

  // 🎯 FUNCIÓN SIMPLE: Llamar ticket
  const llamarTicket = useCallback(async (ticket: Ticket) => {
    console.log('🎯 [AgentPanel] ===== INICIANDO LLAMAR TICKET =====')
    
    if (!selectedModule) {
      console.log('❌ [AgentPanel] No hay módulo seleccionado')
      mostrarError('Debe seleccionar un módulo primero')
      return
    }
    
    try {
      console.log('🎯 [AgentPanel] Llamando ticket:', ticket.id)
      
      // 🎯 Obtener el userId del usuario logueado del localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      const userId = user.id
      
      // Llamar ticket vía API
      const updatedTicket = await ticketService.callTicket(ticket.id, userId, selectedModule)
      
      console.log('✅ [AgentPanel] Ticket llamado exitosamente:', updatedTicket)
      
      // Actualizar el ticket en el estado local
      setTickets(prevTickets => {
        return prevTickets.map(t => {
          if (t.id === ticket.id) {
            // 🎯 CONSERVAR EL NOMBRE DEL CONDUCTOR DEL TICKET ORIGINAL
            const ticketActualizado = {
              ...t, // Datos originales (incluye driverName si ya lo tenía)
              ...updatedTicket, // Datos del backend
              status: 'CALLED' as const,
              driverName: t.driverName || updatedTicket.driverName, // Conservar nombre existente
              _lastUpdated: Date.now()
            }

            // 🎯 SI NO TIENE NOMBRE, OBTENERLO ASINCRÓNICAMENTE
            if (!ticketActualizado.driverName && ticketActualizado.licenseNumber) {
              console.log('🔍 [AgentPanel] Obteniendo nombre para ticket llamado:', ticketActualizado.ticketNumber)
              obtenerNombreConductorAsync(ticketActualizado)
            }

            return ticketActualizado
          }
          return t
        })
      })
      
    } catch (error) {
      console.error('❌ [AgentPanel] Error llamando ticket:', error)
      mostrarError('Error al llamar el ticket')
    }
  }, [selectedModule, mostrarError])

  // Función para atender un ticket
  const atenderTicket = useCallback(async (ticket: Ticket) => {
    if (!selectedModule) {
      mostrarError('Debes seleccionar un módulo primero')
      return
    }

    try {
      // 🎯 NUEVO: Marcar ticket como en proceso
      marcarTicketEnProceso(ticket.id)
      
      console.log('⚡ Atendiendo ticket:', ticket.ticketNumber)
      
      // 🎯 OBTENER AGENT ID DEL LOCALSTORAGE SI NO ESTÁ EN EL TICKET
      let agentId = ticket.userId
      if (!agentId) {
        const userData = localStorage.getItem('user')
        if (userData) {
          try {
            const user = JSON.parse(userData)
            agentId = user.id
          } catch (error) {
            console.error('❌ [AgentPanel] Error parseando datos del usuario:', error)
          }
        }
      }
      
      if (!agentId) {
        mostrarError('No se pudo identificar el agente. Por favor, inicie sesión nuevamente.')
        return
      }
      
      await ticketService.startTicket(ticket.id, agentId)
      
      // 🎯 NUEVO: Actualizar estado local inmediatamente para evitar parpadeo
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
        
        console.log('📊 [AgentPanel] Estado actualizado - Tickets IN_PROGRESS:', updatedTickets.filter(t => t.status === 'IN_PROGRESS').length)
        return updatedTickets
      })
      
      console.log('✅ Ticket atendido exitosamente:', ticket.ticketNumber)
      
    } catch (error: any) {
      console.error('❌ Error atendiendo ticket:', error)
      mostrarError(error.response?.data?.message || 'Error al atender el ticket')
      
      // 🎯 NUEVO: Revertir cambios si hay error
      setTickets(prev => prev.map(t => 
        t.id === ticket.id 
          ? { ...t, status: 'CALLED', startedAt: undefined }
          : t
      ))
    } finally {
      // 🎯 NUEVO: Desmarcar ticket como en proceso
      desmarcarTicketEnProceso(ticket.id)
    }
  }, [selectedModule, marcarTicketEnProceso, desmarcarTicketEnProceso, mostrarError])

  // 🎯 FUNCIÓN PARA COMPLETAR TICKET
  const completarTicket = useCallback(async (ticket: Ticket, notes?: string) => {
    if (!selectedModule) {
      mostrarError('Debe seleccionar un módulo primero')
      return
    }
    
    try {
      console.log('🎯 [AgentPanel] Completando ticket:', ticket.id)
      
      // 🎯 Para tickets en espera, obtener el ID del agente del localStorage
      let agentId = ticket.userId
      if (!agentId) {
        const userData = localStorage.getItem('user')
        if (userData) {
          try {
            const user = JSON.parse(userData)
            agentId = user.id
          } catch (error) {
            console.error('❌ [AgentPanel] Error parseando datos del usuario:', error)
          }
        }
      }
      
      if (!agentId) {
        mostrarError('No se pudo identificar el agente. Por favor, inicie sesión nuevamente.')
        return
      }
      
      // Completar ticket vía API
      const updatedTicket = await ticketService.completeTicket(ticket.id, agentId, notes)
      
      console.log('✅ [AgentPanel] Ticket completado exitosamente:', updatedTicket)
      
      // 🎯 ACTUALIZAR ESTADO LOCAL INMEDIATAMENTE (sin recargar del backend)
      setTickets(prevTickets => {
        const updatedTickets = prevTickets.filter(t => t.id !== ticket.id) // Remover ticket completado
        
        console.log('📊 [AgentPanel] Ticket completado removido de la lista:', ticket.id)
        console.log('📊 [AgentPanel] Tickets restantes:', updatedTickets.length)
        
        return updatedTickets
      })
      
      
    } catch (error) {
      console.error('❌ [AgentPanel] Error completando ticket:', error)
      mostrarError('Error al completar el ticket')
    }
  }, [selectedModule, mostrarError])

  // 🎯 FUNCIÓN PARA CANCELAR TICKET
  const cancelarTicket = useCallback(async (ticket: Ticket) => {
    if (!selectedModule) {
      mostrarError('Debe seleccionar un módulo primero')
      return
    }
    
    try {
      console.log('🎯 [AgentPanel] Cancelando ticket:', ticket.id)
      
      // 🎯 Para tickets en espera, obtener el ID del agente del localStorage
      let agentId = ticket.userId
      if (!agentId) {
        const userData = localStorage.getItem('user')
        if (userData) {
          try {
            const user = JSON.parse(userData)
            agentId = user.id
          } catch (error) {
            console.error('❌ [AgentPanel] Error parseando datos del usuario:', error)
          }
        }
      }
      
      if (!agentId) {
        mostrarError('No se pudo identificar el agente. Por favor, inicie sesión nuevamente.')
        return
      }
      
      // Cancelar ticket vía API
      const updatedTicket = await ticketService.cancelTicket(ticket.id, agentId)
      
      console.log('✅ [AgentPanel] Ticket cancelado exitosamente:', updatedTicket)
      
      // Recargar tickets para reflejar el cambio
      await cargarTickets()
      
    } catch (error) {
      console.error('❌ [AgentPanel] Error cancelando ticket:', error)
      mostrarError('Error al cancelar el ticket')
    }
  }, [selectedModule, mostrarError, cargarTickets])

  // 🎯 FUNCIÓN SIMPLE: Seleccionar módulo
  const handleModuleSelection = useCallback(async (moduleId: number) => {
    try {
      console.log('🎯 [AgentPanel] Seleccionando módulo:', moduleId)
      
      const selectedModuleData = modules.find(m => m.id === moduleId)
      if (!selectedModuleData) {
        mostrarError('Módulo no encontrado')
        return
      }
      
      // Limpiar estado anterior
      setTickets([])
      
      // Asignar nuevo módulo
      setSelectedModule(moduleId)
      setShowModuleSelection(false)
      
      // Persistir módulo seleccionado
      safeSetItem(`selectedModule`, moduleId.toString())
      safeSetItem(`selectedModuleName`, selectedModuleData.name)
      
      // Cargar tickets del nuevo módulo
      await cargarTickets()
      
      mostrarError(`✅ Módulo "${selectedModuleData.name}" asignado correctamente`)
    } catch (error: any) {
      console.error('Error seleccionando módulo:', error)
      
      // 🎯 MANEJAR ERRORES DE AUTENTICACIÓN ESPECÍFICAMENTE
      if (error?.response?.status === 401) {
        mostrarError('Error de autenticación. Por favor, inicie sesión nuevamente.')
        
        // 🎯 MICROFRONTEND: Solo limpiar datos locales (NO hacer logout completo)
        console.log('🧹 [AgentPanel] Limpiando datos locales del microfrontend por error 401')
        safeSetItem('selectedModule', '')
        setTickets([])
        setModules([])
        
        // Redirigir al login (el sistema principal manejará el logout completo)
        window.location.href = '/login'
        return
      }
      
      mostrarError('Error al seleccionar el módulo. Intente nuevamente.')
    }
  }, [modules, cargarTickets, mostrarError])

  // 🆕 FUNCIÓN: Verificar módulo asignado automáticamente
  const verificarModuloAsignadoAutomaticamente = useCallback(async () => {
    try {
      console.log('🔍 [AgentPanel] Verificando módulo asignado automáticamente...')
      const moduloExistente = await queueAgentService.verificarYUsarModuloExistente()
      
      if (moduloExistente.success && moduloExistente.existing) {
        console.log('✅ [AgentPanel] Usuario ya tiene módulo asignado en backend:', moduloExistente.moduleId)
        
        // 🎯 USAR EL MÓDULO EXISTENTE
        setSelectedModule(moduloExistente.moduleId!)
        setShowModuleSelection(false)
        
        // 🎯 PERSISTIR MÓDULO EXISTENTE
        const moduleName = modules.find(m => m.id === moduloExistente.moduleId)?.name || 'Módulo'
        safeSetItem(`selectedModule`, moduloExistente.moduleId!.toString())
        safeSetItem(`selectedModuleName`, moduleName)
        
        console.log('✅ [AgentPanel] Módulo existente configurado automáticamente:', moduleName)
      } else {
        console.log('❌ [AgentPanel] Usuario no tiene módulo asignado, mostrar selección')
        setShowModuleSelection(true)
      }
    } catch (error) {
      console.error('❌ [AgentPanel] Error verificando módulo asignado automáticamente:', error)
      setShowModuleSelection(true)
    }
  }, [modules])

  // 🎯 EFECTO INICIAL: Cargar módulos y restaurar estado
  useEffect(() => {
    const inicializar = async () => {
      try {
        console.log('🚀 [useAgentPanel] Inicializando...')
        
        // Cargar módulos
        await cargarModulos()
        
        // 🆕 INTENTAR RECUPERAR MÓDULO ASIGNADO AUTOMÁTICAMENTE
        const moduloRecuperado = await queueAgentService.recuperarModuloAsignado()
        
        if (moduloRecuperado) {
          console.log('✅ [useAgentPanel] Módulo recuperado automáticamente:', moduloRecuperado)
          setSelectedModule(moduloRecuperado)
          setShowModuleSelection(false)
          
          // 🎯 GUARDAR EN LOCALSTORAGE PARA FUTURAS SESIONES
          safeSetItem('selectedModule', moduloRecuperado.toString())
        } else {
          // 🎯 SI NO SE RECUPERÓ, INTENTAR RESTAURAR DEL LOCALSTORAGE
          const moduloGuardado = safeGetItem('selectedModule')
          if (moduloGuardado) {
            const moduloId = parseInt(moduloGuardado)
            setSelectedModule(moduloId)
            setShowModuleSelection(false)
          } else {
            setShowModuleSelection(true)
          }
        }
        
      } catch (error) {
        console.error('❌ [useAgentPanel] Error en inicialización:', error)
        mostrarError('Error al inicializar')
      } finally {
        setLoading(false)
      }
    }

    inicializar()
  }, []) // Solo se ejecuta al montar

  // 🎯 EFECTO SIMPLE: Cargar tickets cuando hay módulo
  useEffect(() => {
    if (selectedModule) {
      console.log('🔄 [useAgentPanel] Módulo seleccionado, cargando tickets automáticamente...', selectedModule)
      cargarTickets()
    } else {
      console.log('⚠️ [useAgentPanel] No hay módulo seleccionado, no se cargan tickets')
    }
  }, [selectedModule]) 

  // 🎯 ESTADOS DERIVADOS SIMPLES  
  const ticketsEnEspera = useMemo(() => {
    const ticketsWaiting = tickets.filter(t => t.status === 'WAITING')
    const ticketsInProgress = tickets.filter(t => t.status === 'IN_PROGRESS')
    
    // 🎯 ORDENAR POR FECHA DE CREACIÓN (FIFO - First In, First Out)
    const ticketsOrdenados = ticketsWaiting.sort((a, b) => {
      // Usar createdAt si está disponible, sino usar id como fallback
      const fechaA = a.createdAt ? new Date(a.createdAt).getTime() : a.id
      const fechaB = b.createdAt ? new Date(b.createdAt).getTime() : b.id
      return fechaA - fechaB // Orden ascendente (más antiguo primero)
    })
    
    // 🎯 DEBUG: Verificar detalles de tickets en espera
    if (ticketsOrdenados.length > 0) {
      console.log('📋 [AgentPanel] DETALLES de tickets en espera:')
      ticketsOrdenados.forEach((ticket, index) => {
        console.log(`  Ticket ${index + 1} (${ticket.ticketNumber}):`, {
          driverName: ticket.driverName,
          licenseNumber: ticket.licenseNumber,
          categoryName: ticket.categoryName,
          subcategoryName: ticket.subcategoryName,
          categoryDescription: ticket.categoryDescription,
          subcategoryDescription: ticket.subcategoryDescription,
          optionId: ticket.optionId,
          priority: ticket.priority
        })
      })
    }
    
    // Si hay tickets en proceso, solo mostrar 1 ticket en espera (el más antiguo)
    if (ticketsInProgress.length > 0) {
      const result = ticketsOrdenados.slice(0, 1)
      console.log('🔍 [AgentPanel] Hay tickets en proceso, mostrando solo el más antiguo:', result.length)
      return result
    }
    
    // Si no hay tickets en proceso, mostrar todos los tickets en espera ordenados
    console.log('🔍 [AgentPanel] No hay tickets en proceso, mostrando todos ordenados:', ticketsOrdenados.length)
    return ticketsOrdenados
  }, [tickets])

  const ticketsLlamados = useMemo(() => {
    return tickets.filter(t => t.status === 'CALLED' && t.moduleId === selectedModule)
  }, [tickets, selectedModule])

  const ticketsAtendiendo = useMemo(() => {
    return tickets.filter(t => t.status === 'IN_PROGRESS' && t.moduleId === selectedModule)
  }, [tickets, selectedModule])

  return {
    // Estados básicos
    tickets,
    loading,
    selectedModule,
    modules,
    showModuleSelection,
    
    // 🎯 NUEVO: Estado de tickets en proceso
    ticketsEnProceso,
    estaTicketEnProceso,
    
    // Estados derivados
    ticketsEnEspera,
    ticketsLlamados,
    ticketsAtendiendo,
    
    // Estados de error
    error: null,
    errorMessage,
    showError,
    
    // Estados de actualización
    lastUpdate: null,
    
    // Acciones básicas
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
    refreshModules: cargarModulos,
    
    // 🎯 NUEVO: Funciones de manejo de loading
    marcarTicketEnProceso,
    desmarcarTicketEnProceso,
    
    // 🆕 Funciones de verificación automática
    verificarModuloAsignadoAutomaticamente
  }
}
