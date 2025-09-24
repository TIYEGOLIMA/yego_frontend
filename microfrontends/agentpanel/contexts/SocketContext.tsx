import React, { createContext, useContext, useEffect, useState } from 'react'
import { Client, StompSubscription } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { WEBSOCKET_CONFIG } from '../utils/websocketConfig'
import { safeGetItem } from '../utils/storage'

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

  const connect = () => {
    console.log('🚀 [SocketContext] INICIANDO PROCESO DE CONEXIÓN')
    
    if (client?.connected) {
      console.log('🔌 [SocketContext] Cliente ya conectado, saltando conexión')
      return
    }

    if (client) {
      console.log('🔧 [SocketContext] Desconectando cliente existente antes de crear uno nuevo')
      client.deactivate()
      setClient(null)
    }

    try {
      console.log('🔌 [SocketContext] Iniciando conexión SockJS/STOMP a:', 'https://api-tick.yego.pro/stomp-ws')

      const token = safeGetItem('token')
      console.log('🔐 [SocketContext] Token JWT encontrado:', token ? 'SÍ (' + token.substring(0, 20) + '...)' : 'NO')
      
      const socket = new SockJS('https://api-tick.yego.pro/stomp-ws')
      console.log('🌐 [SocketContext] Socket SockJS creado')

      const stompClient = new Client({
        webSocketFactory: () => socket,
        connectHeaders: token ? {
          'Authorization': `Bearer ${token}`
        } : {},
        debug: (str) => console.log('🔧 [STOMP Debug]:', str),
        reconnectDelay: 5000,
        heartbeatIncoming: 5000,
        heartbeatOutgoing: 5000,
        connectionTimeout: 30000,
      })
      
      console.log('⚙️ [SocketContext] Cliente STOMP configurado con headers:', token ? 'Con Authorization' : 'Sin Authorization')

      stompClient.onConnect = () => {
        console.log('✅ [SocketContext] Conectado al servidor SockJS/STOMP')
        console.log('🎯 [SocketContext] Ready para suscripciones dinámicas')
        setIsConnected(true)

        // 🔎 Medición de latencia simulada
        const latencyInterval = setInterval(() => {
          if (stompClient.connected) {
            const estimatedLatency = Math.floor(
              Math.random() * (WEBSOCKET_CONFIG.latency.maxSimulatedLatency - WEBSOCKET_CONFIG.latency.minLatency)
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
        console.error('❌ [SocketContext] Frame completo:', frame)
        setIsConnected(false)
      }

      stompClient.onWebSocketError = (error: any) => {
        console.error('❌ [SocketContext] Error WebSocket:', error)
        console.error('❌ [SocketContext] Tipo de error:', typeof error)
        console.error('❌ [SocketContext] Propiedades del error:', Object.keys(error))
        setIsConnected(false)
      }

      console.log('🚀 [SocketContext] Activando cliente STOMP...')
      stompClient.activate()
      setClient(stompClient)
      console.log('💾 [SocketContext] Cliente STOMP guardado en estado')
    } catch (error) {
      console.error('❌ [SocketContext] Error creando cliente WebSocket:', error)
      setIsConnected(false)
    }
  }

  const disconnect = () => {
    if (client) {
      console.log('🔌 Desconectando SockJS/STOMP...')
      client.deactivate()
      setClient(null)
      setIsConnected(false)
    }
  }

  const reconnectWithAuth = () => {
    console.log('🔄 Reconectando WebSocket con nueva autenticación...')
    disconnect()
    setTimeout(connect, 1000)
  }

  const subscribe = (topic: string, callback: (message: any) => void) => {
    console.log('📡 [SocketContext] Intento de suscripción a:', topic)
    console.log('🔗 [SocketContext] Cliente conectado?:', client?.connected)
    console.log('🔗 [SocketContext] Cliente existe?:', !!client)
    
    if (!client?.connected) {
      console.log('❌ [SocketContext] No hay conexión STOMP activa para suscribirse a:', topic)
      return null
    }

    try {
      console.log('✅ [SocketContext] Creando suscripción a tópico:', topic)
      const subscription = client.subscribe(topic, (message: any) => {
        console.log('📥 [SocketContext] Mensaje recibido en tópico', topic, ':', message.body)
        try {
          const parsedMessage = JSON.parse(message.body)
          console.log('✅ [SocketContext] Mensaje parseado:', parsedMessage)
          callback(parsedMessage)
        } catch (error) {
          console.error('❌ [SocketContext] Error parseando mensaje del tópico:', topic, error)
          console.log('📝 [SocketContext] Enviando mensaje raw:', message.body)
          callback(message.body)
        }
      })
      console.log('🎉 [SocketContext] Suscripción exitosa a:', topic)
      return subscription
    } catch (error) {
      console.error('❌ [SocketContext] Error suscribiéndose al tópico:', topic, error)
      return null
    }
  }

  // 🔌 Conectar automáticamente al montar
  useEffect(() => {
    connect()
    return () => {
      disconnect()
    }
  }, [])

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
