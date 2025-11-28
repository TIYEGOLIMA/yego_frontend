import React, { useEffect, useState } from 'react'
import { AlertTriangle, ShieldOff } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'

interface RoleDeactivatedModalProps {
  isOpen: boolean
  message: string
  autoLogoutDelay?: number // Mantener para compatibilidad pero no se usa
  roleName?: string
  onAutoLogout: () => void
}

export const RoleDeactivatedModal: React.FC<RoleDeactivatedModalProps> = ({
  isOpen,
  message,
  roleName,
  onAutoLogout
}) => {
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    if (!isOpen) return

    // Reiniciar countdown cuando se abre el modal
    setCountdown(5)

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
          <DialogTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
            <ShieldOff className="h-6 w-6" />
            Rol Desactivado
          </DialogTitle>
          <DialogDescription>
            {roleName && (
              <span className="font-semibold">{roleName}</span>
            )}
            {message}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Icono principal */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-orange-500/20 rounded-full animate-ping"></div>
              <div className="relative bg-orange-500/10 p-6 rounded-full">
                <AlertTriangle className="h-16 w-16 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>

          {/* Cuenta regresiva */}
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
              Redirigiendo al login en:
            </p>
            <div className="relative w-20 h-20">
              <svg className="transform -rotate-90 w-20 h-20">
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  className="text-gray-200 dark:text-gray-700"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 36}`}
                  strokeDashoffset={`${2 * Math.PI * 36 * (1 - countdown / 5)}`}
                  className="text-orange-600 dark:text-orange-400 transition-all duration-1000"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl font-bold text-orange-600 dark:text-orange-400">
                  {countdown}
                </span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

