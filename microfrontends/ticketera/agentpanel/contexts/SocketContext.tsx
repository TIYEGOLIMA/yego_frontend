import React, { createContext, useContext, useMemo } from 'react'
import { useSocket as useSocketHook } from '../hooks/useSocket'

interface SocketContextType {
  client: null // Mantenido para compatibilidad
  isConnected: boolean
  latency: number
  connect: () => void
  disconnect: () => void
  reconnectWithAuth: () => void
  subscribe: (topic: string, callback: (message: any) => void) => (() => void) | null
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

/**
 * SocketProvider actualizado para usar el WebSocket centralizado
 * Mantiene la misma interfaz para compatibilidad con componentes existentes
 */
export function SocketProvider({ children }: { children: React.ReactNode }) {
  // 🎯 USAR WEBSOCKET CENTRALIZADO EN LUGAR DE CREAR UNO PROPIO
  const socketHook = useSocketHook()

  // 🎯 MEMOIZAR EL CONTEXT VALUE PARA EVITAR RE-RENDERS INFINITOS
  const contextValue: SocketContextType = useMemo(() => {
    console.log('🎬 [SocketProvider] Iniciando con WebSocket centralizado')
    console.log('🔌 [SocketProvider] Estado de conexión:', {
      isConnected: socketHook.isConnected,
      latency: socketHook.latency
    })

    return {
      client: null, // No hay cliente STOMP, ahora usa Socket.IO centralizado
      isConnected: socketHook.isConnected,
      latency: socketHook.latency,
      connect: socketHook.connect,
      disconnect: socketHook.disconnect,
      reconnectWithAuth: socketHook.reconnectWithAuth,
      subscribe: socketHook.subscribe
    }
  }, [socketHook.isConnected, socketHook.latency, socketHook.connect, socketHook.disconnect, socketHook.reconnectWithAuth, socketHook.subscribe])

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  )
}

/**
 * Hook para usar el contexto de WebSocket
 * Ahora usa el WebSocket centralizado del sistema principal
 */
export const useSocket = () => {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error('useSocket debe ser usado dentro de un SocketProvider')
  }
  return context
}

// Exportar también el context para compatibilidad
export { SocketContext }
export default SocketContext