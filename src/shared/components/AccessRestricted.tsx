import React from 'react';
import { Shield } from 'lucide-react';

export const AccessRestricted: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <Shield className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-neutral-600 dark:text-neutral-400">Acceso Restringido</h3>
        <p className="text-neutral-500 dark:text-neutral-500">No tienes permisos para acceder a este módulo.</p>
      </div>
    </div>
  );
};

export default AccessRestricted;
