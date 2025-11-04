import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../../../components/ui/table';
import { 
  Users, 
  Search, 
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  User,
  Mail,
  History,
  LogIn,
  LogOut,
  Coffee,
  ArrowRight,
  Download,
  CheckCircle,
} from 'lucide-react';
import { api } from '../../../services/core/api';

interface MarcacionData {
  id: number;
  empleadoId: number;
  nombreCompleto: string;
  tipo: 'entrada' | 'salida_refrigerio' | 'regreso_refrigerio' | 'salida';
  fecha: string;
  hora: string;
  ip: string;
  dispositivo: string;
  observaciones?: string;
  fechaCreacion: string;
}

interface UsuarioAsistencia {
  id: number;
  nombre: string;
  cargo: string;
  departamento: string;
  email?: string;
  rol?: string;
  totalMarcaciones: number;
  ultimaMarcacion: MarcacionData | null;
  marcaciones: MarcacionData[];
}

export const AsistenciaListaModule: React.FC = () => {
  const [usuarios, setUsuarios] = useState<UsuarioAsistencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [modalHistorial, setModalHistorial] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<UsuarioAsistencia | null>(null);
  const [historialAsistencias, setHistorialAsistencias] = useState<MarcacionData[]>([]);
  const [fechaHistorial, setFechaHistorial] = useState<string>('');
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  
  // Filtros para exportación
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');
  const [rolFiltro, setRolFiltro] = useState<string>('');
  const [modalExportarAbierto, setModalExportarAbierto] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [exportacionExitosa, setExportacionExitosa] = useState(false);
  const [nombreArchivoExportado, setNombreArchivoExportado] = useState<string>('');
  
  // Roles únicos para el filtro (excluyendo TABLET1, TABLET2, PRINCIPAL, TV)
  const rolesExcluidos = ['TABLET1', 'TABLET2', 'PRINCIPAL', 'TV'];
  const rolesUnicos = Array.from(
    new Set(usuarios.map(u => u.rol).filter(Boolean))
  ).filter((rol): rol is string => 
    Boolean(rol && rol.trim() !== '' && !rolesExcluidos.includes(rol.toUpperCase()))
  );


  // Función para obtener el icono según el tipo (igual que en asistencia.module.tsx)
  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'entrada':
        return <LogIn size={16} />;
      case 'salida_refrigerio':
        return <Coffee size={16} />;
      case 'regreso_refrigerio':
        return <ArrowRight size={16} />;
      case 'salida':
        return <LogOut size={16} />;
      default:
        return <History size={16} />;
    }
  };

  // Función para ordenar las marcaciones en orden lógico de jornada
  const ordenarMarcaciones = (marcaciones: MarcacionData[]) => {
    const ordenTipos = {
      'entrada': 1,
      'salida_refrigerio': 2,
      'regreso_refrigerio': 3,
      'salida': 4
    };

    return [...marcaciones].sort((a, b) => {
      // Primero por orden lógico de tipos
      const ordenA = ordenTipos[a.tipo as keyof typeof ordenTipos] || 999;
      const ordenB = ordenTipos[b.tipo as keyof typeof ordenTipos] || 999;
      
      if (ordenA !== ordenB) {
        return ordenA - ordenB;
      }
      
      // Si son del mismo tipo, ordenar por hora
      return a.hora.localeCompare(b.hora);
    });
  };

  // Función para ver historial de asistencias
  const verHistorialAsistencia = async (usuario: UsuarioAsistencia) => {
    console.log('📊 Ver historial de asistencia para:', usuario.nombre);
    setUsuarioSeleccionado(usuario);
    setModalHistorial(true);
    // No cargar automáticamente, solo cuando el usuario seleccione una fecha
  };

  // Función para cargar historial de asistencias
  const cargarHistorialAsistencias = async (usuarioId: number) => {
    try {
      setCargandoHistorial(true);
      
      const params = new URLSearchParams();
      if (fechaHistorial) params.append('fecha', fechaHistorial);
      
      const response = await api.get(`/asistencia/historial/${usuarioId}?${params.toString()}`);
      const data = response.data;
      
      if (data.success) {
        const historialMapeado: MarcacionData[] = data.marcaciones.map((marcacion: any) => ({
          id: marcacion.id,
          empleadoId: marcacion.empleadoId,
          nombreCompleto: marcacion.nombreCompleto,
          tipo: marcacion.tipo,
          fecha: marcacion.fecha,
          hora: marcacion.hora,
          ip: marcacion.ip || '',
          dispositivo: marcacion.dispositivo || '',
          observaciones: marcacion.observaciones || '',
          fechaCreacion: marcacion.fechaCreacion
        }));
        
        setHistorialAsistencias(historialMapeado);
      } else {
        throw new Error('Error al cargar historial');
      }
    } catch (error) {
      console.error('❌ Error al cargar historial:', error);
      setHistorialAsistencias([]);
    } finally {
      setCargandoHistorial(false);
    }
  };

  // Función para cerrar modal
  const cerrarModalHistorial = () => {
    setModalHistorial(false);
    setUsuarioSeleccionado(null);
    setHistorialAsistencias([]);
    setFechaHistorial('');
  };

  // Cargar historial cuando cambie la fecha
  useEffect(() => {
    if (modalHistorial && usuarioSeleccionado && fechaHistorial) {
      cargarHistorialAsistencias(usuarioSeleccionado.id);
    }
  }, [fechaHistorial]);


  // Función para cargar lista de usuarios
  const cargarListaAsistencia = async () => {
    try {
      setLoading(true);

      const response = await api.get('/usuarios/por-rol');
      const data = response.data;

      if (data.success) {
        const usuariosArray = data.usuarios.map((usuario: any) => ({
          id: usuario.id,
          nombre: usuario.nombreCompleto,
          cargo: '',
          departamento: '',
          email: usuario.email,
          rol: usuario.rol,
          dni: usuario.dni,
          totalMarcaciones: 0,
          ultimaMarcacion: null,
          marcaciones: []
        }));
        
        setUsuarios(usuariosArray);
      } else {
        throw new Error(data.message || 'Error al cargar lista de usuarios');
      }
    } catch (error: any) {
      console.error('❌ Error al cargar lista:', error);
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    cargarListaAsistencia();
  }, []);


  // Función para exportar a Excel
  const exportarAExcel = async () => {
    if (!fechaInicio) {
      alert('Por favor, selecciona la fecha de inicio para exportar');
      return;
    }
    
    if (!fechaFin) {
      alert('Por favor, selecciona la fecha de fin para exportar');
      return;
    }
    
    if (!rolFiltro) {
      alert('Por favor, selecciona un rol para exportar');
      return;
    }

    // Validar que la fecha de inicio no sea mayor que la fecha de fin
    if (new Date(fechaInicio) > new Date(fechaFin)) {
      alert('La fecha de inicio no puede ser mayor que la fecha de fin');
      return;
    }

    setExportando(true);
    try {
      // El backend maneja la exportación y devuelve el archivo Excel
      const params = new URLSearchParams();
      params.append('fechaInicio', fechaInicio);
      params.append('fechaFin', fechaFin);
      // Si es "TODOS", enviar "TODOS" al backend para que maneje todos los roles
      params.append('rol', rolFiltro === 'TODOS' ? 'TODOS' : rolFiltro);

      // Realizar petición al backend para exportar
      const response = await api.get(`/marcaciones/exportar?${params.toString()}`, {
        responseType: 'blob' // Importante para recibir archivos binarios
      });

      // Crear URL del blob y descargar
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generar nombre del archivo
      const fechaInicioFormato = fechaInicio.split('-').reverse().join('');
      const fechaFinFormato = fechaFin.split('-').reverse().join('');
      const rolNombreArchivo = rolFiltro === 'TODOS' ? 'TODOS_LOS_ROLES' : rolFiltro;
      const nombreArchivo = `Asistencia_${fechaInicioFormato}_${fechaFinFormato}_${rolNombreArchivo}.xlsx`;
      link.setAttribute('download', nombreArchivo);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      // Mostrar mensaje de éxito en el modal
      setNombreArchivoExportado(nombreArchivo);
      setExportacionExitosa(true);
      
      // Cerrar el modal automáticamente después de 2 segundos
      setTimeout(() => {
        setModalExportarAbierto(false);
        setExportacionExitosa(false);
        setNombreArchivoExportado('');
        setExportando(false); // Resetear estado de exportación
        // Limpiar filtros después de exportar
        setFechaInicio('');
        setFechaFin('');
        setRolFiltro('');
      }, 2000);
    } catch (error: any) {
      console.error('❌ Error al exportar a Excel:', error);
      setExportando(false);
      
      // Mostrar error en el modal
      if (error.response?.status === 404) {
        alert('El endpoint de exportación no está disponible. Por favor, contacta al administrador del sistema.');
      } else {
        alert('Error al exportar los datos. Por favor, intenta nuevamente.');
      }
    }
  };

  // Filtrar usuarios por término de búsqueda
  const usuariosFiltrados = usuarios.filter(usuario =>
    usuario.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    usuario.cargo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    usuario.departamento.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Paginación
  const totalPages = Math.ceil(usuariosFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const usuariosPaginados = usuariosFiltrados.slice(startIndex, endIndex);



  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 dark:text-gray-400">Cargando lista de asistencia...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Lista de Usuarios */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary-500" />
                  Lista de Usuarios
                </CardTitle>
                <div className="mt-2">
                  <Badge variant="secondary" className="text-xs">
                    Mostrando usuarios según permisos
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {!loading && (
                  <span className="text-sm font-normal text-neutral-500">
                    {usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''} en total
                  </span>
                )}
                <Button
                  onClick={() => setModalExportarAbierto(true)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Exportar a Excel
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        
        {/* Búsqueda */}
        <div className="pb-4">
          <div className="flex items-center gap-4">
            <div className="relative max-w-lg">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={18} />
              <Input
                type="text"
                placeholder="Buscar usuarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 text-base"
              />
            </div>
            {searchTerm && (
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                Filtro activo
              </div>
            )}
          </div>
        </div>
        
        <CardContent>
          {usuariosPaginados.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-neutral-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                No hay registros de asistencia
              </h3>
              <p className="text-neutral-500 dark:text-neutral-400">
                No se encontraron registros para los filtros seleccionados
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuariosPaginados.map((usuario) => (
                    <TableRow key={usuario.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-neutral-500" />
                          </div>
                          <div>
                            <div className="font-medium text-neutral-900 dark:text-neutral-100">
                              {usuario.nombre}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Mail className="h-4 w-4 text-neutral-400" />
                          <span className="text-sm text-neutral-600 dark:text-neutral-400">
                            {usuario.email || 'N/A'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {usuario.rol || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => verHistorialAsistencia(usuario)}
                          className="h-8 w-8 p-0 hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-900/20 dark:hover:border-red-600"
                          title="Ver historial de asistencias"
                        >
                          <History className="h-4 w-4 text-red-600 dark:text-red-400" />
                        </Button>
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
      {!loading && usuariosFiltrados.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                Mostrando {startIndex + 1} a {Math.min(endIndex, usuariosFiltrados.length)} de {usuariosFiltrados.length} usuarios
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
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
                        onClick={() => setCurrentPage(pageNum)}
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
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
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

      {/* Modal de Exportación a Excel */}
      <Dialog open={modalExportarAbierto} onOpenChange={(open) => {
        setModalExportarAbierto(open);
        if (!open) {
          // Limpiar estados al cerrar el modal
          setExportacionExitosa(false);
          setNombreArchivoExportado('');
          setFechaInicio('');
          setFechaFin('');
          setRolFiltro('');
          setExportando(false); // Resetear estado de exportación
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {exportacionExitosa ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <Download className="h-5 w-5 text-primary-500" />
              )}
              {exportacionExitosa ? 'Exportación Exitosa' : 'Exportar a Excel'}
            </DialogTitle>
            <DialogDescription>
              {exportacionExitosa 
                ? `El archivo ${nombreArchivoExportado} se ha descargado exitosamente.`
                : 'Selecciona el rango de fechas y el rol para exportar los registros de asistencia.'
              }
            </DialogDescription>
          </DialogHeader>
          
          {exportacionExitosa ? (
            <div className="py-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="text-green-800 dark:text-green-200 font-medium mb-1">
                  ✅ Exportación completada
                </p>
                <p className="text-sm text-green-600 dark:text-green-300">
                  {nombreArchivoExportado}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Fecha de Inicio *
                </label>
                <Input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Fecha de Fin *
                </label>
                <Input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Rol *
              </label>
              <Select
                value={rolFiltro || undefined}
                onValueChange={setRolFiltro}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS" className="font-semibold">
                    Todos los roles
                  </SelectItem>
                  {rolesUnicos
                    .filter((rol): rol is string => Boolean(rol && rol.trim() !== ''))
                    .map((rol) => (
                      <SelectItem key={rol} value={rol}>
                        {rol}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          )}

          <DialogFooter>
            {exportacionExitosa ? (
              <Button
                onClick={() => {
                  setModalExportarAbierto(false);
                  setExportacionExitosa(false);
                  setNombreArchivoExportado('');
                  setExportando(false); // Resetear estado de exportación
                  setFechaInicio('');
                  setFechaFin('');
                  setRolFiltro('');
                }}
                className="w-full"
              >
                Cerrar
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFechaInicio('');
                    setFechaFin('');
                    setRolFiltro('');
                    setExportando(false); // Resetear estado de exportación
                    setModalExportarAbierto(false);
                  }}
                  disabled={exportando}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={exportarAExcel}
                  disabled={exportando || !fechaInicio || !fechaFin || !rolFiltro}
                  className="flex items-center gap-2"
                >
                  {exportando ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Exportar
                    </>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Historial de Asistencias */}
      {modalHistorial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Header del Modal */}
            <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <History className="h-5 w-5 text-primary-500" />
                  Historial de Asistencias
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {usuarioSeleccionado?.nombre}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={cerrarModalHistorial}
                className="h-8 w-8 p-0"
              >
                ✕
              </Button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6">
              {/* Filtro de Fecha */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                  Seleccionar fecha para ver el historial de asistencias
                </label>
                <div className="max-w-xs">
                  <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                    Fecha
                  </label>
                  <Input
                    type="date"
                    value={fechaHistorial}
                    onChange={(e) => setFechaHistorial(e.target.value)}
                    className="w-full"
                  />
                </div>
                {fechaHistorial && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                    Mostrando historial de asistencias del {fechaHistorial}
                  </p>
                )}
              </div>

              {/* Lista de Asistencias */}
              {cargandoHistorial ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-neutral-600 dark:text-neutral-400">Cargando historial...</p>
                </div>
              ) : fechaHistorial && historialAsistencias.length === 0 ? (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                  <p className="text-neutral-600 dark:text-neutral-400">No hay registros en el historial de asistencias para la fecha seleccionada</p>
                </div>
              ) : !fechaHistorial ? (
                <div className="text-center py-8">
                  <div className="text-neutral-500 dark:text-neutral-400">
                    <History className="h-12 w-12 mx-auto mb-4" />
                    <p>Selecciona una fecha para ver el historial de asistencias</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {ordenarMarcaciones(historialAsistencias).map((marcacion) => (
                    <div
                      key={marcacion.id}
                      className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-700 rounded-lg border border-neutral-200 dark:border-neutral-600"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${
                          marcacion.tipo === 'entrada' ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400' : 
                          marcacion.tipo === 'salida' ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                          marcacion.tipo === 'salida_refrigerio' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400' :
                          marcacion.tipo === 'regreso_refrigerio' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' :
                          'bg-gray-100 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400'
                        }`}>
                          {getTipoIcon(marcacion.tipo)}
                        </div>
                        <div>
                          <div className="font-medium text-neutral-900 dark:text-neutral-100 capitalize text-sm">
                            {marcacion.tipo.replace('_', ' ')}
                          </div>
                          <div className="text-xs text-neutral-500 dark:text-neutral-400">
                            {marcacion.observaciones || 'Sin observaciones'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                          {marcacion.hora}
                        </div>
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">
                          {marcacion.fecha.split('-').reverse().join('/')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div className="flex justify-end gap-3 p-6 border-t border-neutral-200 dark:border-neutral-700">
              <Button
                variant="outline"
                onClick={cerrarModalHistorial}
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
