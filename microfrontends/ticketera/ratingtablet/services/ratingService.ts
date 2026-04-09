const API_BASE_URL = import.meta.env.VITE_AGENT_API_URL || 'https://api-int.yego.pro/api/ticketera'

function getAuthToken(): string {
  let token = ''
  try {
    const authStorageData = localStorage.getItem('auth-storage')
    if (authStorageData) {
      const parsedData = JSON.parse(authStorageData)
      token = parsedData?.state?.token || ''
    }
  } catch {
    token = localStorage.getItem('token') || ''
  }
  return token
}

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
            Authorization: `Bearer ${getAuthToken()}`,
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
  }
}
