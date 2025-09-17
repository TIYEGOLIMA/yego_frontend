import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { useConnectionStatus } from '../shared/hooks/useConnectionStatus';

interface ConnectionStatusProps {
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ className = '' }) => {
  const { status, showMaintenance } = useConnectionStatus();
  const [showRestoredBanner, setShowRestoredBanner] = useState(false);
  const [previousShowMaintenance, setPreviousShowMaintenance] = useState(false);

  // Detectar cuando se restaura la conexión (cuando showMaintenance cambia de true a false)
  useEffect(() => {
    if (previousShowMaintenance && !showMaintenance) {
      // Se restauró la conexión, mostrar banner
      setShowRestoredBanner(true);
      setTimeout(() => setShowRestoredBanner(false), 3000);
    }
    setPreviousShowMaintenance(showMaintenance);
  }, [showMaintenance, previousShowMaintenance]);

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-success-500" />;
      case 'connecting':
        return <Loader2 className="h-4 w-4 text-warning-500 animate-spin" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-error-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-neutral-500" />;
    }
  };

  return (
    <>
      {/* Indicador pequeño en el header - solo icono */}
      <div className={`flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 ${className}`} title={`Estado: ${status}`}>
        {getStatusIcon()}
      </div>

      {/* Banner de reconexión exitosa */}
      {showRestoredBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-success-500 text-white px-4 py-3 shadow-lg animate-slide-down">
          <div className="flex items-center justify-center space-x-2">
            <Wifi className="h-5 w-5" />
            <span className="font-medium">
              Conexión restaurada - Sistema operativo
            </span>
          </div>
        </div>
      )}
    </>
  );
}; 