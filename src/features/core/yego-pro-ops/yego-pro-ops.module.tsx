import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { yegoProOpsService } from '../../../services/yego-pro-ops-service'
import { TurnosList } from './components/TurnosList'
import { CrearTurnoDialog } from './components/CrearTurnoDialog'
import { DashboardStats } from './components/DashboardStats'
import { TurnosActivos } from './components/TurnosActivos'
import { CalendarioTurnos } from './components/CalendarioTurnos'
import { Card, CardContent } from '../../../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs'
import { Calendar, LayoutDashboard, Clock, List } from 'lucide-react'
import type { Turno } from '../../../services/yego-pro-ops-service'

const YegoProOpsModule: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [turnoEditar, setTurnoEditar] = useState<Turno | undefined>(undefined)
  const queryClient = useQueryClient()

  const eliminarMutation = useMutation({
    mutationFn: (id: string) => yegoProOpsService.eliminarTurno(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['yego-pro-ops-turnos'] })
      queryClient.invalidateQueries({ queryKey: ['yego-pro-ops-turnos-activos'] })
      queryClient.invalidateQueries({ queryKey: ['yego-pro-ops-estadisticas'] })
    },
  })

  const handleCrearTurno = () => {
    setTurnoEditar(undefined)
    setDialogOpen(true)
  }

  const handleEditarTurno = (turno: Turno) => {
    setTurnoEditar(turno)
    setDialogOpen(true)
  }

  const handleEliminarTurno = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este turno?')) {
      eliminarMutation.mutate(id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 dark:text-white mt-5 mb-2">
            Gestión de Turnos
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Administra turnos de conductores diurnos y nocturnos con asignación de vehículos
          </p>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="activos" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            En Curso
          </TabsTrigger>
          <TabsTrigger value="calendario" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Calendario
          </TabsTrigger>
          <TabsTrigger value="lista" className="flex items-center gap-2">
            <List className="w-4 h-4" />
            Lista
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TurnosActivos />
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Resumen del Sistema</h3>
                <DashboardStats />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activos" className="space-y-4">
          <TurnosActivos />
        </TabsContent>

        <TabsContent value="calendario" className="space-y-4">
          <CalendarioTurnos />
        </TabsContent>

        <TabsContent value="lista" className="space-y-4">
          <TurnosList
            onCrearTurno={handleCrearTurno}
            onEditarTurno={handleEditarTurno}
            onEliminarTurno={handleEliminarTurno}
          />
        </TabsContent>
      </Tabs>

      <CrearTurnoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        turnoEditar={turnoEditar}
      />
    </div>
  )
}

export default YegoProOpsModule

