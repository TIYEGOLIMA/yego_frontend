import { useEffect, useState } from 'react'
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
    onTicketCompleted,
    onRatingSubmitted,
    emit
  } = useWebSocket({
    debug: true,
    autoReconnect: true
  })

  console.log('🌟 [RatingTablet] Estado WebSocket:', {
    isConnected,
    connectionStatus
  })

  // Método para emitir rating enviado
  const emitRatingSubmitted = (ratingData: any): boolean => {
    console.log('📤 [RatingTablet] Enviando rating:', ratingData)
    return emit('rating-submitted', ratingData)
  }

  // Suscripción a solicitudes de rating (eventos personalizados)
  const onRatingRequested = (callback: (ratingRequest: any) => void): () => void => {
    console.log('🔔 [RatingTablet] Suscribiendo a rating-requested')
    
    // Usando el WebSocket centralizado para eventos personalizados
    const { subscribe } = useWebSocket()
    
    return subscribe([
      ['rating-requested', callback]
    ])
  }

  return {
    isConnected,
    connectionStatus,
    onTicketCompleted,
    onRatingRequested,
    emitRatingSubmitted
  }
}

export default useRatingWebSocket
