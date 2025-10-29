import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../../components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../../../components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../../../components/ui/select';
import { Switch } from '../../../components/ui/switch';
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
  List as ListIcon,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { useAuthStore } from '../../../store/auth-store';
import { api } from '../../../services';
import AccessRestricted from '../../../shared/components/AccessRestricted';
import { ForcedLogoutModal } from '../../../components/ForcedLogoutModal';

interface User {
  id: number;
  dni?: string;
  username: string;
  name: string;
  lastName?: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
  lastLogin?: string;
}

interface Role {
  id: number;
  name: string;
}

interface CreateUserData {
  dni?: string;
  username: string;
  name: string;
  lastName?: string;
  email: string;
  password: string;
  roleId: number;
  active?: boolean;
}

const UsersModule: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [formData, setFormData] = useState<CreateUserData>({
    dni: '',
    username: '',
    name: '',
    lastName: '',
    email: '',
    password: '',
    roleId: 0,
    active: true
  });

  const [userStatus, setUserStatus] = useState<'true' | 'false' | 'all'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
  const [showPassword, setShowPassword] = useState(false);
  const [errorModal, setErrorModal] = useState<{open: boolean, message: string, title: string}>({open: false, message: '', title: ''});
  const [deleteModal, setDeleteModal] = useState<{open: boolean, user: User | null}>({open: false, user: null});
  const [forcedLogoutModal, setForcedLogoutModal] = useState<{open: boolean, message: string}>({open: false, message: ''});
  
  // Función para validar requisitos de contraseña
  const validatePassword = (password: string) => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?\":{}|<>]/.test(password);
    const isLongEnough = password.length >= 8;

    return {
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar,
      isLongEnough,
      isValid: hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar && isLongEnough
    };
  };
  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);

  const fetchAvailableRoles = async () => {
    try {
      const response = await api.get('/roles/find-all-active');
      const roles = Array.isArray(response.data) ? response.data : [];
      setAvailableRoles(roles);
    } catch (error: any) {
      console.error('Error cargando roles:', error);
      setAvailableRoles([]);
    }
  };

  // Función helper para mostrar nombre completo (primer nombre + primer apellido)
  const getDisplayName = (user: User) => {
    const firstName = user.name?.split(' ')[0] || '';
    const firstLastName = user.lastName?.split(' ')[0] || '';
    
    if (firstName && firstLastName) {
      return `${firstName} ${firstLastName}`;
    } else if (firstName) {
      return firstName;
    } else if (user.name) {
      return user.name;
    }
    return 'Sin nombre';
  };

  useEffect(() => {
    fetchUsers();
  }, [userStatus, currentPage, itemsPerPage]);

  useEffect(() => {
    fetchAvailableRoles();
  }, []);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      setCurrentPage(1);
      fetchUsers();
    }, 500);
    
    return () => clearTimeout(delaySearch);
  }, [searchTerm]);

  // 🔔 WebSocket listener para actualizaciones en tiempo real
  useEffect(() => {
    const setupWebSocket = async () => {
      try {
        const SystemNotificationsService = (await import('../../../services/system-notifications-service')).default;
        
        const handleUserTableUpdate = (event: any) => {
          console.log('🔔 [UsersModule] Evento USER_TABLE_UPDATE recibido:', event);
          
          switch (event.action) {
            case 'USER_CREATED':
              console.log('✅ [UsersModule] Usuario creado:', event.username);
              fetchUsers(); // Recargar la lista completa
              break;
              
            case 'USER_UPDATED':
              console.log('🔄 [UsersModule] Usuario actualizado:', event.username);
              fetchUsers(); // Recargar la lista completa
              break;
              
            case 'USER_DELETED':
              console.log('🗑️ [UsersModule] Usuario eliminado:', event.username);
              fetchUsers(); // Recargar la lista completa
              break;
              
            case 'USER_STATUS_CHANGED':
              console.log('🔄 [UsersModule] Estado cambiado:', event.username);
              fetchUsers(); // Recargar la lista completa
              break;
              
            default:
              console.warn('⚠️ [UsersModule] Acción desconocida:', event.action);
          }
        };
        
        // Suscribirse al evento
        SystemNotificationsService.setOnUserTableUpdate(handleUserTableUpdate);
        
        // Cleanup
        return () => {
          SystemNotificationsService.setOnUserTableUpdate(null);
        };
      } catch (error) {
        console.error('❌ [UsersModule] Error configurando WebSocket:', error);
      }
    };
    
    setupWebSocket();
  }, []);

  // 🔍 Consultar datos por DNI cuando cambie el valor
  useEffect(() => {
    if (formData.dni && formData.dni.length >= 8 && /^\d+$/.test(formData.dni)) {
      consultarDatosDNI(formData.dni);
    } else if (formData.dni && formData.dni.length < 8) {
      clearUserFields();
    }
  }, [formData.dni]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params: any = {};
      
      if (userStatus !== 'all') {
        params.active = userStatus === 'true';
      }
      
      params.page = currentPage;
      params.limit = itemsPerPage;
      
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      
      const response = await api.get('/users', { params });
      
      if (response.data.users) {
        setUsers(response.data.users);
        setTotalUsers(response.data.total);
      } else {
        setUsers(Array.isArray(response.data) ? response.data : []);
        setTotalUsers(Array.isArray(response.data) ? response.data.length : 0);
      }
    } catch (error: any) {
      setUsers([]);
      setTotalUsers(0);
    } finally {
      setLoading(false);
    }
  };

  const consultarDatosDNI = async (dni: string) => {
    try {
      const response = await api.get(`/users/dni/${dni}`);
      const data = response.data;
      
      if (data && data.success) {
        const datos = data;
        
        // Generar nombre con formato correcto
        const nombres = datos.nombres
          .toLowerCase()
          .split(' ')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        // Generar apellidos con formato correcto
        const apellidos = `${datos.apellidoPaterno} ${datos.apellidoMaterno}`
          .toLowerCase()
          .split(' ')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        // Generar username: primera inicial del nombre + apellido paterno
        const primerNombre = datos.nombres.split(' ')[0];
        const inicialNombre = primerNombre.charAt(0).toLowerCase();
        const apellidoPaterno = datos.apellidoPaterno.toLowerCase();
        const username = `${inicialNombre}${apellidoPaterno}`;
        
        // Generar email: username + dominio yego
        const email = `${username}@yego.com`;
        
        // Actualizar el formulario con los datos obtenidos
        setFormData(prev => ({
          ...prev,
          name: nombres,
          lastName: apellidos,
          username: username,
          email: email
        }));

      }
    } catch (error: any) {
      console.error('Error al consultar DNI:', error);
      clearUserFields();
      setErrorModal({
        open: true,
        title: 'Error al Consultar DNI',
        message: 'No se pudieron obtener los datos del DNI. Verifica que el número sea correcto.'
      });
    }
  };

  const handleCreateUser = async () => {
    try {
      // Validar campos requeridos
      if (!formData.username.trim() || !formData.email.trim() || !formData.password.trim() || !formData.name.trim()) {
        setErrorModal({
          open: true,
          title: 'Error de Validación',
          message: 'Todos los campos son obligatorios'
        });
        return;
      }

      // Validar requisitos de contraseña
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        setErrorModal({
          open: true,
          title: 'Error de Validación de Contraseña',
          message: 'La contraseña no cumple con los requisitos de seguridad. Debe tener al menos una letra mayúscula, una minúscula, un número, un carácter especial y mínimo 8 caracteres.'
        });
        return;
      }

      const userData = {
        dni: formData.dni?.trim() || null,
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        name: formData.name.trim(),
        lastName: formData.lastName?.trim() || '',
        roleId: formData.roleId,
        active: formData.active !== undefined ? formData.active : true
      };
      
      await api.post('/users/create', userData);
      
      setIsCreateDialogOpen(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      console.error('❌ Error creating user:', error);
      
      let errorMessage = 'Error al crear usuario';
      
      if (error.response?.status === 400) {
        errorMessage = 'Datos inválidos. Verifica que todos los campos estén correctos.';
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.response?.status === 409) {
        errorMessage = 'El usuario ya existe (username o email duplicado)';
      } else if (error.response?.status === 403) {
        errorMessage = 'No tienes permisos para crear usuarios';
      }
      
      setErrorModal({
        open: true,
        title: 'Error al Crear Usuario',
        message: errorMessage
      });
    }
  };

  const handleUpdateUser = async (id: number) => {
    try {
      const updateData: any = {
        dni: formData.dni?.trim() || null,
        username: formData.username,
        email: formData.email,
        name: formData.name,
        lastName: formData.lastName || '',
        roleId: formData.roleId,
        active: formData.active
      };
      
      // Solo incluir password si tiene contenido, sino enviar undefined
      if (formData.password && formData.password.trim() !== '') {
        // Validar requisitos de contraseña solo si se está actualizando
        const passwordValidation = validatePassword(formData.password);
        if (!passwordValidation.isValid) {
          setErrorModal({
            open: true,
            title: 'Error de Validación de Contraseña',
            message: 'La contraseña no cumple con los requisitos de seguridad. Debe tener al menos una letra mayúscula, una minúscula, un número, un carácter especial y mínimo 8 caracteres.'
          });
          return;
        }
        updateData.password = formData.password;
      } else {
        updateData.password = null;
      }
      
      console.log('Actualizando usuario con datos:', updateData);
      
      // 🎯 Verificar si el usuario se está actualizando a sí mismo
      const isUpdatingSelf = currentUser && currentUser.id === id;
      
      await api.put(`/users/${id}`, updateData);
      setEditingUser(null);
      resetForm();
      fetchUsers();
      
      // 🚪 Si el usuario se actualizó a sí mismo, mostrar modal de logout
      if (isUpdatingSelf) {
        setForcedLogoutModal({
          open: true,
          message: 'Has actualizado tu propio perfil. Por favor, cierra sesión para que los cambios se apliquen correctamente.'
        });
      }
    } catch (error: any) {
      console.error('Error actualizando usuario:', error);
      
      const errorMessage = error.response?.data?.message || '';
      
      if (errorMessage.includes('users_username_key')) {
        setErrorModal({
          open: true,
          title: 'Usuario Duplicado',
          message: 'El nombre de usuario ya existe. Por favor, elige otro.'
        });
      } else if (errorMessage.includes('users_email_key')) {
        setErrorModal({
          open: true,
          title: 'Email Duplicado',
          message: 'El email ya está registrado. Por favor, usa otro email.'
        });
      } else if (error.response?.data?.message) {
        setErrorModal({
          open: true,
          title: 'Error',
          message: error.response.data.message
        });
      } else {
        setErrorModal({
          open: true,
          title: 'Error',
          message: 'Error al actualizar el usuario. Por favor, verifica los datos.'
        });
      }
    }
  };

  const handleDeleteUser = async (id: number) => {
    const userToDelete = users.find(user => user.id === id);
    if (userToDelete) {
      setDeleteModal({ open: true, user: userToDelete });
    }
  };

  const confirmDeleteUser = async () => {
    if (deleteModal.user) {
      try {
        await api.delete(`/users/${deleteModal.user.id}`);
        setDeleteModal({ open: false, user: null });
        fetchUsers();
      } catch (error: any) {
        console.error('Error deleting user:', error);
        setErrorModal({
          open: true,
          title: 'Error al Eliminar',
          message: 'No se pudo eliminar el usuario. Por favor, intenta nuevamente.'
        });
      }
    }
  };

  const handleToggleUserStatus = async (id: number, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    
    // Actualizar estado local inmediatamente (optimistic update)
    setUsers(prevUsers => 
      prevUsers.map(user => 
        user.id === id ? { ...user, active: newStatus } : user
      )
    );
    
    try {
      await api.patch(`/users/${id}/estado`, { activo: newStatus });
      
      // Si estamos filtrando por estado (no "all"), refrescar la lista
      if (userStatus !== 'all') {
        await fetchUsers();
      }
    } catch (error: any) {
      console.error('Error actualizando estado del usuario:', error);
      
      // Revertir el cambio si falla la petición
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === id ? { ...user, active: currentStatus } : user
        )
      );
      
      setErrorModal({
        open: true,
        title: 'Error al Cambiar Estado',
        message: 'No se pudo cambiar el estado del usuario. Por favor, intenta nuevamente.'
      });
    }
  };

  const totalPages = Math.ceil(totalUsers / itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    // Buscar el ID del rol basado en el nombre
    const roleObj = availableRoles.find(role => role.name === user.role);
    setFormData({
      dni: user.dni || '',
      username: user.username,
      name: user.name,
      lastName: user.lastName || '',
      email: user.email,
      password: '', // Siempre vacío por seguridad
      roleId: roleObj?.id || 0,
      active: user.active
    });
  };

  const clearUserFields = () => {
    setFormData(prev => ({
      ...prev,
      name: '',
      lastName: '',
      username: '',
      email: ''
    }));
  };

  const resetForm = () => {
    setFormData({
      dni: '',
      username: '',
      name: '',
      lastName: '',
      email: '',
      password: '',
      roleId: 0,
      active: true
    });
  };

  const closeDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingUser(null);
    setShowPassword(false);
    resetForm();
  };

  if (!currentUser) {
    return <AccessRestricted />;
  }

  return (
    <div className="space-y-6 relative">
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
               onChange={(e) => {
                 const value = e.target.value;
                 // Convertir primera letra a mayúscula
                 const formattedValue = value.charAt(0).toUpperCase() + value.slice(1);
                 setSearchTerm(formattedValue);
               }}
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
            <span className="text-sm text-neutral-700 dark:text-neutral-300">Estado:</span>
            <Select value={userStatus} onValueChange={(value) => setUserStatus(value as 'true' | 'false' | 'all')}>
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
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary-500" />
              Usuarios del Sistema
            </div>
            {!loading && (
              <span className="text-sm font-normal text-neutral-500">
                {totalUsers} usuario{totalUsers !== 1 ? 's' : ''} en total
              </span>
            )}
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
            users.length === 0 ? (
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
                    {users.map((user) => (
                      <TableRow key={user.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-neutral-500" />
                            </div>
                            <div>
                              <div className="font-medium text-neutral-900 dark:text-neutral-100">
                                {getDisplayName(user)}
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
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={user.active}
                              onCheckedChange={() => handleToggleUserStatus(user.id, user.active)}
                              disabled={currentUser && currentUser.role !== 'SUPERADMIN' && user.id === currentUser.id}
                            />
                            <span className="text-sm text-neutral-600 dark:text-neutral-400">
                              {user.active ? "Activo" : "Inactivo"}
                            </span>
                          </div>
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
                              disabled={!user.active}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {currentUser?.role === 'SUPERADMIN' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteUser(user.id)}
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
            )
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {users.map((user) => (
                <Card key={user.id} className="group hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-neutral-500" />
                      </div>
                      <div>
                        <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {getDisplayName(user)}
                        </div>
                        <div className="text-xs text-neutral-500">@{user.username}</div>
                      </div>
                    </div>
                    <Switch
                      checked={user.active}
                      onCheckedChange={() => handleToggleUserStatus(user.id, user.active)}
                      disabled={currentUser && currentUser.role !== 'SUPERADMIN' && user.id === currentUser.id}
                      className="scale-90"
                    />
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
                  <div className="flex justify-center gap-2 px-2 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(user)}
                      disabled={!user.active}
                      className="flex items-center justify-center h-8 w-8"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {currentUser?.role === 'SUPERADMIN' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id)}
                        className="flex items-center justify-center h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paginación */}
      {!loading && users.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, totalUsers)} de {totalUsers} usuarios
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
                : 'Completa el formulario para crear un nuevo usuario. El usuario se creará activo por defecto.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1">Documento de Identidad</label>
              <Input
                value={formData.dni || ''}
                onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                placeholder="Ingresar DNI o CEE"
                disabled={!!editingUser}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <Input
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="usuario123"
                disabled={!formData.dni || formData.dni.length <= 8}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <Input
                  value={formData.name}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Convertir primera letra de cada palabra a mayúscula y el resto a minúscula
                    const formattedValue = value
                      .toLowerCase()
                      .split(' ')
                      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ');
                    setFormData({ ...formData, name: formattedValue });
                  }}
                  placeholder="Juan Carlos"
                  disabled={!formData.dni || formData.dni.length <= 8}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Apellidos</label>
                <Input
                  value={formData.lastName || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Convertir primera letra de cada palabra a mayúscula y el resto a minúscula
                    const formattedValue = value
                      .toLowerCase()
                      .split(' ')
                      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ');
                    setFormData({ ...formData, lastName: formattedValue });
                  }}
                  placeholder="Pérez Rodríguez"
                  disabled={!formData.dni || formData.dni.length <= 8}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="juan.perez@empresa.com"
                disabled={!formData.dni || formData.dni.length <= 8}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Contraseña {editingUser && <span className="text-xs text-neutral-500">(nueva contraseña)</span>}
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              
              {/* Validación de contraseña */}
              {formData.password && (
                <div className="mt-2 space-y-1">
                  <div className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">
                    La contraseña debe cumplir con los siguientes requisitos:
                  </div>
                  <div className="space-y-1">
                    <div className={`flex items-center text-xs ${validatePassword(formData.password).hasUpperCase ? 'text-green-600' : 'text-red-600'}`}>
                      <div className={`w-2 h-2 rounded-full mr-2 ${validatePassword(formData.password).hasUpperCase ? 'bg-green-600' : 'bg-red-600'}`}></div>
                      Al menos una letra mayúscula (A-Z)
                    </div>
                    <div className={`flex items-center text-xs ${validatePassword(formData.password).hasLowerCase ? 'text-green-600' : 'text-red-600'}`}>
                      <div className={`w-2 h-2 rounded-full mr-2 ${validatePassword(formData.password).hasLowerCase ? 'bg-green-600' : 'bg-red-600'}`}></div>
                      Al menos una letra minúscula (a-z)
                    </div>
                    <div className={`flex items-center text-xs ${validatePassword(formData.password).hasNumbers ? 'text-green-600' : 'text-red-600'}`}>
                      <div className={`w-2 h-2 rounded-full mr-2 ${validatePassword(formData.password).hasNumbers ? 'bg-green-600' : 'bg-red-600'}`}></div>
                      Al menos un número (0-9)
                    </div>
                    <div className={`flex items-center text-xs ${validatePassword(formData.password).hasSpecialChar ? 'text-green-600' : 'text-red-600'}`}>
                      <div className={`w-2 h-2 rounded-full mr-2 ${validatePassword(formData.password).hasSpecialChar ? 'bg-green-600' : 'bg-red-600'}`}></div>
                      Al menos un carácter especial (!@#$%^&*(),.?":{}|&lt;&gt;)
                    </div>
                    <div className={`flex items-center text-xs ${validatePassword(formData.password).isLongEnough ? 'text-green-600' : 'text-red-600'}`}>
                      <div className={`w-2 h-2 rounded-full mr-2 ${validatePassword(formData.password).isLongEnough ? 'bg-green-600' : 'bg-red-600'}`}></div>
                      Mínimo 8 caracteres
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Rol</label>
              <Select 
                value={formData.roleId.toString()} 
                onValueChange={(value) => setFormData({ ...formData, roleId: parseInt(value) })}
                disabled={!!editingUser && currentUser && currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPERADMIN'}
              >
                <SelectTrigger className="focus:ring-0 focus:ring-offset-0 hover:bg-transparent">
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map(role => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      {/* Modal de Error */}
      <Dialog open={errorModal.open} onOpenChange={() => setErrorModal({open: false, message: '', title: ''})}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-error-600 dark:text-error-400">
              <X className="h-5 w-5" />
              {errorModal.title}
            </DialogTitle>
            <DialogDescription>
              {errorModal.message}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-line">
              {errorModal.message}
            </p>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => setErrorModal({open: false, message: '', title: ''})}
              className="w-full"
            >
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmación de Eliminación */}
      <Dialog open={deleteModal.open} onOpenChange={() => setDeleteModal({open: false, user: null})}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-error-600 dark:text-error-400">
              <Trash2 className="h-5 w-5" />
              Confirmar Eliminación
            </DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el usuario y todos sus datos.
            </DialogDescription>
          </DialogHeader>
          {deleteModal.user && (
            <div className="py-4">
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-700 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-neutral-500" />
                  </div>
                  <div>
                    <div className="font-semibold text-neutral-900 dark:text-white">
                      {getDisplayName(deleteModal.user)}
                    </div>
                    <div className="text-sm text-neutral-500">
                      @{deleteModal.user.username} • {deleteModal.user.email}
                    </div>
                    <div className="text-xs text-neutral-400 mt-1">
                      Rol: {deleteModal.user.role}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setDeleteModal({open: false, user: null})}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              variant="danger"
              onClick={confirmDeleteUser}
              className="flex-1"
            >
              Eliminar Usuario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Forced Logout cuando el usuario se actualiza a sí mismo */}
      <ForcedLogoutModal
        isOpen={forcedLogoutModal.open}
        onLogout={() => {
          localStorage.clear();
          window.location.href = '/login';
        }}
        message={forcedLogoutModal.message}
        username={currentUser?.name || ''}
      />
    </div>
  );
};

export default UsersModule;



