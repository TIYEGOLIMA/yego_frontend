import React from 'react';
import AgentPanelAdapted from './AgentPanelAdapted';

// Componente wrapper para el AgentPanel - Usa la versión adaptada local
const AgentPanelWrapper: React.FC = () => {
  // ✅ Usar directamente el componente local adaptado sin importación dinámica
  return <AgentPanelAdapted />;
};

export default AgentPanelWrapper;
