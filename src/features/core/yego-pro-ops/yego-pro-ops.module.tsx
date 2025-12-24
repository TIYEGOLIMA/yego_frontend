import React, { useState } from 'react'
import { EnCursoView } from './components/EnCursoView'
import { DetalleView } from './components/DetalleView'
import { MonitoreoEnVivoView } from './components/MonitoreoEnVivoView'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs'
import { Clock, FileText, Radio } from 'lucide-react'

const YegoProOpsModule: React.FC = () => {
  const [statusFilterEnCurso, setStatusFilterEnCurso] = useState<'free' | 'busy' | 'in_order' | 'no-gps' | null>(null)
  const [statusFilterMonitoreo, setStatusFilterMonitoreo] = useState<'free' | 'busy' | 'in_order' | 'no-gps' | null>(null)

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

      <Tabs defaultValue="monitoreo" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="monitoreo" className="flex items-center gap-2">
            <Radio className="w-4 h-4" />
            Monitoreo en Vivo
          </TabsTrigger>
          <TabsTrigger value="activos" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            En Curso
          </TabsTrigger>
          <TabsTrigger value="detalle" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Detalle
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monitoreo" className="space-y-4">
          <MonitoreoEnVivoView statusFilter={statusFilterMonitoreo} onFilterChange={setStatusFilterMonitoreo} />
        </TabsContent>

        <TabsContent value="activos" className="space-y-4">
          <EnCursoView statusFilter={statusFilterEnCurso} onFilterChange={setStatusFilterEnCurso} />
        </TabsContent>

        <TabsContent value="detalle" className="space-y-4">
          <DetalleView />
        </TabsContent>
      </Tabs>

    </div>
  )
}

export default YegoProOpsModule

