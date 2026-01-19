import React from 'react'
import { DetalleView } from './components/DetalleView'
import { MonitoreoEnVivoView } from './components/MonitoreoEnVivoView'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs'
import { FileText, Radio } from 'lucide-react'

const YegoProOpsModule: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="yego-heading-1 mb-2">
            Gestión de Turnos
          </h1>
          <p className="yego-body">
            Administra turnos de conductores diurnos y nocturnos con asignación de vehículos
          </p>
        </div>
      </div>

      <Tabs defaultValue="monitoreo" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="monitoreo" className="flex items-center gap-2">
            <Radio className="w-4 h-4" />
            Monitoreo en Vivo
          </TabsTrigger>
          <TabsTrigger value="detalle" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Detalle
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monitoreo" className="space-y-4">
          <MonitoreoEnVivoView />
        </TabsContent>

        <TabsContent value="detalle" className="space-y-4">
          <DetalleView />
        </TabsContent>
      </Tabs>

    </div>
  )
}

export default YegoProOpsModule

