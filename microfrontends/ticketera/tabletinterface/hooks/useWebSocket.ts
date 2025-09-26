import { useEffect } from 'react'
import { useWebSocket } from '../../../shared/hooks/useWebSocket'

interface UseTabletInterfaceWebSocketReturn {
  isConnected: boolean
  connectionStatus: string
  onTicketCreated: (callback: (ticket: any) => void) => () => void
  onQueueChanged: (callback: (queueData: any) => void) => () => void
  emitTicketCreated: (ticketData: any) => boolean
}

/**
 * Hook WebSocket específico para TabletInterface
 * Maneja eventos relacionados con la creación de tickets y cambios de cola
 */
export const useTabletInterfaceWebSocket = (): UseTabletInterfaceWebSocketReturn => {
  const {
    isConnected,
    connectionStatus,
    onTicketCreated,
    onQueueChanged,
    emit
  } = useWebSocket({
    debug: true,
    autoReconnect: true
  })

  console.log('📱 [TabletInterface] Estado WebSocket:', {
    isConnected,
    connectionStatus
  })

  // Método para emitir nuevo ticket creado
  const emitTicketCreated = (ticketData: any): boolean => {
    console.log('📤 [TabletInterface] Enviando nuevo ticket:', ticketData)
    return emit('ticket-created', ticketData)
  }

  // Auto-notificar cuando se conecta
  useEffect(() => {
    if (isConnected) {
      console.log('✅ [TabletInterface] WebSocket conectado y listo')
    }
  }, [isConnected])

  return {
    isConnected,
    connectionStatus,
    onTicketCreated,
    onQueueChanged,
    emitTicketCreated
  }
}

export default useTabletInterfaceWebSocket
