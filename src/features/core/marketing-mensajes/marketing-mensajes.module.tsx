import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Trash2, 
  Save,
  Calendar,
  Users,
  FileText,
  History,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  Plus,
  X
} from 'lucide-react';
import { useAuth } from "@/shared/hooks/useAuth";
import AccessRestricted from '@/shared/components/AccessRestricted';

interface MensajeMarketing {
  id: number;
  titulo: string;
  mensaje: string;
  modo: string;
  tipo: string;
  archivo?: string;
  whatsapp: boolean;
  yandex: boolean;
  diasActivos: string[]; // ['Lun', 'Mar', 'Mié', etc.]
  horaInicio?: string;
  horaFin?: string;
  grupos: string[];
  flotas: string[];
  createdAt: string;
  updatedAt: string;
}

interface Grupo {
  id: string;
  nombre: string;
}

interface Flota {
  id: string;
  nombre: string;
  ubicacion: string;
}

interface HistoricoProgramacion {
  id: number;
  mensaje_id: number;
  mensaje_titulo: string;
  accion: 'CREADO' | 'ACTUALIZADO' | 'ENVIADO' | 'CANCELADO' | 'ELIMINADO';
  fecha_programada?: string;
  fecha_ejecucion?: string;
  canal: string;
  destinatarios_count?: number;
  exitoso?: boolean;
  error_message?: string;
  created_at: string;
  created_by?: number;
}

const MarketingMensajesModule: React.FC = () => {
  const authState = useAuth();
  const [mensajes, setMensajes] = useState<MensajeMarketing[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [flotas, setFlotas] = useState<Flota[]>([]);
  const [historico, setHistorico] = useState<HistoricoProgramacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [editingMensaje, setEditingMensaje] = useState<MensajeMarketing | null>(null);
  const [activeTab, setActiveTab] = useState<'programacion' | 'historico'>('programacion');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState<Partial<MensajeMarketing>>({
    titulo: '',
    mensaje: '',
    modo: 'Otros',
    tipo: 'Sin tipo',
    archivo: undefined,
    whatsapp: false,
    yandex: false,
    diasActivos: [],
    horaInicio: '',
    horaFin: '',
    grupos: [],
    flotas: []
  });

  const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const horas = Array.from({ length: 24 }, (_, i) => {
    const hora = i.toString().padStart(2, '0');
    return `${hora}:00`;
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Llamadas al API
      // const [mensajesRes, gruposRes, flotasRes] = await Promise.all([
      //   api.get('/marketing-mensajes'),
      //   api.get('/api/grupos'), // API externa de grupos
      //   api.get('/api/flotas')  // API externa de flotas
      // ]);
      
      // setMensajes(mensajesRes.data);
      // setGrupos(gruposRes.data);
      // setFlotas(flotasRes.data);
      
      // Por ahora, datos de ejemplo
      setMensajes([
        {
          id: 1,
          titulo: '¡Aprovecha las horas de mayor demanda!',
          mensaje: 'Conduce en las horas pico y aumenta tus ganancias',
          modo: 'Otros',
          tipo: 'Sin tipo',
          whatsapp: true,
          yandex: false,
          diasActivos: ['Lun', 'Mié', 'Vie', 'Mar', 'Jue'],
          grupos: [],
          flotas: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 2,
          titulo: 'Tips para mejorar la calificación',
          mensaje: 'Sigue estos consejos para obtener mejores calificaciones',
          modo: 'Otros',
          tipo: 'Sin tipo',
          whatsapp: true,
          yandex: true,
          diasActivos: ['Lun', 'Jue', 'Dom'],
          grupos: [],
          flotas: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]);
      
      // Los grupos y flotas se obtienen de API externa
      // Por ahora datos de ejemplo - reemplazar con llamada real a API
      try {
        // const gruposRes = await api.get('/api/grupos-comunidad');
        // setGrupos(gruposRes.data);
        setGrupos([
          { id: '1', nombre: 'Grupo: auto aqp yego yango' },
          { id: '2', nombre: 'Grupo: auto cali yego yango 1' },
          { id: '3', nombre: 'Grupo: auto lima yego yango 1' },
          { id: '4', nombre: 'Grupo: auto lima yego yango 2' },
          { id: '5', nombre: 'Grupo: auto lima yego yango 3' },
          { id: '6', nombre: 'Grupo: auto trujillo yego yango' }
        ]);
      } catch (error) {
        console.error('Error fetching grupos:', error);
      }

      try {
        // const flotasRes = await api.get('/api/fleet-yego');
        // setFlotas(flotasRes.data);
        setFlotas([
          { id: '1', nombre: 'Yego Bucaramanga', ubicacion: 'Bucaramanga' },
          { id: '2', nombre: 'Yego Cúcuta', ubicacion: 'Cúcuta' },
          { id: '3', nombre: 'Yego Lima', ubicacion: 'Lima' },
          { id: '4', nombre: 'Yego Arequipa', ubicacion: 'Arequipa' },
          { id: '5', nombre: 'Yego Barranquilla', ubicacion: 'Barranquilla' },
          { id: '6', nombre: 'Yego Black Lima', ubicacion: 'Lima' }
        ]);
      } catch (error) {
        console.error('Error fetching flotas:', error);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingMensaje) {
        // await api.put(`/marketing-mensajes/${editingMensaje.id}`, formData);
        setMensajes(mensajes.map(m => m.id === editingMensaje.id ? { ...m, ...formData } as MensajeMarketing : m));
      } else {
        // await api.post('/marketing-mensajes', formData);
        const newMensaje: MensajeMarketing = {
          id: Date.now(),
          ...formData,
          titulo: formData.titulo || '',
          mensaje: formData.mensaje || '',
          modo: formData.modo || 'Otros',
          tipo: formData.tipo || 'Sin tipo',
          whatsapp: formData.whatsapp || false,
          yandex: formData.yandex || false,
          diasActivos: formData.diasActivos || [],
          grupos: formData.grupos || [],
          flotas: formData.flotas || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as MensajeMarketing;
        setMensajes([...mensajes, newMensaje]);
      }
      
      // Reset form and close modal
      setFormData({
        titulo: '',
        mensaje: '',
        modo: 'Otros',
        tipo: 'Sin tipo',
        archivo: undefined,
        whatsapp: false,
        yandex: false,
        diasActivos: [],
        horaInicio: '',
        horaFin: '',
        grupos: [],
        flotas: []
      });
      setEditingMensaje(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving mensaje:', error);
    }
  };

  const handleOpenModal = () => {
    setEditingMensaje(null);
    setFormData({
      titulo: '',
      mensaje: '',
      modo: 'Otros',
      tipo: 'Sin tipo',
      archivo: undefined,
      whatsapp: false,
      yandex: false,
      diasActivos: [],
      horaInicio: '',
      horaFin: '',
      grupos: [],
      flotas: []
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMensaje(null);
    setFormData({
      titulo: '',
      mensaje: '',
      modo: 'Otros',
      tipo: 'Sin tipo',
      archivo: undefined,
      whatsapp: false,
      yandex: false,
      diasActivos: [],
      horaInicio: '',
      horaFin: '',
      grupos: [],
      flotas: []
    });
  };

  const handleDelete = async (id: number) => {
    try {
      // await api.delete(`/marketing-mensajes/${id}`);
      setMensajes(mensajes.filter(m => m.id !== id));
    } catch (error) {
      console.error('Error deleting mensaje:', error);
    }
  };

  const handleEdit = (mensaje: MensajeMarketing) => {
    setEditingMensaje(mensaje);
    setFormData({
      titulo: mensaje.titulo,
      mensaje: mensaje.mensaje,
      modo: mensaje.modo,
      tipo: mensaje.tipo,
      archivo: mensaje.archivo,
      whatsapp: mensaje.whatsapp,
      yandex: mensaje.yandex,
      diasActivos: mensaje.diasActivos,
      horaInicio: mensaje.horaInicio,
      horaFin: mensaje.horaFin,
      grupos: mensaje.grupos,
      flotas: mensaje.flotas
    });
    setIsModalOpen(true);
  };

  const toggleDia = (dia: string) => {
    const diasActivos = formData.diasActivos || [];
    if (diasActivos.includes(dia)) {
      setFormData({ ...formData, diasActivos: diasActivos.filter(d => d !== dia) });
    } else {
      setFormData({ ...formData, diasActivos: [...diasActivos, dia] });
    }
  };

  const getMensajesPorHora = (dia: string, hora: string) => {
    return mensajes.filter(m => 
      m.diasActivos.includes(dia) && 
      (!m.horaInicio || m.horaInicio <= hora) &&
      (!m.horaFin || m.horaFin > hora)
    );
  };

  if (!authState || !authState.isAuthenticated) {
    return <AccessRestricted />;
  }

  const fetchHistorico = async () => {
    try {
      setLoadingHistorico(true);
      // await api.get('/marketing-mensajes/historico')
      // setHistorico(historicoRes.data);
      
      // Datos de ejemplo
      setHistorico([
        {
          id: 1,
          mensaje_id: 1,
          mensaje_titulo: '¡Aprovecha las horas de mayor demanda!',
          accion: 'ENVIADO',
          fecha_programada: '2024-01-15T14:00:00Z',
          fecha_ejecucion: '2024-01-15T14:00:05Z',
          canal: 'whatsapp',
          destinatarios_count: 150,
          exitoso: true,
          created_at: '2024-01-15T14:00:05Z'
        },
        {
          id: 2,
          mensaje_id: 1,
          mensaje_titulo: '¡Aprovecha las horas de mayor demanda!',
          accion: 'ACTUALIZADO',
          fecha_programada: '2024-01-14T10:00:00Z',
          canal: 'ambos',
          exitoso: true,
          created_at: '2024-01-14T10:00:00Z'
        },
        {
          id: 3,
          mensaje_id: 2,
          mensaje_titulo: 'Tips para mejorar la calificación',
          accion: 'CREADO',
          fecha_programada: '2024-01-13T09:00:00Z',
          canal: 'whatsapp',
          exitoso: true,
          created_at: '2024-01-13T09:00:00Z'
        }
      ]);
    } catch (error) {
      console.error('Error fetching histórico:', error);
    } finally {
      setLoadingHistorico(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'historico') {
      fetchHistorico();
    }
  }, [activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-600 dark:text-neutral-400">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-700">
        <button
          onClick={() => setActiveTab('programacion')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'programacion'
              ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
        >
          <Calendar className="h-4 w-4 inline mr-2" />
          Programación
        </button>
        <button
          onClick={() => setActiveTab('historico')}
          className={`px-4 py-2 font-medium text-sm transition-colors ${
            activeTab === 'historico'
              ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
        >
          <History className="h-4 w-4 inline mr-2" />
          Histórico
        </button>
      </div>

      {activeTab === 'programacion' ? (
        <div className="flex gap-4 h-[calc(100vh-12rem)]">
      {/* Panel Izquierdo - Lista de Mensajes */}
      <div className="w-1/3 flex flex-col gap-4 overflow-y-auto">
        {/* Botón para crear nuevo mensaje */}
        <Button 
          onClick={handleOpenModal}
          variant="primary"
          className="w-full"
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Nuevo Mensaje
        </Button>

        {/* Lista de Mensajes */}
        <div className="space-y-2">
          {mensajes.map(mensaje => (
            <Card key={mensaje.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1" onClick={() => handleEdit(mensaje)}>
                    <h3 className="font-semibold text-sm mb-1">{mensaje.titulo}</h3>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {mensaje.diasActivos.map(dia => (
                        <span 
                          key={dia}
                          className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded text-xs"
                        >
                          {dia}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(mensaje.id)}
                    className="text-error-600 hover:text-error-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Panel Central - Calendario */}
      <div className="flex-1 min-w-0">
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendario Semanal
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            <div className="overflow-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border border-neutral-200 dark:border-neutral-700 p-2 text-left text-sm font-medium">Hora</th>
                    {diasSemana.map(dia => (
                      <th key={dia} className="border border-neutral-200 dark:border-neutral-700 p-2 text-center text-sm font-medium">
                        {dia}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {horas.map(hora => (
                    <tr key={hora}>
                      <td className="border border-neutral-200 dark:border-neutral-700 p-2 text-sm text-neutral-600 dark:text-neutral-400">
                        {hora}
                      </td>
                      {diasSemana.map(dia => {
                        const mensajesEnSlot = getMensajesPorHora(dia, hora);
                        return (
                          <td 
                            key={`${dia}-${hora}`}
                            className="border border-neutral-200 dark:border-neutral-700 p-1"
                          >
                            {mensajesEnSlot.length > 0 && (
                              <div className="space-y-1">
                                {mensajesEnSlot.map(m => (
                                  <div
                                    key={m.id}
                                    className="bg-red-500 text-white text-xs p-1 rounded cursor-pointer hover:bg-red-600"
                                    onClick={() => handleEdit(m)}
                                    title={m.titulo}
                                  >
                                    {m.titulo.substring(0, 20)}...
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Panel Derecho - Grupos y Flotas */}
      <div className="w-1/4 flex flex-col gap-4 overflow-y-auto">
        {/* Grupos y Comunidad */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Grupos y comunidad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {grupos.map(grupo => (
                <div
                  key={grupo.id}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                >
                  <Users className="h-4 w-4 text-neutral-500" />
                  <span className="text-sm">{grupo.nombre}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Fleet Yego */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Fleet Yego
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {flotas.map(flota => (
                <div
                  key={flota.id}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                >
                  <Users className="h-4 w-4 text-neutral-500" />
                  <div>
                    <div className="text-sm font-medium">{flota.nombre}</div>
                    <div className="text-xs text-neutral-500">{flota.ubicacion}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
        </div>
      ) : (
        /* Vista de Histórico */
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Programaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingHistorico ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : historico.length === 0 ? (
                <div className="text-center py-12">
                  <History className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
                  <p className="text-neutral-500 dark:text-neutral-400">No hay registros en el histórico</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-neutral-200 dark:border-neutral-700">
                        <th className="text-left p-3 text-sm font-medium">Fecha/Hora</th>
                        <th className="text-left p-3 text-sm font-medium">Mensaje</th>
                        <th className="text-left p-3 text-sm font-medium">Acción</th>
                        <th className="text-left p-3 text-sm font-medium">Canal</th>
                        <th className="text-left p-3 text-sm font-medium">Programado</th>
                        <th className="text-left p-3 text-sm font-medium">Ejecutado</th>
                        <th className="text-left p-3 text-sm font-medium">Destinatarios</th>
                        <th className="text-left p-3 text-sm font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historico.map((item) => (
                        <tr key={item.id} className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                          <td className="p-3 text-sm">
                            {new Date(item.created_at).toLocaleString('es-PE')}
                          </td>
                          <td className="p-3 text-sm font-medium">{item.mensaje_titulo}</td>
                          <td className="p-3 text-sm">
                            <span className={`px-2 py-1 rounded text-xs ${
                              item.accion === 'ENVIADO' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
                              item.accion === 'CREADO' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' :
                              item.accion === 'ACTUALIZADO' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' :
                              item.accion === 'CANCELADO' ? 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300' :
                              'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                            }`}>
                              {item.accion}
                            </span>
                          </td>
                          <td className="p-3 text-sm capitalize">{item.canal}</td>
                          <td className="p-3 text-sm">
                            {item.fecha_programada ? (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(item.fecha_programada).toLocaleString('es-PE')}
                              </div>
                            ) : '-'}
                          </td>
                          <td className="p-3 text-sm">
                            {item.fecha_ejecucion ? (
                              <div className="flex items-center gap-1">
                                <Send className="h-3 w-3" />
                                {new Date(item.fecha_ejecucion).toLocaleString('es-PE')}
                              </div>
                            ) : '-'}
                          </td>
                          <td className="p-3 text-sm">
                            {item.destinatarios_count ? `${item.destinatarios_count} destinatarios` : '-'}
                          </td>
                          <td className="p-3 text-sm">
                            {item.exitoso !== undefined ? (
                              <div className="flex items-center gap-1">
                                {item.exitoso ? (
                                  <>
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    <span className="text-green-600 dark:text-green-400">Exitoso</span>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-4 w-4 text-red-500" />
                                    <span className="text-red-600 dark:text-red-400">Fallido</span>
                                  </>
                                )}
                              </div>
                            ) : '-'}
                            {item.error_message && (
                              <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                                {item.error_message}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de Creación/Edición */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {editingMensaje ? 'Editar Mensaje' : 'Nuevo Mensaje'}
            </DialogTitle>
            <DialogDescription>
              {editingMensaje 
                ? 'Modifica los datos del mensaje de marketing'
                : 'Completa el formulario para crear un nuevo mensaje de marketing'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1">Título</label>
              <Input
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Ej: CAPACITACIÓN VIRTUAL - cali"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Mensaje</label>
              <Textarea
                value={formData.mensaje}
                onChange={(e) => setFormData({ ...formData, mensaje: e.target.value })}
                placeholder="Escribe tu mensaje aquí..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Modo</label>
                <Select 
                  value={formData.modo} 
                  onValueChange={(value) => setFormData({ ...formData, modo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Otros">Otros</SelectItem>
                    <SelectItem value="Promoción">Promoción</SelectItem>
                    <SelectItem value="Recordatorio">Recordatorio</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <Select 
                  value={formData.tipo} 
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sin tipo">Sin tipo</SelectItem>
                    <SelectItem value="Notificación">Notificación</SelectItem>
                    <SelectItem value="Anuncio">Anuncio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.archivo && (
              <div>
                <label className="block text-sm font-medium mb-1">Archivo</label>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">Ver archivo</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium">Canales</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.whatsapp || false}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">WhatsApp</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.yandex || false}
                    onChange={(e) => setFormData({ ...formData, yandex: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Yandex</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Días activos</label>
              <div className="flex flex-wrap gap-2">
                {diasSemana.map(dia => (
                  <button
                    key={dia}
                    type="button"
                    onClick={() => toggleDia(dia)}
                    className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                      formData.diasActivos?.includes(dia)
                        ? 'bg-primary-500 text-white'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    {dia}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Hora inicio</label>
                <Select 
                  value={formData.horaInicio} 
                  onValueChange={(value) => setFormData({ ...formData, horaInicio: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {horas.map(hora => (
                      <SelectItem key={hora} value={hora}>{hora}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Hora fin</label>
                <Select 
                  value={formData.horaFin} 
                  onValueChange={(value) => setFormData({ ...formData, horaFin: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {horas.map(hora => (
                      <SelectItem key={hora} value={hora}>{hora}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DialogFooter className="mt-6">
            <Button 
              variant="secondary" 
              onClick={handleCloseModal}
              leftIcon={<X className="h-4 w-4" />}
            >
              Cancelar
            </Button>
            <Button 
              variant="primary"
              onClick={handleSave}
              leftIcon={<Save className="h-4 w-4" />}
            >
              {editingMensaje ? 'Actualizar' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MarketingMensajesModule;

