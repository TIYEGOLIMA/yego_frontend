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
  Search,
  ToggleLeft,
  ToggleRight,
  Eye,
  EyeOff,
  Save,
  X,
  Database,
  Filter
} from 'lucide-react';
import { useAuth } from "@/shared/hooks/useAuth";
import api from "@/services/api";
import AccessRestricted from '@/shared/components/AccessRestricted';

interface Module {
  id: number;
  name: string;
  description: string;
  route: string;
  icon: string;
  order: number;
  active: boolean;
  visible: boolean;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

interface CreateModuleData {
  name: string;
  description: string;
  route: string;
  icon: string;
  order: number;
  active: boolean;
  visible: boolean;
  permissions: string[];
}

const ModulesModule: React.FC = () => {
  const authState = useAuth();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [formData, setFormData] = useState<CreateModuleData>({
    name: '',
    description: '',
    route: '',
    icon: '',
    order: 0,
    active: true,
    visible: true,
    permissions: []
  });

  const availableIcons = [
    'users', 'settings', 'shield', 'file-text', 'upload', 
    'layers', 'database', 'activity', 'calendar', 'bar-chart',
    'home', 'user', 'lock', 'unlock', 'eye', 'eye-off'
  ];

  const availablePermissions = [
    'users.create', 'users.read', 'users.update', 'users.delete',
    'roles.create', 'roles.read', 'roles.update', 'roles.delete',
    'permissions.create', 'permissions.read', 'permissions.update', 'permissions.delete',
    'modules.create', 'modules.read', 'modules.update', 'modules.delete',
    'imports.create', 'imports.read', 'imports.update', 'imports.delete'
  ];

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      setLoading(true);
      const response = await api.get('/modules/all');
      setModules(response.data);
    } catch (error) {
      console.error('Error fetching modules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateModule = async () => {
    try {
      await api.post('/modules', formData);
      setIsCreateDialogOpen(false);
      setFormData({
        name: '',
        description: '',
        route: '',
        icon: '',
        order: 0,
        active: true,
        visible: true,
        permissions: []
      });
      fetchModules();
    } catch (error) {
      console.error('Error creating module:', error);
    }
  };

  const handleUpdateModule = async (id: number) => {
    try {
      await api.patch(`/modules/${id}`, formData);
      setEditingModule(null);
      setFormData({
        name: '',
        description: '',
        route: '',
        icon: '',
        order: 0,
        active: true,
        visible: true,
        permissions: []
      });
      fetchModules();
    } catch (error) {
      console.error('Error updating module:', error);
    }
  };

  const handleDeleteModule = async (id: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este módulo?')) {
      try {
        await api.delete(`/modules/${id}`);
        fetchModules();
      } catch (error) {
        console.error('Error deleting module:', error);
      }
    }
  };

  const handleToggleActive = async (module: Module) => {
    try {
      await api.patch(`/modules/${module.id}`, {
        active: !module.active
      });
      fetchModules();
    } catch (error) {
      console.error('Error toggling module status:', error);
    }
  };

  const handleToggleVisible = async (module: Module) => {
    try {
      await api.patch(`/modules/${module.id}`, {
        visible: !module.visible
      });
      fetchModules();
    } catch (error) {
      console.error('Error toggling module visibility:', error);
    }
  };

  const filteredModules = modules.filter(module => {
    // Filtrar por búsqueda
    const matchesSearch = module.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         module.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtrar por estado activo/inactivo
    const matchesStatus = showInactive ? true : module.active;
    
    return matchesSearch && matchesStatus;
  });

  const openEditDialog = (module: Module) => {
    setEditingModule(module);
    setFormData({
      name: module.name,
      description: module.description,
      route: module.route,
      icon: module.icon,
      order: module.order,
      active: module.active,
      visible: module.visible,
      permissions: module.permissions
    });
  };

  const closeDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingModule(null);
    setFormData({
      name: '',
      description: '',
      route: '',
      icon: '',
      order: 0,
      active: true,
      visible: true,
      permissions: []
    });
  };

  const handlePermissionToggle = (permission: string) => {
    const currentPermissions = formData.permissions;
    const newPermissions = currentPermissions.includes(permission)
      ? currentPermissions.filter(p => p !== permission)
      : [...currentPermissions, permission];
    
    setFormData({ ...formData, permissions: newPermissions });
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
            Gestión de Módulos
          </h1>
          <p className="yego-body">
            Administra los módulos del sistema de forma dinámica
          </p>
        </div>
        <Button 
          variant="primary"
          onClick={() => setIsCreateDialogOpen(true)}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Nuevo Módulo
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
              <Input
                placeholder="Buscar módulos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={showInactive ? "primary" : "secondary"}
              size="sm"
              onClick={() => setShowInactive(!showInactive)}
              leftIcon={<Filter className="h-4 w-4" />}
              className="whitespace-nowrap"
            >
              {showInactive ? "Ocultar inactivos" : "Mostrar inactivos"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modules Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary-500" />
            Módulos del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="yego-body-sm">Cargando módulos...</p>
              </div>
            </div>
          ) : filteredModules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Database className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mb-4" />
              <h3 className="yego-heading-4 mb-2">No se encontraron módulos</h3>
              <p className="yego-body-sm max-w-md">
                No hay módulos que coincidan con tu búsqueda. Intenta con otros términos o crea un nuevo módulo.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Orden</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Ruta</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Visibilidad</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredModules.map((module) => (
                    <TableRow key={module.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                      <TableCell>{module.order}</TableCell>
                      <TableCell className="font-medium text-neutral-900 dark:text-neutral-100">{module.name}</TableCell>
                      <TableCell>{module.description}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded font-mono">
                          {module.route}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(module)}
                            className={module.active ? 'text-success-600 dark:text-success-400' : 'text-error-600 dark:text-error-400'}
                          >
                            {module.active ? (
                              <ToggleRight className="h-5 w-5" />
                            ) : (
                              <ToggleLeft className="h-5 w-5" />
                            )}
                          </Button>
                          <Badge variant={module.active ? "success" : "error"}>
                            {module.active ? "Activo" : "Inactivo"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleVisible(module)}
                            className={module.visible ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-500 dark:text-neutral-500'}
                          >
                            {module.visible ? (
                              <Eye className="h-5 w-5" />
                            ) : (
                              <EyeOff className="h-5 w-5" />
                            )}
                          </Button>
                          <Badge variant={module.visible ? "primary" : "secondary"}>
                            {module.visible ? "Visible" : "Oculto"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(module)}
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteModule(module.id)}
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
      <Dialog open={isCreateDialogOpen || !!editingModule} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary-500" />
              {editingModule ? 'Editar Módulo' : 'Crear Nuevo Módulo'}
            </DialogTitle>
            <DialogDescription>
              {editingModule
                ? 'Edita los datos del módulo seleccionado.'
                : 'Completa el formulario para crear un nuevo módulo en el sistema.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Nombre</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Gestión de Usuarios"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Orden</label>
                <Input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  placeholder="1"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Descripción</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Administrar usuarios del sistema"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Ruta</label>
              <Input
                value={formData.route}
                onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                placeholder="/users"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Icono</label>
              <Select value={formData.icon} onValueChange={(value) => setFormData({ ...formData, icon: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar icono" />
                </SelectTrigger>
                <SelectContent>
                  {availableIcons.map(icon => (
                    <SelectItem key={icon} value={icon}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-neutral-100 dark:bg-neutral-800 rounded-md flex items-center justify-center">
                          <span className="text-neutral-700 dark:text-neutral-300">{icon}</span>
                        </div>
                        <span>{icon}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded border-neutral-300 dark:border-neutral-700 text-primary-500 focus:ring-primary-500 dark:bg-neutral-700"
                />
                <label htmlFor="active" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Activo</label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="visible"
                  checked={formData.visible}
                  onChange={(e) => setFormData({ ...formData, visible: e.target.checked })}
                  className="rounded border-neutral-300 dark:border-neutral-700 text-primary-500 focus:ring-primary-500 dark:bg-neutral-700"
                />
                <label htmlFor="visible" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Visible</label>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Permisos Requeridos</label>
              <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto border border-neutral-200 dark:border-neutral-700 rounded-lg p-3">
                {availablePermissions.map(permission => (
                  <div key={permission} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={permission}
                      checked={formData.permissions.includes(permission)}
                      onChange={() => handlePermissionToggle(permission)}
                      className="rounded border-neutral-300 dark:border-neutral-700 text-primary-500 focus:ring-primary-500 dark:bg-neutral-700"
                    />
                    <label htmlFor={permission} className="text-sm text-neutral-700 dark:text-neutral-300">{permission}</label>
                  </div>
                ))}
              </div>
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
              onClick={() => editingModule ? handleUpdateModule(editingModule.id) : handleCreateModule()}
              leftIcon={<Save className="h-4 w-4" />}
            >
              {editingModule ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModulesModule;