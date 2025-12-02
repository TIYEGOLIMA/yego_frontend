import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { yegoProOpsService } from '../../../../services/yego-pro-ops-service'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Button } from '../../../../components/ui/button'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '../../../../utils/cn'
import type { Turno } from '../../../../services/yego-pro-ops-service'

export function CalendarioTurnos() {
  const [fechaActual, setFechaActual] = useState(new Date())
  
  const inicioSemana = new Date(fechaActual)
  inicioSemana.setDate(fechaActual.getDate() - fechaActual.getDay())
  
  const finSemana = new Date(inicioSemana)
  finSemana.setDate(inicioSemana.getDate() + 6)

  const { data: turnos } = useQuery({
    queryKey: ['yego-pro-ops-turnos-calendario', inicioSemana.toISOString().split('T')[0]],
    queryFn: () => yegoProOpsService.obtenerTurnos(),
  })

  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const horas = Array.from({ length: 24 }, (_, i) => i)

  const obtenerTurnosPorDiaYHora = (dia: Date, hora: number): Turno[] => {
    if (!turnos) return []
    const fechaStr = dia.toISOString().split('T')[0]
    return turnos.filter((turno) => {
      const turnoFecha = new Date(turno.fecha).toISOString().split('T')[0]
      const horaInicio = parseInt(turno.horaInicio.split(':')[0])
      const horaFin = parseInt(turno.horaFin.split(':')[0])
      return turnoFecha === fechaStr && hora >= horaInicio && hora < horaFin
    })
  }

  const cambiarSemana = (direccion: 'anterior' | 'siguiente') => {
    const nuevaFecha = new Date(fechaActual)
    nuevaFecha.setDate(fechaActual.getDate() + (direccion === 'siguiente' ? 7 : -7))
    setFechaActual(nuevaFecha)
  }

  const irAHoy = () => {
    setFechaActual(new Date())
  }

  const dias = Array.from({ length: 7 }, (_, i) => {
    const dia = new Date(inicioSemana)
    dia.setDate(inicioSemana.getDate() + i)
    return dia
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5" />
          Calendario Semanal
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={irAHoy}>
            Hoy
          </Button>
          <Button variant="ghost" size="icon" onClick={() => cambiarSemana('anterior')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[200px] text-center">
            {inicioSemana.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} -{' '}
            {finSemana.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          <Button variant="ghost" size="icon" onClick={() => cambiarSemana('siguiente')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-8 border-b border-border dark:border-border-dark">
              <div className="p-2 font-medium text-sm text-neutral-600 dark:text-neutral-400"></div>
              {dias.map((_, index) => {
                const fechaDia = dias[index]
                const esHoy = fechaDia.toDateString() === new Date().toDateString()
                return (
                  <div
                    key={index}
                    className={cn(
                      'p-2 text-center border-l border-border dark:border-border-dark',
                      esHoy && 'bg-primary-50 dark:bg-primary-900/20'
                    )}
                  >
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                      {diasSemana[index]}
                    </div>
                    <div
                      className={cn(
                        'text-lg font-semibold',
                        esHoy
                          ? 'text-primary-600 dark:text-primary-400'
                          : 'text-neutral-900 dark:text-neutral-100'
                      )}
                    >
                      {fechaDia.getDate()}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="max-h-[600px] overflow-y-auto">
              {horas.map((hora) => (
                <div
                  key={hora}
                  className="grid grid-cols-8 border-b border-border dark:border-border-dark hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
                >
                  <div className="p-2 text-xs text-neutral-500 dark:text-neutral-400 font-medium border-r border-border dark:border-border-dark">
                    {hora.toString().padStart(2, '0')}:00
                  </div>
                  {dias.map((dia, diaIndex) => {
                    const turnosEnSlot = obtenerTurnosPorDiaYHora(dia, hora)
                    return (
                      <div
                        key={diaIndex}
                        className="p-1 border-l border-border dark:border-border-dark min-h-[60px]"
                      >
                        {turnosEnSlot.map((turno) => (
                          <div
                            key={turno.id}
                            className={cn(
                              'p-2 rounded-lg text-xs mb-1 cursor-pointer transition-all hover:shadow-md',
                              turno.tipoTurno === 'diurno'
                                ? 'bg-warning-100 dark:bg-warning-900/30 border border-warning-300 dark:border-warning-700'
                                : 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700'
                            )}
                            title={`${turno.conductor?.nombre || 'Sin conductor'} - ${turno.vehiculo?.placa || 'Sin vehículo'}`}
                          >
                            <div className="font-semibold truncate">
                              {turno.conductor?.nombre || 'Sin conductor'}
                            </div>
                            {turno.vehiculo && (
                              <div className="text-neutral-600 dark:text-neutral-400 truncate">
                                🚗 {turno.vehiculo.placa}
                              </div>
                            )}
                            <div className="text-neutral-500 dark:text-neutral-500">
                              {turno.horaInicio} - {turno.horaFin}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

