import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../shared/components/ui/Card'
import { Button } from '../shared/components/ui/Button'
import { BaseLoader } from '../../shared/components/ui'
import { authService } from '../../../src/services/core/auth-service'
import { useAuthStore } from '../../../src/store/auth-store'
import { 
  ArrowLeft, 
  Phone, 
  User, 
  CheckCircle, 
  LogOut,
  X,
  Lock,
  CreditCard,
  Maximize,
  Minimize
} from 'lucide-react'
import { ticketService, moduleService, driverService } from './services'
import { getSedeActivaId } from '../shared/utils/sedeContext'

interface UserType {
  id: number
  username: string
  role: string
  name?: string
  email?: string
  active?: boolean
  moduleId?: number | null
}

const authHelpers = {
  isAuthenticated: (): boolean => {
    try {
      const authStorageData = localStorage.getItem('auth-storage')
      if (!authStorageData) return false
      
      const parsedData = JSON.parse(authStorageData)
      const token = parsedData?.state?.token || null
      return !!token
    } catch {
      return false
    }
  },
  
  getUser: (): UserType | null => {
    try {
      const authStorageData = localStorage.getItem('auth-storage')
      if (!authStorageData) return null
      
      const parsedData = JSON.parse(authStorageData)
      const user = parsedData?.state?.user || null
      
      if (!user) return null
      
      if (!user.id || !user.username || !user.role) {
        return null
      }
      
      return user
    } catch {
      return null
    }
  },

  navigateToLogin: (): void => {
    window.location.href = '/login'
  }
}

const ErrorMessage = ({ message }: { message: string }) => (
  <div className="flex items-center justify-center text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 p-4 rounded-lg border-2 border-red-200 dark:border-red-800">
    <div className="w-5 h-5 mr-2">⚠️</div>
    <span className="font-medium">{message}</span>
  </div>
)

const DriverInfo = ({ driverName }: { driverName: string }) => (
  <div className="max-w-md mx-auto">
    <div className="flex items-center justify-center bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
          <User className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-green-800 dark:text-green-200">
            Conductor encontrado
          </p>
          <p className="text-lg font-semibold text-green-900 dark:text-green-100">
            {driverName}
          </p>
        </div>
      </div>
    </div>
  </div>
)

const AuthStatus = () => (
  <div className="max-w-md mx-auto">
    <div className="flex items-center justify-center bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
          <Lock className="w-5 h-5 text-red-600 dark:text-red-400" />
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            No autenticado
          </p>
          <p className="text-lg font-semibold text-red-900 dark:text-red-100">
            Debe iniciar sesión para crear tickets
          </p>
        </div>
      </div>
    </div>
  </div>
)

const useTabletInterface = () => {
  const [currentUser, setCurrentUser] = useState<UserType | null>(null)
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [optionsLoaded, setOptionsLoaded] = useState(false)

  useEffect(() => {
    if (authHelpers.isAuthenticated()) {
      const user = authHelpers.getUser()
      if (user) {
        setCurrentUser(user)
        setError('')
      } else {
        setError('Error al obtener información del usuario')
      }
    } else {
      setError('Debe iniciar sesión para usar la tablet')
    }
  }, [])

  return {
    currentUser,
    error,
    loading,
    setLoading,
    optionsLoaded,
    setOptionsLoaded,
    setError
  }
}

export default function TabletInterface() {
  const { logout } = useAuthStore()
  const { currentUser, error, loading, setLoading, optionsLoaded, setOptionsLoaded, setError } = useTabletInterface()

  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [selectedSubOption, setSelectedSubOption] = useState<number | null>(null)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [showDriverModal, setShowDriverModal] = useState(false)
  const [showTicketCreatedModal, setShowTicketCreatedModal] = useState(false)
  const [currentStep, setCurrentStep] = useState<'options' | 'subOptions' | 'phone' | 'driver' | 'rating'>('options')
  const [isFullscreen, setIsFullscreen] = useState(false)

  const [driverData, setDriverData] = useState({
    firstName: '',
    lastName: '',
    phone: ''
  })
  const [tipoDocumento, setTipoDocumento] = useState<'dni' | 'carnet' | null>(null)
  
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null)

  const [options, setOptions] = useState<any[]>([])
  const [subOptions, setSubOptions] = useState<any[]>([])

  const cargarOpciones = useCallback(async () => {
    if (optionsLoaded) return
    
    try {
      setLoading(true)
      const opciones = await moduleService.getAllOptions()
      setOptions(opciones)
      setOptionsLoaded(true)
    } catch (error) {
      console.error('[TabletInterface] Error cargando opciones:', error)
      setError('Error al cargar las opciones')
    } finally {
      setLoading(false)
    }
  }, [optionsLoaded, setError])

  useEffect(() => {
    cargarOpciones()
  }, [cargarOpciones])

  const seleccionarOpcion = useCallback(async (optionId: number) => {
    if (loading) return
    
    try {
      setLoading(true)
      const subOpciones = await moduleService.getSubOptions(optionId)
      setSubOptions(subOpciones)
      setSelectedOption(optionId)
      setCurrentStep('subOptions')
    } catch (error) {
      console.error('[TabletInterface] Error cargando sub-opciones:', error)
      setError('Error al cargar las sub-opciones')
    } finally {
      setLoading(false)
    }
  }, [loading, setError])

  const seleccionarSubOpcion = useCallback(async (subOptionId: number) => {
    if (loading) return
    
    setSelectedSubOption(subOptionId)
    setCurrentStep('phone')
  }, [loading])

  const validarNumeroTicket = useCallback((numero: string) => {
    return numero.length === 9 && /^9\d{8}$/.test(numero)
  }, [])

  const validarDNI = useCallback((dni: string) => {
    const dniRegex = /^\d{8}$/
    return dniRegex.test(dni)
  }, [])

  const crearTicket = useCallback(async () => {
    if (loading) return
    
    if (!validarNumeroTicket(phoneNumber)) {
      if (phoneNumber.length === 0) {
        setError('Debe ingresar un número de teléfono')
      } else if (!phoneNumber.startsWith('9')) {
        setError('El número debe empezar con 9')
      } else if (phoneNumber.length < 9) {
        setError(`El número debe tener 9 dígitos (actualmente tiene ${phoneNumber.length})`)
      } else if (phoneNumber.length > 9) {
        setError(`El número debe tener exactamente 9 dígitos (actualmente tiene ${phoneNumber.length})`)
      } else {
        setError('El número debe contener solo dígitos y empezar con 9')
      }
      return
    }

    try {
      setLoading(true)

      const conductorExistente = await driverService.searchDriverByPhone(phoneNumber)

      if (conductorExistente) {
        const sedeIdActiva = getSedeActivaId()
        const ticketData = {
          optionId: selectedSubOption!,
          licenseNumber: phoneNumber,
          ...(sedeIdActiva !== undefined ? { sedeId: sedeIdActiva } : {}),
        }

        await ticketService.createTicketPublic(ticketData)

        setDriverData({
          firstName: conductorExistente.full_name.split(' ')[0] || '',
          lastName: conductorExistente.full_name.split(' ').slice(1).join(' ') || '',
          phone: phoneNumber
        })

        setShowTicketCreatedModal(true)

        let countdown = 5
        const countdownElement = document.getElementById('countdown')
        const progressBar = document.getElementById('progress-bar')
        
        const timer = setInterval(() => {
          countdown--
          if (countdownElement) countdownElement.textContent = countdown.toString()
          if (progressBar) progressBar.style.width = `${(countdown / 5) * 100}%`
          
          if (countdown <= 0) {
            clearInterval(timer)
            setShowTicketCreatedModal(false)
            resetearFormulario()
          }
        }, 1000)
      } else {
        setCurrentStep('driver')
        setShowDriverModal(true)
      }
    } catch (error) {
      console.error('[TabletInterface] Error creando ticket:', error)
      setError('Error al crear el ticket')
    } finally {
      setLoading(false)
    }
  }, [loading, phoneNumber, selectedSubOption, validarNumeroTicket, setError])


  const resetearFormulario = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = null
    }
    
    setSelectedOption(null)
    setSelectedSubOption(null)
    setPhoneNumber('')
    setCurrentStep('options')
    setShowDriverModal(false)
    setShowTicketCreatedModal(false)
    setTipoDocumento(null)
    setDriverData({ firstName: '', lastName: '', phone: '' })
    setError('')
  }, [setError])

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current)
        countdownTimerRef.current = null
      }
    }
  }, [])


  const guardarConductor = useCallback(async () => {
    if (loading) return
    
    try {
      setLoading(true)

      if (tipoDocumento === 'dni') {
        if (!validarDNI(driverData.phone)) {
          setError('El DNI debe tener 8 dígitos')
          return
        }
        await driverService.createDriverByDni({
          dni: driverData.phone,
          phone: phoneNumber
        })
      } else if (tipoDocumento === 'carnet') {
        await driverService.createDriverManual({
          firstName: driverData.firstName,
          lastName: driverData.lastName,
          phone: phoneNumber
        })
      }

      try {
        const sedeIdActiva = getSedeActivaId()
        const ticketData = {
          optionId: selectedSubOption!,
          licenseNumber: phoneNumber,
          ...(sedeIdActiva !== undefined ? { sedeId: sedeIdActiva } : {}),
        }

        await ticketService.createTicketPublic(ticketData)

        setShowDriverModal(false)
        setShowTicketCreatedModal(true)

        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current)
        }

        let countdown = 5
        const countdownElement = document.getElementById('countdown')
        const progressBar = document.getElementById('progress-bar')
        
        countdownTimerRef.current = setInterval(() => {
          countdown--
          if (countdownElement) countdownElement.textContent = countdown.toString()
          if (progressBar) progressBar.style.width = `${(countdown / 5) * 100}%`
          
          if (countdown <= 0) {
            if (countdownTimerRef.current) {
              clearInterval(countdownTimerRef.current)
              countdownTimerRef.current = null
            }
            setShowTicketCreatedModal(false)
            resetearFormulario()
          }
        }, 1000)
        
      } catch (ticketError) {
        console.error('[TabletInterface] Error creando ticket:', ticketError)
        setError('Conductor guardado pero error al crear el ticket')
        setShowDriverModal(false)
      }
    } catch (error) {
      console.error('[TabletInterface] Error guardando conductor:', error)
      setError('Error al guardar el conductor')
    } finally {
      setLoading(false)
    }
  }, [loading, driverData, phoneNumber, tipoDocumento, setError])


  const handleCerrarSesion = useCallback(async () => {
    try {
      logout()

      try {
        await authService.logout()
      } catch {
        // continuar con cierre local
      }

      window.location.href = '/login'
    } catch (error) {
      console.error('[TabletInterface] Error en logout:', error)
      logout()
      window.location.href = '/login'
    }
  }, [logout])

  const retroceder = useCallback(() => {
    switch (currentStep) {
      case 'subOptions':
        setCurrentStep('options')
        setSelectedOption(null)
        setSubOptions([])
        break
      case 'phone':
        setCurrentStep('subOptions')
        setPhoneNumber('')
        break
      case 'driver':
        setCurrentStep('phone')
        setShowDriverModal(false)
        break
      case 'rating':
        setCurrentStep('driver')
        break
      default:
        break
    }
    setError('')
  }, [currentStep, setError])

  const cerrarModalAgregarConductor = useCallback(() => {
    setShowDriverModal(false)
    setCurrentStep('phone')
  }, [])

  const renderPaso1 = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-3">
          Seleccione su motivo de visita
        </h2>
        <p className="text-xl text-slate-600 dark:text-white mb-6">
          Elija la opción que mejor describa su necesidad
        </p>
      </div>

      {loading ? (
        <BaseLoader message="Cargando opciones..." />
      ) : (
        <div className="grid grid-cols-2 gap-5">
          {options.map((option) => (
            <Button
              key={option.id}
              variant="ghost"
              size="lg"
              onClick={() => seleccionarOpcion(option.id)}
              className="min-h-24 font-semibold text-center leading-tight"
              disabled={loading}
            >
              {option.name}
            </Button>
          ))}
        </div>
      )}
    </div>
  )

  const renderPaso2 = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-3">
          {selectedOption ? options.find((opt: any) => opt.id === selectedOption)?.name : ''}
        </h2>
        <p className="text-xl text-slate-600 dark:text-white mb-6">
          Seleccione una opción específica
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {subOptions.map((option: any) => (
          <Button
            key={option.id}
            variant="ghost"
            size="lg"
            onClick={() => seleccionarSubOpcion(option.id)}
            className="min-h-32 font-bold text-center"
          >
            {option.name}
          </Button>
        ))}
      </div>
      
      <div className="flex justify-center pt-4">
        <Button
          onClick={retroceder}
          variant="secondary"
          className="bg-slate-600 hover:bg-slate-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Categorías
        </Button>
      </div>
    </div>
  )

  const renderPaso3 = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-3">
          Ingrese su número de telefono
        </h2>
        <p className="text-xl text-slate-600 dark:text-white mb-6">
          Debe empezar con 9 y tener exactamente 9 dígitos
        </p>
      </div>

      <div className="max-w-md mx-auto">
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => {
            const value = e.target.value
            if (value === '') {
              setPhoneNumber(value)
            } else if (/^\d+$/.test(value) && value.startsWith('9')) {
              setPhoneNumber(value)
            }
          }}
          maxLength={9}
          placeholder="Ej: 987654321"
          disabled={loading}
          className="w-full p-5 text-2xl !border-2 !border-red-500 dark:!border-red-500 rounded-lg focus:!ring-2 focus:!ring-red-400 focus:!border-red-500 dark:focus:!border-red-500 focus:outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-400 shadow-md"
        />
      </div>

      {!currentUser ? (
        <AuthStatus />
      ) : driverData.firstName.trim() ? (
        <DriverInfo driverName={`${driverData.firstName} ${driverData.lastName}`} />
      ) : null}

      {error && <ErrorMessage message={error} />}

      <div className="flex justify-center space-x-4">
        <Button
          variant="secondary"
          onClick={retroceder}
          disabled={loading}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Atrás
        </Button>
        <Button
          onClick={crearTicket}
          loading={loading}
          disabled={!validarNumeroTicket(phoneNumber) || !currentUser}
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Creando ticket...
            </>
          ) : (
            <>
              <Phone className="w-4 h-4 mr-2" />
              Crear Ticket
            </>
          )}
        </Button>
      </div>
    </div>
  )


  const enterFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {})
    }
  }

  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {})
    }
  }

  const toggleFullscreen = () => {
    if (isFullscreen) {
      exitFullscreen()
    } else {
      enterFullscreen()
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)

    setIsFullscreen(!!document.fullscreenElement)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  return (
    <>
      <div className="min-h-screen w-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4 z-50 flex space-x-2">
        <button
          onClick={toggleFullscreen}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
          title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
        >
          {isFullscreen ? (
            <Minimize className="w-6 h-6" />
          ) : (
            <Maximize className="w-6 h-6" />
          )}
        </button>

        {!isFullscreen && (
          <button
            onClick={handleCerrarSesion}
            className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
            title="Cerrar sesión"
          >
            <LogOut className="w-6 h-6" />
          </button>
        )}
      </div>

      <Card className="w-full max-w-7xl">
        <CardHeader className="text-center pb-8">
          <CardTitle className="text-[30px] font-bold text-slate-900 dark:text-white">
            Sistema de Ticketera
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentStep === 'options' && renderPaso1()}
          {currentStep === 'subOptions' && renderPaso2()}
          {currentStep === 'phone' && renderPaso3()}
          {currentStep === 'driver' && (
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                  Ingrese los datos del conductor
                </h2>
                <p className="text-slate-600 dark:text-white mb-2">
                  Por favor, ingrese el nombre del conductor.
                </p>
              </div>
              <div className="max-w-md mx-auto">
                <input
                  type="text"
                  value={`${driverData.firstName} ${driverData.lastName}`}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDriverData({ ...driverData, firstName: e.target.value })}
                  placeholder="Nombre del Conductor"
                  className="w-full p-3 !border-2 !border-red-500 dark:!border-red-500 rounded-lg 
                           bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                           focus:outline-none focus:!ring-2 focus:!ring-red-400 focus:!border-red-500 dark:focus:!border-red-500"
                  disabled={loading}
                />
              </div>
              <div className="flex justify-center space-x-4">
                <Button
                  variant="secondary"
                  onClick={retroceder}
                  disabled={loading}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Atrás
                </Button>
                <Button
                  onClick={guardarConductor}
                  loading={loading}
                  disabled={!driverData.firstName.trim() || loading}
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Guardando...
                    </div>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Guardar Conductor
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {showDriverModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-red-500" />
                Agregar Conductor
              </h3>
              <button
                onClick={cerrarModalAgregarConductor}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                disabled={loading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-slate-600 dark:text-white mb-4">
                El número <strong className="dark:text-white">{phoneNumber}</strong> no está registrado. 
                Seleccione el tipo de documento:
              </p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={() => setTipoDocumento('dni')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    tipoDocumento === 'dni'
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:border-red-300'
                  }`}
                  disabled={loading}
                >
                  <div className="text-center">
                    <div className="text-lg font-semibold">DNI</div>
                    <div className="text-xs">Documento Nacional de Identidad</div>
                  </div>
                </button>
                
                <button
                  onClick={() => setTipoDocumento('carnet')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    tipoDocumento === 'carnet'
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:border-red-300'
                  }`}
                  disabled={loading}
                >
                  <div className="text-center">
                    <div className="text-lg font-semibold">Carnet de Extranjería</div>
                    <div className="text-xs">Documento de extranjero</div>
                  </div>
                </button>
              </div>

              {tipoDocumento === 'dni' && (
                <div className="space-y-3">
                  <div className="text-center p-4 bg-red-50 dark:bg-red-900/30 rounded-lg mb-4 border border-red-200 dark:border-red-800">
                    <p className="text-red-700 dark:text-red-300 mb-2 font-medium">
                      Ingrese el DNI del conductor (8 dígitos)
                    </p>
                  </div>
                  
                  <input
                    type="text"
                    value={driverData.phone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const value = e.target.value
                      if (value === '' || (/^\d+$/.test(value) && value.length <= 8)) {
                        setDriverData({ ...driverData, phone: value })
                      }
                    }}
                    placeholder="Ej: 12345678"
                    className="w-full p-3 !border-2 !border-red-500 dark:!border-red-500 rounded-lg 
                             bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                             focus:outline-none focus:!ring-2 focus:!ring-red-400 focus:!border-red-500 dark:focus:!border-red-500"
                    disabled={loading}
                    maxLength={8}
                    autoFocus
                  />
                </div>
              )}
              
              {tipoDocumento === 'carnet' && (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={driverData.firstName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDriverData({ ...driverData, firstName: e.target.value })}
                    placeholder="Nombre del Conductor"
                    className="w-full p-3 !border-2 !border-red-500 dark:!border-red-500 rounded-lg 
                             bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                             focus:outline-none focus:!ring-2 focus:!ring-red-400 focus:!border-red-500 dark:focus:!border-red-500"
                    disabled={loading}
                    maxLength={50}
                    autoFocus
                  />
                  
                  <input
                    type="text"
                    value={driverData.lastName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDriverData({ ...driverData, lastName: e.target.value })}
                    placeholder="Apellido del Conductor"
                    className="w-full p-3 !border-2 !border-red-500 dark:!border-red-500 rounded-lg 
                             bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                             focus:outline-none focus:!ring-2 focus:!ring-red-400 focus:!border-red-500 dark:focus:!border-red-500"
                    disabled={loading}
                    maxLength={50}
                  />
                </div>
              )}
            </div>
            
            <div className="flex space-x-3">
              <Button
                variant="secondary"
                onClick={cerrarModalAgregarConductor}
                className="flex-1"
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                onClick={guardarConductor}
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={loading || !tipoDocumento || 
                  (tipoDocumento === 'dni' && (!driverData.phone || !validarDNI(driverData.phone))) ||
                  (tipoDocumento === 'carnet' && (!driverData.firstName.trim() || !driverData.lastName.trim()))
                }
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Guardando...
                  </div>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Guardar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showTicketCreatedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                ¡Ticket Creado!
              </h3>
              
              <p className="text-slate-600 dark:text-white mb-4">
                Su ticket ha sido registrado exitosamente.
              </p>

              {driverData.firstName.trim() && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center justify-center space-x-2">
                    <User className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                      Conductor: <span className="font-semibold">{driverData.firstName} {driverData.lastName}</span>
                    </span>
                  </div>
                </div>
              )}
              
              <p className="text-slate-600 dark:text-white mb-6">
                <span className="text-sm text-slate-500 dark:text-white">
                  Será redirigido al inicio en <span className="font-bold text-red-600 dark:text-red-400" id="countdown">5</span> segundos...
                </span>
              </p>
              
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mb-4">
                <div 
                  className="bg-red-600 h-2 rounded-full transition-all duration-100 ease-linear"
                  style={{ width: '100%' }}
                  id="progress-bar"
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}