import { createDeviceApiClient } from '../../../../src/services/core/device-auth-service'

const api = createDeviceApiClient()

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
    const response = await api.post<QueueRating>('/ratings', data)
    return response.data
  },
}
