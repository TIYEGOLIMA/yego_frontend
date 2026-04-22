import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../shared/components/ui/Card'
import { Button } from '../shared/components/ui/Button'
import { BaseLoader } from '../../shared/components/ui'
import {
  ArrowLeft,
  Phone,
  User,
  CheckCircle,
  LogOut,
  X,
  CreditCard,
  Maximize,
  Minimize
} from 'lucide-react'
import { ticketService, moduleService, driverService } from './services'
import {
  getDispositivoSession,
  clearDispositivoSession,
  type DispositivoSession,
} from '../../../src/services/core/device-auth-service'

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

const useTabletInterface = () => {
  const [dispositivo, setDispositivo] = useState<DispositivoSession | null>(null)
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [optionsLoaded, setOptionsLoaded] = useState(false)

  useEffect(() => {
    setDispositivo(getDispositivoSession())
  }, [])

  return {
    dispositivo,
    error,
    loading,
    setLoading,
    optionsLoaded,
    setOptionsLoaded,
    setError
  }
}

export default function TabletInterface() {
  const { dispositivo, error, loading, setLoading, optionsLoaded, setOptionsLoaded, setError } = useTabletInterface()

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
        const sedeIdActiva = dispositivo?.sedeId
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
        const sedeIdActiva = dispositivo?.sedeId
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


  const handleCerrarSesion = useCallback(() => {
    clearDispositivoSession()
    window.location.href = '/login'
  }, [])

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
    <div className="flex min-h-0 flex-1 flex-col gap-3 sm:gap-4">
      <div className="shrink-0 text-center">
        <h2 className="text-2xl font-bold leading-tight text-slate-900 sm:text-3xl dark:text-white">
          Seleccione su motivo de visita
        </h2>
        <p className="mt-1 text-sm text-slate-600 sm:text-base dark:text-slate-300">
          Elija la opción que mejor describa su necesidad
        </p>
      </div>

      {loading ? (
        <div className="flex min-h-0 flex-1 items-center justify-center py-6">
          <BaseLoader message="Cargando opciones..." />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] pr-0.5">
          <div className="grid min-h-full auto-rows-fr grid-cols-2 gap-2 sm:gap-3">
            {options.map((option) => (
              <Button
                key={option.id}
                variant="ghost"
                size="lg"
                onClick={() => seleccionarOpcion(option.id)}
                className="h-full min-h-[4.25rem] px-3 py-2 text-center text-sm font-semibold leading-snug sm:min-h-[4.75rem] sm:text-base"
                disabled={loading}
              >
                <span className="line-clamp-4">{option.name}</span>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const renderPaso2 = () => (
    <div className="flex min-h-0 flex-1 flex-col gap-3 sm:gap-4">
      <div className="shrink-0 text-center">
        <h2 className="text-2xl font-bold leading-tight text-slate-900 sm:text-3xl dark:text-white">
          {selectedOption ? options.find((opt: any) => opt.id === selectedOption)?.name : ''}
        </h2>
        <p className="mt-1 text-sm text-slate-600 sm:text-base dark:text-slate-300">
          Seleccione una opción específica
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] pr-0.5">
        <div className="grid min-h-full auto-rows-fr grid-cols-2 gap-2 sm:gap-3">
          {subOptions.map((option: any) => (
            <Button
              key={option.id}
              variant="ghost"
              size="lg"
              onClick={() => seleccionarSubOpcion(option.id)}
              className="h-full min-h-[4.25rem] px-3 py-2 text-center text-sm font-bold leading-snug sm:min-h-[4.75rem] sm:text-base"
            >
              <span className="line-clamp-4">{option.name}</span>
            </Button>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 justify-center pt-1">
        <Button
          onClick={retroceder}
          variant="secondary"
          size="md"
          className="bg-slate-600 text-white shadow-md transition-all duration-200 hover:bg-slate-700 hover:shadow-lg"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Categorías
        </Button>
      </div>
    </div>
  )

  const renderPaso3 = () => (
    <div className="flex min-h-0 flex-1 flex-col justify-between gap-3 sm:gap-4">
      <div className="shrink-0 text-center">
        <h2 className="text-2xl font-bold leading-tight text-slate-900 sm:text-3xl dark:text-white">
          Ingrese su número de teléfono
        </h2>
        <p className="mt-1 text-sm text-slate-600 sm:text-base dark:text-slate-300">
          Debe empezar con 9 y tener exactamente 9 dígitos
        </p>
      </div>

      <div className="mx-auto w-full max-w-md shrink-0 px-1">
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
          className="w-full rounded-lg border-2 border-red-500 bg-white p-4 text-2xl text-slate-900 shadow-md placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-400 dark:border-red-500 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-red-500 sm:p-5 sm:text-3xl"
        />
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
        {driverData.firstName.trim() ? (
          <DriverInfo driverName={`${driverData.firstName} ${driverData.lastName}`} />
        ) : null}
        {error ? <ErrorMessage message={error} /> : null}
      </div>

      <div className="flex shrink-0 flex-wrap justify-center gap-3">
        <Button variant="secondary" onClick={retroceder} disabled={loading}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Atrás
        </Button>
        <Button
          onClick={crearTicket}
          loading={loading}
          disabled={!validarNumeroTicket(phoneNumber)}
        >
          {loading ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              Creando ticket...
            </>
          ) : (
            <>
              <Phone className="mr-2 h-4 w-4" />
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
      <div
        className="fixed inset-0 z-0 flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 pt-[max(0.75rem,env(safe-area-inset-top))] pr-[max(0.75rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] dark:from-slate-900 dark:to-slate-800"
        role="presentation"
      >
        <div className="absolute right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.75rem,env(safe-area-inset-top))] z-50 flex gap-2">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="rounded-full bg-blue-600 p-3 text-white shadow-lg transition-all duration-200 hover:bg-blue-700 hover:shadow-xl"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
          </button>

          {!isFullscreen && (
            <button
              type="button"
              onClick={handleCerrarSesion}
              className="rounded-full bg-red-600 p-3 text-white shadow-lg transition-all duration-200 hover:bg-red-700 hover:shadow-xl"
              title="Cerrar sesión"
            >
              <LogOut className="h-6 w-6" />
            </button>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col pt-14 sm:pt-16">
          <Card className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col overflow-hidden border border-slate-200/80 shadow-xl dark:border-slate-700/80">
            <CardHeader className="shrink-0 border-b border-slate-100 px-4 py-3 text-center dark:border-slate-700/80 sm:px-5 sm:py-4">
              <CardTitle className="text-xl font-bold text-slate-900 sm:text-2xl dark:text-white">
                Sistema de Ticketera
                {dispositivo?.sedeNombre && (
                  <span className="mt-0.5 block text-xs font-medium text-slate-500 sm:text-sm dark:text-slate-300">
                    Sede: {dispositivo.sedeNombre}
                    {dispositivo.nombre ? ` · ${dispositivo.nombre}` : ''}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 sm:p-4 md:p-5">
              {currentStep === 'options' && renderPaso1()}
              {currentStep === 'subOptions' && renderPaso2()}
              {currentStep === 'phone' && renderPaso3()}
              {currentStep === 'driver' && (
                <div className="flex min-h-0 flex-1 flex-col justify-between gap-3 sm:gap-4">
                  <div className="shrink-0 text-center">
                    <h2 className="text-2xl font-bold leading-tight text-slate-900 sm:text-3xl dark:text-white">
                      Ingrese los datos del conductor
                    </h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      Por favor, ingrese el nombre del conductor.
                    </p>
                  </div>
                  <div className="mx-auto w-full max-w-md shrink-0 px-1">
                    <input
                      type="text"
                      value={`${driverData.firstName} ${driverData.lastName}`}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setDriverData({ ...driverData, firstName: e.target.value })
                      }
                      placeholder="Nombre del Conductor"
                      className="w-full rounded-lg border-2 border-red-500 bg-white p-3 text-slate-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-400 dark:bg-slate-700 dark:text-white dark:focus:border-red-500"
                      disabled={loading}
                    />
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-center gap-3 pt-1">
                    <Button variant="secondary" onClick={retroceder} disabled={loading}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Atrás
                    </Button>
                    <Button
                      onClick={guardarConductor}
                      loading={loading}
                      disabled={!driverData.firstName.trim() || loading}
                    >
                      {loading ? (
                        <div className="flex items-center">
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                          Guardando...
                        </div>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
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
      </div>

      {showDriverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="max-h-[min(90dvh,calc(100dvh-2rem))] w-full max-w-md overflow-y-auto overscroll-y-contain rounded-xl bg-white p-5 shadow-2xl dark:bg-slate-800 sm:p-6">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="max-h-[min(90dvh,calc(100dvh-2rem))] w-full max-w-sm overflow-y-auto overscroll-y-contain rounded-xl bg-white p-5 shadow-2xl dark:bg-slate-800 sm:p-6">
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