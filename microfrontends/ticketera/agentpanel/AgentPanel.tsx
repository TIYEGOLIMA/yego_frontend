import React from 'react'
import { useAgentPanel } from './hooks/useAgentPanel'
import { useAuth } from './hooks/useAuth'
import { useSocket } from './contexts/SocketContext'
import { TicketSection } from './components/agent/TicketSection'
import { ModuleSelection } from './components/agent/ModuleSelection'
import { LoadingSpinner } from './components/LoadingSpinner'
import { Ticket } from './types'
import './styles/index.css'

// 🎯 COMPONENTE SIN WEBSOCKET: Envuelve AgentPanel para evitar conexiones WebSocket
const AgentPanel: React.FC = () => {
  
  // 🔐 VERIFICAR AUTENTICACIÓN
  const { currentUser, loading: authLoading } = useAuth()
  const { isConnected } = useSocket()
  
  const {
    loading,
    selectedModule,
    modules,
    showModuleSelection,
    
    // Estados derivados
    ticketsEnEspera,
    ticketsLlamados,
    ticketsAtendiendo,
    
    // 🎯 NUEVO: Estado de tickets en proceso
    ticketsEnProceso,
    
    // Acciones
    cargarTickets,
    seleccionarModulo,
    llamarTicket,
    atenderTicket,
    completarTicket,
    cancelarTicket,
  } = useAgentPanel()

  // 🎯 FUNCIONES ESPECÍFICAS PARA CADA ACCIÓN
  const handleCallTicket = async (ticket: Ticket) => {
    try {
      await llamarTicket(ticket)
    } catch (error) {
      console.error('Error llamando ticket:', error)
    }
  }

  const handleAttendTicket = async (ticket: Ticket) => {
    try {
      await atenderTicket(ticket)
    } catch (error) {
      console.error('Error atendiendo ticket:', error)
    }
  }

  const handleCompleteTicket = async (ticket: Ticket, notes?: string) => {
    try {
      await completarTicket(ticket, notes)
    } catch (error) {
      console.error('Error completando ticket:', error)
    }
  }

  const handleCancelTicket = async (ticket: Ticket) => {
    try {
      await cancelarTicket(ticket)
    } catch (error) {
      console.error('Error cancelando ticket:', error)
    }
  }


  // 🔐 VERIFICAR AUTENTICACIÓN PRIMERO
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <LoadingSpinner />
        <div className="ml-4 text-gray-600 dark:text-gray-400">Verificando autenticación...</div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 text-xl mb-4">❌ No autenticado</div>
          <button 
            onClick={() => window.location.href = '/login'}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
          >
            Ir al Login
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <LoadingSpinner />
      </div>
    )
  }

  // 🎯 VERIFICAR SI EL USUARIO NECESITA SELECCIONAR MÓDULO EN EL SISTEMA PRINCIPAL
  // Usar el estado del store principal en lugar de localStorage para evitar problemas de sincronización
  const userData = localStorage.getItem('user')
  let needsModuleSelection = false
  
  if (userData) {
    try {
      const user = JSON.parse(userData)
      needsModuleSelection = (user.role === 'OPERADOR' || user.role === 'SAC') && 
                           (user.moduleId === null || user.moduleId === undefined || user.moduleId === '')
    } catch (error) {
      console.error('Error parseando datos del usuario:', error)
    }
  }

  if (showModuleSelection) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <ModuleSelection
          onModuleSelected={seleccionarModulo}
        />
      </div>
    )
  }

  return (
    <div className="w-full pt-6">
      {/* Header con soporte dark mode */}
      <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Panel de Agente
            </h1>
            <p className="text-gray-700 dark:text-white">
              Módulo {selectedModule} - Gestión de Tickets
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-end gap-2">
                <span className="text-gray-500 dark:text-gray-400">WebSocket:</span>
                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
                  isConnected
                    ? 'bg-gray-100 dark:bg-gray-700 text-green-800 dark:text-green-200 border-green-300 dark:border-green-600' 
                    : 'bg-gray-100 dark:bg-gray-700 text-red-800 dark:text-red-200 border-red-300 dark:border-red-600'
                }`}>
                  <span className="relative flex items-center justify-center w-3 h-3">
                    <span className={`w-3 h-3 rounded-full ${
                      isConnected 
                        ? 'bg-green-500' 
                        : 'bg-red-500'
                    }`}></span>
                    {isConnected && (
                      <span className="absolute top-0 left-0 w-3 h-3 bg-green-500 rounded-full animate-ping"></span>
                    )}
                  </span>
                  {isConnected ? 'Conectado' : 'Deshabilitado (HTTP Polling)'}
                </span>
              </div>
            </div>
            {/* 🚫 BOTÓN DE LOGOUT ELIMINADO - Se maneja desde el sidebar principal */}
          </div>
        </div>
      </div>

        {/* Ticket Sections Reorganizadas */}
        <div className="space-y-12">
          {/* Tickets Llamados y Atendiendo (arriba) - más estrechos */}
          <div className="flex justify-center">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full lg:w-3/4">
              {/* Tickets Llamados */}
              <TicketSection
                title="Tickets Llamados"
                tickets={ticketsLlamados}
                status="CALLED"
                onCall={handleCallTicket}
                onAttend={handleAttendTicket}
                onCancel={handleCancelTicket}
                onComplete={handleCompleteTicket}
                onRefresh={async () => await cargarTickets()}
                hayTicketLlamado={false}
                autoLoading={false}
                ticketsEnProceso={ticketsEnProceso}
              />

              {/* Tickets Atendiendo */}
              <TicketSection
                title="Tickets Atendiendo"
                tickets={ticketsAtendiendo}
                status="IN_PROGRESS"
                onCall={handleCallTicket}
                onAttend={handleAttendTicket}
                onCancel={handleCancelTicket}
                onComplete={handleCompleteTicket}
                onRefresh={async () => await cargarTickets()}
                hayTicketLlamado={false}
                autoLoading={false}
                ticketsEnProceso={ticketsEnProceso}
              />
            </div>
          </div>
          
          {/* Espaciado adicional para separar mejor las secciones */}
          <div className="mt-8"></div>
          
          {/* Tickets en Espera (abajo) - más ancho */}
          <div className="flex justify-center">
            <div className="w-full lg:w-5/6">
              <TicketSection
                title={`Tickets en Espera (${ticketsEnEspera.length})`}
                tickets={ticketsEnEspera}
                status="WAITING"
                onCall={handleCallTicket}
                onAttend={handleAttendTicket}
                onCancel={handleCancelTicket}
                onComplete={handleCompleteTicket}
                onRefresh={async () => await cargarTickets()}
                hayTicketLlamado={ticketsLlamados.length > 0 || ticketsAtendiendo.length > 0}
                autoLoading={false}
                ticketsEnProceso={ticketsEnProceso}
                // 🎯 NUEVO: Bloquear botón de llamar cuando hay tickets en proceso
                bloquearLlamar={ticketsLlamados.length > 0 || ticketsAtendiendo.length > 0}
                // 🎯 NUEVO: Layout horizontal solo para tickets en espera
                layoutHorizontal={true}
              />
            </div>
          </div>
        </div>
    </div>
  )
}

// ✅ COMPONENTE PRINCIPAL: Con WebSocket habilitado
export default AgentPanel
