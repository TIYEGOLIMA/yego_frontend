import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { ThemeToggle } from '../shared/components/ThemeToggle'
import { LogIn, User, Lock, Eye, EyeOff, AlertCircle, Shield, Zap, BarChart3, Tablet, KeyRound } from 'lucide-react'
import { useAuthStore } from '../store/auth-store'
import {
  autenticarDispositivo,
  getDispositivoSession,
  getRutaPorTipo,
} from '../services/core/device-auth-service'

type LoginMode = 'user' | 'device'

export default function Login() {
  const [mode, setMode] = useState<LoginMode>('user')
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)

  const [deviceToken, setDeviceToken] = useState('')
  const [showDeviceToken, setShowDeviceToken] = useState(false)
  const [deviceLoading, setDeviceLoading] = useState(false)
  const [deviceError, setDeviceError] = useState<string | null>(null)

  const navigate = useNavigate()
  const { login, loading, error, clearError, token, user, modules } = useAuthStore()

  useEffect(() => {
    if (token && user) {
      import('../utils/role-based-routing').then(({ getRedirectPathForRole }) => {
        const redirectPath = getRedirectPathForRole(user.role, modules || []);
        navigate(redirectPath);
      });
      return
    }
    const dispositivo = getDispositivoSession()
    if (dispositivo) {
      navigate(getRutaPorTipo(dispositivo.tipo))
    }
  }, [token, user, modules, navigate])

  useEffect(() => {
    if (error) {
      clearError()
    }
  }, [credentials.username, credentials.password])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await login(credentials.username, credentials.password)
      const { getRedirectPathForRole } = await import('../utils/role-based-routing')
      const { modules: modulesAfterLogin } = useAuthStore.getState()
      const redirectPath = getRedirectPathForRole(
        response.user!.role,
        modulesAfterLogin?.length ? modulesAfterLogin : modules || [],
      )
      navigate(redirectPath)
    } catch {
      // manejado en el store
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setCredentials((prev) => ({ ...prev, [field]: value }))
  }

  const handleDeviceSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setDeviceError(null)
    setDeviceLoading(true)
    try {
      const session = await autenticarDispositivo(deviceToken)
      navigate(getRutaPorTipo(session.tipo))
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Token de acceso inválido'
      setDeviceError(msg)
    } finally {
      setDeviceLoading(false)
    }
  }

  const switchMode = (next: LoginMode) => {
    setMode(next)
    setDeviceError(null)
    if (error) clearError()
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 flex">
      <div className="fixed top-4 right-4 z-50 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute bottom-1/4 right-1/4 w-40 h-40 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-80 lg:h-80 bg-gradient-to-br from-blue-500/20 to-indigo-600/10 dark:from-blue-400/30 dark:to-indigo-500/20 rounded-full blur-2xl sm:blur-3xl animate-pulse-slow animate-float-delayed" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-10 right-10 sm:top-20 sm:right-20 w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 bg-gradient-to-br from-primary-500/10 to-transparent dark:from-primary-400/20 rounded-xl sm:rounded-2xl rotate-12 animate-pulse-slow backdrop-blur-sm animate-float"></div>
        <div className="absolute bottom-10 left-10 sm:bottom-20 sm:left-20 w-12 h-12 sm:w-16 sm:h-16 md:w-24 md:h-24 bg-gradient-to-br from-blue-500/10 to-transparent dark:from-blue-400/20 rounded-lg sm:rounded-xl -rotate-12 animate-pulse-slow animate-float-delayed" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary-500/60 rounded-full animate-sparkle"></div>
        <div className="absolute bottom-1/3 left-1/4 w-2 h-2 sm:w-3 sm:h-3 bg-blue-500/60 rounded-full animate-sparkle-delayed"></div>
        <div className="absolute top-1/2 right-1/3 w-1 h-1 sm:w-1.5 sm:h-1.5 bg-purple-500/60 rounded-full animate-sparkle" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 bg-indigo-500/60 rounded-full animate-sparkle-delayed" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute top-1/3 left-0 w-16 h-px sm:w-24 md:w-32 bg-gradient-to-r from-transparent via-primary-500/30 to-transparent"></div>
        <div className="absolute bottom-1/3 right-0 w-16 h-px sm:w-24 md:w-32 bg-gradient-to-l from-transparent via-blue-500/30 to-transparent"></div>
        <div className="absolute top-1/2 left-0 w-12 h-px sm:w-16 md:w-24 bg-gradient-to-r from-transparent via-purple-500/20 to-transparent"></div>
        <div className="absolute bottom-1/4 right-0 w-10 h-px sm:w-14 md:w-20 bg-gradient-to-l from-transparent via-indigo-500/20 to-transparent"></div>
      </div>

      <div className="flex-1 flex items-center justify-center relative z-10">
        <div className="w-full max-w-7xl flex flex-col lg:flex-row items-center p-4 sm:p-6">
          <div className="hidden lg:block lg:w-1/2 p-8">
            <div className="max-w-lg">
              <div className="flex items-center space-x-4 mb-8">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-3xl flex items-center justify-center shadow-2xl shadow-primary-500/30 backdrop-blur-sm border border-white/20 dark:border-white/10">
                    <span className="text-white font-black text-3xl">Y</span>
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-success-500 rounded-full border-3 border-white dark:border-neutral-900 animate-pulse shadow-lg"></div>
                </div>
                <div>
                  <h1 className="text-5xl font-black text-neutral-900 dark:text-white bg-gradient-to-r from-neutral-900 to-neutral-700 dark:from-white dark:to-neutral-300 bg-clip-text">
                    YEGO
                  </h1>
                  <p className="text-xl font-medium text-neutral-600 dark:text-neutral-400">
                    Sistema Integral
                  </p>
                </div>
              </div>

              <div className="space-y-6 mb-12">
                <h2 className="text-4xl font-bold text-neutral-900 dark:text-white leading-tight">
                  Gestión empresarial
                  <span className="text-transparent bg-gradient-to-r from-primary-500 to-primary-700 bg-clip-text"> inteligente</span>
                </h2>
                <p className="text-xl text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Plataforma integral para la gestión de conductores, entregas y operaciones empresariales con tecnología de vanguardia.
                </p>
              </div>

              <div className="space-y-6">
                <div className="group relative glassmorphism-glow">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-500/5 to-primary-600/5 dark:from-primary-400/10 dark:to-primary-500/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                  <div className="relative flex items-center space-x-4 p-5 glassmorphism rounded-2xl glassmorphism-hover" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.08)' }}>
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-500/20 to-primary-600/20 dark:from-primary-400/30 dark:to-primary-500/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform backdrop-blur-sm border border-primary-500/20">
                      <Shield className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-900 dark:text-white text-lg">Seguridad Avanzada</h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">Autenticación robusta y protección de datos</p>
                    </div>
                  </div>
                </div>
                
                <div className="group relative glassmorphism-glow">
                  <div className="absolute inset-0 bg-gradient-to-r from-success-500/5 to-success-600/5 dark:from-success-400/10 dark:to-success-500/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                  <div className="relative flex items-center space-x-4 p-5 glassmorphism rounded-2xl glassmorphism-hover" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.08)' }}>
                    <div className="w-16 h-16 bg-gradient-to-br from-success-500/20 to-success-600/20 dark:from-success-400/30 dark:to-success-500/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform backdrop-blur-sm border border-success-500/20">
                      <Zap className="w-8 h-8 text-success-600 dark:text-success-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-900 dark:text-white text-lg">Alto Rendimiento</h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">Optimizado para operaciones empresariales</p>
                    </div>
                  </div>
                </div>
                
                <div className="group relative glassmorphism-glow">
                  <div className="absolute inset-0 bg-gradient-to-r from-warning-500/5 to-warning-600/5 dark:from-warning-400/10 dark:to-warning-500/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                  <div className="relative flex items-center space-x-4 p-5 glassmorphism rounded-2xl glassmorphism-hover" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.08)' }}>
                    <div className="w-16 h-16 bg-gradient-to-br from-warning-500/20 to-warning-600/20 dark:from-warning-400/30 dark:to-warning-500/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform backdrop-blur-sm border border-warning-500/20">
                      <BarChart3 className="w-8 h-8 text-warning-600 dark:text-warning-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-900 dark:text-white text-lg">Analytics Avanzado</h3>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">Reportes y métricas en tiempo real</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="w-full lg:w-1/2 p-3 sm:p-6 flex items-center justify-center">
            <div className="w-full max-w-sm sm:max-w-md">
              <div className="relative glassmorphism-glow">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/10 dark:from-neutral-900/20 dark:to-neutral-800/10 rounded-2xl sm:rounded-3xl blur-xl sm:blur-2xl"></div>
                <Card className="relative border-0 glassmorphism-strong shadow-xl sm:shadow-2xl dark:shadow-dark-xl dark:sm:shadow-dark-2xl rounded-2xl sm:rounded-3xl">
                  <CardHeader className="text-center pb-6 sm:pb-8 px-4 sm:px-8">
                    <div className="lg:hidden flex justify-center mb-4 sm:mb-6">
                      <div className="relative">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-xl sm:shadow-2xl shadow-primary-500/30 backdrop-blur-sm border border-white/20 dark:border-white/10">
                          <span className="text-white font-black text-2xl sm:text-3xl">Y</span>
                        </div>
                        <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-4 h-4 sm:w-6 sm:h-6 bg-success-500 rounded-full border-2 sm:border-3 border-white dark:border-neutral-900 animate-pulse shadow-md sm:shadow-lg"></div>
                      </div>
                    </div>
                    
                    <CardTitle className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white mb-2 sm:mb-3 bg-gradient-to-r from-neutral-900 to-neutral-700 dark:from-white dark:to-neutral-300 bg-clip-text">
                      Iniciar Sesión
                    </CardTitle>
                    <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400">
                      {mode === 'user'
                        ? 'Accede a tu cuenta empresarial'
                        : 'Vincula este dispositivo a una sede'}
                    </p>
                  </CardHeader>

                  <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-8 pb-6 sm:pb-8">
                    <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-neutral-100/70 dark:bg-neutral-800/60 backdrop-blur-sm">
                      <button
                        type="button"
                        onClick={() => switchMode('user')}
                        className={`flex items-center justify-center gap-2 py-2 sm:py-2.5 rounded-lg text-sm font-medium transition-all ${
                          mode === 'user'
                            ? 'bg-white dark:bg-neutral-900 shadow text-primary-600 dark:text-primary-400'
                            : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                        }`}
                      >
                        <User className="h-4 w-4" />
                        Usuario
                      </button>
                      <button
                        type="button"
                        onClick={() => switchMode('device')}
                        className={`flex items-center justify-center gap-2 py-2 sm:py-2.5 rounded-lg text-sm font-medium transition-all ${
                          mode === 'device'
                            ? 'bg-white dark:bg-neutral-900 shadow text-primary-600 dark:text-primary-400'
                            : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                        }`}
                      >
                        <Tablet className="h-4 w-4" />
                        Dispositivo
                      </button>
                    </div>

                    {mode === 'user' ? (
                    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                      <div className="space-y-3 sm:space-y-4">
                        <Input
                          label="Usuario"
                          type="text"
                          placeholder="DNI, email o usuario"
                          value={credentials.username}
                          onChange={(e) => handleInputChange('username', e.target.value)}
                          leftIcon={<User className="h-4 w-4 sm:h-5 sm:w-5" />}
                          required
                        />
                        
                        <Input
                          label="Contraseña"
                          type={showPassword ? "text" : "password"}
                          placeholder="Ingrese su contraseña"
                          value={credentials.password}
                          onChange={(e) => handleInputChange('password', e.target.value)}
                          leftIcon={<Lock className="h-4 w-4 sm:h-5 sm:w-5" />}
                          rightIcon={
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="focus:outline-none hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                              tabIndex={-1}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                            </button>
                          }
                          required
                        />
                      </div>
                      
                      {error && (
                        <div className={`flex items-center gap-3 p-3 sm:p-4 rounded-lg sm:rounded-xl backdrop-blur-sm ${
                          error.includes('Usuario inactivo') 
                            ? 'bg-amber-50/80 dark:bg-amber-900/30 border border-amber-200/50 dark:border-amber-800/50' 
                            : 'bg-error-50/80 dark:bg-error-900/30 border border-error-200/50 dark:border-error-800/50'
                        }`}>
                          {error.includes('Usuario inactivo') ? (
                            <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-error-600 dark:text-error-400 flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <span className={`text-sm font-medium ${
                              error.includes('Usuario inactivo') 
                                ? 'text-amber-700 dark:text-amber-300' 
                                : 'text-error-700 dark:text-error-300'
                            }`}>
                              {error}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      <Button 
                        type="submit" 
                        variant="primary"
                        size="lg"
                        className="w-full"
                        loading={loading}
                        leftIcon={!loading ? <LogIn className="h-5 w-5 sm:h-6 sm:w-6" /> : undefined}
                      >
                        {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                      </Button>
                    </form>
                    ) : (
                    <form onSubmit={handleDeviceSubmit} className="space-y-4 sm:space-y-6">
                      <Input
                        label="Token de acceso"
                        type={showDeviceToken ? 'text' : 'password'}
                        placeholder="DISP-XXXXX"
                        value={deviceToken}
                        onChange={(e) => {
                          setDeviceToken(e.target.value)
                          if (deviceError) setDeviceError(null)
                        }}
                        leftIcon={<KeyRound className="h-4 w-4 sm:h-5 sm:w-5" />}
                        rightIcon={
                          <button
                            type="button"
                            onClick={() => setShowDeviceToken(!showDeviceToken)}
                            className="focus:outline-none hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                            tabIndex={-1}
                          >
                            {showDeviceToken ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                          </button>
                        }
                        required
                      />

                      {deviceError && (
                        <div className="flex items-center gap-3 p-3 sm:p-4 rounded-lg sm:rounded-xl backdrop-blur-sm bg-error-50/80 dark:bg-error-900/30 border border-error-200/50 dark:border-error-800/50">
                          <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-error-600 dark:text-error-400 flex-shrink-0" />
                          <span className="text-sm font-medium text-error-700 dark:text-error-300 flex-1">
                            {deviceError}
                          </span>
                        </div>
                      )}

                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="w-full"
                        loading={deviceLoading}
                        leftIcon={!deviceLoading ? <Tablet className="h-5 w-5 sm:h-6 sm:w-6" /> : undefined}
                      >
                        {deviceLoading ? 'Vinculando dispositivo...' : 'Vincular dispositivo'}
                      </Button>
                    </form>
                    )}

                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}