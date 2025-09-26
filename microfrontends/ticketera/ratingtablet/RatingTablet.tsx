import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../shared/components/ui/Card'
import { Button } from '../shared/components/ui/Button'
import { Clock, CheckCircle, LogOut, Loader2, Send } from 'lucide-react'
import { TICKET_STATUS } from '../shared/utils/constants'
import { Rating, CreateRatingData, Ticket } from './types'
import { ratingService } from './services/ratingService'
import { useRatingWebSocket } from './hooks/useWebSocket'

const RatingTablet: React.FC = () => {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showThankYou, setShowThankYou] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  const navigate = useNavigate()

  // 🎯 WEBSOCKET CENTRALIZADO para tiempo real
  const { 
    isConnected, 
    connectionStatus,
    onTicketCompleted, 
    onRatingRequested,
    emitRatingSubmitted 
  } = useRatingWebSocket()

  // Simulación de datos de usuario
  useEffect(() => {
    // Simulación - en producción esto vendría de un hook useAuth
    setCurrentUser({
      name: 'Usuario Rating',
      role: 'Calificador',
      moduleId: 1
    })
  }, [])

  // 🎯 WEBSOCKET: Suscripción a tickets completados
  useEffect(() => {
    console.log('🔌 [RatingTablet] Configurando WebSocket para tickets completados...')
    console.log('🔌 [RatingTablet] Estado conexión:', { isConnected, connectionStatus })
    
    if (!isConnected) {
      console.log('🚫 [RatingTablet] WebSocket no disponible')
      return
    }

    // Suscribirse a tickets completados que necesitan rating
    const unsubscribeCompleted = onTicketCompleted((ticket: any) => {
      console.log('🎫 [RatingTablet] Ticket completado recibido por WebSocket:', ticket.ticketNumber || ticket.id)
      
      // Solo procesar tickets que necesiten rating
      if (ticket.status === 'COMPLETED' && !ticket.rated) {
        console.log('⭐ [RatingTablet] Preparando ticket para calificación:', ticket.ticketNumber)
        setSelectedTicket({
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          status: 'COMPLETED',
          createdAt: ticket.createdAt,
          priority: ticket.priority || 1
        })
        setRating(0)
        setComment('')
      }
    })

    // Suscribirse a solicitudes específicas de rating
    const unsubscribeRatingRequested = onRatingRequested((ratingRequest: any) => {
      console.log('⭐ [RatingTablet] Solicitud de rating recibida:', ratingRequest)
      if (ratingRequest.ticket) {
        setSelectedTicket(ratingRequest.ticket)
        setRating(0)
        setComment('')
      }
    })
    
    return () => {
      console.log('🧹 [RatingTablet] Limpiando suscripciones WebSocket')
      unsubscribeCompleted()
      unsubscribeRatingRequested()
    }
  }, [isConnected, onTicketCompleted, onRatingRequested])

  // 🎯 HTTP Polling como fallback cuando WebSocket no esté disponible
  useEffect(() => {
    if (isConnected) {
      console.log('🔌 [RatingTablet] WebSocket activo - HTTP polling deshabilitado')
      return
    }

    console.log('🚫 [RatingTablet] WebSocket no disponible - usando HTTP polling cada 30 segundos')
    
    const interval = setInterval(() => {
      // Cargar tickets completados
    }, 30000) // 30 segundos
    
    return () => clearInterval(interval)
  }, [isConnected])

  const handleRating = (value: number) => {
    setRating(value)
  }

  const handleLogout = () => {
    // 🎯 MICROFRONTEND: Solo navegar al login (el sistema principal maneja el logout)
    console.log('🚪 [RatingTablet] Navegando al login...')
    navigate('/login', { replace: true })
  }

  const handleSubmit = async () => {
    if (rating === 0) {
      console.error('Debe seleccionar una calificación')
      return
    }

    if (!comment.trim()) {
      console.error('El comentario es requerido')
      return
    }

    if (!selectedTicket) {
      console.error('No hay ticket para calificar')
      return
    }

    setSubmitting(true)

    try {
      await ratingService.crearRating({
        ticketId: selectedTicket.id,
        score: rating,
        comment: comment.trim()
      })

      console.log('✅ [RatingTablet] Calificación enviada exitosamente')

      // 🎯 WEBSOCKET: Notificar que se envió una rating
      const ratingData = {
        ticketId: selectedTicket.id,
        ticketNumber: selectedTicket.ticketNumber,
        score: rating,
        comment: comment.trim(),
        timestamp: new Date().toISOString(),
        userId: currentUser?.id
      }
      
      const socketSent = emitRatingSubmitted(ratingData)
      console.log('📡 [RatingTablet] Evento WebSocket enviado:', socketSent ? 'SÍ' : 'NO')
      
      // Mostrar pantalla de agradecimiento
      setShowThankYou(true)
      
      // Limpiar formulario después de 3 segundos
      setTimeout(() => {
        setSelectedTicket(null)
        setRating(0)
        setComment('')
        setShowThankYou(false)
        // Recargar tickets
      }, 3000)
    } catch (error) {
      console.error('❌ [RatingTablet] Error enviando calificación:', error)
      console.error('Error al enviar la calificación. Intente nuevamente.')
    } finally {
      setSubmitting(false)
    }
  }

  // Pantalla de éxito (después de enviar calificación)
  if (showThankYou) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-12">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              ¡Gracias por su calificación!
            </h2>
            <p className="text-slate-600">
              Su opinión nos ayuda a mejorar nuestro servicio.
            </p>
            <p className="text-sm text-slate-500 mt-4">
              Volviendo a la pantalla de espera...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center p-4 relative">
      {/* Botón de cerrar sesión en esquina superior derecha */}
      <div className="absolute top-4 right-4">
        <Button
          onClick={handleLogout}
          variant="ghost"
          size="sm"
          className="bg-white hover:bg-red-50 border border-red-200 text-red-600 hover:text-red-700"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Cerrar Sesión
        </Button>
      </div>

      {/* Pantalla de espera (cuando no hay tickets para calificar) */}
      {!selectedTicket && (
        <Card className="w-full max-w-lg text-center">
          <CardContent className="py-16">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-8">
              <Clock className="w-12 h-12 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-4">
              Sistema de Calificación
            </h1>
            <p className="text-lg text-slate-600 mb-2">
              Módulo {(currentUser as any)?.moduleId || 'No asignado'}
            </p>
            <p className="text-base text-slate-500 mb-6">
              Esperando tickets completados del módulo {(currentUser as any)?.moduleId || 'No asignado'} para calificar...
            </p>
            <div className="flex items-center justify-center space-x-2 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Conectado y esperando</span>
            </div>
            {currentUser && (
              <div className="mt-8 p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">
                  <strong>Usuario:</strong> {currentUser.name}
                </p>
                <p className="text-sm text-slate-600">
                  <strong>Rol:</strong> {currentUser.role}
                </p>
                <p className="text-sm text-slate-600">
                  <strong>Módulo:</strong> {(currentUser as any)?.moduleId || 'No asignado'}
                </p>
                <p className="text-sm text-slate-600 flex items-center justify-center gap-2">
                  <strong>WebSocket:</strong> 
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    isConnected 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      isConnected ? 'bg-green-500' : 'bg-red-500'
                    }`}></span>
                    {isConnected ? 'Conectado' : 'Deshabilitado (HTTP Polling)'}
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal de calificación (cuando llega un ticket completado) */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md bg-white relative">            
            <CardHeader className="text-center bg-red-500 text-white rounded-lg">
              <CardTitle className="mb-2 mt-5  text-white">
                Calificar Servicio
              </CardTitle>
              <p className="text-red-100">
                Ticket: {selectedTicket ? `#${(selectedTicket as Ticket).id}` : 'N/A'}
              </p>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {/* Estrellas */}
              <div className="text-center">
                <div className="flex justify-center space-x-2 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleRating(star)}
                      className={`text-4xl transition-all duration-200 ${
                        star <= rating
                          ? 'text-red-400 hover:text-red-500'
                          : 'text-slate-300 hover:text-red-400'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <p className="text-sm text-slate-500">
                  {rating === 0 && 'Seleccione una calificación *'}
                  {rating === 1 && 'Muy insatisfecho'}
                  {rating === 2 && 'Insatisfecho'}
                  {rating === 3 && 'Neutral'}
                  {rating === 4 && 'Satisfecho'}
                  {rating === 5 && 'Muy satisfecho'}
                </p>
              </div>

              {/* Comentario */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Escriba su comentario *
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                  rows={4}
                  placeholder="Cuéntenos sobre su experiencia..."
                  required
                />
              </div>

              {/* Botón enviar */}
              <Button
                onClick={handleSubmit}
                disabled={rating === 0 || !comment.trim() || submitting}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                size="lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
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