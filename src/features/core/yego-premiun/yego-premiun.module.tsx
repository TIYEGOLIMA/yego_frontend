import React, { useState } from 'react'
import { useAuthStore } from '../../../store/auth-store'
import { Switch } from '../../../components/ui/switch'
import { Label } from '../../../components/ui/label'
import { Eye } from 'lucide-react'
import ConsultaTab from './components/ConsultaTab'
import ViajesMesTab from './components/ViajesMesTab'

const YegoPremiunModule: React.FC = () => {
  const user = useAuthStore((state) => state.user)
  const roleNorm = user?.role?.trim().toUpperCase() ?? ''
  /** Solo consulta visitante, sin switch ni tabla global (mismos permisos que visitante de lectura). */
  const isVisitanteOnlyRole =
    roleNorm === 'VISITANTE' || roleNorm === 'INVITADO'

  const [visitanteMode, setVisitanteMode] = useState(false)

  if (isVisitanteOnlyRole) {
    return (
      <div className="flex w-full min-w-0 max-w-none flex-col gap-5">
        <header className="shrink-0">
          <h1 className="yego-heading-1 mb-2">Módulo Yego Premiun</h1>
          <p className="yego-body">
            Consulta información de conductores y sus viajes mensuales.
          </p>
        </header>
        <div className="w-full min-w-0">
          <ConsultaTab showProcessing={false} visitorView />
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-none space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="yego-heading-1 mb-2">Módulo Yego Premiun</h1>
          <p className="yego-body">
            {visitanteMode
              ? 'Consulta información de conductores y sus viajes mensuales.'
              : 'Consulta los registros mensuales de conductores asociados a la categoría Yego Premiun.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Label
            htmlFor="visitante-switch"
            className="flex cursor-pointer items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            <Eye className="h-4 w-4" />
            Vista visitante
          </Label>
          <Switch
            id="visitante-switch"
            checked={visitanteMode}
            onCheckedChange={setVisitanteMode}
          />
        </div>
      </div>

      {visitanteMode ? (
        <div className="w-full min-w-0">
          <ConsultaTab showProcessing visitorView />
        </div>
      ) : (
        <ViajesMesTab showProcessing />
      )}
    </div>
  )
}

export default YegoPremiunModule
