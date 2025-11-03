import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Switch } from '../../../components/ui/switch';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../../../components/ui/select';
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
  X,
  Globe,
  MapPin,
  Plus
} from 'lucide-react';
import { api } from '../../../services/core/api';
import { useToastNotifications } from '../../../hooks/useToastNotifications';
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
  horasTrabajadas: string;
  garantizadoValor: string;
  estadoPago: 'No Pagado' | 'Pagado' | 'N/A';
  motivoRechazo: string | null;
  fechaCreacion: string;
  fechaActualizacion: string;
  activo: boolean;
  brandeo: boolean;
}

interface RegistroData {
  yegLicenciaNumero: string;
  yegFechaRegistro: string;
  yegFlota: string;
  flotaNombre: string;
  yegSemana: string;
}

interface FlotaResponse {
  id: string;
  name: string;
  city: string;
  specifications: string[];
}

interface PaisData {
  id: number;
  nombre: string;
}

interface CiudadEstructuraData {
  id: number;
  nombre: string;
  pais_id: number;
}

interface PaisEstructuraData {
  id: number;
  nombre: string;
  moneda: string;
  simbolo_moneda: string;
  ciudades: CiudadEstructuraData[];
}

interface EstructuraUbicacionesResponse {
  paises: PaisEstructuraData[];
}


export const GarantizadoModule: React.FC = () => {
  const { showSuccess, showError } = useToastNotifications();
  
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
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const [totalConductores, setTotalConductores] = useState(0);
  const [semanaActual, setSemanaActual] = useState<string>('');
  const [semanaAnterior, setSemanaAnterior] = useState<string>('');
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [exporting, setExporting] = useState(false);
  const hasLoadedRef = useRef(false);
  const hasLoadedRegistrosRef = useRef(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFilters, setExportFilters] = useState({
    flotaId: '',
    estado: '',
    semana: ''
  });
  const [showRegistros, setShowRegistros] = useState(true);
  const [registrosData, setRegistrosData] = useState<RegistroData[]>([]);
  const [loadingRegistros, setLoadingRegistros] = useState(false);
  const [totalDiferenciaGarantizados, setTotalDiferenciaGarantizados] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingPaymentChange, setPendingPaymentChange] = useState<{
    conductorId: number;
    nuevoEstado: 'No Pagado' | 'Pagado' | 'N/A';
    conductorNombre: string;
  } | null>(null);

  // Estados para el modal de procesamiento
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [estructuraUbicaciones, setEstructuraUbicaciones] = useState<EstructuraUbicacionesResponse>({ paises: [] });
  const [loadingEstructura, setLoadingEstructura] = useState(false);
  const [activeCountry, setActiveCountry] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('');
  
  // Estados para registro de ubicaciones
  const [modalViewMode, setModalViewMode] = useState<'procesamiento' | 'registro'>('procesamiento');
  const [paises, setPaises] = useState<PaisData[]>([]);
  const [loadingUbicaciones, setLoadingUbicaciones] = useState(false);
  const [nuevoPais, setNuevoPais] = useState({
    nombre: '',
    moneda: '',
    simbolo_moneda: ''
  });
  const [nuevaCiudad, setNuevaCiudad] = useState({
    pais_id: 0,
    nombre: ''
  });
  const [guardandoPais, setGuardandoPais] = useState(false);
  const [guardandoCiudad, setGuardandoCiudad] = useState(false);
  const [botonBloqueado, setBotonBloqueado] = useState(false);
  const [mensajeBloqueo, setMensajeBloqueo] = useState('');
  const [procesandoGarantizado, setProcesandoGarantizado] = useState(false);
  const [tiempoProcesamiento, setTiempoProcesamiento] = useState(0);
  const [showProcesoModal, setShowProcesoModal] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervaloRef = useRef<NodeJS.Timeout | null>(null);

  // Helper: Limpiar todos los timeouts e intervalos
  const limpiarTimers = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervaloRef.current) {
      clearInterval(intervaloRef.current);
      intervaloRef.current = null;
    }
  };

  // Helper: Formatear tiempo transcurrido (texto completo)
  const formatearTiempo = (segundos: number): string => {
    const minutos = Math.floor(segundos / 60);
    const segs = segundos % 60;
    if (minutos > 0) {
      return `${minutos} minuto${minutos > 1 ? 's' : ''} y ${segs} segundo${segs !== 1 ? 's' : ''}`;
    }
    return `${segs} segundo${segs !== 1 ? 's' : ''}`;
  };

  // Helper: Formatear tiempo en formato MM:SS
  const formatearTiempoMMSS = (segundos: number): string => {
    const minutos = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${minutos}:${segs.toString().padStart(2, '0')}`;
  };

  // Helper: Crear configuración inicial de ciudades vacía
  const createEmptyCiudadConfig = () => ({
        sinBrandeo: [
      { viajes: '', bono: '', garantizado: '', horas: '' },
      { viajes: '', bono: '', garantizado: '', horas: '' }
        ],
        conBrandeo: [
      { viajes: '', bono: '', garantizado: '', horas: '' },
      { viajes: '', bono: '', garantizado: '', horas: '' }
    ]
  });

  // Helper: Crear configuración inicial completa desde estructura dinámica
  const createInitialProcessConfig = (estructura: EstructuraUbicacionesResponse) => {
    const config: any = {};
    
    estructura.paises.forEach((pais) => {
      const ciudadesObj: any = {};
      pais.ciudades.forEach((ciudad) => {
        ciudadesObj[ciudad.nombre] = createEmptyCiudadConfig();
      });
      config[pais.nombre] = ciudadesObj;
    });
    
    return config;
  };
  
  const [processConfig, setProcessConfig] = useState<any>({});

  // Helper: Obtener ciudades según país
  const getCiudadesByCountry = (countryName: string) => {
    const pais = estructuraUbicaciones.paises.find(p => p.nombre === countryName);
    return pais ? pais.ciudades.map(c => c.nombre) : [];
  };

  // Helper: Validar que el valor no sea negativo
  const validarValorNoNegativo = (value: string): boolean => {
    if (value === '') return true; // Permitir campo vacío
    // Rechazar directamente si contiene signo negativo
    if (value.includes('-')) return false;
    const numValue = Number(value);
    return !isNaN(numValue) && numValue >= 0;
  };

  // Helper: Actualizar processConfig para un campo específico
  const updateProcessConfigField = (
    ciudad: string,
    tipo: 'sinBrandeo' | 'conBrandeo',
    field: 'viajes' | 'bono' | 'garantizado' | 'horas',
    rowIndex: number,
    value: string
  ) => {
    // Validar que no sea negativo
    if (!validarValorNoNegativo(value)) {
      return; // No permitir números negativos
    }
    
    setProcessConfig((prev: any) => {
      const ciudades = prev[activeCountry];
      return {
        ...prev,
        [activeCountry]: {
          ...ciudades,
          [ciudad]: {
            ...ciudades[ciudad],
            [tipo]: ciudades[ciudad][tipo].map((item: any, i: number) => 
              i === rowIndex ? { ...item, [field]: value } : item
            )
          }
        }
      };
    });
  };

  const addTierRow = (ciudad: string, tipo: 'sinBrandeo' | 'conBrandeo') => {
    setProcessConfig((prev: any) => {
      const ciudades = prev[activeCountry];
      return {
        ...prev,
        [activeCountry]: {
          ...ciudades,
          [ciudad]: {
            ...ciudades[ciudad],
            [tipo]: [...ciudades[ciudad][tipo], { viajes: '', bono: '', garantizado: '', horas: '' }]
          }
        }
      };
    });
  };
  
  const removeLastTierRow = (ciudad: string, tipo: 'sinBrandeo' | 'conBrandeo') => {
    setProcessConfig((prev: any) => {
      const ciudades = prev[activeCountry];
      const arr = ciudades[ciudad][tipo];
      return {
        ...prev,
        [activeCountry]: {
          ...ciudades,
          [ciudad]: {
            ...ciudades[ciudad],
            [tipo]: arr.length > 1 ? arr.slice(0, -1) : arr
          }
        }
      } as any;
    });
  };

  // Helper: Función de ordenamiento reutilizable
  const sortByGarantizado = <T extends { garantizadoValor: string }>(data: T[]): T[] => {
    return [...data].sort((a, b) => {
      if (a.garantizadoValor === 'Garantizado' && b.garantizadoValor !== 'Garantizado') return -1;
      if (a.garantizadoValor !== 'Garantizado' && b.garantizadoValor === 'Garantizado') return 1;
      return 0;
    });
  };

  // Helper: Procesar ciudades para el endpoint
  const processCiudadesForEndpoint = (ciudades: any) => {
    return Object.entries(ciudades).map(([ciudad, data]: any) => ({
      ciudad,
      sinBrandeo: data.sinBrandeo.map((t: any) => ({
        viajes: Number(t.viajes) || 0,
        bono: Number(t.bono) || 0,
        garantizado: Number(t.garantizado) || 0,
        horas: Number(t.horas) || 0
      })),
      conBrandeo: data.conBrandeo.map((t: any) => ({
        viajes: Number(t.viajes) || 0,
        bono: Number(t.bono) || 0,
        garantizado: Number(t.garantizado) || 0,
        horas: Number(t.horas) || 0
      }))
    }));
  };

  // Helper: Actualizar estado de conductor en múltiples arrays
  const updateConductorState = (
    conductorId: number,
    updater: (conductor: GarantizadoData) => GarantizadoData
  ) => {
    const updatedData = sortByGarantizado(
      data.map(c => c.id === conductorId ? updater(c) : c)
    ) as GarantizadoData[];
    
    const updatedFilteredData = sortByGarantizado(
      filteredData.map(c => c.id === conductorId ? updater(c) : c)
    ) as GarantizadoData[];
    
    setData(updatedData);
    setFilteredData(updatedFilteredData);
  };


  // Función para cargar flotas desde la API
  const cargarFlotas = async () => {
    try {
      setLoadingFlotas(true);
      const response = await api.get('/flota/todas');
      setFlotas(response.data);
    } catch (error: any) {
      setFlotas([]);
    } finally {
      setLoadingFlotas(false);
    }
  };

  // Función para cargar registros de la semana actual desde garantizadoRegistro
  const cargarRegistrosSemanaActual = async (flotaId?: string) => {
    try {
      setLoadingRegistros(true);
      
      let endpoint = '/garantizado/registros/semana-actual';
      if (flotaId && flotaId !== '') {
        endpoint = `/garantizado/registros/semana-actual?flotaId=${flotaId}`;
      }
      
      const response = await api.get(endpoint);
      
      let registrosData: RegistroData[] = [];
      
      if (response.data && Array.isArray(response.data)) {
        registrosData = response.data;
      } else if (response.data && response.data.registros && Array.isArray(response.data.registros)) {
        registrosData = response.data.registros;
      } else {
        registrosData = [];
      }
      
      setRegistrosData(registrosData);
      
    } catch (error: any) {
      setRegistrosData([]);
    } finally {
      setLoadingRegistros(false);
    }
  };


  // Función para cargar conductores desde la API
  const cargarConductores = async (isInitialLoad = false) => {
    // Protección contra llamadas múltiples en carga inicial
    if (isInitialLoad && hasLoadedRef.current) {
      return;
    }

    try {
      if (isInitialLoad) {
        setLoading(true);
        hasLoadedRef.current = true;
      } else {
        setLoadingTable(true);
      }
      
      let endpoint = '/garantizado/listar-semana-anterior';
      
      // Si hay una flota seleccionada, usar el endpoint específico de flota
      if (flotaFilter && flotaFilter !== '') {
        endpoint = `/garantizado/flota/${flotaFilter}`;
      }
      
      const response = await api.get(endpoint);
      
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
        conductoresData = [];
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
      
      // Ordenar: Garantizados primero, luego No Garantizados
      const sortedData = sortByGarantizado(safeConductoresData);
      
      setData(sortedData);
      setFilteredData(sortedData);
      setTotalConductores(sortedData.length);
      
      // Actualizar total de diferencia garantizados desde la respuesta del backend
      if (response.data && typeof response.data.totalDiferenciaGarantizados === 'number') {
        setTotalDiferenciaGarantizados(response.data.totalDiferenciaGarantizados);
      }
      
      // Marcar que la carga inicial se completó
      if (isInitialLoad) {
        setInitialLoadDone(true);
      }
      
    } catch (error: any) {
      setData([]);
      setFilteredData([]);
      setTotalConductores(0);
      setTotalDiferenciaGarantizados(0);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setLoadingTable(false);
      }
    }
  };

  // Función para cargar el estado del botón desde el backend
  const cargarEstadoProceso = async () => {
    try {
      const response = await api.get('/garantizado/estado-proceso');
      setBotonBloqueado(response.data.bloqueado || false);
      setMensajeBloqueo(response.data.mensaje || '');
    } catch (error) {
      console.error('Error al cargar estado del proceso:', error);
      setBotonBloqueado(false);
      setMensajeBloqueo('');
    }
  };

  useEffect(() => {
    // Cargar estado del botón desde el backend
    cargarEstadoProceso();
    
    // Cargar flotas al inicializar el componente
    cargarFlotas();
    
    // Cargar registros SOLO UNA VEZ al inicializar
    if (!hasLoadedRegistrosRef.current) {
      cargarRegistrosSemanaActual();
      hasLoadedRegistrosRef.current = true;
    }
    
    // Cargar conductores SOLO UNA VEZ al inicializar
    if (!hasLoadedRef.current) {
      cargarConductores(true); // true = carga inicial
    }

    // Configurar WebSocket para actualizaciones automáticas
    const handleGarantizadoUpdate = (event: any) => {
      // Manejar eventos que vienen desde /topic/system con estructura {event: '...', data: {...}}
      if (event.event === 'GARANTIZADO_PROCESS_SUCCESS') {
        const eventData = event.data || {};
        showSuccess(eventData.message || 'Proceso completado exitosamente');
        
        // Actualizar semana si viene en el evento
        if (eventData.semana) {
          setSemanaAnterior(eventData.semana);
        }
        
        // Bloquear el botón después del procesamiento
        setBotonBloqueado(true);
        setMensajeBloqueo('El botón estará bloqueado hasta el próximo lunes');
        
        // Cerrar modal de progreso si está abierto
        setShowProcesoModal(false);
        setProcesandoGarantizado(false);
        limpiarTimers();
        
        // Recargar la lista de conductores si autoReload es true
        if (eventData.autoReload !== false) {
          cargarConductores(false).then(() => {
            // Mostrar notificación visual
            setShowUpdateNotification(true);
            setTimeout(() => {
              setShowUpdateNotification(false);
            }, 5000);
          });
        }
      } else if (event.type === 'GARANTIZADO_TABLE_UPDATE') {
        // Actualizar tabla directamente con los datos recibidos
        console.log('📊 [GarantizadoModule] Actualizando tabla con datos del WebSocket');
        
        if (event.conductores && Array.isArray(event.conductores)) {
          // Ordenar: Garantizados primero, luego No Garantizados
          const sortedData = sortByGarantizado(event.conductores as GarantizadoData[]);
          
          setData(sortedData);
          setFilteredData(sortedData);
          setTotalConductores(sortedData.length);
          
          // Actualizar semana si viene en el evento
          if (event.semanaActual) {
            setSemanaActual(event.semanaActual);
          }
          if (event.semanaAnterior) {
            setSemanaAnterior(event.semanaAnterior);
          }
          
          // Actualizar total de diferencia garantizados
          if (typeof event.totalDiferenciaGarantizados === 'number') {
            setTotalDiferenciaGarantizados(event.totalDiferenciaGarantizados);
          }
          
          // Mostrar notificación visual
          setShowUpdateNotification(true);
          setTimeout(() => {
            setShowUpdateNotification(false);
          }, 5000);
        }
      } else if (event.type === 'GARANTIZADO_PROCESS_SUCCESS') {
        // Manejar evento directo (sin estructura {event, data})
        showSuccess(event.message || 'Proceso completado exitosamente');
        
        // Actualizar semana si viene en el evento
        if (event.semana) {
          setSemanaAnterior(event.semana);
        }
        
        // Bloquear el botón después del procesamiento
        setBotonBloqueado(true);
        setMensajeBloqueo('El botón estará bloqueado hasta el próximo lunes');
        
        // Cerrar modal de progreso si está abierto
        setShowProcesoModal(false);
        setProcesandoGarantizado(false);
        limpiarTimers();
        
        // Recargar la lista de conductores si autoReload es true
        if (event.autoReload !== false) {
          cargarConductores(false).then(() => {
            // Mostrar notificación visual
            setShowUpdateNotification(true);
            setTimeout(() => {
              setShowUpdateNotification(false);
            }, 5000);
          });
        }
      } else if (event.type === 'GARANTIZADO_BUTTON_BLOCKED') {
        // Botón bloqueado
        setBotonBloqueado(true);
        setMensajeBloqueo(event.mensaje || 'El botón está bloqueado hasta el próximo lunes');
      } else if (event.type === 'GARANTIZADO_BUTTON_UNBLOCKED') {
        // Botón desbloqueado
        setBotonBloqueado(false);
        setMensajeBloqueo('');
        showSuccess(event.mensaje || 'El botón está disponible para procesar');
        // Recargar el estado para obtener la información más actualizada
        cargarEstadoProceso();
      }
    };

    // Suscribirse a eventos de garantizado
    socketService.on('garantizado', handleGarantizadoUpdate);
    
    // También suscribirse a eventos del sistema
    socketService.on('system', handleGarantizadoUpdate);

    // Cleanup: desuscribirse cuando el componente se desmonte
    return () => {
      socketService.off('garantizado', handleGarantizadoUpdate);
      socketService.off('system', handleGarantizadoUpdate);
      limpiarTimers();
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

  // Resetear a página 1 y items por página a 6 cuando se cambia de vista
  useEffect(() => {
    setCurrentPage(1);
    setItemsPerPage(6);
  }, [showRegistros]);

  // Recargar registros cuando cambie el filtro de flota en vista de registros
  useEffect(() => {
    if (showRegistros && initialLoadDone && hasLoadedRegistrosRef.current) {
      cargarRegistrosSemanaActual(flotaFilter);
    }
  }, [flotaFilter, showRegistros, initialLoadDone]);

  // Aplicar filtros localmente cuando cambien los términos de búsqueda o status
  useEffect(() => {
    if (showRegistros) {
      // Para vista de registros, usar datos de registros
      const safeData = Array.isArray(registrosData) ? registrosData : [];
      let filtered = safeData;

      // Filtrar por término de búsqueda si existe (buscar en licencia y flota)
      if (searchTerm && searchTerm.trim() !== '') {
        const searchLower = searchTerm.toLowerCase();
        filtered = filtered.filter(item =>
          item.yegLicenciaNumero.toLowerCase().includes(searchLower) ||
          item.flotaNombre.toLowerCase().includes(searchLower) ||
          item.yegFlota.toLowerCase().includes(searchLower)
        );
      }

      // Filtrar por flota si existe (para vista de registros)
      if (flotaFilter && flotaFilter !== '') {
        filtered = filtered.filter(item =>
          item.yegFlota === flotaFilter
        );
      }

      setFilteredData(filtered as any);
      setTotalConductores(filtered.length);
      setCurrentPage(1);
    } else {
      // Para vista de garantizado, usar datos normales
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
      
      // Filtrar por status si existe (solo para vista de garantizado)
      if (statusFilter && statusFilter !== '' && statusFilter !== 'TODOS') {
        filtered = filtered.filter(item =>
          item.garantizadoValor === statusFilter
        );
      }

      // Ordenar: Garantizados primero, luego No Garantizados
      filtered = sortByGarantizado(filtered);

      setFilteredData(filtered);
      setTotalConductores(filtered.length);
      setCurrentPage(1);
    }
  }, [data, registrosData, showRegistros, searchTerm, statusFilter, flotaFilter]);

  // Funciones de paginación
  const totalPages = Math.ceil(totalConductores / itemsPerPage);
  
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  // Calcular datos paginados
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const safeFilteredData = Array.isArray(filteredData) ? filteredData : [];
  const paginatedData = safeFilteredData.slice(startIndex, endIndex);

  // Función para abrir modal de exportación
  const handleOpenExportModal = () => {
    setExportFilters({
      flotaId: flotaFilter || '',
      estado: statusFilter || '',
      semana: semanaAnterior || '' // Usar semana anterior por defecto
    });
    setShowExportModal(true);
  };

  // Función para cargar estructura completa de países y ciudades
  const cargarEstructuraUbicaciones = async () => {
    try {
      setLoadingEstructura(true);
      const response = await api.get<EstructuraUbicacionesResponse>('/garantizado/ubicaciones/find-all');
      
      // Manejar tipos Long del backend convirtiéndolos a number
      const estructuraMapeada: EstructuraUbicacionesResponse = {
        paises: response.data.paises.map(pais => ({
          ...pais,
          id: typeof pais.id === 'string' ? parseInt(pais.id) : Number(pais.id),
          ciudades: pais.ciudades.map(ciudad => ({
            ...ciudad,
            id: typeof ciudad.id === 'string' ? parseInt(ciudad.id) : Number(ciudad.id),
            pais_id: typeof ciudad.pais_id === 'string' ? parseInt(ciudad.pais_id) : Number(ciudad.pais_id)
          }))
        }))
      };
      
      setEstructuraUbicaciones(estructuraMapeada);
      
      // Inicializar processConfig con la estructura cargada
      const config = createInitialProcessConfig(estructuraMapeada);
      setProcessConfig(config);
      
      // Establecer país y ciudad activos (primer país y primera ciudad)
      if (estructuraMapeada.paises.length > 0) {
        const primerPais = estructuraMapeada.paises[0];
        setActiveCountry(primerPais.nombre);
        if (primerPais.ciudades.length > 0) {
          setActiveTab(primerPais.ciudades[0].nombre);
        }
      }
      
      return estructuraMapeada;
    } catch (error) {
      setEstructuraUbicaciones({ paises: [] });
      return { paises: [] };
    } finally {
      setLoadingEstructura(false);
    }
  };

  // Función para abrir modal de procesamiento
  const handleOpenProcessModal = async () => {
    setModalViewMode('procesamiento');
    setShowProcessModal(true);
    
    // Cargar estructura completa si no está cargada o si está vacía
    if (estructuraUbicaciones.paises.length === 0) {
      await cargarEstructuraUbicaciones();
    } else {
      // Reinicializar processConfig con la estructura existente
      const config = createInitialProcessConfig(estructuraUbicaciones);
      setProcessConfig(config);
      
      // Establecer país y ciudad activos
      if (estructuraUbicaciones.paises.length > 0) {
        const primerPais = estructuraUbicaciones.paises[0];
        setActiveCountry(primerPais.nombre);
        if (primerPais.ciudades.length > 0) {
          setActiveTab(primerPais.ciudades[0].nombre);
        }
      }
    }
    
    // Cargar solo países si no están cargados (para el combobox de registro)
    if (paises.length === 0) {
      cargarPaises();
    }
  };

  // Función para cargar solo la lista ligera de países (para el combobox)
  const cargarPaises = async () => {
    try {
      setLoadingUbicaciones(true);
      const response = await api.get('/garantizado/ubicaciones/paises');
      const paisesList: Array<{ id: number | string; nombre: string }> = response.data;
      // Mapear solo id y nombre (Long de Java se convierte a number en JS)
      const paisesMapeados: PaisData[] = paisesList.map(pais => ({
        id: typeof pais.id === 'string' ? parseInt(pais.id) : Number(pais.id),
        nombre: pais.nombre
      }));
      setPaises(paisesMapeados);
      return paisesMapeados;
    } catch (error) {
      setPaises([]);
      return [];
    } finally {
      setLoadingUbicaciones(false);
    }
  };

  // Helper: Capitalizar primera letra de cada palabra
  const capitalizeFirstLetter = (str: string): string => {
    if (!str) return str;
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Helper: Validar y mostrar mensaje de error
  const validateAndAlert = (condition: boolean, message: string): boolean => {
    if (condition) {
      showError(message);
      return true;
    }
    return false;
  };

  // Función para crear nuevo país
  const handleCrearPais = async () => {
    if (validateAndAlert(!nuevoPais.nombre.trim(), 'Por favor, ingresa el nombre del país')) return;
    if (validateAndAlert(!nuevoPais.moneda.trim(), 'Por favor, ingresa el código de moneda (ej: PEN, USD)')) return;
    if (validateAndAlert(!nuevoPais.simbolo_moneda.trim(), 'Por favor, ingresa el símbolo de moneda (ej: S/., $)')) return;

    try {
      setGuardandoPais(true);
      const response = await api.post('/garantizado/ubicaciones/paises', {
        nombre: nuevoPais.nombre.trim(),
        moneda: nuevoPais.moneda.trim().toUpperCase(),
        simbolo_moneda: nuevoPais.simbolo_moneda.trim()
      });
      
      // Recargar estructura completa para actualizar la vista de procesamiento
      await cargarEstructuraUbicaciones();
      
      // Recargar solo la lista ligera de países para actualizar el combobox
      const paisesActualizados = await cargarPaises();
      
      // Buscar el país recién creado para seleccionarlo automáticamente
      const paisCreado = response.data?.id || paisesActualizados.find(p => p.nombre === nuevoPais.nombre.trim())?.id;
      
      if (paisCreado) {
        // Seleccionar automáticamente el país recién creado en el formulario de ciudad
        setNuevaCiudad(prev => ({
          ...prev,
          pais_id: typeof paisCreado === 'number' ? paisCreado : Number(paisCreado)
        }));
      }
      
      // Limpiar formulario
      setNuevoPais({
        nombre: '',
        moneda: '',
        simbolo_moneda: ''
      });
      
      showSuccess(paisCreado ? 'País creado exitosamente. Ya está seleccionado para crear ciudades.' : 'País creado exitosamente');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al crear el país';
      showError(errorMessage);
    } finally {
      setGuardandoPais(false);
    }
  };

  // Función para crear nueva ciudad
  const handleCrearCiudad = async () => {
    if (validateAndAlert(!nuevaCiudad.pais_id, 'Por favor, selecciona un país')) return;
    if (validateAndAlert(!nuevaCiudad.nombre.trim(), 'Por favor, ingresa el nombre de la ciudad')) return;

    try {
      setGuardandoCiudad(true);
      await api.post('/garantizado/ubicaciones/ciudades', {
        pais_id: nuevaCiudad.pais_id,
        nombre: nuevaCiudad.nombre.trim()
      });
      
      // Recargar estructura completa para actualizar la vista de procesamiento
      await cargarEstructuraUbicaciones();
      
      // Recargar solo países (para el combobox)
      await cargarPaises();
      
      // Limpiar formulario
      setNuevaCiudad({
        pais_id: 0,
        nombre: ''
      });
      
      showSuccess('Ciudad creada exitosamente');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al crear la ciudad';
      showError(errorMessage);
    } finally {
      setGuardandoCiudad(false);
    }
  };

  // Función para procesar garantizado
  const handleProcesarGarantizado = async () => {
    const TIMEOUT_TOLERANCIA = 10 * 60 * 1000; // 10 minutos en milisegundos
    
    // Limpiar timeouts anteriores si existen
    limpiarTimers();
    
    try {
      setLoadingTable(true);
      setProcesandoGarantizado(true);
      setTiempoProcesamiento(0);
      
      // Cerrar modal de configuración y abrir modal de progreso
      setShowProcessModal(false);
      setShowProcesoModal(true);
      
      // Iniciar contador de tiempo
      intervaloRef.current = setInterval(() => {
        setTiempoProcesamiento((prev) => prev + 1);
      }, 1000);
      
      // Configurar timeout de tolerancia
      timeoutRef.current = setTimeout(() => {
        showError('El procesamiento está tomando más tiempo del esperado. Por favor, verifica el estado del servidor o intenta nuevamente.');
        setProcesandoGarantizado(false);
        setTiempoProcesamiento(0);
        setShowProcesoModal(false);
        setLoadingTable(false);
        limpiarTimers();
      }, TIMEOUT_TOLERANCIA);
      
      // Procesar todos los países con sus ciudades y valores de brandeo
      const paisesPayload = estructuraUbicaciones.paises.map(pais => ({
        pais: pais.nombre.toLowerCase().replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u'),
        ciudades: processConfig[pais.nombre] ? processCiudadesForEndpoint(processConfig[pais.nombre]) : []
      }));
      
      // Guardar la configuración
      await api.post('/garantizado/configuraciones/guardar', {
        paises: paisesPayload
      }, {
        timeout: TIMEOUT_TOLERANCIA // Timeout para la petición HTTP
      });
      
      // Procesar los garantizados por cada conductor
      await api.post('/garantizado/configuraciones/procesar', {
        paises: paisesPayload
      }, {
        timeout: TIMEOUT_TOLERANCIA // Timeout para la petición HTTP
      });
      
      // Procesar la semana anterior con las nuevas configuraciones
      await api.post('/garantizado/procesar-semana-anterior', {}, {
        timeout: TIMEOUT_TOLERANCIA // Timeout para la petición HTTP
      });
      
      // Limpiar timeouts si todo fue exitoso
      limpiarTimers();
      
      // Calcular tiempo final y mostrar notificación
      const tiempoTexto = formatearTiempo(tiempoProcesamiento);
      
      // Cerrar modal de progreso y mostrar notificación de éxito
      // El WebSocket recargará automáticamente la lista cuando el procesamiento termine
      setShowProcesoModal(false);
      setProcesandoGarantizado(false);
      setTiempoProcesamiento(0);
      
      showSuccess(`Configuración guardada y garantizados procesados exitosamente (${tiempoTexto})`);
      
    } catch (error: any) {
      // Limpiar timeouts en caso de error
      limpiarTimers();
      
      setProcesandoGarantizado(false);
      setTiempoProcesamiento(0);
      setShowProcesoModal(false);
      
      // Manejar diferentes tipos de errores
      let errorMessage = 'Error al procesar garantizado';
      
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'El procesamiento está tomando más tiempo del esperado. Por favor, verifica el estado del servidor o contacta al administrador.';
      } else if (error.response) {
        const status = error.response.status;
        errorMessage = status === 400 
          ? error.response.data?.message || 'Error en los datos enviados'
          : status === 500 
            ? 'Error interno del servidor durante el procesamiento'
            : error.response.data?.message || errorMessage;
      }
      
      showError(errorMessage);
    } finally {
      setLoadingTable(false);
    }
  };

  // Función para exportar datos a Excel
  const handleExportExcel = async () => {
    try {
      setExporting(true);
      
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
      
      // Cerrar modal después de exportar exitosamente
      setShowExportModal(false);
      
    } catch (error: any) {
      let errorMessage = 'Error al exportar datos';
      
      if (error.response?.status === 404) {
        errorMessage = 'No se encontraron datos para exportar';
      } else if (error.response?.status === 500) {
        errorMessage = 'Error interno del servidor al generar el archivo';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      showError(errorMessage);
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

  // Función para cambiar estado de pago desde el combo
  const handleCambiarEstadoPago = async (conductorId: number, nuevoEstado: 'No Pagado' | 'Pagado' | 'N/A') => {
    // Buscar el conductor para obtener su nombre
    const conductor = data.find(c => c.id === conductorId);
    if (!conductor) {
      return;
    }

    // Mostrar modal de confirmación
    setPendingPaymentChange({
      conductorId,
      nuevoEstado,
      conductorNombre: conductor.nombreCompleto
    });
    setShowConfirmModal(true);
  };

  // Función para confirmar el cambio de estado
  const confirmarCambioEstado = async () => {
    if (!pendingPaymentChange) return;

    const { conductorId, nuevoEstado } = pendingPaymentChange;
    
    try {
      // Si es "Pagado", usar el endpoint específico
      if (nuevoEstado === 'Pagado') {
        await api.put(`/garantizado/marcar-pagado/${conductorId}`);
        updateConductorState(conductorId, (c) => ({ ...c, estadoPago: 'Pagado' as const }));
      } else {
        // Para otros estados, actualizar directamente en la UI
        updateConductorState(conductorId, (c) => ({ ...c, estadoPago: nuevoEstado }));
      }
        
        // Cerrar modal
        setShowConfirmModal(false);
        setPendingPaymentChange(null);
      
    } catch (error: any) {
      let errorMessage = 'Error al cambiar estado de pago';
      
      if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || 'El conductor no está garantizado';
      } else if (error.response?.status === 404) {
        errorMessage = 'Conductor no encontrado';
      } else if (error.response?.status === 500) {
        errorMessage = 'Error interno del servidor';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showError(errorMessage);
      
      // Cerrar modal
      setShowConfirmModal(false);
      setPendingPaymentChange(null);
    }
  };

  // Función para cancelar el cambio
  const cancelarCambioEstado = () => {
    setShowConfirmModal(false);
    setPendingPaymentChange(null);
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
    <div className="p-6 space-y-6 max-w-none w-full">
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
          {!showRegistros && (
            <>
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
              <div className="relative group">
                <Button 
                  variant="primary" 
                  size="sm" 
                  className="px-6 py-2 bg-red-600 text-white"
                  onClick={handleOpenProcessModal}
                  disabled={loadingTable || botonBloqueado}
                >
                  {loadingTable ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Procesando...
                    </>
                  ) : botonBloqueado ? (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Procesar (Bloqueado)
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Procesar
                    </>
                  )}
                </Button>
                {botonBloqueado && mensajeBloqueo && (
                  <div className="absolute top-full left-0 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {mensajeBloqueo}
                    <div className="absolute bottom-full left-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Cards de Estadísticas */}
      <div className={`grid grid-cols-1 ${showRegistros ? 'md:grid-cols-1 justify-items-start' : 'md:grid-cols-4'} gap-4`}>
        {/* Total de Conductores */}
        <Card className={`border-0 bg-blue-50 dark:bg-blue-950/20 ${showRegistros ? 'w-64' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Conductores</p>
                <p className="text-4xl font-bold text-blue-900 dark:text-blue-100">{totalConductores}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conductores Garantizados */}
        {!showRegistros && (
          <Card className="border-0 bg-green-50 dark:bg-green-950/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Garantizados</p>
                  <p className="text-4xl font-bold text-green-900 dark:text-green-100">
                    {filteredData.filter(item => item.garantizadoValor === 'Garantizado').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Conductores No Garantizados */}
        {!showRegistros && (
          <Card className="border-0 bg-red-50 dark:bg-red-950/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">No Garantizados</p>
                  <p className="text-4xl font-bold text-red-900 dark:text-red-100">
                    {filteredData.filter(item => item.garantizadoValor === 'No Garantizado').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <ShieldOff className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Total Garantizado */}
        {!showRegistros && (
          <Card className="border-0 bg-blue-50 dark:bg-blue-950/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Garantizado</p>
                  <p className="text-4xl font-bold text-blue-900 dark:text-blue-100">
                    {formatCurrency(totalDiferenciaGarantizados)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por nombre o licencia"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 px-3 py-2 h-10"
              />
            </div>
            {!showRegistros && (
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
            )}
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
              {showRegistros ? `Registros de Conductores - ${registrosData.length} registros` : 'Control del período de garantizado'} - {!showRegistros && (semanaAnterior || 'Cargando...')}
            </div>
            <div className="flex items-center gap-4">
              {(loadingTable || loadingRegistros) && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
              )}
              {/* Switch para alternar vista */}
              <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-800 rounded-lg p-2">
                <span className={`text-sm font-medium ${showRegistros ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  Registros
                </span>
                <Switch
                  checked={!showRegistros}
                  onCheckedChange={(checked) => setShowRegistros(!checked)}
                  className="data-[state=checked]:bg-blue-600"
                />
                <span className={`text-sm font-medium ${!showRegistros ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  Garantizado
                </span>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(loadingTable || loadingRegistros) ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {showRegistros ? 'Cargando registros...' : 'Cargando conductores...'}
                </p>
              </div>
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className={`w-full table-auto ${showRegistros ? 'min-w-[800px]' : 'min-w-[1800px]'}`}>
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  {!showRegistros ? (
                    <>
                      <th className="text-left py-4 px-6 font-medium text-gray-900 dark:text-white min-w-[280px]">
                        Conductor
                      </th>
                      <th className="text-left py-4 px-6 font-medium text-gray-900 dark:text-white min-w-[140px]">
                        Licencia
                      </th>
                      <th className="text-left py-4 px-6 font-medium text-gray-900 dark:text-white min-w-[140px]">
                        Teléfono
                      </th>
                      <th className="text-center py-4 px-6 font-medium text-gray-900 dark:text-white min-w-[100px]">
                        Viajes
                      </th>
                      <th className="text-right py-4 px-6 font-medium text-gray-900 dark:text-white min-w-[130px]">
                        Efectivo
                      </th>
                      <th className="text-right py-4 px-6 font-medium text-gray-900 dark:text-white min-w-[140px]">
                        Sin Efectivo
                      </th>
                      <th className="text-right py-4 px-6 font-medium text-gray-900 dark:text-white min-w-[130px]">
                        Com. Yango
                      </th>
                      <th className="text-right py-4 px-6 font-medium text-gray-900 dark:text-white min-w-[130px]">
                        Com. Yego
                      </th>
                      <th className="text-right py-4 px-6 font-medium text-gray-900 dark:text-white min-w-[120px]">
                        Bono Ant.
                      </th>
                      <th className="text-right py-4 px-6 font-medium text-gray-900 dark:text-white min-w-[120px]">
                        Bono Act.
                      </th>
                      <th className="text-right py-4 px-6 font-medium text-gray-900 dark:text-white min-w-[120px]">
                        Total
                      </th>
                      <th className="text-right py-4 px-6 font-medium text-gray-900 dark:text-white min-w-[130px]">
                        Garantizado
                      </th>
                      <th className="text-right py-4 px-6 font-medium text-gray-900 dark:text-white min-w-[130px]">
                        Diferencia
                      </th>
                      <th className="text-center py-4 px-6 font-medium text-gray-900 dark:text-white min-w-[140px]">
                        Horas Trabajadas
                      </th>
                      <th className="text-center py-4 px-6 font-medium text-gray-900 dark:text-white min-w-[140px]">
                        Estado
                      </th>
                      <th className="text-center py-4 px-6 font-medium text-gray-900 dark:text-white min-w-[160px]">
                        Estado de Pago
                      </th>
                      <th className="text-center py-4 px-6 font-medium text-gray-900 dark:text-white min-w-[180px]">
                        Motivo Rechazo
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="text-left py-4 px-6 font-medium text-gray-900 dark:text-white min-w-[140px]">
                        Licencia
                      </th>
                      <th className="text-center py-4 px-6 font-medium text-gray-900 dark:text-white min-w-[140px]">
                        Fecha Registro
                      </th>
                      <th className="text-center py-4 px-6 font-medium text-gray-900 dark:text-white min-w-[180px]">
                        Flota
                      </th>
                      <th className="text-center py-4 px-6 font-medium text-gray-900 dark:text-white min-w-[140px]">
                        Semana
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item, index) => (
                  <tr key={showRegistros ? index : item.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                    {!showRegistros ? (
                      <>
                        <td className="py-5 px-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="h-5 w-5 text-red-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <div className="font-medium text-gray-900 dark:text-white text-base">
                                  {item.nombreCompleto}
                                </div>
                                {item.brandeo && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                    Brandeo
                                  </span>
                                )}
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
                          <div className="font-medium text-base text-blue-600 dark:text-blue-400">
                            {item.horasTrabajadas || '0'} hrs
                          </div>
                        </td>
                        <td className="py-5 px-6 text-center">
                          {getStatusBadge(item.garantizadoValor)}
                        </td>
                        <td className="py-5 px-6 text-center">
                          {item.garantizadoValor === 'Garantizado' ? (
                            <select
                              value={item.estadoPago || 'No Pagado'}
                              onChange={(e) => handleCambiarEstadoPago(item.id, e.target.value as 'No Pagado' | 'Pagado' | 'N/A')}
                              disabled={item.estadoPago === 'Pagado'}
                              className={`px-4 py-2 text-xs font-medium rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-center
                                ${item.estadoPago === 'Pagado' 
                                  ? 'bg-green-50 text-green-800 border-green-300 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700 cursor-not-allowed opacity-75 appearance-none' 
                                  : 'bg-red-50 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700 hover:bg-red-100 hover:border-red-400 dark:hover:bg-red-900/30 cursor-pointer'
                                }
                              `}
                              style={item.estadoPago === 'Pagado' ? { appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', backgroundImage: 'none' } : {}}
                            >
                              <option 
                                value="No Pagado" 
                                className="bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300 rounded-lg"
                                style={{ 
                                  backgroundColor: '#fef2f2', 
                                  color: '#991b1b',
                                  padding: '8px',
                                  fontSize: '14px',
                                  fontWeight: '500',
                                  borderRadius: '8px',
                                  margin: '4px'
                                }}
                              >
                                No Pagado
                              </option>
                              <option 
                                value="Pagado" 
                                className="bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300 rounded-lg"
                                style={{ 
                                  backgroundColor: '#dcfce7', 
                                  color: '#166534',
                                  padding: '8px',
                                  fontSize: '14px',
                                  fontWeight: '500',
                                  borderRadius: '8px',
                                  margin: '4px'
                                }}
                              >
                                Pagado
                              </option>
                            </select>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-1.5"></span>
                              N/A
                            </span>
                          )}
                        </td>
                        <td className="py-5 px-6 text-center">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {item.motivoRechazo || '-'}
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-5 px-6 text-sm font-mono text-gray-700 dark:text-gray-300">
                          {(item as any).yegLicenciaNumero}
                        </td>
                        <td className="py-5 px-6 text-center text-sm text-gray-600 dark:text-gray-400">
                          {new Date((item as any).yegFechaRegistro).toLocaleDateString('es-PE')}
                        </td>
                        <td className="py-5 px-6 text-center text-sm text-gray-600 dark:text-gray-400">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {(item as any).flotaNombre}
                          </div>
                        </td>
                        <td className="py-5 px-6 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-1.5"></span>
                            {(item as any).yegSemana}
                          </span>
                        </td>
                      </>
                    )}
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
                  {showRegistros 
                    ? 'No hay registros de la semana actual' 
                    : (flotaFilter === '' ? 'Selecciona una flota' : 'No se encontraron conductores')
                  }
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                  {showRegistros 
                    ? 'No se encontraron registros de conductores para la semana actual'
                    : (flotaFilter === '' 
                      ? 'Por favor selecciona una flota para ver los conductores con garantía'
                      : 'Intenta ajustar los filtros de búsqueda o selecciona otra flota'
                    )
                  }
                </p>
            </div>
          )}

          {/* Controles de Paginación */}
            {safeFilteredData.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {showRegistros 
                    ? `Mostrando ${startIndex + 1} a ${Math.min(endIndex, totalConductores)} de ${totalConductores} registros de la semana actual`
                    : `Mostrando ${startIndex + 1} a ${Math.min(endIndex, totalConductores)} de ${totalConductores} conductores`
                  }
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Por página:</span>
                  <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6</SelectItem>
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

      {/* Modal de Confirmación de Cambio de Estado */}
      {showConfirmModal && pendingPaymentChange && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Confirmar Cambio de Estado
              </h3>
              <button
                onClick={cancelarCambioEstado}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p>¿Estás seguro de que deseas cambiar el estado de pago de:</p>
                <p className="font-medium text-gray-900 dark:text-white mt-1">
                  {pendingPaymentChange.conductorNombre}
                </p>
                <p className="mt-2">
                  <span className="text-gray-500">Nuevo estado:</span>
                  <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                    pendingPaymentChange.nuevoEstado === 'Pagado' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {pendingPaymentChange.nuevoEstado}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={cancelarCambioEstado}
                className="px-4 py-2"
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmarCambioEstado}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700"
              >
                Confirmar Cambio
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Procesamiento de Garantizado */}
      {showProcessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 w-full max-w-4xl mx-auto shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    modalViewMode === 'procesamiento' 
                      ? 'bg-red-100 dark:bg-red-900/30' 
                      : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    {modalViewMode === 'procesamiento' ? (
                  <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
                    ) : (
                      <Globe className="h-6 w-6 text-red-600 dark:text-red-400" />
                    )}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {modalViewMode === 'procesamiento' ? 'Configurar Procesamiento' : 'Registrar Ubicaciones'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                      {modalViewMode === 'procesamiento' ? (
                        <>Semana: <span className="font-bold text-red-600">{(semanaAnterior || semanaActual) || 'SEMANA'}</span></>
                      ) : (
                        <>Gestiona países y ciudades para el módulo garantizado</>
                      )}
                  </p>
                </div>
                </div>
                <div className="flex items-center gap-4">
                  {/* Switch para cambiar entre vistas */}
                  <div className="flex items-center gap-3 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
                    <span className={`text-xs font-medium transition-colors ${
                      modalViewMode === 'procesamiento' 
                        ? 'text-gray-600 dark:text-gray-300' 
                        : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      Procesamiento
                    </span>
                    <Switch
                      checked={modalViewMode === 'registro'}
                      onCheckedChange={(checked) => {
                        setModalViewMode(checked ? 'registro' : 'procesamiento');
                        if (checked && paises.length === 0) {
                          cargarPaises();
                        }
                      }}
                      className="data-[state=checked]:bg-red-600"
                    />
                    <span className={`text-xs font-medium transition-colors ${
                      modalViewMode === 'registro' 
                        ? 'text-red-600 dark:text-red-400' 
                        : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      Registro
                    </span>
              </div>
              <button
                    onClick={() => {
                      setShowProcessModal(false);
                      setModalViewMode('procesamiento');
                    }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
                </div>
            </div>

            {/* Contenido condicional según el modo */}
            {modalViewMode === 'procesamiento' ? (
              <>
            {/* Pestañas de país */}
                {loadingEstructura ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                  </div>
                ) : estructuraUbicaciones.paises.length > 0 ? (
            <div className="flex space-x-1 mb-3 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                    {estructuraUbicaciones.paises.map((pais) => (
                <button
                        key={pais.id}
                  onClick={() => {
                          setActiveCountry(pais.nombre);
                          const ciudadesDelPais = getCiudadesByCountry(pais.nombre);
                          if (ciudadesDelPais.length > 0) {
                            setActiveTab(ciudadesDelPais[0]);
                          }
                  }}
                  className={`flex-1 py-2 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-all ${
                          activeCountry === pais.nombre
                      ? 'bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                        {pais.nombre}
                </button>
              ))}
            </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                    No hay países disponibles
                  </div>
                )}

            {/* Pestañas de ciudades (según país) */}
                {activeCountry && processConfig[activeCountry] && Object.keys(processConfig[activeCountry]).length > 0 && (
            <div className="flex space-x-1 mb-4 sm:mb-6 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                    {Object.keys(processConfig[activeCountry]).map((ciudad) => (
                <button
                  key={ciudad}
                        onClick={() => setActiveTab(ciudad)}
                  className={`flex-1 py-2 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-all ${
                    activeTab === ciudad
                      ? 'bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  {ciudad}
                </button>
              ))}
            </div>
                )}

            {/* Mensaje si el país no tiene ciudades */}
            {activeCountry && estructuraUbicaciones.paises.length > 0 && (
              (() => {
                const paisActual = estructuraUbicaciones.paises.find(p => p.nombre === activeCountry);
                const tieneCiudades = paisActual && paisActual.ciudades && paisActual.ciudades.length > 0;
                return !tieneCiudades ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <MapPin className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-base font-medium">Este país no tiene ciudades registradas</p>
                    <p className="text-sm mt-1">Registra ciudades desde la vista de "Registrar Ubicaciones"</p>
                  </div>
                ) : null;
              })()
            )}

            {estructuraUbicaciones.paises.length > 0 && activeCountry && processConfig[activeCountry] && Object.keys(processConfig[activeCountry]).length > 0 ? (
            <div className="space-y-4 sm:space-y-6">
              {/* Tablas para la ciudad activa */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {/* Tabla Sin Brandeo */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-2">
                    <h4 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200">
                      SIN BRANDEO {activeTab.toUpperCase()}
                    </h4>
                    <div className="flex gap-1 sm:gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => addTierRow(activeTab, 'sinBrandeo')} 
                        className="px-2 py-1 text-xs"
                      >
                        + Fila
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => removeLastTierRow(activeTab, 'sinBrandeo')} 
                        className="px-2 py-1 text-xs"
                      >
                        - Fila
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-1 sm:gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2 sm:mb-3">
                    <div>VIAJES</div>
                    <div>BONO</div>
                    <div>GARANTIZADO</div>
                    <div>HORAS</div>
                  </div>
                  
                  <div className="space-y-1 sm:space-y-2">
                    {processConfig[activeCountry]?.[activeTab]?.sinBrandeo?.map((row: any, idx: number) => (
                      <div key={idx} className="grid grid-cols-4 gap-1 sm:gap-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.viajes}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (validarValorNoNegativo(value)) {
                              updateProcessConfigField(activeTab, 'sinBrandeo', 'viajes', idx, value);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') {
                              e.preventDefault();
                            }
                          }}
                          placeholder="0"
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.bono}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (validarValorNoNegativo(value)) {
                              updateProcessConfigField(activeTab, 'sinBrandeo', 'bono', idx, value);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') {
                              e.preventDefault();
                            }
                          }}
                          placeholder="0"
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.garantizado}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (validarValorNoNegativo(value)) {
                              updateProcessConfigField(activeTab, 'sinBrandeo', 'garantizado', idx, value);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') {
                              e.preventDefault();
                            }
                          }}
                          placeholder="0"
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.horas}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (validarValorNoNegativo(value)) {
                              updateProcessConfigField(activeTab, 'sinBrandeo', 'horas', idx, value);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') {
                              e.preventDefault();
                            }
                          }}
                          placeholder="0"
                          className="text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tabla Con Brandeo */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-2">
                    <h4 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200">
                      CON BRANDEO {activeTab.toUpperCase()}
                    </h4>
                    <div className="flex gap-1 sm:gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => addTierRow(activeTab, 'conBrandeo')} 
                        className="px-2 py-1 text-xs"
                      >
                        + Fila
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => removeLastTierRow(activeTab, 'conBrandeo')} 
                        className="px-2 py-1 text-xs"
                      >
                        - Fila
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-1 sm:gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2 sm:mb-3">
                    <div>VIAJES</div>
                    <div>BONO</div>
                    <div>GARANTIZADO</div>
                    <div>HORAS</div>
                  </div>
                  
                  <div className="space-y-1 sm:space-y-2">
                    {processConfig[activeCountry]?.[activeTab]?.conBrandeo?.map((row: any, idx: number) => (
                      <div key={idx} className="grid grid-cols-4 gap-1 sm:gap-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.viajes}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (validarValorNoNegativo(value)) {
                              updateProcessConfigField(activeTab, 'conBrandeo', 'viajes', idx, value);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') {
                              e.preventDefault();
                            }
                          }}
                          placeholder="0"
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.bono}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (validarValorNoNegativo(value)) {
                              updateProcessConfigField(activeTab, 'conBrandeo', 'bono', idx, value);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') {
                              e.preventDefault();
                            }
                          }}
                          placeholder="0"
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.garantizado}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (validarValorNoNegativo(value)) {
                              updateProcessConfigField(activeTab, 'conBrandeo', 'garantizado', idx, value);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') {
                              e.preventDefault();
                            }
                          }}
                          placeholder="0"
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.horas}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (validarValorNoNegativo(value)) {
                              updateProcessConfigField(activeTab, 'conBrandeo', 'horas', idx, value);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') {
                              e.preventDefault();
                            }
                          }}
                          placeholder="0"
                          className="text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
              ) : null}
              </>
            ) : (
              /* Vista de Registro de Ubicaciones */
              <div className="space-y-4">
                {/* Formulario para crear nuevo país */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-red-600" />
                    Registrar Nuevo País
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-1">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        País *
                      </label>
                      <Input
                        type="text"
                        value={nuevoPais.nombre}
                        onChange={(e) => setNuevoPais({ ...nuevoPais, nombre: capitalizeFirstLetter(e.target.value) })}
                        placeholder="Ecuador, México"
                        className="h-9 text-sm"
                        disabled={guardandoPais || guardandoCiudad}
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Moneda *
                      </label>
                      <Input
                        type="text"
                        value={nuevoPais.moneda}
                        onChange={(e) => setNuevoPais({ ...nuevoPais, moneda: e.target.value.toUpperCase() })}
                        placeholder="PEN, USD"
                        className="h-9 text-sm"
                        maxLength={3}
                        disabled={guardandoPais || guardandoCiudad}
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Símbolo *
                      </label>
                      <Input
                        type="text"
                        value={nuevoPais.simbolo_moneda}
                        onChange={(e) => setNuevoPais({ ...nuevoPais, simbolo_moneda: e.target.value })}
                        placeholder="S/., $"
                        className="h-9 text-sm"
                        maxLength={5}
                        disabled={guardandoPais || guardandoCiudad}
                      />
                    </div>
                    <div className="md:col-span-1 flex items-end">
                      <Button
                        onClick={handleCrearPais}
                        disabled={guardandoPais || guardandoCiudad || !nuevoPais.nombre || !nuevoPais.moneda || !nuevoPais.simbolo_moneda}
                        className="w-full h-9 bg-red-600 hover:bg-red-700 text-white text-sm"
                        size="sm"
                      >
                        {guardandoPais ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        ) : (
                          <>
                            <Plus className="h-3 w-3 mr-1" />
                            Crear
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
            </div>

                {/* Formulario para crear nueva ciudad */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-red-600" />
                    Registrar Nueva Ciudad
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-1">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        País *
                      </label>
                      <Select
                        value={nuevaCiudad.pais_id.toString()}
                        onValueChange={(value) => setNuevaCiudad({ ...nuevaCiudad, pais_id: parseInt(value) })}
                        disabled={guardandoPais || guardandoCiudad || loadingUbicaciones || paises.length === 0}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder={loadingUbicaciones ? "Cargando..." : paises.length === 0 ? "Sin países" : "Selecciona"} />
                        </SelectTrigger>
                        <SelectContent>
                          {paises.map((pais) => (
                            <SelectItem key={pais.id} value={pais.id.toString()}>
                              {pais.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Ciudad *
                      </label>
                      <Input
                        type="text"
                        value={nuevaCiudad.nombre}
                        onChange={(e) => setNuevaCiudad({ ...nuevaCiudad, nombre: capitalizeFirstLetter(e.target.value) })}
                        placeholder="Quito, Guayaquil"
                        className="h-9 text-sm"
                        disabled={guardandoPais || guardandoCiudad}
                      />
                    </div>
                    <div className="md:col-span-1 flex items-end">
                      <Button
                        onClick={handleCrearCiudad}
                        disabled={guardandoPais || guardandoCiudad || !nuevaCiudad.pais_id || !nuevaCiudad.nombre}
                        className="w-full h-9 bg-red-600 hover:bg-red-700 text-white text-sm"
                        size="sm"
                      >
                        {guardandoCiudad ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        ) : (
                          <>
                            <Plus className="h-3 w-3 mr-1" />
                            Crear
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer del Modal */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={() => {
                  setShowProcessModal(false);
                  setModalViewMode('procesamiento');
                }}
                disabled={loadingTable || guardandoPais || guardandoCiudad}
                className="px-6 py-2"
              >
                Cancelar
              </Button>
              {modalViewMode === 'procesamiento' ? (
                <Button
                  onClick={handleProcesarGarantizado}
                  disabled={
                    loadingTable ||
                    procesandoGarantizado ||
                    !processConfig ||
                    estructuraUbicaciones.paises.length === 0 ||
                    estructuraUbicaciones.paises.some(pais => {
                      const ciudades = processConfig[pais.nombre];
                      // Si el país no tiene configuración, está incompleto
                      if (!ciudades || Object.keys(ciudades).length === 0) return true;
                      
                      // Verificar que todas las ciudades del país estén en la configuración
                      const ciudadesDelPais = pais.ciudades.map(c => c.nombre);
                      if (ciudadesDelPais.some(ciudad => !ciudades[ciudad])) return true;
                      
                      // Verificar que cada ciudad tenga todos los campos completos
                      return Object.values(ciudades).some((ciudad: any) => {
                        if (!ciudad || !ciudad.sinBrandeo || !ciudad.conBrandeo) return true;
                        
                        // Verificar que todos los tiers de sinBrandeo estén completos
                        const sinBrandeoIncompleto = ciudad.sinBrandeo.some((t: any) => {
                          const viajes = t.viajes;
                          const bono = t.bono;
                          const garantizado = t.garantizado;
                          const horas = t.horas;
                          return viajes === '' || viajes === null || viajes === undefined || 
                                 isNaN(Number(viajes)) || Number(viajes) < 0 ||
                                 bono === '' || bono === null || bono === undefined || 
                                 isNaN(Number(bono)) || Number(bono) < 0 ||
                                 garantizado === '' || garantizado === null || garantizado === undefined || 
                                 isNaN(Number(garantizado)) || Number(garantizado) < 0 ||
                                 horas === '' || horas === null || horas === undefined || 
                                 isNaN(Number(horas)) || Number(horas) < 0;
                        });
                        
                        // Verificar que todos los tiers de conBrandeo estén completos
                        const conBrandeoIncompleto = ciudad.conBrandeo.some((t: any) => {
                          const viajes = t.viajes;
                          const bono = t.bono;
                          const garantizado = t.garantizado;
                          const horas = t.horas;
                          return viajes === '' || viajes === null || viajes === undefined || 
                                 isNaN(Number(viajes)) || Number(viajes) < 0 ||
                                 bono === '' || bono === null || bono === undefined || 
                                 isNaN(Number(bono)) || Number(bono) < 0 ||
                                 garantizado === '' || garantizado === null || garantizado === undefined || 
                                 isNaN(Number(garantizado)) || Number(garantizado) < 0 ||
                                 horas === '' || horas === null || horas === undefined || 
                                 isNaN(Number(horas)) || Number(horas) < 0;
                        });
                        
                        // Si alguna está incompleta, el país está incompleto
                        return sinBrandeoIncompleto || conBrandeoIncompleto;
                      });
                    })
                  }
                  className="px-6 py-2 text-white bg-red-600 hover:bg-red-700"
                >
                  {loadingTable ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Procesando...
                    </>
                  ) : (
                    'Procesar Garantizado'
                  )}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Progreso del Procesamiento */}
      {showProcesoModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            // Permitir cerrar el modal haciendo click fuera
            if (e.target === e.currentTarget) {
              setShowProcesoModal(false);
            }
          }}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg mx-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-100 dark:bg-red-900/30">
                  <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Procesando Garantizado
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {procesandoGarantizado 
                      ? 'El proceso continúa en segundo plano'
                      : 'Proceso completado'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowProcesoModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                title={procesandoGarantizado ? "Minimizar (el proceso continuará)" : "Cerrar"}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Indicador de progreso */}
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
                    <div>
                      <p className="text-sm font-medium text-red-900 dark:text-red-100">
                        {procesandoGarantizado ? 'Procesando en segundo plano...' : 'Proceso completado'}
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400">
                        {procesandoGarantizado 
                          ? 'Puedes continuar trabajando en otras partes del sistema'
                          : 'El procesamiento ha finalizado exitosamente'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {formatearTiempoMMSS(tiempoProcesamiento)}
                    </p>
                    <p className="text-xs text-red-500 dark:text-red-500">
                      Tiempo transcurrido
                    </p>
                  </div>
                </div>
                
                {/* Barra de progreso */}
                <div className="w-full bg-red-200 dark:bg-red-800 rounded-full h-3">
                  <div 
                    className="bg-red-600 dark:bg-red-400 h-3 rounded-full transition-all duration-1000"
                    style={{ 
                      width: procesandoGarantizado 
                        ? `${Math.min((tiempoProcesamiento / 600) * 100, 95)}%` 
                        : '100%'
                    }}
                  ></div>
                </div>
              </div>

              {/* Información adicional */}
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  <strong>Nota:</strong> Este proceso puede tardar varios minutos dependiendo de la cantidad de conductores a procesar. 
                  Puedes cerrar este modal y continuar trabajando; recibirás una notificación cuando el proceso termine.
                  {procesandoGarantizado && (
                    <span className="block mt-1 text-red-600 dark:text-red-400">
                      ⚡ El proceso continuará ejecutándose en segundo plano.
                    </span>
                  )}
                </p>
              </div>

              {/* Botón para cerrar */}
              <div className="flex justify-end">
                <Button
                  onClick={() => setShowProcesoModal(false)}
                  className={procesandoGarantizado ? "px-6 py-2" : "px-6 py-2 bg-red-600 hover:bg-red-700 text-white"}
                  variant={procesandoGarantizado ? "outline" : "primary"}
                >
                  {procesandoGarantizado ? "Minimizar (proceso continuará)" : "Cerrar"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
