import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { 
  Clock,
  AlertCircle,
  LogIn,
  LogOut,
  Coffee,
  ArrowRight,
  Building
} from 'lucide-react';
import socketService from '../../../services/socket-service';
import { api } from '../../../services/core/api';
import { useAuthStore } from '../../../store/auth-store';
import { AsistenciaListaModule } from './asistencia-lista.module';

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

interface EmpleadoData {
  id: number;
  nombre: string;
  cargo: string;
  departamento: string;
  horario: {
    entrada: string;
    salida: string;
  };
}

interface EstadisticasAsistencia {
  totalMarcaciones: number;
  tiempoTrabajado: number;
  ultimaMarcacion: MarcacionData | null;
  registrosHoy: MarcacionData[];
  puedeMarcarEntrada: boolean;
  puedeMarcarSalidaRefrigerio: boolean;
  puedeMarcarRegresoRefrigerio: boolean;
  puedeMarcarSalida: boolean;
  yaCompletoJornada: boolean;
}



export const AsistenciaModule: React.FC = () => {
  
  const [empleado, setEmpleado] = useState<EmpleadoData | null>(null);
  const [estadisticas, setEstadisticas] = useState<EstadisticasAsistencia>({
    totalMarcaciones: 0,
    tiempoTrabajado: 0,
    ultimaMarcacion: null,
    registrosHoy: [],
    puedeMarcarEntrada: true,
    puedeMarcarSalidaRefrigerio: false,
    puedeMarcarRegresoRefrigerio: false,
    puedeMarcarSalida: false,
    yaCompletoJornada: false
  });
  const [loading, setLoading] = useState(true);
  const [marcando, setMarcando] = useState(false);
  const [alertData, setAlertData] = useState({
    isOpen: false,
    tipo: '',
    hora: '',
    mensajeMotivacional: '',
    icono: ''
  });
  const [registrosFiltrados, setRegistrosFiltrados] = useState<MarcacionData[]>([]);
  const [filtroFecha, setFiltroFecha] = useState<string>('hoy');
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');
  const [showFiltros, setShowFiltros] = useState(false);
  const [cargandoFiltros, setCargandoFiltros] = useState(false);
  const [activeTab, setActiveTab] = useState<'marcar' | 'lista'>('marcar');

  // Obtener datos del usuario autenticado
  const authStore = useAuthStore.getState();
  const user = authStore.user;


  // Función para cargar datos del empleado y estadísticas
  const cargarDatosEmpleado = async () => {
    try {
      setLoading(true);
      console.log('🔍 [AsistenciaModule] Cargando datos del empleado...');
      
      // Obtener datos del usuario autenticado desde el store
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }
      
      // Crear objeto empleado con datos del usuario autenticado
      const empleadoData: EmpleadoData = {
        id: user.id,
        nombre: user.name || user.username || 'Usuario',
        cargo: '',
        departamento: '',
        horario: {
          entrada: '08:00',
          salida: '17:00'
        }
      };
      
      setEmpleado(empleadoData);
      
      // Cargar estadísticas
      await cargarEstadisticas();
      
    } catch (error: any) {
      console.error('❌ [AsistenciaModule] Error al cargar datos del empleado:', error);
    } finally {
      setLoading(false);
    }
  };

  // Función para cargar estadísticas
  const cargarEstadisticas = async () => {
    try {
      console.log('🔍 [AsistenciaModule] Cargando estadísticas...');
      
      // Obtener estadísticas del backend
      const response = await api.get('/empleado/estadisticas');
      const data = response.data;
      
      if (data.success) {
        const stats = data.estadisticas;
        console.log('🔍 [AsistenciaModule] Estadísticas del backend:', {
          totalMarcaciones: stats.totalMarcaciones,
          marcacionesHoy: stats.marcacionesHoy?.length || 0,
          registrosHoy: stats.registrosHoy?.length || 0
        });
        
        // Mapear campos del backend al formato esperado por el frontend
        const statsMapeados = {
          ...stats,
          registrosHoy: stats.marcacionesHoy || stats.registrosHoy || []
        };
        
        console.log('🔍 [AsistenciaModule] Estadísticas mapeadas:', {
          registrosHoy: statsMapeados.registrosHoy.length
        });
        
        setEstadisticas(statsMapeados);
        setRegistrosFiltrados(statsMapeados.registrosHoy || []);
      } else {
        throw new Error(data.message || 'Error al cargar estadísticas');
      }
      
    } catch (error: any) {
      console.error('❌ [AsistenciaModule] Error al cargar estadísticas:', error);
      await cargarMarcacionesHoy();
    }
  };
     
  // Función para cargar marcaciones del día como fallback
  const cargarMarcacionesHoy = async () => {
    try {
      console.log('🔍 [AsistenciaModule] Cargando marcaciones del día...');
      
      const response = await api.get('/marcaciones/hoy');
      const data = response.data;
      
      if (data.success) {
        const marcaciones = data.marcaciones || [];
        setRegistrosFiltrados(marcaciones);
        
        // Crear estadísticas básicas con las marcaciones
        const statsBasicas: EstadisticasAsistencia = {
          totalMarcaciones: marcaciones.length,
          tiempoTrabajado: 0,
          ultimaMarcacion: marcaciones.length > 0 ? marcaciones[marcaciones.length - 1] : null,
          registrosHoy: marcaciones,
          puedeMarcarEntrada: marcaciones.length === 0 || (marcaciones.length > 0 && marcaciones[marcaciones.length - 1].tipo === 'salida'),
          puedeMarcarSalidaRefrigerio: marcaciones.length > 0 && marcaciones[marcaciones.length - 1].tipo === 'entrada',
          puedeMarcarRegresoRefrigerio: marcaciones.length > 0 && marcaciones[marcaciones.length - 1].tipo === 'salida_refrigerio',
          puedeMarcarSalida: marcaciones.length > 0 && marcaciones[marcaciones.length - 1].tipo === 'regreso_refrigerio',
          yaCompletoJornada: marcaciones.length >= 4 && marcaciones[marcaciones.length - 1].tipo === 'salida'
        };
        
        setEstadisticas(statsBasicas);
      }
      
    } catch (error: any) {
      console.error('❌ [AsistenciaModule] Error al cargar marcaciones del día:', error);
    }
  };

  // Función para manejar marcación
  const manejarMarcacion = async (tipo: string) => {
    if (marcando) return;
    
    try {
      setMarcando(true);
      console.log(`🔍 [AsistenciaModule] Registrando marcación: ${tipo}`);
      
      // Enviar marcación al backend
      const response = await api.post('/marcacion', { tipo });
      const data = response.data;
      
      if (data.success) {
        // Recargar estadísticas después de marcar exitosamente
        await cargarEstadisticas();
        
        // Obtener mensaje motivacional del backend
        let mensajeMotivacional = "¡Excelente trabajo en Yego!";
        try {
          const mensajeResponse = await api.get(`/mensaje-motivacional?tipo=${tipo}`);
          if (mensajeResponse.data.success) {
            mensajeMotivacional = mensajeResponse.data.mensaje;
          }
        } catch (error) {
          console.log('No se pudo obtener mensaje motivacional, usando mensaje por defecto');
        }
        
        // Mostrar alert personalizado
        setAlertData({
          isOpen: true,
          tipo: tipo,
          hora: data.marcacion?.hora || new Date().toLocaleTimeString('es-PE', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          mensajeMotivacional: mensajeMotivacional,
          icono: '💪'
        });
        
      } else {
        throw new Error(data.message || 'Error al registrar la marcación');
      }
      
    } catch (error: any) {
      console.error('❌ [AsistenciaModule] Error al registrar marcación:', error);
      setAlertData({
        isOpen: true,
        tipo: 'error',
        hora: '',
        mensajeMotivacional: error.response?.data?.message || 'Error al registrar la marcación',
        icono: '❌'
      });
    } finally {
      setMarcando(false);
    }
  };

  useEffect(() => {
    console.log('🚀 [AsistenciaModule] Montando componente - Iniciando carga...');
    
    // Cargar datos del empleado al inicializar
    cargarDatosEmpleado();

    // Configurar WebSocket para actualizaciones automáticas
    const handleAsistenciaUpdate = (event: any) => {
      console.log('📊 [AsistenciaModule] Evento de asistencia recibido:', event);
      
      if (event.type === 'TODAY_RECORDS_UPDATE') {
        console.log('🔄 [AsistenciaModule] Actualizando registros de hoy desde WebSocket');
        
        // Actualizar registros de hoy directamente
        const nuevosRegistros = event.registrosHoy || [];
        setRegistrosFiltrados(nuevosRegistros);
        
        // Actualizar estadísticas con el total
        setEstadisticas(prevStats => ({
          ...prevStats,
          totalMarcaciones: event.total || nuevosRegistros.length,
          registrosHoy: nuevosRegistros
        }));
        
        console.log('✅ [AsistenciaModule] Registros actualizados:', {
          total: event.total,
          registros: nuevosRegistros.length
        });
      } else if (event.type === 'ASISTENCIA_UPDATE') {
        console.log('🔄 [AsistenciaModule] Actualizando estadísticas con información del WebSocket');
        
        setEstadisticas(event.estadisticas || estadisticas);
        setRegistrosFiltrados(event.registrosHoy || []);
      }
    };

    // Suscribirse a eventos de asistencia
    socketService.on('asistencia', handleAsistenciaUpdate);

    // Cleanup: desuscribirse cuando el componente se desmonte
    return () => {
      socketService.off('asistencia', handleAsistenciaUpdate);
    };
  }, []); // Array vacío para que solo se ejecute una vez

  // Aplicar filtros cuando cambie el filtro de fecha
  useEffect(() => {
    const aplicarFiltros = async () => {
      if (filtroFecha === 'hoy') {
        // Mostrar solo registros de hoy
        setCargandoFiltros(false);
        setRegistrosFiltrados(estadisticas.registrosHoy || []);
      } else if (filtroFecha === 'rango' && fechaInicio && fechaFin) {
        // Validar que la fecha fin no sea menor a la fecha inicio
        if (fechaFin < fechaInicio) {
          console.warn('⚠️ [AsistenciaModule] Fecha fin menor a fecha inicio, no se cargarán registros');
          setCargandoFiltros(false);
          setRegistrosFiltrados([]);
          return;
        }
        
        // Mostrar loading mientras se cargan los registros
        setCargandoFiltros(true);
        
        // Cargar registros por rango de fechas
        try {
          const response = await api.get(`/marcaciones/rango?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
          if (response.data.success) {
            setRegistrosFiltrados(response.data.marcaciones || []);
          }
        } catch (error) {
          console.error('Error al cargar registros por rango:', error);
          setRegistrosFiltrados([]);
        } finally {
          setCargandoFiltros(false);
        }
      }
    };

    aplicarFiltros();
  }, [filtroFecha, fechaInicio, fechaFin, estadisticas.registrosHoy]);

  // Función para obtener configuración de marcación
  const getMarcacionConfig = (tipo: string) => {
    switch (tipo) {
      case 'entrada':
        return {
          titulo: 'Entrada',
          icono: <LogIn size={32} />,
          textoBoton: 'MARCAR',
          claseCard: 'bg-gradient-to-br from-green-500 via-green-600 to-green-700 text-white rounded-2xl p-6 text-center transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/40',
          deshabilitado: !estadisticas.puedeMarcarEntrada
        };
      case 'salida_refrigerio':
        return {
          titulo: 'Salir a Refrigerio',
          icono: <Coffee size={32} />,
          textoBoton: 'MARCAR',
          claseCard: 'bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white rounded-2xl p-6 text-center transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-amber-500/40',
          deshabilitado: !estadisticas.puedeMarcarSalidaRefrigerio
        };
      case 'regreso_refrigerio':
        return {
          titulo: 'Volver del Refrigerio',
          icono: <ArrowRight size={32} />,
          textoBoton: 'MARCAR',
          claseCard: 'bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white rounded-2xl p-6 text-center transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/40',
          deshabilitado: !estadisticas.puedeMarcarRegresoRefrigerio
        };
      case 'salida':
        return {
          titulo: 'Salida',
          icono: <LogOut size={32} />,
          textoBoton: 'MARCAR',
          claseCard: 'bg-gradient-to-br from-red-500 via-red-600 to-red-700 text-white rounded-2xl p-6 text-center transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-red-500/40',
          deshabilitado: !estadisticas.puedeMarcarSalida
        };
      default:
        return {
          titulo: 'Marcar',
          icono: <Clock size={24} />,
          textoBoton: 'MARCAR',
          claseCard: 'bg-gray-500 text-white rounded-2xl p-6 text-center',
          deshabilitado: true
        };
    }
  };

  // Función para obtener icono de tipo de marcación
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
        return <Clock size={16} />;
    }
  };

  // Función para obtener color de tipo de marcación
  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'entrada':
        return '#10b981';
      case 'salida_refrigerio':
        return '#f59e0b';
      case 'regreso_refrigerio':
        return '#3b82f6';
      case 'salida':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  // Función para obtener texto de tipo de marcación
  const getTipoTexto = (tipo: string) => {
    switch (tipo) {
      case 'entrada':
        return 'ENTRADA';
      case 'salida_refrigerio':
        return 'SALIDA REFRIGERIO';
      case 'regreso_refrigerio':
        return 'REGRESO REFRIGERIO';
      case 'salida':
        return 'SALIDA';
      default:
        return tipo.toUpperCase();
    }
  };

  const formatTime = (time: string) => {
    if (!time) return 'N/A';
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
      return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 dark:text-gray-400">Cargando sistema de asistencia...</p>
        </div>
      </div>
    );
  }

  if (!empleado) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Error de Acceso
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            No se pudo cargar la información del empleado. Por favor, contacta al administrador.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - Siempre visible */}
      <div className="yego-card">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
              <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
              <Building className="h-6 w-6 lg:h-8 lg:w-8 text-primary-500" />
              Marcación de Asistencia
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm lg:text-base">
              Sistema de control de asistencia Yego
                </p>
              </div>
              
              {/* Switch de Navegación responsive */}
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-1 flex w-full lg:w-auto">
                <button
                  onClick={() => setActiveTab('marcar')}
                  className={`flex-1 lg:flex-none px-3 lg:px-6 py-2 rounded-md text-xs lg:text-sm font-medium transition-all duration-200 ${
                    activeTab === 'marcar'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <span className="hidden sm:inline">Marcar Asistencia</span>
                  <span className="sm:hidden">Marcar</span>
                </button>
                <button
                  onClick={() => setActiveTab('lista')}
                  className={`flex-1 lg:flex-none px-3 lg:px-6 py-2 rounded-md text-xs lg:text-sm font-medium transition-all duration-200 ${
                    activeTab === 'lista'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <span className="hidden sm:inline">Lista de Asistencia</span>
                  <span className="sm:hidden">Lista</span>
                </button>
              </div>
              </div>
      </div>

      {/* Contenido de las Pestañas */}
      {activeTab === 'marcar' && (
        <>
          {/* Alert Personalizado */}
          {alertData.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4 text-center">
            <div className="text-4xl mb-4">{alertData.icono}</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {alertData.tipo === 'error' ? 'Error' : 'Marcación Registrada'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {alertData.mensajeMotivacional}
            </p>
            {alertData.hora && (
              <p className="text-lg font-mono text-red-600 dark:text-red-400 mb-4">
                {alertData.hora}
              </p>
            )}
          <Button 
              onClick={() => setAlertData({ ...alertData, isOpen: false })}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Cerrar
          </Button>
        </div>
      </div>
      )}

      {/* Mensaje de Jornada Completada */}
      {estadisticas.yaCompletoJornada && (
        <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-2 border-green-500 rounded-xl p-6 text-center">
          <h3 className="text-2xl font-bold text-green-800 dark:text-green-200 mb-2">
            ✅ Jornada Completada
                  </h3>
          <p className="text-green-700 dark:text-green-300">
            Has completado todas las marcaciones del día ({estadisticas.totalMarcaciones}/4).
            <br />
            Podrás marcar entrada nuevamente mañana.
                </p>
            </div>
          )}

      {/* Sección de Marcaciones */}
      <div className="yego-card">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card de Entrada */}
          <div className={`${getMarcacionConfig('entrada').claseCard} ${
            estadisticas.puedeMarcarEntrada ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'
          }`}>
            <h3 className="text-white text-lg font-bold mb-4 uppercase tracking-wide">
              {getMarcacionConfig('entrada').titulo}
            </h3>
            <div className="flex justify-center mb-6">
              {getMarcacionConfig('entrada').icono}
            </div>
            <button
              className={`w-full py-3 px-4 rounded-xl font-bold text-white transition-all duration-300 ${
                estadisticas.puedeMarcarEntrada 
                  ? 'bg-white/20 hover:bg-white/30 border-2 border-white/30 hover:border-white/50' 
                  : 'bg-white/10 border-2 border-white/20 cursor-not-allowed'
              }`}
              onClick={() => manejarMarcacion('entrada')}
              disabled={!estadisticas.puedeMarcarEntrada || marcando}
            >
              {marcando ? 'MARCANDO...' : getMarcacionConfig('entrada').textoBoton}
            </button>
          </div>

          {/* Card de Salida Refrigerio */}
          <div className={`${getMarcacionConfig('salida_refrigerio').claseCard} ${
            estadisticas.puedeMarcarSalidaRefrigerio ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'
          }`}>
            <h3 className="text-white text-lg font-bold mb-4 uppercase tracking-wide">
              {getMarcacionConfig('salida_refrigerio').titulo}
            </h3>
            <div className="flex justify-center mb-6">
              {getMarcacionConfig('salida_refrigerio').icono}
            </div>
            <button
              className={`w-full py-3 px-4 rounded-xl font-bold text-white transition-all duration-300 ${
                estadisticas.puedeMarcarSalidaRefrigerio 
                  ? 'bg-white/20 hover:bg-white/30 border-2 border-white/30 hover:border-white/50' 
                  : 'bg-white/10 border-2 border-white/20 cursor-not-allowed'
              }`}
              onClick={() => manejarMarcacion('salida_refrigerio')}
              disabled={!estadisticas.puedeMarcarSalidaRefrigerio || marcando}
            >
              {marcando ? 'MARCANDO...' : getMarcacionConfig('salida_refrigerio').textoBoton}
            </button>
          </div>

          {/* Card de Regreso Refrigerio */}
          <div className={`${getMarcacionConfig('regreso_refrigerio').claseCard} ${
            estadisticas.puedeMarcarRegresoRefrigerio ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'
          }`}>
            <h3 className="text-white text-lg font-bold mb-4 uppercase tracking-wide">
              {getMarcacionConfig('regreso_refrigerio').titulo}
            </h3>
            <div className="flex justify-center mb-6">
              {getMarcacionConfig('regreso_refrigerio').icono}
            </div>
            <button
              className={`w-full py-3 px-4 rounded-xl font-bold text-white transition-all duration-300 ${
                estadisticas.puedeMarcarRegresoRefrigerio 
                  ? 'bg-white/20 hover:bg-white/30 border-2 border-white/30 hover:border-white/50' 
                  : 'bg-white/10 border-2 border-white/20 cursor-not-allowed'
              }`}
              onClick={() => manejarMarcacion('regreso_refrigerio')}
              disabled={!estadisticas.puedeMarcarRegresoRefrigerio || marcando}
            >
              {marcando ? 'MARCANDO...' : getMarcacionConfig('regreso_refrigerio').textoBoton}
            </button>
          </div>

          {/* Card de Salida */}
          <div className={`${getMarcacionConfig('salida').claseCard} ${
            estadisticas.puedeMarcarSalida ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'
          }`}>
            <h3 className="text-white text-lg font-bold mb-4 uppercase tracking-wide">
              {getMarcacionConfig('salida').titulo}
            </h3>
            <div className="flex justify-center mb-6">
              {getMarcacionConfig('salida').icono}
            </div>
            <button
              className={`w-full py-3 px-4 rounded-xl font-bold text-white transition-all duration-300 ${
                estadisticas.puedeMarcarSalida 
                  ? 'bg-white/20 hover:bg-white/30 border-2 border-white/30 hover:border-white/50' 
                  : 'bg-white/10 border-2 border-white/20 cursor-not-allowed'
              }`}
              onClick={() => manejarMarcacion('salida')}
              disabled={!estadisticas.puedeMarcarSalida || marcando}
            >
              {marcando ? 'MARCANDO...' : getMarcacionConfig('salida').textoBoton}
            </button>
          </div>
        </div>
      </div>

      {/* Filtros de Registros */}
      <div className="yego-card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Registros de Hoy
              </h3>
              <button
              onClick={() => setShowFiltros(!showFiltros)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
              {showFiltros ? 'Ocultar Filtros' : 'Mostrar Filtros'}
              </button>
            </div>

          {showFiltros && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Filtrar por período
                </label>
                <select
                    value={filtroFecha}
                    onChange={(e) => setFiltroFecha(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                  >
                    <option value="hoy">Hoy</option>
                    <option value="rango">Personalizado</option>
                </select>
              </div>

                {filtroFecha === 'rango' && (
                  <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Fecha inicio
                </label>
                      <input
                        type="date"
                        value={fechaInicio}
                        onChange={(e) => setFechaInicio(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                      />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Fecha fin
                </label>
                <input
                        type="date"
                        value={fechaFin}
                        min={fechaInicio || undefined}
                        onChange={(e) => setFechaFin(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-600 dark:text-white ${
                          fechaInicio && fechaFin && fechaFin < fechaInicio 
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                            : 'border-gray-300 dark:border-gray-500'
                        }`}
                      />
                      {fechaInicio && fechaFin && fechaFin < fechaInicio && (
                        <p className="text-red-500 text-xs mt-1">
                          La fecha fin no puede ser menor a la fecha inicio
                        </p>
                      )}
              </div>
                  </>
                )}
                
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setFiltroFecha('hoy');
                      setFechaInicio('');
                      setFechaFin('');
                    }}
                    className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Limpiar Filtros
                  </button>
            </div>
          </div>
        </div>
      )}

          {/* Lista de Registros */}
          {cargandoFiltros ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Cargando registros...
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Buscando marcaciones en el rango seleccionado
              </p>
            </div>
          ) : registrosFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {filtroFecha === 'hoy' ? 'No hay registros de marcación para hoy' : 'No hay registros en el rango seleccionado'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {filtroFecha === 'hoy' 
                  ? 'Realiza tu primera marcación para ver los registros aquí'
                  : 'No se encontraron marcaciones en las fechas seleccionadas'
                }
              </p>
          </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Mostrando {registrosFiltrados.length} registro(s) {filtroFecha === 'hoy' ? 'de hoy' : 'en el rango seleccionado'}
            </div>
              {registrosFiltrados.map((registro) => (
                <div key={registro.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                  <div className="flex items-center gap-3">
                    <div style={{ color: getTipoColor(registro.tipo) }}>
                      {getTipoIcon(registro.tipo)}
          </div>
              <div>
                      <div 
                        className="px-3 py-1 rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: getTipoColor(registro.tipo) }}
                      >
                        {getTipoTexto(registro.tipo)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-mono text-gray-900 dark:text-white">
                      {formatTime(registro.hora)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {registro.fecha.split('-').reverse().join('/')}
                    </div>
              </div>
            </div>
              ))}
        </div>
      )}
      </div>
        </>
      )}

      {/* Pestaña Lista de Asistencia */}
      {activeTab === 'lista' && (
        <AsistenciaListaModule />
      )}
    </div>
  );
};
