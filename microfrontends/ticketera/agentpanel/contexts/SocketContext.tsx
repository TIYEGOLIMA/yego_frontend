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
export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const socketHook = useSocketHook()

  const contextValue: SocketContextType = useMemo(() => {
    return {
      client: null,
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

/** Hook para el WebSocket centralizado del sistema principal */
export const useSocket = () => {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error('useSocket debe ser usado dentro de un SocketProvider')
  }
  return context
}

export { SocketContext }