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
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Plus,
  Edit,
  Trash2,
  Building2,
  Search,
  User,
  Users,
  Save,
  X,
  UserPlus,
  UserMinus,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/shared/hooks/useAuth';
import { api } from '../../../services';
import AccessRestricted from '@/shared/components/AccessRestricted';

interface Area {
  id: number;
  name: string;
  description: string | null;
  managerId: number | null;
  managerName: string | null;
  activo: boolean;
  colaboradoresCount: number;
}

interface UserSimple {
  id: number;
  nombreCompleto: string;
  /** Si tiene valor y no es el área actual, no mostrarlo en combo de colaboradores. */
  areaId?: number | null;
}

interface Colaborador {
  id: number;
  nombreCompleto: string;
  email: string;
  rol: string;
}

interface AreaFormData {
  name: string;
  description: string;
  managerId: string;
  activo: boolean;
}

const initialFormData: AreaFormData = {
  name: '',
  description: '',
  managerId: '',
  activo: true,
};

const showApiError = (e: unknown, fallback: string) => {
  alert((e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback);
};

/** Clases base para modales (editar/nueva, eliminar, colaboradores) adaptados a móvil */
const modalContentClass =
  'w-[calc(100vw-1.5rem)] max-h-[90dvh] overflow-y-auto p-4 sm:p-6 sm:w-full rounded-xl mx-auto my-4 sm:my-0 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-lg';

const AreasModule: React.FC = () => {
  const authState = useAuth();
  const [areas, setAreas] = useState<Area[]>([]);
  const [usuarios, setUsuarios] = useState<UserSimple[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'true' | 'false'>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [formData, setFormData] = useState<AreaFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<Area | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [colaboradoresDialogArea, setColaboradoresDialogArea] = useState<Area | null>(null);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [colaboradoresLoading, setColaboradoresLoading] = useState(false);
  const [selectedUserIdsToAdd, setSelectedUserIdsToAdd] = useState<number[]>([]);
  const [openColabCombo, setOpenColabCombo] = useState(false);
  const [colabBuscarNombre, setColabBuscarNombre] = useState('');
  const [addingColab, setAddingColab] = useState(false);
  const [removingColabId, setRemovingColabId] = useState<number | null>(null);
  const [previewPopupArea, setPreviewPopupArea] = useState<Area | null>(null);
  const [togglingAreaId, setTogglingAreaId] = useState<number | null>(null);
  const [previewPopupColabs, setPreviewPopupColabs] = useState<Colaborador[]>([]);
  const [previewPopupLoading, setPreviewPopupLoading] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchAreas = async (signal?: AbortSignal) => {
    const isRefresh = signal === undefined;
    if (isRefresh) setLoading(true);
    try {
      const res = await api.get('/areas/find-all', { signal });
      setAreas(Array.isArray(res.data) ? res.data : []);
    } catch (e: unknown) {
      if ((e as { name?: string; code?: string })?.name === 'AbortError' || (e as { code?: string })?.code === 'ERR_CANCELED') return;
      console.error('Error cargando áreas:', e);
      setAreas([]);
    } finally {
      if (isRefresh) setLoading(false);
    }
  };

  const fetchUsuarios = async (areaId?: number, signal?: AbortSignal) => {
    try {
      const params = areaId != null ? { params: { areaId } } : { signal };
      const res = await api.get('/areas/usuarios-para-responsable', params);
      setUsuarios(Array.isArray(res.data) ? res.data : []);
    } catch (e: unknown) {
      if ((e as { name?: string; code?: string })?.name === 'AbortError' || (e as { code?: string })?.code === 'ERR_CANCELED') return;
      console.error('Error cargando usuarios:', e);
      setUsuarios([]);
    }
  };

  const fetchColaboradores = async (areaId: number): Promise<Colaborador[]> => {
    try {
      const res = await api.get(`/areas/${areaId}/colaboradores`);
      return Array.isArray(res.data) ? res.data : [];
    } catch (e) {
      console.error('Error cargando colaboradores:', e);
      return [];
    }
  };

  // Una sola carga inicial; loading hasta que terminen áreas y usuarios (sin areaId = para crear)
  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    (async () => {
      try {
        await Promise.all([fetchAreas(ac.signal), fetchUsuarios(undefined, ac.signal)]);
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  const filteredAreas = areas.filter((a) => {
    const matchSearch =
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.managerName && a.managerName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'true' && a.activo) ||
      (statusFilter === 'false' && !a.activo);
    return matchSearch && matchStatus;
  });

  const totalAreas = filteredAreas.length;
  const totalPages = Math.ceil(totalAreas / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAreas = filteredAreas.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  const openCreate = () => {
    setEditingArea(null);
    setFormData(initialFormData);
    setIsDialogOpen(true);
    fetchUsuarios(); // lista sin responsables de otras áreas
  };

  const openEdit = (area: Area) => {
    setEditingArea(area);
    setFormData({
      name: area.name,
      description: area.description || '',
      managerId: area.managerId != null ? String(area.managerId) : '',
      activo: area.activo,
    });
    setIsDialogOpen(true);
    // Recargar usuarios incluyendo al responsable actual de esta área para que siga en el combo
    fetchUsuarios(area.id);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingArea(null);
    setFormData(initialFormData);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      if (editingArea) {
        await api.put(`/areas/update/${editingArea.id}`, {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          managerId: formData.managerId ? Number(formData.managerId) : null,
          activo: formData.activo,
        });
      } else {
        await api.post('/areas/create', {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          managerId: formData.managerId ? Number(formData.managerId) : null,
          activo: formData.activo,
        });
      }
      closeDialog();
      fetchAreas();
    } catch (e) {
      console.error('Error guardando área:', e);
      showApiError(e, 'Error al guardar el área');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (area: Area) => {
    setTogglingAreaId(area.id);
    try {
      await api.put(`/areas/toggle-status/${area.id}`);
      setAreas((prev) =>
        prev.map((a) => (a.id === area.id ? { ...a, activo: !a.activo } : a))
      );
    } catch (e) {
      console.error('Error cambiando estado:', e);
      showApiError(e, 'Error al cambiar el estado del área');
    } finally {
      setTogglingAreaId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    setDeleting(true);
    try {
      await api.delete(`/areas/delete/${deleteDialog.id}`);
      setDeleteDialog(null);
      fetchAreas();
    } catch (e) {
      console.error('Error eliminando área:', e);
      showApiError(e, 'Error al eliminar el área');
    } finally {
      setDeleting(false);
    }
  };

  const openPreviewPopup = async (area: Area) => {
    setPreviewPopupArea(area);
    setPreviewPopupColabs([]);
    setPreviewPopupLoading(true);
    const list = await fetchColaboradores(area.id);
    setPreviewPopupColabs(list);
    setPreviewPopupLoading(false);
  };

  const openColaboradoresDialog = async (area: Area) => {
    setColaboradoresDialogArea(area);
    setColaboradores([]);
    setSelectedUserIdsToAdd([]);
    setOpenColabCombo(false);
    setColabBuscarNombre('');
    setColaboradoresLoading(true);
    const list = await fetchColaboradores(area.id);
    setColaboradores(list);
    setColaboradoresLoading(false);
  };

  const toggleUsuarioToAdd = (userId: number) => {
    setSelectedUserIdsToAdd((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const agregarColaboradores = async () => {
    if (!colaboradoresDialogArea || selectedUserIdsToAdd.length === 0) return;
    setAddingColab(true);
    try {
      await Promise.all(
        selectedUserIdsToAdd.map((userId) =>
          api.patch(`/users/${userId}/area`, { areaId: colaboradoresDialogArea.id })
        )
      );
      setSelectedUserIdsToAdd([]);
      setOpenColabCombo(false);
      setColaboradores(await fetchColaboradores(colaboradoresDialogArea.id));
      fetchAreas();
    } catch (e) {
      console.error('Error agregando colaboradores:', e);
      showApiError(e, 'Error al agregar colaboradores');
    } finally {
      setAddingColab(false);
    }
  };

  const quitarColaborador = async (userId: number) => {
    if (!colaboradoresDialogArea) return;
    setRemovingColabId(userId);
    try {
      await api.patch(`/users/${userId}/area`, { areaId: 0 });
      setColaboradores(await fetchColaboradores(colaboradoresDialogArea.id));
      fetchAreas();
    } catch (e) {
      console.error('Error quitando colaborador:', e);
      showApiError(e, 'Error al quitar colaborador');
    } finally {
      setRemovingColabId(null);
    }
  };

  // Solo usuarios que no están ya en esta área, no son el responsable, y no tienen otra área asignada (un colaborador solo puede estar en un área)
  const usuariosDisponiblesParaAgregar = usuarios.filter(
    (u) =>
      !colaboradores.some((c) => c.id === u.id) &&
      u.id !== colaboradoresDialogArea?.managerId &&
      (u.areaId == null || u.areaId === colaboradoresDialogArea?.id)
  );

  // Filtro por nombre dentro del diálogo de colaboradores (buscar por nombre)
  const usuariosDisponiblesFiltradosPorNombre = colabBuscarNombre.trim()
    ? usuariosDisponiblesParaAgregar.filter((u) =>
        (u.nombreCompleto ?? '')
          .toLowerCase()
          .includes(colabBuscarNombre.trim().toLowerCase())
      )
    : usuariosDisponiblesParaAgregar;

  if (!authState?.isAuthenticated) {
    return <AccessRestricted />;
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-1 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="yego-heading-1 mb-1 sm:mb-2 text-xl sm:text-2xl md:text-3xl truncate">
            Gestión de Áreas
          </h1>
          <p className="yego-body text-sm sm:text-base text-neutral-600 dark:text-neutral-400">
            Crea y administra áreas y asigna responsables
          </p>
        </div>
        <Button
          variant="primary"
          onClick={openCreate}
          leftIcon={<Plus className="h-4 w-4" />}
          className="w-full sm:w-auto min-h-11 touch-manipulation"
        >
          Nueva Área
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 w-5 h-5 pointer-events-none z-10" />
            <Input
              placeholder="Buscar por nombre o responsable..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 min-h-11 touch-manipulation"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex flex-col min-[400px]:flex-row flex-wrap items-stretch min-[400px]:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 min-h-10">
            <Filter className="w-4 h-4 text-neutral-400 shrink-0" />
            <span className="text-sm text-neutral-700 dark:text-neutral-300 shrink-0">Estado:</span>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'true' | 'false')}>
              <SelectTrigger className="flex-1 min-w-0 sm:w-32 min-h-11 touch-manipulation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Activos</SelectItem>
                <SelectItem value="false">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 min-h-10">
            <span className="text-sm text-neutral-700 dark:text-neutral-300 shrink-0">Por página:</span>
            <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
              <SelectTrigger className="flex-1 min-w-0 sm:w-24 min-h-11 touch-manipulation">
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary-500" />
            Áreas del Sistema ({filteredAreas.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                <p className="yego-body-sm">Cargando áreas y usuarios...</p>
              </div>
            </div>
          ) : filteredAreas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mb-4" />
              <h3 className="yego-heading-4 mb-2">No se encontraron áreas</h3>
              <p className="yego-body-sm">
                Intenta con otros términos o crea una nueva área.
              </p>
            </div>
          ) : (
            <>
              {/* Vista móvil: tarjetas */}
              <div className="md:hidden space-y-3">
                {paginatedAreas.map((area) => (
                  <div
                    key={area.id}
                    className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 truncate flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary-500 shrink-0" />
                          {area.name}
                        </h3>
                        {area.description && (
                          <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate mt-0.5">{area.description}</p>
                        )}
                      </div>
                      <div className="relative flex items-center gap-2 shrink-0">
                        {togglingAreaId === area.id ? (
                          <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
                        ) : (
                          <Switch
                            checked={area.activo}
                            onCheckedChange={() => handleToggleStatus(area)}
                          />
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-sm">
                      {area.managerName ? (
                        <span className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                          <User className="h-3.5 w-3 text-neutral-400" />
                          <span className="truncate">{area.managerName}</span>
                        </span>
                      ) : (
                        <span className="text-neutral-400">Sin responsable</span>
                      )}
                      <Badge
                        variant="secondary"
                        className={`gap-1 text-xs shrink-0 min-h-8 px-2 ${area.colaboradoresCount > 0 ? 'cursor-pointer active:opacity-80' : ''}`}
                        onClick={() => area.colaboradoresCount > 0 && openPreviewPopup(area)}
                        title={area.colaboradoresCount > 0 ? 'Ver nombres' : undefined}
                      >
                        <Users className="h-3.5 w-3" />
                        {area.colaboradoresCount}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openColaboradoresDialog(area)}
                        className="h-10 w-10 min-w-10 p-0 touch-manipulation text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                        title="Gestionar colaboradores"
                      >
                        <Users className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(area)}
                        className="h-10 w-10 min-w-10 p-0 touch-manipulation text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                        title="Editar área"
                      >
                        <Edit className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteDialog(area)}
                        className="h-10 w-10 min-w-10 p-0 touch-manipulation text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Eliminar área"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {/* Vista escritorio: tabla */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Responsable</TableHead>
                      <TableHead className="text-center">Colaboradores</TableHead>
                      <TableHead>Activo</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAreas.map((area) => (
                      <TableRow key={area.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                        <TableCell className="font-medium text-neutral-900 dark:text-neutral-100">{area.name}</TableCell>
                        <TableCell className="text-neutral-500 max-w-[200px] truncate">{area.description || '—'}</TableCell>
                        <TableCell>
                          {area.managerName ? (
                            <span className="flex items-center gap-1.5 text-sm">
                              <User className="h-4 w-4 text-neutral-400" />
                              {area.managerName}
                            </span>
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="secondary"
                            className={`gap-1 text-xs ${area.colaboradoresCount > 0 ? 'cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors' : ''}`}
                            onClick={() => area.colaboradoresCount > 0 && openPreviewPopup(area)}
                            title={area.colaboradoresCount > 0 ? 'Ver nombres' : undefined}
                          >
                            <Users className="h-3.5 w-3" />
                            {area.colaboradoresCount}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {togglingAreaId === area.id ? (
                            <Loader2 className="h-5 w-5 animate-spin text-primary-500" />
                          ) : (
                            <Switch
                              checked={area.activo}
                              onCheckedChange={() => handleToggleStatus(area)}
                            />
                          )}
                        </TableCell>
                        <TableCell className="py-2 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openColaboradoresDialog(area)}
                              className="h-8 w-8 min-w-8 p-0 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-300 dark:hover:bg-neutral-800"
                              title="Gestionar colaboradores"
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(area)}
                              className="h-8 w-8 min-w-8 p-0 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-300 dark:hover:bg-neutral-800"
                              title="Editar área"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteDialog(area)}
                              className="h-8 w-8 min-w-8 p-0 text-neutral-500 hover:text-red-600 hover:bg-red-50 dark:text-neutral-400 dark:hover:text-red-400 dark:hover:bg-red-900/20"
                              title="Eliminar área"
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
            </>
          )}
        </CardContent>
      </Card>

      {!loading && paginatedAreas.length > 0 && totalPages > 1 && (
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 text-center sm:text-left order-2 sm:order-1">
                Mostrando {startIndex + 1}–{Math.min(startIndex + itemsPerPage, totalAreas)} de {totalAreas}
              </div>
              <div className="flex items-center justify-center gap-1 sm:gap-2 order-1 sm:order-2">
                <Button variant="outline" size="sm" onClick={() => handlePageChange(1)} disabled={currentPage === 1} className="h-10 w-10 min-w-10 p-0 touch-manipulation sm:h-8 sm:w-8 sm:min-w-8">
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="h-10 w-10 min-w-10 p-0 touch-manipulation sm:h-8 sm:w-8 sm:min-w-8">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto max-w-[50vw] sm:max-w-none justify-center">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i;
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="h-10 w-10 min-w-10 p-0 touch-manipulation sm:h-8 sm:w-8 sm:min-w-8 shrink-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="h-10 w-10 min-w-10 p-0 touch-manipulation sm:h-8 sm:w-8 sm:min-w-8">
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} className="h-10 w-10 min-w-10 p-0 touch-manipulation sm:h-8 sm:w-8 sm:min-w-8">
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className={`${modalContentClass} max-w-md`}>
          <DialogHeader className="space-y-2 sm:space-y-1.5">
            <DialogTitle className="text-lg sm:text-xl pr-12 sm:pr-8">{editingArea ? 'Editar área' : 'Nueva área'}</DialogTitle>
            <DialogDescription className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400">
              {editingArea
                ? 'Modifica el nombre, descripción o responsable del área.'
                : 'Completa los datos del área. El responsable podrá ver la asistencia de su equipo.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 sm:py-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Nombre *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej. Ventas, Operaciones"
                className="min-h-11 sm:min-h-10 touch-manipulation text-base sm:text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Descripción</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Opcional"
                className="min-h-11 sm:min-h-10 touch-manipulation text-base sm:text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Responsable</label>
              <Select
                value={formData.managerId || 'none'}
                onValueChange={(v) => setFormData({ ...formData, managerId: v === 'none' ? '' : v })}
              >
                <SelectTrigger className="min-h-11 sm:min-h-10 touch-manipulation">
                  <SelectValue placeholder="Seleccionar responsable" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {usuarios.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.nombreCompleto?.trim() || `Usuario ${u.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 min-h-11 py-1">
              <Switch
                checked={formData.activo}
                onCheckedChange={(v) => setFormData({ ...formData, activo: v })}
                className="touch-manipulation"
              />
              <span className="text-sm sm:text-base">Área activa</span>
            </div>
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2 sm:pt-0">
            <Button variant="outline" onClick={closeDialog} disabled={saving} className="w-full sm:w-auto min-h-12 sm:min-h-11 touch-manipulation text-base">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving || !formData.name.trim()} className="gap-2 w-full sm:w-auto min-h-12 sm:min-h-11 touch-manipulation text-base">
              {saving ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {editingArea ? 'Guardar' : 'Crear'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <DialogContent className={`${modalContentClass} max-w-sm`}>
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-lg sm:text-xl pr-12 sm:pr-8">Eliminar área</DialogTitle>
            <DialogDescription className="text-base sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              ¿Eliminar el área &quot;{deleteDialog?.name}&quot;? Si tiene colaboradores asignados, se desactivará en lugar de eliminarse.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-2 pt-4 sm:pt-2">
            <Button variant="outline" onClick={() => setDeleteDialog(null)} disabled={deleting} className="w-full sm:w-auto min-h-12 sm:min-h-11 touch-manipulation text-base">
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting} className="w-full sm:w-auto min-h-12 sm:min-h-11 touch-manipulation text-base">
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {previewPopupArea && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setPreviewPopupArea(null)}
            aria-hidden
          />
          <div
            className="fixed z-50 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-xl p-4 w-[calc(100vw-2rem)] max-w-sm"
            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                Colaboradores — {previewPopupArea.name}
              </span>
              <button
                type="button"
                onClick={() => setPreviewPopupArea(null)}
                className="w-6 h-6 bg-neutral-100 dark:bg-neutral-700 rounded-full flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            {previewPopupLoading ? (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : previewPopupColabs.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 py-2">No hay colaboradores.</p>
            ) : (
              <ul className="space-y-1 max-h-52 overflow-y-auto">
                {previewPopupColabs.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-neutral-50 dark:bg-neutral-700/50 text-sm"
                  >
                    <User className="h-3.5 w-3 text-neutral-400 shrink-0" />
                    <span className="truncate">{c.nombreCompleto}</span>
                    {c.rol && (
                      <Badge variant="outline" className="text-xs shrink-0 ml-auto">
                        {c.rol}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <Dialog
        open={!!colaboradoresDialogArea}
        onOpenChange={(open) => {
          if (!open) {
            setColaboradoresDialogArea(null);
            setColabBuscarNombre('');
            setOpenColabCombo(false);
          }
        }}
      >
        <DialogContent className={`${modalContentClass} max-w-lg overflow-hidden flex flex-col max-h-[90dvh] sm:max-h-[90dvh]`}>
          <DialogHeader className="space-y-1.5 sm:space-y-2 shrink-0 pb-1">
            <DialogTitle className="flex items-start gap-2 text-base sm:text-xl pr-12 sm:pr-8 leading-tight">
              <Users className="h-5 w-5 text-primary-500 shrink-0 mt-0.5" />
              <span className="break-words">
                Colaboradores — <span className="font-semibold">{colaboradoresDialogArea?.name}</span>
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-base text-neutral-600 dark:text-neutral-400 hidden sm:block">
              Agrega o quita usuarios de esta área. Los colaboradores son los que aparecen en la asistencia del área.
            </DialogDescription>
            <DialogDescription className="text-xs text-neutral-500 dark:text-neutral-400 sm:hidden">
              Agrega o quita usuarios.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-2">
              <div className="relative flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => usuariosDisponiblesParaAgregar.length > 0 && setOpenColabCombo((v) => !v)}
                  className="flex h-11 sm:h-10 w-full items-center justify-between rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-950 dark:ring-offset-neutral-950 dark:placeholder:text-neutral-400 dark:focus:ring-primary-600 touch-manipulation"
                  disabled={usuariosDisponiblesParaAgregar.length === 0}
                >
                  <span className="truncate text-left">
                    {selectedUserIdsToAdd.length === 0
                      ? 'Seleccionar usuarios para agregar...'
                      : `${selectedUserIdsToAdd.length} usuario(s) seleccionado(s)`}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </button>
                {openColabCombo && usuariosDisponiblesParaAgregar.length > 0 && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      aria-hidden
                      onClick={() => setOpenColabCombo(false)}
                    />
                    <div className="absolute z-50 mt-1 left-0 right-0 sm:left-auto sm:right-auto w-full rounded-md border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800 overflow-hidden max-h-[70vh] flex flex-col">
                      <div className="p-2 border-b border-neutral-200 dark:border-neutral-700 shrink-0 bg-white dark:bg-neutral-800">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                          <Input
                            placeholder="Buscar por nombre..."
                            value={colabBuscarNombre}
                            onChange={(e) => setColabBuscarNombre(e.target.value)}
                            className="pl-8 h-10 sm:h-9 text-sm touch-manipulation"
                            onKeyDown={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      <div className="max-h-52 sm:max-h-56 overflow-auto p-1 min-h-0">
                        {usuariosDisponiblesFiltradosPorNombre.length === 0 ? (
                          <p className="py-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
                            Ningún usuario coincide con la búsqueda.
                          </p>
                        ) : (
                          usuariosDisponiblesFiltradosPorNombre.map((u) => (
                            <label
                              key={u.id}
                              className="flex cursor-pointer items-center gap-2 rounded-sm py-2 px-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 active:bg-neutral-100 dark:active:bg-neutral-700 touch-manipulation min-h-[44px]"
                            >
                              <input
                                type="checkbox"
                                checked={selectedUserIdsToAdd.includes(u.id)}
                                onChange={() => toggleUsuarioToAdd(u.id)}
                                className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500 w-4 h-4 shrink-0"
                              />
                              <span className="truncate text-neutral-900 dark:text-neutral-100">
                                {u.nombreCompleto?.trim() || `Usuario ${u.id}`}
                              </span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
              <Button
                onClick={agregarColaboradores}
                disabled={selectedUserIdsToAdd.length === 0 || addingColab}
                className="gap-1 shrink-0 min-h-11 touch-manipulation w-full sm:w-auto"
              >
                {addingColab ? (
                  <span className="animate-pulse">Agregando...</span>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Agregar {selectedUserIdsToAdd.length > 0 ? `(${selectedUserIdsToAdd.length})` : ''}
                  </>
                )}
              </Button>
            </div>
            {usuariosDisponiblesParaAgregar.length === 0 && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                No hay usuarios disponibles (todos están en un área o son responsables).
              </p>
            )}

            {colaboradoresLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : colaboradores.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 py-4 text-center">
                No hay colaboradores en esta área. Agrega uno desde el selector de arriba.
              </p>
            ) : (
              <ul className="space-y-2 max-h-[42vh] sm:max-h-64 overflow-y-auto overscroll-contain border rounded-xl sm:rounded-lg p-3 sm:p-2 bg-neutral-50 dark:bg-neutral-800/50">
                {colaboradores.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-2 py-3 px-3 sm:py-2 rounded-xl sm:rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-neutral-900 dark:text-neutral-100 truncate text-base sm:text-sm">
                        {c.nombreCompleto}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                        {c.email} {c.rol ? ` · ${c.rol}` : ''}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => quitarColaborador(c.id)}
                      disabled={removingColabId === c.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0 gap-1.5 flex items-center min-h-11 min-w-11 sm:min-h-10 sm:min-w-10 touch-manipulation px-3 rounded-xl sm:rounded-md text-sm"
                      title="Quitar de esta área"
                    >
                      {removingColabId === c.id ? (
                        <span className="animate-pulse">...</span>
                      ) : (
                        <>
                          <UserMinus className="h-4 w-4 shrink-0" />
                          <span>Quitar</span>
                        </>
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-3 pb-4 sm:pb-0 shrink-0 border-t border-neutral-200 dark:border-neutral-700 mt-2">
            <Button variant="outline" onClick={() => setColaboradoresDialogArea(null)} className="w-full sm:w-auto min-h-12 sm:min-h-11 touch-manipulation text-base rounded-xl sm:rounded-md">
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AreasModule;
