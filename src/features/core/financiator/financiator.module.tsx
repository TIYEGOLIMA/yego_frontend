import React, { useMemo, useState } from 'react';
import { ExternalLink, LayoutGrid, MonitorPlay, RefreshCw, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { buildFinanciatorUrl, getFinanciatorBaseUrl } from '../../../utils/financiator-sso';

type ViewMode = 'iframe' | 'external';

const FinanciatorModule: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('iframe');
  const [iframeKey, setIframeKey] = useState(0);

  const fnUrl = useMemo(() => buildFinanciatorUrl(), []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <DollarSign className="h-8 w-8 text-primary-500 shrink-0" aria-hidden />
          YEGO Financiator
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 mt-1 max-w-3xl">
          Accede a Financiator directamente. Puedes ver la app aquí embebida o abrirla en una pestaña nueva.
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
              Se abre Financiator en <span className="font-mono text-xs">{getFinanciatorBaseUrl()}</span> en
              una pestaña nueva.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant="primary"
              onClick={() => window.open(fnUrl, '_blank', 'noopener,noreferrer')}
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
                title="YEGO Financiator"
                src={fnUrl}
                className="w-full min-h-[70vh] border-0 bg-white dark:bg-neutral-950"
                allow="clipboard-read; clipboard-write; fullscreen"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FinanciatorModule;
