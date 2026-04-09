import { useCallback } from 'react'

export const useAudio = () => {
  const playNotificationSound = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && 'Audio' in window) {
        const audio = new Audio('/sounds/ticket-called.mp3')
        audio.volume = 0.5
        audio.play().catch(() => {
          // autoplay may be blocked by the browser
        })
      }
    } catch {
      // ignore
    }
  }, [])

  return {
    playNotificationSound
  }
}

export const normalizeDriverName = (name: string): string => {
  if (!name || typeof name !== 'string') {
    return 'Conductor Desconocido'
  }

  return name
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word => {
      if (word.length === 0) return word
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
    .replace(/[^\w\s.-]/g, '') // Remover caracteres especiales
    .trim()
}
