import React, { createContext, useContext, useMemo } from 'react'
import { useSocket as useSocketHook } from '../hooks/useSocket'

interface SocketContextType {
  isConnected: boolean
  subscribe: <T = unknown>(topic: string, callback: (message: T) => void) => (() => void) | null
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { isConnected, subscribe } = useSocketHook()
  const value = useMemo<SocketContextType>(() => ({ isConnected, subscribe }), [isConnected, subscribe])
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSocket = () => {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error('useSocket debe ser usado dentro de un SocketProvider')
  }
  return context
}
