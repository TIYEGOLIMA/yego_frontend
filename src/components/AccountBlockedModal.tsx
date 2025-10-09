import React, { useEffect, useState } from 'react'
import { AlertTriangle, Ban } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'

interface AccountBlockedModalProps {
  isOpen: boolean
  message: string
  username: string
  onAutoLogout: () => void
}

export const AccountBlockedModal: React.FC<AccountBlockedModalProps> = ({
  isOpen,
  message,
  username,
  onAutoLogout
}) => {
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    if (!isOpen) return

    // Iniciar cuenta regresiva
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          onAutoLogout()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isOpen, onAutoLogout])

  return (
    <Dialog open={isOpen}>
      <DialogContent 
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <Ban className="h-6 w-6" />
            Cuenta Bloqueada
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Icono principal */}
          <div className="flex justify-center py-4">
            <div className="relative">
              <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping"></div>
              <div className="relative bg-red-500/10 p-6 rounded-full">
                <AlertTriangle className="h-16 w-16 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>

          {/* Información del usuario */}
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="space-y-2">
              <p className="text-sm text-red-800 dark:text-red-200 font-medium text-center">
                <span className="font-semibold">{username}</span>
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 text-center">
                {message}
              </p>
            </div>
          </div>

          {/* Cuenta regresiva */}
          <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                Cerrando sesión automáticamente en:
              </p>
              <div className="flex items-center justify-center">
                <div className="relative w-16 h-16">
                  <svg className="transform -rotate-90 w-16 h-16">
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      className="text-gray-200 dark:text-gray-700"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 28}`}
                      strokeDashoffset={`${2 * Math.PI * 28 * (1 - countdown / 3)}`}
                      className="text-red-600 dark:text-red-400 transition-all duration-1000"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-red-600 dark:text-red-400">
                      {countdown}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

