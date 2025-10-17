import React, { useState, useEffect } from 'react';
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
  Shield,
  ShieldOff
} from 'lucide-react';
import { api } from '../../../services/core/api';

interface GarantizadoData {
  id: string;
  nombreCompleto: string;
  numeroLicencia: string;
  telefono: string;
  viajes: number;
  efectivo: number;        // W2
  pagoSinEfectivo: number; // X2
  comYango: number;        // Y2
  comYego: number;         // Z2
  boSemAnt: number;        // AA2 (se resta)
  boSemAct: number;        // AB2
  total: number;           // =W2+X2+Y2+Z2-AA2+AB2
  garantizado: number;     // =SI(AB2=$AM$10,$AN$10,SI(AB2=$AM$9,$AN$9,SI(AB2=$AM$8,$AN$8,SI(AB2=$AM$5,$AN$5,SI(AB2=$AM$4,$AN$4,SI(AB2=$AM$3,$AN$3,))))))
  diferencia: number;
  semana: number;
  viajesActuales: number;
  flota: string;
  flotaId: string;
}

interface FlotaResponse {
  flotaId: string;
  flotaName: string;
  flotaCity: string;
  flotaSpecifications: string[];
}

export const GarantizadoModule: React.FC = () => {
  const [data, setData] = useState<GarantizadoData[]>([]);
  const [filteredData, setFilteredData] = useState<GarantizadoData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'GARANTIZADO' | 'NO GARANTIZADO'>('TODOS');
  const [flotaFilter, setFlotaFilter] = useState<string>('SELECCIONAR');
  const [flotas, setFlotas] = useState<FlotaResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFlotas, setLoadingFlotas] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [siteAccessEnabled, setSiteAccessEnabled] = useState(true);
  const itemsPerPage = 6;

  // Función para calcular el TOTAL según la fórmula: =W2+X2+Y2+Z2-AA2+AB2
  const calculateTotal = (efectivo: number, pagoSinEfectivo: number, comYango: number, comYego: number, boSemAnt: number, boSemAct: number) => {
    return efectivo + pagoSinEfectivo + comYango + comYego - boSemAnt + boSemAct;
  };

  // Función para cargar flotas desde la API
  const cargarFlotas = async () => {
    try {
      setLoadingFlotas(true);
      console.log('🔍 [GarantizadoModule] Cargando flotas...');
      
      const response = await api.get('/garantizado/flotas');
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

  // Función para calcular GARANTIZADO según la fórmula condicional
  // =SI(AB2=$AM$10,$AN$10,SI(AB2=$AM$9,$AN$9,SI(AB2=$AM$8,$AM$8,SI(AB2=$AM$5,$AN$5,SI(AB2=$AM$4,$AN$4,SI(AB2=$AM$3,$AN$3,))))))
  const calculateGarantizado = (boSemAct: number) => {
    // Tabla de rangos de garantizado (estos valores deberían venir de la configuración)
    // Basándome en los datos de ejemplo, estos son los rangos aproximados
    const garantizadoRanges = [
      { min: 0, max: 50, garantizado: 285 },    // $AM$3, $AN$3
      { min: 51, max: 100, garantizado: 520 },  // $AM$4, $AN$4  
      { min: 101, max: 150, garantizado: 750 }, // $AM$5, $AN$5
      { min: 151, max: 200, garantizado: 950 }, // $AM$8, $AN$8
      { min: 201, max: 250, garantizado: 1250 }, // $AM$9, $AN$9
      { min: 251, max: 9999, garantizado: 1450 } // $AM$10, $AN$10
    ];

    // Buscar el rango correspondiente al boSemAct
    const range = garantizadoRanges.find(r => boSemAct >= r.min && boSemAct <= r.max);
    return range ? range.garantizado : 285; // Default a 285 si no encuentra rango
  };

  // Datos de ejemplo basados en la hoja de cálculo
  const mockData: GarantizadoData[] = [
    {
      id: '1',
      nombreCompleto: 'Jorge Darwin Fuertes Buendia',
      numeroLicencia: 'Q43845121',
      telefono: '968538129',
      viajes: 111,
      efectivo: 871.1,
      pagoSinEfectivo: 557.54,
      comYango: -147.16,
      comYego: -26.82,
      boSemAnt: 520,
      boSemAct: 0,
      total: calculateTotal(871.1, 557.54, -147.16, -26.82, 520, 0),
      garantizado: calculateGarantizado(0),
      diferencia: 0, // Se calculará después
      semana: 35,
      viajesActuales: 111,
      flota: 'YEGO BLACK',
      flotaId: '1'
    },
    {
      id: '2',
      nombreCompleto: 'Efrain Jesús Guzmán Silva',
      numeroLicencia: 'Q006120225',
      telefono: '927174104',
      viajes: 104,
      efectivo: 83,
      pagoSinEfectivo: 1076.7,
      comYango: -388.96,
      comYego: -137.22,
      boSemAnt: -33.49,
      boSemAct: 285,
      total: calculateTotal(83, 1076.7, -388.96, -137.22, -33.49, 285),
      garantizado: calculateGarantizado(285),
      diferencia: 0, // Se calculará después
      semana: 35,
      viajesActuales: 104,
      flota: 'YEGO',
      flotaId: '2'
    },
    {
      id: '3',
      nombreCompleto: 'Fernando Neville Del Portal Gonzales',
      numeroLicencia: 'Q07185617',
      telefono: '982770175',
      viajes: 141,
      efectivo: 80,
      pagoSinEfectivo: 945.5,
      comYango: -425.81,
      comYego: -128.09,
      boSemAnt: -32.02,
      boSemAct: 285,
      total: calculateTotal(80, 945.5, -425.81, -128.09, -32.02, 285),
      garantizado: calculateGarantizado(285),
      diferencia: 0, // Se calculará después
      semana: 35,
      viajesActuales: 141,
      flota: 'YEGO BLACK',
      flotaId: 'c054c8b5dfe14e75b882943b2a252706'
    },
    {
      id: '4',
      nombreCompleto: 'Walter Angello Laureano Castillo',
      numeroLicencia: 'Q44117234',
      telefono: '926863461',
      viajes: 78,
      efectivo: 899.5,
      pagoSinEfectivo: 161.25,
      comYango: -181.06,
      comYego: -28.96,
      boSemAnt: 285,
      boSemAct: 285,
      total: calculateTotal(899.5, 161.25, -181.06, -28.96, 285, 285),
      garantizado: calculateGarantizado(285),
      diferencia: 0, // Se calculará después
      semana: 35,
      viajesActuales: 78,
      flota: 'YEGO PLUS',
      flotaId: '3'
    },
    {
      id: '5',
      nombreCompleto: 'Carlos Alberto Mendoza Rojas',
      numeroLicencia: 'Q12345678',
      telefono: '987654321',
      viajes: 95,
      efectivo: 750.25,
      pagoSinEfectivo: 420.80,
      comYango: -150.30,
      comYego: -45.15,
      boSemAnt: 200,
      boSemAct: 350,
      total: calculateTotal(750.25, 420.80, -150.30, -45.15, 200, 350),
      garantizado: calculateGarantizado(350),
      diferencia: 0, // Se calculará después
      semana: 35,
      viajesActuales: 95,
      flota: 'YEGO BLACK',
      flotaId: 'c054c8b5dfe14e75b882943b2a252706'
    },
    {
      id: '6',
      nombreCompleto: 'Miguel Ángel Torres Vásquez',
      numeroLicencia: 'Q87654321',
      telefono: '912345678',
      viajes: 128,
      efectivo: 1100.00,
      pagoSinEfectivo: 680.50,
      comYango: -220.75,
      comYego: -55.25,
      boSemAnt: 400,
      boSemAct: 520,
      total: calculateTotal(1100.00, 680.50, -220.75, -55.25, 400, 520),
      garantizado: calculateGarantizado(520),
      diferencia: 0, // Se calculará después
      semana: 35,
      viajesActuales: 128,
      flota: 'YEGO',
      flotaId: '2'
    },
    {
      id: '7',
      nombreCompleto: 'Roberto Carlos Silva Morales',
      numeroLicencia: 'Q11223344',
      telefono: '955566677',
      viajes: 87,
      efectivo: 650.75,
      pagoSinEfectivo: 380.20,
      comYango: -120.45,
      comYego: -35.80,
      boSemAnt: 150,
      boSemAct: 285,
      total: calculateTotal(650.75, 380.20, -120.45, -35.80, 150, 285),
      garantizado: calculateGarantizado(285),
      diferencia: 0, // Se calculará después
      semana: 35,
      viajesActuales: 87,
      flota: 'YEGO PLUS',
      flotaId: '3'
    },
    {
      id: '8',
      nombreCompleto: 'Luis Fernando Herrera Castro',
      numeroLicencia: 'Q55667788',
      telefono: '988899900',
      viajes: 156,
      efectivo: 1250.30,
      pagoSinEfectivo: 780.65,
      comYango: -280.90,
      comYego: -65.40,
      boSemAnt: 500,
      boSemAct: 750,
      total: calculateTotal(1250.30, 780.65, -280.90, -65.40, 500, 750),
      garantizado: calculateGarantizado(750),
      diferencia: 0, // Se calculará después
      semana: 35,
      viajesActuales: 156,
      flota: 'YEGO BLACK',
      flotaId: 'c054c8b5dfe14e75b882943b2a252706'
    },
    {
      id: '9',
      nombreCompleto: 'Antonio José Ramírez López',
      numeroLicencia: 'Q99887766',
      telefono: '933344455',
      viajes: 72,
      efectivo: 580.40,
      pagoSinEfectivo: 320.15,
      comYango: -95.20,
      comYego: -28.60,
      boSemAnt: 100,
      boSemAct: 285,
      total: calculateTotal(580.40, 320.15, -95.20, -28.60, 100, 285),
      garantizado: calculateGarantizado(285),
      diferencia: 0, // Se calculará después
      semana: 35,
      viajesActuales: 72,
      flota: 'YEGO',
      flotaId: '2'
    },
    {
      id: '10',
      nombreCompleto: 'Diego Armando Gutiérrez Paredes',
      numeroLicencia: 'Q44556677',
      telefono: '977788899',
      viajes: 134,
      efectivo: 980.60,
      pagoSinEfectivo: 620.35,
      comYango: -240.15,
      comYego: -58.90,
      boSemAnt: 450,
      boSemAct: 650,
      total: calculateTotal(980.60, 620.35, -240.15, -58.90, 450, 650),
      garantizado: calculateGarantizado(650),
      diferencia: 0, // Se calculará después
      semana: 35,
      viajesActuales: 134,
      flota: 'YEGO PLUS',
      flotaId: '3'
    },
    {
      id: '11',
      nombreCompleto: 'Sergio Eduardo Flores Sánchez',
      numeroLicencia: 'Q88990011',
      telefono: '944455566',
      viajes: 98,
      efectivo: 720.85,
      pagoSinEfectivo: 450.70,
      comYango: -160.25,
      comYego: -42.10,
      boSemAnt: 250,
      boSemAct: 400,
      total: calculateTotal(720.85, 450.70, -160.25, -42.10, 250, 400),
      garantizado: calculateGarantizado(400),
      diferencia: 0, // Se calculará después
      semana: 35,
      viajesActuales: 98,
      flota: 'YEGO BLACK',
      flotaId: '1'
    },
    {
      id: '12',
      nombreCompleto: 'Ricardo Manuel Vargas Jiménez',
      numeroLicencia: 'Q22334455',
      telefono: '966677788',
      viajes: 165,
      efectivo: 1350.90,
      pagoSinEfectivo: 850.25,
      comYango: -310.60,
      comYego: -72.85,
      boSemAnt: 600,
      boSemAct: 850,
      total: calculateTotal(1350.90, 850.25, -310.60, -72.85, 600, 850),
      garantizado: calculateGarantizado(850),
      diferencia: 0, // Se calculará después
      semana: 35,
      viajesActuales: 165,
      flota: 'YEGO',
      flotaId: '2'
    },
    {
      id: '13',
      nombreCompleto: 'Javier Alejandro Medina Ruiz',
      numeroLicencia: 'Q66778899',
      telefono: '911122233',
      viajes: 82,
      efectivo: 610.35,
      pagoSinEfectivo: 340.80,
      comYango: -105.50,
      comYego: -31.25,
      boSemAnt: 120,
      boSemAct: 285,
      total: calculateTotal(610.35, 340.80, -105.50, -31.25, 120, 285),
      garantizado: calculateGarantizado(285),
      diferencia: 0, // Se calculará después
      semana: 35,
      viajesActuales: 82,
      flota: 'YEGO PLUS',
      flotaId: '3'
    },
    {
      id: '14',
      nombreCompleto: 'Andrés Felipe Castro Vega',
      numeroLicencia: 'Q33445566',
      telefono: '955577799',
      viajes: 142,
      efectivo: 1020.75,
      pagoSinEfectivo: 640.90,
      comYango: -250.40,
      comYego: -60.15,
      boSemAnt: 480,
      boSemAct: 680,
      total: calculateTotal(1020.75, 640.90, -250.40, -60.15, 480, 680),
      garantizado: calculateGarantizado(680),
      diferencia: 0, // Se calculará después
      semana: 35,
      viajesActuales: 142,
      flota: 'YEGO BLACK',
      flotaId: '1'
    },
    {
      id: '15',
      nombreCompleto: 'Óscar David Peña Rodríguez',
      numeroLicencia: 'Q77889900',
      telefono: '922233344',
      viajes: 76,
      efectivo: 590.20,
      pagoSinEfectivo: 310.45,
      comYango: -90.75,
      comYego: -26.80,
      boSemAnt: 110,
      boSemAct: 285,
      total: calculateTotal(590.20, 310.45, -90.75, -26.80, 110, 285),
      garantizado: calculateGarantizado(285),
      diferencia: 0, // Se calculará después
      semana: 35,
      viajesActuales: 76,
      flota: 'YEGO',
      flotaId: '2'
    }
  ];

  useEffect(() => {
    // Cargar flotas al inicializar el componente
    cargarFlotas();
    
    // Simular carga de datos
    setTimeout(() => {
      // Calcular diferencia para cada conductor
      const dataWithCalculations = mockData.map(item => ({
        ...item,
        diferencia: item.garantizado - item.total
      }));
      
      setData(dataWithCalculations);
      setFilteredData(dataWithCalculations);
      setLoading(false);
    }, 1000);
  }, []);

  useEffect(() => {
    let filtered = data;

    // Filtrar por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.nombreCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.numeroLicencia.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por status (calculado automáticamente)
    if (statusFilter !== 'TODOS') {
      filtered = filtered.filter(item => {
        const estadoCalculado = determinarEstadoAutomatico(item.total, item.garantizado);
        return estadoCalculado === statusFilter;
      });
    }

    // Filtrar por flota - solo si se ha seleccionado una flota
    if (flotaFilter !== 'SELECCIONAR') {
      filtered = filtered.filter(item => item.flotaId === flotaFilter);
    } else {
      // Si no se ha seleccionado flota, no mostrar conductores
      filtered = [];
    }

    setFilteredData(filtered);
    // Resetear a la primera página cuando cambien los filtros
    setCurrentPage(1);
  }, [data, searchTerm, statusFilter, flotaFilter]);

  // Calcular datos paginados
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Función para determinar automáticamente el estado basado en los cálculos
  const determinarEstadoAutomatico = (total: number, garantizado: number) => {
    const diferencia = garantizado - total;
    // Si la diferencia es positiva (garantizado > total), el conductor SÍ tiene garantía
    // Si la diferencia es negativa (garantizado < total), el conductor NO tiene garantía
    return diferencia > 0 ? 'GARANTIZADO' : 'NO GARANTIZADO';
  };

  const formatCurrency = (amount: number) => {
    return `S/.${new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)}`;
  };

  const getStatusBadge = (total: number, garantizado: number) => {
    const estadoCalculado = determinarEstadoAutomatico(total, garantizado);
    
    if (estadoCalculado === 'GARANTIZADO') {
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
            Semana 35 del período de garantía
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="px-6 py-2">
            <Download className="h-4 w-4 mr-2" />
            Exportar
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
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value as 'TODOS' | 'GARANTIZADO' | 'NO GARANTIZADO')}
                className="w-full px-3 py-2 h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="TODOS">Todos los estados</option>
                <option value="GARANTIZADO">Garantizado</option>
                <option value="NO GARANTIZADO">No Garantizado</option>
              </select>
            </div>
            <div>
              <select
                value={flotaFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFlotaFilter(e.target.value)}
                className="w-full px-3 py-2 h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                disabled={loadingFlotas || flotas.length === 0}
              >
                <option value="SELECCIONAR">
                  {loadingFlotas 
                    ? 'Cargando flotas...' 
                    : flotas.length === 0 
                      ? 'Error al cargar flotas' 
                      : 'Seleccionar flota'
                  }
                </option>
                {flotas.map((flota) => (
                  <option key={flota.flotaId} value={flota.flotaId}>
                    {flota.flotaName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Datos */}
      <Card>
        <CardHeader>
          <CardTitle>Conductores y Métricas Financieras</CardTitle>
        </CardHeader>
        <CardContent>
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
                    {getStatusBadge(item.total, item.garantizado)}
                  </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {paginatedData.length === 0 && (
            <div className="text-center py-12">
              {flotaFilter === 'SELECCIONAR' ? (
                <>
                  <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Selecciona una flota
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Por favor selecciona una flota para ver los conductores con garantía
                  </p>
                </>
              ) : (
                <>
                  <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No se encontraron conductores
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Intenta ajustar los filtros de búsqueda
                  </p>
                </>
              )}
            </div>
          )}

          {/* Controles de Paginación */}
          {filteredData.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Mostrando {startIndex + 1} a {Math.min(endIndex, filteredData.length)} de {filteredData.length} conductores
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-2 px-6 py-2 whitespace-nowrap"
                  >
                    <ChevronLeft className="h-4 w-4 flex-shrink-0" />
                    <span>Anterior</span>
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "primary" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-2 px-6 py-2 whitespace-nowrap"
                  >
                    <span>Siguiente</span>
                    <ChevronRight className="h-4 w-4 flex-shrink-0" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
};
