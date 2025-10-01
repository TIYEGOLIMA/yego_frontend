import { Ticket } from '../../types'
import { useState, useEffect, useCallback } from 'react'
import { validationService } from '../../services/validationService'
import { normalizeDriverName } from '../../utils/utf8Decoder'

interface CompleteTicketModalProps {
  isOpen: boolean
  ticket: Ticket | null
  notes: string
  onNotesChange: (notes: string) => void
  onComplete: () => void
  onClose: () => void
  loading: boolean
}

export const CompleteTicketModal = ({
  isOpen,
  ticket,
  notes,
  onNotesChange,
  onComplete,
  onClose,
  loading
}: CompleteTicketModalProps) => {
  const [driverName, setDriverName] = useState<string>('')
  const [loadingDriver, setLoadingDriver] = useState(false)

  // 🎯 FUNCIÓN PARA OBTENER NOMBRE DEL CONDUCTOR
  const obtenerNombreConductor = useCallback(async (phoneNumber?: string, licenseNumber?: string) => {
    if (!phoneNumber && !licenseNumber) return
    
    try {
      setLoadingDriver(true)
      const phone = phoneNumber || licenseNumber
      if (phone) {
        const driverInfo = await validationService.getDriverByPhonePublic(phone)
        if (driverInfo && driverInfo.full_name) {
          const nombreNormalizado = normalizeDriverName(driverInfo.full_name)
          setDriverName(nombreNormalizado)
        } else {
          setDriverName('Nombre no disponible')
        }
      }
    } catch (error) {
      console.error('❌ [CompleteTicketModal] Error obteniendo nombre del conductor:', error)
      setDriverName('Error al obtener nombre')
    } finally {
      setLoadingDriver(false)
    }
  }, [])

  // 🎯 EFECTO PARA OBTENER NOMBRE CUANDO SE ABRE EL MODAL
  useEffect(() => {
    if (isOpen && ticket) {
      obtenerNombreConductor(ticket.phone, ticket.licenseNumber)
    }
  }, [isOpen, ticket, obtenerNombreConductor])

  if (!isOpen || !ticket) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 border-2 border-red-100 dark:border-red-600">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-red-800 dark:text-white">
              Completar Ticket
            </h3>
            <button
              onClick={onClose}
              className="text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/50 p-2 rounded-full transition-all duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="mb-6">
            <div className="bg-red-50 dark:bg-red-900/50 rounded-xl p-4 mb-6 border border-red-200 dark:border-red-600">
              <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                <span className="font-bold">Ticket:</span> <span className="font-semibold">#{ticket.ticketNumber}</span>
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                <span className="font-bold">Conductor:</span> {
                  loadingDriver ? (
                    <span className="inline-flex items-center">
                      <div className="w-4 h-4 border-2 border-red-600 dark:border-red-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                      Cargando nombre...
                    </span>
                  ) : driverName ? (
                    <span className="font-semibold">{driverName}</span>
                  ) : (
                    <span className="text-red-500 dark:text-red-400">Nombre no disponible</span>
                  )
                }
              </p>
            </div>
            
            <label className="block text-sm font-bold text-red-800 dark:text-white mb-3">
              Notas de resolución (requerido)
            </label>
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Escribe las observaciones sobre la atención del ticket..."
              className="w-full p-4 border-2 border-red-300 dark:!border-red-500 rounded-xl resize-none focus:ring-2 focus:ring-red-500 focus:!border-red-500 transition-all duration-200 text-gray-800 dark:!text-slate-900 bg-white dark:!bg-white"
              rows={4}
              maxLength={1000}
              disabled={loading}
            />
            <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-medium">
              {notes.length}/1000 caracteres
            </p>
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 rounded-xl font-medium transition-all duration-300 transform bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-slate-200 border-2 border-gray-300 dark:border-slate-500 hover:bg-gray-200 dark:hover:bg-slate-500 hover:text-gray-800 dark:hover:text-white hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              Cancelar
            </button>
            <button
              onClick={onComplete}
              disabled={loading || !notes.trim()}
              className="flex-1 px-6 py-3 rounded-xl font-medium transition-all duration-300 transform bg-white dark:bg-slate-700 text-red-600 dark:text-white border-2 border-red-600 dark:border-red-500 hover:bg-red-600/25 dark:hover:bg-red-900/50 hover:text-red-700 dark:hover:text-white hover:scale-105 hover:shadow-lg hover:border-red-700 dark:hover:border-red-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-red-600 dark:border-red-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                  Completando...
                </div>
              ) : (
                'Completar Ticket'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
