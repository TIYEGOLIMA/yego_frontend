import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { Loader2, LogOut, Lock, Unlock, ChevronDown, ChevronUp } from 'lucide-react'
import { ModuloAtencion, ModuloOcupado, moduloAtencionService } from '../../services/moduloAtencionService'
import { queueAgentService } from '../../services/queueAgentService'
import { useSocket } from '../../contexts/SocketContext'
import { useToastNotifications } from '../../../../../src/hooks/useToastNotifications'
import { NotificationContainer } from '../../../../../src/components/NotificationToast'

interface ModuleSelectionProps {
  onModuleSelected?: (moduleId: number) => void
  modules?: ModuloAtencion[]
  onModulesUpdated?: (modules: ModuloAtencion[]) => void
}

const getUserFromStorage = () => {
  try {
    const authStorageData = localStorage.getItem('auth-storage')
    if (!authStorageData) return null
    
    const parsedData = JSON.parse(authStorageData)
    const user = parsedData?.state?.user
    const token = parsedData?.state?.token
    
    if (!user || !token || !user.id || !user.username || !user.role) {
      return null
    }
    
    return user
  } catch {
    return null
  }
}

const updateUserModuleId = (moduleId: number) => {
  try {
    const authStorageData = localStorage.getItem('auth-storage')
    if (!authStorageData) return
    
    const parsedData = JSON.parse(authStorageData)
    const updatedAuthStorage = {
      ...parsedData,
      state: {
        ...parsedData.state,
        user: {
          ...parsedData.state.user,
          moduleId
        }
      }
    }
    localStorage.setItem('auth-storage', JSON.stringify(updatedAuthStorage))
  } catch (error) {
    console.error('Error actualizando auth-storage:', error)
  }
}

const formatearFecha = (fecha: string) => {
  try {
    const date = new Date(fecha)
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return fecha
  }
}

const mapearModuloAtencion = (mod: any): ModuloAtencion => ({
  id: mod.id,
  name: mod.name,
  description: mod.description
})

const mapearModuloOcupado = (mod: any): ModuloOcupado => ({
  moduleId: mod.moduleId,
  userId: mod.userId,
  userName: mod.userName,
  status: mod.status,
  horaAsignacion: mod.horaAsignacion,
  createdAt: mod.createdAt,
  updatedAt: mod.updatedAt
})

export const ModuleSelection: React.FC<ModuleSelectionProps> = ({ 
  onModuleSelected, 
  modules: modulesFromProps = [],
  onModulesUpdated
}) => {
  const [assigning, setAssigning] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [liberatingModule, setLiberatingModule] = useState<number | null>(null)
  const [modulosOcupadosData, setModulosOcupadosData] = useState<ModuloOcupado[]>([])
  const [showOcupados, setShowOcupados] = useState(false)
  const [showDisponibles, setShowDisponibles] = useState(true)
  const [showModalLiberacion, setShowModalLiberacion] = useState(false)
  const navigate = useNavigate()
  const { subscribe, isConnected } = useSocket()
  const { notifications, removeNotification } = useToastNotifications()
  const modulosOcupadosAnterioresRef = useRef<ModuloOcupado[]>([])

  useEffect(() => {
    const userData = getUserFromStorage()
    setUser(userData)
    
    if (userData?.moduleId && userData.moduleId !== '' && userData.moduleId !== null) {
      navigate('/tickets', { replace: true })
    }
  }, [navigate])

  useEffect(() => {
    const cargarEstadoInicial = async () => {
      if (!user?.id) return

      try {
        const respuesta = await moduloAtencionService.verificarModuloOListarDisponibles(user.id)
        
        if (respuesta && typeof respuesta === 'object' && !Array.isArray(respuesta)) {
          const respuestaObj = respuesta as any
          
          if (respuestaObj.modulosOcupados && Array.isArray(respuestaObj.modulosOcupados)) {
            const ocupados = respuestaObj.modulosOcupados.map(mapearModuloOcupado)
            modulosOcupadosAnterioresRef.current = ocupados
            setModulosOcupadosData(ocupados)
          }
          
          if (respuestaObj.modulosDisponibles && Array.isArray(respuestaObj.modulosDisponibles) && onModulesUpdated) {
            onModulesUpdated(respuestaObj.modulosDisponibles.map(mapearModuloAtencion))
          }
        } else if (Array.isArray(respuesta) && onModulesUpdated) {
          onModulesUpdated(respuesta.map(mapearModuloAtencion))
        }
      } catch (error) {
        console.error('Error cargando estado inicial de módulos:', error)
      }
    }

    cargarEstadoInicial()
  }, [user?.id, onModulesUpdated])

  useEffect(() => {
    if (!isConnected || !user?.id) return

    const unsubscribe = subscribe('/topic/modulos-atencion', (message: any) => {
      const modulosData = message?.data || message
      
      if (modulosData.type === 'MODULOS_ACTUALIZADOS' || message?.type === 'MODULOS_ACTUALIZADOS') {
        // Verificar si el módulo del usuario actual fue liberado
        if (modulosData.modulosOcupados && Array.isArray(modulosData.modulosOcupados)) {
          const nuevosOcupados = modulosData.modulosOcupados.map(mapearModuloOcupado)
          
          // Buscar si el usuario actual tenía un módulo ocupado antes (usando el ref)
          const moduloAnteriorDelUsuario = modulosOcupadosAnterioresRef.current.find(
            (mod: ModuloOcupado) => mod.userId === user.id
          )
          
          // Si el usuario tenía un módulo ocupado antes y ahora no está en la lista, fue liberado
          if (moduloAnteriorDelUsuario && !nuevosOcupados.some((mod: ModuloOcupado) => mod.userId === user.id)) {
            setShowModalLiberacion(true)
          }
          
          // Actualizar el ref con los nuevos datos
          modulosOcupadosAnterioresRef.current = nuevosOcupados
          setModulosOcupadosData(nuevosOcupados)
        }
        
        if (modulosData.modulosDisponibles && Array.isArray(modulosData.modulosDisponibles) && onModulesUpdated) {
          const modulosDisponibles = modulosData.modulosDisponibles.map(mapearModuloAtencion)
          if (modulosDisponibles.length > 0) {
            onModulesUpdated(modulosDisponibles)
          }
        }
      }
    })

    return () => unsubscribe?.()
  }, [isConnected, subscribe, onModulesUpdated, user?.id])

  const handleModuleSelect = async (moduleId: number) => {
    if (!user) return

    try {
      setAssigning(moduleId)
      setError(null)
      
      const response = await queueAgentService.assignModuleToUser(user.id, moduleId)
      
      const isSuccess = response.success === true || 
                       response.message?.includes('exitosamente') || 
                       response.moduleAssignment !== undefined
      
      if (isSuccess && response.moduleAssignment) {
        const assignedModuleId = typeof response.moduleAssignment.moduleId === 'string' 
          ? parseInt(response.moduleAssignment.moduleId, 10) 
          : response.moduleAssignment.moduleId
        updateUserModuleId(assignedModuleId)
        onModuleSelected?.(moduleId)
      } else {
        throw new Error(response.message || 'Error al asignar módulo')
      }
    } catch (error: any) {
      setError(error.response?.data?.message || error.message || 'Error al asignar el módulo')
    } finally {
      setAssigning(null)
    }
  }

  const handleLiberarModulo = async (moduleId: number) => {
    try {
      setLiberatingModule(moduleId)
      await queueAgentService.liberarModuloPorId(moduleId)
      // El WebSocket notificará al usuario afectado, no al que ejecuta la acción
    } catch (error: any) {
      console.error('Error al liberar módulo:', error)
      setError(error.response?.data?.message || error.message || 'Error al liberar el módulo')
    } finally {
      setLiberatingModule(null)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('auth-storage')
    window.location.href = '/login'
  }


  if (modulesFromProps.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              No hay módulos disponibles
            </h3>
            <p className="text-yellow-600 dark:text-yellow-400">
              No se encontraron módulos de atención disponibles. Contacte al administrador.
            </p>
          </div>
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
              {isTokenError ? 'Sesión Inválida' : 'Error'}
            </h3>
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            
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
                  onClick={() => setError(null)}
                  className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20 border-2"
                >
                  Cerrar
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <NotificationContainer 
        notifications={notifications} 
        onRemove={removeNotification} 
      />
      
      {/* Modal de módulo liberado */}
      {showModalLiberacion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 border-2 border-orange-200 dark:border-orange-600">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <Lock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h3 className="text-xl font-bold text-orange-800 dark:text-white">
                    Módulo Liberado
                  </h3>
                </div>
                <button
                  onClick={() => setShowModalLiberacion(false)}
                  className="text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/50 p-2 rounded-full transition-all duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  Tu módulo ha sido liberado. Por favor, refresca la página para ver los cambios y seleccionar un nuevo módulo.
                </p>
              </div>
              
              <div className="flex gap-3 justify-end">
                <Button
                  onClick={() => window.location.reload()}
                  variant="primary"
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Refrescar Página
                </Button>
                <Button
                  onClick={() => setShowModalLiberacion(false)}
                  variant="secondary"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-red-600 dark:text-white mb-2">
            Seleccione su Módulo de Trabajo
          </h1>
          <p className="text-base text-gray-600 dark:text-white mb-1">
            Hola <span className="font-semibold text-red-600 dark:text-white">{user?.name || user?.username}</span>
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

        {/* Sección de Módulos Disponibles - Dropdown */}
        <div className="mb-8">
          <button
            onClick={() => setShowDisponibles(!showDisponibles)}
            className="w-full bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Unlock className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-left">
                <h2 className="text-xl font-bold text-green-800 dark:text-green-200">
                  Módulos Disponibles
                </h2>
                <p className="text-sm text-green-600 dark:text-green-400">
                  {modulesFromProps.length} {modulesFromProps.length === 1 ? 'módulo disponible' : 'módulos disponibles'}
                </p>
              </div>
            </div>
            {showDisponibles ? (
              <ChevronUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-green-600 dark:text-green-400" />
            )}
          </button>

          {showDisponibles && (
            <div className="mt-4 bg-white dark:bg-gray-800 border-2 border-green-200 dark:border-green-800 rounded-xl p-6 shadow-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {modulesFromProps.map((module) => (
                  <Card
                    key={module.id}
                    className={`cursor-pointer transition-all duration-200 ${
                      assigning === module.id 
                        ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-900/20' 
                        : 'bg-white dark:bg-gray-800 border-2 border-green-300 dark:border-green-700 hover:border-green-400 dark:hover:border-green-600 shadow-md hover:shadow-lg'
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <CardTitle className="text-lg font-bold text-gray-800 dark:text-white">
                          {module.name || `Módulo ${module.id}`}
                        </CardTitle>
                        <div className="px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                          <span className="text-xs font-semibold text-green-700 dark:text-green-300">
                            DISPONIBLE
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {module.description && (
                        <div className="mb-4">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Descripción:</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 min-h-[2.5rem]">
                            {module.description}
                          </p>
                        </div>
                      )}
                      <Button
                        onClick={() => handleModuleSelect(module.id)}
                        disabled={assigning !== null}
                        className="w-full py-2 text-sm font-medium rounded-lg transition-all bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md"
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
          )}
        </div>

        {/* Sección de Módulos Ocupados - Dropdown */}
        {modulosOcupadosData.length > 0 && (
          <div className="mt-8">
            <button
              onClick={() => setShowOcupados(!showOcupados)}
              className="w-full bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Lock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-bold text-orange-800 dark:text-orange-200">
                    Módulos Ocupados
                  </h2>
                  <p className="text-sm text-orange-600 dark:text-orange-400">
                    {modulosOcupadosData.length} {modulosOcupadosData.length === 1 ? 'módulo ocupado' : 'módulos ocupados'}
                  </p>
                </div>
              </div>
              {showOcupados ? (
                <ChevronUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              )}
            </button>

            {showOcupados && (
              <div className="mt-4 bg-white dark:bg-gray-800 border-2 border-orange-200 dark:border-orange-800 rounded-xl p-6 shadow-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {modulosOcupadosData.map((modulo) => (
                    <Card
                      key={modulo.moduleId}
                      className="bg-white dark:bg-gray-800 border-2 border-orange-300 dark:border-orange-700 hover:border-orange-400 dark:hover:border-orange-600 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between mb-2">
                          <CardTitle className="text-lg font-bold text-gray-800 dark:text-white">
                            Módulo {modulo.moduleId}
                          </CardTitle>
                          <div className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                            <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">
                              {modulo.status}
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3 mb-4">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Usuario:</p>
                            <p className="text-sm font-semibold text-gray-800 dark:text-white">
                              {modulo.userName}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Asignado:</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {formatearFecha(modulo.horaAsignacion)}
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleLiberarModulo(modulo.moduleId)}
                          disabled={liberatingModule === modulo.moduleId || liberatingModule !== null}
                          className="w-full py-2 text-sm font-medium rounded-lg transition-all bg-orange-500 hover:bg-orange-600 text-white shadow-sm hover:shadow-md"
                        >
                          {liberatingModule === modulo.moduleId ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Liberando...
                            </>
                          ) : (
                            <>
                              <Unlock className="h-4 w-4 mr-2" />
                              Liberar Módulo
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ModuleSelection

