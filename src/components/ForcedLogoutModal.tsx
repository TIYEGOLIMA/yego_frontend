import React from 'react'
import { AlertTriangle, LogOut } from 'lucide-react'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'

interface ForcedLogoutModalProps {
  isOpen: boolean
  onLogout: () => void
  message: string
  username: string
}

export const ForcedLogoutModal: React.FC<ForcedLogoutModalProps> = ({
  isOpen,
  onLogout,
  message,
  username
}) => {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Sesión Requerida
          </DialogTitle>
          <DialogDescription>
            {message}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="space-y-2">
              <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                Hola, <span className="font-semibold">{username}</span>
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                {message}
              </p>
            </div>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              <strong>Nota:</strong> Esta acción es requerida para mantener la seguridad de tu cuenta.
            </p>
          </div>

          <div className="flex justify-center pt-2">
            <Button
              onClick={onLogout}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <LogOut className="h-4 w-4 mr-2" /> Cerrar Sesión
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
