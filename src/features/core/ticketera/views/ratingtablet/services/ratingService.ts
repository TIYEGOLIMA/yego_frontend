import { ticketeraApi } from '../../../api'

export interface CrearRatingRequest {
  ticketId: number
  score: number
  comment?: string
}

export interface QueueRating {
  id: number
  ticketId: number
  score: number
  comment?: string
  createdAt: string
}

export const ratingService = {
  async crearRating(data: CrearRatingRequest): Promise<QueueRating> {
    return ticketeraApi.createRating(data)
  },
}
