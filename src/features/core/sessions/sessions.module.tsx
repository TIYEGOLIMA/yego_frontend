import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { 
  Activity, 
  MapPin, 
  Monitor, 
  LogOut,
  RefreshCw,
  History,
  User,
  Laptop,
  Smartphone,
  Tablet,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  X,
} from 'lucide-react';
import { useAuth } from "@/shared/hooks/useAuth";
import { api } from '../../../services';
import AccessRestricted from '@/shared/components/AccessRestricted';

interface Session {
  id: number;
  userId?: number;
  user?: {
    username: string;
    nombre: string;
    email: string;
  };
  ipAddress?: string;
  ip_address?: string;
  device?: string;
  browser?: string;
  operatingSystem?: string;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  is_active?: boolean;
  active?: boolean;
  createdAt?: string;
  created_at?: string;
  expires_at?: string;
}

interface ConnectionLog {
  id: number;
  userId?: number;
  user?: {
    username: string;
    nombre: string;
    email?: string;
  };
  sessionId?: number;
  action: string;
  ipAddress?: string;
  device?: string;
  browser?: string;
  operatingSystem?: string;
  city?: string;
  region?: string;
  country?: string;
  roleName?: string;
  role_name?: string;
  ip_address?: string;
  sessionDuration?: number;
  session_duration?: number;
  createdAt?: string;
  created_at?: string;
}

const DATE_RANGES = [
  { value: '7', label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 90 días' }
] as const;

const SESSION_PAGE_SIZES = [5, 10, 20, 50] as const;

function isAbortError(error: unknown): boolean {
  const e = error as { name?: string; code?: string };
  return e?.name === 'AbortError' || e?.code === 'ERR_CANCELED';
}

function getActionBadgeVariant(action: string): 'primary' | 'secondary' | 'error' | 'outline' {
  const a = (action ?? '').toLowerCase();
  if (a === 'login') return 'primary';
  if (a === 'logout') return 'secondary';
  if (a === 'timeout' || a === 'forced_logout') return 'error';
  return 'outline';
}

function getActionLabel(action: string): string {
  const a = (action ?? '').toLowerCase();
  if (a === 'login') return 'Login';
  if (a === 'logout') return 'Logout';
  if (a === 'timeout') return 'Timeout';
  if (a === 'forced_logout' || a === 'forced logout') return 'Forzado';
  return action || '—';
}

function formatDuration(seconds: number): string {
  if (!seconds) return 'N/A';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function getDeviceIcon(device: string): React.ReactNode {
  const deviceLower = device?.toLowerCase() || '';
  if (deviceLower.includes('mobile') || deviceLower.includes('phone')) {
    return <Smartphone className="h-4 w-4" />;
  }
  if (deviceLower.includes('tablet') || deviceLower.includes('ipad')) {
    return <Tablet className="h-4 w-4" />;
  }
  return <Laptop className="h-4 w-4" />;
}

const SessionsModule: React.FC = () => {
  const authState = useAuth();
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [connectionLogs, setConnectionLogs] = useState<ConnectionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<string>('30');
  const [sessionsPage, setSessionsPage] = useState(1);
  const [sessionsPageSize, setSessionsPageSize] = useState(10);
  const [sessionSearch, setSessionSearch] = useState('');
  const [sessionSearchInput, setSessionSearchInput] = useState('');
  const [totalSessions, setTotalSessions] = useState(0);
  const [totalPagesSessions, setTotalPagesSessions] = useState(0);
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<number>>(new Set());
  const [deletingBulk, setDeletingBulk] = useState(false);

  const applySessionsResponse = (data: unknown) => {
    if (data && typeof data === 'object' && 'content' in data && Array.isArray((data as { content: Session[] }).content)) {
      const d = data as { content: Session[]; total: number; totalPages: number };
      setActiveSessions(d.content);
      setTotalSessions(d.total ?? d.content.length);
      setTotalPagesSessions(d.totalPages ?? 1);
    } else {
      const list = Array.isArray(data) ? data as Session[] : [];
      setActiveSessions(list);
      setTotalSessions(list.length);
      setTotalPagesSessions(1);
    }
  };

  // Carga: sesiones paginadas + historial en paralelo
  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const [sessionsRes, logsRes] = await Promise.all([
          api.get('/sessions', {
            params: { page: sessionsPage, size: sessionsPageSize, ...(sessionSearch.trim() ? { search: sessionSearch.trim() } : {}) },
            signal: ac.signal
          }),
          api.get('/sessions/connection-logs', {
            params: { days: dateRange, limit: 100 },
            signal: ac.signal
          })
        ]);
        if (cancelled) return;
        applySessionsResponse(sessionsRes.data);
        setConnectionLogs(Array.isArray(logsRes.data) ? logsRes.data : []);
      } catch (error: unknown) {
        if (cancelled || isAbortError(error)) return;
        console.error('Error cargando sesiones:', error);
        setActiveSessions([]);
        setTotalSessions(0);
        setTotalPagesSessions(0);
        setConnectionLogs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [sessionsPage, sessionsPageSize, sessionSearch, dateRange]);

  // Limpiar selección al cambiar de página o tamaño
  useEffect(() => {
    setSelectedSessionIds(new Set());
  }, [sessionsPage, sessionsPageSize]);

  const applySessionSearch = () => {
    setSessionSearch(sessionSearchInput.trim());
    setSessionsPage(1);
  };

  const clearSessionSearch = () => {
    setSessionSearchInput('');
    setSessionSearch('');
    setSessionsPage(1);
  };

  const refetchSessions = async () => {
    try {
      setLoading(true);
      const [sessionsRes, logsRes] = await Promise.all([
        api.get('/sessions', { params: { page: sessionsPage, size: sessionsPageSize, ...(sessionSearch.trim() ? { search: sessionSearch.trim() } : {}) } }),
        api.get('/sessions/connection-logs', { params: { days: dateRange, limit: 100 } })
      ]);
      applySessionsResponse(sessionsRes.data);
      setConnectionLogs(Array.isArray(logsRes.data) ? logsRes.data : []);
    } catch (error) {
      console.error('Error actualizando sesiones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionsPageChange = (page: number) => {
    if (page >= 1 && page <= totalPagesSessions) setSessionsPage(page);
  };

  const handleSessionsPageSizeChange = (value: string) => {
    setSessionsPageSize(parseInt(value, 10));
    setSessionsPage(1);
  };

  const handleForceLogout = async (sessionId: number) => {
    try {
      await api.post(`/sessions/${sessionId}/force-logout`);
      await refetchSessions();
    } catch (error) {
      console.error('Error forcing logout:', error);
      alert('Error al cerrar la sesión');
    }
  };

  const toggleSessionSelection = (id: number) => {
    setSelectedSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllSessions = () => {
    if (selectedSessionIds.size === activeSessions.length) {
      setSelectedSessionIds(new Set());
    } else {
      setSelectedSessionIds(new Set(activeSessions.map((s) => s.id)));
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedSessionIds.size === 0) return;
    try {
      setDeletingBulk(true);
      await api.post('/sessions/bulk/deactivate', Array.from(selectedSessionIds));
      setSelectedSessionIds(new Set());
      await refetchSessions();
    } catch (error) {
      console.error('Error cerrando sesiones:', error);
      alert('Error al cerrar las sesiones seleccionadas');
    } finally {
      setDeletingBulk(false);
    }
  };

  if (!authState || !authState.isAuthenticated) {
    return <AccessRestricted />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="yego-heading-1 mb-2">
            Gestión de Sesiones
          </h1>
          <p className="yego-body">
            Administra sesiones activas e historial de conexiones
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="secondary"
            onClick={refetchSessions}
            disabled={loading}
            leftIcon={loading ? undefined : <RefreshCw className="h-4 w-4" />}
            loading={loading}
          >
            Actualizar
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active-sessions" className="w-full">
        <TabsList className="bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg">
          <TabsTrigger 
            value="active-sessions"
            className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-700 data-[state=active]:shadow-sm"
          >
            <Activity className="h-4 w-4 mr-2" />
            Sesiones Activas
          </TabsTrigger>
          <TabsTrigger 
            value="connection-logs"
            className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-700 data-[state=active]:shadow-sm"
          >
            <History className="h-4 w-4 mr-2" />
            Historial de Conexiones
          </TabsTrigger>
        </TabsList>

        {/* Active Sessions Tab */}
        <TabsContent value="active-sessions" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary-500" />
                  Sesiones Activas
                  {!loading && (
                    <span className="text-sm font-normal text-neutral-500 ml-1">
                      ({totalSessions} total)
                    </span>
                  )}
                </CardTitle>
                
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-sm">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                      <input
                        type="text"
                        placeholder="Buscar por usuario, email, IP, dispositivo..."
                        value={sessionSearchInput}
                        onChange={(e) => setSessionSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && applySessionSearch()}
                        className="w-full pl-9 pr-9 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      {sessionSearchInput && (
                        <button
                          type="button"
                          onClick={clearSessionSearch}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                          aria-label="Limpiar búsqueda"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <Button variant="secondary" size="sm" onClick={applySessionSearch}>
                      Buscar
                    </Button>
                  </div>
                  {selectedSessionIds.size > 0 && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={handleBulkDeactivate}
                      disabled={deletingBulk}
                      leftIcon={deletingBulk ? undefined : <LogOut className="h-4 w-4" />}
                      loading={deletingBulk}
                    >
                      {deletingBulk ? 'Cerrando...' : `Eliminar seleccionadas (${selectedSessionIds.size})`}
                    </Button>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">Por página:</span>
                    <Select value={String(sessionsPageSize)} onValueChange={handleSessionsPageSizeChange}>
                      <SelectTrigger className="w-16">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SESSION_PAGE_SIZES.map(size => (
                          <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="yego-body-sm">Cargando sesiones...</p>
                  </div>
                </div>
              ) : activeSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Monitor className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mb-4" />
                  <h3 className="yego-heading-4 mb-2">No hay sesiones activas</h3>
                  <p className="yego-body-sm max-w-md">
                    No se encontraron sesiones activas en el sistema. Las sesiones aparecerán aquí cuando los usuarios inicien sesión.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10 pr-0">
                          <input
                            type="checkbox"
                            role="checkbox"
                            aria-label="Seleccionar todas"
                            checked={activeSessions.length > 0 && selectedSessionIds.size === activeSessions.length}
                            onChange={toggleSelectAllSessions}
                            className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-primary-600 focus:ring-primary-500"
                          />
                        </TableHead>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Dispositivo</TableHead>
                        <TableHead>Ubicación</TableHead>
                        <TableHead>IP</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Conectado desde</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeSessions.map((session) => {
                        const userName = session.user?.nombre ?? session.user?.username ?? 'Sin nombre';
                        const userEmail = session.user?.email ?? '';
                        const ip = session.ipAddress ?? session.ip_address ?? '—';
                        const created = session.createdAt ?? session.created_at ?? '';
                        const isActive = session.active ?? session.is_active ?? false;
                        return (
                        <TableRow key={session.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                          <TableCell className="pr-0">
                            <input
                              type="checkbox"
                              role="checkbox"
                              aria-label={`Seleccionar sesión ${session.id}`}
                              checked={selectedSessionIds.has(session.id)}
                              onChange={() => toggleSessionSelection(session.id)}
                              className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-primary-600 focus:ring-primary-500"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-primary-500/10 dark:bg-primary-500/20 rounded-full flex items-center justify-center shrink-0">
                                <User className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-medium text-neutral-900 dark:text-neutral-100 truncate">{userName}</div>
                                <div className="text-xs text-neutral-500 truncate">{userEmail || `@${session.user?.username ?? ''}`}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center shrink-0">
                                {getDeviceIcon(session.device ?? '')}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate">{session.device || 'Desconocido'}</div>
                                <div className="text-xs text-neutral-500 truncate">{session.browser ?? session.operatingSystem ?? ''}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-neutral-500 flex-shrink-0" />
                              <div>
                                <div className="text-sm">{[session.city, session.country].filter(Boolean).join(', ') || 'Desconocido'}</div>
                                <div className="text-xs text-neutral-500">{session.region || ''}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded font-mono block w-fit">
                              {ip}
                            </code>
                          </TableCell>
                          <TableCell>
                            <Badge variant={isActive ? "success" : "error"}>
                              {isActive ? "Activa" : "Inactiva"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {created ? (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-neutral-500 flex-shrink-0" />
                                <div>
                                  <div className="text-sm">{new Date(created).toLocaleDateString()}</div>
                                  <div className="text-xs text-neutral-500">
                                    {new Date(created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>
                              </div>
                            ) : '—'}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleForceLogout(session.id)}
                              disabled={!isActive}
                              className="text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20"
                              title="Cerrar sesión"
                            >
                              <LogOut className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );})}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Paginación sesiones */}
          {!loading && totalSessions > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">
                    Mostrando {((sessionsPage - 1) * sessionsPageSize) + 1} a {Math.min(sessionsPage * sessionsPageSize, totalSessions)} de {totalSessions} sesiones
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSessionsPageChange(1)}
                      disabled={sessionsPage === 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSessionsPageChange(sessionsPage - 1)}
                      disabled={sessionsPage === 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPagesSessions) }, (_, i) => {
                        let pageNum: number;
                        if (totalPagesSessions <= 5) pageNum = i + 1;
                        else if (sessionsPage <= 3) pageNum = i + 1;
                        else if (sessionsPage >= totalPagesSessions - 2) pageNum = totalPagesSessions - 4 + i;
                        else pageNum = sessionsPage - 2 + i;
                        return (
                          <Button
                            key={pageNum}
                            variant={sessionsPage === pageNum ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => handleSessionsPageChange(pageNum)}
                            className="h-8 w-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSessionsPageChange(sessionsPage + 1)}
                      disabled={sessionsPage >= totalPagesSessions}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSessionsPageChange(totalPagesSessions)}
                      disabled={sessionsPage >= totalPagesSessions}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Connection Logs Tab */}
        <TabsContent value="connection-logs" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary-500" />
                  Historial de Conexiones
                  {!loading && (
                    <span className="text-sm font-normal text-neutral-500 ml-1">
                      ({connectionLogs.length})
                    </span>
                  )}
                </CardTitle>
                
                {/* Filters */}
                <div>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_RANGES.map(range => (
                        <SelectItem key={range.value} value={range.value}>
                          {range.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {connectionLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <History className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mb-4" />
                  <h3 className="yego-heading-4 mb-2">No hay registros de conexión</h3>
                  <p className="yego-body-sm max-w-md">
                    No se encontraron registros de conexión en el período seleccionado. Intenta con un rango de fechas diferente.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Acción</TableHead>
                        <TableHead>Dispositivo</TableHead>
                        <TableHead>Ubicación</TableHead>
                        <TableHead>IP</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Duración</TableHead>
                        <TableHead>Fecha</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {connectionLogs.map((log) => {
                        const logUser = log.user?.nombre ?? log.user?.username ?? '—';
                        const logCreated = log.createdAt ?? log.created_at ?? '';
                        const duration = log.sessionDuration ?? log.session_duration ?? 0;
                        const roleName = log.roleName ?? log.role_name ?? '—';
                        const ip = log.ipAddress ?? log.ip_address ?? '—';
                        return (
                        <TableRow key={log.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center shrink-0">
                                <User className="h-4 w-4 text-neutral-500" />
                              </div>
                              <div>
                                <div className="font-medium text-neutral-900 dark:text-neutral-100">{logUser}</div>
                                <div className="text-xs text-neutral-500">{log.user?.username ?? ''}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getActionBadgeVariant(log.action)}>
                              {getActionLabel(log.action)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center shrink-0">
                                {getDeviceIcon(log.device ?? '')}
                              </div>
                              <div>
                                <div className="text-sm font-medium">{log.device || 'Desconocido'}</div>
                                <div className="text-xs text-neutral-500">{log.browser || '—'}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{[log.city, log.country].filter(Boolean).join(', ') || '—'}</div>
                            <div className="text-xs text-neutral-500">{log.region || ''}</div>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded font-mono">
                              {ip}
                            </code>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{roleName}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{formatDuration(duration)}</span>
                          </TableCell>
                          <TableCell>
                            {logCreated ? (
                              <div>
                                <div className="text-sm">{new Date(logCreated).toLocaleDateString()}</div>
                                <div className="text-xs text-neutral-500">
                                  {new Date(logCreated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            ) : '—'}
                          </TableCell>
                        </TableRow>
                      );})}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SessionsModule;



