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

const shellClass =
  'min-h-dvh min-h-screen relative overflow-x-hidden overflow-y-auto flex flex-col items-center justify-center ' +
  'p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] ' +
  'bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-950 text-slate-100'

const InfoItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex min-h-[5.5rem] flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3 text-center sm:min-h-[6rem] sm:px-4 sm:py-4">
    <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400 sm:text-xs">{label}</p>
    <p className="mt-1.5 text-sm font-semibold leading-tight text-white sm:text-base">{value}</p>
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

  const { isConnected, onTicketCompleted, onRatingRequested, emitRatingSubmitted } = useRatingWebSocket()

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
        priority: ticket.priority || 1,
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
    if (rating === 0 || !selectedTicket) {
      return
    }

    setSubmitting(true)

    try {
      await ratingService.crearRating({
        ticketId: selectedTicket.id,
        score: rating,
        comment: comment.trim() || undefined,
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

  const bgDecor = (
    <>
      <div className="pointer-events-none absolute -top-40 -left-40 h-[min(90vw,32rem)] w-[min(90vw,32rem)] rounded-full bg-red-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[min(95vw,36rem)] w-[min(95vw,36rem)] rounded-full bg-rose-600/15 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.75) 1px, transparent 0)',
          backgroundSize: '22px 22px',
        }}
      />
    </>
  )

  const cardBase =
    'relative z-10 w-full max-w-lg rounded-2xl !border-white/15 !bg-slate-900/95 text-slate-100 shadow-2xl backdrop-blur-xl'

  if (showThankYou) {
    return (
      <div className={shellClass}>
        {bgDecor}
        <Card className={`${cardBase} mx-auto`}>
          <CardContent className="flex flex-col items-center px-6 py-12 text-center sm:px-10">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 ring-2 ring-emerald-400/40">
              <CheckCircle className="h-12 w-12 text-emerald-400" aria-hidden />
            </div>
            <h2 className="mb-3 text-2xl font-bold text-white sm:text-3xl">¡Gracias por su calificación!</h2>
            <p className="max-w-sm text-base leading-relaxed text-slate-300">
              Su opinión nos ayuda a mejorar nuestro servicio.
            </p>
            <p className="mt-6 text-sm text-slate-400">Volviendo a la pantalla de espera…</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={shellClass}>
      {bgDecor}

      <div className="absolute right-[max(1rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))] z-50 flex gap-2">
        <button
          type="button"
          onClick={toggleFullscreen}
          className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-slate-800/90 text-white shadow-lg transition-colors hover:bg-slate-700"
          title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
        >
          {isFullscreen ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
        </button>

        {!isFullscreen && (
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-red-400/30 bg-red-600/90 text-white shadow-lg transition-colors hover:bg-red-500"
            title="Cerrar sesión"
          >
            <LogOut className="h-6 w-6" />
          </button>
        )}
      </div>

      {!selectedTicket && (
        <Card className={`${cardBase} mx-auto max-w-2xl overflow-hidden`}>
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent" />
          <CardContent className="mx-auto flex max-w-xl flex-col items-center px-5 py-12 text-center sm:px-10 sm:py-14">
            <div className="relative mb-10 h-28 w-28 sm:h-32 sm:w-32">
              <span className="absolute inset-0 animate-pulse rounded-full bg-red-500/25 blur-2xl" />
              <div className="relative flex h-full w-full items-center justify-center rounded-full bg-red-950/50 ring-2 ring-red-500/40">
                <Clock className="h-14 w-14 text-red-400 sm:h-16 sm:w-16" aria-hidden />
              </div>
            </div>
            <h1 className="mb-3 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
              Sistema de calificación
            </h1>
            <p className="mb-0 max-w-md text-base leading-relaxed text-slate-300 sm:text-lg">
              Esperando tickets completados para calificar…
            </p>
            {dispositivo && (
              <div className="mt-10 w-full max-w-xl rounded-2xl border border-white/10 bg-black/25 p-4 sm:p-5">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <InfoItem label="Dispositivo" value={dispositivo.nombre} />
                  <InfoItem label="Sede" value={dispositivo.sedeNombre ?? `#${dispositivo.sedeId}`} />
                  <InfoItem label="Módulo" value={getModuleName()} />
                  <div className="flex min-h-[5.5rem] flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3 sm:min-h-[6rem] sm:px-4 sm:py-4">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-400 sm:text-xs">
                      WebSocket
                    </p>
                    <span
                      className={`mt-2 inline-flex items-center justify-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold sm:text-sm ${
                        isConnected
                          ? 'border-emerald-500/40 bg-emerald-950/80 text-emerald-200'
                          : 'border-red-500/40 bg-red-950/80 text-red-200'
                      }`}
                    >
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                          isConnected
                            ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.85)]'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <Card className="relative z-10 flex max-h-[min(92dvh,92vh)] w-full max-w-lg flex-col overflow-hidden rounded-2xl !border-red-500/35 !bg-slate-900 text-slate-100 shadow-2xl sm:max-w-xl">
            <CardHeader className="shrink-0 border-b border-red-500/30 bg-gradient-to-r from-red-700 via-red-600 to-red-700 px-5 py-8 text-center sm:px-8 sm:py-9">
              <div className="mx-auto mb-4 inline-flex rounded-full bg-white/15 p-3 ring-1 ring-white/25">
                <CheckCircle className="h-11 w-11 text-white sm:h-12 sm:w-12" aria-hidden />
              </div>
              <CardTitle className="!mb-2 !text-2xl !font-extrabold !tracking-tight !text-white sm:!text-3xl md:!text-4xl">
                ¿Cómo fue tu experiencia?
              </CardTitle>
              <p className="text-base font-medium text-red-50 sm:text-lg">
                Ticket #{(selectedTicket as Ticket).ticketNumber}
              </p>
            </CardHeader>

            <CardContent className="min-h-0 flex-1 overflow-y-auto !bg-slate-950 px-5 py-6 text-slate-100 sm:px-8 sm:py-8">
              <div className="mx-auto max-w-md space-y-6">
                <div className="text-center">
                  <p className="mb-4 text-base font-bold text-white sm:text-lg">Califica nuestro servicio</p>
                  <div
                    role="group"
                    aria-label="Estrellas de calificación"
                    className="mx-auto grid max-w-sm grid-cols-5 gap-2 sm:max-w-md sm:gap-3"
                  >
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => handleRating(star)}
                        className={`flex aspect-square max-h-[4.25rem] items-center justify-center rounded-xl border text-4xl leading-none transition-transform duration-150 hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 sm:max-h-[5rem] sm:text-5xl ${
                          star <= rating
                            ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                            : 'border-slate-700/80 bg-slate-900/50 text-slate-600 hover:border-slate-600'
                        }`}
                        aria-label={`${star} de 5 estrellas`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <p
                    className={`mt-4 min-h-[2.75rem] text-base font-bold sm:text-lg ${
                      rating === 0
                        ? 'text-slate-400'
                        : rating === 1
                          ? 'text-red-300'
                          : rating === 2
                            ? 'text-orange-300'
                            : rating === 3
                              ? 'text-amber-200'
                              : rating === 4
                                ? 'text-lime-300'
                                : 'text-emerald-300'
                    }`}
                  >
                    {rating === 0 && 'Seleccione una calificación'}
                    {rating === 1 && 'Muy insatisfecho'}
                    {rating === 2 && 'Insatisfecho'}
                    {rating === 3 && 'Neutral'}
                    {rating === 4 && 'Satisfecho'}
                    {rating === 5 && '¡Muy satisfecho!'}
                  </p>
                </div>

                <div className="text-left">
                  <label htmlFor="rating-comment" className="mb-2 block text-sm font-bold text-white sm:text-base">
                    Comentarios <span className="font-normal text-slate-400">(opcional)</span>
                  </label>
                  <textarea
                    id="rating-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full rounded-xl border-2 border-slate-600 bg-slate-900 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/50 sm:text-lg"
                    rows={3}
                    placeholder="¿Algo que quieras comentarnos?"
                  />
                </div>

                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={rating === 0 || submitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-gradient-to-r from-red-600 to-red-700 py-4 text-base font-bold text-white shadow-lg hover:from-red-500 hover:to-red-600 disabled:cursor-not-allowed disabled:opacity-45 sm:py-5 sm:text-lg"
                  size="lg"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-6 w-6 shrink-0 animate-spin" />
                      Enviando…
                    </>
                  ) : (
                    <>
                      <Send className="h-6 w-6 shrink-0" />
                      Enviar calificación
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default RatingTablet
