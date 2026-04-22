import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../shared/components/ui/Card'
import { Button } from '../shared/components/ui/Button'
import { Clock, CheckCircle, LogOut, Loader2, Send, Maximize, Minimize } from 'lucide-react'
import { Ticket } from './types'
import { ratingService } from './services/ratingService'
import { useRatingWebSocket } from './hooks/useWebSocket'
import {
  getDispositivoSession,
  clearDispositivoSession,
  type DispositivoSession,
} from '../../../src/services/core/device-auth-service'

const InfoItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="text-center">
    <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">{label}</p>
    <p className="text-base font-semibold text-white">{value}</p>
  </div>
)

const RatingTablet: React.FC = () => {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showThankYou, setShowThankYou] = useState(false)
  const [dispositivo, setDispositivo] = useState<DispositivoSession | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const navigate = useNavigate()

  const moduleId = dispositivo?.moduleId ?? null
  const moduleIdStr = moduleId != null ? String(moduleId) : null

  const {
    isConnected,
    onTicketCompleted,
    onRatingRequested,
    emitRatingSubmitted
  } = useRatingWebSocket()

  useEffect(() => {
    setDispositivo(getDispositivoSession())
  }, [])

  const getModuleName = (): string => {
    if (!moduleId) return 'No asignado'
    return `Módulo ${moduleId}`
  }

  useEffect(() => {
    if (!isConnected) {
      return
    }

    const unsubscribeCompleted = onTicketCompleted((ticket: any) => {
      setSelectedTicket({
        id: ticket.id,
        ticketNumber: ticket.ticketNumber || `TICKET-${ticket.id}`,
        status: 'COMPLETED',
        createdAt: ticket.createdAt || new Date().toISOString(),
        priority: ticket.priority || 1
      })
      setRating(0)
      setComment('')
    }, moduleIdStr)

    const unsubscribeRatingRequested = onRatingRequested((ratingRequest: any) => {
      if (ratingRequest.ticket) {
        const ticket = ratingRequest.ticket
        setSelectedTicket(ticket)
        setRating(0)
        setComment('')
      }
    }, moduleIdStr)

    return () => {
      unsubscribeCompleted()
      unsubscribeRatingRequested()
    }
  }, [isConnected, onTicketCompleted, onRatingRequested, moduleIdStr])

  const handleRating = (value: number) => {
    setRating(value)
  }

  const toggleFullscreen = () => {
    if (isFullscreen) {
      document.exitFullscreen?.().catch(err => console.error('Error saliendo de fullscreen:', err))
    } else {
      document.documentElement.requestFullscreen?.().catch(err =>
        console.error('Error entrando a fullscreen:', err),
      )
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    setIsFullscreen(!!document.fullscreenElement)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const handleLogout = () => {
    clearDispositivoSession()
    navigate('/login', { replace: true })
  }

  const handleSubmit = async () => {
    if (rating === 0) {
      return
    }

    if (!selectedTicket) {
      return
    }

    setSubmitting(true)

    try {
      await ratingService.crearRating({
        ticketId: selectedTicket.id,
        score: rating,
        comment: comment.trim() || undefined
      })

      const ratingData = {
        ticketId: selectedTicket.id,
        ticketNumber: selectedTicket.ticketNumber,
        score: rating,
        comment: comment.trim() || '',
        timestamp: new Date().toISOString(),
        dispositivoId: dispositivo?.dispositivoId,
        moduleId: dispositivo?.moduleId,
        sedeId: dispositivo?.sedeId,
      }
      
      emitRatingSubmitted(ratingData)
      
      setShowThankYou(true)
      
      setTimeout(() => {
        setSelectedTicket(null)
        setRating(0)
        setComment('')
        setShowThankYou(false)
      }, 3000)
    } catch (error) {
      console.error('[RatingTablet] Error enviando calificación:', error)
      alert('Error al enviar la calificación. Intente nuevamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (showThankYou) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-red-950">
        <div className="pointer-events-none absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-red-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 w-[32rem] h-[32rem] rounded-full bg-emerald-500/10 blur-3xl" />
        <Card className="w-full max-w-md text-center bg-slate-900/70 backdrop-blur-xl border border-white/10 shadow-2xl">
          <CardContent className="py-12">
            <div className="w-20 h-20 bg-emerald-500/15 ring-4 ring-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              ¡Gracias por su calificación!
            </h2>
            <p className="text-slate-300">
              Su opinión nos ayuda a mejorar nuestro servicio.
            </p>
            <p className="text-sm text-slate-400 mt-4">
              Volviendo a la pantalla de espera...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-red-950">
      <div className="pointer-events-none absolute -top-40 -left-40 w-[32rem] h-[32rem] rounded-full bg-red-600/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[36rem] h-[36rem] rounded-full bg-rose-500/15 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="absolute top-4 right-4 z-50 flex space-x-2">
        <button
          onClick={toggleFullscreen}
          className="p-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-all duration-200 shadow-lg"
          title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
        >
          {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
        </button>

        {!isFullscreen && (
          <button
            onClick={handleLogout}
            className="p-3 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-all duration-200 shadow-lg"
            title="Cerrar sesión"
          >
            <LogOut className="w-6 h-6" />
          </button>
        )}
      </div>

      {!selectedTicket && (
        <Card className="relative w-full max-w-2xl text-center bg-slate-900/70 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent" />
          <CardContent className="py-16 px-10">
            <div className="relative w-32 h-32 mx-auto mb-10">
              <span className="absolute inset-0 rounded-full bg-red-500/20 blur-2xl animate-pulse" />
              <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-red-500/20 to-red-700/10 ring-4 ring-red-500/30 flex items-center justify-center">
                <Clock className="w-16 h-16 text-red-400" />
              </div>
            </div>
            <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
              Sistema de Calificación
            </h1>
            <p className="text-lg text-slate-300 mb-10">
              Esperando tickets completados para calificar...
            </p>
            {dispositivo && (
              <div className="mt-8 p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoItem label="Dispositivo" value={dispositivo.nombre} />
                  <InfoItem
                    label="Sede"
                    value={dispositivo.sedeNombre ?? `#${dispositivo.sedeId}`}
                  />
                  <InfoItem label="Módulo" value={getModuleName()} />
                  <div className="text-center">
                    <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">
                      WebSocket
                    </p>
                    <span
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${
                        isConnected
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                          : 'bg-red-500/15 text-red-300 border-red-500/40'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isConnected
                            ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                            : 'bg-red-400'
                        }`}
                      />
                      {isConnected ? 'Conectado' : 'Desconectado'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-70 dark:bg-opacity-90 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <Card className="w-full max-w-2xl bg-gradient-to-br from-white to-red-50 dark:from-slate-800 dark:to-slate-900 relative border-4 border-red-400 dark:border-red-500 shadow-2xl">            
            <CardHeader className="text-center bg-gradient-to-r from-red-500 via-red-600 to-red-500 dark:from-red-600 dark:via-red-700 dark:to-red-600 text-white rounded-t-lg py-8">
              <div className="mb-3">
                <div className="inline-block p-3 bg-white dark:bg-slate-800 rounded-full mb-3">
                  <CheckCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <CardTitle className="mb-3 text-white text-4xl font-extrabold drop-shadow-lg">
                ¿Cómo fue tu experiencia?
              </CardTitle>
              <p className="text-red-100 dark:text-white text-xl font-medium">
                Ticket #{selectedTicket ? `${(selectedTicket as Ticket).ticketNumber}` : 'N/A'}
              </p>
            </CardHeader>
            <CardContent className="space-y-8 p-8 bg-white dark:bg-slate-800">
              <div className="text-center">
                <p className="text-xl font-bold text-slate-800 dark:text-white mb-4">
                  Califica nuestro servicio
                </p>
                <div className="flex justify-center space-x-2 mb-4 p-5 bg-slate-50 dark:bg-slate-700 rounded-2xl border-2 border-slate-200 dark:border-slate-600">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleRating(star)}
                      className={`text-6xl transition-all duration-300 transform hover:scale-125 ${
                        star <= rating
                          ? 'text-yellow-400 hover:text-yellow-500 drop-shadow-lg'
                          : 'text-slate-300 dark:text-slate-600 hover:text-yellow-300'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <div className={`text-xl font-bold ${
                  rating === 0 ? 'text-slate-400 dark:text-slate-500' :
                  rating === 1 ? 'text-red-600 dark:text-red-400' :
                  rating === 2 ? 'text-orange-600 dark:text-orange-400' :
                  rating === 3 ? 'text-yellow-600 dark:text-yellow-400' :
                  rating === 4 ? 'text-lime-600 dark:text-lime-400' :
                  'text-green-600 dark:text-green-400'
                }`}>
                  {rating === 0 && '⭐ Seleccione una calificación'}
                  {rating === 1 && '😞 Muy insatisfecho'}
                  {rating === 2 && '😕 Insatisfecho'}
                  {rating === 3 && '😐 Neutral'}
                  {rating === 4 && '😊 Satisfecho'}
                  {rating === 5 && '😄 ¡Muy satisfecho!'}
                </div>
              </div>

              <div>
                <label className="block text-lg font-bold text-slate-700 dark:text-white mb-3">
                  Comentarios <span className="text-slate-400 dark:text-slate-500 font-normal">(Opcional)</span>
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-5 py-4 text-lg border-2 border-slate-300 dark:!border-red-500 rounded-xl focus:ring-4 focus:ring-red-300 dark:focus:ring-red-600 focus:!border-red-500 dark:focus:!border-red-600 resize-none text-slate-900 dark:!text-slate-900 bg-white dark:!bg-white shadow-inner transition-all duration-200"
                  rows={3}
                  placeholder="¿Algo que quieras comentarnos? (Opcional)"
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={rating === 0 || submitting}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 dark:from-red-600 dark:to-red-700 dark:hover:from-red-700 dark:hover:to-red-800 text-white text-xl py-6 rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 font-bold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                size="lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                    Enviando calificación...
                  </>
                ) : (
                  <>
                    <Send className="w-6 h-6 mr-2" />
                    Enviar Calificación
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default RatingTablet