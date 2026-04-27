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
            Administra turnos de conductores por día (mañana y tarde) con asignación de vehículos
          </p>
        </div>
      </div>

      <Tabs defaultValue="monitoreo" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 bg-transparent p-0 h-auto rounded-none border-b border-gray-200 dark:border-gray-700">
          <TabsTrigger value="monitoreo" className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2">
            <Radio className="w-4 h-4" />
            Monitoreo en Vivo
          </TabsTrigger>
          <TabsTrigger value="detalle" className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2">
            <FileText className="w-4 h-4" />
            Detalle
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monitoreo" className="space-y-4 data-[state=inactive]:hidden" forceMount>
          <MonitoreoEnVivoView />
        </TabsContent>

        <TabsContent value="detalle" className="space-y-4 data-[state=inactive]:hidden" forceMount>
          <DetalleView />
        </TabsContent>
      </Tabs>

    </div>
  )
}

export default YegoProOpsModule

