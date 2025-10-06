import { API_BASE_URL } from '../utils/constants'

// 🌐 Configuración de API para RatingTablet
const createApiInstance = () => {
  const baseURL = API_BASE_URL
  
  return {
    post: async <T>(endpoint: string, data: any): Promise<{ data: T }> => {
      const url = `${baseURL}${endpoint}`
      console.log(`📤 [API] POST ${url}`, data)
      
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
        console.log(`✅ [API] Respuesta de ${url}:`, result)
        return { data: result }
      } catch (error) {
        console.error(`❌ [API] Error en ${url}:`, error)
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
    console.log('📤 [ratingService] Enviando calificación:', data)
    try {
      const response = await api.post<QueueRating>('/ratings', data)
      console.log('✅ [ratingService] Calificación enviada exitosamente:', response.data)
      return response.data
    } catch (error: any) {
      console.error('❌ [ratingService] Error enviando calificación:', error)
      throw error
    }
  },

  async obtenerRatings(): Promise<QueueRating[]> {
    console.log('📤 [ratingService] Obteniendo calificaciones')
    try {
      const response = await api.post<QueueRating[]>('/ratings/list', {})
      console.log('✅ [ratingService] Calificaciones obtenidas:', response.data)
      return response.data
    } catch (error: any) {
      console.error('❌ [ratingService] Error obteniendo calificaciones:', error)
      throw error
    }
  }
}
