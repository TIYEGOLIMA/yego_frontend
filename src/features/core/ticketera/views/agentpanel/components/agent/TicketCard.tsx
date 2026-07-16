import React, { useState } from 'react'
import { Ticket } from '../../types'
import { CompleteTicketModal } from './CompleteTicketModal'
import { TICKET_STATUS } from '@/features/core/ticketera/shared'

interface TicketCardProps {
  ticket: Ticket
  onCall: (ticket: Ticket) => void
  onAttend: (ticket: Ticket) => void
  onCancel: (ticket: Ticket) => void
  onComplete: (ticket: Ticket, notes?: string) => void
  isProcessing?: boolean
  bloquearLlamar?: boolean
}

export const TicketCard: React.FC<TicketCardProps> = ({ 
  ticket, 
  onCall, 
  onAttend, 
  onCancel, 
  onComplete,
  isProcessing = false,
  bloquearLlamar = false
}) => {
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [notes, setNotes] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)


  const handleComplete = () => {
    if (notes.trim()) {
      onComplete(ticket, notes.trim())
      setNotes('')
      setShowCompleteModal(false)
    }
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <>
      <div className="bg-surface dark:bg-surface-dark border-2 border-red-300 dark:border-red-500 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-200">
        {/* Header del ticket */}
        <div className="mb-6">
          {isProcessing && (
            <div className="flex items-center text-xs text-red-600 font-medium mb-4 p-2 bg-red-50 rounded-lg border border-red-200">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600 mr-2"></div>
              Procesando...
            </div>
          )}
          
          {/* Número de ticket y estado */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <h3 className="text-xl font-bold text-red-800 dark:text-white">
                Ticket #{ticket.ticketNumber}
              </h3>
              {ticket.status === TICKET_STATUS.CALLED && (
                <button
                  onClick={() => onCall(ticket)}
                  disabled={isProcessing}
                  className={`p-2 rounded-full transition-all duration-200 ${
                    isProcessing
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-orange-100 text-orange-600 hover:bg-orange-200 hover:scale-110 hover:shadow-lg'
                  }`}
                  title="Volver a llamar al conductor"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </button>
              )}
            </div>
            <div className="flex items-center space-x-2">
              
               <button
                 onClick={toggleExpanded}
                 className="p-1 rounded-full hover:bg-red-200 transition-colors duration-200"
                 title={isExpanded ? 'Mostrar menos' : 'Mostrar más'}
               >
                 <svg
                   className={`w-5 h-5 text-red-600 transition-transform duration-200 ${
                     isExpanded ? 'rotate-180' : ''
                   }`}
                   fill="none"
                   stroke="currentColor"
                   viewBox="0 0 24 24"
                 >
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                 </svg>
               </button>
            </div>
          </div>
          
          <div className="bg-surface-secondary dark:bg-surface-dark-secondary rounded-lg p-3 border-2 border-red-500 dark:border-red-500 mb-4">
            <p className="text-sm text-slate-900 dark:text-white">
              <span className="font-semibold">Conductor:</span> {ticket.driverName || ticket.licenseNumber || 'No disponible'}
            </p>
             {(ticket.licenseNumber || ticket.categoryName || ticket.subcategoryName || ticket.categoryDescription || ticket.subcategoryDescription) && (
               <div className="mt-2 flex items-center text-xs text-red-500">
                 <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                 </svg>
                 <span className="text-xs">
                   {isExpanded ? 'Click para mostrar menos' : 'Click para mostrar más información'}
                 </span>
               </div>
             )}
          </div>

            {isExpanded && (
             <div className="space-y-3 mb-4">
              {/* LicenseNumber si está disponible */}
              {ticket.licenseNumber && ticket.driverName && (
                <div className="bg-surface-secondary dark:bg-surface-dark-secondary rounded-lg p-3 border-2 border-red-500 dark:border-red-500">
                  <p className="text-sm text-slate-900 dark:text-white">
                    <span className="font-semibold">Número:</span> {ticket.licenseNumber}
                  </p>
                </div>
              )}
              
              {/* Categoría si está disponible */}
              {ticket.categoryName && (
                <div className="bg-surface-secondary dark:bg-surface-dark-secondary rounded-lg p-3 border-2 border-red-500 dark:border-red-500">
                  <p className="text-sm text-slate-900 dark:text-white">
                    <span className="font-semibold">Objetivo:</span> {ticket.categoryName}
                  </p>
                </div>
              )}
              
              {/* Subcategoría si está disponible */}
              {ticket.subcategoryName && (
                <div className="bg-surface-secondary dark:bg-surface-dark-secondary rounded-lg p-3 border-2 border-red-500 dark:border-red-500">
                  <p className="text-sm text-slate-900 dark:text-white">
                    <span className="font-semibold">Subcategoría:</span> {ticket.subcategoryName}
                  </p>
                </div>
              )}

              {/* Información adicional */}
              {(ticket.categoryDescription || ticket.subcategoryDescription) && (
                <div className="space-y-2">
                  {ticket.categoryDescription && (
                    <div className="bg-surface-secondary dark:bg-surface-dark-secondary rounded-lg p-3 border-2 border-red-500 dark:border-red-500">
                      <p className="text-xs text-slate-900 dark:text-white">
                        <span className="font-semibold">Descripción:</span> {ticket.categoryDescription}
                      </p>
                    </div>
                  )}
                  
                  {ticket.subcategoryDescription && (
                    <div className="bg-surface-secondary dark:bg-surface-dark-secondary rounded-lg p-3 border-2 border-red-500 dark:border-red-500">
                      <p className="text-xs text-slate-900 dark:text-white">
                        <span className="font-semibold">Detalle:</span> {ticket.subcategoryDescription}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}


          {/* Hora de llamado y completado - Solo para tickets que no están en espera */}
          {ticket.status !== TICKET_STATUS.WAITING && (ticket.calledAt || ticket.completedAt) && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-red-800 dark:text-white mb-2">Timeline:</h4>
              <div className="space-y-2">
                {ticket.calledAt && (
                  <div className="bg-surface-secondary dark:bg-surface-dark-secondary rounded-lg p-2 border-2 border-red-500 dark:border-red-500">
                    <p className="text-xs text-slate-900 dark:text-white">
                      <span className="font-semibold">Llamado:</span> {new Date(ticket.calledAt).toLocaleString('es-ES')}
                    </p>
                  </div>
                )}
                {ticket.completedAt && (
                  <div className="bg-surface-secondary dark:bg-surface-dark-secondary rounded-lg p-2 border-2 border-red-500 dark:border-red-500">
                    <p className="text-xs text-slate-900 dark:text-white">
                      <span className="font-semibold">Completado:</span> {new Date(ticket.completedAt).toLocaleString('es-ES')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex flex-wrap gap-3">
          {ticket.status === TICKET_STATUS.WAITING && (
            <button
              onClick={() => onCall(ticket)}
              disabled={isProcessing || bloquearLlamar}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 transform ${
                isProcessing || bloquearLlamar
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-surface text-red-600 border-2 border-red-600 hover:bg-red-600/25 hover:text-red-700 hover:scale-105 hover:shadow-lg hover:border-red-700'
              }`}
              title={bloquearLlamar ? 'No se puede llamar mientras hay tickets en proceso' : ''}
            >
              {bloquearLlamar ? 'Llamar (Bloqueado)' : 'Llamar'}
            </button>
          )}

          {ticket.status === TICKET_STATUS.CALLED && (
            <button
              onClick={() => onAttend(ticket)}
              disabled={isProcessing}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 transform ${
                isProcessing 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-surface text-red-600 border-2 border-red-600 hover:bg-red-600/25 hover:text-red-700 hover:scale-105 hover:shadow-lg hover:border-red-700'
              }`}
            >
              Atender
            </button>
          )}

          {ticket.status === TICKET_STATUS.IN_PROGRESS && (
            <button
              onClick={() => setShowCompleteModal(true)}
              disabled={isProcessing}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                isProcessing 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-surface text-red-600 border-2 border-red-600 hover:bg-red-600/20 hover:text-red-700'
              }`}
            >
              Completar
            </button>
          )}

          {ticket.status !== TICKET_STATUS.COMPLETED && ticket.status !== TICKET_STATUS.WAITING && (
            <button
              onClick={() => onCancel(ticket)}
              disabled={isProcessing}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 transform ${
                isProcessing 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-surface text-red-600 border-2 border-red-600 hover:bg-red-600/25 hover:text-red-700 hover:scale-105 hover:shadow-lg hover:border-red-700'
              }`}
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Modal de completar ticket */}
      <CompleteTicketModal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        onComplete={handleComplete}
        notes={notes}
        onNotesChange={setNotes}
        ticket={ticket}
        loading={false}
      />
    </>
  )
}
