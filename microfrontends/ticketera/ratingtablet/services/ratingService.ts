import { API_BASE_URL } from '../utils/constants'

// 🌐 Configuración de API para RatingTablet
const createApiInstance = () => {
  const baseURL = API_BASE_URL
  
  return {
    post: async <T>(endpoint: string, data: any): Promise<{ data: T }> => {
      const url = `${baseURL}${endpoint}`
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          },
          body: JSON.stringify(data),
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const result = await response.json()
        return { data: result }
      } catch (error) {
        throw error
      }
    }
  }
}

const api = createApiInstance()

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
    try {
      const response = await api.post<QueueRating>('/ratings', data)
      return response.data
    } catch (error: any) {
      throw error
    }
  },

  async obtenerRatings(): Promise<QueueRating[]> {
    try {
      const response = await api.post<QueueRating[]>('/ratings/list', {})
      return response.data
    } catch (error: any) {
      throw error
    }
  }
}
