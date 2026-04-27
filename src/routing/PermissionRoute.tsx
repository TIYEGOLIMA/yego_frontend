import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth-store'
import { userHasModuleAccess } from '@/shared/utils/moduleUrlMatch'

export const PermissionRoute = ({
  children,
  module,
}: {
  children: React.ReactNode
  module: string
}) => {
  const { user, modules } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)

  if (!user) return <Navigate to="/login" />

  useEffect(() => {
    if (modules && modules.length > 0) {
      setIsChecking(false)
    } else {
      const timer = setTimeout(() => setIsChecking(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [modules])

  if (isChecking && (!modules || modules.length === 0)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
          <p className="text-lg text-gray-600 dark:text-gray-400">Verificando permisos...</p>
        </div>
      </div>
    )
  }

  if (!modules || modules.length === 0) {
    return <>{children}</>
  }

  if (!userHasModuleAccess(modules, module)) {
    const firstActiveModule = modules.find((m) => m.activo)
    if (firstActiveModule) {
      const redirectUrl = firstActiveModule.url?.startsWith('/')
        ? firstActiveModule.url
        : `/${firstActiveModule.url}`
      return <Navigate to={redirectUrl} replace />
    }
    return <Navigate to="/" replace />
  }

  if (!children) return null

  return <>{children}</>
}
