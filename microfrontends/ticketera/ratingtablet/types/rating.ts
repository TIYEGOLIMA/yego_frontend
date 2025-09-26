import React from 'react'
import { Rating, Ticket, CreateRatingData } from './index'

// Re-exportar tipos principales para que estén disponibles desde este archivo
export { Rating, Ticket, CreateRatingData }

export interface RatingTabletState {
  selectedTicket: Ticket | null
  rating: number
  comment: string
  submitting: boolean
  showThankYou: boolean
  error: string | null
  availableTickets: Ticket[]
  loading: boolean
  isTabletMode: boolean
}

export interface RatingTabletActions {
  setSelectedTicket: (ticket: Ticket | null) => void
  setRating: (rating: number) => void
  setComment: (comment: string) => void
  submitRating: () => Promise<void>
  resetForm: () => void
  loadAvailableTickets: () => Promise<void>
  showError: (message: string) => void
  clearError: () => void
}

export interface UseRatingTabletReturn extends RatingTabletState, RatingTabletActions {
  canSubmit: boolean
  ratingColors: Record<number, string>
  ratingMessages: Record<number, string>
}

export interface RatingStarProps {
  rating: number
  maxRating: number
  size?: 'sm' | 'md' | 'lg' | 'xl'
  onRatingChange?: (rating: number) => void
  readonly?: boolean
  showEmoji?: boolean
}

export interface RatingFormProps {
  ticket: Ticket
  rating: number
  comment: string
  submitting: boolean
  onRatingChange: (rating: number) => void
  onCommentChange: (comment: string) => void
  onSubmit: () => void
  onCancel: () => void
}

export interface ThankYouModalProps {
  isOpen: boolean
  rating: number
  onClose: () => void
  autoCloseDelay?: number
}

export interface TicketSelectionProps {
  tickets: Ticket[]
  loading: boolean
  onTicketSelect: (ticket: Ticket) => void
  emptyMessage?: string
}

export interface RatingHistoryProps {
  ratings: Rating[]
  loading: boolean
  onLoadMore?: () => void
  hasMore?: boolean
}
