import React, { useState, useCallback } from 'react'
import { useAgentPanel } from './hooks/useAgentPanel'
import { useAuth } from './hooks/useAuth'
import { useSocket } from './contexts/SocketContext'
import { TicketSection } from './components/agent/TicketSection'
import { ModuleSelection } from './components/agent/ModuleSelection'
import { SedePicker } from './components/agent/SedePicker'
import { LoadingSpinner } from './components/LoadingSpinner'
import { Ticket } from './types'
import { getSedeActivaId } from '../shared/utils/sedeContext'
import './styles/index.css'

const ROLES_SIN_SEDE_FIJA = ['ADMIN', 'SUPERVISOR']

const AgentPanel: React.FC = () => {
  const { currentUser, loading: authLoading } = useAuth()
  const [sedePickerKey, setSedePickerKey] = useState(0)
  const { isConnected } = useSocket()
  
  const {
    loading,
    selectedModule,
    modules,
    showModuleSelection,
    ticketsEnEspera,
    ticketsLlamados,
    ticketsAtendiendo,
    ticketsEnProceso,
    cargarTickets,
    seleccionarModulo,
    llamarTicket,
    atenderTicket,
    completarTicket,
    cancelarTicket,
    liberarModulo,
    actualizarModulosDesdeLista,
  } = useAgentPanel(sedePickerKey)

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

  const handleSedeSelected = useCallback(() => {
    // Fuerza re-render para que useAgentPanel llame a inicializar() con el nuevo sedeId
    setSedePickerKey((k) => k + 1)
  }, [])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-secondary dark:bg-background-dark">
        <LoadingSpinner />
        <div className="ml-4 text-gray-600 dark:text-neutral-400">Verificando autenticación...</div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-secondary dark:bg-background-dark">
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

  // ADMIN/SUPERVISOR deben elegir sede antes de ver módulos
  const necesitaElegirSede =
    currentUser &&
    ROLES_SIN_SEDE_FIJA.includes(currentUser.role?.toUpperCase?.() ?? '') &&
    !getSedeActivaId()

  if (necesitaElegirSede) {
    return <SedePicker key={sedePickerKey} onSedeSelected={handleSedeSelected} />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-secondary dark:bg-background-dark">
        <LoadingSpinner />
      </div>
    )
  }

  if (showModuleSelection) {
    return (
      <div className="min-h-screen bg-background-secondary dark:bg-background-dark p-4">
        <ModuleSelection
          onModuleSelected={seleccionarModulo}
          modules={modules}
          onModulesUpdated={actualizarModulosDesdeLista}
        />
      </div>
    )
  }

  return (
    <div className="w-full pt-6">
      {/* Header con soporte dark mode */}
      <div className="mb-8 bg-surface dark:bg-surface-dark rounded-xl shadow-lg p-6">
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
              <div className="text-sm text-gray-600 dark:text-neutral-400 flex items-center justify-end gap-2">
                <span className="text-gray-500 dark:text-neutral-400">WebSocket:</span>
                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
                  isConnected
                    ? 'bg-surface-secondary dark:bg-surface-dark-secondary text-green-800 dark:text-green-200 border-green-300 dark:border-green-600' 
                    : 'bg-surface-secondary dark:bg-surface-dark-secondary text-red-800 dark:text-red-200 border-red-300 dark:border-red-600'
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
            <button
              onClick={liberarModulo}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg text-sm"
              title="Salir del módulo"
            >
              Salir del módulo
            </button>
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
                bloquearLlamar={ticketsLlamados.length > 0 || ticketsAtendiendo.length > 0}
                layoutHorizontal={true}
              />
            </div>
          </div>
        </div>
    </div>
  )
}

export default AgentPanel
