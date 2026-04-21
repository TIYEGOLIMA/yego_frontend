import React, { useState, useEffect, useRef } from 'react';
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
  Building2,
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
  areaId?: number | null;
  areaNombre?: string | null;
  areaEsResponsable?: boolean;
  areaEsSupervisor?: boolean;
  sedeId?: number | null;
  sedeNombre?: string | null;
}

interface Role {
  id: number;
  name: string;
}

interface AreaOption {
  id: number;
  name: string;
}

interface SedeOption {
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
  areaId?: number | null;
  sedeId?: number | null;
}

const ROLES_REQUIEREN_SEDE = ['SAC', 'OPERADOR', 'SAC_AGENT'];

/** Normaliza texto para username: minúsculas, sin acentos, sin espacios (ej. "García" -> "garcia") */
function normalizarParaUsername(texto: string): string {
  if (!texto || typeof texto !== 'string') return '';
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .trim();
}

/** Obtiene la última palabra de un texto (para apellidos compuestos: "De La Cruz" -> "Cruz") */
function obtenerUltimaPalabra(texto: string): string {
  if (!texto || typeof texto !== 'string') return '';
  const palabras = texto.trim().split(/\s+/).filter(Boolean);
  return palabras.length > 0 ? palabras[palabras.length - 1] : '';
}

/** Para "apellido paterno + materno" en un solo campo (ej. "De La Cruz Garcia"): devuelve la palabra a usar en username = última del paterno (Cruz). Si solo hay una palabra, la devuelve. */
function obtenerPalabraApellidoParaUsername(apellidosCompletos: string): string {
  const palabras = apellidosCompletos.trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return '';
  if (palabras.length === 1) return palabras[0];
  const sinMaterno = palabras.slice(0, -1);
  return sinMaterno[sinMaterno.length - 1];
}

/** Apellido paterno para mostrar: si hay 2+ palabras (paterno + materno), quita la última (materno). Ej. "De La Cruz Garcia" -> "De La Cruz". */
function apellidoPaternoParaDisplay(apellidos: string | undefined): string {
  if (!apellidos?.trim()) return '';
  const palabras = apellidos.trim().split(/\s+/).filter(Boolean);
  if (palabras.length <= 1) return apellidos.trim();
  return palabras.slice(0, -1).join(' ');
}

/** Genera username: primera letra del nombre + ultima palabra del apellido (normalizado, sin acentos) */
function generarUsernameDesdeNombreApellido(nombre: string, apellido: string): string {
  const primeraLetra = nombre.trim().split(/\s+/)[0]?.charAt(0)?.toLowerCase() ?? '';
  const ultimaPalabra = obtenerUltimaPalabra(apellido);
  return normalizarParaUsername(primeraLetra + ultimaPalabra);
}

/** Capitaliza la primera letra de cada palabra */
function capitalizarPalabras(texto: string): string {
  return texto
    .toLowerCase()
    .split(' ')
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const UsersModule: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  
  const isAdminOrSuperAdmin = currentUser
    ? ['SUPERADMIN', 'ADMIN'].includes(currentUser.role.toUpperCase())
    : false;
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [areas, setAreas] = useState<AreaOption[]>([]);
  const [sedes, setSedes] = useState<SedeOption[]>([]);
  const [formData, setFormData] = useState<CreateUserData>({
    dni: '',
    username: '',
    name: '',
    lastName: '',
    email: '',
    password: '',
    roleId: 0,
    active: true,
    areaId: null,
    sedeId: null
  });

  const [userStatus, setUserStatus] = useState<'true' | 'false' | 'all'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
  const [showPassword, setShowPassword] = useState(false);
  const [errorModal, setErrorModal] = useState<{open: boolean, message: string, title: string}>({open: false, message: '', title: ''});
  const [deleteModal, setDeleteModal] = useState<{open: boolean, user: User | null}>({open: false, user: null});
  const [forcedLogoutModal, setForcedLogoutModal] = useState<{open: boolean, message: string}>({open: false, message: ''});
  const [saving, setSaving] = useState(false);
  
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

  const fetchAreas = async () => {
    try {
      const response = await api.get('/areas/find-all');
      const list = Array.isArray(response.data) ? response.data : [];
      setAreas(list.map((a: { id: number; name: string }) => ({ id: a.id, name: a.name })));
    } catch (error: any) {
      console.error('[UsersModule] Error cargando areas:', error);
      setAreas([]);
    }
  };

  const fetchSedes = async () => {
    try {
      const response = await api.get('/ticketera/sedes');
      const list = Array.isArray(response.data) ? response.data : [];
      setSedes(
        list
          .filter((s: { active?: boolean }) => s.active !== false)
          .map((s: { id: number; name: string }) => ({ id: s.id, name: s.name }))
      );
    } catch (error: any) {
      console.error('[UsersModule] Error cargando sedes:', error);
      setSedes([]);
    }
  };

  // Nombre para mostrar: solo primer nombre + apellido paterno (ej. "Ariana De La Cruz", sin segundo nombre)
  const getDisplayName = (user: User) => {
    const primerNombre = capitalizarPalabras(user.name?.trim().split(/\s+/)[0] || '');
    const apellidoPaterno = capitalizarPalabras(apellidoPaternoParaDisplay(user.lastName));
    if (primerNombre && apellidoPaterno) return `${primerNombre} ${apellidoPaterno}`.trim();
    if (primerNombre) return primerNombre;
    if (user.name) return capitalizarPalabras(user.name.trim().split(/\s+/)[0] || user.name.trim());
    if (user.lastName) return capitalizarPalabras(user.lastName.trim());
    return 'Sin nombre';
  };

  // Carga inicial igual que Sessions: un efecto, loading true, Promise.all(roles + users), loading false cuando todo termina
  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const params: Record<string, unknown> = { page: 1, limit: 1000 };
        if (userStatus !== 'all') params.active = userStatus === 'true';
        const [rolesRes, usersRes] = await Promise.all([
          api.get('/roles/find-all-active', { signal: ac.signal }),
          api.get('/users', { params, signal: ac.signal })
        ]);
        if (cancelled) return;
        setAvailableRoles(Array.isArray(rolesRes.data) ? rolesRes.data : []);
        const userList = usersRes.data?.users ?? usersRes.data;
        setUsers(Array.isArray(userList) ? userList : []);
      } catch (error: unknown) {
        if (cancelled) return;
        const isAbort = (error as { name?: string; code?: string })?.name === 'AbortError' || (error as { name?: string; code?: string })?.code === 'ERR_CANCELED';
        if (!isAbort) {
          console.error('[UsersModule] Error cargando usuarios:', error);
          setUsers([]);
          setAvailableRoles([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [userStatus]);

  // Resetear página al cambiar búsqueda
  useEffect(() => {
      setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    const setupWebSocket = async () => {
      try {
        const SystemNotificationsService = (await import('../../../services/system-notifications-service')).default;
        SystemNotificationsService.setOnUserTableUpdate(() => fetchUsers());
        return () => SystemNotificationsService.setOnUserTableUpdate(null);
      } catch (error) {
        console.error('[UsersModule] Error configurando WebSocket:', error);
      }
    };
    setupWebSocket();
  }, []);

  // Consultar datos por DNI con delay
  useEffect(() => {
    const delayTimer = setTimeout(() => {
      // Al crear usuario nuevo: consultar DNI automáticamente
      if (!editingUser && formData.dni && formData.dni.length >= 8 && /^\d+$/.test(formData.dni)) {
        consultarDatosDNI(formData.dni);
      } else if (!editingUser && formData.dni && formData.dni.length < 8) {
        clearUserFields();
      }
      // Al editar usuario: consultar DNI solo si cambió y cumple criterios
      else if (editingUser && formData.dni && formData.dni.length >= 8 && /^\d+$/.test(formData.dni) && formData.dni !== editingUser.dni) {
        consultarDatosDNI(formData.dni);
      }
    }, 1000); // Delay de 1 segundo para que el usuario termine de escribir

    return () => clearTimeout(delayTimer);
  }, [formData.dni, editingUser]);

  // Generar username y email al crear (no al editar)
  useEffect(() => {
    if (editingUser) return;
    if (!formData.name || !formData.lastName) return;
    const apellidoParaUsername = obtenerPalabraApellidoParaUsername(formData.lastName);
    const username = generarUsernameDesdeNombreApellido(formData.name, apellidoParaUsername);
    if (username) {
      const email = `${username}@yego.com`;
      setFormData(prev => ({ ...prev, username, email }));
    }
  }, [formData.name, formData.lastName, editingUser]);

  const lastFetchRef = useRef(0);

  const fetchUsers = async (signal?: AbortSignal) => {
    const now = Date.now();
    if (now - lastFetchRef.current < 1000) return;
    lastFetchRef.current = now;
    try {
      const params: Record<string, unknown> = { page: 1, limit: 1000 };
      if (userStatus !== 'all') params.active = userStatus === 'true';
      const response = await api.get('/users', { params, signal });
      const userList = response.data?.users ?? response.data;
      setUsers(Array.isArray(userList) ? userList : []);
    } catch (error: any) {
      if (error?.name === 'AbortError' || error?.code === 'ERR_CANCELED') return;
    }
  };

  // Filtrar usuarios localmente (búsqueda en todos los campos)
  const filteredUsers = users.filter(user => {
    if (!searchTerm.trim()) return true;
    
    const search = searchTerm.toLowerCase().trim();
    
    // Buscar en todos los campos
    return (
      user.name?.toLowerCase().includes(search) ||
      user.lastName?.toLowerCase().includes(search) ||
      user.username?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.role?.toLowerCase().includes(search) ||
      user.dni?.toLowerCase().includes(search) ||
      user.areaNombre?.toLowerCase().includes(search) ||
      // Buscar también en nombre completo
      `${user.name} ${user.lastName}`.toLowerCase().includes(search) ||
      getDisplayName(user).toLowerCase().includes(search)
    );
  });

  const consultarDatosDNI = async (dni: string) => {
    try {
      const response = await api.get(`/users/dni/${dni}`);
      const data = response.data;
      
      if (data && data.success) {
        const nombres = capitalizarPalabras(data.nombres);
        const apellidos = capitalizarPalabras(`${data.apellidoPaterno} ${data.apellidoMaterno}`);
        const username = generarUsernameDesdeNombreApellido(data.nombres, data.apellidoPaterno);
        const email = username ? `${username}@yego.com` : '';

        setFormData(prev => ({ ...prev, name: nombres, lastName: apellidos, username, email }));
      }
    } catch (error: any) {
      console.error('[UsersModule] Error al consultar DNI:', error);
      clearUserFields();
      setErrorModal({
        open: true,
        title: 'Error al Consultar DNI',
        message: 'No se pudieron obtener los datos del DNI. Verifica que el número sea correcto.'
      });
    }
  };

  const handleCreateUser = async () => {
    if (!formData.username.trim() || !formData.email.trim() || !formData.password.trim() || !formData.name.trim()) {
      setErrorModal({ open: true, title: 'Error de Validación', message: 'Todos los campos son obligatorios' });
      return;
    }

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      setErrorModal({
        open: true,
        title: 'Error de Validación de Contraseña',
        message: 'La contraseña no cumple con los requisitos de seguridad. Debe tener al menos una letra mayúscula, una minúscula, un número, un carácter especial y mínimo 8 caracteres.'
      });
      return;
    }

    setSaving(true);
    try {
      await api.post('/users/create', {
        dni: formData.dni?.trim() || null,
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        name: formData.name.trim(),
        lastName: formData.lastName?.trim() || '',
        roleId: formData.roleId,
        active: formData.active !== undefined ? formData.active : true,
        sedeId: formData.sedeId ?? null
      });

      setIsCreateDialogOpen(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      console.error('[UsersModule] Error al crear usuario:', error);

      let errorMessage = 'Error al crear usuario';
      if (error.response?.status === 400) {
        errorMessage = error.response?.data?.message || 'Datos inválidos. Verifica que todos los campos estén correctos.';
      } else if (error.response?.status === 409) {
        errorMessage = 'El usuario ya existe (username o email duplicado)';
      } else if (error.response?.status === 403) {
        errorMessage = 'No tienes permisos para crear usuarios';
      }

      setErrorModal({ open: true, title: 'Error al Crear Usuario', message: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUser = async (id: number) => {
    const updateData: Record<string, unknown> = {
      dni: formData.dni?.trim() || null,
      username: formData.username,
      email: formData.email,
      name: formData.name,
      lastName: formData.lastName || '',
      roleId: formData.roleId,
      active: formData.active,
      areaId: formData.areaId != null ? formData.areaId : 0,
      sedeId: formData.sedeId != null ? formData.sedeId : 0
    };

    if (formData.password && formData.password.trim() !== '') {
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

    const isUpdatingSelf = currentUser && currentUser.id === id;

    setSaving(true);
    try {
      await api.put(`/users/${id}`, updateData);
      setEditingUser(null);
      resetForm();
      fetchUsers();

      if (isUpdatingSelf) {
        setForcedLogoutModal({
          open: true,
          message: 'Has actualizado tu propio perfil. Por favor, cierra sesión para que los cambios se apliquen correctamente.'
        });
      }
    } catch (error: any) {
      console.error('[UsersModule] Error al actualizar usuario:', error);

      const msg = error.response?.data?.message || '';
      if (msg.includes('users_username_key')) {
        setErrorModal({ open: true, title: 'Usuario Duplicado', message: 'El nombre de usuario ya existe. Por favor, elige otro.' });
      } else if (msg.includes('users_email_key')) {
        setErrorModal({ open: true, title: 'Email Duplicado', message: 'El email ya está registrado. Por favor, usa otro email.' });
      } else if (msg) {
        setErrorModal({ open: true, title: 'Error', message: msg });
      } else {
        setErrorModal({ open: true, title: 'Error', message: 'Error al actualizar el usuario. Por favor, verifica los datos.' });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = (id: number) => {
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
        console.error('[UsersModule] Error al eliminar usuario:', error);
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
      console.error('[UsersModule] Error al cambiar estado:', error);
      
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

  // Paginación local basada en usuarios filtrados
  const totalFilteredUsers = filteredUsers.length;
  const totalPages = Math.ceil(totalFilteredUsers / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

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
    if (areas.length === 0) fetchAreas();
    if (sedes.length === 0) fetchSedes();
    const roleObj = availableRoles.find(role => role.name === user.role);
    setFormData({
      dni: user.dni || '',
      username: user.username,
      name: capitalizarPalabras(user.name || ''),
      lastName: capitalizarPalabras(user.lastName || ''),
      email: user.email,
      password: '',
      roleId: roleObj?.id || 0,
      active: user.active,
      areaId: user.areaId ?? null,
      sedeId: user.sedeId ?? null
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
      active: true,
      areaId: null,
      sedeId: null
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
          <h1 className="yego-heading-1 mb-2">
            Gestión de Usuarios
          </h1>
          <p className="yego-body">
            Administra los usuarios del sistema
          </p>
        </div>
        <Button 
          variant="primary"
          onClick={() => {
            if (areas.length === 0) fetchAreas();
            if (sedes.length === 0) fetchSedes();
            setIsCreateDialogOpen(true);
          }}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Nuevo Usuario
        </Button>
      </div>

      {currentUser?.esJefe && currentUser?.nombreArea && (
        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
          <User className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
          <span>
            <strong>Eres el responsable de:</strong> {currentUser.nombreArea}
          </span>
        </div>
      )}
      {currentUser?.esSupervisor && currentUser?.nombreAreaSupervisor && (
        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
          <User className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
          <span>
            <strong>Eres supervisor de:</strong> {currentUser.nombreAreaSupervisor}
          </span>
        </div>
      )}

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 w-5 h-5 pointer-events-none z-10" />
             <Input
               placeholder="Buscar usuarios por nombre, email, username o rol..."
               value={searchTerm}
               onChange={(e) => {
                 const v = e.target.value;
                 setSearchTerm(v.charAt(0).toUpperCase() + v.slice(1));
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
                {searchTerm ? `${totalFilteredUsers} de ${users.length}` : totalFilteredUsers} usuario{totalFilteredUsers !== 1 ? 's' : ''}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="yego-body-sm">Cargando usuarios...</p>
              </div>
            </div>
          ) : viewMode === 'list' ? (
            paginatedUsers.length === 0 ? (
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
                      <TableHead>Área</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Último Login</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers.map((user) => (
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
                          <div className="flex items-center gap-1.5 text-sm text-neutral-700 dark:text-neutral-300">
                            {user.areaNombre ? (
                              <>
                                <Building2 className="h-4 w-4 text-neutral-400 shrink-0" />
                                <span>
                                  {user.areaEsResponsable ? `Jefe de ${user.areaNombre}` : user.areaEsSupervisor ? `Supervisor de ${user.areaNombre}` : user.areaNombre}
                                </span>
                              </>
                            ) : (
                              <span className="text-neutral-400">Sin asignar</span>
                            )}
                          </div>
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
              {paginatedUsers.map((user) => (
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
                      <Building2 className="w-3 h-3 shrink-0" />{' '}
                      {user.areaNombre
                        ? (user.areaEsResponsable ? `Jefe de ${user.areaNombre}` : user.areaEsSupervisor ? `Supervisor de ${user.areaNombre}` : user.areaNombre)
                        : 'Sin asignar'}
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
      {!loading && paginatedUsers.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                Mostrando {startIndex + 1} a {Math.min(endIndex, totalFilteredUsers)} de {totalFilteredUsers} usuarios
                {searchTerm && ` (filtrado de ${users.length} total)`}
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
      <Dialog open={isCreateDialogOpen || !!editingUser} onOpenChange={(open) => { if (!open && !saving) closeDialog(); }}>
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
          
          <form autoComplete="off" onSubmit={(e) => e.preventDefault()} className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1">Documento de Identidad</label>
              <Input
                autoComplete="off"
                value={formData.dni || ''}
                onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                placeholder="Ingresar DNI o CEE"
                disabled={!isAdminOrSuperAdmin && !!editingUser}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <Input
                  autoComplete="off"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: capitalizarPalabras(e.target.value) })}
                  placeholder="Juan Carlos"
                  disabled={!isAdminOrSuperAdmin && (!formData.dni || formData.dni.length <= 8)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Apellidos</label>
                <Input
                  autoComplete="off"
                  value={formData.lastName || ''}
                  onChange={(e) => setFormData({ ...formData, lastName: capitalizarPalabras(e.target.value) })}
                  placeholder="Pérez Rodríguez"
                  disabled={!isAdminOrSuperAdmin && (!formData.dni || formData.dni.length <= 8)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <Input
                autoComplete="off"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="usuario123"
                disabled={!isAdminOrSuperAdmin}
              />
              {!isAdminOrSuperAdmin && (
                <p className="text-xs text-gray-500 mt-1">
                  Se genera automáticamente basado en el nombre y apellidos
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input
                type="email"
                autoComplete="off"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="juan.perez@empresa.com"
                disabled={!isAdminOrSuperAdmin}
              />
              {!isAdminOrSuperAdmin && (
                <p className="text-xs text-gray-500 mt-1">
                  Se genera automáticamente basado en el username
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Contraseña {editingUser && <span className="text-xs text-neutral-500">(nueva contraseña)</span>}
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
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
              
              {formData.password && (() => {
                const v = validatePassword(formData.password);
                const rules = [
                  { ok: v.hasUpperCase, label: 'Al menos una letra mayúscula (A-Z)' },
                  { ok: v.hasLowerCase, label: 'Al menos una letra minúscula (a-z)' },
                  { ok: v.hasNumbers, label: 'Al menos un número (0-9)' },
                  { ok: v.hasSpecialChar, label: 'Al menos un carácter especial (!@#$%^&*(),.?":{}|<>)' },
                  { ok: v.isLongEnough, label: 'Mínimo 8 caracteres' },
                ];
                return (
                  <div className="mt-2 space-y-1">
                    <div className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">
                      La contraseña debe cumplir con los siguientes requisitos:
                    </div>
                    <div className="space-y-1">
                      {rules.map((r) => (
                        <div key={r.label} className={`flex items-center text-xs ${r.ok ? 'text-green-600' : 'text-red-600'}`}>
                          <div className={`w-2 h-2 rounded-full mr-2 ${r.ok ? 'bg-green-600' : 'bg-red-600'}`} />
                          {r.label}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Rol</label>
              <Select 
                value={formData.roleId.toString()} 
                onValueChange={(value) => setFormData({ ...formData, roleId: parseInt(value) })}
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

            <div>
              <label className="block text-sm font-medium mb-1">Área</label>
              {editingUser ? (
                <p className="text-sm py-2 px-3 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                  {editingUser.areaEsResponsable ? `Jefe de ${editingUser.areaNombre?.trim() || 'Sin asignar'}` : editingUser.areaEsSupervisor ? `Supervisor de ${editingUser.areaNombre?.trim() || 'Sin asignar'}` : editingUser.areaNombre?.trim() || 'Sin asignar'}
                </p>
              ) : (
                <>
                  <Select
                    value={formData.areaId != null && formData.areaId !== 0 ? String(formData.areaId) : 'none'}
                    onValueChange={(value) => setFormData({ ...formData, areaId: value === 'none' ? null : Number(value) })}
                  >
                    <SelectTrigger className="focus:ring-0 focus:ring-offset-0 hover:bg-transparent">
                      <SelectValue placeholder="Seleccionar área" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin asignar</SelectItem>
                      {areas.map((area) => (
                        <SelectItem key={area.id} value={String(area.id)}>
                          {area.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-neutral-500 mt-1">
                    Asigna al usuario a un área para asistencia y reportes.
                  </p>
                </>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Sede
                {(() => {
                  const roleName = availableRoles.find(r => r.id === formData.roleId)?.name?.toUpperCase()
                  return roleName && ROLES_REQUIEREN_SEDE.includes(roleName)
                    ? <span className="text-red-500 ml-1">*</span>
                    : null
                })()}
              </label>
              <Select
                value={formData.sedeId != null && formData.sedeId !== 0 ? String(formData.sedeId) : 'none'}
                onValueChange={(value) => setFormData({ ...formData, sedeId: value === 'none' ? null : Number(value) })}
              >
                <SelectTrigger className="focus:ring-0 focus:ring-offset-0 hover:bg-transparent">
                  <SelectValue placeholder="Seleccionar sede" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {sedes.map((sede) => (
                    <SelectItem key={sede.id} value={String(sede.id)}>
                      {sede.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-neutral-500 mt-1">
                Sede física del usuario. Obligatorio para SAC/OPERADOR.
              </p>
            </div>

          </form>
          
          <DialogFooter className="mt-6">
            <Button 
              variant="outline" 
              onClick={closeDialog}
              disabled={saving}
              leftIcon={<X className="h-4 w-4" />}
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => editingUser ? handleUpdateUser(editingUser.id) : handleCreateUser()}
              loading={saving}
              disabled={saving}
              leftIcon={<Save className="h-4 w-4" />}
            >
              {saving ? (editingUser ? 'Actualizando...' : 'Creando...') : (editingUser ? 'Actualizar' : 'Crear')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Error */}
      <Dialog open={errorModal.open} onOpenChange={() => setErrorModal({open: false, message: '', title: ''})}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <X className="h-5 w-5" />
              {errorModal.title || 'Error'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              {errorModal.message}
            </p>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => setErrorModal({open: false, message: '', title: ''})}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
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
