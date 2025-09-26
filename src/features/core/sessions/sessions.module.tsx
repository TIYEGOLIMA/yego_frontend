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
  Globe, 
  Clock,
  LogOut,
  RefreshCw,
  History,
  User,
  Shield,
  Laptop,
  Smartphone,
  Tablet,
  Calendar,
} from 'lucide-react';
import { useAuth } from "@/shared/hooks/useAuth";
import { api } from '../../../services';
import AccessRestricted from '@/shared/components/AccessRestricted';

interface Session {
  id: number;
  user_id: number;
  user: {
    username: string;
    nombre: string;
    email: string;
  };
  ip_address: string;
  device: string;
  browser: string;
  operating_system: string;
  city: string;
  region: string;
  country: string;
  country_code: string;
  latitude: number;
  longitude: number;
  timezone: string;
  isp: string;
  organization: string;
  is_active: boolean;
  created_at: string;
  expires_at: string;
}

interface ConnectionLog {
  id: number;
  user_id: number;
  user: {
    username: string;
    nombre: string;
  };
  session_id: number;
  action: 'login' | 'logout' | 'timeout' | 'forced_logout';
  ip_address: string;
  device: string;
  browser: string;
  operating_system: string;
  city: string;
  region: string;
  country: string;
  role_name: string;
  session_duration: number;
  created_at: string;
}

const SessionsModule: React.FC = () => {
  const authState = useAuth();
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [connectionLogs, setConnectionLogs] = useState<ConnectionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30');

  const filters = [
    { value: 'all', label: 'Todas las sesiones' },
    { value: 'active', label: 'Sesiones activas' },
    { value: 'expired', label: 'Sesiones expiradas' }
  ];

  const dateRanges = [
    { value: '7', label: 'Últimos 7 días' },
    { value: '30', label: 'Últimos 30 días' },
    { value: '90', label: 'Últimos 90 días' }
  ];

  useEffect(() => {
    fetchActiveSessions();
    fetchConnectionLogs();
  }, [selectedFilter, dateRange]);

  const fetchActiveSessions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/sessions', {
        params: { 
          filter: selectedFilter,
          limit: 50 
        }
      });
      setActiveSessions(response.data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConnectionLogs = async () => {
    try {
      const response = await api.get('/sessions/connection-logs', {
        params: { 
          days: dateRange,
          limit: 50 
        }
      });
      setConnectionLogs(response.data);
    } catch (error) {
      console.error('Error fetching connection logs:', error);
    }
  };

  const handleForceLogout = async (sessionId: number) => {
    try {
      await api.post(`/sessions/${sessionId}/force-logout`);
      fetchActiveSessions(); // Refresh the list
    } catch (error) {
      console.error('Error forcing logout:', error);
      alert('Error al cerrar la sesión');
    }
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'login': return 'primary';
      case 'logout': return 'secondary';
      case 'timeout': return 'error';
      case 'forced_logout': return 'error';
      default: return 'outline';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'login': return 'Login';
      case 'logout': return 'Logout';
      case 'timeout': return 'Timeout';
      case 'forced_logout': return 'Forzado';
      default: return action;
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getDeviceIcon = (device: string) => {
    const deviceLower = device?.toLowerCase() || '';
    if (deviceLower.includes('mobile') || deviceLower.includes('phone')) {
      return <Smartphone className="h-4 w-4" />;
    } else if (deviceLower.includes('tablet') || deviceLower.includes('ipad')) {
      return <Tablet className="h-4 w-4" />;
    } else {
      return <Laptop className="h-4 w-4" />;
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
            onClick={fetchActiveSessions}
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
                </CardTitle>
                
                {/* Filters */}
                <div>
                  <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {filters.map(filter => (
                        <SelectItem key={filter.value} value={filter.value}>
                          {filter.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      {activeSessions.map((session) => (
                        <TableRow key={session.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
                                <User className="h-4 w-4 text-neutral-500" />
                              </div>
                              <div>
                                <div className="font-medium text-neutral-900 dark:text-neutral-100">{session.user.nombre}</div>
                                <div className="text-xs text-neutral-500">{session.user.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
                                {getDeviceIcon(session.device)}
                              </div>
                              <div>
                                <div className="text-sm font-medium">{session.device}</div>
                                <div className="text-xs text-neutral-500">{session.browser}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-neutral-500 flex-shrink-0" />
                              <div>
                                <div className="text-sm">{session.city || 'Desconocido'}, {session.country || 'Desconocido'}</div>
                                <div className="text-xs text-neutral-500">{session.region || 'Región desconocida'}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4 text-neutral-500 flex-shrink-0" />
                              <code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded font-mono">
                                {session.ip_address}
                              </code>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={session.is_active ? "success" : "error"}>
                              {session.is_active ? "Activa" : "Inactiva"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-neutral-500 flex-shrink-0" />
                              <div>
                                <div className="text-sm">{new Date(session.created_at).toLocaleDateString()}</div>
                                <div className="text-xs text-neutral-500">
                                  {new Date(session.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleForceLogout(session.id)}
                              disabled={!session.is_active}
                              className="text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20"
                            >
                              <LogOut className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Connection Logs Tab */}
        <TabsContent value="connection-logs" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary-500" />
                  Historial de Conexiones
                </CardTitle>
                
                {/* Filters */}
                <div>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dateRanges.map(range => (
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
                      {connectionLogs.map((log) => (
                        <TableRow key={log.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
                                <User className="h-4 w-4 text-neutral-500" />
                              </div>
                              <div>
                                <div className="font-medium text-neutral-900 dark:text-neutral-100">{log.user.nombre}</div>
                                <div className="text-xs text-neutral-500">{log.user.username}</div>
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
                              <div className="w-7 h-7 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
                                {getDeviceIcon(log.device)}
                              </div>
                              <div>
                                <div className="text-sm font-medium">{log.device || 'Desconocido'}</div>
                                <div className="text-xs text-neutral-500">{log.browser || 'Desconocido'}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-neutral-500 flex-shrink-0" />
                              <div>
                                <div className="text-sm">{log.city || 'Desconocido'}, {log.country || 'Desconocido'}</div>
                                <div className="text-xs text-neutral-500">{log.region || 'Región desconocida'}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4 text-neutral-500 flex-shrink-0" />
                              <code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded font-mono">
                                {log.ip_address}
                              </code>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-neutral-500 flex-shrink-0" />
                              <Badge variant="outline">
                                {log.role_name || 'Sin rol'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-neutral-500 flex-shrink-0" />
                              <span className="text-sm">{formatDuration(log.session_duration)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-neutral-500 flex-shrink-0" />
                              <div>
                                <div className="text-sm">{new Date(log.created_at).toLocaleDateString()}</div>
                                <div className="text-xs text-neutral-500">
                                  {new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
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



