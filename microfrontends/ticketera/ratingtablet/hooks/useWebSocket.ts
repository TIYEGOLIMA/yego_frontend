import { useCallback } from 'react'
import { useWebSocket } from '../../../shared/hooks/useWebSocket'
import { getDispositivoSession } from '../../../../src/services/core/device-auth-service'

interface UseRatingWebSocketReturn {
  isConnected: boolean
  connectionStatus: string
  onTicketCompleted: (callback: (ticket: any) => void, moduleId?: string | null) => () => void
  onRatingRequested: (callback: (ratingRequest: any) => void, moduleId?: string | null) => () => void
  emitRatingSubmitted: (ratingData: any) => boolean
}

const perteneceASedeDispositivo = (ticket: any): boolean => {
  const session = getDispositivoSession()
  const sedeDispositivo = session?.sedeId ?? null
  if (sedeDispositivo == null) return true
  if (ticket?.sedeId == null) return false
  return Number(ticket.sedeId) === Number(sedeDispositivo)
}

export const useRatingWebSocket = (): UseRatingWebSocketReturn => {
  const {
    isConnected,
    connectionStatus,
    onTicketeraEvent,
    sendTicketeraEvent
  } = useWebSocket()

  const belongsToModule = (ticket: any, moduleId: string | null | undefined): boolean => {
    if (!moduleId || !ticket?.moduleId) {
      return false
    }
    
    const ticketModuleIdStr = String(ticket.moduleId).trim()
    const userModuleIdStr = String(moduleId).trim()
    
    const ticketModuleId = parseInt(ticketModuleIdStr, 10)
    const userModuleId = parseInt(userModuleIdStr, 10)
    
    if (!isNaN(ticketModuleId) && !isNaN(userModuleId)) {
      return ticketModuleId === userModuleId
    }

    return ticketModuleIdStr === userModuleIdStr
  }

  const onTicketCompleted = useCallback((callback: (ticket: any) => void, moduleId?: string | null): () => void => {
    return onTicketeraEvent((event: any) => {
      if (event.type === 'ticket_completed') {
        const ticket = event.data || event.ticket || event
        
        if (!ticket) {
          return
        }

        if (!perteneceASedeDispositivo(ticket)) {
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

  const onRatingRequested = useCallback((callback: (ratingRequest: any) => void, moduleId?: string | null): () => void => {
    return onTicketeraEvent((event: any) => {
      if (event.type === 'RATING_REQUESTED' || event.type === 'rating-requested') {
        const ratingRequest = event
        const ticket = ratingRequest.ticket || ratingRequest.data?.ticket

        if (ticket && !perteneceASedeDispositivo(ticket)) {
          return
        }

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
