import React from 'react';
import { 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  X 
} from 'lucide-react';
import { ToastNotification } from '../hooks/useToastNotifications';

interface NotificationToastProps {
  notification: ToastNotification;
  onRemove: (id: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onRemove
}) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5" />;
      case 'error':
        return <AlertCircle className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      case 'info':
        return <Info className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getStyles = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-500 text-white border-green-600';
      case 'error':
        return 'bg-red-500 text-white border-red-600';
      case 'warning':
        return 'bg-orange-500 text-white border-orange-600';
      case 'info':
        return 'bg-blue-500 text-white border-blue-600';
      default:
        return 'bg-gray-500 text-white border-gray-600';
    }
  };

  return (
    <div
      className={`
        relative max-w-sm w-full shadow-lg rounded-lg border-l-4 p-4 mb-2
        transform transition-all duration-300 ease-in-out
        ${getStyles()}
        animate-in slide-in-from-right-full
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="ml-3 w-0 flex-1">
          <p className="text-sm font-medium">
            {notification.message}
          </p>
          <p className="text-xs opacity-75 mt-1">
            {new Date(notification.timestamp).toLocaleTimeString('es-PE')}
          </p>
        </div>
        <div className="ml-4 flex-shrink-0 flex">
          <button
            className="inline-flex text-white hover:text-gray-200 focus:outline-none focus:text-gray-200 transition ease-in-out duration-150"
            onClick={() => onRemove(notification.id)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Progress bar */}
      {notification.duration && notification.duration > 0 && (
        <div className="absolute bottom-0 left-0 h-1 bg-black bg-opacity-20 rounded-b-lg overflow-hidden">
          <div 
            className="h-full bg-white bg-opacity-30 animate-pulse"
            style={{
              animationDuration: `${notification.duration}ms`,
              animationName: 'progress'
            }}
          />
        </div>
      )}
    </div>
  );
};

interface NotificationContainerProps {
  notifications: ToastNotification[];
  onRemove: (id: string) => void;
}

export const NotificationContainer: React.FC<NotificationContainerProps> = ({
  notifications,
  onRemove
}) => {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
};

export default NotificationToast;
