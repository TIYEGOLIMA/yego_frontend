import React from 'react';
import AgentPanel from 'microfrontends/ticketera/agentpanel/AgentPanel';
import { SocketProvider } from 'microfrontends/ticketera/agentpanel/contexts/SocketContext';

const AgentPanelWrapper: React.FC = () => {
  console.log('🚀 [TicketeraWrapper] TicketeraWrapper iniciando...');
  
  // ✅ Envolver AgentPanel con SocketProvider para el WebSocket centralizado
  return (
    <SocketProvider>
      <AgentPanel />
    </SocketProvider>
  );
};

export default AgentPanelWrapper;
