import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../../components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../../components/ui/select';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Search,
  Mail,
  User,
  Save,
  X,
  Filter,
  LayoutGrid,
  List as ListIcon
} from 'lucide-react';
import { useAuthStore } from '../../store/auth-store';
import api from '../../services/api';
import AccessRestricted from '../../shared/components/AccessRestricted';

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  moduleId?: number;
  active: boolean;
  createdAt: string;
  lastLogin?: string;
}

interface CreateUserData {
  username: string;
  name: string;
  email: string;
  password: string;
  role: string;
  moduleId?: number;
}

const UsersModule: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<CreateUserData>({
    username: '',
    name: '',
    email: '',
    password: '',
    role: 'usuario',
    moduleId: undefined
  });

  const [userStatus, setUserStatus] = useState<'true' | 'false' | 'all'>('true');
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');

  // Roles disponibles
  const availableRoles = ['USUARIO', 'OPERADOR', 'ADMIN', 'SUPERVISOR', 'SUPERADMIN'];

  useEffect(() => {
    fetchUsers();
  }, [userStatus]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (userStatus !== 'all') params.active = userStatus;
      const response = await api.get('/users', { params });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      const userData = {
        username: formData.username,
        password: formData.password,
        email: formData.email,
        name: formData.name,
        role: formData.role,
        moduleId: formData.moduleId
      };
      
      console.log('Datos enviados para crear usuario:', userData);
      
      await api.post('/users', userData);
      setIsCreateDialogOpen(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  const handleUpdateUser = async (id: number) => {
    try {
      const updateData = {
        username: formData.username,
        email: formData.email,
        name: formData.name,
        role: formData.role,
        moduleId: formData.moduleId
      };
      
      console.log('Datos enviados para actualizar usuario:', updateData);
      
      await api.patch(`/users/${id}`, updateData);
      setEditingUser(null);
      resetForm();
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
      try {
        await api.delete(`/users/${id}`);
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    
    return (user.name?.toLowerCase() || '').includes(searchLower) ||
           (user.email?.toLowerCase() || '').includes(searchLower) ||
           (user.username?.toLowerCase() || '').includes(searchLower) ||
           (user.role?.toLowerCase() || '').includes(searchLower);
  });

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      moduleId: user.moduleId
    });
  };

  const resetForm = () => {
    setFormData({
      username: '',
      name: '',
      email: '',
      password: '',
      role: 'usuario',
      moduleId: undefined
    });
  };

  const closeDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingUser(null);
    resetForm();
  };

  if (!currentUser) {
    return <AccessRestricted />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
            Gestión de Usuarios
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Administra los usuarios del sistema
          </p>
        </div>
        <Button 
          onClick={() => setIsCreateDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 w-5 h-5 pointer-events-none z-10" />
            <Input
              placeholder="Buscar usuarios por nombre, email, username o rol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12"
            />
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-neutral-400" />
          <span className="text-sm text-neutral-700 dark:text-neutral-300">Estado:</span>
          <Select value={userStatus} onValueChange={(value) => setUserStatus(value as 'true' | 'false' | 'all')}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Activos</SelectItem>
              <SelectItem value="false">Inactivos</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'list' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <ListIcon className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'cards' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('cards')}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Users Table/Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary-500" />
            Usuarios del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm">Cargando usuarios...</p>
              </div>
            </div>
          ) : viewMode === 'list' ? (
            filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No se encontraron usuarios</h3>
                <p className="text-sm text-neutral-600 max-w-md">
                  No hay usuarios que coincidan con tu búsqueda. Intenta con otros términos o crea un nuevo usuario.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Último Login</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-neutral-500" />
                            </div>
                            <div>
                              <div className="font-medium text-neutral-900 dark:text-neutral-100">
                                {user.name || 'Sin nombre'}
                              </div>
                              <div className="text-xs text-neutral-500">
                                @{user.username}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Mail className="w-4 h-4 text-neutral-500" />
                            <span className="text-sm text-neutral-700 dark:text-neutral-300">
                              {user.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.active ? "success" : "error"}>
                            {user.active ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-neutral-500">
                            {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Nunca'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id)}
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
            )
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredUsers.map((user) => (
                <Card key={user.id} className="group hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center gap-3 pb-2">
                    <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-neutral-500" />
                    </div>
                    <div>
                      <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {user.name || 'Sin nombre'}
                      </div>
                      <div className="text-xs text-neutral-500">@{user.username}</div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={user.active ? 'success' : 'error'}>
                        {user.active ? 'Activo' : 'Inactivo'}
                      </Badge>
                      <Badge variant="outline">{user.role}</Badge>
                    </div>
                    <div className="text-xs text-neutral-500 flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {user.email}
                    </div>
                    <div className="text-xs text-neutral-500">
                      Último login: {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Nunca'}
                    </div>
                  </CardContent>
                  <div className="flex gap-2 p-4 pt-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(user)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen || !!editingUser} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary-500" />
              {editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? 'Edita los datos del usuario seleccionado.'
                : 'Completa el formulario para crear un nuevo usuario en el sistema.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="usuario123"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Nombre Completo</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Juan Pérez"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="juan.perez@empresa.com"
              />
            </div>
            
            {!editingUser && (
              <div>
                <label className="block text-sm font-medium mb-1">Contraseña</label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-1">Rol</label>
              <Select 
                value={formData.role} 
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map(role => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">ID del Módulo (opcional)</label>
              <Input
                type="number"
                value={formData.moduleId || ''}
                onChange={(e) => setFormData({ ...formData, moduleId: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="1"
              />
            </div>
          </div>
          
          <DialogFooter className="mt-6">
            <Button 
              variant="outline" 
              onClick={closeDialog}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button 
              onClick={() => editingUser ? handleUpdateUser(editingUser.id) : handleCreateUser()}
            >
              <Save className="h-4 w-4 mr-2" />
              {editingUser ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersModule;