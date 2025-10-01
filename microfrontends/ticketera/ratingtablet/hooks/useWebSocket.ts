import { useEffect, useState, useCallback } from 'react'
import { useWebSocket } from '../../../shared/hooks/useWebSocket'

interface UseRatingWebSocketReturn {
  isConnected: boolean
  connectionStatus: string
  onTicketCompleted: (callback: (ticket: any) => void) => () => void
  onRatingRequested: (callback: (ratingRequest: any) => void) => () => void
  emitRatingSubmitted: (ratingData: any) => boolean
}

/**
 * Hook WebSocket específico para RatingTablet
 * Maneja eventos de tickets completados que necesitan calificación
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

  // Método para suscribirse a tickets completados
  const onTicketCompleted = useCallback((callback: (ticket: any) => void): () => void => {
    console.log('🔔 [RatingTablet Hook] Suscribiendo a ticket_completed')
    
    return onTicketeraEvent((event: any) => {
      console.log('📥 [RatingTablet Hook] EVENTO RECIBIDO:', event)
      console.log('📥 [RatingTablet Hook] Tipo de evento:', event.type)
      console.log('📥 [RatingTablet Hook] Evento completo:', JSON.stringify(event, null, 2))
      
      // 🎯 CORRECTO: El socket-service envía 'ticket_completed' (con guión bajo)
      if (event.type === 'ticket_completed' || event.type === 'TICKET_COMPLETED' || event.type === 'ticket-completed' || event.type === 'COMPLETED') {
        console.log('✅✅✅ [RatingTablet Hook] Ticket completado detectado!')
        callback(event.data || event.ticket || event)
      } else {
        console.log('⚠️ [RatingTablet Hook] Tipo de evento no coincide:', event.type)
      }
    })
  }, [onTicketeraEvent])

  // Método para suscribirse a solicitudes de rating
  const onRatingRequested = useCallback((callback: (ratingRequest: any) => void): () => void => {
    console.log('🔔 [RatingTablet] Suscribiendo a rating-requested')
    
    return onTicketeraEvent((event: any) => {
      if (event.type === 'RATING_REQUESTED' || event.type === 'rating-requested') {
        console.log('⭐ [RatingTablet] Solicitud de rating recibida:', event)
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
