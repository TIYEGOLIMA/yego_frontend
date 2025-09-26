import React from 'react'
import { Ticket } from './index'

export interface AgentPanelState {
  tickets: Ticket[]
  loading: boolean
  currentTicket: Ticket | null
  colaDeEspera: Ticket[]
  errorMessage: string
  showError: boolean
  selectedModule: number | null
  showCompleteModal: boolean
  ticketToComplete: Ticket | null
  completionNotes: string
  completingTicket: boolean
  driverNames: Record<string, string>
  loadingDrivers: Set<string>
  lastTicketUpdate: Date | null
  reloadAttempts: number
  isLoadingTickets: boolean
  lastLoadTime: number
  hasInitialLoad: boolean
}

export interface AgentPanelActions {
  mostrarError: (mensaje: string) => void
  cargarTickets: (forceReload?: boolean) => Promise<void>
  forzarRecargaTickets: () => void
  cambiarModulo: () => void
  cargarModulos: () => Promise<void>
  llamarTicket: (ticket: Ticket) => Promise<void>
  llamarSiguienteTicket: () => Promise<void>
  atenderTicket: (ticket: Ticket) => Promise<void>
  cancelarTicket: (ticket: Ticket) => Promise<void>
  iniciarCompletarTicket: (ticket: Ticket) => void
  completarTicketConNotas: () => Promise<void>
  cancelarCompletarTicket: () => void
  handleModuleSelection: (moduleId: number) => Promise<void>
  obtenerNombreConductor: (phoneNumber: string) => Promise<string | null>
  formatearHora: (date: Date) => string
}

export interface UseAgentPanelReturn extends AgentPanelState, AgentPanelActions {
  ticketsEnEspera: Ticket[]
  ticketsLlamados: Ticket[]
  ticketsEnProceso: Ticket[]
  isConnected: boolean
}

export interface TicketCardProps {
  ticket: Ticket
  driverNames: Record<string, string>
  loadingDrivers: Set<string>
  formatearHora: (date: Date) => string
  onLlamar?: (ticket: Ticket) => void
  onAtender?: (ticket: Ticket) => void
  onCancelar?: (ticket: Ticket) => void
  onCompletar?: (ticket: Ticket) => void
  disabled?: boolean
  showModuleWarning?: boolean
  renderTicketOptions: (ticket: Ticket) => React.ReactNode
}

export interface TicketSectionProps {
  title: string
  icon: React.ComponentType<{ className?: string }>
  tickets: Ticket[]
  driverNames: Record<string, string>
  loadingDrivers: Set<string>
  formatearHora: (date: Date) => string
  onLlamar?: (ticket: Ticket) => void
  onAtender?: (ticket: Ticket) => void
  onCancelar?: (ticket: Ticket) => void
  onCompletar?: (ticket: Ticket) => void
  disabled?: boolean
  showModuleWarning?: boolean
  renderTicketOptions: (ticket: Ticket) => React.ReactNode
  emptyMessage: string
  emptySubmessage: string
}

export interface CompleteTicketModalProps {
  isOpen: boolean
  ticket: Ticket | null
  completionNotes: string
  onNotesChange: (notes: string) => void
  onComplete: () => void
  onCancel: () => void
  completing: boolean
  driverNames: Record<string, string>
}

export interface StatusBarProps {
  lastTicketUpdate: Date | null
  ticketsCount: number
  isLoadingTickets: boolean
  selectedModule: number | null
  currentUserId?: number
  isConnected: boolean
  onReload: () => void
  onChangeModule: () => void
}

export interface TicketOptionsProps {
  ticket: Ticket
  onReload?: () => void
}
