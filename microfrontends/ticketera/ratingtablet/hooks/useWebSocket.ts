import { useEffect, useState, useCallback } from 'react'
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
  } = useWebSocket({
    debug: true
  })

  console.log('🌟 [RatingTablet] Estado WebSocket:', {
    isConnected,
    connectionStatus
  })

  // Función helper para verificar si un ticket pertenece al módulo
  const belongsToModule = (ticket: any, moduleId: string | null | undefined): boolean => {
    if (!moduleId || !ticket?.moduleId) {
      return false
    }
    
    const ticketModuleId = parseInt(ticket.moduleId.toString())
    const userModuleId = parseInt(moduleId.toString())
    
    return ticketModuleId === userModuleId
  }

  // Método para suscribirse a tickets completados (con filtrado por módulo)
  const onTicketCompleted = useCallback((callback: (ticket: any) => void, moduleId?: string | null): () => void => {
    console.log('🔔 [RatingTablet Hook] Suscribiendo a ticket_completed', { moduleId })
    
    return onTicketeraEvent((event: any) => {
      console.log('📥 [RatingTablet Hook] EVENTO RECIBIDO:', event)
      console.log('📥 [RatingTablet Hook] Tipo de evento:', event.type)
      
      // 🎯 CORRECTO: El socket-service envía 'ticket_completed' (con guión bajo)
      if (event.type === 'ticket_completed' || event.type === 'TICKET_COMPLETED' || event.type === 'ticket-completed' || event.type === 'COMPLETED') {
        const ticket = event.data || event.ticket || event
        
        // 🎯 FILTRAR POR MÓDULO: Solo pasar tickets del módulo correcto
        if (moduleId) {
          if (!belongsToModule(ticket, moduleId)) {
            console.log(`⚠️ [RatingTablet Hook] Ticket del módulo ${ticket.moduleId} no corresponde al módulo ${moduleId} - FILTRADO`)
            return
          }
          console.log(`✅ [RatingTablet Hook] Ticket del módulo ${ticket.moduleId} corresponde al módulo ${moduleId} - PROCESANDO`)
        } else {
          console.warn('⚠️ [RatingTablet Hook] No hay moduleId - ignorando ticket')
          return
        }
        
        console.log('✅✅✅ [RatingTablet Hook] Ticket completado detectado y filtrado correctamente!')
        callback(ticket)
      } else {
        console.log('⚠️ [RatingTablet Hook] Tipo de evento no coincide:', event.type)
      }
    })
  }, [onTicketeraEvent])

  // Método para suscribirse a solicitudes de rating (con filtrado por módulo)
  const onRatingRequested = useCallback((callback: (ratingRequest: any) => void, moduleId?: string | null): () => void => {
    console.log('🔔 [RatingTablet] Suscribiendo a rating-requested', { moduleId })
    
    return onTicketeraEvent((event: any) => {
      if (event.type === 'RATING_REQUESTED' || event.type === 'rating-requested') {
        const ratingRequest = event
        const ticket = ratingRequest.ticket || ratingRequest.data?.ticket
        
        // 🎯 FILTRAR POR MÓDULO: Solo pasar solicitudes del módulo correcto
        if (moduleId && ticket) {
          if (!belongsToModule(ticket, moduleId)) {
            console.log(`⚠️ [RatingTablet Hook] Rating request del módulo ${ticket.moduleId} no corresponde al módulo ${moduleId} - FILTRADO`)
            return
          }
          console.log(`✅ [RatingTablet Hook] Rating request del módulo ${ticket.moduleId} corresponde al módulo ${moduleId} - PROCESANDO`)
        } else if (!moduleId) {
          console.warn('⚠️ [RatingTablet Hook] No hay moduleId - ignorando rating request')
          return
        }
        
        console.log('⭐ [RatingTablet] Solicitud de rating recibida y filtrada correctamente:', event)
        callback(event)
      }
    })
  }, [onTicketeraEvent])

  // Método para emitir rating enviado
  const emitRatingSubmitted = useCallback((ratingData: any): boolean => {
    console.log('📤 [RatingTablet] Enviando rating:', ratingData)
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
