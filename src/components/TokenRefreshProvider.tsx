import React from 'react'
import { useTokenRefresh } from '../hooks'

interface TokenRefreshProviderProps {
  children: React.ReactNode
  intervalMinutes?: number
}

/**
 * Provider que maneja la renovación automática de tokens JWT
 * Se debe usar en el componente raíz de la aplicación
 */
export const TokenRefreshProvider: React.FC<TokenRefreshProviderProps> = ({ 
  children, 
  intervalMinutes = 30 
}) => {
  // Usar el hook de renovación de tokens
  useTokenRefresh(intervalMinutes)

  return <>{children}</>
}

export default TokenRefreshProvider
