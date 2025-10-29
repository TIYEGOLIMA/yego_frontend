import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  CheckCircle,
  AlertCircle,
  Globe,
  Save,
  X,
  AlertTriangle,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { useAuth } from "@/shared/hooks/useAuth";
import { api } from '../../../services';
import AccessRestricted from '@/shared/components/AccessRestricted';
import SocketService from '../../../services/socket-service';

// Interfaces para Sistemas Internos
interface SistemaExternoResponse {
  id: number;
  nombre: string;
  descripcion: string;
  url: string; // Campo que envía el backend
  estado: 'ACTIVO' | 'MANTENIMIENTO' | 'ERROR' | 'INACTIVO';
  tipo: string;
  ultimoCheck: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateSistemaExternoData {
  nombre: string;
  descripcion: string;
  url: string;
}

interface SistemaEstadoCambiadoEvent {
  sistemaId: number;
  nombre: string;
  path: string;
  urlCompleta: string;
  estadoAnterior: string;
  estadoNuevo: string;
  tipo: string;
  timestamp: string;
}

interface SistemaVerificadoEvent {
  sistemaId: number;
  nombre: string;
  path: string;
  urlCompleta: string;
  estado: string;
  tipo: string;
  timestamp: string;
  exitoso: boolean;
  mensaje: string;
}

const SistemasExternosModule: React.FC = () => {
  const authState = useAuth();
  const [sistemas, setSistemas] = useState<SistemaExternoResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'true' | 'false'>('all');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSistema, setEditingSistema] = useState<SistemaExternoResponse | null>(null);
  const [notifications, setNotifications] = useState<Array<{id: string, message: string, type: 'success' | 'error' | 'warning'}>>([]);

  const [isConnected, setIsConnected] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{open: boolean, sistema: SistemaExternoResponse | null}>({open: false, sistema: null});

  const [formData, setFormData] = useState<CreateSistemaExternoData>({
    nombre: '',
    descripcion: '',
    url: ''
  });

  // Función para formatear timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('es-PE');
  };


  // Configurar WebSocket usando el servicio centralizado
  useEffect(() => {
    const handleStatusChange = (status: string) => {
      setIsConnected(status === 'connected');
    };

    // Suscribirse a cambios de estado del socket
    SocketService.onStatusChange(handleStatusChange);
    
    // Obtener estado actual
    setIsConnected(SocketService.getConnectionStatus() === 'connected');

    // Suscribirse a eventos de sistemas internos
    SocketService.on('sistemas-externos', handleSistemaEvent);
    SocketService.on('sistema-estado-cambiado', handleEstadoCambiado);
    SocketService.on('sistema-verificado', handleSistemaVerificado);

    return () => {
      SocketService.offStatusChange(handleStatusChange);
      SocketService.off('sistemas-externos', handleSistemaEvent);
      SocketService.off('sistema-estado-cambiado', handleEstadoCambiado);
      SocketService.off('sistema-verificado', handleSistemaVerificado);
    };
  }, []);


  const handleSistemaEvent = (event: any) => {
    console.log('📡 Evento de sistema recibido:', event);
    fetchSistemas(); // Actualizar la lista
  };

  const handleEstadoCambiado = (event: SistemaEstadoCambiadoEvent) => {
    console.log('🔄 Estado cambiado:', event);
    
    // Actualizar el sistema en la lista
    setSistemas(prev => prev.map(sistema => 
      sistema.id === event.sistemaId 
        ? { ...sistema, estado: event.estadoNuevo as any, updatedAt: event.timestamp }
        : sistema
    ));

    // Mostrar notificación
    showNotification(
      `${event.nombre} cambió de ${event.estadoAnterior} a ${event.estadoNuevo}`,
      event.estadoNuevo === 'ERROR' ? 'error' : 'success'
    );
  };

  const handleSistemaVerificado = (event: SistemaVerificadoEvent) => {
    console.log('✅ Sistema verificado:', event);
    
    
    if (event.exitoso) {
      showNotification(`${event.nombre} está funcionando correctamente`, 'success');
    } else {
      showNotification(`${event.nombre} no responde: ${event.mensaje}`, 'error');
    }

    // Actualizar último check
    setSistemas(prev => prev.map(sistema => 
      sistema.id === event.sistemaId 
        ? { ...sistema, ultimoCheck: event.timestamp }
        : sistema
    ));
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'warning') => {
    const id = Date.now().toString();
    const notification = { id, message, type };
    
    setNotifications(prev => [...prev, notification]);
    
    // Remover notificación después de 5 segundos
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);

    // Sonido de alerta para errores
    if (type === 'error') {
      // Aquí puedes agregar sonido de alerta
      console.log('🔔 Alerta de error:', message);
    }
  };


  useEffect(() => {
    fetchSistemas();
  }, []);

  const fetchSistemas = async () => {
    try {
      setLoading(true);
      const response = await api.get('/modules');
      setSistemas(response.data);
    } catch (error) {
      console.error('Error fetching módulos internos:', error);
      showNotification('Error al cargar módulos internos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSistema = async () => {
    try {
      const dataToSend = {
        ...formData,
        tipo: 'GARANTIZADO',
        activo: true
      };
      await api.post('/modules', dataToSend);
      setIsCreateDialogOpen(false);
      setFormData({
        nombre: '',
        descripcion: '',
        url: ''
      });
      fetchSistemas();
    } catch (error: any) {
      console.error('Error creating sistema interno:', error);
      showNotification(error.response?.data?.message || 'Error al crear sistema interno', 'error');
    }
  };

  const handleUpdateSistema = async (id: number) => {
    try {
      const dataToSend = {
        ...formData,
        tipo: 'GARANTIZADO',
        activo: true
      };
      await api.put(`/modules/${id}`, dataToSend);
      setEditingSistema(null);
      setFormData({
        nombre: '',
        descripcion: '',
        url: ''
      });
      fetchSistemas();
    } catch (error: any) {
      console.error('Error updating sistema interno:', error);
      showNotification(error.response?.data?.message || 'Error al actualizar sistema interno', 'error');
    }
  };

  const handleDeleteSistema = (sistema: SistemaExternoResponse) => {
    setDeleteModal({ open: true, sistema });
  };

  const confirmDeleteSistema = async () => {
    if (deleteModal.sistema) {
      try {
        await api.delete(`/modules/${deleteModal.sistema.id}`);
        setDeleteModal({ open: false, sistema: null });
      fetchSistemas();
      } catch (error: any) {
        console.error('Error deleting sistema interno:', error);
        showNotification(error.response?.data?.message || 'Error al eliminar sistema interno', 'error');
      }
    }
  };



  const handleToggleActive = async (sistema: SistemaExternoResponse) => {
    const nuevoEstado = !sistema.activo;
    
    try {
      console.log(`🔄 Cambiando estado del sistema "${sistema.nombre}" de ${sistema.activo ? 'ACTIVO' : 'INACTIVO'} a ${nuevoEstado ? 'ACTIVO' : 'INACTIVO'}`);
      
      // Actualizar el estado local inmediatamente para una mejor UX
      setSistemas(prevSistemas => 
        prevSistemas.map(s => 
          s.id === sistema.id 
            ? { ...s, activo: nuevoEstado, updatedAt: new Date().toISOString() }
            : s
        )
      );
      
      // Enviar petición al backend para cambiar el estado
      await api.put(`/modules/${sistema.id}/toggle-active`, {
        activo: nuevoEstado
      });
      
      // Cambio realizado exitosamente
      
    } catch (error: any) {
      console.error('❌ Error cambiando estado del sistema:', error);
      
      // Revertir el cambio local si hay error
      setSistemas(prevSistemas => 
        prevSistemas.map(s => 
          s.id === sistema.id 
            ? { ...s, activo: sistema.activo, updatedAt: sistema.updatedAt }
            : s
        )
      );
      
      showNotification(error.response?.data?.message || 'Error al cambiar estado del sistema', 'error');
    }
  };

  const filteredSistemas = sistemas.filter(sistema => {
    const matchesSearch = sistema.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sistema.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sistema.url.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'true' && sistema.activo) ||
                         (statusFilter === 'false' && !sistema.activo);
    
    return matchesSearch && matchesStatus;
  });

  // Calcular paginación
  const totalPages = Math.ceil(filteredSistemas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSistemas = filteredSistemas.slice(startIndex, endIndex);

  // Handlers para paginación
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const openEditDialog = (sistema: SistemaExternoResponse) => {
    setEditingSistema(sistema);
    setFormData({
      nombre: sistema.nombre,
      descripcion: sistema.descripcion,
      url: sistema.url || '' // Usar el campo url que envía el backend
    });
  };

  const closeDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingSistema(null);
    setFormData({
      nombre: '',
      descripcion: '',
      url: ''
    });
  };

  if (!authState || !authState.isAuthenticated) {
    return <AccessRestricted />;
  }

  return (
    <div className="space-y-6">
      {/* Notificaciones */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg shadow-lg max-w-sm ${
                notification.type === 'success' ? 'bg-green-500 text-white' :
                notification.type === 'error' ? 'bg-red-500 text-white' :
                'bg-orange-500 text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                {notification.type === 'success' ? <CheckCircle className="h-5 w-5" /> :
                 notification.type === 'error' ? <AlertTriangle className="h-5 w-5" /> :
                 <AlertCircle className="h-5 w-5" />}
                <span className="text-sm font-medium">{notification.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="yego-heading-1 mb-2">
            Módulos Internos
          </h1>
          <p className="yego-body">
            Gestión y monitoreo de módulos internos de Yego Integral en tiempo real
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              WebSocket {isConnected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
        </div>
        <Button 
          variant="primary"
          onClick={() => setIsCreateDialogOpen(true)}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Nuevo Módulo
        </Button>
      </div>


      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
            <Input
              placeholder="Buscar módulos internos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-neutral-400" />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">Estado:</span>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | 'true' | 'false')}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Activos</SelectItem>
                <SelectItem value="false">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-700 dark:text-neutral-300">Por página:</span>
            <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Sistemas Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary-500" />
            Módulos Internos ({filteredSistemas.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="yego-body-sm">Cargando módulos internos...</p>
              </div>
            </div>
          ) : filteredSistemas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Globe className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mb-4" />
              <h3 className="yego-heading-4 mb-2">No se encontraron módulos</h3>
              <p className="yego-body-sm max-w-md">
                No hay módulos internos que coincidan con tu búsqueda. Intenta con otros términos o crea un nuevo módulo.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Path</TableHead>
                      <TableHead>Último Check</TableHead>
                      <TableHead>Activo</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSistemas.map((sistema) => (
                    <TableRow key={sistema.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                      <TableCell className="font-medium text-neutral-900 dark:text-neutral-100">
                        {sistema.nombre}
                      </TableCell>
                      <TableCell>{sistema.descripcion}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded font-mono">
                            {sistema.url || 'Sin URL'}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(sistema.url, '_blank')}
                            className="p-1 h-6 w-6"
                            disabled={!sistema.url}
                          >
                            <Globe className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {sistema.ultimoCheck ? formatTimestamp(sistema.ultimoCheck) : 'Nunca'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={sistema.activo}
                          onCheckedChange={() => handleToggleActive(sistema)}
                          className="data-[state=checked]:bg-green-600"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(sistema)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {authState.isSuperAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSistema(sistema)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">
                    Mostrando {startIndex + 1} a {Math.min(endIndex, filteredSistemas.length)} de {filteredSistemas.length} módulos
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
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
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage === totalPages}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen || !!editingSistema} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary-500" />
              {editingSistema ? 'Editar Módulo Interno' : 'Crear Nuevo Módulo Interno'}
            </DialogTitle>
            <DialogDescription>
              {editingSistema
                ? 'Edita los datos del módulo interno seleccionado.'
                : 'Completa el formulario para crear un nuevo módulo interno de Yego Integral.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Nombre</label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Módulo Garantizado"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Descripción</label>
              <Input
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Módulo de garantías de Yego"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">URL</label>
              <Input
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="http://localhost:8081/api/pagos"
              />
            </div>
            
          </div>
          
          <DialogFooter className="mt-6">
            <Button 
              variant="secondary" 
              onClick={closeDialog}
              leftIcon={<X className="h-4 w-4" />}
            >
              Cancelar
            </Button>
            <Button 
              variant="primary"
              onClick={() => editingSistema ? handleUpdateSistema(editingSistema.id) : handleCreateSistema()}
              leftIcon={<Save className="h-4 w-4" />}
            >
              {editingSistema ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmación de Eliminación */}
      <Dialog open={deleteModal.open} onOpenChange={() => setDeleteModal({open: false, sistema: null})}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-error-600 dark:text-error-400">
              <Trash2 className="h-5 w-5" />
              Confirmar Eliminación
            </DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el módulo interno y todos sus datos.
            </DialogDescription>
          </DialogHeader>
          {deleteModal.sistema && (
            <div className="py-4">
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-700 rounded-full flex items-center justify-center">
                    <Globe className="h-5 w-5 text-neutral-500" />
                  </div>
                  <div>
                    <div className="font-semibold text-neutral-900 dark:text-white">
                      {deleteModal.sistema.nombre}
                    </div>
                    <div className="text-sm text-neutral-500">
                      {deleteModal.sistema.descripcion}
                    </div>
                    <div className="text-xs text-neutral-400 mt-1">
                      {deleteModal.sistema.url} • {deleteModal.sistema.tipo}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setDeleteModal({open: false, sistema: null})}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              variant="danger"
              onClick={confirmDeleteSistema}
              className="flex-1"
            >
              Eliminar Módulo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SistemasExternosModule;
