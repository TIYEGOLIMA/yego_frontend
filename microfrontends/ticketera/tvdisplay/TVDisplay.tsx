import React, { useCallback, useEffect } from 'react'
import { Card, CardContent } from '../shared/components/ui/Card'
import { Clock, Volume2 } from 'lucide-react'
import { useTVDisplay } from './hooks/useTVDisplay'
import { TICKET_STATUS } from '../shared/utils/constants'
import { Ticket, TVDisplayStats } from './types'

export const TVDisplay = () => {
  const {
    // Estados
    currentTime,
    loading,
    soundEnabled,
    lastUpdate,
    stats,
    lastStatsUpdate,
    driverNames,
    loadingDrivers,
    maxTicketsToShow,
    
    // Estados derivados
    ticketsEnEspera,
    ticketsLlamados,
    ticketsEnAtencion,
    currentTickets,
    isConnected,
    
    // Acciones
    obtenerNombreConductor,
    formatearHora,
    formatearFecha,
    toggleSound
  } = useTVDisplay()

  // 🎯 VALIDACIÓN: Filtrar tickets inválidos
  const ticketsEnEsperaValidos = ticketsEnEspera.filter(ticket => ticket && typeof ticket === 'object')
  const ticketsLlamadosValidos = ticketsLlamados.filter(ticket => ticket && typeof ticket === 'object')
  const ticketsEnAtencionValidos = ticketsEnAtencion.filter(ticket => ticket && typeof ticket === 'object')

  // 🎯 EFECTO PARA CARGAR NOMBRES DE CONDUCTORES BAJO DEMANDA
  useEffect(() => {
    // Cargar nombres para tickets que no los tienen
    ticketsEnEsperaValidos.forEach(ticket => {
      // 🎯 VALIDACIÓN: Asegurarse de que el ticket sea válido
      if (!ticket || typeof ticket !== 'object') {
        console.warn('⚠️ [TVDisplay] Ticket inválido encontrado:', ticket)
        return
      }
      
      const phoneNumber = ticket.licenseNumber || ticket.phone || ticket.userId?.toString()
      if (phoneNumber && !driverNames[phoneNumber] && !loadingDrivers.has(phoneNumber)) {
        console.log(`🔍 [TVDisplay] Cargando nombre para: ${phoneNumber}`)
        obtenerNombreConductor(phoneNumber)
      }
    })
  }, [ticketsEnEsperaValidos, driverNames, loadingDrivers, obtenerNombreConductor])

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

  // 🎯 NUEVO: Componente reutilizable para tickets con la misma estructura
  const TicketCard = useCallback(({ ticket, status, headerColor, borderColor }: { 
    ticket: any, 
    status: 'waiting' | 'called' | 'attention',
    headerColor: string,
    borderColor: string
  }) => {
    if (!ticket || typeof ticket !== 'object') {
      return null
    }

    return (
      <div
        className={`ticket-card bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-lg border ${borderColor} hover:border-slate-500/70 hover:from-slate-800/90 hover:to-slate-900/90 transition-all duration-300 animate-fade-in shadow-md hover:shadow-lg w-full`}
      >
        {/* Header del ticket */}
        <div className={`${headerColor} rounded-t-lg p-2 border-b border-slate-600/30`}>
          <div className="text-sm font-bold text-white text-center">
            #{ticket.ticketNumber}
          </div>
        </div>

        {/* Contenido del ticket */}
        <div className="p-2 space-y-2">
          {/* Información del conductor */}
          <div className="bg-slate-700/20 rounded-md p-2">
            <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
              Conductor
            </span>
              {ticket.priority && (
                <span className={`px-1.5 py-0.5 text-xs rounded-full font-medium ${
                  ticket.priority === 1 ? 'bg-green-500/20 text-green-300' :
                  ticket.priority === 2 ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-red-500/20 text-red-300'
                }`}>
                  P{ticket.priority}
                </span>
              )}
            </div>
            <DriverInfo ticket={ticket} />
          </div>

          {/* Hora de creación */}
          <div className="bg-slate-700/20 rounded-md p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <span className="text-[10px] text-slate-400">⏰</span>
                <span className="text-[10px] text-slate-400">Creado:</span>
              </div>
              <span className="text-[10px] font-medium text-slate-300">
                {formatearHora(new Date(ticket.createdAt))}
              </span>
            </div>
          </div>

          {/* 🎯 NUEVO: Hora de llamado para tickets llamados */}
          {status === 'called' && ticket.calledAt && (
            <div className="bg-green-500/20 rounded-md p-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <span className="text-[10px] text-green-400">📢</span>
                  <span className="text-[10px] text-green-400">Llamado:</span>
                </div>
                <span className="text-[10px] font-medium text-green-300">
                  {formatearHora(new Date(ticket.calledAt))}
                </span>
              </div>
            </div>
          )}

          {/* 🎯 NUEVO: Hora de inicio para tickets en atención */}
          {status === 'attention' && ticket.calledAt && (
            <div className="bg-blue-500/20 rounded-md p-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <span className="text-[10px] text-blue-400">⚡</span>
                  <span className="text-[10px] text-blue-400">Iniciado:</span>
                </div>
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
    <div className="h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 overflow-hidden">
      <div className="h-full max-w-7xl mx-auto flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">Sistema de Ticketera</h1>
            <div className="flex items-center space-x-4 text-lg">
              <div className="flex items-center">
                <Clock className="w-6 h-6 mr-2" />
                {formatearHora(currentTime)}
              </div>
              <div className="text-slate-300">
                {formatearFecha(currentTime)}
              </div>
            </div>
            {lastUpdate && (
              <div className="text-xs text-slate-400 mt-1">
                Última actualización: {formatearHora(lastUpdate)}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {/* 🎯 Estado real del WebSocket */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className="text-xs text-slate-300">
                {isConnected ? 'WebSocket Activo' : 'HTTP Polling'}
              </span>
            </div>
            
            <button
              onClick={toggleSound}
              className={`p-2 rounded transition-all duration-200 ${
                soundEnabled 
                  ? 'bg-green-500 hover:bg-green-600' 
                  : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              <Volume2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
          {/* Tickets Llamados y en Atención */}
          <div className="lg:col-span-1">
            <div className="h-full flex flex-col space-y-4">
              {/* Tickets Llamados */}
              <Card className="bg-white/10 backdrop-blur-sm border border-white/20 flex-1">
                <CardContent className="p-3 h-full flex flex-col">
                  <h2 className="text-lg font-bold mb-3 text-center">Tickets Llamados</h2>
                  
                  {ticketsLlamadosValidos.length === 0 ? (
                    <div className="text-center text-slate-400 py-6 flex-1 flex flex-col justify-center">
                      <div className="text-3xl mb-2">📢</div>
                      <p className="text-sm">Esperando llamar tickets...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 flex-1 overflow-y-auto">
                      {ticketsLlamadosValidos.map((ticket) => (
                        <TicketCard
                          key={ticket.id}
                          ticket={ticket}
                          status="called"
                          headerColor="bg-gradient-to-r from-green-600/20 to-emerald-600/20"
                          borderColor="border-green-500/30"
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tickets en Atención */}
              <Card className="bg-white/10 backdrop-blur-sm border border-white/20 flex-1">
                <CardContent className="p-3 h-full flex flex-col">
                  <h2 className="text-lg font-bold mb-3 text-center">Tickets en Atención</h2>
                  
                  {ticketsEnAtencionValidos.length === 0 ? (
                    <div className="text-center text-slate-400 py-6 flex-1 flex flex-col justify-center">
                      <div className="text-3xl mb-2">⚡</div>
                      <p className="text-sm">No hay tickets en atención</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 flex-1 overflow-y-auto">
                      {ticketsEnAtencionValidos.map((ticket) => (
                        <TicketCard
                          key={ticket.id}
                          ticket={ticket}
                          status="attention"
                          headerColor="bg-gradient-to-r from-blue-600/20 to-indigo-600/20"
                          borderColor="border-blue-500/30"
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Lista de Tickets en Espera */}
          <div className="lg:col-span-2">
            <Card className="bg-white/10 backdrop-blur-sm border border-white/20 h-full">
              <CardContent className="p-3 w-90 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Tickets en Espera</h2>
                  {ticketsEnEsperaValidos.length > maxTicketsToShow && (
                    <div className="text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded">
                      Mostrando {currentTickets.length} de {ticketsEnEsperaValidos.length}
                    </div>
                  )}
                </div>
                
                {loading ? (
                  <div className="flex justify-center py-8 flex-1 flex items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  </div>
                ) : ticketsEnEsperaValidos.length === 0 ? (
                  <div className="text-center text-slate-400 py-8 flex-1 flex flex-col justify-center">
                    <div className="text-4xl mb-2">✅</div>
                    <p className="text-sm">No hay tickets en espera</p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col">
                    {/* Grid de tickets sin scroll */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 flex-1 overflow-y-auto">
                      {currentTickets.map((ticket) => (
                        <TicketCard
                          key={ticket.id}
                          ticket={ticket}
                          status="waiting"
                          headerColor="bg-gradient-to-r from-blue-600/20 to-indigo-600/20"
                          borderColor="border-slate-600/50"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="mt-4">
          <Card className="bg-white/10 backdrop-blur-sm border border-white/20">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Estadísticas del Sistema</h3>
                {lastStatsUpdate && (
                  <div className="text-xs text-slate-400">
                    Actualizado: {formatearHora(lastStatsUpdate)}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-xl font-bold text-blue-400">
                    {stats.enEspera}
                  </div>
                  <div className="text-xs text-slate-300">En Espera</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-green-400">
                    {stats.llamados}
                  </div>
                  <div className="text-xs text-slate-300">Llamados</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-purple-400">
                    {stats.atendidos}
                  </div>
                  <div className="text-xs text-slate-300">En Atención</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-400">
                    {stats.enEspera + stats.llamados + stats.atendidos}
                  </div>
                  <div className="text-xs text-slate-300">Total Activos</div>
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



