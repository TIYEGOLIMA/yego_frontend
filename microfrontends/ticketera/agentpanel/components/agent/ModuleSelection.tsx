import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { Loader2, LogOut } from 'lucide-react'

// Importar servicios del microfrontend
import { moduloAtencionService, ModuloAtencionFrontend } from '../../services/moduloAtencionService'
import { queueAgentService } from '../../services/queueAgentService'

interface ModuleSelectionProps {
  onModuleSelected?: (moduleId: number) => void
}

export const ModuleSelection: React.FC<ModuleSelectionProps> = ({ onModuleSelected }) => {
  const [modules, setModules] = useState<ModuloAtencionFrontend[]>([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const navigate = useNavigate()

  // Obtener datos del usuario desde localStorage (compartido con el sistema principal)
  const [user, setUser] = useState<any>(null)

  const loadModules = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔄 [ModuleSelection] Cargando módulos activos...')
      
      const activeModules = await moduloAtencionService.getFrontendModules()
      
      console.log('✅ [ModuleSelection] Módulos cargados:', activeModules)
      setModules(activeModules)
      
    } catch (error: any) {
      console.error('❌ [ModuleSelection] Error cargando módulos:', error)
      console.error('❌ [ModuleSelection] Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url,
        baseURL: error.config?.baseURL
      })
      
      // Si es error de token inválido (401), ofrecer logout
      if (error.response?.status === 401) {
        console.log('🚨 [ModuleSelection] Token inválido detectado - ofreciendo logout')
        setError('Su sesión ha expirado o el token es inválido. Debe cerrar sesión e iniciar sesión nuevamente.')
      } else if (error.response?.status === 404) {
        console.log('🚨 [ModuleSelection] Endpoint no encontrado (404)')
        setError(`Endpoint no encontrado: ${error.config?.baseURL}${error.config?.url}. Verifique que el backend esté corriendo en el puerto 3030.`)
      } else if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        console.log('🚨 [ModuleSelection] Error de conexión')
        setError('No se puede conectar al backend. Verifique que el servidor esté corriendo en http://localhost:3030')
      } else {
        setError(`Error al cargar los módulos: ${error.message}`)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const getUserData = () => {
      try {
        const userData = localStorage.getItem('user')
        const token = localStorage.getItem('token')
        
        if (!userData || !token) {
          return null
        }
        
        return JSON.parse(userData)
      } catch (error) {
        console.error('Error obteniendo datos del usuario:', error)
        return null
      }
    }

    const userData = getUserData()
    setUser(userData)
  }, [])

  useEffect(() => {
    if (!user) return

    // Verificar si el usuario ya tiene módulo asignado
    if (user && user.moduleId && user.moduleId !== '' && user.moduleId !== null) {
      console.log('🔄 [ModuleSelection] Usuario ya tiene módulo asignado, redirigiendo a /tickets...')
      navigate('/tickets', { replace: true })
      return
    }
    
    loadModules()
  }, [user, navigate, loadModules])

  const handleModuleSelect = async (moduleId: number) => {
    if (!user) {
      console.error('❌ [ModuleSelection] No hay usuario autenticado')
      return
    }

    try {
      setAssigning(moduleId)
      setError(null)
      
      console.log(`🔄 [ModuleSelection] Asignando módulo ${moduleId} al usuario ${user.id}...`)
      
      const response = await queueAgentService.assignModuleToUser(user.id, moduleId)
      
      console.log('🔍 [ModuleSelection] Respuesta completa del backend:', response)
      
      // Verificar si la asignación fue exitosa
      const isSuccess = response.success === true || 
                       response.message?.includes('exitosamente') || 
                       response.moduleAssignment !== undefined;
      
      console.log('🔍 [ModuleSelection] Verificaciones:', {
        isSuccess,
        hasModuleAssignment: !!response.moduleAssignment,
        success: response.success,
        message: response.message,
        moduleAssignment: response.moduleAssignment
      })
      
      if (isSuccess && response.moduleAssignment) {
        console.log('✅ [ModuleSelection] Módulo asignado exitosamente')
        console.log('🔄 [ModuleSelection] Asignación de módulo:', response.moduleAssignment)
        console.log('🔄 [ModuleSelection] ModuleId asignado:', response.moduleAssignment.moduleId)
        
        // Actualizar el usuario en localStorage con el nuevo moduleId
        if (user && response.moduleAssignment) {
          const updatedUser = {
            ...user,
            moduleId: response.moduleAssignment.moduleId
          };
          console.log('🔄 [ModuleSelection] Usuario actualizado con moduleId:', updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
        
        // Notificar al componente padre
        console.log('🔄 [ModuleSelection] Notificando al componente padre...');
        onModuleSelected?.(moduleId)
        
        // 🎯 FORZAR REDIRECCIÓN después de asignar módulo
        console.log('🔄 [ModuleSelection] Redirigiendo a /tickets...')
        setTimeout(() => {
          window.location.href = '/tickets'
        }, 1000) // Esperar 1 segundo para que se actualice el localStorage
        
      } else {
        console.log('❌ [ModuleSelection] Respuesta no exitosa:', response)
        console.log('❌ [ModuleSelection] Condiciones fallidas:', {
          isSuccess,
          hasModuleAssignment: !!response.moduleAssignment,
          condition: 'isSuccess && response.moduleAssignment'
        })
        throw new Error(response.message || 'Error al asignar módulo')
      }
      
    } catch (error: any) {
      console.error('❌ [ModuleSelection] Error asignando módulo:', error)
      setError(error.response?.data?.message || error.message || 'Error al asignar el módulo')
    } finally {
      setAssigning(null)
    }
  }

  const handleLogout = async () => {
    try {
      console.log('🔄 [ModuleSelection] Cerrando sesión por token inválido...')
      // Limpiar datos locales
      localStorage.removeItem('user')
      localStorage.removeItem('token')
      localStorage.removeItem('auth-storage')
      // Redirigir a login
      window.location.href = '/login'
    } catch (error) {
      console.error('❌ [ModuleSelection] Error en logout:', error)
      // Forzar limpieza local si falla el logout
      window.location.href = '/login'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Cargando módulos disponibles...</p>
        </div>
      </div>
    )
  }

  if (error) {
    const isTokenError = error.includes('sesión ha expirado') || error.includes('token es inválido')
    
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
              {isTokenError ? 'Sesión Inválida' : 'Error al cargar módulos'}
            </h3>
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            
            <div className="space-y-3">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                   Es obligatorio seleccionar un módulo para continuar
                </p>
              </div>
              
              <div className="flex gap-3 justify-center">
                {isTokenError ? (
                  <Button 
                    onClick={handleLogout}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Cerrar Sesión
                  </Button>
                ) : (
                  <Button 
                    onClick={loadModules}
                    className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20 border-2"
                  >
                    Reintentar
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-red-600 dark:text-white mb-2">
            Seleccione su Módulo de Trabajo
          </h1>
          <p className="text-base text-gray-600 dark:text-white mb-1">
            Hola <span className="font-semibold text-red-600 dark:text-white">{user?.name}</span>
          </p>
          <p className="text-sm text-gray-500 dark:text-white mb-3">
            Elija el módulo en el que trabajará durante esta sesión
          </p>
          <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 max-w-md mx-auto">
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">
               Es obligatorio seleccionar un módulo para continuar
            </p>
          </div>
        </div>
        
        {/* Módulos Grid - Centrado */}
        <div className="flex justify-center">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full max-w-5xl justify-items-center">
            {modules.map((module) => (
              <Card
                key={module.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${
                  assigning === module.id 
                    ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-900/20' 
                    : 'hover:shadow-xl border-2 border-red-200 dark:border-red-700 hover:border-red-400 dark:hover:border-red-500'
                }`}
              >
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-xl font-bold text-red-600 dark:text-white">
                    Módulo {module.id}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 text-center">
                  {module.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 min-h-[3rem]">
                      {module.description}
                    </p>
                  )}
                  <Button
                    onClick={() => handleModuleSelect(module.id)}
                    disabled={assigning !== null}
                    className={`w-full py-3 font-medium rounded-lg transition-all ${
                      assigning === module.id
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    {assigning === module.id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Asignando...
                      </>
                    ) : (
                      'Seleccionar Módulo'
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

export default ModuleSelection