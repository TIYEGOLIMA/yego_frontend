import axios from 'axios'
import { API_BASE_URL } from '../utils/constants'
import { 
  Ticket, 
  TicketModuleResponse, 
  TicketsPorModuloResponse,
  TicketModuloCompletoResponse,
  CreateTicketData,
  TicketWithOptions
} from '../index' // Import from index.ts donde están todas las interfaces

// 🔧 Instancia axios específica para tickets
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 🔐 Interceptor para agregar token automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Sistema de registro de pre-asignaciones (en memoria)
const preAsignaciones = new Map<number, number>() // ticketId -> agentId
const agentesConTickets = new Set<number>() // agentes que ya tienen tickets

// Exponer funciones de debug globalmente para facilitar el debug
declare global {
  interface Window {
    debugTickets: () => void;
    resetPreAssignments: () => void;
  }
}

export const ticketService = {
  async createTicket(data: CreateTicketData): Promise<Ticket> {
    try {
      const response = await api.post('/tickets/create', data)
      return response.data
    } catch (error) {
      console.error('❌ [ticketService] Error creando ticket:', error)
      throw error
    }
  },

  async createTicketPublic(data: CreateTicketData): Promise<Ticket> {
    try {
      console.log('🎫 [ticketService] Creando ticket público con datos:', data)
      
      const response = await api.post('/tickets/create', data)
      console.log('✅ [ticketService] Ticket creado exitosamente:', response.data)
      
      return response.data
    } catch (error: any) {
      console.error('❌ [ticketService] Error creando ticket público:', error)
      
      // Log detallado del error
      if (error?.response) {
        console.error('📊 [ticketService] Detalles del error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        })
      }
      
      throw error
    }
  },

  async getTickets(): Promise<Ticket[]> {
    try {
      const response = await api.get('/tickets/all')
      return response.data
    } catch (error: any) {
      if (error?.response?.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        const retryResponse = await api.get('/tickets/all')
        return retryResponse.data
      }
      console.error('❌ [ticketService] Error obteniendo tickets:', error)
      throw error
    }
  },

  async getAssignedTicket(agentId: number): Promise<Ticket | null> {
    try {
      console.log(`🎯 [ticketService] Obteniendo ticket asignado para agente ${agentId}`)
      
      // 1. Verificar si ya tiene una pre-asignación en memoria
      for (const [ticketId, assignedAgentId] of preAsignaciones.entries()) {
        if (assignedAgentId === agentId) {
          console.log(`🎯 [ticketService] Agente ${agentId} ya tiene ticket pre-asignado: ${ticketId}`)
          try {
            const waitingTickets = await this.getTicketWaiting()
            const preAssignedTicket = waitingTickets.find(t => t.id === ticketId)
            if (preAssignedTicket) {
              return {
                ...preAssignedTicket,
                agent_id: agentId,
                preAssigned: true
              }
            }
          } catch (error) {
            console.error('❌ [ticketService] Error obteniendo ticket pre-asignado:', error)
          }
        }
      }
      
      // 2. Si no tiene pre-asignación, asignar uno nuevo automáticamente
      console.log(`🤖 [ticketService] Agente ${agentId} sin ticket, asignando uno nuevo...`)
      return await this.preAsignarTicketAutomaticamente(agentId)
      
    } catch (error: any) {
      console.error('❌ [ticketService] Error obteniendo ticket asignado:', error)
      return await this.preAsignarTicketAutomaticamente(agentId)
    }
  },

  async preAsignarTicketAutomaticamente(agentId: number): Promise<Ticket | null> {
    try {
      console.log(`🤖 [ticketService] Pre-asignación automática para agente ${agentId}`)
      
      // Verificar si este agente ya tiene un ticket pre-asignado
      if (agentesConTickets.has(agentId)) {
        console.log(`⏸️ [ticketService] Agente ${agentId} ya tiene un ticket asignado`)
        return null
      }
      
      // Obtener TODOS los tickets en espera de una vez
      console.log(`🔍 [ticketService] Obteniendo TODOS los tickets en espera...`)
      const todosLosTickets = await this.getTicketWaiting()
      console.log(`📋 [ticketService] Total de tickets en espera: ${todosLosTickets.length}`)
      
      // LÓGICA ANTI-DUPLICACIÓN: Filtrar tickets que NO estén pre-asignados a otros agentes
      const ticketsDisponibles = todosLosTickets.filter(t => 
        !t.agent_id && !preAsignaciones.has(t.id)
      )
      
      console.log(`✅ [ticketService] Tickets disponibles para asignación: ${ticketsDisponibles.length}`)
      
      if (ticketsDisponibles.length === 0) {
        console.log(`📭 [ticketService] No hay tickets disponibles para pre-asignación`)
        return null
      }
      
      // Ordenar por prioridad y tomar el primero
      const ticketsOrdenados = ticketsDisponibles.sort((a, b) => a.priority - b.priority)
      const ticketParaAsignar = ticketsOrdenados[0]
      
      console.log(`🎯 [ticketService] Pre-asignando ticket ${ticketParaAsignar.ticketNumber} al agente ${agentId}`)
      
      // Registrar la pre-asignación en memoria para evitar duplicados
      preAsignaciones.set(ticketParaAsignar.id, agentId)
      agentesConTickets.add(agentId)
      
      // Marcar como pre-asignado
      const ticketPreAsignado = {
        ...ticketParaAsignar,
        agent_id: agentId,
        status: 'WAITING' as const,
        preAssigned: true
      }
      
      console.log(`✅ [ticketService] Ticket ${ticketParaAsignar.ticketNumber} pre-asignado exitosamente`)
      console.log(`🛡️ [ticketService] Ticket protegido contra duplicación en otros módulos`)
      
      return ticketPreAsignado
      
    } catch (error) {
      console.error('❌ [ticketService] Error en pre-asignación:', error)
      return null
    }
  },

  // Función para limpiar pre-asignaciones cuando un ticket se toma o completa
  limpiarPreAsignacion(ticketId: number, agentId: number): void {
    if (preAsignaciones.has(ticketId)) {
      preAsignaciones.delete(ticketId)
      console.log(`🧹 [ticketService] Pre-asignación limpiada para ticket ${ticketId}`)
    }
    
    if (agentesConTickets.has(agentId)) {
      agentesConTickets.delete(agentId)
      console.log(`🧹 [ticketService] Agente ${agentId} liberado de pre-asignaciones`)
    }
  },

  // Función para reiniciar el sistema de pre-asignaciones
  reiniciarPreAsignaciones(): void {
    console.log(`🔄 [ticketService] Reiniciando sistema de pre-asignaciones`)
    console.log(`📊 [ticketService] Limpiando ${preAsignaciones.size} pre-asignaciones y ${agentesConTickets.size} agentes`)
    preAsignaciones.clear()
    agentesConTickets.clear()
    console.log(`✅ [ticketService] Sistema de pre-asignaciones reiniciado`)
  },

  // Función para debug del estado del sistema
  debugPreAsignaciones(): void {
    console.log(`🔍 [ticketService] DEBUG - Estado del sistema:`)
    console.log(`📊 Pre-asignaciones activas: ${preAsignaciones.size}`)
    console.log(`📋 Detalles:`, Array.from(preAsignaciones.entries()))
    console.log(`👥 Agentes con tickets: ${agentesConTickets.size}`)
    console.log(`📋 Lista:`, Array.from(agentesConTickets))
  },

  // Función para obtener tickets disponibles excluyendo pre-asignados
  async getTicketsDisponiblesParaDistribucion(moduleId: number): Promise<Ticket[]> {
    try {
      const ticketsDelModulo = await this.getTicketsByModule(moduleId)
      
      // Filtrar tickets que NO estén asignados ni pre-asignados
      const ticketsLibres = ticketsDelModulo.filter(t => 
        t.status === 'WAITING' && 
        !t.agent_id && 
        !preAsignaciones.has(t.id)
      )
      
      return ticketsLibres.sort((a, b) => a.priority - b.priority)
      
    } catch (error) {
      console.error('❌ [ticketService] Error obteniendo tickets para distribución:', error)
      return []
    }
  },

  async getTicketsByStatus(status: string): Promise<Ticket[]> {
    try {
      const response = await api.get(`/tickets/status/${status}`)
      return response.data
    } catch (error) {
      console.error('❌ [ticketService] Error obteniendo tickets por estado:', error)
      throw error
    }
  },

  async getTicketWaiting(): Promise<Ticket[]> {
    try {
      const response = await api.get('/tickets/waiting')
      return response.data
    } catch (error) {
      console.error('❌ [ticketService] Error obteniendo tickets en espera:', error)
      throw error
    }
  },

  async getTicketsByModule(moduleId: number): Promise<Ticket[]> {
    try {
      console.log('🎯 [ticketService] Obteniendo tickets del módulo:', moduleId)
      const response = await api.get(`/tickets/modulo/${moduleId}/completos`)
      
      // 🎯 DEBUGGING: Ver qué estructura devuelve el endpoint
      console.log('🔍 [ticketService] Tipo de response.data:', typeof response.data)
      console.log('🔍 [ticketService] ¿Es array?', Array.isArray(response.data))
      console.log('🔍 [ticketService] Estructura completa:', response.data)
      
      // 🎯 MANEJAR DIFERENTES ESTRUCTURAS DE RESPUESTA
      let tickets: any[] = []
      
      if (Array.isArray(response.data)) {
        // Si es un array directo
        tickets = response.data
      } else if (response.data && typeof response.data === 'object') {
        // Si es un objeto con propiedades
        if (response.data.tickets && Array.isArray(response.data.tickets)) {
          tickets = response.data.tickets
        } else if (response.data.data && Array.isArray(response.data.data)) {
          tickets = response.data.data
        } else if (response.data.content && Array.isArray(response.data.content)) {
          tickets = response.data.content
        } else {
          // Si no hay estructura conocida, intentar convertir el objeto
          console.log('⚠️ [ticketService] Estructura desconocida, intentando convertir...')
          tickets = Object.values(response.data).filter(item => Array.isArray(item)).flat()
        }
      }
      
      console.log('✅ [ticketService] Tickets extraídos:', tickets.length)
      console.log('✅ [ticketService] Primer ticket:', tickets[0])
      
      // 🎯 MAPEAR LOS TICKETS
      return tickets.map(ticket => ({
        ...ticket,
        userId: ticket.agent_id || null,
        optionId: undefined,
        licenseNumber: ticket.phone,
        user: undefined,
        option: undefined
      }))
      
    } catch (error: any) {
      if (error?.response?.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        const retryResponse = await api.get(`/tickets/modulo/${moduleId}/completos`)
        
        let tickets: any[] = []
        if (Array.isArray(retryResponse.data)) {
          tickets = retryResponse.data
        } else if (retryResponse.data && typeof retryResponse.data === 'object') {
          if (retryResponse.data.tickets && Array.isArray(retryResponse.data.tickets)) {
            tickets = retryResponse.data.tickets
          } else if (retryResponse.data.data && Array.isArray(retryResponse.data.data)) {
            tickets = retryResponse.data.data
          } else if (retryResponse.data.content && Array.isArray(retryResponse.data.content)) {
            tickets = retryResponse.data.content
          } else {
            tickets = Object.values(retryResponse.data).filter(item => Array.isArray(item)).flat()
          }
        }
        
        return tickets.map(ticket => ({
          ...ticket,
          userId: ticket.agent_id || null,
          optionId: undefined,
          licenseNumber: ticket.phone,
          user: undefined,
          option: undefined
        }))
      }
      console.error('❌ [ticketService] Error obteniendo tickets por módulo:', error)
      throw error
    }
  },

  // 🆕 Método auxiliar para convertir un Ticket a TicketModuleResponse
  convertTicketToModuleResponse(ticket: Ticket): TicketModuleResponse {
    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      status: ticket.status,
      createdAt: ticket.createdAt,
      priority: ticket.priority,
      createdBy: ticket.createdBy || 'Sistema',
      phone: ticket.phone || '',
      moduleName: ticket.moduleName || 'Sistema',
      categoryName: ticket.categoryName || '',
      subcategoryName: ticket.subcategoryName || '',
      calledAt: ticket.calledAt || null,
      completedAt: ticket.completedAt || null,
      agent_id: ticket.agent_id || null
    }
  }
}

// Exponer funciones de debug globalmente
if (typeof window !== 'undefined') {
  window.debugTickets = () => ticketService.debugPreAsignaciones()
  window.resetPreAssignments = () => ticketService.reiniciarPreAsignaciones()
  
  console.log('🔧 [ticketService] Funciones de debug disponibles:')
  console.log('  - window.debugTickets() - Ver estado del sistema')
  console.log('  - window.resetPreAssignments() - Reiniciar pre-asignaciones')
}
