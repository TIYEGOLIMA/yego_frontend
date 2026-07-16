import { useMemo } from 'react'
import { useAuthStore } from '@/store/auth-store'
import type { User } from '../types'

export const useAuth = () => {
  const authUser = useAuthStore((state) => state.user)
  const token = useAuthStore((state) => state.token)
  const loading = useAuthStore((state) => state.loading)
  const currentUser = useMemo<User | null>(() => {
    if (!authUser || !token) return null
    return { ...authUser, moduleId: authUser.moduleId ?? undefined }
  }, [authUser, token])

  return { currentUser, loading }
}

export default useAuth
