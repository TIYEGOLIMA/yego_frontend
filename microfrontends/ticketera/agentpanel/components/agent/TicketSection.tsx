import React from 'react'
import { Ticket } from '../../types'
import { TicketCard } from './TicketCard'

interface TicketSectionProps {
  title: string
  tickets: Ticket[]
  status: string
  onCall: (ticket: Ticket) => void
  onAttend: (ticket: Ticket) => void
  onCancel: (ticket: Ticket) => void
  onComplete: (ticket: Ticket, notes?: string) => void
  onRefresh: () => Promise<void>
  loading?: boolean
  emptyMessage?: string
  showRefreshButton?: boolean
  className?: string
  hayTicketLlamado?: boolean
  autoLoading?: boolean
  // 🎯 NUEVO: Prop para verificar si un ticket está en proceso
  ticketsEnProceso?: Set<number>
  // 🎯 NUEVO: Prop para bloquear botón de llamar cuando hay tickets en proceso
  bloquearLlamar?: boolean
  // 🎯 NUEVO: Prop para usar layout horizontal (2 columnas)
  layoutHorizontal?: boolean
}

export const TicketSection: React.FC<TicketSectionProps> = ({
  title,
  tickets,
  status,
  onCall,
  onAttend,
  onCancel,
  onComplete,
  loading = false,
  emptyMessage = 'No hay tickets',
  className = '',
  autoLoading = false,
  ticketsEnProceso = new Set(),
  bloquearLlamar = false,
  layoutHorizontal = false
}) => {


  return (
    <div className={`bg-white dark:bg-slate-800 from-white to-gray-50 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 p-6 ${className}`}>
      <div className="mb-6">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">{title}</h3>
          {autoLoading && status === 'WAITING' && (
            <div className="flex items-center mt-1 text-xs text-blue-600 font-medium">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
              Cargando automáticamente...
            </div>
          )}
          {/* 🎯 NUEVO: Indicador cuando los botones de llamar están bloqueados */}
          {bloquearLlamar && status === 'WAITING' && (
            <div className="flex items-center mt-1 text-xs text-orange-600 font-medium">
              <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
              Botones de llamar bloqueados - Hay tickets en proceso
            </div>
          )}
        </div>


      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-3">Cargando tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm font-medium mb-2">{emptyMessage}</p>
            {status === 'WAITING' && (
              <div className="text-xs text-blue-500 font-medium">
                Buscando nuevos tickets automáticamente...
              </div>
            )}
          </div>
        ) : (
          <>
            <div className={
              layoutHorizontal 
                ? "grid grid-cols-1 md:grid-cols-2 gap-4"
                : "space-y-4"
            }>
              {tickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onCall={onCall}
                  onAttend={onAttend}
                  onCancel={onCancel}
                  onComplete={onComplete}
                  isProcessing={ticketsEnProceso.has(ticket.id)}
                  bloquearLlamar={bloquearLlamar}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
