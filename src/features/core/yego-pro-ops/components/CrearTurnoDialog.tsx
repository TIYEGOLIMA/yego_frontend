import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { yegoProOpsService } from '../../../../services/yego-pro-ops-service'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Label } from '../../../../components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../../components/ui/dialog'
import type { CrearTurnoDto, TipoTurno, Turno } from '../../../../services/yego-pro-ops-service'

interface CrearTurnoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  turnoEditar?: Turno
}

export function CrearTurnoDialog({ open, onOpenChange, turnoEditar }: CrearTurnoDialogProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<CrearTurnoDto>({
    conductorId: turnoEditar?.conductorId || '',
    vehiculoId: turnoEditar?.vehiculoId || '',
    fecha: turnoEditar?.fecha ? turnoEditar.fecha.split('T')[0] : new Date().toISOString().split('T')[0],
    horaInicio: turnoEditar?.horaInicio || '08:00',
    horaFin: turnoEditar?.horaFin || '16:00',
    tipoTurno: turnoEditar?.tipoTurno || 'diurno',
    observaciones: turnoEditar?.observaciones || '',
  })

  const { data: conductores } = useQuery({
    queryKey: ['yego-pro-ops-conductores', formData.tipoTurno],
    queryFn: () => yegoProOpsService.obtenerConductores(formData.tipoTurno),
  })

  const { data: vehiculos } = useQuery({
    queryKey: ['yego-pro-ops-vehiculos', 'disponibles'],
    queryFn: () => yegoProOpsService.obtenerVehiculos(true),
  })

  const crearMutation = useMutation({
    mutationFn: (data: CrearTurnoDto) => yegoProOpsService.crearTurno(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['yego-pro-ops-turnos'] })
      queryClient.invalidateQueries({ queryKey: ['yego-pro-ops-turnos-activos'] })
      queryClient.invalidateQueries({ queryKey: ['yego-pro-ops-estadisticas'] })
      onOpenChange(false)
      resetForm()
    },
  })

  const actualizarMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CrearTurnoDto> }) =>
      yegoProOpsService.actualizarTurno(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['yego-pro-ops-turnos'] })
      queryClient.invalidateQueries({ queryKey: ['yego-pro-ops-turnos-activos'] })
      queryClient.invalidateQueries({ queryKey: ['yego-pro-ops-estadisticas'] })
      onOpenChange(false)
      resetForm()
    },
  })

  const resetForm = () => {
    setFormData({
      conductorId: '',
      vehiculoId: '',
      fecha: new Date().toISOString().split('T')[0],
      horaInicio: '08:00',
      horaFin: '16:00',
      tipoTurno: 'diurno',
      observaciones: '',
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (turnoEditar) {
      actualizarMutation.mutate({ id: turnoEditar.id, data: formData })
    } else {
      crearMutation.mutate(formData)
    }
  }

  const handleTipoTurnoChange = (tipo: TipoTurno) => {
    setFormData({ ...formData, tipoTurno: tipo, conductorId: '' })
  }

  const isLoading = crearMutation.isPending || actualizarMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {turnoEditar ? 'Editar Turno' : 'Crear Turno'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="tipoTurno">Tipo de Turno</Label>
            <Select
              value={formData.tipoTurno}
              onValueChange={handleTipoTurnoChange}
            >
              <SelectTrigger id="tipoTurno">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="diurno">☀️ Diurno</SelectItem>
                <SelectItem value="nocturno">🌙 Nocturno</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="conductorId">Conductor *</Label>
            <Select
              value={formData.conductorId}
              onValueChange={(value) => setFormData({ ...formData, conductorId: value })}
            >
              <SelectTrigger id="conductorId">
                <SelectValue placeholder="Seleccionar conductor" />
              </SelectTrigger>
              <SelectContent>
                {conductores?.filter(c => c.activo && c.tipoTurno === formData.tipoTurno).map((conductor) => (
                  <SelectItem key={conductor.id} value={conductor.id}>
                    {conductor.nombre} {conductor.apellido}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="vehiculoId">Vehículo (opcional)</Label>
            <Select
              value={formData.vehiculoId || ''}
              onValueChange={(value) => setFormData({ ...formData, vehiculoId: value || undefined })}
            >
              <SelectTrigger id="vehiculoId">
                <SelectValue placeholder="Seleccionar vehículo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sin vehículo</SelectItem>
                {vehiculos?.filter(v => v.activo && !v.enUso).map((vehiculo) => (
                  <SelectItem key={vehiculo.id} value={vehiculo.id}>
                    🚗 {vehiculo.placa} - {vehiculo.marca} {vehiculo.modelo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="fecha">Fecha</Label>
            <Input
              id="fecha"
              type="date"
              value={formData.fecha}
              onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="horaInicio">Hora Inicio</Label>
              <Input
                id="horaInicio"
                type="time"
                value={formData.horaInicio}
                onChange={(e) => setFormData({ ...formData, horaInicio: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="horaFin">Hora Fin</Label>
              <Input
                id="horaFin"
                type="time"
                value={formData.horaFin}
                onChange={(e) => setFormData({ ...formData, horaFin: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="observaciones">Observaciones (opcional)</Label>
            <Input
              id="observaciones"
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              placeholder="Notas adicionales..."
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={isLoading}>
              {turnoEditar ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

