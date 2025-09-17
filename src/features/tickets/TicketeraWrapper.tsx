import React, { useState, useEffect } from 'react';
import { SocketProvider } from '../../../microfrontends/agentpanel/contexts/SocketContext';

// Componente wrapper para el AgentPanel
const AgentPanelWrapper: React.FC = () => {
  const [AgentPanel, setAgentPanel] = useState<React.ComponentType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Importación dinámica del AgentPanel
    const loadAgentPanel = async () => {
      try {
        setLoading(true);
        console.log('🔄 Cargando AgentPanel completo...');
        const module = await import('../../../microfrontends/agentpanel/AgentPanel');
        console.log('✅ AgentPanel completo cargado:', module);
        setAgentPanel(() => module.default);
        setError(null);
      } catch (err) {
        console.error('❌ Error cargando AgentPanel:', err);
        setError('No se pudo cargar el AgentPanel');
      } finally {
        setLoading(false);
      }
    };

    loadAgentPanel();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-600 dark:text-neutral-400">Cargando AgentPanel...</p>
        </div>
      </div>
    );
  }

  if (error || !AgentPanel) {
    return (
      <div className="w-full h-full">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <div className="max-w-7xl mx-auto p-6">
            {/* Header de error */}
            <div className="mb-8 bg-white rounded-xl shadow-lg border border-red-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-red-800 mb-2">
                    Error cargando AgentPanel
                  </h1>
                  <p className="text-red-600">
                    {error || 'No se pudo cargar el AgentPanel'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  try {
    // Renderizar el AgentPanel COMPLETO con SocketProvider
    return (
      <SocketProvider>
        <AgentPanel />
      </SocketProvider>
    );
  } catch (error) {
    console.error('Error renderizando AgentPanel:', error);
    
    // Fallback en caso de error
    return (
      <div className="w-full h-full">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <div className="max-w-7xl mx-auto p-6">
            {/* Header de error */}
            <div className="mb-8 bg-white rounded-xl shadow-lg border border-red-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-red-800 mb-2">
                    Error en AgentPanel
                  </h1>
                  <p className="text-red-600">
                    No se pudo cargar el AgentPanel. Revisa la consola para más detalles.
                  </p>
                </div>
              </div>
            </div>

            {/* Contenido de error */}
            <div className="space-y-8">
              <div className="bg-white rounded-xl shadow-lg border border-red-200 p-8">
                <div className="text-center">
                  <div className="mb-6">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-red-800 mb-2">
                      Error de Carga
                    </h2>
                    <p className="text-red-600 mb-6">
                      El AgentPanel no se pudo cargar correctamente
                    </p>
                  </div>

                  <div className="text-red-500">
                    <p className="mb-4">
                      ⚠️ <strong>Problema de integración</strong>
                    </p>
                    <p className="text-sm">
                      Verifica que todas las dependencias estén correctamente configuradas.
                    </p>
                  </div>

                  <div className="mt-8 p-4 bg-red-50 rounded-lg">
                    <h3 className="font-semibold text-red-700 mb-2">Posibles causas:</h3>
                    <ul className="text-sm text-red-600 text-left space-y-1">
                      <li>• Rutas de importación incorrectas</li>
                      <li>• Dependencias faltantes</li>
                      <li>• Problemas de configuración</li>
                      <li>• Errores en los servicios</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
};

export default AgentPanelWrapper;
