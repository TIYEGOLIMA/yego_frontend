import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '../../../components/ui/button';
import { 
  Clock,
  AlertCircle,
  LogIn,
  LogOut,
  Coffee,
  ArrowRight,
  Calendar,
  Filter
} from 'lucide-react';
import socketService from '../../../services/socket-service';
import { api } from '../../../services/core/api';
import { useAuthStore } from '../../../store/auth-store';
import { AsistenciaListaModule } from './asistencia-lista.module';

// Tipos
type TipoMarcacion = 'entrada' | 'salida_refrigerio' | 'regreso_refrigerio' | 'salida';

interface MarcacionData {
  id: number;
  empleadoId: number;
  nombreCompleto: string;
  tipo: TipoMarcacion;
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

// Constantes
const TIPOS_MARCACION: Record<TipoMarcacion, { titulo: string; icono: React.ReactNode; color: string; texto: string }> = {
  entrada: {
    titulo: 'Entrada',
    icono: <LogIn size={32} />,
    color: 'from-green-500 via-green-600 to-green-700',
    texto: 'ENTRADA'
  },
  salida_refrigerio: {
    titulo: 'Salir a Refrigerio',
    icono: <Coffee size={32} />,
    color: 'from-amber-500 via-amber-600 to-amber-700',
    texto: 'SALIDA REFRIGERIO'
  },
  regreso_refrigerio: {
    titulo: 'Volver del Refrigerio',
    icono: <ArrowRight size={32} />,
    color: 'from-blue-500 via-blue-600 to-blue-700',
    texto: 'REGRESO REFRIGERIO'
  },
  salida: {
    titulo: 'Salida',
    icono: <LogOut size={32} />,
    color: 'from-red-500 via-red-600 to-red-700',
    texto: 'SALIDA'
  }
};

const ESTADISTICAS_INICIALES: EstadisticasAsistencia = {
  totalMarcaciones: 0,
  tiempoTrabajado: 0,
  ultimaMarcacion: null,
  registrosHoy: [],
  puedeMarcarEntrada: true,
  puedeMarcarSalidaRefrigerio: false,
  puedeMarcarRegresoRefrigerio: false,
  puedeMarcarSalida: false,
  yaCompletoJornada: false
};

const esErrorCancelado = (error: any): boolean => {
  return (
    error.code === 'ECONNABORTED' ||
    error.code === 'ERR_CANCELED' ||
    error.name === 'AbortError' ||
    error.name === 'CanceledError' ||
    error.message === 'Request aborted' ||
    error.message === 'canceled'
  );
};



const AlertModal: React.FC<{
  isOpen: boolean;
  tipo: string;
  hora: string;
  mensajeMotivacional: string;
  icono: string;
  onClose: () => void;
}> = ({ isOpen, tipo, hora, mensajeMotivacional, icono, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4 text-center">
        <div className="text-4xl mb-4">{icono}</div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {tipo === 'error' ? 'Error' : 'Marcación Registrada'}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{mensajeMotivacional}</p>
        {hora && (
          <p className="text-lg font-mono text-red-600 dark:text-red-400 mb-4">{hora}</p>
        )}
        <Button onClick={onClose} className="bg-red-600 hover:bg-red-700 text-white">
          Cerrar
        </Button>
      </div>
    </div>
  );
};

const MarcacionCard: React.FC<{
  tipo: TipoMarcacion;
  puedeMarcar: boolean;
  marcando: boolean;
  onMarcar: (tipo: TipoMarcacion) => void;
}> = ({ tipo, puedeMarcar, marcando, onMarcar }) => {
  const config = TIPOS_MARCACION[tipo];
  
  return (
    <div className={`bg-gradient-to-br ${config.color} text-white rounded-2xl p-6 text-center transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
      puedeMarcar ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'
    }`}>
      <h3 className="text-white text-lg font-bold mb-4 uppercase tracking-wide">{config.titulo}</h3>
      <div className="flex justify-center mb-6">{config.icono}</div>
      <button
        className={`w-full py-3 px-4 rounded-xl font-bold text-white transition-all duration-300 ${
          puedeMarcar 
            ? 'bg-white/20 hover:bg-white/30 border-2 border-white/30 hover:border-white/50' 
            : 'bg-white/10 border-2 border-white/20 cursor-not-allowed'
        }`}
        onClick={() => onMarcar(tipo)}
        disabled={!puedeMarcar || marcando}
      >
        {marcando ? 'MARCANDO...' : 'MARCAR'}
      </button>
    </div>
  );
};

const COLORES_TIPO: Record<TipoMarcacion, string> = {
  entrada: '#10b981',
  salida_refrigerio: '#f59e0b',
  regreso_refrigerio: '#3b82f6',
  salida: '#ef4444'
};

const getIconoPequeño = (tipo: TipoMarcacion) => {
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

const RegistroItem: React.FC<{ registro: MarcacionData }> = ({ registro }) => {
  const config = TIPOS_MARCACION[registro.tipo];
  const color = COLORES_TIPO[registro.tipo];
  
  const formatTime = (time: string) => {
    if (!time) return 'N/A';
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };
  
  return (
    <div className="group relative flex flex-col p-6 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-primary-500/50 dark:hover:border-primary-500/50 hover:shadow-xl hover:shadow-primary-500/10 dark:hover:shadow-primary-500/20 transition-all duration-300 min-w-[240px] max-w-[280px]">
      <div className="flex items-center justify-center mb-5">
        <div 
          className="flex items-center justify-center w-16 h-16 rounded-xl shadow-md"
          style={{ 
            backgroundColor: `${color}20`,
            color: color
          }}
        >
          <div className="scale-125">
            {getIconoPequeño(registro.tipo)}
          </div>
        </div>
      </div>
      
      <div className="mb-4">
        <div 
          className="px-4 py-2 rounded-lg text-sm font-bold text-white shadow-md text-center"
          style={{ 
            backgroundColor: color,
            boxShadow: `0 4px 12px ${color}40`
          }}
        >
          {config.texto}
        </div>
      </div>
      
      <div className="text-center mt-auto">
        <div className="text-3xl font-bold font-mono text-neutral-900 dark:text-white">
          {formatTime(registro.hora)}
        </div>
      </div>
      
      <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-primary-500/0 to-primary-500/0 group-hover:from-primary-500/5 group-hover:to-transparent transition-all duration-300 pointer-events-none"></div>
    </div>
  );
};

export const AsistenciaModule: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role?.toUpperCase();
  const isSAC = userRole === 'SAC';
  
  // Roles permitidos para ver la lista de asistencias
  const rolesPermitidosLista = ['ASISTENTE DE GERENCIA', 'GERENTE', 'SUPERADMIN', 'JEFE DE SISTEMAS', 'ADMIN'];
  const puedeVerLista = userRole && rolesPermitidosLista.includes(userRole);
  
  const [empleado, setEmpleado] = useState<EmpleadoData | null>(null);
  const [estadisticas, setEstadisticas] = useState<EstadisticasAsistencia>(ESTADISTICAS_INICIALES);
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
  const [filtroFecha, setFiltroFecha] = useState<'hoy' | 'rango'>('hoy');
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');
  const [showFiltros, setShowFiltros] = useState(false);
  const [cargandoFiltros, setCargandoFiltros] = useState(false);
  const [activeTab, setActiveTab] = useState<'marcar' | 'lista'>('marcar');
  
  useEffect(() => {
    // Si el usuario no puede ver la lista o es SAC, forzar a la pestaña de marcar
    if ((!puedeVerLista || isSAC) && activeTab === 'lista') {
      setActiveTab('marcar');
    }
  }, [puedeVerLista, isSAC, activeTab]);


  const cargarMarcacionesHoy = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await api.get('/marcaciones/hoy', { signal });
      const data = response.data;
      
      if (data.success) {
        const marcaciones = data.marcaciones || [];
        const ultimaMarcacion = marcaciones.length > 0 ? marcaciones[marcaciones.length - 1] : null;
        
        const statsBasicas: EstadisticasAsistencia = {
          totalMarcaciones: marcaciones.length,
          tiempoTrabajado: 0,
          ultimaMarcacion,
          registrosHoy: marcaciones,
          puedeMarcarEntrada: marcaciones.length === 0 || ultimaMarcacion?.tipo === 'salida',
          puedeMarcarSalidaRefrigerio: ultimaMarcacion?.tipo === 'entrada' || false,
          puedeMarcarRegresoRefrigerio: ultimaMarcacion?.tipo === 'salida_refrigerio' || false,
          puedeMarcarSalida: ultimaMarcacion?.tipo === 'regreso_refrigerio' || false,
          yaCompletoJornada: marcaciones.length >= 4 && ultimaMarcacion?.tipo === 'salida'
        };
        
        setEstadisticas(statsBasicas);
        setRegistrosFiltrados(marcaciones);
      }
    } catch (error: any) {
      // Ignorar errores de solicitud cancelada/abortada
      if (esErrorCancelado(error)) {
        return;
      }
      console.error('Error al cargar marcaciones del día:', error);
    }
  }, []);

  const cargarEstadisticas = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await api.get('/empleado/estadisticas', { signal });
      const data = response.data;
      
      if (data.success) {
        const statsMapeados = {
          ...data.estadisticas,
          registrosHoy: data.estadisticas.marcacionesHoy || data.estadisticas.registrosHoy || []
        };
        setEstadisticas(statsMapeados);
        setRegistrosFiltrados(statsMapeados.registrosHoy || []);
      } else {
        throw new Error(data.message || 'Error al cargar estadísticas');
      }
    } catch (error: any) {
      // Ignorar errores de solicitud cancelada/abortada
      if (esErrorCancelado(error)) {
        return;
      }
      console.error('Error al cargar estadísticas:', error);
      await cargarMarcacionesHoy(signal);
    }
  }, [cargarMarcacionesHoy]);

  const cargarDatosEmpleado = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }
      
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
      await cargarEstadisticas(signal);
    } catch (error: any) {
      // Ignorar errores de solicitud cancelada/abortada
      if (esErrorCancelado(error)) {
        return;
      }
      console.error('Error al cargar datos del empleado:', error);
    } finally {
      setLoading(false);
    }
  }, [user, cargarEstadisticas]);

  // Función para validar horario
  const validarHorario = useCallback((tipo: TipoMarcacion): { valido: boolean; mensaje?: string } => {
    if (!empleado?.horario) {
      return { valido: true }; // Si no hay horario definido, permitir
    }

    const ahora = new Date();
    const horaActual = ahora.getHours();
    const minutosActuales = ahora.getMinutes();
    const horaActualMinutos = horaActual * 60 + minutosActuales;

    const [horaEntrada, minutosEntrada] = empleado.horario.entrada.split(':').map(Number);
    const horaEntradaMinutos = horaEntrada * 60 + minutosEntrada;

    const [horaSalida, minutosSalida] = empleado.horario.salida.split(':').map(Number);
    const horaSalidaMinutos = horaSalida * 60 + minutosSalida;

    // Validaciones según el tipo de marcación
    switch (tipo) {
      case 'entrada':
        // Permitir entrada desde 1 hora antes del horario hasta 2 horas después
        const horaMinimaEntrada = horaEntradaMinutos - 60; // 1 hora antes
        const horaMaximaEntrada = horaEntradaMinutos + 120; // 2 horas después
        
        if (horaActualMinutos < horaMinimaEntrada) {
          return {
            valido: false,
            mensaje: `No puedes marcar entrada antes de las ${empleado.horario.entrada}. Horario permitido: desde 1 hora antes hasta 2 horas después.`
          };
        }
        if (horaActualMinutos > horaMaximaEntrada) {
          return {
            valido: false,
            mensaje: `Ya pasó el horario permitido para marcar entrada. Horario: hasta 2 horas después de las ${empleado.horario.entrada}.`
          };
        }
        break;

      case 'salida':
        // Permitir salida desde 1 hora antes del horario hasta 2 horas después
        const horaMinimaSalida = horaSalidaMinutos - 60; // 1 hora antes
        const horaMaximaSalida = horaSalidaMinutos + 120; // 2 horas después
        
        if (horaActualMinutos < horaMinimaSalida) {
          return {
            valido: false,
            mensaje: `No puedes marcar salida antes de las ${empleado.horario.salida}. Horario permitido: desde 1 hora antes hasta 2 horas después.`
          };
        }
        if (horaActualMinutos > horaMaximaSalida) {
          return {
            valido: false,
            mensaje: `Ya pasó el horario permitido para marcar salida. Horario: hasta 2 horas después de las ${empleado.horario.salida}.`
          };
        }
        break;

      case 'salida_refrigerio':
      case 'regreso_refrigerio':
        // Para refrigerio, validar que esté dentro del horario laboral
        if (horaActualMinutos < horaEntradaMinutos || horaActualMinutos > horaSalidaMinutos + 120) {
          return {
            valido: false,
            mensaje: `No puedes marcar ${tipo === 'salida_refrigerio' ? 'salida a refrigerio' : 'regreso de refrigerio'} fuera del horario laboral.`
          };
        }
        break;
    }

    return { valido: true };
  }, [empleado]);

  const manejarMarcacion = useCallback(async (tipo: TipoMarcacion) => {
    if (marcando) return;
    
    // Validar horario antes de enviar
    const validacionHorario = validarHorario(tipo);
    if (!validacionHorario.valido) {
      setAlertData({
        isOpen: true,
        tipo: 'error',
        hora: '',
        mensajeMotivacional: validacionHorario.mensaje || 'Horario no permitido para esta marcación',
        icono: '⏰'
      });
      return;
    }
    
    try {
      setMarcando(true);
      
      const response = await api.post('/marcacion', { tipo });
      const data = response.data;
      
      if (data.success) {
        const horaMarcacion = data.marcacion?.hora || new Date().toLocaleTimeString('es-PE', {
          hour: '2-digit',
          minute: '2-digit'
        });
        
        setAlertData({
          isOpen: true,
          tipo: tipo,
          hora: horaMarcacion,
          mensajeMotivacional: data.mensaje || "¡Excelente trabajo en Yego!",
          icono: '💪'
        });
        
        setMarcando(false);
        
        Promise.all([
          cargarEstadisticas(),
          api.get(`/mensaje-motivacional?tipo=${tipo}`).then(res => {
            if (res.data.success) {
              setAlertData(prev => ({
                ...prev,
                mensajeMotivacional: res.data.mensaje
              }));
            }
          }).catch((error: any) => {
            // Ignorar errores de solicitud cancelada/abortada
            if (!esErrorCancelado(error)) {
              // Silencioso - ya tenemos un mensaje por defecto
            }
          })
        ]).catch((error: any) => {
          // Ignorar errores de solicitud cancelada/abortada
          if (!esErrorCancelado(error)) {
            console.error('Error al actualizar datos después de marcar:', error);
          }
        });
      } else {
        throw new Error(data.message || 'Error al registrar la marcación');
      }
    } catch (error: any) {
      console.error('Error al registrar marcación:', error);
      setAlertData({
        isOpen: true,
        tipo: 'error',
        hora: '',
        mensajeMotivacional: error.response?.data?.message || 'Error al registrar la marcación',
        icono: '❌'
      });
      setMarcando(false);
    }
  }, [marcando, cargarEstadisticas]);

  useEffect(() => {
    const abortController = new AbortController();
    
    cargarDatosEmpleado(abortController.signal);

    const handleAsistenciaUpdate = (event: any) => {
      if (event.type === 'TODAY_RECORDS_UPDATE') {
        const nuevosRegistros = event.registrosHoy || [];
        setRegistrosFiltrados(nuevosRegistros);
        setEstadisticas(prevStats => ({
          ...prevStats,
          totalMarcaciones: event.total || nuevosRegistros.length,
          registrosHoy: nuevosRegistros
        }));
      } else if (event.type === 'ASISTENCIA_UPDATE') {
        setEstadisticas(prevStats => ({
          ...prevStats,
          ...event.estadisticas
        }));
        setRegistrosFiltrados(event.registrosHoy || []);
      }
    };

    socketService.on('asistencia', handleAsistenciaUpdate);
    
    return () => {
      abortController.abort();
      socketService.off('asistencia', handleAsistenciaUpdate);
    };
  }, [cargarDatosEmpleado]);

  useEffect(() => {
    const abortController = new AbortController();
    
    const aplicarFiltros = async () => {
      if (filtroFecha === 'hoy') {
        setCargandoFiltros(false);
        setRegistrosFiltrados(estadisticas.registrosHoy || []);
      } else if (filtroFecha === 'rango' && fechaInicio && fechaFin) {
        if (fechaFin < fechaInicio) {
          setCargandoFiltros(false);
          setRegistrosFiltrados([]);
          return;
        }
        
        setCargandoFiltros(true);
        try {
          const response = await api.get(`/marcaciones/rango?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`, {
            signal: abortController.signal
          });
          if (response.data.success) {
            setRegistrosFiltrados(response.data.marcaciones || []);
          }
        } catch (error: any) {
          // Ignorar errores de solicitud cancelada/abortada
          if (esErrorCancelado(error)) {
            return;
          }
          console.error('Error al cargar registros por rango:', error);
          setRegistrosFiltrados([]);
        } finally {
          setCargandoFiltros(false);
        }
      }
    };

    aplicarFiltros();
    
    return () => {
      abortController.abort();
    };
  }, [filtroFecha, fechaInicio, fechaFin, estadisticas.registrosHoy]);

  const tiposMarcacion: TipoMarcacion[] = ['entrada', 'salida_refrigerio', 'regreso_refrigerio', 'salida'];
  
  const puedeMarcar = useMemo(() => ({
    entrada: estadisticas.puedeMarcarEntrada,
    salida_refrigerio: estadisticas.puedeMarcarSalidaRefrigerio,
    regreso_refrigerio: estadisticas.puedeMarcarRegresoRefrigerio,
    salida: estadisticas.puedeMarcarSalida
  }), [estadisticas]);
  
  const limpiarFiltros = useCallback(() => {
    setFiltroFecha('hoy');
    setFechaInicio('');
    setFechaFin('');
  }, []);

  const registrosAgrupadosPorDia = useMemo(() => {
    const registrosPorDia = registrosFiltrados.reduce((acc, registro) => {
      if (!acc[registro.fecha]) acc[registro.fecha] = [];
      acc[registro.fecha].push(registro);
      return acc;
    }, {} as Record<string, MarcacionData[]>);

    const diasOrdenados = Object.keys(registrosPorDia).sort((a, b) => {
      const [añoA, mesA, diaA] = a.split('-').map(Number);
      const [añoB, mesB, diaB] = b.split('-').map(Number);
      return new Date(añoB, mesB - 1, diaB).getTime() - new Date(añoA, mesA - 1, diaA).getTime();
    });

    return diasOrdenados.map((fecha) => {
      const registrosDelDia = registrosPorDia[fecha].sort((a, b) => {
        const [hA, mA] = a.hora.split(':').map(Number);
        const [hB, mB] = b.hora.split(':').map(Number);
        return (hA * 60 + mA) - (hB * 60 + mB);
      });

      return {
        fecha,
        registros: registrosDelDia
      };
    });
  }, [registrosFiltrados]);

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
      <div className="yego-card">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
              <div>
            <h1 className="yego-heading-1 mb-2">
              Marcación de Asistencia
            </h1>
            <p className="yego-body">
              Sistema de control de asistencia Yego
                </p>
              </div>
              
              {puedeVerLista && (
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
              )}
              </div>
      </div>

      {activeTab === 'marcar' && (
        <>
          <AlertModal
        isOpen={alertData.isOpen}
        tipo={alertData.tipo}
        hora={alertData.hora}
        mensajeMotivacional={alertData.mensajeMotivacional}
        icono={alertData.icono}
        onClose={() => setAlertData({ ...alertData, isOpen: false })}
      />

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

      <div className="yego-card">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tiposMarcacion.map((tipo) => (
            <MarcacionCard
              key={tipo}
              tipo={tipo}
              puedeMarcar={puedeMarcar[tipo]}
              marcando={marcando}
              onMarcar={manejarMarcacion}
            />
          ))}
        </div>
      </div>

      <div className="yego-card">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-neutral-200 dark:border-neutral-700">
            <div>
              <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">
                Registros de Hoy
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Historial de tus marcaciones
              </p>
            </div>
            <Button
              onClick={() => setShowFiltros(!showFiltros)}
              variant={showFiltros ? "secondary" : "primary"}
              size="sm"
            >
              {showFiltros ? 'Ocultar Filtros' : 'Mostrar Filtros'}
            </Button>
          </div>

          {showFiltros && (
            <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-800 dark:to-neutral-900 rounded-xl p-6 mb-6 border border-neutral-200 dark:border-neutral-700 shadow-lg">
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary-500/10 dark:bg-primary-500/20 rounded-lg">
                    <Filter className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-neutral-900 dark:text-white">Filtros de Búsqueda</h4>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Selecciona el período a consultar</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                    <Calendar className="h-4 w-4 text-primary-500" />
                    Período
                  </label>
                  <div className="relative">
                    <select
                      value={filtroFecha}
                      onChange={(e) => setFiltroFecha(e.target.value as 'hoy' | 'rango')}
                      className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border-2 border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:border-primary-500 text-neutral-900 dark:text-neutral-100 transition-all shadow-sm hover:shadow-md hover:border-primary-400 dark:hover:border-primary-500 appearance-none cursor-pointer"
                    >
                      <option value="hoy">📅 Hoy</option>
                      <option value="rango">📆 Personalizado</option>
                    </select>
                  </div>
                </div>

                {filtroFecha === 'rango' && (
                  <>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                        <Calendar className="h-4 w-4 text-primary-500" />
                        Fecha Inicio
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={fechaInicio}
                          onChange={(e) => setFechaInicio(e.target.value)}
                          className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border-2 border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:focus:border-primary-500 text-neutral-900 dark:text-neutral-100 transition-all shadow-sm hover:shadow-md hover:border-primary-400 dark:hover:border-primary-500"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                        <Calendar className="h-4 w-4 text-primary-500" />
                        Fecha Fin
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={fechaFin}
                          min={fechaInicio || undefined}
                          onChange={(e) => setFechaFin(e.target.value)}
                          className={`w-full px-4 py-3 bg-white dark:bg-neutral-800 border-2 rounded-lg focus:outline-none focus:ring-2 dark:text-neutral-100 transition-all shadow-sm hover:shadow-md ${
                            fechaInicio && fechaFin && fechaFin < fechaInicio 
                              ? 'border-red-500 bg-red-50 dark:bg-red-900/20 focus:ring-red-500 focus:border-red-500 hover:border-red-600' 
                              : 'border-neutral-300 dark:border-neutral-600 focus:ring-primary-500 focus:border-primary-500 dark:focus:border-primary-500 hover:border-primary-400 dark:hover:border-primary-500'
                          }`}
                        />
                        {fechaInicio && fechaFin && fechaFin < fechaInicio && (
                          <div className="flex items-center gap-1 mt-2 text-red-500 text-xs font-medium">
                            <AlertCircle className="h-3 w-3" />
                            <span>La fecha fin no puede ser menor a la fecha inicio</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
                
                {filtroFecha !== 'hoy' && (
                  <div className="flex items-end">
                    <button
                      onClick={limpiarFiltros}
                      className="w-full px-3 py-2 text-xs border border-primary-500 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-lg transition-colors"
                    >
                      Limpiar Filtros
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

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
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary-500" />
                  <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                    Mostrando <span className="font-bold text-primary-600 dark:text-primary-400">{registrosFiltrados.length}</span> registro(s) {filtroFecha === 'hoy' ? 'de hoy' : 'en el rango seleccionado'}
                  </span>
                </div>
              </div>
              
              {registrosAgrupadosPorDia.map(({ fecha, registros }) => (
                <div key={fecha} className="flex gap-6 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-primary-500 scrollbar-track-transparent">
                  {registros.map((registro) => (
                    <RegistroItem key={registro.id} registro={registro} />
                  ))}
                </div>
              ))}
        </div>
      )}
      </div>
        </>
      )}

      {activeTab === 'lista' && (
        <AsistenciaListaModule />
      )}
    </div>
  );
};
