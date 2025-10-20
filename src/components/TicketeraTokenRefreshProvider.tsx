import React from 'react'
import { useTicketeraTokenRefresh } from '../hooks'

interface TicketeraTokenRefreshProviderProps {
  children: React.ReactNode
  intervalMinutes?: number
}

/**
 * Provider específico para manejar la renovación automática de tokens JWT en ticketera
 * Se debe usar en los componentes de ticketera
 */
export const TicketeraTokenRefreshProvider: React.FC<TicketeraTokenRefreshProviderProps> = ({ 
  children, 
  intervalMinutes = 30 
}) => {
  // Usar el hook de renovación de tokens de ticketera
  useTicketeraTokenRefresh(intervalMinutes)

  return <>{children}</>
}

export default TicketeraTokenRefreshProvider
