import React, { useState, useEffect, useMemo } from 'react';
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
  Shield, 
  Search,
  Save,
  X,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Key
} from 'lucide-react';
import { useAuth } from "@/shared/hooks/useAuth";
import { api } from '../../../services';
import AccessRestricted from '@/shared/components/AccessRestricted';

interface Permission {
  id: number;
  name: string;
  description: string;
  module: string;
  action: string;
  conditions?: Record<string, any>;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreatePermissionData {
  name: string;
  description: string;
  module: string;
  action: string;
  conditions?: Record<string, any>;
}

interface ActiveModule {
  id: number;
  nombre: string;
  descripcion: string;
  url: string;
  estado: string;
  activo: boolean;
}

// Normalizar nombre del módulo para usarlo como valor
const normalizeModuleName = (nombre: string): string => {
  return nombre.toLowerCase()
    .trim()
    .replace(/\s+/g, '')
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/ñ/g, 'n');
};

const PermissionsModule: React.FC = () => {
  const authState = useAuth();
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [activeModules, setActiveModules] = useState<ActiveModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [permissionStatus, setPermissionStatus] = useState<'true' | 'false' | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [deleteModal, setDeleteModal] = useState<{open: boolean, permission: Permission | null}>({open: false, permission: null});
  const [formData, setFormData] = useState<CreatePermissionData>({
    name: '',
    description: '',
    module: '',
    action: ''
  });

  const actions = ['create', 'read', 'update', 'delete'];

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
  const resetFormData = () => ({
    name: '',
    description: '',
    module: '',
    action: ''
  });

  // Carga inicial única: módulos activos + permisos find-all en paralelo (sin duplicar llamadas)
  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();
    const load = async () => {
      try {
        const [modulesRes, permissionsRes] = await Promise.all([
          api.get('/modules/activos', { signal: ac.signal }),
          api.get('/permissions/find-all', { signal: ac.signal })
        ]);
        if (cancelled) return;
        setActiveModules(Array.isArray(modulesRes.data) ? modulesRes.data : []);
        setAllPermissions(Array.isArray(permissionsRes.data) ? permissionsRes.data : []);
      } catch (error) {
        if (cancelled) return;
        console.error('Error loading permissions page:', error);
        setActiveModules([]);
        setAllPermissions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, []);

  // Reset a página 1 cuando cambian filtros o búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedModule, selectedAction, permissionStatus]);

  // Filtrado y paginación en cliente (sin nuevas llamadas al API)
  const filteredPermissions = useMemo(() => {
    const searchLower = (searchTerm ?? '').trim().toLowerCase();
    return allPermissions.filter(permission => {
      const matchesSearch = !searchLower ||
        (permission.name ?? '').toLowerCase().includes(searchLower) ||
        (permission.description ?? '').toLowerCase().includes(searchLower) ||
        (permission.module ?? '').toLowerCase().includes(searchLower) ||
        (permission.action ?? '').toLowerCase().includes(searchLower);
      const moduleMatches = selectedModule === 'all' ||
        (permission.module ?? '').toLowerCase() === selectedModule ||
        normalizeModuleName(permission.module ?? '') === selectedModule;
      const matchesAction = selectedAction === 'all' || (permission.action === selectedAction);
      const matchesStatus = permissionStatus === 'all' ||
        permission.active === (permissionStatus === 'true');
      return matchesSearch && moduleMatches && matchesAction && matchesStatus;
    });
  }, [allPermissions, searchTerm, selectedModule, selectedAction, permissionStatus]);

  const totalPermissions = filteredPermissions.length;
  const permissions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPermissions.slice(start, start + itemsPerPage);
  }, [filteredPermissions, currentPage, itemsPerPage]);

  const refetchPermissions = async () => {
    try {
      const response = await api.get('/permissions/find-all');
      setAllPermissions(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error refetching permissions:', error);
    }
  };

  const refetchModulesAndPermissions = async () => {
    try {
      const [modulesRes, permissionsRes] = await Promise.all([
        api.get('/modules/activos'),
        api.get('/permissions/find-all')
      ]);
      setActiveModules(Array.isArray(modulesRes.data) ? modulesRes.data : []);
      setAllPermissions(Array.isArray(permissionsRes.data) ? permissionsRes.data : []);
    } catch (error) {
      console.error('Error refetching data:', error);
    }
  };

  const handleCreatePermission = async () => {
    try {
      const permissionData = {
        ...formData,
        name: `${formData.module}.${formData.action}`
      };
      await api.post('/permissions', permissionData);
      setIsCreateDialogOpen(false);
      setFormData(resetFormData());
      await refetchModulesAndPermissions();
    } catch (error) {
      console.error('Error creating permission:', error);
    }
  };

  const handleUpdatePermission = async (id: number) => {
    try {
      await api.put(`/permissions/${id}`, formData);
      setEditingPermission(null);
      setFormData(resetFormData());
      await refetchPermissions();
    } catch (error) {
      console.error('Error updating permission:', error);
    }
  };

  const handleDeletePermission = (permission: Permission) => {
    setDeleteModal({ open: true, permission });
  };

  const confirmDeletePermission = async () => {
    if (deleteModal.permission) {
      try {
        await api.delete(`/permissions/${deleteModal.permission.id}`);
        setDeleteModal({ open: false, permission: null });
        await refetchPermissions();
      } catch (error) {
        console.error('Error deleting permission:', error);
      }
    }
  };

  const totalPages = Math.ceil(totalPermissions / itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  const openEditDialog = (permission: Permission) => {
    setEditingPermission(permission);
    setFormData({
      name: permission.name,
      description: permission.description,
      module: permission.module,
      action: permission.action,
      conditions: permission.conditions
    });
  };

  const closeDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingPermission(null);
    setFormData(resetFormData());
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
            Gestión de Permisos
          </h1>
          <p className="yego-body">
            Administra los permisos del sistema (ACL dinámico)
          </p>
        </div>
        <Button 
          variant="primary"
          onClick={() => setIsCreateDialogOpen(true)}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Nuevo Permiso
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 w-5 h-5 pointer-events-none z-10" />
            <Input
              placeholder="Buscar permisos por nombre, descripción, módulo o acción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12"
            />
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-neutral-400" />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">Módulo:</span>
            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {activeModules.map(module => {
                  const normalizedName = normalizeModuleName(module.nombre);
                  return (
                    <SelectItem key={module.id} value={normalizedName}>
                      {module.nombre}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-700 dark:text-neutral-300">Acción:</span>
            <Select value={selectedAction} onValueChange={setSelectedAction}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {actions.map(action => (
                  <SelectItem key={action} value={action}>
                    {capitalize(action)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-700 dark:text-neutral-300">Estado:</span>
            <Select value={permissionStatus} onValueChange={(value) => setPermissionStatus(value as 'true' | 'false' | 'all')}>
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

      {/* Permissions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary-500" />
            Permisos del Sistema ({totalPermissions})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="yego-body-sm">Cargando permisos...</p>
              </div>
            </div>
          ) : permissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Shield className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mb-4" />
              <h3 className="yego-heading-4 mb-2">No se encontraron permisos</h3>
              <p className="yego-body-sm max-w-md">
                No hay permisos que coincidan con tu búsqueda. Intenta con otros términos o crea un nuevo permiso.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Módulo</TableHead>
                    <TableHead>Acción</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissions.map((permission) => (
                    <TableRow key={permission.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                      <TableCell className="font-medium text-neutral-900 dark:text-neutral-100">{permission.name}</TableCell>
                      <TableCell>{permission.description}</TableCell>
                      <TableCell>
                        <Badge variant="primary">
                          {permission.module}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {permission.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={permission.active ? "success" : "error"}>
                          {permission.active ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(permission)}
                            className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePermission(permission)}
                            className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      {/* Paginación */}
      {!loading && permissions.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, totalPermissions)} de {totalPermissions} permisos
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
                  {(() => {
                    const getPageNumbers = () => {
                      if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
                      if (currentPage <= 3) return [1, 2, 3, 4, 5];
                      if (currentPage >= totalPages - 2) return Array.from({ length: 5 }, (_, i) => totalPages - 4 + i);
                      return Array.from({ length: 5 }, (_, i) => currentPage - 2 + i);
                    };
                    
                    return getPageNumbers().map(pageNum => (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="h-8 w-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    ));
                  })()}
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
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen || !!editingPermission} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary-500" />
              {editingPermission ? 'Editar Permiso' : 'Crear Nuevo Permiso'}
            </DialogTitle>
            <DialogDescription>
              {editingPermission
                ? 'Edita los datos del permiso seleccionado.'
                : 'Completa el formulario para crear un nuevo permiso en el sistema.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Nombre</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="users.create"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Descripción</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Crear usuarios"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Módulo</label>
              <Select value={formData.module} onValueChange={(value) => setFormData({ ...formData, module: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar módulo" />
                </SelectTrigger>
                <SelectContent>
                  {activeModules.map(module => {
                    const normalizedName = normalizeModuleName(module.nombre);
                    return (
                      <SelectItem key={module.id} value={normalizedName}>
                        {module.nombre}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Acción</label>
              <Select value={formData.action} onValueChange={(value) => setFormData({ ...formData, action: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar acción" />
                </SelectTrigger>
                <SelectContent>
                  {actions.map(action => (
                    <SelectItem key={action} value={action}>
                      {capitalize(action)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              onClick={() => editingPermission ? handleUpdatePermission(editingPermission.id) : handleCreatePermission()}
              leftIcon={<Save className="h-4 w-4" />}
            >
              {editingPermission ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmación de Eliminación */}
      <Dialog 
        open={deleteModal.open} 
        onOpenChange={(open) => !open && setDeleteModal({open: false, permission: null})}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-error-600 dark:text-error-400">
              <Trash2 className="h-5 w-5" />
              Confirmar Eliminación
            </DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el permiso y todos sus datos.
            </DialogDescription>
          </DialogHeader>
          {deleteModal.permission && (
            <div className="py-4">
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-700 rounded-full flex items-center justify-center">
                    <Shield className="h-5 w-5 text-neutral-500" />
                  </div>
                  <div>
                    <div className="font-semibold text-neutral-900 dark:text-white">
                      {deleteModal.permission.description || deleteModal.permission.name}
                    </div>
                    <div className="text-sm text-neutral-500">
                      {deleteModal.permission.name}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setDeleteModal({open: false, permission: null})}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              variant="danger"
              onClick={confirmDeletePermission}
              className="flex-1"
            >
              Eliminar Permiso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PermissionsModule;



