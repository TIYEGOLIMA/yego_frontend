import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { yegoProOpsService } from '../../../../services/yego-pro-ops-service'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Badge } from '../../../../components/ui/badge'
import { Car, User, Clock, MapPin } from 'lucide-react'
import { cn } from '../../../../utils/cn'

export function TurnosActivos() {
  const { data: turnos, isLoading } = useQuery({
    queryKey: ['yego-pro-ops-turnos-activos'],
    queryFn: () => yegoProOpsService.obtenerTurnosActivos(),
    refetchInterval: 30000,
  })

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!turnos || turnos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Turnos en Curso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-neutral-600 dark:text-neutral-400">
            No hay turnos activos en este momento
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Turnos en Curso ({turnos.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {turnos.map((turno) => (
            <div
              key={turno.id}
              className={cn(
                'p-3 rounded-lg border-2 transition-all duration-300',
                turno.tipoTurno === 'diurno'
                  ? 'border-warning-200 dark:border-warning-800 bg-warning-50/50 dark:bg-warning-900/20'
                  : 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20'
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full animate-pulse',
                      turno.tipoTurno === 'diurno' ? 'bg-warning-500' : 'bg-blue-500'
                    )}
                  />
                  <Badge
                    variant={turno.tipoTurno === 'diurno' ? 'warning' : 'secondary'}
                    className="text-xs px-2 py-0.5"
                  >
                    {turno.tipoTurno === 'diurno' ? '☀️ Diurno' : '🌙 Nocturno'}
                  </Badge>
                </div>
                <Badge variant="success" className="text-xs px-2 py-0.5">En Curso</Badge>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs">
                  <User className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
                  <span className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                    {turno.conductor
                      ? `${turno.conductor.nombre} ${turno.conductor.apellido}`
                      : 'Sin conductor'}
                  </span>
                </div>

                {turno.vehiculo ? (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Car className="w-3.5 h-3.5 text-neutral-500 flex-shrink-0" />
                    <span className="text-neutral-700 dark:text-neutral-300 truncate">
                      {turno.vehiculo.marca} {turno.vehiculo.modelo}
                    </span>
                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                      {turno.vehiculo.placa}
                    </Badge>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                    <Car className="w-3.5 h-3.5" />
                    <span>Sin vehículo</span>
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>
                    {turno.horaInicio} - {turno.horaFin}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">
                    {new Date(turno.fecha).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

