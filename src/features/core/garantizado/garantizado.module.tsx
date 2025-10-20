import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Switch } from '../../../components/ui/switch';
import { 
  Search, 
  Filter, 
  Download, 
  User, 
  Car,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Shield,
  ShieldOff,
  X
} from 'lucide-react';
import { api } from '../../../services/core/api';
import socketService from '../../../services/socket-service';

interface GarantizadoData {
  id: number;
  nombreCompleto: string;
  numeroLicencia: string;
  telefono: string;
  viajes: number;
  efectivo: number;
  pagoSinEfectivo: number;
  comYango: number;
  comYego: number;
  boSemAnt: number;
  boSemAct: number;
  total: number;
  garantizado: number;
  diferencia: number;
  semana: string;
  viajesActuales: number;
  flotaId: string;
  garantizadoValor: string;
  fechaCreacion: string;
  fechaActualizacion: string;
  activo: boolean;
}

interface FlotaResponse {
  id: string;
  name: string;
  city: string;
  specifications: string[];
}


export const GarantizadoModule: React.FC = () => {
  
  const [data, setData] = useState<GarantizadoData[]>([]);
  const [filteredData, setFilteredData] = useState<GarantizadoData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [flotaFilter, setFlotaFilter] = useState<string>('');
  const [flotas, setFlotas] = useState<FlotaResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTable, setLoadingTable] = useState(false);
  const [loadingFlotas, setLoadingFlotas] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [siteAccessEnabled, setSiteAccessEnabled] = useState(true);
  const [itemsPerPage] = useState(6);
  const [totalConductores, setTotalConductores] = useState(0);
  const [semanaActual, setSemanaActual] = useState<string>('');
  const [semanaAnterior, setSemanaAnterior] = useState<string>('');
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [exporting, setExporting] = useState(false);
  const hasLoadedRef = useRef(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFilters, setExportFilters] = useState({
    flotaId: '',
    estado: '',
    semana: ''
  });

  // El backend ya calcula todo automáticamente, no necesitamos calcular nada en el frontend


  // Función para cargar flotas desde la API
  const cargarFlotas = async () => {
    try {
      setLoadingFlotas(true);
      console.log('🔍 [GarantizadoModule] Cargando flotas...');
      
      const response = await api.get('/flota/todas');
      console.log('✅ [GarantizadoModule] Flotas cargadas:', response.data);
      
      setFlotas(response.data);
    } catch (error: any) {
      console.error('❌ [GarantizadoModule] Error al cargar flotas:', error);
      setFlotas([]);
    } finally {
      setLoadingFlotas(false);
    }
  };

  // Función para manejar el cambio de estado del acceso al sitio
  const handleSiteAccessChange = async (enabled: boolean) => {
    try {
      console.log(`🔄 [GarantizadoModule] Cambiando acceso al sitio a: ${enabled ? 'HABILITADO' : 'DESHABILITADO'}`);
      
      // Aquí puedes agregar la llamada a la API para actualizar el estado en el backend
      // await api.post('/garantizado/site-access', { enabled });
      
      setSiteAccessEnabled(enabled);
      
      // Mostrar notificación
      if (enabled) {
        console.log('✅ Acceso al sitio HABILITADO');
      } else {
        console.log('🔒 Acceso al sitio DESHABILITADO');
      }
    } catch (error) {
      console.error('❌ Error al cambiar el acceso al sitio:', error);
      // Revertir el cambio si hay error
      setSiteAccessEnabled(!enabled);
    }
  };

  // El backend ya calcula el garantizado automáticamente basado en los rangos configurados

  // Función para cargar conductores desde la API
  const cargarConductores = async (isInitialLoad = false) => {
    // Protección contra llamadas múltiples en carga inicial
    if (isInitialLoad && hasLoadedRef.current) {
      console.log('⚠️ [GarantizadoModule] Ya se cargó una vez, evitando llamada duplicada');
      return;
    }

    try {
      if (isInitialLoad) {
        setLoading(true);
        hasLoadedRef.current = true;
        setHasLoadedOnce(true);
      } else {
        setLoadingTable(true);
      }
      console.log('🔍 [GarantizadoModule] Cargando conductores...');
      
      let endpoint = '/garantizado/procesar-semana-anterior'; // Por defecto semana anterior
      
      // Si hay una flota seleccionada, usar el endpoint específico de flota
      if (flotaFilter && flotaFilter !== '') {
        endpoint = `/garantizado/flota/${flotaFilter}`;
      }
      
      console.log('📡 [GarantizadoModule] Llamando endpoint:', endpoint);
      
      const response = await api.get(endpoint);
      console.log('✅ [GarantizadoModule] Conductores cargados:', response.data);
      
      // Manejar el response del backend que viene con este formato:
      // { "semanaAnterior": "SEMANA41", "semanaActual": "SEMANA42", "conductores": [...] }
      let conductoresData: GarantizadoData[] = [];
      let semanaActualFromResponse = '';
      let semanaAnteriorFromResponse = '';
      
      if (response.data && response.data.conductores && Array.isArray(response.data.conductores)) {
        // Formato actual del backend: { semanaAnterior, semanaActual, conductores }
        conductoresData = response.data.conductores;
        semanaActualFromResponse = response.data.semanaActual || '';
        semanaAnteriorFromResponse = response.data.semanaAnterior || '';
      } else if (Array.isArray(response.data)) {
        // Si viene como array directo (fallback)
        conductoresData = response.data;
        if (conductoresData.length > 0 && conductoresData[0].semana) {
          semanaActualFromResponse = conductoresData[0].semana;
          semanaAnteriorFromResponse = conductoresData[0].semana;
        }
      } else if (response.data && response.data.content && Array.isArray(response.data.content)) {
        // Si viene como objeto con content (paginación - fallback)
        conductoresData = response.data.content;
        semanaActualFromResponse = response.data.semanaActual || '';
        semanaAnteriorFromResponse = response.data.semanaAnterior || '';
      } else {
        // Fallback: asegurar que siempre sea un array
        conductoresData = [];
        console.warn('⚠️ [GarantizadoModule] Response no tiene formato esperado:', response.data);
      }
      
      // Establecer la semana actual (para el texto del período)
      if (semanaActualFromResponse) {
        setSemanaActual(semanaActualFromResponse);
      }
      
      // Establecer la semana anterior (para mostrar en la tabla)
      if (semanaAnteriorFromResponse) {
        setSemanaAnterior(semanaAnteriorFromResponse);
      }
      
      // Asegurar que siempre sean arrays
      const safeConductoresData = Array.isArray(conductoresData) ? conductoresData : [];
      
      setData(safeConductoresData);
      setFilteredData(safeConductoresData);
      setTotalConductores(safeConductoresData.length);
      
      // Marcar que la carga inicial se completó
      if (isInitialLoad) {
        setInitialLoadDone(true);
      }
      
    } catch (error: any) {
      console.error('❌ [GarantizadoModule] Error al cargar conductores:', error);
      setData([]);
      setFilteredData([]);
      setTotalConductores(0);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setLoadingTable(false);
      }
    }
  };

  useEffect(() => {
    console.log('🚀 [GarantizadoModule] Montando componente - Iniciando carga...');
    
    // Cargar flotas al inicializar el componente
    cargarFlotas();
    
    // Cargar conductores SOLO UNA VEZ al inicializar
    if (!hasLoadedRef.current) {
      cargarConductores(true); // true = carga inicial
    }

    // Configurar WebSocket para actualizaciones automáticas
    const handleGarantizadoUpdate = (event: any) => {
      console.log('📊 [GarantizadoModule] Evento de garantizado recibido:', event);
      
      if (event.type === 'GARANTIZADO_TABLE_UPDATE') {
        console.log('🔄 [GarantizadoModule] Actualizando tabla con datos del WebSocket');
        
        // Actualizar datos con los recibidos del WebSocket
        const conductoresData = event.conductores || [];
        const semanaActualFromEvent = event.semanaActual || '';
        const semanaAnteriorFromEvent = event.semanaAnterior || '';
        
        setData(conductoresData);
        setFilteredData(conductoresData);
        setTotalConductores(conductoresData.length);
        
        if (semanaActualFromEvent) {
          setSemanaActual(semanaActualFromEvent);
        }
        
        if (semanaAnteriorFromEvent) {
          setSemanaAnterior(semanaAnteriorFromEvent);
        }
        
        // Mostrar notificación de actualización
        console.log(`✅ [GarantizadoModule] Tabla actualizada: ${conductoresData.length} conductores`);
        
        // Mostrar notificación visual
        setShowUpdateNotification(true);
    setTimeout(() => {
          setShowUpdateNotification(false);
        }, 5000); // Ocultar después de 5 segundos
      }
    };

    // Suscribirse a eventos de garantizado
    socketService.on('garantizado', handleGarantizadoUpdate);

    // Cleanup: desuscribirse cuando el componente se desmonte
    return () => {
      socketService.off('garantizado', handleGarantizadoUpdate);
    };
  }, []); // Array vacío para que solo se ejecute una vez

  // Cargar conductores cuando cambie la flota seleccionada
  useEffect(() => {
    // Solo cargar si ya se hizo la carga inicial y flotaFilter cambió de un valor válido
    if (initialLoadDone && flotaFilter !== undefined) {
      cargarConductores(false); // false = no es carga inicial, solo tabla
      setCurrentPage(1); // Resetear a la primera página cuando cambie la flota
    }
  }, [flotaFilter, initialLoadDone]);

  // Aplicar filtros localmente cuando cambien los términos de búsqueda o status
  useEffect(() => {
    const safeData = Array.isArray(data) ? data : [];
    let filtered = safeData;

    // Filtrar por término de búsqueda si existe
    if (searchTerm && searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.nombreCompleto.toLowerCase().includes(searchLower) ||
        item.numeroLicencia.toLowerCase().includes(searchLower)
      );
    }
    
    // Filtrar por status si existe
    if (statusFilter && statusFilter !== '' && statusFilter !== 'TODOS') {
      filtered = filtered.filter(item =>
        item.garantizadoValor === statusFilter
      );
    }

    setFilteredData(filtered);
    setTotalConductores(filtered.length);
    setCurrentPage(1); // Resetear a la primera página cuando cambien los filtros
  }, [data, searchTerm, statusFilter]);

  // Funciones de paginación
  const totalPages = Math.ceil(totalConductores / itemsPerPage);
  
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Calcular datos paginados
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const safeFilteredData = Array.isArray(filteredData) ? filteredData : [];
  const paginatedData = safeFilteredData.slice(startIndex, endIndex);

  // El backend ya calcula el estado automáticamente

  // Función para abrir modal de exportación
  const handleOpenExportModal = () => {
    console.log('🔍 [GarantizadoModule] Abriendo modal de exportación...');
    console.log('📊 [GarantizadoModule] Flotas disponibles:', flotas);
    console.log('📊 [GarantizadoModule] Flota actual:', flotaFilter);
    console.log('📊 [GarantizadoModule] Estado actual:', statusFilter);
    console.log('📊 [GarantizadoModule] Semana actual:', semanaActual);
    console.log('📊 [GarantizadoModule] Semana anterior:', semanaAnterior);
    
    setExportFilters({
      flotaId: flotaFilter || '',
      estado: statusFilter || '',
      semana: semanaAnterior || '' // Usar semana anterior por defecto
    });
    setShowExportModal(true);
  };

  // Función para exportar datos a Excel
  const handleExportExcel = async () => {
    try {
      setExporting(true);
      console.log('📊 [GarantizadoModule] Iniciando exportación a Excel...');
      
      // Usar filtros del modal
      let endpoint = '/garantizado/export/excel';
      const params: any = {};
      
      if (exportFilters.flotaId && exportFilters.flotaId !== '') {
        params.flotaId = exportFilters.flotaId;
      }
      
      if (exportFilters.estado && exportFilters.estado !== '') {
        params.estado = exportFilters.estado;
      }
      
      if (exportFilters.semana && exportFilters.semana !== '') {
        params.semana = exportFilters.semana;
      }
      
      console.log('📡 [GarantizadoModule] Llamando endpoint:', endpoint, 'con params:', params);
      
      const response = await api.get(endpoint, {
        params,
        responseType: 'blob' // Importante para archivos binarios
      });
      
      // Crear el archivo Excel
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      // Crear URL temporal para descarga
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Nombre del archivo con fecha y semana
      const fecha = new Date().toISOString().split('T')[0];
      const nombreArchivo = `conductores_garantizado_${exportFilters.semana || 'semana'}_${fecha}.xlsx`;
      link.download = nombreArchivo;
      
      // Descargar archivo
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('✅ [GarantizadoModule] Archivo Excel descargado exitosamente');
      
      // Cerrar modal después de exportar exitosamente
      setShowExportModal(false);
      
    } catch (error: any) {
      console.error('❌ [GarantizadoModule] Error al exportar Excel:', error);
      
      let errorMessage = 'Error al exportar datos';
      
      if (error.response?.status === 404) {
        errorMessage = 'No se encontraron datos para exportar';
      } else if (error.response?.status === 500) {
        errorMessage = 'Error interno del servidor al generar el archivo';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      alert(`Error: ${errorMessage}`);
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `S/.${new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)}`;
  };

  const getStatusBadge = (garantizadoValor: string) => {
    if (garantizadoValor === 'Garantizado') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5"></span>
          Garantizado
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <span className="w-1.5 h-1.5 bg-red-400 rounded-full mr-1.5"></span>
        No Garantizado
      </span>
    );
  };


  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Notificación de actualización */}
      {showUpdateNotification && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-pulse">
          <div className="w-2 h-2 bg-white rounded-full"></div>
          <span className="font-medium">📊 Tabla actualizada automáticamente</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Módulo Garantizado
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestión y seguimiento de conductores con garantía de ingresos
          </p>
          <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
             {semanaActual ? `${semanaActual} del período de garantizado` : 'Cargando semana...'}
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="px-6 py-2"
            onClick={handleOpenExportModal}
            disabled={filteredData.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Control de Acceso al Sitio */}
      <Card className={`border-0 ${siteAccessEnabled ? 'border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800' : 'border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800'}`}>
        <CardContent className="p-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {siteAccessEnabled ? (
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              ) : (
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <ShieldOff className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {siteAccessEnabled ? 'Sitio Web Habilitado' : 'Sitio Web Bloqueado'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {siteAccessEnabled 
                    ? 'Los conductores pueden acceder al sitio web normalmente' 
                    : 'El acceso al sitio web está bloqueado para todos los conductores'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className={`text-sm font-medium ${siteAccessEnabled ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {siteAccessEnabled ? 'ACTIVO' : 'BLOQUEADO'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Estado actual
                </div>
              </div>
              <Switch
                checked={siteAccessEnabled}
                onCheckedChange={handleSiteAccessChange}
                className="data-[state=checked]:bg-green-600"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:max-w-4xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por nombre o licencia"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 px-3 py-2 h-10"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Seleccionar estado</option>
                <option value="TODOS">Todos los estados</option>
                <option value="Garantizado">Garantizado</option>
                <option value="No Garantizado">No Garantizado</option>
              </select>
            </div>
            <div>
              <select
                value={flotaFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFlotaFilter(e.target.value)}
                className="w-full px-3 py-2 h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled={loadingFlotas || flotas.length === 0}
              >
                <option value="">
                  {loadingFlotas 
                    ? 'Cargando flotas...' 
                    : flotas.length === 0 
                      ? 'Error al cargar flotas' 
                      : 'Seleccionar flota'
                  }
                </option>
                {flotas.map((flota) => (
                  <option key={flota.id} value={flota.id}>
                    {flota.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Datos */}
      <Card>
        <CardHeader className=" border-b border-red-200 dark:border-red-800">
          <CardTitle className="text-xl font-bold text-red-800 dark:text-red-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6" />
              Control del período de garantizado - {semanaAnterior || 'Cargando...'}
            </div>
            {loadingTable && (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTable ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Cargando conductores...</p>
              </div>
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto min-w-[1600px]">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-4 px-6 font-medium text-gray-900 dark:text-white min-w-[250px]">
                    Conductor
                  </th>
                  <th className="text-left py-4 px-6 font-medium text-gray-900 dark:text-white min-w-[120px]">
                    Licencia
                  </th>
                  <th className="text-left py-4 px-6 font-medium text-gray-900 dark:text-white min-w-[120px]">
                    Teléfono
                  </th>
                  <th className="text-center py-4 px-6 font-medium text-gray-900 dark:text-white min-w-[120px]">
                    Viajes
                  </th>
                  <th className="text-right py-4 px-6 font-medium text-gray-900 dark:text-white min-w-[120px]">
                    Efectivo
                  </th>
                  <th className="text-right py-4 px-6 font-medium text-gray-900 dark:text-white min-w-[130px]">
                    Sin Efectivo
                  </th>
                  <th className="text-right py-4 px-6 font-medium text-gray-900 dark:text-white min-w-[120px]">
                    Com. Yango
                  </th>
                  <th className="text-right py-4 px-6 font-medium text-gray-900 dark:text-white min-w-[120px]">
                    Com. Yego
                  </th>
                  <th className="text-right py-4 px-6 font-medium text-gray-900 dark:text-white min-w-[110px]">
                    Bono Ant.
                  </th>
                  <th className="text-right py-4 px-6 font-medium text-gray-900 dark:text-white min-w-[110px]">
                    Bono Act.
                  </th>
                  <th className="text-right py-4 px-6 font-medium text-gray-900 dark:text-white min-w-[110px]">
                    Total
                  </th>
                  <th className="text-right py-4 px-6 font-medium text-gray-900 dark:text-white min-w-[120px]">
                    Garantizado
                  </th>
                  <th className="text-right py-4 px-6 font-medium text-gray-900 dark:text-white min-w-[120px]">
                    Diferencia
                  </th>
                  <th className="text-center py-4 px-6 font-medium text-gray-900 dark:text-white min-w-[130px]">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="h-5 w-5 text-red-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-900 dark:text-white text-base">
                            {item.nombreCompleto}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-6 text-sm font-mono text-gray-700 dark:text-gray-300">
                      {item.numeroLicencia}
                    </td>
                    <td className="py-5 px-6 text-sm text-gray-700 dark:text-gray-300">
                      {item.telefono}
                    </td>
                    <td className="py-5 px-6 text-center">
                      <span className="font-medium text-gray-900 dark:text-white text-lg">
                        {item.viajes}
                      </span>
                    </td>
                    <td className="py-5 px-6 text-right text-sm font-mono text-gray-700 dark:text-gray-300">
                      {formatCurrency(item.efectivo)}
                    </td>
                    <td className="py-5 px-6 text-right text-sm font-mono text-gray-700 dark:text-gray-300">
                      {formatCurrency(item.pagoSinEfectivo)}
                    </td>
                    <td className="py-5 px-6 text-right text-sm font-mono">
                      <span className={item.comYango >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(item.comYango)}
                      </span>
                    </td>
                    <td className="py-5 px-6 text-right text-sm font-mono">
                      <span className={item.comYego >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(item.comYego)}
                      </span>
                    </td>
                    <td className="py-5 px-6 text-right text-sm font-mono text-gray-700 dark:text-gray-300">
                      {formatCurrency(item.boSemAnt)}
                    </td>
                    <td className="py-5 px-6 text-right text-sm font-mono text-gray-700 dark:text-gray-300">
                      {formatCurrency(item.boSemAct)}
                    </td>
                    <td className="py-5 px-6 text-right text-sm font-mono text-gray-900 dark:text-white">
                      {formatCurrency(item.total)}
                    </td>
                    <td className="py-5 px-6 text-right">
                      <div className="font-medium text-red-600 dark:text-red-400 text-base">
                        {formatCurrency(item.garantizado)}
                      </div>
                    </td>
                    <td className="py-5 px-6 text-right">
                      <div className={`font-medium text-base ${item.diferencia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(item.diferencia)}
                      </div>
                    </td>
                  <td className="py-5 px-6 text-center">
                    {getStatusBadge(item.garantizadoValor)}
                  </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            )}
          {paginatedData.length === 0 && (
            <div className="text-center py-12">
                  <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {flotaFilter === '' ? 'Selecciona una flota' : 'No se encontraron conductores'}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                  {flotaFilter === '' 
                    ? 'Por favor selecciona una flota para ver los conductores con garantía'
                    : 'Intenta ajustar los filtros de búsqueda o selecciona otra flota'
                  }
                </p>
            </div>
          )}

          {/* Controles de Paginación */}
            {safeFilteredData.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Mostrando {startIndex + 1} a {Math.min(endIndex, totalConductores)} de {totalConductores} conductores
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
          )}
        </CardContent>
      </Card>

      {/* Modal de Exportación Excel */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Exportar a Excel
              </h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Filtro de Flota */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Flota
                </label>
                <select
                  value={exportFilters.flotaId}
                  onChange={(e) => setExportFilters(prev => ({ ...prev, flotaId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  disabled={loadingFlotas}
                >
                  <option value="">
                    {loadingFlotas ? 'Cargando flotas...' : 'Todas las flotas'}
                  </option>
                  {flotas.map((flota) => (
                    <option key={flota.id} value={flota.id}>
                      {flota.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro de Estado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Estado
                </label>
                <select
                  value={exportFilters.estado}
                  onChange={(e) => setExportFilters(prev => ({ ...prev, estado: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Todos los estados</option>
                  <option value="Garantizado">Garantizado</option>
                  <option value="No Garantizado">No Garantizado</option>
                </select>
              </div>

              {/* Filtro de Semana */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Semana
                </label>
                <input
                  type="text"
                  value={exportFilters.semana}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 dark:bg-gray-600 dark:border-gray-600 dark:text-white cursor-not-allowed"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowExportModal(false)}
                disabled={exporting}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleExportExcel}
                disabled={exporting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {exporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
