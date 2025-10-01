import React from 'react'
import { useAuthStore } from '../store/auth-store'
import { getUserModuleConfiguration, shouldUseFullscreen, getComponentForRole } from '../utils/role-based-routing'
import { Button } from './ui/button'

/**
 * Componente de debug para mostrar información del rol y configuración
 */
export const RoleDebugInfo: React.FC = () => {
  const { user, logout } = useAuthStore()
  
  if (!user) {
    return <div className="p-4 bg-red-100 text-red-800 rounded">No hay usuario autenticado</div>
  }
  
  const userConfig = getUserModuleConfiguration(user.role)
  const needsFullscreen = shouldUseFullscreen(user.role)
  const component = getComponentForRole(user.role)
  
  const handleLogout = async () => {
    try {
      console.log('🔄 [RoleDebugInfo] Iniciando logout...')
      await logout()
      console.log('✅ [RoleDebugInfo] Logout completado')
    } catch (error) {
      console.error('❌ [RoleDebugInfo] Error en logout:', error)
    }
  }
  
  return (
    <div className="p-4 bg-blue-50 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-lg border border-blue-200 dark:border-blue-700">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-lg">🔍 Información del Rol</h3>
        <Button 
          onClick={handleLogout}
          variant="danger"
          size="sm"
          className="text-xs"
        >
          🚪 Logout
        </Button>
      </div>
      <div className="space-y-2 text-sm">
        <div><strong>Usuario:</strong> {user.name} ({user.username})</div>
        <div><strong>Rol:</strong> {user.role}</div>
        <div><strong>Componente:</strong> {component}</div>
        <div><strong>Pantalla completa:</strong> {needsFullscreen ? '✅ Sí' : '❌ No'}</div>
        {userConfig && (
          <>
            <div><strong>Descripción:</strong> {userConfig.description}</div>
            <div><strong>Ruta por defecto:</strong> {userConfig.defaultPath}</div>
            <div><strong>Permisos:</strong> {userConfig.permissions.join(', ')}</div>
          </>
        )}
      </div>
    </div>
  )
}
