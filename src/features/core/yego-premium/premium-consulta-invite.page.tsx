import React from 'react'
import ConsultaTab from './components/ConsultaTab'

/**
 * Solo formulario de consulta (Invitado). No incluye tabla global ni procesos Premium.
 */
const PremiumConsultaInvitePage: React.FC = () => {
  return (
    <div className="flex w-full min-w-0 max-w-none flex-col gap-5 p-6">
      <header className="shrink-0">
        <h1 className="yego-heading-1 mb-2">Consulta de conductores</h1>
        <p className="yego-body">
          Busca por DNI, licencia, teléfono o ID y revisa resumen y viajes del conductor.
        </p>
      </header>
      <div className="w-full min-w-0">
        <ConsultaTab showProcessing={false} visitorView />
      </div>
    </div>
  )
}

export default PremiumConsultaInvitePage
