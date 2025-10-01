import { useCallback } from 'react'
import { Card, CardContent } from '../shared/components/ui/Card'
import { Clock, Volume2 } from 'lucide-react'
import { useTVDisplay } from './hooks/useTVDisplay'

export const TVDisplay = () => {
  console.log('📺 [TVDisplay] Componente iniciando...')
  
  const {
    // Estados
    currentTime,
    loading,
    soundEnabled,
    lastUpdate,
    stats,
    lastStatsUpdate,
    maxTicketsToShow,
    
    // Estados derivados
    ticketsEnEspera,
    ticketsLlamados,
    ticketsEnAtencion,
    currentTickets,
    isConnected,
    connectionStatus,
    
    // Acciones
    formatearHora,
    formatearFecha,
    toggleSound
  } = useTVDisplay()

  // 🎯 VALIDACIÓN: Filtrar tickets inválidos
  const ticketsEnEsperaValidos = ticketsEnEspera.filter(ticket => ticket && typeof ticket === 'object')
  const ticketsLlamadosValidos = ticketsLlamados.filter(ticket => ticket && typeof ticket === 'object')
  const ticketsEnAtencionValidos = ticketsEnAtencion.filter(ticket => ticket && typeof ticket === 'object')

  // Log para debuggear tickets
  console.log(`🎯 [TVDisplay] Renderizando con ${ticketsEnEsperaValidos.length} tickets en espera`)
  console.log(`🎯 [TVDisplay] Tickets totales: ${ticketsEnEsperaValidos.length + ticketsLlamadosValidos.length + ticketsEnAtencionValidos.length}`)
  console.log(`🎯 [TVDisplay] Tickets llamados: ${ticketsLlamadosValidos.length}`)
  console.log(`🎯 [TVDisplay] Tickets en atención: ${ticketsEnAtencionValidos.length}`)

  // Componente memoizado para mostrar información del conductor
  const DriverInfo = useCallback(({ ticket }: { ticket: any }) => {
    // 🎯 VALIDACIÓN: Asegurarse de que el ticket sea válido
    if (!ticket || typeof ticket !== 'object') {
      console.warn('⚠️ [TVDisplay] DriverInfo recibió ticket inválido:', ticket)
      return (
        <div className="text-xs text-red-400">
          ⚠️ Ticket inválido
        </div>
      )
    }
    
    // 🎯 DEBUG: Ver qué datos tiene el ticket
    console.log('🔍 [TVDisplay] DriverInfo para ticket:', {
      id: ticket.id,
      phone: ticket.phone,
      driverName: ticket.driverName,
      status: ticket.status
    })
    
    // 🎯 SIMPLE: Mostrar driverName si está disponible
    if (ticket.driverName && ticket.driverName.trim() !== '') {
      console.log(`✅ [TVDisplay] Usando driverName: "${ticket.driverName}"`)
      return (
                    <div className="text-xs font-semibold text-white leading-tight">
              <span className="break-words">{ticket.driverName}</span>
            </div>
      )
    }
    
    // 🎯 FALLBACK: Mostrar licenseNumber si no hay nombre
    if (ticket.licenseNumber) {
      console.log(`📱 [TVDisplay] Mostrando licenseNumber: ${ticket.licenseNumber}`)
      return (
        <div className="text-xs text-slate-400">
          📱 {ticket.licenseNumber}
        </div>
      )
    }
    
    // 🎯 ÚLTIMO RECURSO: Sin información
    console.log(`⚠️ [TVDisplay] Sin información de conductor`)
    return (
      <div className="text-xs text-slate-400">
        📱 Sin información
      </div>
    )
  }, [])

  // 🎯 NUEVO: Componente reutilizable para tickets con diseño moderno
  const TicketCard = useCallback(({ ticket, status }: { 
    ticket: any, 
    status: 'waiting' | 'called' | 'attention'
  }) => {
    if (!ticket || typeof ticket !== 'object') {
      return null
    }

    return (
      <div
        className="ticket-card bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-600/30 hover:border-slate-500/50 transition-all duration-300 animate-fade-in shadow-lg hover:shadow-xl w-full overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Header del ticket - Banner superior */}
        <div 
          className="p-3 border-b border-slate-600/20"
          style={{
            background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.8) 0%, rgba(67, 56, 202, 0.8) 100%)'
          }}
        >
          <div className="text-lg font-bold text-white text-center">
            #{ticket.ticketNumber}
          </div>
        </div>

        {/* Contenido del ticket */}
        <div className="p-4 space-y-3">
          {/* Información del conductor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Conductor
              </span>
              {ticket.priority && (
                <span 
                  className="px-2 py-1 text-xs rounded-full font-bold text-white"
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  P{ticket.priority}
                </span>
              )}
            </div>
            <div className="text-sm font-bold text-white leading-tight">
              <DriverInfo ticket={ticket} />
            </div>
          </div>

          {/* Hora de creación */}
          <div className="flex items-center space-x-2 pt-2 border-t border-slate-600/20">
            <div 
              className="w-4 h-4 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
              }}
            >
              <span className="text-xs">⏰</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-slate-400">Creado:</span>
              <span className="text-xs font-medium text-slate-300">
                {formatearHora(new Date(ticket.createdAt))}
              </span>
            </div>
          </div>

          {/* 🎯 NUEVO: Hora de llamado para tickets llamados */}
          {status === 'called' && ticket.calledAt && (
            <div className="flex items-center space-x-2 pt-2 border-t border-slate-600/20">
              <div 
                className="w-4 h-4 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                }}
              >
                <span className="text-xs">📢</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-xs text-green-400">Llamado:</span>
                <span className="text-xs font-medium text-green-300">
                  {formatearHora(new Date(ticket.calledAt))}
                </span>
              </div>
            </div>
          )}

          {/* 🎯 NUEVO: Hora de inicio para tickets en atención */}
          {status === 'attention' && ticket.calledAt && (
            <div className="flex items-center space-x-2 pt-2 border-t border-slate-600/20">
              <div 
                className="w-4 h-4 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                }}
              >
                <span className="text-xs">⚡</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-xs text-blue-400">Iniciado:</span>
                <span className="text-xs font-medium text-blue-300">
                  {formatearHora(new Date(ticket.calledAt))}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }, [DriverInfo, formatearHora])

  return (
    <div className="h-screen w-screen text-white overflow-hidden" style={{
      background: '#1e293b',
      minHeight: '100vh',
      minWidth: '100vw',
      padding: '60px'
    }}>
      <div className="h-full w-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-2">
          <div>
            <h1 className="text-2xl font-bold mb-1 text-white">Sistema de Ticketera</h1>
            <div className="flex items-center space-x-4 text-base">
              <div className="flex items-center text-blue-200">
                <Clock className="w-5 h-5 mr-2" />
                {formatearHora(currentTime)}
              </div>
              <div className="text-blue-300">
                {formatearFecha(currentTime)}
              </div>
            </div>
            {lastUpdate && (
              <div className="text-xs text-blue-400 mt-1 font-medium">
                Última actualización: {formatearHora(lastUpdate)}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {/* 🎯 Estado real del WebSocket */}
            <div className="flex items-center space-x-2 px-3 py-2 rounded-lg" style={{
              backgroundColor: isConnected ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              border: isConnected ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
            }}>
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium text-white">
                {isConnected ? 'WebSocket Activo' : `WebSocket ${connectionStatus}`}
              </span>
            </div>
            
            <button
              onClick={toggleSound}
              className={`p-2 rounded-lg transition-all duration-200 shadow-lg ${
                soundEnabled 
                  ? 'bg-green-500 hover:bg-green-600 text-white' 
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
            >
              <Volume2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid gap-4" style={{ 
          marginBottom: '20px',
          height: '65vh',
          padding: '10px',
          minHeight: '500px',
          width: '100%',
          gridTemplateColumns: '35% 65%'
        }}>
          {/* Columna izquierda - Tickets Llamados y Tickets en Atención */}
          <div className="flex flex-col gap-4 items-start">
            {/* Tickets Llamados */}
            <Card className="backdrop-blur-sm shadow-lg" style={{
                background: '#ffffff1a',
                height: '55%',
                minHeight: '220px',
                width: '98%'
              }}>
                <CardContent className="p-3 h-full flex flex-col">
                  <h2 className="text-xl font-bold mb-3 text-center text-orange-200">Tickets Llamados</h2>
                  
                  {ticketsLlamadosValidos.length === 0 ? (
                    <div className="text-center text-orange-300 py-6 flex-1 flex flex-col justify-center">
                      <div className="text-4xl mb-2">📢</div>
                      <p className="text-sm font-medium">Esperando llamar tickets...</p>
                    </div>
                  ) : (
                    <div className="flex gap-2 flex-1 overflow-x-auto overflow-y-hidden pb-2">
                      {ticketsLlamadosValidos.map((ticket) => (
                        <div key={ticket.id} className="flex-shrink-0" style={{ width: '200px' }}>
                          <TicketCard
                            ticket={ticket}
                            status="called"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

            {/* Tickets en Atención */}
            <Card className="backdrop-blur-sm shadow-lg" style={{
                background: '#ffffff1a',
                height: '55%',
                minHeight: '220px',
                width: '98%'
              }}>
                <CardContent className="p-3 h-full flex flex-col">
                  <h2 className="text-xl font-bold mb-3 text-center text-yellow-200">Tickets en Atención</h2>
                  
                  {ticketsEnAtencionValidos.length === 0 ? (
                    <div className="text-center text-yellow-300 py-6 flex-1 flex flex-col justify-center">
                      <div className="text-4xl mb-2">⚡</div>
                      <p className="text-sm font-medium">No hay tickets en atención</p>
                    </div>
                  ) : (
                    <div className="flex gap-2 flex-1 overflow-x-auto overflow-y-hidden pb-2">
                      {ticketsEnAtencionValidos.map((ticket) => (
                        <div key={ticket.id} className="flex-shrink-0" style={{ width: '200px' }}>
                          <TicketCard
                            ticket={ticket}
                            status="attention"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
          </div>

          {/* Tickets en Espera - Columna derecha */}
          <Card className="backdrop-blur-sm shadow-lg" style={{
            background: '#ffffff1a',
            height: '100%',
            minHeight: '400px'
          }}>
            <CardContent className="p-3 h-full flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-green-200">Tickets en Espera</h2>
                {ticketsEnEsperaValidos.length > maxTicketsToShow && (
                  <div className="text-xs text-green-300 bg-green-700/50 px-2 py-1 rounded font-medium">
                    Mostrando {currentTickets.length} de {ticketsEnEsperaValidos.length}
                  </div>
                )}
              </div>
              
              {loading ? (
                <div className="flex justify-center py-8 flex-1 flex items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              ) : ticketsEnEsperaValidos.length === 0 ? (
                <div className="text-center text-green-300 py-6 flex-1 flex flex-col justify-center">
                  <div className="text-4xl mb-2">✅</div>
                  <p className="text-sm font-medium">No hay tickets en espera</p>
                </div>
              ) : (
                <div className="flex gap-3 flex-1 overflow-x-auto overflow-y-hidden pb-2">
                  {currentTickets.map((ticket) => (
                    <div key={ticket.id} className="flex-shrink-0" style={{ width: '280px' }}>
                      <TicketCard
                        ticket={ticket}
                        status="waiting"
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Estadísticas */}
        <div className="mb-10">
          <Card className="backdrop-blur-sm border-2 shadow-lg" style={{
            background: '#ffffff1a',
          }}>
            <CardContent className="p-3">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xl font-semibold text-purple-200">Estadísticas del Sistema</h3>
                {lastStatsUpdate && (
                  <div className="text-xs text-purple-300 font-medium">
                    Actualizado: {formatearHora(lastStatsUpdate)}
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center space-x-6">
                <div className="flex-1 text-center">
                  <div className="text-3xl font-bold text-blue-400 mb-1">
                    {stats.enEspera}
                  </div>
                  <div className="text-sm text-blue-300 font-medium">En Espera</div>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-3xl font-bold text-green-400 mb-1">
                    {stats.llamados}
                  </div>
                  <div className="text-sm text-green-300 font-medium">Llamados</div>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-3xl font-bold text-purple-400 mb-1">
                    {stats.atendidos}
                  </div>
                  <div className="text-sm text-purple-300 font-medium">En Atención</div>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-3xl font-bold text-white mb-1">
                    {stats.enEspera + stats.llamados + stats.atendidos}
                  </div>
                  <div className="text-sm text-gray-300 font-medium">Total Activos</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default TVDisplay



