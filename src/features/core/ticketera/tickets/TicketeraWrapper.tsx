import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { LayoutDashboard, Settings } from 'lucide-react';
import AgentPanel from 'microfrontends/ticketera/agentpanel/AgentPanel';
import Reports from 'microfrontends/ticketera/reports/Reports';
import TicketeraAdmin from 'microfrontends/ticketera/admin/TicketeraAdmin';
import { SocketProvider } from 'microfrontends/ticketera/agentpanel/contexts/SocketContext';
import { useAuthStore } from '../../../../store/auth-store';

type Vista = 'operaciones' | 'admin'

const ROLES_ADMIN = ['ADMIN', 'SUPERVISOR', 'SUPERADMIN']

const TicketeraWrapper: React.FC = () => {
  const location = useLocation();
  const { user } = useAuthStore();
  const [vista, setVista] = useState<Vista>('operaciones');

  const puedeAdministrar = ROLES_ADMIN.includes(user?.role?.toUpperCase?.() ?? '');

  if (user?.role === 'OPERADOR') {
    if (location.pathname === '/reports') {
      return <Reports />;
    } else {
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

  if (location.pathname === '/reports') {
    return <Reports />;
  }

  return (
    <SocketProvider>
      {puedeAdministrar && (
        <div className="px-6 pt-4">
          <div className="inline-flex p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 gap-1">
            <button
              type="button"
              onClick={() => setVista('operaciones')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                vista === 'operaciones'
                  ? 'bg-white dark:bg-neutral-900 shadow text-primary-600 dark:text-primary-400'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Operaciones
            </button>
            <button
              type="button"
              onClick={() => setVista('admin')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                vista === 'admin'
                  ? 'bg-white dark:bg-neutral-900 shadow text-primary-600 dark:text-primary-400'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              Administrar
            </button>
          </div>
        </div>
      )}
      {vista === 'admin' && puedeAdministrar ? <TicketeraAdmin /> : <AgentPanel />}
    </SocketProvider>
  );
};

export default TicketeraWrapper;
