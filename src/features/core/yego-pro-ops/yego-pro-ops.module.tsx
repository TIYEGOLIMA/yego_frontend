import React from 'react'
import { MonitoreoEnVivoView } from './components/MonitoreoEnVivoView'
import { ShiftSessionsView } from './components/ShiftSessionsView'
import { LiquidacionView } from './components/LiquidacionView'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs'
import { Radio, Clock, DollarSign } from 'lucide-react'

const YegoProOpsModule: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="yego-heading-1 mb-2">
            Gestión de Turnos
          </h1>
          <p className="yego-body">
            Administra sesiones de conductores, monitoreo en vivo y liquidaciones
          </p>
        </div>
      </div>

      <Tabs defaultValue="sesiones" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 bg-transparent p-0 h-auto rounded-none border-b border-gray-200 dark:border-gray-700">
          <TabsTrigger value="sesiones" className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2">
            <Clock className="w-4 h-4" />
            Sesiones
          </TabsTrigger>
          <TabsTrigger value="liquidacion" className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2">
            <DollarSign className="w-4 h-4" />
            Liquidación
          </TabsTrigger>
          <TabsTrigger value="monitoreo" className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2">
            <Radio className="w-4 h-4" />
            Monitoreo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sesiones" className="space-y-4 data-[state=inactive]:hidden" forceMount>
          <ShiftSessionsView />
        </TabsContent>

        <TabsContent value="liquidacion" className="space-y-4 data-[state=inactive]:hidden" forceMount>
          <LiquidacionView />
        </TabsContent>

        <TabsContent value="monitoreo" className="space-y-4 data-[state=inactive]:hidden" forceMount>
          <MonitoreoEnVivoView />
        </TabsContent>
      </Tabs>

    </div>
  )
}

export default YegoProOpsModule

