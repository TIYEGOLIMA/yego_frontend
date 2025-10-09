import React, { useState, useEffect } from 'react'
import { ShieldX, X } from 'lucide-react'
import { Button } from './ui/button'

interface AccountBlockedToastProps {
  isVisible: boolean
  onClose: () => void
  onLogout: () => void
  message: string
  username: string
  autoLogoutDelay: number
}

export const AccountBlockedToast: React.FC<AccountBlockedToastProps> = ({
  isVisible,
  onClose,
  onLogout,
  message,
  username,
  autoLogoutDelay
}) => {
  const [countdown, setCountdown] = useState(Math.ceil(autoLogoutDelay / 1000))

  useEffect(() => {
    if (!isVisible) return

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          onLogout()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isVisible, onLogout])

  if (!isVisible) return null

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
      <div className="bg-red-600 text-white rounded-lg shadow-lg border border-red-700 p-4 animate-in slide-in-from-right duration-300">
        <div className="flex items-start gap-3">
          <ShieldX className="h-5 w-5 text-red-200 mt-0.5 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Cuenta Bloqueada</h4>
            </div>
            
            <p className="text-sm text-red-100">
              Hola, <span className="font-medium">{username}</span>
            </p>
            
            <p className="text-sm text-red-200">
              {message}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-red-200">
                  Cierre automático en {countdown}s
                </span>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className="text-xs text-red-200 hover:text-white hover:bg-red-700 h-6 px-2"
              >
                Cerrar ahora
              </Button>
            </div>

            {/* Barra de progreso */}
            <div className="w-full bg-red-800 rounded-full h-1">
              <div 
                className="bg-red-200 h-1 rounded-full transition-all duration-1000 ease-linear"
                style={{ 
                  width: `${((autoLogoutDelay / 1000 - countdown) / (autoLogoutDelay / 1000)) * 100}%` 
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
