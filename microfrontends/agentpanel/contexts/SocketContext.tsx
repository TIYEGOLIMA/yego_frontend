import React, { createContext, useContext, useEffect, useState } from 'react'
import { Client, StompSubscription } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { WEBSOCKET_CONFIG } from '../utils/websocketConfig'
import { safeGetItem } from '../utils/storage'

interface SocketContextType {
  client: Client | null
  isConnected: boolean
  latency: number
  tickets: any[]
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
  const [tickets, setTickets] = useState<any[]>([])

  const connect = () => {
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
      const socket = new SockJS('https://api-tick.yego.pro/stomp-ws')

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

      stompClient.onConnect = () => {
        console.log('✅ [SocketContext] Conectado al servidor SockJS/STOMP')
        setIsConnected(true)

        // 📡 Suscripción a nuevos tickets
        stompClient.subscribe("/topic/new-ticket", (message) => {
          try {
            const body = JSON.parse(message.body)
            console.log("🎉 Nuevo ticket recibido:", body)
            setTickets((prev) => [...prev, body])
          } catch (err) {
            console.error("❌ Error parseando ticket:", err)
          }
        })

        // 📡 Suscripción a lista de tickets
        stompClient.subscribe("/topic/tickets", (message) => {
          try {
            const body = JSON.parse(message.body)
            console.log("📋 Lista de tickets recibida:", body)
            setTickets(body) // reemplazar lista completa
          } catch (err) {
            console.error("❌ Error parseando lista de tickets:", err)
          }
        })

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
    if (!client?.connected) {
      console.log('❌ No hay conexión STOMP activa para suscribirse a:', topic)
      return null
    }

    try {
      console.log('📡 Suscribiéndose a tópico:', topic)
      return client.subscribe(topic, (message: any) => {
        try {
          const parsedMessage = JSON.parse(message.body)
          callback(parsedMessage)
        } catch (error) {
          console.error('❌ Error parseando mensaje del tópico:', topic, error)
          callback(message.body)
        }
      })
    } catch (error) {
      console.error('❌ Error suscribiéndose al tópico:', topic, error)
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
    <SocketContext.Provider value={{ client, isConnected, latency, tickets, connect, disconnect, reconnectWithAuth, subscribe }}>
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
