import React, { useState, useCallback } from 'react'
import { MonitoreoEnVivoView } from './components/MonitoreoEnVivoView'
import { ShiftSessionsView } from './components/ShiftSessionsView'
import { LiquidacionView } from './components/LiquidacionView'
import { RendimientoView } from './components/RendimientoView'
import { ConfiguracionBillingView } from './components/ConfiguracionBillingView'
import { type ConductorSimple } from '../../../services/yego-pro-ops-service'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs'
import { Radio, Clock, DollarSign, Settings, TrendingUp } from 'lucide-react'

export interface SharedProOpsState {
  driver: ConductorSimple | null
  desde: string
  hasta: string
  weekOffset: number
  setDriver: (d: ConductorSimple | null) => void
  setDesde: (v: string) => void
  setHasta: (v: string) => void
  setWeekOffset: (v: number | ((prev: number) => number)) => void
  switchTab: (tab: string) => void
}

const YegoProOpsModule: React.FC = () => {
  const [sharedDriver, setSharedDriver] = useState<ConductorSimple | null>(null)
  const [sharedDesde, setSharedDesde] = useState('')
  const [sharedHasta, setSharedHasta] = useState('')
  const [sharedWeekOffset, setSharedWeekOffset] = useState(0)
  const [activeTab, setActiveTab] = useState('sesiones')

  const shared: SharedProOpsState = {
    driver: sharedDriver,
    desde: sharedDesde,
    hasta: sharedHasta,
    weekOffset: sharedWeekOffset,
    setDriver: setSharedDriver,
    setDesde: setSharedDesde,
    setHasta: setSharedHasta,
    setWeekOffset: setSharedWeekOffset,
    switchTab: setActiveTab,
  }

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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 bg-transparent p-0 h-auto rounded-none border-b border-gray-200 dark:border-gray-700">
          <TabsTrigger value="sesiones" className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2">
            <Clock className="w-4 h-4" />
            Sesiones
          </TabsTrigger>
          <TabsTrigger value="liquidacion" className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2">
            <DollarSign className="w-4 h-4" />
            Liquidación
          </TabsTrigger>
          <TabsTrigger value="rendimiento" className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2">
            <TrendingUp className="w-4 h-4" />
            Rendimiento
          </TabsTrigger>
          <TabsTrigger value="monitoreo" className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2">
            <Radio className="w-4 h-4" />
            Monitoreo
          </TabsTrigger>
          <TabsTrigger value="configuraciones" className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2">
            <Settings className="w-4 h-4" />
            Config
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sesiones" className="space-y-4 data-[state=inactive]:hidden" forceMount>
          <ShiftSessionsView shared={shared} />
        </TabsContent>

        <TabsContent value="liquidacion" className="space-y-4 data-[state=inactive]:hidden" forceMount>
          <LiquidacionView shared={shared} />
        </TabsContent>

        <TabsContent value="rendimiento" className="space-y-4 data-[state=inactive]:hidden" forceMount>
          <RendimientoView />
        </TabsContent>

        <TabsContent value="monitoreo" className="space-y-4 data-[state=inactive]:hidden" forceMount>
          <MonitoreoEnVivoView />
        </TabsContent>

        <TabsContent value="configuraciones" className="space-y-4 data-[state=inactive]:hidden" forceMount>
          <ConfiguracionBillingView />
        </TabsContent>
      </Tabs>

    </div>
  )
}

export default YegoProOpsModule
