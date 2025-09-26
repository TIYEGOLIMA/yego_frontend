export interface Rating {
  id: number
  ticket_id: number
  rating: number
  comment?: string
  created_at: string
}

export interface CreateRatingData {
  ticket_id: number
  rating: number
  comment?: string
}

export interface RatingTabletConfig {
  MIN_RATING: number
  MAX_RATING: number
  SHOW_COMMENTS: boolean
  AUTO_SUBMIT_DELAY: number
}

// 📱 Estados específicos del tablet de calificación
export type RatingState = 'idle' | 'rating' | 'submitting' | 'completed' | 'error'

// Interface temporal para Ticket (debería venir de shared)
export interface Ticket {
  id: number
  ticketNumber: string
  status: string
  createdAt: string
  priority: number
}
