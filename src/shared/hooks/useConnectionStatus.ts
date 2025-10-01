import { useState, useEffect, useRef } from 'react';
import SocketService from '../../services/socket-service';

export const useConnectionStatus = () => {
  const [status, setStatus] = useState<string>('disconnected');
  const [isConnected, setIsConnected] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastStatusRef = useRef<string>('disconnected');
  const hasBeenConnectedRef = useRef<boolean>(false);

  useEffect(() => {
    const socket = SocketService;
    
    // Obtener estado inicial
    const initialStatus = socket.getConnectionStatus();
    setStatus(initialStatus);
    setIsConnected(initialStatus === 'connected');
    lastStatusRef.current = initialStatus;
    
    // Solo mostrar mantenimiento si ya había estado conectado antes
    if (initialStatus === 'connected') {
      hasBeenConnectedRef.current = true;
    }
    
    // Escuchar cambios de estado con debounce
    const handleStatusChange = (newStatus: string) => {
      // Limpiar timeout anterior si existe
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      // Si el estado no cambió, no hacer nada
      if (newStatus === lastStatusRef.current) {
        return;
      }
      
      // Marcar que ha estado conectado
      if (newStatus === 'connected') {
        hasBeenConnectedRef.current = true;
      }
      
      // Para cambios de 'connected' a 'disconnected', mostrar mantenimiento inmediatamente
      if (newStatus === 'disconnected' && lastStatusRef.current === 'connected') {
        setShowMaintenance(true);
        setStatus(newStatus);
        setIsConnected(false);
        lastStatusRef.current = newStatus;
        return;
      }
      
      // Para cambios de 'disconnected' a 'connecting', no mostrar overlay de reconexión
      if (newStatus === 'connecting' && lastStatusRef.current === 'disconnected') {
        setStatus(newStatus);
        setIsConnected(false);
        lastStatusRef.current = newStatus;
        return;
      }
      
      // Para cambios a 'connected', ocultar mantenimiento inmediatamente
      if (newStatus === 'connected') {
        setShowMaintenance(false);
        setStatus(newStatus);
        setIsConnected(true);
        lastStatusRef.current = newStatus;
      } else {
        // Para otros cambios, aplicar inmediatamente
        setStatus(newStatus);
        setIsConnected(newStatus === 'connected');
        lastStatusRef.current = newStatus;
      }
    };

    socket.onStatusChange(handleStatusChange);

    return () => {
      socket.offStatusChange(handleStatusChange);
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    status,
    isConnected,
    isConnecting: status === 'connecting',
    isDisconnected: status === 'disconnected',
    showMaintenance
  };
}; 