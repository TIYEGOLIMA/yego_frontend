import React from 'react';
import { WifiOff, AlertTriangle } from 'lucide-react';
import { useConnectionStatus } from '../shared/hooks/useConnectionStatus';

interface MaintenanceOverlayProps {
  children: React.ReactNode;
}

export const MaintenanceOverlay: React.FC<MaintenanceOverlayProps> = ({ children }) => {
  const { showMaintenance } = useConnectionStatus();

  // Si no hay mantenimiento, mostrar contenido normal
  if (!showMaintenance) {
    return <>{children}</>;
  }

  // Si hay mantenimiento, mostrar overlay
  return (
    <div className="fixed inset-0 z-50 bg-background dark:bg-background-dark flex items-center justify-center">
      <div className="text-center max-w-md mx-4">
        <div className="w-20 h-20 bg-error-100 dark:bg-error-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <WifiOff className="w-10 h-10 text-error-500" />
        </div>
        
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
          Sistema en Mantenimiento
        </h2>
        
        <p className="text-neutral-600 dark:text-neutral-400 mb-6 leading-relaxed">
          El servidor no está disponible en este momento. Estamos trabajando para restaurar el servicio lo antes posible.
        </p>
        
        <div className="bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-warning-500 mt-0.5 flex-shrink-0" />
            <div className="text-left">
              <p className="text-sm font-medium text-warning-800 dark:text-warning-200 mb-1">
                Funcionalidades limitadas
              </p>
              <p className="text-xs text-warning-700 dark:text-warning-300">
                Algunas funciones que requieren conexión en tiempo real no estarán disponibles hasta que se restaure la conexión.
              </p>
            </div>
          </div>
        </div>
        
        <div className="space-y-2 text-sm text-neutral-500 dark:text-neutral-400">
          <p>• La página se actualizará automáticamente cuando se restaure la conexión</p>
          <p>• Puede intentar recargar la página manualmente</p>
          <p>• Si el problema persiste, contacte al administrador</p>
        </div>
        
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
        >
          Recargar Página
        </button>
      </div>
    </div>
  );
}; 