/**
 * Servicio para gestionar la conexión WebSocket con el backend
 * Permite suscribirse a eventos y enviar mensajes
 */
import { io, Socket } from 'socket.io-client';

// URL del servidor de WebSockets desde variables de entorno
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

class SocketService {
  private static instance: SocketService;
  public socket: Socket | null = null;
  private listeners: { [event: string]: Function[] } = {};
  private connectionStatus: 'connected' | 'disconnected' | 'connecting' = 'disconnected';
  private statusListeners: ((status: string) => void)[] = [];

  private constructor() {}

  private updateStatus(status: 'connected' | 'disconnected' | 'connecting') {
    this.connectionStatus = status;
    this.statusListeners.forEach(listener => listener(status));
  }

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public getConnectionStatus(): string {
    return this.connectionStatus;
  }

  public onStatusChange(callback: (status: string) => void) {
    this.statusListeners.push(callback);
  }

  public offStatusChange(callback: (status: string) => void) {
    this.statusListeners = this.statusListeners.filter(listener => listener !== callback);
  }

  /**
   * Conecta al servidor de WebSockets
   * @param sessionId ID de sesión para identificar al cliente
   */
  public connect(sessionId: string) {
    if (!this.socket) {
      console.log('🚀 [SocketService] Iniciando conexión Socket.IO...');
      console.log('🌐 [SocketService] URL del servidor:', SOCKET_URL);
      
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.log('❌ [SocketService] No hay token - no se puede conectar');
        return; // No conectar si no hay token
      }
      
      console.log('🔑 [SocketService] Token encontrado, conectando...');
      
      this.socket = io(`${SOCKET_URL}/socketio-ws`, {
        withCredentials: true,
        autoConnect: false, // No conectar automáticamente
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000, // Reducir delay de reconexión
        reconnectionDelayMax: 5000, // Máximo delay de 5 segundos
        timeout: 20000,
        auth: {
          token: token
        }
      });
      
      this.socket.on('connect', () => {
        console.log('✅ [SocketService] Socket.IO conectado exitosamente a:', SOCKET_URL);
        this.updateStatus('connected');
        this.socket?.emit('register-session', { sessionId });
        console.log('📝 [SocketService] Sesión registrada:', sessionId);
      });
      
      this.socket.on('disconnect', (reason) => {
        console.log('🔌 [SocketService] Socket desconectado:', reason);
        this.updateStatus('disconnected');
      });
      
      this.socket.on('connect_error', (error) => {
        console.log('❌ [SocketService] Error de conexión Socket.IO:', error);
        console.log('❌ [SocketService] Intentando conectar a:', SOCKET_URL);
        this.updateStatus('disconnected');
      });
      
      this.socket.on('reconnect_attempt', (attempt) => {
        console.log('🔌 Intento de reconexión:', attempt);
        this.updateStatus('connecting');
      });
      
      this.socket.on('reconnect', (attempt) => {
        console.log('🔌 Socket reconectado en intento:', attempt);
        this.updateStatus('connected');
        // Re-registrar la sesión después de reconectar
        this.socket?.emit('register-session', { sessionId });
      });
      
      this.socket.on('reconnect_error', (error) => {
        console.log('🔌 Error de reconexión:', error);
        this.updateStatus('disconnected');
      });
      
      this.socket.on('reconnect_failed', () => {
        console.log('🔌 Falló la reconexión');
        this.updateStatus('disconnected');
      });
      
      this.socket.on('session-closed', (...args) => {
        if (this.listeners['session-closed']) {
          this.listeners['session-closed'].forEach(fn => fn(...args));
        }
      });
      
      this.socket.on('force-logout', (...args) => {
        if (this.listeners['force-logout']) {
          this.listeners['force-logout'].forEach(fn => fn(...args));
        }
      });
      
      this.socket.on('permissions-updated', (...args) => {
        console.log('📡 Socket recibió evento permissions-updated:', args);
        if (this.listeners['permissions-updated']) {
          this.listeners['permissions-updated'].forEach(fn => fn(...args));
        }
      });
      
      // Conectar manualmente con un pequeño delay
      this.updateStatus('connecting');
      setTimeout(() => {
        this.socket?.connect();
      }, 100);
    } else {
      // Si ya existe el socket, solo registrar la sesión
      this.socket.emit('register-session', { sessionId });
    }
  }

  /**
   * Registra un listener para un evento
   * @param event Nombre del evento
   * @param callback Función a ejecutar cuando se reciba el evento
   */
  public on(event: string, callback: (...args: any[]) => void) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
    this.socket?.on(event, callback);
  }

  /**
   * Elimina un listener para un evento
   * @param event Nombre del evento
   * @param callback Función a eliminar
   */
  public off(event: string, callback: (...args: any[]) => void) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(fn => fn !== callback);
      this.socket?.off(event, callback);
    }
  }

  /**
   * Registra un listener para el evento force-logout
   * @param callback Función a ejecutar cuando se reciba el evento
   */
  public onForceLogout(callback: () => void) {
    this.socket?.on('force-logout', callback);
  }

  /**
   * Desconecta del servidor de WebSockets
   */
  public disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.listeners = {};
  }

  /**
   * Emite un evento al servidor
   * @param event Nombre del evento
   * @param data Datos a enviar
   */
  public emit(event: string, data?: any) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
      return true;
    }
    return false;
  }
}

export default SocketService;