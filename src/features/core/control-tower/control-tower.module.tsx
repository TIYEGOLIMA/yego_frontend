import React, { useCallback, useMemo, useState } from 'react';
import { ExternalLink, LayoutGrid, MonitorPlay, RadioTower, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { useAuthStore } from '../../../store/auth-store';
import {
  buildControlTowerSsoLoginUrl,
  getControlTowerBaseUrl,
  getControlTowerOrigin,
  INTEGRAL_SSO_MESSAGE_TYPE,
} from '../../../utils/control-tower-sso';

type ViewMode = 'iframe' | 'external';

const ControlTowerModule: React.FC = () => {
  const token = useAuthStore((s) => s.token);
  const [viewMode, setViewMode] = useState<ViewMode>('iframe');
  const [iframeKey, setIframeKey] = useState(0);

  const ssoUrl = useMemo(() => (token ? buildControlTowerSsoLoginUrl(token) : ''), [token]);
  const ctOrigin = useMemo(() => getControlTowerOrigin(), []);

  const sendTokenToIframe = useCallback(
    (win: Window | null) => {
      if (!token || !win) return;
      try {
        win.postMessage(
          { type: INTEGRAL_SSO_MESSAGE_TYPE, accessToken: token, source: 'integral' },
          ctOrigin
        );
      } catch {
        // Origen cruzado: solo si el iframe ya cargó el documento permitido
      }
    },
    [token, ctOrigin]
  );

  if (!token) {
    return (
      <div className="text-center text-neutral-600 dark:text-neutral-400 py-12">
        No hay sesión activa. Inicia sesión en Integral para usar Control Tower.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <RadioTower className="h-8 w-8 text-primary-500 shrink-0" aria-hidden />
          YEGO Control Tower
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 mt-1 max-w-3xl">
          Misma sesión que Integral: se reutiliza tu JWT de la API. Puedes ver la app aquí embebida o
          abrirla en una pestaña nueva.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={viewMode === 'iframe' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setViewMode('iframe')}
          leftIcon={<MonitorPlay className="h-4 w-4 shrink-0" aria-hidden />}
        >
          Vista embebida
        </Button>
        <Button
          type="button"
          variant={viewMode === 'external' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setViewMode('external')}
          leftIcon={<LayoutGrid className="h-4 w-4 shrink-0" aria-hidden />}
        >
          Acceso directo
        </Button>
      </div>

      {viewMode === 'external' ? (
        <Card className="border border-neutral-200 dark:border-neutral-800">
          <CardHeader>
            <CardTitle className="text-lg">Ventana externa</CardTitle>
            <CardDescription>
              Se abre Control Tower en <span className="font-mono text-xs">{getControlTowerBaseUrl()}</span> con
              tu token ya incluido en la URL (fragmento, no visible en el servidor).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="primary"
              onClick={() => window.open(ssoUrl, '_blank', 'noopener,noreferrer')}
              leftIcon={<ExternalLink className="h-4 w-4 shrink-0" aria-hidden />}
            >
              Abrir en nueva pestaña
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 pb-2">
            <CardTitle className="text-lg">Vista embebida</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => setIframeKey((k) => k + 1)}
              leftIcon={<RefreshCw className="h-4 w-4 shrink-0" aria-hidden />}
            >
              Recargar vista
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900/50 min-h-[70vh]">
              <iframe
                key={iframeKey}
                title="YEGO Control Tower"
                src={ssoUrl}
                className="w-full min-h-[70vh] border-0 bg-white dark:bg-neutral-950"
                allow="clipboard-read; clipboard-write; fullscreen"
                onLoad={(e) => sendTokenToIframe(e.currentTarget.contentWindow)}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ControlTowerModule;
