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
  Plus, 
  Edit, 
  Trash2, 
  Shield, 
  Search,
  Users,
  Calendar,
  Save,
  X,
  Power,
  PowerOff
} from 'lucide-react';
import { useAuth } from "@/shared/hooks/useAuth";
import api from "@/services/api";
import AccessRestricted from '@/shared/components/AccessRestricted';

interface Role {
  id: number;
  name: string;
  description: string;
  permissions: Record<string, any> | null;
  user_count: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Permission {
  id: number;
  name: string;
  module: string;
  action: string;
}

interface CreateRoleData {
  name: string;
  description: string;
  permissions: Record<string, any>;
}

const RolesModule: React.FC = () => {
  const authState = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState<CreateRoleData>({
    name: '',
    description: '',
    permissions: {}
  });

  // Agrupar permisos por módulo
  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await api.get('/roles');
      setRoles(response.data);
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await api.get('/permissions');
      setPermissions(response.data);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  const handleCreateRole = async () => {
    try {
      await api.post('/roles', formData);
      setIsCreateDialogOpen(false);
      setFormData({
        name: '',
        description: '',
        permissions: {}
      });
      fetchRoles();
    } catch (error) {
      console.error('Error creating role:', error);
    }
  };

  const handleUpdateRole = async () => {
    if (!editingRole) return;

    try {
      // Recorre todos los módulos posibles y solo incluye los que tengan permisos marcados
      const cleanPermissions: Record<string, any> = {};
      for (const module of Object.keys(groupedPermissions)) {
        const actions = formData.permissions[module];
        if (Array.isArray(actions) && actions.length > 0) {
          cleanPermissions[module] = actions;
        }
      }
      console.log('📤 Permisos enviados al backend:', JSON.stringify(cleanPermissions, null, 2));
      await api.put(`/roles/${editingRole.id}`, {
        ...formData,
        permissions: cleanPermissions
      });
      setEditingRole(null);
      setFormData({
        name: '',
        description: '',
        permissions: {}
      });
      fetchRoles();
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const handleDeleteRole = async (id: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este rol?')) {
      try {
        await api.delete(`/roles/${id}`);
        fetchRoles();
      } catch (error) {
        console.error('Error deleting role:', error);
      }
    }
  };

  const handleToggleRoleStatus = async (id: number, currentStatus: boolean) => {
    try {
      if (currentStatus) {
        await api.patch(`/roles/${id}/deactivate`);
      } else {
        await api.patch(`/roles/${id}/activate`);
      }
      fetchRoles();
    } catch (error) {
      console.error('Error toggling role status:', error);
    }
  };

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openEditDialog = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description,
      permissions: role.permissions || {}
    });
  };

  const closeDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingRole(null);
    setFormData({
      name: '',
      description: '',
      permissions: {}
    });
  };

  const handlePermissionToggle = (module: string, action: string) => {
    const currentPermissions = { ...formData.permissions };
    
    if (!currentPermissions[module]) {
      currentPermissions[module] = [];
    }
    
    const moduleActions = currentPermissions[module];
    if (Array.isArray(moduleActions)) {
      if (moduleActions.includes(action)) {
        currentPermissions[module] = moduleActions.filter(a => a !== action);
        if (currentPermissions[module].length === 0) {
          delete currentPermissions[module];
        }
      } else {
        currentPermissions[module] = [...moduleActions, action];
      }
    } else {
      currentPermissions[module] = [action];
    }
    
    setFormData({ ...formData, permissions: currentPermissions });
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
            Gestión de Roles
          </h1>
          <p className="yego-body">
            Administra los roles y permisos del sistema
          </p>
        </div>
        <Button 
          variant="primary"
          onClick={() => setIsCreateDialogOpen(true)}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Nuevo Rol
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
            <Input
              placeholder="Buscar roles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Roles Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary-500" />
            Roles del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="yego-body-sm">Cargando roles...</p>
              </div>
            </div>
          ) : filteredRoles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Shield className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mb-4" />
              <h3 className="yego-heading-4 mb-2">No se encontraron roles</h3>
              <p className="yego-body-sm max-w-md">
                No hay roles que coincidan con tu búsqueda. Intenta con otros términos o crea un nuevo rol.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Permisos</TableHead>
                    <TableHead>Usuarios</TableHead>
                    <TableHead>Creado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoles.map((role) => (
                    <TableRow key={role.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                      <TableCell className="font-medium text-neutral-900 dark:text-neutral-100">{role.name}</TableCell>
                      <TableCell>{role.description}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={role.activo ? "success" : "secondary"}
                          className={`text-xs ${role.activo ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'}`}
                        >
                          {role.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {role.permissions && Object.entries(role.permissions).slice(0, 3).map(([module, actions]) => (
                            <Badge key={module} variant="outline" className="text-xs">
                              {module}: {Array.isArray(actions) ? actions.join(', ') : actions}
                            </Badge>
                          ))}
                          {role.permissions && Object.keys(role.permissions).length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{Object.keys(role.permissions).length - 3} más
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-neutral-500" />
                          <span className="font-medium">{role.user_count}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-neutral-500">
                          <Calendar className="w-3 h-3" />
                          {new Date(role.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleRoleStatus(role.id, role.activo)}
                            className={`${role.activo ? 'text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300' : 'text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300'}`}
                            title={role.activo ? 'Desactivar rol' : 'Activar rol'}
                          >
                            {role.activo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(role)}
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRole(role.id)}
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
      <Dialog open={isCreateDialogOpen || !!editingRole} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary-500" />
              {editingRole ? 'Editar Rol' : 'Crear Nuevo Rol'}
            </DialogTitle>
            <DialogDescription>
              {editingRole
                ? 'Edita los datos y permisos del rol seleccionado.'
                : 'Completa el formulario para crear un nuevo rol en el sistema.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Nombre</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Administrador"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Descripción</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Rol con acceso completo al sistema"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">Permisos</label>
              <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
                  <div key={module} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
                    <h4 className="font-medium text-sm mb-3 capitalize text-neutral-900 dark:text-neutral-100">{module}</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {modulePermissions.map(permission => (
                        <div key={permission.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`permission-${permission.id}`}
                            checked={formData.permissions[module]?.includes(permission.action) || false}
                            onChange={() => handlePermissionToggle(module, permission.action)}
                            className="rounded border-neutral-300 dark:border-neutral-700 text-primary-500 focus:ring-primary-500 dark:bg-neutral-700"
                          />
                          <label 
                            htmlFor={`permission-${permission.id}`}
                            className="text-sm text-neutral-700 dark:text-neutral-300"
                          >
                            {permission.name}
                          </label>
                        </div>
                      ))}
                    </div>
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
              onClick={editingRole ? handleUpdateRole : handleCreateRole}
              leftIcon={<Save className="h-4 w-4" />}
            >
              {editingRole ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RolesModule;