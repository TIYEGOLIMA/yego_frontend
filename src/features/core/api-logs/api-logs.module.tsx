import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../../../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../../components/ui/select';
import {
  Activity,
  RefreshCw,
  Globe,
  Clock,
  Zap,
  Server,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Copy,
  Check
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../../../components/ui/dialog';
import { api } from '../../../services';

interface ApiLog {
  id: number;
  endpoint: string;
  method: string;
  ipAddress: string;
  requestBody: string | null;
  statusCode: number;
  responseTimeMs: number;
  userAgent: string | null;
  createdAt: string;
}

interface IpStat {
  ip: string;
  count: number;
}

interface LogsResponse {
  period_hours: number;
  total_calls: number;
  calls_by_ip: IpStat[];
  recent_logs: ApiLog[];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Justo ahora';
  if (mins < 60) return `Hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  return `Hace ${Math.floor(hrs / 24)}d`;
}

function formatBodyForPreview(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  try {
    return JSON.stringify(JSON.parse(t), null, 2);
  } catch {
    return raw;
  }
}

const ApiLogsModule: React.FC = () => {
  const [data, setData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hours, setHours] = useState('24');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [bodyPreviewLog, setBodyPreviewLog] = useState<ApiLog | null>(null);
  const [bodyCopied, setBodyCopied] = useState(false);

  const copyRequestBody = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setBodyCopied(true);
      window.setTimeout(() => setBodyCopied(false), 2000);
    } catch (e) {
      console.error('[ApiLogs] No se pudo copiar:', e);
    }
  }, []);

  const fetchLogs = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await api.get(`/yango-external/logs?hours=${hours}`);
      setData(res.data);
    } catch (err) {
      console.error('[ApiLogs] Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hours]);

  useEffect(() => {
    fetchLogs();
    setCurrentPage(1);
  }, [fetchLogs]);

  useEffect(() => {
    const interval = setInterval(() => fetchLogs(false), 60000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  useEffect(() => {
    let active = true;
    const setup = async () => {
      try {
        const SystemNotificationsService = (await import('../../../services/system-notifications-service')).default;
        SystemNotificationsService.setOnYangoApiLogUpdated(() => {
          if (active) fetchLogs(false);
        });
      } catch (e) {
        console.error('[ApiLogs] WebSocket:', e);
      }
    };
    setup();
    return () => {
      active = false;
      import('../../../services/system-notifications-service').then((m) =>
        m.default.setOnYangoApiLogUpdated(null)
      );
    };
  }, [fetchLogs]);

  const logs = data?.recent_logs ?? [];
  const logCount = logs.length;

  useEffect(() => {
    const maxPage = logCount === 0 ? 1 : Math.ceil(logCount / itemsPerPage);
    setCurrentPage((p) => (p > maxPage ? maxPage : Math.max(1, p)));
  }, [logCount, itemsPerPage]);

  const totalPages =
    logs.length === 0 ? 1 : Math.max(1, Math.ceil(logs.length / itemsPerPage));
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedLogs = logs.slice(startIdx, startIdx + itemsPerPage);
  const showingFrom = logs.length === 0 ? 0 : startIdx + 1;
  const showingTo = logs.length === 0 ? 0 : startIdx + paginatedLogs.length;

  const avgResponseTime = logs.length > 0
    ? Math.round(logs.reduce((sum, l) => sum + (l.responseTimeMs || 0), 0) / logs.length)
    : 0;

  const errorCount = logs.filter(l => l.statusCode >= 400).length;
  const successCount = logs.filter(l => l.statusCode >= 200 && l.statusCode < 400).length;

  const getStatusBadge = (status: number) => {
    if (status >= 200 && status < 300) return <Badge variant="success">{status}</Badge>;
    if (status >= 400 && status < 500) return <Badge variant="warning">{status}</Badge>;
    if (status >= 500) return <Badge variant="error">{status}</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  const getResponseColor = (ms: number) => {
    if (ms < 2000) return 'text-green-600';
    if (ms < 5000) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="yego-heading-1 mb-2">API Yango External</h1>
          <p className="yego-body">
            Monitoreo de llamadas a Yango External. La lista se actualiza al instante por WebSocket; cada minuto hay respaldo por polling.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={hours} onValueChange={setHours}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Última hora</SelectItem>
              <SelectItem value="6">Últimas 6h</SelectItem>
              <SelectItem value="12">Últimas 12h</SelectItem>
              <SelectItem value="24">Últimas 24h</SelectItem>
              <SelectItem value="48">Últimas 48h</SelectItem>
              <SelectItem value="168">Última semana</SelectItem>
              <SelectItem value="720">Último mes</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLogs(false)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <p className="yego-body-sm">Cargando logs...</p>
          </div>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-500">Total llamadas</p>
                    <p className="text-3xl font-bold text-neutral-900 dark:text-white mt-1">
                      {data?.total_calls ?? 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                    <Activity className="h-6 w-6 text-primary-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-500">Exitosas</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">{successCount}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-500">Errores</p>
                    <p className="text-3xl font-bold text-red-600 mt-1">{errorCount}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                    <XCircle className="h-6 w-6 text-red-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-500">Tiempo promedio</p>
                    <p className={`text-3xl font-bold mt-1 ${getResponseColor(avgResponseTime)}`}>
                      {avgResponseTime < 1000 ? `${avgResponseTime}ms` : `${(avgResponseTime / 1000).toFixed(1)}s`}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <Zap className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* IPs + Table */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* IPs sidebar */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Globe className="h-4 w-4 text-primary-500" />
                  Llamadas por IP
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(data?.calls_by_ip ?? []).length === 0 ? (
                  <p className="text-sm text-neutral-400">Sin datos</p>
                ) : (
                  <div className="space-y-3">
                    {data!.calls_by_ip.map((ip, i) => {
                      const pct = data!.total_calls > 0 ? Math.round((ip.count / data!.total_calls) * 100) : 0;
                      return (
                        <div key={ip.ip ?? i}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-mono text-neutral-700 dark:text-neutral-300 truncate max-w-[140px]" title={ip.ip}>
                              {ip.ip}
                            </span>
                            <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                              {ip.count}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-500 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Logs table */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-base">
                    <Server className="h-4 w-4 text-primary-500" />
                    Registro de llamadas
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm text-neutral-500">
                      {logs.length} registro{logs.length !== 1 ? 's' : ''} (paginación local)
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">Por página</span>
                      <Select
                        value={String(itemsPerPage)}
                        onValueChange={(v) => {
                          setItemsPerPage(Number(v));
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="w-[4.5rem] h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="15">15</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Activity className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Sin registros</h3>
                    <p className="text-sm text-neutral-500">No hay llamadas a la API en el período seleccionado.</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Endpoint</TableHead>
                            <TableHead>IP</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Tiempo</TableHead>
                            <TableHead>Body</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedLogs.map((log) => (
                            <TableRow key={log.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                                  <div>
                                    <div className="text-sm">{formatDate(log.createdAt)}</div>
                                    <div className="text-xs text-neutral-400">{timeAgo(log.createdAt)}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs font-mono shrink-0">
                                    {log.method}
                                  </Badge>
                                  <span className="text-sm font-mono text-neutral-700 dark:text-neutral-300 truncate max-w-[200px]" title={log.endpoint}>
                                    {log.endpoint}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm font-mono text-neutral-600 dark:text-neutral-400">
                                  {log.ipAddress}
                                </span>
                              </TableCell>
                              <TableCell>{getStatusBadge(log.statusCode)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <Zap className={`h-3.5 w-3.5 ${getResponseColor(log.responseTimeMs)}`} />
                                  <span className={`text-sm font-semibold ${getResponseColor(log.responseTimeMs)}`}>
                                    {log.responseTimeMs < 1000
                                      ? `${log.responseTimeMs}ms`
                                      : `${(log.responseTimeMs / 1000).toFixed(1)}s`}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {log.requestBody ? (
                                  <div className="flex flex-col gap-1.5 max-w-[220px]">
                                    <span
                                      className="text-xs font-mono text-neutral-500 truncate block"
                                      title={log.requestBody}
                                    >
                                      {log.requestBody.length > 48
                                        ? `${log.requestBody.slice(0, 48)}…`
                                        : log.requestBody}
                                    </span>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-xs gap-1 w-fit"
                                      onClick={() => {
                                        setBodyCopied(false);
                                        setBodyPreviewLog(log);
                                      }}
                                    >
                                      <Eye className="h-3.5 w-3.5 shrink-0" />
                                      Vista previa
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-neutral-400">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                      <div className="text-sm text-neutral-600 dark:text-neutral-400">
                        {logs.length === 0 ? (
                          'Sin registros'
                        ) : (
                          <>
                            Página {currentPage} de {totalPages} — Mostrando {showingFrom}–{showingTo} de {logs.length}
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage <= 1 || logs.length === 0}
                          aria-label="Primera página"
                        >
                          <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setCurrentPage((p) => p - 1)}
                          disabled={currentPage <= 1 || logs.length === 0}
                          aria-label="Página anterior"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        {logs.length > 0 &&
                          totalPages > 1 &&
                          Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let p: number;
                            if (totalPages <= 5) p = i + 1;
                            else if (currentPage <= 3) p = i + 1;
                            else if (currentPage >= totalPages - 2) p = totalPages - 4 + i;
                            else p = currentPage - 2 + i;
                            return (
                              <Button
                                key={p}
                                variant={currentPage === p ? 'primary' : 'outline'}
                                size="sm"
                                className="h-8 w-8 p-0 min-w-[2rem]"
                                onClick={() => setCurrentPage(p)}
                              >
                                {p}
                              </Button>
                            );
                          })}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setCurrentPage((p) => p + 1)}
                          disabled={currentPage >= totalPages || logs.length === 0}
                          aria-label="Página siguiente"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage >= totalPages || logs.length === 0}
                          aria-label="Última página"
                        >
                          <ChevronsRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Warning if high error rate */}
          {errorCount > 0 && logs.length > 0 && (errorCount / logs.length) > 0.3 && (
            <Card className="border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/10">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-yellow-800 dark:text-yellow-300">
                      Alta tasa de errores ({Math.round((errorCount / logs.length) * 100)}%)
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-400">
                      Se detectaron {errorCount} errores de {logs.length} llamadas en el período seleccionado.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Dialog
        open={bodyPreviewLog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setBodyPreviewLog(null);
            setBodyCopied(false);
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Vista previa del body</DialogTitle>
            {bodyPreviewLog && (
              <DialogDescription className="font-mono text-xs text-neutral-600 dark:text-neutral-400 text-left line-clamp-2 break-all">
                <span className="font-semibold">{bodyPreviewLog.method}</span>{' '}
                {bodyPreviewLog.endpoint}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="min-h-[100px] max-h-[min(55vh,28rem)] overflow-auto rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-950 text-neutral-100 p-4">
            <pre className="text-xs font-mono whitespace-pre-wrap break-words m-0">
              {bodyPreviewLog?.requestBody
                ? formatBodyForPreview(bodyPreviewLog.requestBody)
                : '—'}
            </pre>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setBodyPreviewLog(null)}>
              Cerrar
            </Button>
            <Button
              type="button"
              disabled={!bodyPreviewLog?.requestBody}
              onClick={() =>
                bodyPreviewLog?.requestBody && copyRequestBody(bodyPreviewLog.requestBody)
              }
              className="gap-2"
            >
              {bodyCopied ? (
                <Check className="h-4 w-4 shrink-0" />
              ) : (
                <Copy className="h-4 w-4 shrink-0" />
              )}
              {bodyCopied ? 'Copiado' : 'Copiar body'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApiLogsModule;
