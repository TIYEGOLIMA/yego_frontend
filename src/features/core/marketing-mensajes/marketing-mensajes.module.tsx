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
  X,
  Upload,
  Image as ImageIcon,
  AlertTriangle,
  Eye,
  Pencil
} from 'lucide-react';
import { useAuth } from "@/shared/hooks/useAuth";
import AccessRestricted from '@/shared/components/AccessRestricted';
import { api } from '@/services/core/api';
import { useToastNotifications } from '@/hooks/useToastNotifications';
import { NotificationContainer } from '@/components/NotificationToast';

// Interfaces
interface MensajeMarketing {
  id: number;
  titulo: string;
  mensaje: string;
  modo: string;
  tipo: string;
  archivo?: string;
  comentarioImagen?: string;
  whatsapp: boolean;
  yandex: boolean;
  diasActivos: string[];
  horasEspecificas?: {[hora: string]: string[]}; // Horas específicas: cada hora contiene los días en que está activa
  grupos: string[];
  flotas: string[];
  activo?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Interfaz para mensajes del calendario (solo campos necesarios)
interface MensajeCalendario {
  id: number;
  titulo: string;
  diasActivos: string[];
  horasEspecificas?: {[hora: string]: string[]}; // Horas específicas: cada hora contiene los días en que está activa
}

interface Grupo {
  id: string;
  subject: string;
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

type TabType = 'programacion' | 'historico' | 'lista';

// Constantes
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const ORDEN_DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// Generar solo horas completas (00:00, 01:00, etc.)
const HORAS = Array.from({ length: 24 }, (_, i) => {
  const hora = i.toString().padStart(2, '0');
  return `${hora}:00`;
});

// Minutos disponibles (cada 5 minutos)
const MINUTOS = Array.from({ length: 12 }, (_, i) => i * 5);

const OPCIONES_MODO = ['auto', 'moto', 'carga'];
const OPCIONES_TIPO = ['video', 'pdf', 'imagen', 'audio', 'ninguna'];

// Constantes para clases CSS comunes
const CSS_CLASSES = {
  label: 'text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide',
  labelForm: 'block text-sm font-medium mb-1',
  cellBorder: 'border-r border-neutral-200 dark:border-neutral-700 last:border-r-0',
  gridBorder: 'border-b border-neutral-200 dark:border-neutral-700 last:border-b-0',
  headerCell: 'text-sm font-semibold text-neutral-700 dark:text-neutral-300 p-2 bg-neutral-50 dark:bg-neutral-800/50 border-r border-neutral-200 dark:border-neutral-700',
  hourCell: 'text-sm text-neutral-700 dark:text-neutral-300 p-1.5 bg-neutral-50 dark:bg-neutral-800/50 border-r border-neutral-200 dark:border-neutral-700',
  buttonBase: 'w-full aspect-square p-3 transition-all relative flex flex-col items-start justify-start',
  buttonDisabled: 'bg-neutral-100 dark:bg-neutral-800/30 opacity-40 cursor-not-allowed',
  buttonSelected: 'bg-red-200 dark:bg-red-900/40 hover:bg-red-300 dark:hover:bg-red-900/60',
  buttonDefault: 'bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/50',
  badgeMinuto: 'text-[10px] px-1.5 py-1 bg-primary-600 text-white rounded font-medium'
};

// Constantes para grid
const GRID_CONFIG = {
  horasColumnWidth: '60px',
  diasColumnWidth: '100px',
  getGridColumns: (diasCount: number) => `60px repeat(${diasCount}, 100px)`,
  getModalWidth: (diasCount: number) => {
    // 60px (columna horas) + (diasCount * 100px) + padding del modal
    const gridWidth = 60 + (diasCount * 100);
    const padding = 48; // padding del DialogContent (24px cada lado)
    return `${gridWidth + padding}px`; // Ancho exacto sin espacio extra
  }
};

// Función auxiliar para ordenar días según el orden de la semana (fuera del componente para reutilización)
const ordenarDias = (dias: string[]): string[] => {
  return [...dias].sort((a, b) => {
    const indexA = ORDEN_DIAS.indexOf(a);
    const indexB = ORDEN_DIAS.indexOf(b);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });
};


const FORM_DATA_DEFAULT: Partial<MensajeMarketing> = {
  titulo: '',
  mensaje: '',
  modo: '',
  tipo: 'ninguna',
  archivo: undefined,
  comentarioImagen: '',
  whatsapp: false,
  yandex: false,
  diasActivos: [],
  horasEspecificas: {},
  grupos: [],
  flotas: []
};

// Componentes auxiliares
const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center">
      <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-neutral-600 dark:text-neutral-400">Cargando...</p>
    </div>
  </div>
);

const EmptyState: React.FC<{ icon: React.ReactNode; message: string }> = ({ icon, message }) => (
  <div className="text-center py-12">
    {icon}
    <p className="text-neutral-500 dark:text-neutral-400 mt-4">{message}</p>
  </div>
);

// Componente para el popover de horarios en la tabla
const HorariosPopoverCell: React.FC<{
  mensaje: MensajeMarketing;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}> = ({ mensaje, isOpen, onToggle, onClose }) => {
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [position, setPosition] = React.useState<{ top: number; left: number } | null>(null);

  React.useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left
      });
    }
  }, [isOpen]);

  const horariosLista: Array<{dia: string, hora: string}> = [];
  if (mensaje.horasEspecificas) {
    Object.entries(mensaje.horasEspecificas).forEach(([hora, dias]) => {
      dias.forEach(dia => {
        horariosLista.push({ dia, hora });
      });
    });
  }
  // Ordenar por día y luego por hora
  horariosLista.sort((a, b) => {
    const diaA = ORDEN_DIAS.indexOf(a.dia);
    const diaB = ORDEN_DIAS.indexOf(b.dia);
    if (diaA !== diaB) return diaA - diaB;
    return a.hora.localeCompare(b.hora);
  });

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors cursor-pointer"
      >
        <Clock className="h-3 w-3 flex-shrink-0" />
        <span className="truncate max-w-[200px]">
          {(() => {
            const diasConHoras: {[dia: string]: string[]} = {};
            if (mensaje.horasEspecificas) {
              Object.entries(mensaje.horasEspecificas).forEach(([hora, dias]) => {
                dias.forEach(dia => {
                  if (!diasConHoras[dia]) diasConHoras[dia] = [];
                  diasConHoras[dia].push(hora);
                });
              });
            }
            const diasOrdenados = ordenarDias(Object.keys(diasConHoras));
            const resumen: string[] = [];
            diasOrdenados.forEach(dia => {
              const horas = diasConHoras[dia].sort();
              resumen.push(`${dia}: ${horas.join(', ')}`);
            });
            return resumen.join(' | ');
          })()}
        </span>
      </button>
      
      {isOpen && position && (
        <>
          {/* Overlay para cerrar al hacer clic fuera */}
          <div 
            className="fixed inset-0 z-[100]" 
            onClick={onClose}
          />
          {/* Card pequeño con todos los horarios - usando fixed para salir de la tabla */}
          <div 
            className="fixed z-[101] bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md shadow-xl p-2 max-h-48 overflow-y-auto w-auto min-w-[180px] max-w-[300px]"
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap gap-1">
              {horariosLista.map((item, index) => (
                <span 
                  key={`${item.dia}-${item.hora}-${index}`}
                  className="text-[10px] px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded whitespace-nowrap"
                >
                  {item.dia}: {item.hora}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
};

// Constantes compartidas
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];

// Funciones auxiliares compartidas para manejo de imágenes
const isImageFile = (file: string | null | undefined): boolean => {
  if (!file) return false;
  // Base64
  if (file.startsWith('data:image')) return true;
  // URL o ruta de imagen
  const lowerFile = file.toLowerCase();
  return IMAGE_EXTENSIONS.some(ext => lowerFile.includes(ext)) || 
         lowerFile.startsWith('http://') || 
         lowerFile.startsWith('https://') ||
         lowerFile.startsWith('/');
};

// Construir la URL completa si es una ruta relativa
const getImageUrl = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined;
  // Si ya es una URL completa (http/https) o base64, devolverla tal cual
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  // Si es una ruta relativa que comienza con /, construir URL completa
  if (url.startsWith('/')) {
    const apiBaseUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3030/api' : '/api');
    // Remover /api del final si existe para construir la URL correcta
    const baseUrl = apiBaseUrl.replace('/api', '');
    return `${baseUrl}${url}`;
  }
  return url;
};

// Componente para renderizar archivo/imagen
interface FilePreviewProps {
  archivo?: string;
  selectedFile?: File | null;
  filePreview?: string | null;
  onRemove?: () => void;
  onReplace?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  size?: 'sm' | 'md';
}

const FilePreview: React.FC<FilePreviewProps> = ({ 
  archivo, 
  selectedFile, 
  filePreview, 
  onRemove, 
  onReplace,
  size = 'md'
}) => {

  const imageSource = filePreview || archivo;
  const imageUrl = getImageUrl(imageSource);
  const isImage = isImageFile(imageSource);
  const imageSize = size === 'sm' ? 'w-10 h-10' : 'w-16 h-16';
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-6 w-6';

  if (!archivo && !selectedFile && !filePreview) return null;

  return (
    <div className="flex items-center gap-2">
      {isImage && imageUrl ? (
        <>
          <img
            src={imageUrl}
            alt="Preview"
            className={`${imageSize} object-cover rounded border border-neutral-200 dark:border-neutral-700`}
            onError={(e) => {
              // Si la imagen falla al cargar, ocultar y mostrar icono de archivo
              e.currentTarget.style.display = 'none';
            }}
          />
          {size === 'md' && <ImageIcon className="h-4 w-4 text-primary-500" />}
        </>
      ) : (
        <>
          <FileText className={`${iconSize} text-primary-500`} />
          {size === 'md' && (
            <span className="text-xs text-neutral-600 dark:text-neutral-400 truncate max-w-[120px]">
              {typeof archivo === 'string' && archivo.length > 20 
                ? archivo.substring(0, 20) + '...' 
                : selectedFile?.name || archivo}
            </span>
          )}
        </>
      )}
      {onRemove && size === 'md' && (
        <button
          type="button"
          onClick={onRemove}
          className="p-1 rounded hover:bg-error-50 dark:hover:bg-error-900/20 text-error-600 hover:text-error-700 transition-colors"
          title="Eliminar archivo"
        >
          <X className="h-3 w-3" />
        </button>
      )}
      {onReplace && !selectedFile && size === 'md' && (
        <div className="mt-2">
          <input
            type="file"
            id="file-replace"
            className="hidden"
            accept="image/*,.pdf,.doc,.docx"
            onChange={onReplace}
          />
          <label
            htmlFor="file-replace"
            className="inline-flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 cursor-pointer"
          >
            <Upload className="h-3 w-3" />
            Reemplazar
          </label>
        </div>
      )}
    </div>
  );
};

// Componente para badges de estado
interface BadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'purple';
  size?: 'sm' | 'md';
}

const Badge: React.FC<BadgeProps> = ({ label, variant = 'primary', size = 'sm' }) => {
  const variantClasses = {
    primary: 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300',
    success: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
    warning: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
    error: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
    info: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
    purple: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm'
  };

  return (
    <span className={`px-2 py-1 rounded text-xs ${variantClasses[variant]} ${sizeClasses[size]}`}>
      {label}
    </span>
  );
};

// Componente para checkbox de destinatarios
interface DestinatarioCheckboxProps {
  label: string;
  sublabel?: string;
  checked: boolean;
  onChange: () => void;
}

const DestinatarioCheckbox: React.FC<DestinatarioCheckboxProps> = ({
  label,
  sublabel,
  checked,
  onChange
}) => (
  <label
    className="flex items-center gap-2 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 p-2 rounded transition-colors"
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="w-4 h-4"
    />
    {sublabel ? (
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-neutral-500">{sublabel}</div>
      </div>
    ) : (
      <span className="text-sm">{label}</span>
    )}
  </label>
);

// Componente genérico de pestañas
interface TabItem<T extends string> {
  id: T;
  label: string;
  icon: React.ReactNode;
  showActionButton?: boolean;
}

interface TabsProps<T extends string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  actionButton?: React.ReactNode;
  className?: string;
}

const Tabs = <T extends string>({ 
  tabs, 
  activeTab, 
  onTabChange, 
  actionButton,
  className = ''
}: TabsProps<T>) => {
  const activeTabConfig = tabs.find(tab => tab.id === activeTab);
  const showActionButton = activeTabConfig?.showActionButton && actionButton;

  return (
    <div className={`flex items-center justify-between gap-2 border-b border-neutral-200 dark:border-neutral-700 ${className}`}>
      <div className="flex gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      {showActionButton && actionButton}
    </div>
  );
};

const MarketingMensajesModule: React.FC = () => {
  const authState = useAuth();
  const { showError, notifications, removeNotification } = useToastNotifications();
  const [mensajes, setMensajes] = useState<MensajeMarketing[]>([]);
  const [mensajesCalendario, setMensajesCalendario] = useState<MensajeCalendario[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [flotas, setFlotas] = useState<Flota[]>([]);
  const [historico, setHistorico] = useState<HistoricoProgramacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [loadingMensaje, setLoadingMensaje] = useState(false);
  const [editingMensaje, setEditingMensaje] = useState<MensajeMarketing | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('programacion');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isViewModalEditing, setIsViewModalEditing] = useState(false);
  const [isViewModalCreating, setIsViewModalCreating] = useState(false);
  const [mensajeToDelete, setMensajeToDelete] = useState<MensajeMarketing | null>(null);
  const [mensajeToView, setMensajeToView] = useState<MensajeMarketing | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'basico' | 'destinatarios'>('basico');
  const [formData, setFormData] = useState<Partial<MensajeMarketing>>(FORM_DATA_DEFAULT);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isHorariosModalOpen, setIsHorariosModalOpen] = useState(false);
  const [horariosSeleccionados, setHorariosSeleccionados] = useState<{[hora: string]: string[]}>({}); // Estructura: {[hora]: [dias]}
  const [minutosModalOpen, setMinutosModalOpen] = useState<{dia: string, hora: string} | null>(null);
  const [horariosPopoverOpen, setHorariosPopoverOpen] = useState<number | null>(null); // ID del mensaje con popover abierto

  // Helpers
  const resetForm = () => {
    setFormData(FORM_DATA_DEFAULT);
    setSelectedFile(null);
    setFilePreview(null);
    setEditingMensaje(null);
    setValidationError(null);
  };

  // Función para obtener el día actual de la semana
  const getDiaActual = (): string => {
    const hoy = new Date();
    const diaSemana = hoy.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    const mapeoDias: { [key: number]: string } = {
      0: 'Dom',
      1: 'Lun',
      2: 'Mar',
      3: 'Mié',
      4: 'Jue',
      5: 'Vie',
      6: 'Sáb'
    };
    return mapeoDias[diaSemana] || 'Lun';
  };

  // Función para verificar si un día ya pasó en la semana actual
  const isDiaPasado = (dia: string): boolean => {
    const diaActual = getDiaActual();
    const indiceActual = DIAS_SEMANA.indexOf(diaActual);
    const indiceDia = DIAS_SEMANA.indexOf(dia);
    
    // Si el día está antes del día actual en la semana, ya pasó
    return indiceDia < indiceActual;
  };

  // Función para verificar si una hora ya pasó en el día actual
  const isHoraPasada = (hora: string, dia?: string): boolean => {
    const hoy = new Date();
    const horaActual = hoy.getHours();
    const minutoActual = hoy.getMinutes();
    
    // Parsear hora seleccionada (formato "HH:MM")
    const [horaStr, minutoStr] = hora.split(':');
    const horaSeleccionada = parseInt(horaStr);
    const minutoSeleccionado = parseInt(minutoStr || '0');
    
    // Si se está seleccionando para un día que ya pasó, todas las horas están bloqueadas
    if (dia && isDiaPasado(dia)) {
      return true;
    }
    
    // Si es el día actual, bloquear horas/minutos que ya pasaron
    const diaActual = getDiaActual();
    if (!dia || dia === diaActual) {
      if (horaSeleccionada < horaActual) return true;
      if (horaSeleccionada === horaActual && minutoSeleccionado < minutoActual) return true;
    }
    
    // Si es un día futuro, todas las horas están disponibles
    return false;
  };

  // ============================================
  // FUNCIONES AUXILIARES - Parseo y conversión
  // ============================================
  
  // Función auxiliar para parsear horasEspecificas desde JSON string
  const parseHorasEspecificas = (horasEspecificas: any): {[hora: string]: string[]} | undefined => {
    if (!horasEspecificas) return undefined;
    
    let parsed = horasEspecificas;
    if (typeof horasEspecificas === 'string') {
      try {
        parsed = JSON.parse(horasEspecificas);
      } catch (e) {
        return undefined;
      }
    }
    
    // Convertir a nueva estructura si es necesario
    return convertirEstructuraAntigua(parsed);
  };

  // Función auxiliar para agregar arrays a FormData
  const appendArrayToFormData = (formData: FormData, fieldName: string, array: string[] | undefined) => {
    if (array && array.length > 0) {
      array.forEach(item => formData.append(fieldName, item));
    }
  };

  // Función auxiliar para validar campos del formulario
  const validateFormData = (): string | null => {
    if (!formData.titulo?.trim()) {
      return 'El título es requerido';
    }
    if (!formData.mensaje?.trim()) {
      return 'El mensaje es requerido';
    }
    if (!formData.horasEspecificas || Object.keys(formData.horasEspecificas).length === 0) {
      return 'Debes seleccionar al menos un horario';
    }
    if (!formData.diasActivos || formData.diasActivos.length === 0) {
      return 'Debes seleccionar al menos un día';
    }
    return null;
  };

  // Función auxiliar para generar resumen de horarios desde una estructura de horas específicas
  const generarResumenHorarios = (horasEspecificas?: {[hora: string]: string[]}): string => {
    if (!horasEspecificas || Object.keys(horasEspecificas).length === 0) {
      return '';
    }
    
    const diasConHoras: {[dia: string]: string[]} = {};
    
    // Convertir estructura por hora a estructura por día para el resumen
    Object.entries(horasEspecificas).forEach(([hora, dias]) => {
      if (dias && dias.length > 0) {
        dias.forEach(dia => {
          if (!diasConHoras[dia]) {
            diasConHoras[dia] = [];
          }
          diasConHoras[dia].push(hora);
        });
      }
    });
    
    // Ordenar días según el orden de la semana
    const diasOrdenados = ordenarDias(Object.keys(diasConHoras));
    
    const resumen: string[] = [];
    diasOrdenados.forEach(dia => {
      const horas = diasConHoras[dia];
      if (horas && horas.length > 0) {
        const horasOrdenadas = horas.sort();
        resumen.push(`${dia}: ${horasOrdenadas.join(', ')}`);
      }
    });
    
    return resumen.length > 0 ? resumen.join(' | ') : '';
  };

  // Función para generar resumen de horarios seleccionados por día (desde formData)
  const getResumenHorarios = (): string => {
    return generarResumenHorarios(formData.horasEspecificas);
  };

  // Función para generar resumen desde un mensaje
  const getResumenHorariosFromMensaje = (mensaje: MensajeMarketing): string => {
    return generarResumenHorarios(mensaje.horasEspecificas);
  };

  // Función para convertir estructura antigua (por día) a nueva (por hora)
  const convertirEstructuraAntigua = (horasEspecificas: any): {[hora: string]: string[]} => {
    if (!horasEspecificas) return {};
    
    // Si ya está en formato nuevo (las claves son horas como "08:00"), devolverlo
    const primeraClave = Object.keys(horasEspecificas)[0];
    if (primeraClave && primeraClave.includes(':')) {
      return horasEspecificas;
    }
    
    // Convertir de estructura antigua (por día) a nueva (por hora)
    const nuevaEstructura: {[hora: string]: string[]} = {};
    Object.entries(horasEspecificas).forEach(([dia, horas]: [string, any]) => {
      if (Array.isArray(horas)) {
        horas.forEach((hora: string) => {
          if (!nuevaEstructura[hora]) {
            nuevaEstructura[hora] = [];
          }
          if (!nuevaEstructura[hora].includes(dia)) {
            nuevaEstructura[hora].push(dia);
          }
        });
      }
    });
    // Ordenar días en cada hora
    Object.keys(nuevaEstructura).forEach(hora => {
      nuevaEstructura[hora] = ordenarDias(nuevaEstructura[hora]);
    });
    return nuevaEstructura;
  };

  // Función para inicializar horarios desde formData
  const inicializarHorarios = (): {[hora: string]: string[]} => {
    // Si hay horas específicas guardadas, convertir a nueva estructura si es necesario
    if (formData.horasEspecificas && Object.keys(formData.horasEspecificas).length > 0) {
      return convertirEstructuraAntigua(formData.horasEspecificas);
    }
    
    // Si no hay horas específicas, devolver objeto vacío
    return {};
  };

  // Función para mapear respuesta del calendario
  const mapCalendarioResponse = (response: any): MensajeCalendario => {
    const mapeado = {
      id: response.id || 0,
      titulo: response.titulo || '',
      diasActivos: Array.isArray(response.diasActivos) ? response.diasActivos : [],
      horasEspecificas: parseHorasEspecificas(response.horasEspecificas)
    };
    console.log('🔍 [MarketingMensajes] Mapeando mensaje:', response, '→', mapeado);
    return mapeado;
  };

  const getMensajesPorHora = (dia: string, hora: string) => {
    // Usar mensajesCalendario para el calendario (más eficiente)
    return mensajesCalendario.filter(m => {
      // Verificar que el día esté en diasActivos
      const tieneDia = m.diasActivos && m.diasActivos.includes(dia);
      
      if (!tieneDia) return false;
      
      // Si hay horas específicas definidas, usar esas (estructura: {[hora]: [dias]})
      if (m.horasEspecificas && m.horasEspecificas[hora]) {
        return m.horasEspecificas[hora].includes(dia);
      }
      
      // Si no hay horas específicas, no mostrar el mensaje
      return false;
    });
  };


  // Función para mapear respuesta del backend a la interfaz del frontend
  const mapMensajeResponse = (response: any): MensajeMarketing => {
    return {
      id: response.id || 0,
      titulo: response.titulo || '',
      mensaje: response.mensaje || '',
      modo: response.modo || '',
      tipo: response.tipo || 'ninguna',
      archivo: response.archivo,
      comentarioImagen: response.comentarioImagen || '',
      whatsapp: response.whatsapp || false,
      yandex: response.yandex || false,
      diasActivos: response.diasActivos || [],
      horasEspecificas: parseHorasEspecificas(response.horasEspecificas),
      grupos: response.grupos || [],
      flotas: response.flotas || [],
      activo: response.activo !== undefined ? response.activo : true,
      createdAt: response.createdAt || new Date().toISOString(),
      updatedAt: response.updatedAt || new Date().toISOString()
    };
  };

  // Cargar solo el calendario (optimizado)
  const fetchCalendario = async () => {
    try {
      console.log('🔄 [MarketingMensajes] Cargando mensajes del calendario...');
      const calendarioRes = await api.get('/marketing-mensajes/calendario');
      const calendarioData = calendarioRes.data || [];
      console.log('📦 [MarketingMensajes] Datos recibidos del calendario:', calendarioData);
      const mensajesCalendarioMapeados: MensajeCalendario[] = calendarioData.map(mapCalendarioResponse);
      console.log('🗺️ [MarketingMensajes] Mensajes mapeados:', mensajesCalendarioMapeados);
      setMensajesCalendario(mensajesCalendarioMapeados);
      console.log(`✅ [MarketingMensajes] ${mensajesCalendarioMapeados.length} mensajes para calendario cargados`);
    } catch (error: any) {
      handleFetchError(error, 'Error al cargar los mensajes del calendario', () => setMensajesCalendario([]));
    }
  };

  // Cargar mensajes completos para la lista (solo cuando se necesite)
  const fetchMensajesCompletos = async () => {
    try {
      console.log('🔄 [MarketingMensajes] Cargando mensajes completos...');
      const mensajesRes = await api.get('/marketing-mensajes');
      const mensajesData = mensajesRes.data || [];
      const mensajesMapeados: MensajeMarketing[] = mensajesData.map(mapMensajeResponse);
      setMensajes(mensajesMapeados);
      console.log(`✅ [MarketingMensajes] ${mensajesMapeados.length} mensajes completos cargados`);
    } catch (error: any) {
      handleFetchError(error, 'Error al cargar los mensajes', () => setMensajes([]));
    }
  };

  // Handlers
  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('🔄 [MarketingMensajes] Inicializando datos del módulo...');
      
      // Solo cargar calendario al inicio (optimizado)
      await fetchCalendario();
      
      // Obtener flotas desde la API
      try {
        const flotasRes = await api.get('/marketing-mensajes/flotas');
        const flotasMapeadas: Flota[] = (flotasRes.data || []).map((flota: any) => ({
          id: flota.id || '',
          nombre: flota.name || '',
          ubicacion: flota.city || ''
        }));
        setFlotas(flotasMapeadas);
        console.log(`✅ [MarketingMensajes] ${flotasMapeadas.length} flotas cargadas`);
      } catch (error: any) {
        handleFetchError(error, 'Error al cargar las flotas', () => setFlotas([]));
      }
      
      // Obtener grupos desde la API
      try {
        const gruposRes = await api.get('/marketing-mensajes/grupos', { timeout: 0 });
        const gruposMapeados: Grupo[] = (gruposRes.data || []).map((grupo: any) => ({
          id: grupo.id || '',
          subject: grupo.subject || ''
        }));
        setGrupos(gruposMapeados);
        console.log(`✅ [MarketingMensajes] ${gruposMapeados.length} grupos cargados`);
      } catch (error: any) {
        handleFetchError(error, 'Error al cargar los grupos', () => setGrupos([]));
      }
      
      console.log('✅ [MarketingMensajes] Inicialización completada');
    } catch (error) {
      console.error('❌ [MarketingMensajes] Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Función auxiliar para mapear histórico
  const mapHistoricoResponse = (item: any): HistoricoProgramacion => ({
    id: item.id || 0,
    mensaje_id: item.mensajeId || item.mensaje_id || 0,
    mensaje_titulo: item.mensajeTitulo || item.mensaje_titulo || '',
    accion: item.accion || 'CREADO',
    fecha_programada: item.fechaProgramada || item.fecha_programada,
    fecha_ejecucion: item.fechaEjecucion || item.fecha_ejecucion,
    canal: item.canal || '',
    destinatarios_count: item.destinatariosCount || item.destinatarios_count,
    exitoso: item.exitoso,
    error_message: item.errorMessage || item.error_message,
    created_at: item.createdAt || item.created_at || new Date().toISOString(),
    created_by: item.createdBy || item.created_by
  });

  const fetchHistorico = async () => {
    try {
      setLoadingHistorico(true);
      const historicoRes = await api.get('/marketing-mensajes/historico');
      const historicoMapeado: HistoricoProgramacion[] = (historicoRes.data || []).map(mapHistoricoResponse);
      setHistorico(historicoMapeado);
    } catch (error: any) {
      handleFetchError(error, 'Error al cargar el histórico', () => setHistorico([]));
    } finally {
      setLoadingHistorico(false);
    }
  };

  // Función auxiliar para construir FormData desde formData
  const buildFormData = (): FormData => {
    const formDataToSend = new FormData();
    
    // Campos básicos
    formDataToSend.append('titulo', formData.titulo?.trim() || '');
    formDataToSend.append('mensaje', formData.mensaje?.trim() || '');
    if (formData.modo) formDataToSend.append('modo', formData.modo);
    formDataToSend.append('tipo', formData.tipo || 'ninguna');
    formDataToSend.append('whatsapp', String(formData.whatsapp || false));
    formDataToSend.append('yandex', String(formData.yandex || false));
    formDataToSend.append('activo', String(formData.activo !== undefined ? formData.activo : true));
    
    // Archivo
    if (selectedFile) {
      formDataToSend.append('file', selectedFile);
    }
    
    // Arrays
    appendArrayToFormData(formDataToSend, 'diasActivos', formData.diasActivos);
    appendArrayToFormData(formDataToSend, 'grupos', formData.grupos);
    appendArrayToFormData(formDataToSend, 'flotas', formData.flotas);
    
    // Horas específicas como JSON
    if (formData.horasEspecificas) {
      formDataToSend.append('horasEspecificas', JSON.stringify(formData.horasEspecificas));
    }
    
    // Comentario de imagen
    if (formData.comentarioImagen) {
      formDataToSend.append('comentarioImagen', formData.comentarioImagen);
    }
    
    return formDataToSend;
  };

  const handleSave = async () => {
    try {
      setValidationError(null);
      
      // Validar formulario
      const validationError = validateFormData();
      if (validationError) {
        setValidationError(validationError);
        return;
      }

      // Construir FormData
      const formDataToSend = buildFormData();

      let response;
      if (editingMensaje && !isViewModalCreating) {
        // Actualizar mensaje existente
        // El interceptor de axios eliminará automáticamente Content-Type cuando detecte FormData
        response = await api.put(`/marketing-mensajes/${editingMensaje.id}`, formDataToSend);
      } else {
        // Crear nuevo mensaje
        // El interceptor de axios eliminará automáticamente Content-Type cuando detecte FormData
        response = await api.post('/marketing-mensajes', formDataToSend);
      }

      // Verificar si hay error en la respuesta
      if (hasResponseError(response)) {
        setValidationError(response.data?.mensajeOperacion || 'Error al guardar el mensaje');
        return;
      }

      // Limpiar error de validación al tener éxito
      setValidationError(null);

      // Mapear y actualizar el estado
      const mensajeActualizado = mapMensajeResponse(response.data);
      const isUpdating = editingMensaje && !isViewModalCreating;
      
      if (isUpdating && editingMensaje) {
        setMensajes(mensajes.map(m => 
          m.id === editingMensaje.id ? mensajeActualizado : m
        ));
      } else {
        setMensajes([...mensajes, mensajeActualizado]);
      }
      
      // Cerrar el modal y resetear estados
      closeModalAndReset();
      
      // Recargar datos después de guardar
      await reloadDataAfterOperation();
    } catch (error: any) {
      console.error('Error saving mensaje:', error);
      showError(getErrorMessage(error, 'Error al guardar el mensaje'));
    }
  };

  const handleOpenModal = () => {
    resetForm();
    setActiveModalTab('basico');
    setIsViewModalCreating(true);
    setIsViewModalEditing(true);
    setMensajeToView(null);
    setEditingMensaje(null);
    setIsViewModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
      
      setFormData({ ...formData, archivo: file.name });
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setFormData({ ...formData, archivo: undefined, comentarioImagen: '' });
  };

  const handleDeleteClick = (mensaje: MensajeMarketing) => {
    setMensajeToDelete(mensaje);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!mensajeToDelete) return;

    try {
      setDeleting(true);
      await api.delete(`/marketing-mensajes/${mensajeToDelete.id}`);
      
      setMensajes(mensajes.filter(m => m.id !== mensajeToDelete.id));
      
      // Recargar datos después de eliminar
      await reloadDataAfterOperation();
      
      setIsDeleteModalOpen(false);
      setMensajeToDelete(null);
    } catch (error: any) {
      console.error('Error deleting mensaje:', error);
      showError(getErrorMessage(error, 'Error al eliminar el mensaje'));
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
    setMensajeToDelete(null);
  };

  // Función auxiliar para extraer mensaje de error de una respuesta
  const getErrorMessage = (error: any, defaultMessage: string): string => {
    return error.response?.data?.mensajeOperacion 
      || error.response?.data?.message 
      || defaultMessage;
  };

  // Función auxiliar para verificar si una respuesta tiene error
  const hasResponseError = (response: any): boolean => {
    return response.status >= 400 || response.data?.mensajeOperacion?.includes('Error');
  };

  // Función auxiliar para cerrar el modal y resetear estados
  const closeModalAndReset = () => {
    setIsViewModalOpen(false);
    setIsViewModalEditing(false);
    setIsViewModalCreating(false);
    setMensajeToView(null);
    setEditingMensaje(null);
    resetForm();
  };

  // Función auxiliar para recargar datos después de operaciones
  const reloadDataAfterOperation = async () => {
    await fetchCalendario();
    if (activeTab === 'lista') {
      await fetchMensajesCompletos();
    }
  };

  // Función auxiliar para manejar errores de fetch de manera genérica
  const handleFetchError = (error: any, defaultMessage: string, setter: () => void) => {
    console.error(`❌ [MarketingMensajes] ${defaultMessage}:`, error);
    showError(getErrorMessage(error, defaultMessage));
    setter();
  };

  // Función auxiliar para cargar un mensaje por ID
  const loadMensajeById = async (id: number): Promise<MensajeMarketing | null> => {
    try {
      const response = await api.get(`/marketing-mensajes/${id}`);
      
      if (hasResponseError(response)) {
        showError(response.data?.mensajeOperacion || 'Error al cargar el mensaje');
        return null;
      }
      
      return mapMensajeResponse(response.data);
    } catch (error: any) {
      console.error('Error loading mensaje:', error);
      showError(getErrorMessage(error, 'Error al cargar el mensaje'));
      return null;
    }
  };

  // Función auxiliar para poblar el formData desde un mensaje
  const populateFormData = (mensaje: MensajeMarketing) => {
    setEditingMensaje(mensaje);
    setSelectedFile(null);
    setFilePreview(mensaje.archivo && isImageFile(mensaje.archivo) ? mensaje.archivo : null);
    setFormData({
      titulo: mensaje.titulo,
      mensaje: mensaje.mensaje,
      modo: mensaje.modo,
      tipo: mensaje.tipo,
      archivo: mensaje.archivo,
      comentarioImagen: mensaje.comentarioImagen || '',
      whatsapp: mensaje.whatsapp,
      yandex: mensaje.yandex,
      diasActivos: mensaje.diasActivos,
      horasEspecificas: mensaje.horasEspecificas,
      grupos: mensaje.grupos,
      flotas: mensaje.flotas,
      activo: mensaje.activo
    });
  };

  // Función auxiliar para abrir modal en modo edición
  const openModalForEdit = (mensaje: MensajeMarketing) => {
    populateFormData(mensaje);
    setActiveModalTab('basico');
    setIsViewModalEditing(true);
    setIsViewModalCreating(false);
    setMensajeToView(null);
    setIsViewModalOpen(true);
  };

  const handleViewEdit = () => {
    if (mensajeToView) {
      openModalForEdit(mensajeToView);
    }
  };

  const handleEditDirect = async (id: number) => {
    setLoadingMensaje(true);
    try {
      const mensaje = await loadMensajeById(id);
      if (mensaje) {
        openModalForEdit(mensaje);
      }
    } finally {
      setLoadingMensaje(false);
    }
  };

  const handleViewClose = () => {
    closeModalAndReset();
    setLoadingMensaje(false);
  };

  // Función genérica para toggle de arrays
  const toggleArrayItem = <T,>(key: keyof MensajeMarketing, item: T) => {
    const currentArray = (formData[key] as T[]) || [];
    setFormData({ 
      ...formData, 
      [key]: currentArray.includes(item)
        ? currentArray.filter(i => i !== item)
        : [...currentArray, item]
    } as Partial<MensajeMarketing>);
  };

  const toggleGrupo = (grupoId: string) => toggleArrayItem('grupos', grupoId);
  const toggleFlota = (flotaId: string) => toggleArrayItem('flotas', flotaId);

  // Effects - Cargar datos al inicializar el módulo
  useEffect(() => {
    // Cargar todos los datos automáticamente al entrar al módulo
    if (authState?.isAuthenticated) {
      fetchData();
    }
  }, [authState?.isAuthenticated]);

  // Cargar datos según la pestaña activa
  useEffect(() => {
    if (activeTab === 'historico') {
      fetchHistorico();
    } else if (activeTab === 'lista') {
      // Cargar mensajes completos solo cuando se va a la pestaña lista
      fetchMensajesCompletos();
    }
  }, [activeTab]);

  // Inicializar horarios seleccionados cuando se abre el modal
  useEffect(() => {
    if (isHorariosModalOpen) {
      const horariosIniciales = inicializarHorarios();
      setHorariosSeleccionados(horariosIniciales);
    }
  }, [isHorariosModalOpen, formData.horasEspecificas]);

  // Early returns
  if (!authState?.isAuthenticated) {
    return <AccessRestricted />;
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  // Configuración de pestañas
  const tabsConfig: TabItem<TabType>[] = [
    {
      id: 'programacion',
      label: 'Programación',
      icon: <Calendar className="h-4 w-4 inline mr-2" />,
      showActionButton: true
    },
    {
      id: 'lista',
      label: 'Lista',
      icon: <FileText className="h-4 w-4 inline mr-2" />,
      showActionButton: true
    },
    {
      id: 'historico',
      label: 'Histórico',
      icon: <History className="h-4 w-4 inline mr-2" />
    }
  ];

  const actionButton = (
    <Button 
      onClick={handleOpenModal}
      variant="primary"
      leftIcon={<Plus className="h-4 w-4" />}
    >
      Nuevo Mensaje
    </Button>
  );

  const renderProgramacionView = () => (
    <div className="h-[calc(100vh-12rem)]">
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
                  {DIAS_SEMANA.map(dia => (
                    <th key={dia} className="border border-neutral-200 dark:border-neutral-700 p-2 text-center text-sm font-medium">
                      {dia}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HORAS.map(hora => (
                  <tr key={hora}>
                    <td className="border border-neutral-200 dark:border-neutral-700 p-2 text-sm text-neutral-600 dark:text-neutral-400">
                      {hora}
                    </td>
                    {DIAS_SEMANA.map(dia => {
                      const mensajesEnSlot = getMensajesPorHora(dia, hora);
                      return (
                        <td 
                          key={`${dia}-${hora}`}
                          className="border border-neutral-200 dark:border-neutral-700 p-2"
                        >
                          {mensajesEnSlot.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {mensajesEnSlot.map(m => (
                                <div
                                  key={m.id}
                                  className="bg-primary-500 hover:bg-primary-600 text-white text-[10px] px-1.5 py-1.5 rounded-md cursor-pointer transition-all shadow-sm flex items-center justify-center text-center w-14 h-14 aspect-square"
                                  onClick={() => handleEditDirect(m.id)}
                                  title={m.titulo}
                                >
                                  <span className="line-clamp-2 leading-tight break-words">
                                    {m.titulo.length > 10 ? m.titulo.substring(0, 10) + '...' : m.titulo}
                                  </span>
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
  );

  const renderListaView = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Lista de Mensajes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mensajes.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mx-auto" />}
              message="No hay mensajes creados"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-700">
                    <th className="text-left p-3 text-sm font-medium">Título</th>
                    <th className="text-left p-3 text-sm font-medium">Mensaje</th>
                    <th className="text-left p-3 text-sm font-medium">Modo</th>
                    <th className="text-left p-3 text-sm font-medium">Tipo</th>
                    <th className="text-left p-3 text-sm font-medium">Archivo/Imagen y Canales</th>
                    <th className="text-left p-3 text-sm font-medium">Días Activos</th>
                    <th className="text-left p-3 text-sm font-medium">Horario</th>
                    <th className="text-left p-3 text-sm font-medium">Creado</th>
                    <th className="text-left p-3 text-sm font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {mensajes.map((mensaje) => (
                    <tr 
                      key={mensaje.id} 
                      className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                    >
                      <td className="p-3 text-sm font-medium">{mensaje.titulo}</td>
                      <td className="p-3 text-sm text-neutral-600 dark:text-neutral-400 max-w-xs truncate">
                        {mensaje.mensaje}
                      </td>
                      <td className="p-3 text-sm">
                        <Badge label={mensaje.modo} variant="info" />
                      </td>
                      <td className="p-3 text-sm">
                        <Badge label={mensaje.tipo} variant="purple" />
                      </td>
                      <td className="p-3 text-sm">
                        <div className="flex items-center gap-4">
                          {mensaje.archivo ? (
                            <FilePreview 
                              archivo={mensaje.archivo} 
                              filePreview={mensaje.archivo}
                              size="sm"
                            />
                          ) : (
                            <span className="text-xs text-neutral-400">-</span>
                          )}
                          
                          {(mensaje.archivo && (mensaje.whatsapp || mensaje.yandex)) && (
                            <div className="w-px h-6 bg-neutral-300 dark:bg-neutral-600"></div>
                          )}
                          
                          <div className="flex gap-2 flex-wrap">
                            {mensaje.whatsapp && <Badge label="WhatsApp" variant="success" />}
                            {mensaje.yandex && <Badge label="Yandex" variant="warning" />}
                            {!mensaje.whatsapp && !mensaje.yandex && !mensaje.archivo && (
                              <span className="text-xs text-neutral-400">-</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {mensaje.diasActivos.length > 0 ? (
                            mensaje.diasActivos.map(dia => (
                              <span 
                                key={dia}
                                className="px-1 py-0.5 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded text-[10px] font-medium"
                              >
                                {dia}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-neutral-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-sm">
                        {mensaje.horasEspecificas && Object.keys(mensaje.horasEspecificas).length > 0 ? (
                          <HorariosPopoverCell
                            mensaje={mensaje}
                            isOpen={horariosPopoverOpen === mensaje.id}
                            onToggle={() => setHorariosPopoverOpen(horariosPopoverOpen === mensaje.id ? null : mensaje.id)}
                            onClose={() => setHorariosPopoverOpen(null)}
                          />
                        ) : (
                          <span className="text-xs text-neutral-400">Sin horarios</span>
                        )}
                      </td>
                      <td className="p-3 text-sm text-neutral-600 dark:text-neutral-400">
                        {new Date(mensaje.createdAt).toLocaleDateString('es-PE')}
                      </td>
                      <td className="p-3 text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditDirect(mensaje.id);
                            }}
                            className="p-1.5 rounded hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-600 hover:text-primary-700 transition-colors"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(mensaje);
                            }}
                            className="p-1.5 rounded hover:bg-error-50 dark:hover:bg-error-900/20 text-error-600 hover:text-error-700 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
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
  );


  const renderHistoricoView = () => (
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
              <LoadingSpinner />
            </div>
          ) : historico.length === 0 ? (
            <EmptyState
              icon={<History className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mx-auto" />}
              message="No hay registros en el histórico"
            />
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
                        <Badge 
                          label={item.accion} 
                          variant={
                            item.accion === 'ENVIADO' ? 'success' :
                            item.accion === 'CREADO' ? 'info' :
                            item.accion === 'ACTUALIZADO' ? 'warning' :
                            item.accion === 'CANCELADO' ? 'error' : 'error'
                          }
                        />
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
  );

  // Configuración de pestañas del modal
  const modalTabsConfig: TabItem<'basico' | 'destinatarios'>[] = [
    {
      id: 'basico',
      label: 'Básico',
      icon: <FileText className="h-4 w-4 inline mr-2" />
    },
    {
      id: 'destinatarios',
      label: 'Destinatarios',
      icon: <Users className="h-4 w-4 inline mr-2" />
    }
  ];

  const renderModalTabContent = () => {
    switch (activeModalTab) {
      case 'basico':
        return (
          <div className="space-y-4 pt-0">
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
                  value={formData.modo || ''} 
                  onValueChange={(value) => setFormData({ ...formData, modo: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {OPCIONES_MODO.map(opcion => (
                      <SelectItem key={opcion} value={opcion}>{opcion}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <Select 
                  value={formData.tipo} 
                  onValueChange={(value) => {
                    // Si se cambia a "ninguna", limpiar el archivo
                    if (value === 'ninguna') {
                      setSelectedFile(null);
                      setFilePreview(null);
                      setFormData({ ...formData, tipo: value, archivo: undefined, comentarioImagen: '' });
                    } else {
                      setFormData({ ...formData, tipo: value });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPCIONES_TIPO.map(opcion => (
                      <SelectItem key={opcion} value={opcion}>{opcion}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Archivo/Imagen</label>
                {formData.tipo === 'ninguna' ? (
                  <div className="border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-lg p-4 text-center bg-neutral-50 dark:bg-neutral-900/50 opacity-50">
                    <Upload className="h-6 w-6 text-neutral-400 mx-auto mb-2" />
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      Campo deshabilitado (tipo: ninguna)
                    </span>
                  </div>
                ) : !selectedFile && !filePreview && !formData.archivo ? (
                  <div className={`border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg p-4 text-center transition-colors ${
                    formData.tipo !== 'ninguna' ? 'hover:border-primary-500 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                  }`}>
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      accept={
                        formData.tipo === 'imagen' ? 'image/*' :
                        formData.tipo === 'pdf' ? '.pdf' :
                        formData.tipo === 'video' ? 'video/*' :
                        formData.tipo === 'audio' ? 'audio/*' :
                        'image/*,.pdf,.doc,.docx'
                      }
                      onChange={handleFileChange}
                      disabled={formData.tipo === 'ninguna'}
                    />
                    <label
                      htmlFor="file-upload"
                      className={`flex flex-col items-center gap-2 ${
                        formData.tipo !== 'ninguna' ? 'cursor-pointer' : 'cursor-not-allowed'
                      }`}
                    >
                      <Upload className="h-6 w-6 text-neutral-400" />
                      <span className="text-xs text-neutral-600 dark:text-neutral-400">
                        Haz clic para subir
                      </span>
                      <span className="text-[10px] text-neutral-500">
                        {formData.tipo === 'imagen' ? 'Imágenes' :
                         formData.tipo === 'pdf' ? 'PDF' :
                         formData.tipo === 'video' ? 'Videos' :
                         formData.tipo === 'audio' ? 'Audio' :
                         'Imágenes, PDF, DOC, DOCX'}
                      </span>
                    </label>
                  </div>
                ) : null}
                
                {(selectedFile || filePreview || formData.archivo) && formData.tipo !== 'ninguna' && (
                  <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3">
                    <div className="flex items-start gap-3">
                      {(filePreview || formData.archivo) && isImageFile(filePreview || formData.archivo) ? (
                        <div className="flex-shrink-0">
                          <img
                            src={getImageUrl(filePreview || formData.archivo)}
                            alt="Preview"
                            className="w-16 h-16 object-cover rounded-lg border border-neutral-200 dark:border-neutral-700"
                            onError={(e) => {
                              // Si la imagen falla al cargar, mostrar icono de archivo
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="flex-shrink-0 w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
                          <FileText className="h-6 w-6 text-neutral-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {filePreview && isImageFile(filePreview) ? (
                            <ImageIcon className="h-3 w-3 text-primary-500" />
                          ) : (
                            <FileText className="h-3 w-3 text-primary-500" />
                          )}
                          <span className="text-xs font-medium truncate">
                            {selectedFile?.name || formData.archivo || 'Archivo'}
                          </span>
                        </div>
                        {selectedFile && (
                          <p className="text-[10px] text-neutral-500">
                            {(selectedFile.size / 1024).toFixed(2)} KB
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="flex-shrink-0 p-1 rounded hover:bg-error-50 dark:hover:bg-error-900/20 text-error-600 hover:text-error-700 transition-colors"
                        title="Eliminar archivo"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    {!selectedFile && (
                      <div className="mt-2">
                        <input
                          type="file"
                          id="file-replace"
                          className="hidden"
                          accept={
                            formData.tipo === 'imagen' ? 'image/*' :
                            formData.tipo === 'pdf' ? '.pdf' :
                            formData.tipo === 'video' ? 'video/*' :
                            formData.tipo === 'audio' ? 'audio/*' :
                            'image/*,.pdf,.doc,.docx'
                          }
                          onChange={handleFileChange}
                          disabled={formData.tipo === 'ninguna'}
                        />
                        <label
                          htmlFor="file-replace"
                          className="inline-flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 cursor-pointer"
                        >
                          <Upload className="h-3 w-3" />
                          Reemplazar
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Canales</label>
                <div className="flex gap-6 pt-3">
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
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Horarios</label>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsHorariosModalOpen(true);
                }}
                className="w-full"
                leftIcon={<Clock className="h-4 w-4" />}
              >
                Elegir horario
              </Button>
              {(() => {
                const resumen = getResumenHorarios();
                return resumen ? (
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 p-2 bg-neutral-50 dark:bg-neutral-800/50 rounded border border-neutral-200 dark:border-neutral-700">
                    <span className="font-medium">Horarios seleccionados:</span><br />
                    {resumen}
                  </p>
                ) : null;
              })()}
            </div>

            {/* Mensaje de error de validación */}
            {validationError && (
              <div className="mt-4 p-3 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-error-600 dark:text-error-400" />
                  <p className="text-sm text-error-600 dark:text-error-400">{validationError}</p>
                </div>
              </div>
            )}
          </div>
        );

      case 'destinatarios':
        return (
          <div className="space-y-4 ">
            <div className="grid grid-cols-2 gap-4">
              {/* Grupos */}
              <div>
                <label className="block text-sm font-medium mb-2">Grupos y Comunidad</label>
                <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 max-h-96 overflow-y-auto">
                  {grupos.length === 0 ? (
                    <p className="text-xs text-neutral-500">No hay grupos disponibles</p>
                  ) : (
                    <div className="space-y-2">
                      {grupos.map(grupo => (
                        <DestinatarioCheckbox
                          key={grupo.id}
                          label={grupo.subject}
                          checked={formData.grupos?.includes(grupo.id) || false}
                          onChange={() => toggleGrupo(grupo.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Flotas */}
              <div>
                <label className="block text-sm font-medium mb-2">Fleet Yego</label>
                <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 max-h-96 overflow-y-auto">
                  {flotas.length === 0 ? (
                    <p className="text-xs text-neutral-500">No hay flotas disponibles</p>
                  ) : (
                    <div className="space-y-2">
                      {flotas.map(flota => (
                        <DestinatarioCheckbox
                          key={flota.id}
                          label={flota.nombre}
                          sublabel={flota.ubicacion}
                          checked={formData.flotas?.includes(flota.id) || false}
                          onChange={() => toggleFlota(flota.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderViewModal = () => (
    <Dialog open={isViewModalOpen} onOpenChange={handleViewClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isViewModalEditing ? (
              <>
                <Save className="h-5 w-5" />
                {isViewModalCreating ? 'Nuevo Mensaje' : 'Editar Mensaje'}
              </>
            ) : (
              <>
                <Eye className="h-5 w-5" />
                Detalles del Mensaje
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isViewModalEditing 
              ? (isViewModalCreating 
                  ? 'Completa el formulario para crear un nuevo mensaje de marketing'
                  : 'Modifica los datos del mensaje de marketing')
              : 'Información completa del mensaje de marketing'}
          </DialogDescription>
        </DialogHeader>
        
        {loadingMensaje && !isViewModalCreating ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-neutral-600 dark:text-neutral-400">Cargando mensaje...</p>
            </div>
          </div>
        ) : isViewModalEditing ? (
          <>
            <Tabs
              tabs={modalTabsConfig}
              activeTab={activeModalTab}
              onTabChange={setActiveModalTab}
              className="mb-4"
            />
            
            <div className="mt-0">
              {renderModalTabContent()}
            </div>
            
            <DialogFooter className="mt-4">
              <Button 
                variant="primary"
                onClick={handleSave}
                leftIcon={<Save className="h-4 w-4" />}
                disabled={loadingMensaje}
              >
                {isViewModalCreating ? 'Guardar' : 'Actualizar'}
              </Button>
            </DialogFooter>
          </>
        ) : mensajeToView && (
          <div className="space-y-4 py-4">
            {/* Información básica */}
            <div className="space-y-3">
              <div>
                <label className={CSS_CLASSES.label}>
                  Título
                </label>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mt-1">
                  {mensajeToView.titulo}
                </p>
              </div>
              
              <div>
                <label className={CSS_CLASSES.label}>
                  Mensaje
                </label>
                <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-1 whitespace-pre-wrap">
                  {mensajeToView.mensaje}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={CSS_CLASSES.label}>
                    Modo
                  </label>
                  <div className="mt-1">
                    <Badge label={mensajeToView.modo} variant="info" />
                  </div>
                </div>
                
                <div>
                  <label className={CSS_CLASSES.label}>
                    Tipo
                  </label>
                  <div className="mt-1">
                    <Badge label={mensajeToView.tipo} variant="purple" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Archivo/Imagen */}
            {mensajeToView.archivo && (
              <div>
                <label className={CSS_CLASSES.label}>
                  Archivo/Imagen
                </label>
                <div className="mt-1">
                  <FilePreview 
                    archivo={mensajeToView.archivo} 
                    filePreview={mensajeToView.archivo}
                    size="md"
                  />
                </div>
              </div>
            )}
            
            {/* Canales */}
            <div>
              <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                Canales
              </label>
              <div className="flex gap-2 mt-1">
                {mensajeToView.whatsapp && <Badge label="WhatsApp" variant="success" />}
                {mensajeToView.yandex && <Badge label="Yandex" variant="warning" />}
                {!mensajeToView.whatsapp && !mensajeToView.yandex && (
                  <span className="text-xs text-neutral-400">Ningún canal seleccionado</span>
                )}
              </div>
            </div>
            
            {/* Días activos */}
            <div>
              <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                Días Activos
              </label>
              <div className="flex flex-wrap gap-1 mt-1">
                {mensajeToView.diasActivos && mensajeToView.diasActivos.length > 0 ? (
                  mensajeToView.diasActivos.map(dia => (
                    <span 
                      key={dia}
                      className="px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded text-xs font-medium"
                    >
                      {dia}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-neutral-400">No hay días seleccionados</span>
                )}
              </div>
            </div>
            
            {/* Horario */}
              <div>
                <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                  Horario
                </label>
                <div className="mt-1">
                  {mensajeToView.horasEspecificas && Object.keys(mensajeToView.horasEspecificas).length > 0 ? (
                    <div className="flex items-center gap-1 text-sm text-neutral-700 dark:text-neutral-300">
                      <Clock className="h-4 w-4" />
                      <span className="text-xs">{getResumenHorariosFromMensaje(mensajeToView)}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-neutral-400">Sin horarios</span>
                  )}
                </div>
              </div>
            
            {/* Destinatarios */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                  Grupos
                </label>
                <div className="mt-1">
                  {mensajeToView.grupos && mensajeToView.grupos.length > 0 ? (
                    <div className="space-y-1">
                      {mensajeToView.grupos.map(grupoId => {
                        const grupo = grupos.find(g => g.id === grupoId);
                        return (
                          <span key={grupoId} className="block text-xs text-neutral-600 dark:text-neutral-400">
                            {grupo ? grupo.subject : grupoId}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-xs text-neutral-400">Ningún grupo seleccionado</span>
                  )}
                </div>
              </div>
              
              <div>
                <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                  Flotas
                </label>
                <div className="mt-1">
                  {mensajeToView.flotas && mensajeToView.flotas.length > 0 ? (
                    <div className="space-y-1">
                      {mensajeToView.flotas.map(flotaId => {
                        const flota = flotas.find(f => f.id === flotaId);
                        return (
                          <span key={flotaId} className="block text-xs text-neutral-600 dark:text-neutral-400">
                            {flota ? flota.nombre : flotaId}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-xs text-neutral-400">Ninguna flota seleccionada</span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Estado y fechas */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-neutral-200 dark:border-neutral-700">
              <div>
                <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                  Estado
                </label>
                <div className="mt-1">
                  <Badge 
                    label={mensajeToView.activo ? 'Activo' : 'Inactivo'} 
                    variant={mensajeToView.activo ? 'success' : 'error'} 
                  />
                </div>
              </div>
              
              <div>
                <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                  Creado
                </label>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                  {new Date(mensajeToView.createdAt).toLocaleString('es-PE')}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {!isViewModalEditing && mensajeToView && (
          <DialogFooter>
            <Button 
              variant="secondary" 
              onClick={handleViewClose}
              leftIcon={<X className="h-4 w-4" />}
            >
              Cerrar
            </Button>
            <Button 
              variant="primary"
              onClick={handleViewEdit}
              leftIcon={<Save className="h-4 w-4" />}
            >
              Editar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );

  const renderHorariosModal = () => {

    const handleGuardarHorarios = () => {
      // Obtener todos los días únicos que tienen horarios seleccionados
      const diasConHorariosSet = new Set<string>();
      
      // Recopilar todos los días de la nueva estructura {[hora]: [dias]}
      Object.entries(horariosSeleccionados).forEach(([, dias]) => {
        if (dias && dias.length > 0) {
          dias.forEach(dia => diasConHorariosSet.add(dia));
        }
      });

      const diasConHorarios = Array.from(diasConHorariosSet).sort((a, b) => {
        const ordenDias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        return ordenDias.indexOf(a) - ordenDias.indexOf(b);
      });

      if (diasConHorarios.length > 0 && Object.keys(horariosSeleccionados).length > 0) {
        setFormData({
          ...formData,
          diasActivos: diasConHorarios,
          horasEspecificas: horariosSeleccionados // Guardar las horas específicas en formato {[hora]: [dias]}
        });
        setValidationError(null);
      }
      
      setIsHorariosModalOpen(false);
    };

    return (
      <Dialog open={isHorariosModalOpen} onOpenChange={setIsHorariosModalOpen}>
        <DialogContent 
          className="max-h-[90vh] overflow-hidden flex flex-col"
          style={{ maxWidth: GRID_CONFIG.getModalWidth(DIAS_SEMANA.length), width: GRID_CONFIG.getModalWidth(DIAS_SEMANA.length) }}
        >
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Seleccionar Horarios
            </DialogTitle>
            <DialogDescription>
              Haz clic en las celdas para seleccionar los horarios en los que quieres que aparezca el mensaje
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex-1 overflow-auto">
            {/* Cuadrícula de horarios */}
            <div className="overflow-auto border border-neutral-200 dark:border-neutral-700 rounded-lg">
              <div className="inline-block" style={{ width: `${60 + (DIAS_SEMANA.length * 100)}px` }}>
                {/* Encabezado con días */}
                <div className={`grid ${CSS_CLASSES.gridBorder}`} style={{ gridTemplateColumns: GRID_CONFIG.getGridColumns(DIAS_SEMANA.length) }}>
                  <div className={`${CSS_CLASSES.headerCell}`}>
                    Horas
                  </div>
                  {DIAS_SEMANA.map(dia => (
                    <div key={dia} className={`${CSS_CLASSES.headerCell} text-center last:border-r-0`}>
                      {dia}
                    </div>
                  ))}
                </div>

                {/* Filas de horas */}
                {HORAS.map(hora => (
                  <div 
                    key={hora} 
                    className={`grid ${CSS_CLASSES.gridBorder}`} 
                    style={{ gridTemplateColumns: GRID_CONFIG.getGridColumns(DIAS_SEMANA.length) }}
                  >
                    <div className={CSS_CLASSES.hourCell}>
                      {hora}
                    </div>
                    {DIAS_SEMANA.map(dia => {
                      const diaPasado = isDiaPasado(dia);
                      const horaPasada = isHoraPasada(hora, dia);
                      const horaBase = hora.split(':')[0];
                      const bloqueado = diaPasado || horaPasada;
                      
                      // Verificar si hay horarios con minutos para esta hora y día
                      const horariosConMinutos = Object.keys(horariosSeleccionados).filter(h => {
                        const [horaH] = h.split(':');
                        return horaH === horaBase && horariosSeleccionados[h]?.includes(dia);
                      });
                      
                      // La celda está seleccionada si hay minutos seleccionados
                      const estaSeleccionadoHorario = horariosConMinutos.length > 0;
                      
                      return (
                        <div 
                          key={`${dia}-${hora}`}
                          className={`relative ${CSS_CLASSES.cellBorder}`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (!bloqueado) {
                                setMinutosModalOpen({ dia, hora });
                              }
                            }}
                            disabled={bloqueado}
                            className={`
                              ${CSS_CLASSES.buttonBase}
                              ${bloqueado 
                                ? CSS_CLASSES.buttonDisabled
                                : estaSeleccionadoHorario
                                ? CSS_CLASSES.buttonSelected
                                : CSS_CLASSES.buttonDefault
                              }
                            `}
                            title={bloqueado ? 'Horario no disponible' : 'Seleccionar minutos'}
                          >
                            {horariosConMinutos.length > 0 && (
                              <div className="flex flex-wrap gap-1 w-full mt-auto">
                                {horariosConMinutos.map(h => {
                                  const [, minuto] = h.split(':');
                                  return (
                                    <span 
                                      key={h}
                                      className={CSS_CLASSES.badgeMinuto}
                                    >
                                      {minuto}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Leyenda */}
            <div className="mt-4 flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-200 dark:bg-red-900/40 rounded"></div>
                <span>Seleccionado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-neutral-100 dark:bg-neutral-800 rounded"></div>
                <span>Disponible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-neutral-200 dark:bg-neutral-700 rounded opacity-30"></div>
                <span>Bloqueado</span>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 flex-shrink-0 border-t border-neutral-200 dark:border-neutral-700 pt-4">
            <Button
              variant="secondary"
              onClick={() => setIsHorariosModalOpen(false)}
              leftIcon={<X className="h-4 w-4" />}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleGuardarHorarios}
              leftIcon={<Save className="h-4 w-4" />}
            >
              Guardar Horarios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Modal para seleccionar minutos específicos
  const renderMinutosModal = () => {
    if (!minutosModalOpen) return null;
    
    const { dia, hora } = minutosModalOpen;
    const horaBase = hora.split(':')[0]; // Solo la hora sin minutos
    
    const toggleMinuto = (minuto: number) => {
      const horaCompleta = `${horaBase}:${minuto.toString().padStart(2, '0')}`;
      
      setHorariosSeleccionados(prev => {
        const nuevasSelecciones = { ...prev };
        
        // Si no existe la hora con minuto, crearla
        if (!nuevasSelecciones[horaCompleta]) {
          nuevasSelecciones[horaCompleta] = [];
        }
        
        const index = nuevasSelecciones[horaCompleta].indexOf(dia);
        if (index > -1) {
          // Quitar el día de esta hora con minuto
          nuevasSelecciones[horaCompleta] = nuevasSelecciones[horaCompleta].filter(d => d !== dia);
          // Si no quedan días, eliminar la hora con minuto
          if (nuevasSelecciones[horaCompleta].length === 0) {
            delete nuevasSelecciones[horaCompleta];
          }
        } else {
          // Agregar el día a esta hora con minuto
          nuevasSelecciones[horaCompleta] = ordenarDias([...nuevasSelecciones[horaCompleta], dia]);
        }
        
        return nuevasSelecciones;
      });
    };


    return (
      <Dialog open={!!minutosModalOpen} onOpenChange={() => setMinutosModalOpen(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Seleccionar Minutos - {dia} {horaBase}:00
            </DialogTitle>
            <DialogDescription>
              Selecciona los minutos específicos para este horario (cada 5 minutos)
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <div className="grid grid-cols-6 gap-2">
              {MINUTOS.map(minuto => {
                const horaCompleta = `${horaBase}:${minuto.toString().padStart(2, '0')}`;
                const estaSeleccionado = horariosSeleccionados[horaCompleta]?.includes(dia) || false;
                const horaPasada = isHoraPasada(horaCompleta, dia);
                
                return (
                  <button
                    key={minuto}
                    type="button"
                    onClick={() => toggleMinuto(minuto)}
                    disabled={horaPasada}
                    className={`
                      p-2 rounded-md text-sm transition-all
                      ${horaPasada
                        ? 'bg-neutral-100 dark:bg-neutral-800/30 opacity-40 cursor-not-allowed'
                        : estaSeleccionado
                        ? 'bg-primary-500 text-white hover:bg-primary-600'
                        : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                      }
                    `}
                    title={horaPasada ? 'Horario no disponible' : estaSeleccionado ? 'Deseleccionar' : 'Seleccionar'}
                  >
                    {minuto.toString().padStart(2, '0')}
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              variant="secondary"
              onClick={() => setMinutosModalOpen(null)}
              leftIcon={<X className="h-4 w-4" />}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const renderDeleteModal = () => (
    <Dialog open={isDeleteModalOpen} onOpenChange={handleDeleteCancel}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-error-600 dark:text-error-400">
            <AlertTriangle className="h-5 w-5" />
            Confirmar Eliminación
          </DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer. El mensaje será eliminado permanentemente.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
            ¿Estás seguro de que deseas eliminar el siguiente mensaje?
          </p>
          {mensajeToDelete && (
            <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-lg p-4 border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-10 h-10 bg-error-100 dark:bg-error-900/30 rounded-full flex items-center justify-center">
                    <FileText className="h-5 w-5 text-error-600 dark:text-error-400" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 mb-1">
                    {mensajeToDelete.titulo}
                  </p>
                  {mensajeToDelete.mensaje && (
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">
                      {mensajeToDelete.mensaje}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {mensajeToDelete.diasActivos && mensajeToDelete.diasActivos.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded">
                        {mensajeToDelete.diasActivos.length} día(s)
                      </span>
                    )}
                    {mensajeToDelete.horasEspecificas && Object.keys(mensajeToDelete.horasEspecificas).length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded" title={getResumenHorariosFromMensaje(mensajeToDelete)}>
                        {getResumenHorariosFromMensaje(mensajeToDelete)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button 
            variant="secondary" 
            onClick={handleDeleteCancel}
            leftIcon={<X className="h-4 w-4" />}
            disabled={deleting}
          >
            Cancelar
          </Button>
          <Button 
            variant="danger"
            onClick={handleDeleteConfirm}
            leftIcon={<Trash2 className="h-4 w-4" />}
            disabled={deleting}
          >
            {deleting ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Renderizar contenido según la pestaña activa
  const renderTabContent = () => {
    switch (activeTab) {
      case 'programacion':
        return renderProgramacionView();
      case 'lista':
        return renderListaView();
      case 'historico':
        return renderHistoricoView();
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <Tabs
        tabs={tabsConfig}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        actionButton={actionButton}
      />
      
      {renderTabContent()}
      
      {renderViewModal()}
      {renderDeleteModal()}
      {renderHorariosModal()}
      {renderMinutosModal()}
      
      {/* Contenedor de notificaciones toast */}
      <NotificationContainer 
        notifications={notifications} 
        onRemove={removeNotification} 
      />
    </div>
  );
};

export default MarketingMensajesModule;
