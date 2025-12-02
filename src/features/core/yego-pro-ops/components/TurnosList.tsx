import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { yegoProOpsService } from '../../../../services/yego-pro-ops-service'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'
import { Button } from '../../../../components/ui/button'
import { Badge } from '../../../../components/ui/badge'
import { Input } from '../../../../components/ui/input'
import { Label } from '../../../../components/ui/label'
import { Plus, Edit, Trash2, Calendar, Car } from 'lucide-react'
import type { Turno } from '../../../../services/yego-pro-ops-service'

interface TurnosListProps {
  fecha?: string
  onCrearTurno: () => void
  onEditarTurno: (turno: Turno) => void
  onEliminarTurno: (id: string) => void
}

export function TurnosList({ fecha, onCrearTurno, onEditarTurno, onEliminarTurno }: TurnosListProps) {
  const [fechaFiltro, setFechaFiltro] = useState<string>(
    fecha || new Date().toISOString().split('T')[0]
  )

  const { data: turnos, isLoading, error } = useQuery({
    queryKey: ['yego-pro-ops-turnos', fechaFiltro],
    queryFn: () => yegoProOpsService.obtenerTurnos(fechaFiltro),
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

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <p className="text-error-500">Error al cargar los turnos</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Lista de Turnos
        </CardTitle>
        <Button onClick={onCrearTurno} leftIcon={<Plus className="w-4 h-4" />}>
          Crear Turno
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-xs">
          <Label htmlFor="fecha-filtro">Filtrar por fecha</Label>
          <Input
            id="fecha-filtro"
            type="date"
            value={fechaFiltro}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFechaFiltro(e.target.value)}
          />
        </div>

        {!turnos || turnos.length === 0 ? (
          <div className="text-center py-12 text-neutral-600 dark:text-neutral-400">
            No hay turnos registrados para esta fecha
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Conductor</TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Horario</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {turnos.map((turno) => (
                  <TableRow key={turno.id}>
                    <TableCell className="font-medium">
                      {turno.conductor
                        ? `${turno.conductor.nombre} ${turno.conductor.apellido}`
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {turno.vehiculo ? (
                        <div className="flex items-center gap-2">
                          <Car className="w-4 h-4 text-neutral-500" />
                          <span className="text-sm">
                            {turno.vehiculo.placa}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {turno.vehiculo.marca} {turno.vehiculo.modelo}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-neutral-400 text-sm">Sin vehículo</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(turno.fecha).toLocaleDateString('es-ES')}
                    </TableCell>
                    <TableCell>
                      {turno.horaInicio} - {turno.horaFin}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={turno.tipoTurno === 'diurno' ? 'warning' : 'secondary'}
                      >
                        {turno.tipoTurno === 'diurno' ? '☀️ Diurno' : '🌙 Nocturno'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          turno.estado === 'en_curso'
                            ? 'success'
                            : turno.estado === 'completado'
                            ? 'default'
                            : turno.estado === 'cancelado'
                            ? 'error'
                            : 'secondary'
                        }
                      >
                        {turno.estado === 'en_curso'
                          ? 'En Curso'
                          : turno.estado === 'completado'
                          ? 'Completado'
                          : turno.estado === 'cancelado'
                          ? 'Cancelado'
                          : 'Programado'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEditarTurno(turno)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEliminarTurno(turno.id)}
                        >
                          <Trash2 className="w-4 h-4 text-error-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

