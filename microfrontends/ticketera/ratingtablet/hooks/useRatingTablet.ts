import { useState, useEffect, useCallback } from 'react'
import { Rating, CreateRatingData, Ticket, UseRatingTabletReturn } from '../types/rating'
import { RATING_TABLET_CONFIG } from '../utils/constants'

export const useRatingTablet = (): UseRatingTabletReturn => {
  // 🎯 Estados principales
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showThankYou, setShowThankYou] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableTickets, setAvailableTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(false)
  const [isTabletMode, setIsTabletMode] = useState(true)

  // 🔧 Acciones
  const submitRating = useCallback(async (): Promise<void> => {
    if (!selectedTicket || rating === 0) return
    
    setSubmitting(true)
    setError(null)
    
    try {
      const ratingData: CreateRatingData = {
        ticket_id: selectedTicket.id,
        rating,
        comment: comment.trim() || undefined
      }
      
      // Simular llamada API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Resetear formulario y mostrar agradecimiento
      setShowThankYou(true)
      setRating(0)
      setComment('')
      
      // Auto-ocultar después del delay configurado
      setTimeout(() => {
        setShowThankYou(false)
        setSelectedTicket(null)
      }, RATING_TABLET_CONFIG.AUTO_SUBMIT_DELAY)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar calificación')
    } finally {
      setSubmitting(false)
    }
  }, [selectedTicket, rating, comment])

  const resetForm = useCallback(() => {
    setRating(0)
    setComment('')
    setError(null)
    setShowThankYou(false)
  }, [])

  const loadAvailableTickets = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      // Simular carga de tickets disponibles para calificar
      await new Promise(resolve => setTimeout(resolve, 500))
      setAvailableTickets([]) // Placeholder
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar tickets')
    } finally {
      setLoading(false)
    }
  }, [])

  const showError = useCallback((message: string) => {
    setError(message)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // 🎯 Estados derivados
  const canSubmit = rating > 0 && selectedTicket !== null && !submitting
  const ratingColors = RATING_TABLET_CONFIG.RATING_COLORS
  const ratingMessages = RATING_TABLET_CONFIG.RATING_MESSAGES

  // 🚀 Efectos
  useEffect(() => {
    loadAvailableTickets()
  }, [loadAvailableTickets])

  return {
    // Estados
    selectedTicket,
    rating,
    comment,
    submitting,
    showThankYou,
    error,
    availableTickets,
    loading,
    isTabletMode,

    // Acciones
    setSelectedTicket,
    setRating,
    setComment,
    submitRating,
    resetForm,
    loadAvailableTickets,
    showError,
    clearError,

    // Estados derivados
    canSubmit,
    ratingColors,
    ratingMessages
  }
}
