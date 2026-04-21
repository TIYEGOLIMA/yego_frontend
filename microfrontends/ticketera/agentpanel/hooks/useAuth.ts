import { useState, useEffect } from 'react'
import { User } from '../types'

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUserFromStorage = () => {
      try {
        const authStorageData = localStorage.getItem('auth-storage')
        if (!authStorageData) {
          setCurrentUser(null)
          setLoading(false)
          return
        }
        const parsedData = JSON.parse(authStorageData)
        const user = parsedData?.state?.user || null
        const token = parsedData?.state?.token || null
        if (!user || !token || !user.id || !user.username || !user.role) {
          setCurrentUser(null)
          setLoading(false)
          return
        }
        setCurrentUser(user)
        setLoading(false)
      } catch (error) {
        console.error('[AgentPanel] Error cargando datos de usuario:', error)
        setCurrentUser(null)
        setLoading(false)
      }
    }

    loadUserFromStorage()

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth-storage') loadUserFromStorage()
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  return { currentUser, loading }
}

export default useAuth
