import { useState, useEffect, useRef } from 'react';
import SocketService from '../../services/socket-service';

export const useConnectionStatus = () => {
  const [status, setStatus] = useState<string>('disconnected');
  const [isConnected, setIsConnected] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);
  const lastStatusRef = useRef<string>('disconnected');
  const hasBeenConnectedRef = useRef<boolean>(false);

  useEffect(() => {
    const socket = SocketService;
    
    const initialStatus = socket.getConnectionStatus();
    setStatus(initialStatus);
    setIsConnected(initialStatus === 'connected');
    lastStatusRef.current = initialStatus;
    
    if (initialStatus === 'connected') {
      hasBeenConnectedRef.current = true;
    }
    
    const handleStatusChange = (newStatus: string) => {
      if (newStatus === lastStatusRef.current) {
        return;
      }
      
      if (newStatus === 'connected') {
        hasBeenConnectedRef.current = true;
        setShowMaintenance(false);
        setIsConnected(true);
      } else {
        setIsConnected(false);
        if (newStatus === 'disconnected' && lastStatusRef.current === 'connected' && hasBeenConnectedRef.current) {
          setShowMaintenance(true);
        }
      }
      
        setStatus(newStatus);
        lastStatusRef.current = newStatus;
    };

    const handleReconnectExceeded = () => {
      console.warn('⚠️ [ConnectionStatus] Se excedieron los intentos de reconexión. El servidor puede haber sido actualizado. Considera refrescar la página.');
      setShowMaintenance(true);
    };

    socket.onStatusChange(handleStatusChange);
    socket.onReconnectExceeded(handleReconnectExceeded);

    return () => {
      socket.offStatusChange(handleStatusChange);
      socket.offReconnectExceeded(handleReconnectExceeded);
    };
  }, []);

  return {
    status,
    isConnected,
    showMaintenance
  };
}; 