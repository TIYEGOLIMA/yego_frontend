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
  Users,
  Calendar,
  X,
  Save,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
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
  userCount?: number; // Cantidad de usuarios con este rol
}

interface ActionDto {
  action: string;
  name: string;
  description: string;
  module: string;
}

interface ModuleWithActionsDto {
  id: number;
  nombre: string;
  descripcion: string;
  url: string;
  estado: string;
  activo: boolean;
  actions: ActionDto[];
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
  const [modulesWithActions, setModulesWithActions] = useState<ModuleWithActionsDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleStatus, setRoleStatus] = useState<'true' | 'false' | 'all'>('all');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
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

  // Normalizar nombre del módulo para usarlo como clave
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

  useEffect(() => {
    fetchRoles();
    fetchModulesWithActions();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleStatus, selectedRoleFilter]);

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

  const fetchModulesWithActions = async () => {
    try {
      const response = await api.get('/roles/modules-with-actions');
      setModulesWithActions(response.data || []);
    } catch (error) {
      console.error('Error fetching modules with actions:', error);
      setModulesWithActions([]);
    }
  };

  const cleanPermissions = (): Record<string, any> => {
    const clean: Record<string, any> = {};
    for (const moduleWithActions of modulesWithActions) {
      const moduleKey = normalizeModuleName(moduleWithActions.nombre);
      const actions = formData.permissions[moduleKey];
      if (Array.isArray(actions) && actions.length > 0) {
        clean[moduleKey] = actions;
      }
    }
    return clean;
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingRole(null);
    setIsCreateDialogOpen(false);
  };

  const handleCreateRole = async () => {
    try {
      const createData: CreateRoleData = {
        name: formData.name,
        description: formData.description,
        permissions: cleanPermissions(),
        active: formData.active
      };

      await api.post('/roles/create', createData);
      resetForm();
      fetchRoles();
    } catch (error) {
      console.error('Error creating role:', error);
    }
  };

  const handleUpdateRole = async () => {
    if (!editingRole) return;

    try {
      const updateData: UpdateRoleData = {
        name: formData.name,
        description: formData.description,
        permissions: cleanPermissions(),
        active: formData.active
      };

      await api.put(`/roles/update/${editingRole.id}`, updateData);
      resetForm();
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

  const handleToggleRoleStatus = async (id: number) => {
    // Guardar el estado original para rollback
    const originalRole = roles.find(role => role.id === id);
    if (!originalRole) return;

    // Optimistic update
    setRoles(prevRoles => 
      prevRoles.map(role => 
        role.id === id ? { ...role, active: !role.active } : role
      )
    );

    try {
      const response = await api.put(`/roles/toggle-status/${id}`);
      // Usar la respuesta del servidor para actualizar el estado
      if (response.data) {
        setRoles(prevRoles => 
          prevRoles.map(role => 
            role.id === id ? { ...role, ...response.data } : role
          )
        );
      }
    } catch (error) {
      console.error('Error toggling role status:', error);
      // Revertir al estado original si hay error
      setRoles(prevRoles => 
        prevRoles.map(role => 
          role.id === id ? { ...role, active: originalRole.active } : role
        )
      );
    }
  };

  const filteredRoles = roles.filter(role => {
    const matchesSearch = role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = roleStatus === 'all' || 
      (roleStatus === 'true' && role.active) ||
      (roleStatus === 'false' && !role.active);
    
    const matchesRoleFilter = selectedRoleFilter === 'all' || 
      role.id.toString() === selectedRoleFilter;
    
    return matchesSearch && matchesStatus && matchesRoleFilter;
  });

  const totalRoles = filteredRoles.length;
  const totalPages = Math.ceil(totalRoles / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRoles = filteredRoles.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  const openEditDialog = (role: Role) => {
    setEditingRole(role);
    
    let parsedPermissions: Record<string, any> = {};
    if (role.permissions) {
      try {
        const originalPermissions = JSON.parse(role.permissions);
        
        // Normalizar las claves de módulos para que coincidan con los módulos actuales
        for (const moduleWithActions of modulesWithActions) {
          const moduleKey = normalizeModuleName(moduleWithActions.nombre);
          
          // Buscar en las claves originales si hay alguna coincidencia
          for (const [originalKey, actions] of Object.entries(originalPermissions)) {
            const normalizedOriginalKey = normalizeModuleName(originalKey);
            if (normalizedOriginalKey === moduleKey) {
              parsedPermissions[moduleKey] = actions;
              break;
            }
          }
        }
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
    setIsCreateDialogOpen(true);
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 w-5 h-5 pointer-events-none z-10" />
            <Input
              placeholder="Buscar roles..."
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
            <span className="text-sm text-neutral-700 dark:text-neutral-300">Rol:</span>
            <Select value={selectedRoleFilter} onValueChange={setSelectedRoleFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id.toString()}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-700 dark:text-neutral-300">Estado:</span>
            <Select value={roleStatus} onValueChange={(value) => setRoleStatus(value as 'true' | 'false' | 'all')}>
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

      {/* Roles Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary-500" />
            Roles del Sistema ({filteredRoles.length})
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
              <p className="yego-body-sm">
                Intenta con otros términos o crea un nuevo rol.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Permisos</TableHead>
                    <TableHead>Usuarios</TableHead>
                    <TableHead>Creado</TableHead>
                    <TableHead>Activo</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRoles.map((role) => (
                    <TableRow key={role.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                      <TableCell className="font-medium text-neutral-900 dark:text-neutral-100">{role.name}</TableCell>
                      <TableCell>{role.description}</TableCell>
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
                          <span className="font-medium">
                            {role.userCount !== undefined ? role.userCount : '-'}
                          </span>
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
                            className="text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-300 dark:hover:bg-neutral-800"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(role)}
                            className="text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-300 dark:hover:bg-neutral-800"
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
      {!loading && paginatedRoles.length > 0 && totalPages > 1 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, totalRoles)} de {totalRoles} roles
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
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen || !!editingRole} onOpenChange={resetForm}>
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
                  {modulesWithActions.map((moduleWithActions) => {
                    const moduleKey = normalizeModuleName(moduleWithActions.nombre);
                    const allActions = moduleWithActions.actions.map(a => a.action);
                    const isFullySelected = isModuleFullySelected(moduleKey, allActions);
                    const selectedCount = formData.permissions[moduleKey]?.length || 0;
                    
                    return (
                      <Card key={moduleWithActions.id} className="border hover:border-primary-200 dark:hover:border-primary-700 transition-all duration-200 h-64 flex flex-col bg-white dark:bg-neutral-900">
                        <CardHeader className="pb-2 flex-shrink-0 bg-neutral-50 dark:bg-neutral-800 rounded-t-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 bg-primary-500 rounded-md flex items-center justify-center">
                                <Shield className="h-3 w-3 text-white" />
                              </div>
                              <CardTitle className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                {moduleWithActions.nombre}
                              </CardTitle>
                            </div>
                            <Badge 
                              variant={selectedCount > 0 ? "primary" : "secondary"} 
                              className="text-xs"
                            >
                              {selectedCount}/{allActions.length}
                            </Badge>
                          </div>
                          {moduleWithActions.descripcion && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                              {moduleWithActions.descripcion}
                            </p>
                          )}
                        </CardHeader>
                        
                        <CardContent className="pt-2 pb-2 flex-1 flex flex-col overflow-hidden">
                          <div className="space-y-2 flex-1 flex flex-col min-h-0">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleSelectAllModule(moduleKey, allActions)}
                              className="w-full text-xs h-6 flex-shrink-0 flex items-center justify-center hover:bg-transparent hover:border-neutral-300 dark:hover:bg-transparent dark:hover:border-neutral-600"
                            >
                              {isFullySelected ? 'Deseleccionar' : 'Seleccionar todo'}
                            </Button>
                            
                            <div className="flex-1 overflow-y-auto min-h-0 pr-1 mt-3 pt-3">
                              <div className="grid grid-cols-2 gap-2">
                                {moduleWithActions.actions.map((action) => {
                                  const actionId = `${moduleWithActions.id}-${action.action}`;
                                  return (
                                    <div key={actionId} className="flex items-center space-x-2 p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                                      <input
                                        type="checkbox"
                                        id={`permission-${actionId}`}
                                        checked={formData.permissions[moduleKey]?.includes(action.action) || false}
                                        onChange={() => handlePermissionToggle(moduleKey, action.action)}
                                        className="w-3.5 h-3.5 rounded border-neutral-300 dark:border-neutral-600 text-primary-500 focus:ring-1 focus:ring-primary-500 dark:bg-neutral-700"
                                      />
                                      <label 
                                        htmlFor={`permission-${actionId}`}
                                        className="text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer flex-1 leading-tight"
                                      >
                                        {action.description || action.name}
                                      </label>
                                    </div>
                                  );
                                })}
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
              onClick={resetForm}
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



