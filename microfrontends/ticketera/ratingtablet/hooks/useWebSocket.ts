import { useCallback } from 'react'
import { useWebSocket } from '../../../shared/hooks/useWebSocket'

interface UseRatingWebSocketReturn {
  isConnected: boolean
  connectionStatus: string
  onTicketCompleted: (callback: (ticket: any) => void, moduleId?: string | null) => () => void
  onRatingRequested: (callback: (ratingRequest: any) => void, moduleId?: string | null) => () => void
  emitRatingSubmitted: (ratingData: any) => boolean
}

/**
 * Hook WebSocket específico para RatingTablet
 * Maneja eventos de tickets completados que necesitan calificación
 * Filtra eventos por moduleId para que solo lleguen al tablet correcto
 */
export const useRatingWebSocket = (): UseRatingWebSocketReturn => {
  const {
    isConnected,
    connectionStatus,
    onTicketeraEvent,
    sendTicketeraEvent
  } = useWebSocket()

  // Función helper para verificar si un ticket pertenece al módulo
  const belongsToModule = (ticket: any, moduleId: string | null | undefined): boolean => {
    if (!moduleId || !ticket?.moduleId) {
      return false
    }
    
    // Normalizar ambos valores a string y luego a número para comparación
    const ticketModuleIdStr = String(ticket.moduleId).trim()
    const userModuleIdStr = String(moduleId).trim()
    
    // Intentar comparar como números primero
    const ticketModuleId = parseInt(ticketModuleIdStr, 10)
    const userModuleId = parseInt(userModuleIdStr, 10)
    
    // Si ambos son números válidos, comparar numéricamente
    if (!isNaN(ticketModuleId) && !isNaN(userModuleId)) {
    return ticketModuleId === userModuleId
    }
    
    // Si no, comparar como strings
    return ticketModuleIdStr === userModuleIdStr
  }

  // Método para suscribirse a tickets completados (con filtrado por módulo)
  const onTicketCompleted = useCallback((callback: (ticket: any) => void, moduleId?: string | null): () => void => {
    return onTicketeraEvent((event: any) => {
      if (event.type === 'ticket_completed') {
        const ticket = event.data || event.ticket || event
        
        if (!ticket) {
          return
        }
        
        if (moduleId) {
          if (!ticket.moduleId) {
            return
          }
          
          const ticketModuleId = Number(ticket.moduleId)
          const userModuleId = Number(moduleId)
          
          if (isNaN(ticketModuleId) || isNaN(userModuleId) || ticketModuleId !== userModuleId) {
            return
          }
        } else {
          if (ticket.moduleId) {
          return
          }
        }
        
        callback(ticket)
      }
    })
  }, [onTicketeraEvent])

  // Método para suscribirse a solicitudes de rating (con filtrado por módulo)
  const onRatingRequested = useCallback((callback: (ratingRequest: any) => void, moduleId?: string | null): () => void => {
    return onTicketeraEvent((event: any) => {
      if (event.type === 'RATING_REQUESTED' || event.type === 'rating-requested') {
        const ratingRequest = event
        const ticket = ratingRequest.ticket || ratingRequest.data?.ticket
        
        // 🎯 FILTRAR POR MÓDULO: Solo pasar solicitudes del módulo correcto
        if (moduleId && ticket) {
          if (!belongsToModule(ticket, moduleId)) {
            return
          }
        } else if (!moduleId) {
          return
        }
        
        callback(event)
      }
    })
  }, [onTicketeraEvent])

  // Método para emitir rating enviado
  const emitRatingSubmitted = useCallback((ratingData: any): boolean => {
    sendTicketeraEvent({
      type: 'RATING_SUBMITTED',
      data: ratingData,
      timestamp: new Date().toISOString()
    })
    return true
  }, [sendTicketeraEvent])

  return {
    isConnected,
    connectionStatus,
    onTicketCompleted,
    onRatingRequested,
    emitRatingSubmitted
  }
}

export default useRatingWebSocket
