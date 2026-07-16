import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { LayoutDashboard, Settings } from 'lucide-react';
import AgentPanel from '../views/agentpanel/AgentPanel';
import TicketeraAdmin from '../views/admin/TicketeraAdmin';
import { SocketProvider } from '../views/agentpanel/contexts/SocketContext';
import { useAuthStore } from '../../../../store/auth-store';
import { AccessRestricted } from '../../../../shared/components/AccessRestricted';

type Vista = 'operaciones' | 'admin'

const ROLES_ADMIN = ['ADMIN', 'SUPERVISOR', 'SUPERADMIN']

const TicketeraWrapper: React.FC = () => {
  const { user } = useAuthStore();
  const [vista, setVista] = useState<Vista>('operaciones');

  const puedeAdministrar = ROLES_ADMIN.includes(user?.role?.toUpperCase?.() ?? '');

  const role = user?.role?.toUpperCase?.() ?? '';
  if (role === 'OPERADOR') return <Navigate to="/reports" replace />;
  if (![...ROLES_ADMIN, 'SAC'].includes(role)) return <AccessRestricted />;

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
