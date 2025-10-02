import React from 'react';
import { useLocation } from 'react-router-dom';
import AgentPanel from 'microfrontends/ticketera/agentpanel/AgentPanel';
import Reports from 'microfrontends/ticketera/reports/Reports';
import { SocketProvider } from 'microfrontends/ticketera/agentpanel/contexts/SocketContext';
import { useAuthStore } from '../../../store/auth-store';

const TicketeraWrapper: React.FC = () => {
  const location = useLocation();
  const { user } = useAuthStore();
  
  console.log('🚀 [TicketeraWrapper] TicketeraWrapper iniciando...');
  console.log('🔍 [TicketeraWrapper] Ruta actual:', location.pathname);
  console.log('👤 [TicketeraWrapper] Usuario:', user?.role);
  
  // 🎯 OPERADOR solo puede ver Reports
  if (user?.role === 'OPERADOR') {
    if (location.pathname === '/reports') {
      console.log('📊 [TicketeraWrapper] OPERADOR - Renderizando Reports...');
      return <Reports />;
    } else {
      console.log('👋 [TicketeraWrapper] OPERADOR - Mostrando página de saludo...');
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-white dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-6">
          <div className="text-center max-w-md mx-auto">
            <div className="mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">👋</span>
              </div>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                ¡Hola, {user.name}!
              </h1>
              <p className="text-xl text-slate-600 dark:text-slate-400 mb-2">
                Bienvenido al sistema de yego
              </p>
              <p className="text-slate-500 dark:text-slate-500">
                Selecciona "Reportes" en el menú para ver el desempeño de los agentes SAC
              </p>
            </div>
          </div>
        </div>
      );
    }
  }
  
  // 🎯 SAC y otros roles - Lógica normal
  if (location.pathname === '/reports') {
    console.log('📊 [TicketeraWrapper] SAC - Renderizando Reports...');
    return <Reports />;
  }
  
  // 🎯 Por defecto, renderizar AgentPanel para /tickets
  console.log('🎫 [TicketeraWrapper] SAC - Renderizando AgentPanel...');
  return (
    <SocketProvider>
      <AgentPanel />
    </SocketProvider>
  );
};

export default TicketeraWrapper;
