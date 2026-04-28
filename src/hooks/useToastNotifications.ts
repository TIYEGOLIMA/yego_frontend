import { useState, useCallback, useRef, useEffect } from 'react';

export interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  timestamp: number;
}

export interface UseToastNotificationsReturn {
  notifications: ToastNotification[];
  addNotification: (notification: Omit<ToastNotification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
}

export const useToastNotifications = (): UseToastNotificationsReturn => {
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))

    // Clear timer if exists
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  const addNotification = useCallback((notification: Omit<ToastNotification, 'id' | 'timestamp'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    const timestamp = Date.now()
    const duration = notification.duration || 5000

    const newNotification: ToastNotification = {
      ...notification,
      id,
      timestamp,
    }

    setNotifications((prev) => [...prev, newNotification])

    // Auto-remove notification after duration
    if (duration > 0) {
      const timer = setTimeout(() => {
        removeNotification(id)
      }, duration)

      timersRef.current.set(id, timer)
    }

    // Play sound for error notifications
    if (notification.type === 'error') {
      playNotificationSound('error')
    } else if (notification.type === 'warning') {
      playNotificationSound('warning')
    }

    return id
  }, [removeNotification])

  const clearAllNotifications = useCallback(() => {
    // Clear all timers
    timersRef.current.forEach(timer => clearTimeout(timer));
    timersRef.current.clear();
    
    setNotifications([]);
  }, []);

  const showSuccess = useCallback((message: string, duration?: number) => {
    return addNotification({ message, type: 'success', duration });
  }, [addNotification]);

  const showError = useCallback((message: string, duration?: number) => {
    return addNotification({ message, type: 'error', duration });
  }, [addNotification]);

  const showWarning = useCallback((message: string, duration?: number) => {
    return addNotification({ message, type: 'warning', duration });
  }, [addNotification]);

  const showInfo = useCallback((message: string, duration?: number) => {
    return addNotification({ message, type: 'info', duration });
  }, [addNotification]);

  // Play notification sound
  const playNotificationSound = (type: 'success' | 'error' | 'warning' | 'info') => {
    try {
      // Create audio context if not available
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;

      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Different frequencies for different types
      const frequencies = {
        success: 800,
        error: 400,
        warning: 600,
        info: 1000
      };

      oscillator.frequency.setValueAtTime(frequencies[type], audioContext.currentTime);
      oscillator.type = 'sine';

      // Volume envelope
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      // Duration based on type
      const durations = {
        success: 0.2,
        error: 0.5,
        warning: 0.3,
        info: 0.2
      };

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + durations[type]);
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(timer => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
};

export default useToastNotifications;
