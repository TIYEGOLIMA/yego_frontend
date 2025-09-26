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
  CheckCircle,
  XCircle
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

const PermissionsModule: React.FC = () => {
  const authState = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [formData, setFormData] = useState<CreatePermissionData>({
    name: '',
    description: '',
    module: '',
    action: ''
  });

  const modules = [
    'users', 'roles', 'permissions', 'modules', 'imports', 
    'audit', 'configuration', 'sessions'
  ];

  const actions = ['create', 'read', 'update', 'delete'];

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/permissions');
      setPermissions(response.data);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePermission = async () => {
    try {
      await api.post('/permissions', formData);
      setIsCreateDialogOpen(false);
      setFormData({ name: '', description: '', module: '', action: '' });
      fetchPermissions();
    } catch (error) {
      console.error('Error creating permission:', error);
    }
  };

  const handleUpdatePermission = async (id: number) => {
    try {
      await api.patch(`/permissions/${id}`, formData);
      setEditingPermission(null);
      setFormData({ name: '', description: '', module: '', action: '' });
      fetchPermissions();
    } catch (error) {
      console.error('Error updating permission:', error);
    }
  };

  const handleDeletePermission = async (id: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este permiso?')) {
      try {
        await api.delete(`/permissions/${id}`);
        fetchPermissions();
      } catch (error) {
        console.error('Error deleting permission:', error);
      }
    }
  };

  const filteredPermissions = permissions.filter(permission => {
    const matchesSearch = permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         permission.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModule = selectedModule === 'all' || permission.module === selectedModule;
    return matchesSearch && matchesModule;
  });

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
    setFormData({ name: '', description: '', module: '', action: '' });
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

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                <Input
                  placeholder="Buscar permisos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Módulo</label>
              <Select value={selectedModule} onValueChange={setSelectedModule}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filtrar por módulo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los módulos</SelectItem>
                  {modules.map(module => (
                    <SelectItem key={module} value={module}>
                      {module.charAt(0).toUpperCase() + module.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permissions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary-500" />
            Permisos del Sistema
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
          ) : filteredPermissions.length === 0 ? (
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
                  {filteredPermissions.map((permission) => (
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
                        <div className="flex items-center gap-2">
                          {permission.active ? (
                            <CheckCircle className="h-4 w-4 text-success-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-error-500" />
                          )}
                          <Badge variant={permission.active ? "success" : "error"}>
                            {permission.active ? "Activo" : "Inactivo"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(permission)}
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePermission(permission.id)}
                            className="text-error-600 dark:text-error-400 hover:text-error-700 dark:hover:text-error-300"
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
                  {modules.map(module => (
                    <SelectItem key={module} value={module}>
                      {module.charAt(0).toUpperCase() + module.slice(1)}
                    </SelectItem>
                  ))}
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
                      {action.charAt(0).toUpperCase() + action.slice(1)}
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
    </div>
  );
};

export default PermissionsModule;



