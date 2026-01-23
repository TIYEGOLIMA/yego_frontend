import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../shared/components/ui/Card'
import { Button } from '../shared/components/ui/Button'
import { Clock, CheckCircle, LogOut, Loader2, Send, Maximize, Minimize } from 'lucide-react'
import { Ticket } from './types'
import { ratingService } from './services/ratingService'
import { useRatingWebSocket } from './hooks/useWebSocket'
import { useAuthStore } from '../../../src/store/auth-store'

const RatingTablet: React.FC = () => {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showThankYou, setShowThankYou] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  const navigate = useNavigate()
  
  // Obtener usuario del store de auth
  const authUser = useAuthStore((state) => state.user)
  
  // Obtener el moduleId del usuario (prioridad: store de auth > currentUser local)
  // El moduleId puede estar en el objeto user aunque no esté en el tipo User
  const getUserModuleId = (): string | null => {
    const moduleId = (authUser as any)?.moduleId || currentUser?.moduleId || null
    return moduleId ? String(moduleId) : null
  }

  // 🎯 WEBSOCKET CENTRALIZADO para tiempo real
  const { 
    isConnected,
    connectionStatus,
    onTicketCompleted, 
    onRatingRequested,
    emitRatingSubmitted 
  } = useRatingWebSocket()

  // 🎯 CARGAR DATOS REALES DEL USUARIO
  useEffect(() => {
    try {
      // Leer desde auth-storage (Zustand persist) en lugar de 'user'
      const authStorageData = localStorage.getItem('auth-storage')
      if (authStorageData) {
        const parsedData = JSON.parse(authStorageData)
        const user = parsedData?.state?.user || null
        if (user) {
          setCurrentUser({
            id: user.id,
            name: user.name,
            username: user.username,
            role: user.role,
            moduleId: user.moduleId || null
          })
          return
        }
      }
      
      // Fallback: intentar leer desde 'user' (compatibilidad)
      const userData = localStorage.getItem('user')
      if (userData) {
        const user = JSON.parse(userData)
        setCurrentUser({
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
          moduleId: user.moduleId || null
        })
      } else {
        setCurrentUser({
          name: 'Usuario Rating',
          role: 'Calificador',
          moduleId: null
        })
      }
    } catch (error) {
      setCurrentUser({
        name: 'Usuario Rating',
        role: 'Calificador',
        moduleId: null
      })
    }
  }, [])
  
  // Función para obtener el nombre del módulo
  const getModuleName = (): string => {
    const moduleId = getUserModuleId()
    if (!moduleId) return 'No asignado'
    
    // Para ticketera, los módulos son de atención (modulo_atencion), no del sistema principal
    // Por lo tanto, simplemente mostrar "Módulo {id}" en lugar de buscar en el array de módulos del sistema
    // que puede contener módulos de otros sistemas (Garantizado, Pro-Ops, etc.)
    return `Módulo ${moduleId}`
  }

  // 🎯 WEBSOCKET: Suscripción a tickets completados
  useEffect(() => {
    if (!isConnected) {
      return
    }

    const userModuleId = getUserModuleId()
    
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
    }, userModuleId)

    // Suscribirse a solicitudes específicas de rating (con filtrado por módulo)
    const unsubscribeRatingRequested = onRatingRequested((ratingRequest: any) => {
      if (ratingRequest.ticket) {
        const ticket = ratingRequest.ticket
        setSelectedTicket(ticket)
        setRating(0)
        setComment('')
      }
    }, userModuleId)
    
    return () => {
      unsubscribeCompleted()
      unsubscribeRatingRequested()
    }
  }, [isConnected, onTicketCompleted, onRatingRequested, currentUser?.moduleId, authUser?.moduleId])

  // 🎯 HTTP Polling como fallback cuando WebSocket no esté disponible
  useEffect(() => {
    if (isConnected) {
      return
    }
    
    const interval = setInterval(() => {
      // Cargar tickets completados
    }, 30000)
    
    return () => clearInterval(interval)
  }, [isConnected])

  const handleRating = (value: number) => {
    setRating(value)
  }

  // 🎯 FUNCIONES DE FULLSCREEN
  const enterFullscreen = () => {
    const element = document.documentElement
    if (element.requestFullscreen) {
      element.requestFullscreen().catch(err => {
        console.error('Error al entrar en fullscreen:', err)
      })
    }
  }

  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => {
        console.error('Error al salir de fullscreen:', err)
      })
    }
  }

  const toggleFullscreen = () => {
    if (isFullscreen) {
      exitFullscreen()
    } else {
      enterFullscreen()
    }
  }

  // 🎯 EFECTO PARA DETECTAR CAMBIOS EN FULLSCREEN
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

  const handleLogout = async () => {
    try {
      localStorage.removeItem('user')
      localStorage.removeItem('token')
      localStorage.removeItem('auth-storage')
      navigate('/login', { replace: true })
    } catch (error) {
      window.location.href = '/login'
    }
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
        userId: currentUser?.id
      }
      
      emitRatingSubmitted(ratingData)
      
      setShowThankYou(true)
      
      setTimeout(() => {
        setSelectedTicket(null)
        setRating(0)
        setComment('')
        setShowThankYou(false)
      }, 3000)
    } catch (error: any) {
      if (error.message?.includes('404')) {
        alert('⚠️ El endpoint de calificaciones no está disponible en el backend.\n\nPor favor, verifica que el controlador de ratings esté creado en:\n/api/ticketera/ratings')
      } else {
        alert('Error al enviar la calificación. Intente nuevamente.')
      }
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
      {/* Botones de control en esquina superior derecha */}
      <div className="absolute top-4 right-4 z-50 flex space-x-2">
        {/* Botón de Fullscreen/Minimizar */}
        <button
          onClick={toggleFullscreen}
          className="p-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-all duration-200 shadow-lg"
          title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
        >
          {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
        </button>
        
        {/* Botón de Cerrar Sesión (solo cuando NO está en fullscreen) */}
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

      {/* Pantalla de espera (cuando no hay tickets para calificar) */}
      {!selectedTicket && (
        <Card className="w-full max-w-2xl text-center dark:bg-slate-800 border-2 border-red-200 dark:border-red-500">
          <CardContent className="py-20 px-10">
            <div className="w-32 h-32 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-10">
              <Clock className="w-20 h-20 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-5xl font-bold text-slate-900 dark:text-white mb-8">
              Sistema de Calificación
            </h1>
            <p className="text-xl text-slate-500 dark:text-slate-300 mb-10">
              Esperando tickets completados para calificar...
            </p>
            {currentUser && (
              <div className="mt-10 p-8 bg-slate-50 dark:bg-slate-700 rounded-2xl space-y-6">
                <p className="text-2xl text-slate-600 dark:text-white text-left">
                  <strong>Módulo:</strong> {getModuleName()}
                </p>
                <div className="text-left flex items-center gap-3">
                  <p className="text-2xl text-slate-600 dark:text-white">
                    <strong>WebSocket:</strong>
                  </p>
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-lg font-medium border ${
                    isConnected 
                      ? 'bg-green-100 dark:bg-gray-700 text-green-800 dark:text-green-200 border-green-400 dark:border-green-600' 
                      : 'bg-red-100 dark:bg-gray-700 text-red-800 dark:text-red-200 border-red-400 dark:border-red-600'
                  }`}>
                    <span className={`w-3 h-3 rounded-full ${
                      isConnected ? 'bg-green-500' : 'bg-red-500'
                    }`}></span>
                    {isConnected ? 'Conectado' : 'Desconectado'}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal de calificación (cuando llega un ticket completado) */}
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
              {/* Estrellas */}
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

              {/* Comentario */}
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

              {/* Botón enviar */}
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