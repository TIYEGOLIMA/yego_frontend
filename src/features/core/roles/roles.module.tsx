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
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Shield, 
  Search,
  Users,
  Calendar,
  Save,
  X
} from 'lucide-react';
import { useAuth } from "@/shared/hooks/useAuth";
import { api } from '../../../services';
import AccessRestricted from '@/shared/components/AccessRestricted';

interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string | null; // JSON string from backend
  active: boolean;
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
  active?: boolean;
}

interface UpdateRoleData {
  name?: string;
  description?: string;
  permissions?: Record<string, any>;
  active?: boolean;
}

const RolesModule: React.FC = () => {
  const authState = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [hoveredRole, setHoveredRole] = useState<number | null>(null);
  const initialFormData: CreateRoleData = {
    name: '',
    description: '',
    permissions: {},
    active: true
  };

  const [formData, setFormData] = useState<CreateRoleData>(initialFormData);

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
      const response = await api.get('/roles/find-all');
      setRoles(response.data);
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      // Definir permisos estáticos basados en la estructura que veo en la imagen
      const staticPermissions = [
        // Módulo Audit
        { id: 1, name: 'Leer', module: 'audit', action: 'read' },
        
        // Módulo Users  
        { id: 2, name: 'Leer', module: 'users', action: 'read' },
        { id: 3, name: 'Crear', module: 'users', action: 'create' },
        { id: 4, name: 'Actualizar', module: 'users', action: 'update' },
        { id: 5, name: 'Eliminar', module: 'users', action: 'delete' },
        
        // Módulo Imports
        { id: 6, name: 'Leer', module: 'imports', action: 'read' },
        { id: 7, name: 'Crear', module: 'imports', action: 'create' },
        { id: 8, name: 'Actualizar', module: 'imports', action: 'update' },
        { id: 9, name: 'Eliminar', module: 'imports', action: 'delete' },
        
        // Módulo Configuration
        { id: 10, name: 'Leer', module: 'configuration', action: 'read' },
        { id: 11, name: 'Actualizar', module: 'configuration', action: 'update' },
        
        // Módulo Roles
        { id: 12, name: 'Leer', module: 'roles', action: 'read' },
        { id: 13, name: 'Crear', module: 'roles', action: 'create' },
        { id: 14, name: 'Actualizar', module: 'roles', action: 'update' },
        { id: 15, name: 'Eliminar', module: 'roles', action: 'delete' },
        
        // Módulo Modules
        { id: 16, name: 'Leer', module: 'modules', action: 'read' },
        { id: 17, name: 'Crear', module: 'modules', action: 'create' },
        { id: 18, name: 'Actualizar', module: 'modules', action: 'update' },
        { id: 19, name: 'Eliminar', module: 'modules', action: 'delete' },
        
        // Módulo Permissions
        { id: 20, name: 'Leer', module: 'permissions', action: 'read' },
        { id: 21, name: 'Crear', module: 'permissions', action: 'create' },
        { id: 22, name: 'Actualizar', module: 'permissions', action: 'update' },
        { id: 23, name: 'Eliminar', module: 'permissions', action: 'delete' }
      ];
      
      setPermissions(staticPermissions);
    } catch (error) {
      console.error('Error setting permissions:', error);
    }
  };

  const handleCreateRole = async () => {
    try {
      // Limpiar permisos vacíos antes de enviar
      const cleanPermissions: Record<string, any> = {};
      for (const module of Object.keys(groupedPermissions)) {
        const actions = formData.permissions[module];
        if (Array.isArray(actions) && actions.length > 0) {
          cleanPermissions[module] = actions;
        }
      }

      const createData: CreateRoleData = {
        name: formData.name,
        description: formData.description,
        permissions: cleanPermissions,
        active: formData.active
      };

      console.log('📤 Creando rol:', JSON.stringify(createData, null, 2));
      await api.post('/roles/create', createData);
      
      setIsCreateDialogOpen(false);
      setFormData(initialFormData);
      fetchRoles();
    } catch (error) {
      console.error('Error creating role:', error);
    }
  };

  const handleUpdateRole = async () => {
    if (!editingRole) return;

    try {
      // Limpiar permisos vacíos antes de enviar
      const cleanPermissions: Record<string, any> = {};
      for (const module of Object.keys(groupedPermissions)) {
        const actions = formData.permissions[module];
        if (Array.isArray(actions) && actions.length > 0) {
          cleanPermissions[module] = actions;
        }
      }

      const updateData: UpdateRoleData = {
        name: formData.name,
        description: formData.description,
        permissions: cleanPermissions,
        active: formData.active
      };

      console.log('📤 Actualizando rol:', JSON.stringify(updateData, null, 2));
      await api.put(`/roles/update/${editingRole.id}`, updateData);
      
      setEditingRole(null);
      setFormData(initialFormData);
      fetchRoles();
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const openDeleteDialog = (role: Role) => {
    setRoleToDelete(role);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;

    try {
        await api.delete(`/roles/delete/${roleToDelete.id}`);
      setIsDeleteDialogOpen(false);
      setRoleToDelete(null);
      fetchRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
    }
  };

  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setRoleToDelete(null);
  };

  const toggleRoleState = (id: number) => {
    setRoles(prevRoles => 
      prevRoles.map(role => 
        role.id === id ? { ...role, active: !role.active } : role
      )
    );
  };

  const handleToggleRoleStatus = async (id: number) => {
    try {
      // Actualizar estado local inmediatamente
      toggleRoleState(id);
      
      // Llamar al backend
      await api.put(`/roles/toggle-status/${id}`);
    } catch (error) {
      console.error('Error toggling role status:', error);
      // Revertir el cambio si hay error
      toggleRoleState(id);
    }
  };

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openEditDialog = (role: Role) => {
    setEditingRole(role);
    
    // Parsear permisos desde JSON string
    let parsedPermissions = {};
    if (role.permissions) {
      try {
        parsedPermissions = JSON.parse(role.permissions);
      } catch (error) {
        console.error('Error parsing permissions:', error);
        parsedPermissions = {};
      }
    }
    
    setFormData({
      name: role.name,
      description: role.description,
      permissions: parsedPermissions,
      active: role.active
    });
  };

  const closeDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingRole(null);
    setFormData(initialFormData);
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

  const handleSelectAllModule = (module: string, allActions: string[]) => {
    const currentPermissions = { ...formData.permissions };
    const currentModuleActions = currentPermissions[module] || [];
    
    if (currentModuleActions.length === allActions.length) {
      // Si ya están todos seleccionados, deseleccionar todos
      delete currentPermissions[module];
    } else {
      // Seleccionar todos
      currentPermissions[module] = [...allActions];
    }
    
    setFormData({ ...formData, permissions: currentPermissions });
  };

  const isModuleFullySelected = (module: string, allActions: string[]) => {
    const currentModuleActions = formData.permissions[module] || [];
    return currentModuleActions.length === allActions.length;
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
                    <TableHead>Activo</TableHead>
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
                          variant={role.active ? "success" : "secondary"}
                          className={`text-xs ${role.active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'}`}
                        >
                          {role.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 relative">
                          {role.permissions && (() => {
                            try {
                              const parsedPermissions = JSON.parse(role.permissions);
                              const allEntries = Object.entries(parsedPermissions);
                              const visibleEntries = allEntries.slice(0, 3);
                              const hiddenEntries = allEntries.slice(3);
                              
                              return (
                                <>
                                  {visibleEntries.map(([module, actions]) => (
                                    <Badge key={module} variant="outline" className="text-xs">
                                      {module}: {Array.isArray(actions) ? actions.join(', ') : String(actions)}
                                    </Badge>
                                  ))}
                                  {hiddenEntries.length > 0 && (
                                    <div className="relative">
                                      <Badge 
                                        variant="secondary" 
                                        className="text-xs cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                                        onClick={() => setHoveredRole(hoveredRole === role.id ? null : role.id)}
                                      >
                                        +{hiddenEntries.length} más
                                      </Badge>
                                      
                                      {hoveredRole === role.id && (
                                        <>
                                          {/* Overlay */}
                                          <div 
                                            className="fixed inset-0 z-40 bg-black/20"
                                            onClick={() => setHoveredRole(null)}
                                          />
                                          {/* Modal */}
                                          <div className="fixed z-50 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-xl p-4 min-w-80 max-w-96"
                                               style={{
                                                 top: '50%',
                                                 left: '50%',
                                                 transform: 'translate(-50%, -50%)'
                                               }}>
                                            <div className="flex items-center justify-between mb-3">
                                              <div className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                                                Permisos adicionales
                                              </div>
                                              <button 
                                                onClick={() => setHoveredRole(null)}
                                                className="w-6 h-6 bg-neutral-100 dark:bg-neutral-700 rounded-full flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
                                              >
                                                <X className="h-3 w-3" />
                                              </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                              {hiddenEntries.map(([module, actions]) => (
                                                <Badge key={module} variant="outline" className="text-xs">
                                                  {module}: {Array.isArray(actions) ? actions.join(', ') : String(actions)}
                                                </Badge>
                                              ))}
                                            </div>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </>
                              );
                            } catch {
                              return <Badge variant="secondary" className="text-xs">Sin permisos</Badge>;
                            }
                          })()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-neutral-500" />
                          <span className="font-medium">-</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-neutral-500">
                          <Calendar className="w-3 h-3" />
                          {new Date(role.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center">
                          <Switch
                            checked={role.active}
                            onCheckedChange={() => handleToggleRoleStatus(role.id)}
                            className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-neutral-200"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
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
                            onClick={() => openDeleteDialog(role)}
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
        <DialogContent className="sm:max-w-[800px] max-h-[95vh] overflow-y-auto">
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
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-4">
                Permisos por Módulo
              </label>
              <div className="max-h-80 overflow-y-auto pr-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(groupedPermissions).map(([module, modulePermissions]) => {
                    const allActions = modulePermissions.map(p => p.action);
                    const isFullySelected = isModuleFullySelected(module, allActions);
                    const selectedCount = formData.permissions[module]?.length || 0;
                    
                    return (
                      <Card key={module} className="border hover:border-primary-200 dark:hover:border-primary-700 transition-all duration-200 h-64 flex flex-col bg-white dark:bg-neutral-900">
                        <CardHeader className="pb-2 flex-shrink-0 bg-neutral-50 dark:bg-neutral-800 rounded-t-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 bg-primary-500 rounded-md flex items-center justify-center">
                                <Shield className="h-3 w-3 text-white" />
                              </div>
                              <CardTitle className="text-sm font-medium capitalize text-neutral-900 dark:text-neutral-100">
                                {module}
                              </CardTitle>
                            </div>
                            <Badge 
                              variant={selectedCount > 0 ? "primary" : "secondary"} 
                              className="text-xs"
                            >
                              {selectedCount}/{allActions.length}
                            </Badge>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="pt-2 pb-2 flex-1 flex flex-col overflow-hidden">
                          <div className="space-y-2 flex-1 flex flex-col min-h-0">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleSelectAllModule(module, allActions)}
                              className="w-full text-xs h-6 flex-shrink-0 flex items-center justify-center hover:bg-transparent hover:border-neutral-300 dark:hover:bg-transparent dark:hover:border-neutral-600"
                            >
                              {isFullySelected ? 'Deseleccionar' : 'Seleccionar todo'}
                            </Button>
                            
                            <div className="flex-1 overflow-y-auto min-h-0 pr-1 mt-3 pt-3">
                              <div className="grid grid-cols-2 gap-2">
                                {modulePermissions.map(permission => (
                                  <div key={permission.id} className="flex items-center space-x-2 p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                                    <input
                                      type="checkbox"
                                      id={`permission-${permission.id}`}
                                      checked={formData.permissions[module]?.includes(permission.action) || false}
                                      onChange={() => handlePermissionToggle(module, permission.action)}
                                      className="w-3.5 h-3.5 rounded border-neutral-300 dark:border-neutral-600 text-primary-500 focus:ring-1 focus:ring-primary-500 dark:bg-neutral-700"
                                    />
                                    <label 
                                      htmlFor={`permission-${permission.id}`}
                                      className="text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer flex-1 leading-tight"
                                    >
                                      {permission.name}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={closeDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-error-600 dark:text-error-400">
              <Trash2 className="h-5 w-5" />
              Eliminar Rol
            </DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. El rol será eliminado permanentemente del sistema.
            </DialogDescription>
          </DialogHeader>
          
          {roleToDelete && (
            <div className="py-4">
              <div className="bg-error-50 dark:bg-error-950/20 border border-error-200 dark:border-error-800 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-error-100 dark:bg-error-900/30 rounded-lg flex items-center justify-center">
                    <Shield className="h-5 w-5 text-error-600 dark:text-error-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-error-900 dark:text-error-100">
                      {roleToDelete.name}
                    </h4>
                    <p className="text-sm text-error-700 dark:text-error-300">
                      {roleToDelete.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="secondary" 
              onClick={closeDeleteDialog}
              className="border border-neutral-300 dark:border-neutral-600"
            >
              Cancelar
            </Button>
            <Button 
              variant="danger"
              onClick={handleDeleteRole}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar Rol
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RolesModule;



