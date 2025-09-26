import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Activity, 
  Search, 
  Calendar,
  User,
  Eye,
  Download,
  RefreshCw,
  Filter,
  Clock,
  Globe,
  Info
} from 'lucide-react';
import { useAuth } from "@/shared/hooks/useAuth";
import { api } from '../../../services';
import AccessRestricted from '@/shared/components/AccessRestricted';

interface AuditLog {
  id: number;
  userId: number;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  user?: {
    id: number;
    nombre: string;
    email: string;
  };
}

const AuditModule: React.FC = () => {
  const authState = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedResource, setSelectedResource] = useState<string>('all');
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const actions = [
    'all', 'create', 'read', 'update', 'delete', 'login', 'logout', 'export'
  ];

  const resources = [
    'all', 'users', 'roles', 'permissions', 'modules', 'imports', 'audit', 'configuration'
  ];

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/audit');
      const logs = response.data.logs || response.data;
      setAuditLogs(Array.isArray(logs) ? logs : []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      setAuditLogs([]); // Establecer array vacío en caso de error
    } finally {
      setLoading(false);
    }
  };

  const openDetailsDialog = (log: AuditLog) => {
    setSelectedLog(log);
    setIsDetailsDialogOpen(true);
  };

  const closeDetailsDialog = () => {
    setIsDetailsDialogOpen(false);
    setSelectedLog(null);
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'create':
        return <Badge variant="success">Crear</Badge>;
      case 'read':
        return <Badge variant="secondary">Leer</Badge>;
      case 'update':
        return <Badge variant="primary">Actualizar</Badge>;
      case 'delete':
        return <Badge variant="error">Eliminar</Badge>;
      case 'login':
        return <Badge variant="primary">Login</Badge>;
      case 'logout':
        return <Badge variant="secondary">Logout</Badge>;
      case 'export':
        return <Badge variant="warning">Exportar</Badge>;
      default:
        return <Badge variant="secondary">{action}</Badge>;
    }
  };

  const getResourceBadge = (resource: string) => {
    const resourceLabels: Record<string, string> = {
      'users': 'Usuarios',
      'roles': 'Roles',
      'permissions': 'Permisos',
      'modules': 'Módulos',
      'imports': 'Importaciones',
      'audit': 'Auditoría',
      'configuration': 'Configuración'
    };
    
    return <Badge variant="outline">{resourceLabels[resource] || resource}</Badge>;
  };

  const filteredLogs = (Array.isArray(auditLogs) ? auditLogs : []).filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ipAddress.includes(searchTerm);
    
    const matchesAction = selectedAction === 'all' || log.action === selectedAction;
    const matchesResource = selectedResource === 'all' || log.resource === selectedResource;
    
    return matchesSearch && matchesAction && matchesResource;
  });

  if (!authState || !authState.isAuthenticated) {
    return <AccessRestricted />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="yego-heading-1 mb-2">
            Auditoría del Sistema
          </h1>
          <p className="yego-body">
            Registro de todas las acciones realizadas en el sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="secondary"
            onClick={fetchAuditLogs}
            disabled={loading}
            leftIcon={loading ? undefined : <RefreshCw className="h-4 w-4" />}
            loading={loading}
          >
            Actualizar
          </Button>
          <Button 
            variant="secondary"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={() => {
              // Implementar exportación
              alert('Función de exportación en desarrollo');
            }}
          >
            Exportar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                <Input
                  placeholder="Buscar en auditoría..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div>
                <label className="yego-label">Acción</label>
                <Select value={selectedAction} onValueChange={setSelectedAction}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filtrar por acción" />
                  </SelectTrigger>
                  <SelectContent>
                    {actions.map(action => (
                      <SelectItem key={action} value={action}>
                        {action === 'all' ? 'Todas las acciones' : action.charAt(0).toUpperCase() + action.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="yego-label">Recurso</label>
                <Select value={selectedResource} onValueChange={setSelectedResource}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filtrar por recurso" />
                  </SelectTrigger>
                  <SelectContent>
                    {resources.map(resource => (
                      <SelectItem key={resource} value={resource}>
                        {resource === 'all' ? 'Todos los recursos' : resource.charAt(0).toUpperCase() + resource.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary-500" />
            Registros de Auditoría
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="yego-body-sm">Cargando registros de auditoría...</p>
              </div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Filter className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mb-4" />
              <h3 className="yego-heading-4 mb-2">No se encontraron registros</h3>
              <p className="yego-body-sm max-w-md">
                No hay registros de auditoría que coincidan con los filtros seleccionados. Intenta con otros criterios de búsqueda.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Acción</TableHead>
                    <TableHead>Recurso</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-neutral-500">
                          <Calendar className="w-3 h-3 flex-shrink-0" />
                          <div>
                            <span className="font-medium">{new Date(log.createdAt).toLocaleDateString()}</span>
                            <span className="text-xs ml-2">
                              {new Date(log.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-neutral-500" />
                          </div>
                          <div>
                            <div className="font-medium text-neutral-900 dark:text-neutral-100">
                              {log.user?.nombre || 'Sistema'}
                            </div>
                            <div className="text-xs text-neutral-500">
                              ID: {log.userId || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell>{getResourceBadge(log.resource)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Globe className="w-3 h-3 text-neutral-500" />
                          <code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">
                            {log.ipAddress}
                          </code>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDetailsDialog(log)}
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                        >
                          <Eye className="w-4 h-4" />
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

      {/* Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={closeDetailsDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary-500" />
              Detalles del Registro de Auditoría
            </DialogTitle>
            <DialogDescription>
              Información detallada sobre la acción registrada en el sistema.
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-6 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">ID del Registro</label>
                  <p className="text-sm text-neutral-900 dark:text-neutral-100 font-mono bg-neutral-100 dark:bg-neutral-800 px-3 py-2 rounded">{selectedLog.id}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Fecha y Hora</label>
                  <div className="flex items-center gap-2 text-sm text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800 px-3 py-2 rounded">
                    <Clock className="h-4 w-4 text-neutral-500" />
                    <span>{new Date(selectedLog.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Usuario</label>
                <div className="flex items-center gap-3 bg-neutral-100 dark:bg-neutral-800 p-3 rounded">
                  <div className="w-10 h-10 bg-neutral-200 dark:bg-neutral-700 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-neutral-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{selectedLog.user?.nombre || 'Usuario eliminado'}</p>
                    <p className="text-xs text-neutral-500">{selectedLog.user?.email || 'N/A'}</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Acción</label>
                  <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 px-3 py-2 rounded">
                    {getActionBadge(selectedLog.action)}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Recurso</label>
                  <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 px-3 py-2 rounded">
                    {getResourceBadge(selectedLog.resource)}
                    {selectedLog.resourceId && (
                      <span className="text-xs text-neutral-500">ID: {selectedLog.resourceId}</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Dirección IP</label>
                <div className="flex items-center gap-2 text-sm text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800 px-3 py-2 rounded">
                  <Globe className="h-4 w-4 text-neutral-500" />
                  <code className="font-mono">{selectedLog.ipAddress}</code>
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">User Agent</label>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 p-3 rounded break-all font-mono">
                  {selectedLog.userAgent}
                </p>
              </div>
              
              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Detalles Adicionales</label>
                  <pre className="text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 p-3 rounded overflow-auto font-mono max-h-40">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditModule;



