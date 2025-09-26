import { useCallback } from 'react'

// 🎵 Hook de audio para TVDisplay
export const useAudio = () => {
  const playNotificationSound = useCallback(() => {
    try {
      // Crear audio context si no existe
      if (typeof window !== 'undefined' && 'Audio' in window) {
        const audio = new Audio('/sounds/ticket-called.mp3')
        audio.volume = 0.5
        audio.play().catch(error => {
          console.warn('⚠️ [Audio] No se pudo reproducir sonido:', error)
        })
      }
    } catch (error) {
      console.warn('⚠️ [Audio] Error reproduciendo sonido:', error)
    }
  }, [])

  return {
    playNotificationSound
  }
}

// 🔧 Función para normalizar nombres de conductores
export const normalizeDriverName = (name: string): string => {
  if (!name || typeof name !== 'string') {
    return 'Conductor Desconocido'
  }

  return name
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word => {
      // Capitalizar cada palabra
      if (word.length === 0) return word
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
    .replace(/[^\w\s.-]/g, '') // Remover caracteres especiales
    .trim()
}
