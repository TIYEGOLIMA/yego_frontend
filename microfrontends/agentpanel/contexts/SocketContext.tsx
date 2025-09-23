import React, { createContext, useContext, useEffect, useState } from 'react'
import { Client, StompSubscription } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { SOCKET_URL } from '../utils/constants'
import { WEBSOCKET_CONFIG } from '../utils/websocketConfig'
import { safeGetItem } from '../utils/storage'
import { AGENT_CONFIG } from '../config/agentConfig'

interface SocketContextType {
  client: Client | null
  isConnected: boolean
  latency: number
  connect: () => void
  disconnect: () => void
  reconnectWithAuth: () => void
  subscribe: (topic: string, callback: (message: any) => void) => StompSubscription | null
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<Client | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [latency, setLatency] = useState(0)
  const [, setReconnectAttempts] = useState(0)
  const [isTVDisplay, setIsTVDisplay] = useState(false)
  
  // 🎯 DETECTAR SI ESTAMOS EN TVDisplay, RatingTablet O AgentPanel
  useEffect(() => {
    const checkRoute = () => {
      const path = window.location.pathname
      const isTV = path === '/tv' || path.includes('tv')
      const isRating = path === '/rating' || path.includes('rating')
      const isAgent = path === '/agent-panel' || path.includes('agent-panel') || path === '/tickets' || path.includes('tickets')
      
      // 🎯 NUEVO: Siempre habilitar WebSocket para AgentPanel (ya que se usa dentro del microfrontend)
      const shouldEnableWebSocket = true // Siempre conectar cuando SocketProvider esté activo
      
      setIsTVDisplay(shouldEnableWebSocket)
      console.log('🎯 [SocketContext] Ruta detectada:', path)
      console.log('🎯 [SocketContext] isTV:', isTV, 'isRating:', isRating, 'isAgent:', isAgent)
      console.log('🎯 [SocketContext] WebSocket habilitado:', shouldEnableWebSocket, '(siempre activo)')
      console.log('🎯 [SocketContext] Componente:', shouldEnableWebSocket ? (isTV ? 'TVDisplay' : isRating ? 'RatingTablet' : 'AgentPanel') : 'Otro')
    }
    
    // Verificar ruta inicial
    checkRoute()
    
    // Escuchar cambios de ruta
    const handleRouteChange = () => {
      setTimeout(checkRoute, 100) // Pequeño delay para asegurar que la ruta se actualizó
    }
    
    // Interceptar pushState y replaceState
    const originalPushState = history.pushState
    const originalReplaceState = history.replaceState
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args)
      handleRouteChange()
    }
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args)
      handleRouteChange()
    }
    
    // Escuchar navegación del navegador (botones atrás/adelante)
    window.addEventListener('popstate', handleRouteChange)
    
    return () => {
      // Restaurar funciones originales
      history.pushState = originalPushState
      history.replaceState = originalReplaceState
      window.removeEventListener('popstate', handleRouteChange)
    }
  }, [])

  // 🎯 WebSocket para TVDisplay y RatingTablet
  const connect = () => {
    console.log('🔌 [SocketContext] Función connect ejecutada')
    console.log('🔌 [SocketContext] AGENT_CONFIG.WEBSOCKET_ONLY_TVDISPLAY:', AGENT_CONFIG.WEBSOCKET_ONLY_TVDISPLAY)
    console.log('🔌 [SocketContext] isTVDisplay:', isTVDisplay)
    
    if (!isTVDisplay) {
      console.log('🚫 [SocketContext] WebSocket solo para TVDisplay/RatingTablet/AgentPanel - componente actual:', isTVDisplay ? 'TVDisplay/RatingTablet/AgentPanel' : 'Otro')
      // 🚫 NO llamar a setIsConnected aquí - puede causar problemas durante el renderizado
      return
    }
    
    if (client?.connected) {
      console.log('🔌 [SocketContext] Cliente ya conectado, saltando conexión')
      return
    }
    
    // 🎯 PREVENIR MÚLTIPLES INSTANCIAS: Si ya existe un cliente, desconectarlo primero
    if (client) {
      console.log('🔧 [SocketContext] Desconectando cliente existente antes de crear uno nuevo')
      client.deactivate()
      setClient(null)
    }
    
    try {
      console.log('🔌 [SocketContext] Iniciando conexión SockJS/STOMP a:', 'https://api-tick.yego.pro/stomp-ws')
      
      // Obtener token de autenticación usando almacenamiento seguro
      const token = safeGetItem('token')
      console.log('🔑 [SocketContext] Token para WebSocket:', token ? `Presente (${token.substring(0, 20)}...)` : 'No encontrado')

      const socket = new SockJS('https://api-tick.yego.pro/stomp-ws')  // ✅ HTTPS (Nginx proxy)
      const stompClient = new Client({
        webSocketFactory: () => socket,
        connectHeaders: token ? {
          'Authorization': `Bearer ${token}`
        } : {},
        debug: () => {}, // Desactivar debug para mejor rendimiento
        reconnectDelay: WEBSOCKET_CONFIG.connection.reconnectDelay,
        heartbeatIncoming: WEBSOCKET_CONFIG.connection.heartbeatIncoming,
        heartbeatOutgoing: WEBSOCKET_CONFIG.connection.heartbeatOutgoing,
        connectionTimeout: WEBSOCKET_CONFIG.connection.connectionTimeout,
      })

      stompClient.onConnect = () => {
        console.log('✅ [SocketContext] Conectado al servidor SockJS/STOMP')
        setIsConnected(true)
        setReconnectAttempts(0)
        
        // Monitoreo de latencia simplificado
        const latencyInterval = setInterval(() => {
          if (stompClient.connected) {
            const estimatedLatency = Math.floor(
              Math.random() * 
              (WEBSOCKET_CONFIG.latency.maxSimulatedLatency - WEBSOCKET_CONFIG.latency.minLatency)
            ) + WEBSOCKET_CONFIG.latency.minLatency
            setLatency(estimatedLatency)
          } else {
            clearInterval(latencyInterval)
          }
        }, WEBSOCKET_CONFIG.latency.updateInterval)
      }

      stompClient.onDisconnect = () => {
        console.log('🔌 [SocketContext] Desconectado del servidor SockJS/STOMP')
        setIsConnected(false)
      }

      stompClient.onStompError = (frame: any) => {
        console.error('❌ [SocketContext] Error STOMP:', frame.headers['message'])
        console.error('❌ [SocketContext] Error details:', frame.body)
        setIsConnected(false)
      }

      stompClient.onWebSocketError = (error: any) => {
        console.error('❌ [SocketContext] Error WebSocket:', error)
        setIsConnected(false)
      }

      stompClient.activate()
      setClient(stompClient)
    } catch (error) {
      console.error('❌ [SocketContext] Error creando cliente WebSocket:', error)
      // No bloquear la aplicación por errores de WebSocket
      setIsConnected(false)
    }
  }

  const disconnect = () => {
    if (AGENT_CONFIG.DISABLE_WEBSOCKET) {
      console.log('🚫 [SocketContext] WebSocket deshabilitado - no hay nada que desconectar')
      return
    }
    
    if (client) {
      console.log('🔌 Desconectando SockJS/STOMP...')
      client.deactivate()
      setClient(null)
      setIsConnected(false)
    }
  }

  const reconnectWithAuth = () => {
    if (AGENT_CONFIG.DISABLE_WEBSOCKET) {
      console.log('🚫 [SocketContext] WebSocket deshabilitado - no se puede reconectar')
      return
    }
    
    console.log('🔄 Reconectando WebSocket con nueva autenticación...')
    disconnect()
    setTimeout(connect, 1000)
  }

  const subscribe = (topic: string, callback: (message: any) => void) => {
    if (AGENT_CONFIG.DISABLE_WEBSOCKET) {
      console.log('🚫 [SocketContext] WebSocket deshabilitado - no se puede suscribir a:', topic)
      return null
    }
    
    if (!client?.connected) {
      console.log('❌ No hay conexión STOMP activa para suscribirse a:', topic)
      return null
    }

    try {
      console.log('📡 Suscribiéndose a tópico:', topic)
      const subscription = client.subscribe(topic, (message: any) => {
        try {
          const parsedMessage = JSON.parse(message.body)
          console.log('🎉 [STOMP] ¡MENSAJE RECIBIDO!', {
            topic: topic,
            ticketNumber: parsedMessage.ticketNumber || 'N/A',
            status: parsedMessage.status || 'N/A',
            id: parsedMessage.id || 'N/A'
          })
          callback(parsedMessage)
        } catch (error) {
          console.error('❌ Error parseando mensaje del tópico:', topic, error)
          callback(message.body)
        }
      })
      
      return subscription
    } catch (error) {
      console.error('❌ Error suscribiéndose al tópico:', topic, error)
      return null
    }
  }

  // 🎯 EFECTO PARA CONEXIÓN WEBSOCKET
  useEffect(() => {
    console.log('🎯 [SocketContext] useEffect de conexión ejecutado')
    console.log('🎯 [SocketContext] WEBSOCKET_ONLY_TVDISPLAY:', AGENT_CONFIG.WEBSOCKET_ONLY_TVDISPLAY)
    console.log('🎯 [SocketContext] isTVDisplay:', isTVDisplay)
    
    if (!isTVDisplay) {
      console.log('🚫 [SocketContext] WebSocket solo para TVDisplay/RatingTablet/AgentPanel - componente actual:', isTVDisplay ? 'TVDisplay/RatingTablet/AgentPanel' : 'Otro')
      return
    }
    
    console.log('🔌 [SocketContext] Iniciando conexión WebSocket...')
    // Solo conectar si WebSocket está habilitado y estamos en TVDisplay o RatingTablet
    connect()
    
    return () => {
      console.log('🧹 [SocketContext] Limpiando conexión WebSocket...')
      disconnect()
    }
  }, [isTVDisplay])

  return (
    <SocketContext.Provider value={{ client, isConnected, latency, connect, disconnect, reconnectWithAuth, subscribe }}>
      {children}
    </SocketContext.Provider>
  )
}

// Hook para usar el contexto de WebSocket
export const useSocket = () => {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error('useSocket debe ser usado dentro de un SocketProvider')
  }
  return context
}
