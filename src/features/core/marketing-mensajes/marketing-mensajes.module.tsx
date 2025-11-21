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
  Clock,
  Plus,
  X,
  Upload,
  Image as ImageIcon,
  AlertTriangle,
  Eye,
  Pencil,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
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
  modo: string;
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

type TabType = 'programacion' | 'lista';

// Constantes
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const ORDEN_DIAS = DIAS_SEMANA; // Mismo orden que DIAS_SEMANA

// Generar solo horas completas (00:00, 01:00, etc.)
const HORAS = Array.from({ length: 24 }, (_, i) => {
  const hora = i.toString().padStart(2, '0');
  return `${hora}:00`;
});

// Minutos disponibles (cada 5 minutos)
const MINUTOS = Array.from({ length: 12 }, (_, i) => i * 5);

const OPCIONES_MODO = ['auto', 'moto', 'carga', 'scouts'];
const OPCIONES_TIPO = ['image', 'video', 'document', 'ninguna'];

// Configuración de colores por modo
const COLORES_POR_MODO = {
  moto: {
    button: 'bg-blue-500 hover:bg-blue-600 text-white',
    badge: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
    legend: 'bg-blue-500'
  },
  auto: {
    button: 'bg-green-500 hover:bg-green-600 text-white',
    badge: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
    legend: 'bg-green-500'
  },
  carga: {
    button: 'bg-purple-500 hover:bg-purple-600 text-white',
    badge: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300',
    legend: 'bg-purple-500'
  },
  scouts: {
    button: 'bg-orange-500 hover:bg-orange-600 text-white',
    badge: 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300',
    legend: 'bg-orange-500'
  },
  default: {
    button: 'bg-primary-500 hover:bg-primary-600 text-white',
    badge: 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300',
    legend: 'bg-primary-500'
  }
} as const;

// Función unificada para obtener clases CSS según el modo y tipo
const getColorClassesByModo = (modo: string, type: 'button' | 'badge' = 'button'): string => {
  const modoKey = modo?.toLowerCase() as keyof typeof COLORES_POR_MODO;
  const config = COLORES_POR_MODO[modoKey] || COLORES_POR_MODO.default;
  return config[type];
};

// Función para obtener el accept string según el tipo de archivo
const getAcceptByTipo = (tipo?: string): string => {
  switch (tipo) {
    case 'image':
      return 'image/*';
    case 'document':
      return '.pdf,.doc,.docx';
    case 'video':
      return 'video/*';
    case 'audio':
      return 'audio/*';
    default:
      return 'image/*,.pdf,.doc,.docx';
  }
};

// Función para obtener el texto descriptivo según el tipo de archivo
const getTipoDescription = (tipo?: string): string => {
  switch (tipo) {
    case 'image':
      return 'Imágenes';
    case 'document':
      return 'Documentos (PDF, DOC, DOCX)';
    case 'video':
      return 'Videos';
    case 'audio':
      return 'Audio';
    default:
      return 'Archivos';
  }
};

// Función para extraer la hora base de una hora completa (ej: "11:00" -> "11", "11:15" -> "11")
const getHoraBase = (hora: string): string => {
  return hora.split(':')[0];
};

// Función para extraer el minuto de una hora completa (ej: "11:15" -> "15")
const getMinuto = (hora: string): string => {
  return hora.split(':')[1] || '00';
};

// Constantes para clases CSS comunes
const CSS_CLASSES = {
  label: 'text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide',
  labelForm: 'block text-sm font-medium mb-1',
  labelFormMb2: 'block text-sm font-medium mb-2',
  cellBorder: 'border-r border-neutral-200 dark:border-neutral-700 last:border-r-0',
  gridBorder: 'border-b border-neutral-200 dark:border-neutral-700 last:border-b-0',
  headerCell: 'text-sm font-semibold text-neutral-700 dark:text-neutral-300 px-2 py-2 bg-neutral-50 dark:bg-neutral-800/50 border-r border-neutral-200 dark:border-neutral-700',
  hourCell: 'text-sm text-neutral-700 dark:text-neutral-300 px-2 py-2 bg-neutral-50 dark:bg-neutral-800/50 border-r border-neutral-200 dark:border-neutral-700',
  buttonBase: 'w-full h-[70px] p-1 transition-all relative flex flex-col items-start justify-start',
  buttonSelected: 'bg-red-200 dark:bg-red-900/40 hover:bg-red-300 dark:hover:bg-red-900/60',
  buttonDefault: 'bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/50',
  badgeMinuto: 'text-xs px-1.5 py-1 bg-primary-600 text-white rounded font-medium'
};

// Constantes para grid
const GRID_CONFIG = {
  horasColumnWidth: '80px',
  diasColumnWidth: '70px',
  getGridColumns: (diasCount: number) => `80px repeat(${diasCount}, 1fr)`,
  getModalWidth: (diasCount: number) => {
    const gridWidth = 80 + (diasCount * 70);
    const padding = 48;
    return `${gridWidth + padding}px`;
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
// Componente de modal de carga profesional
const LoadingModal: React.FC = () => (
  <Dialog open={true}>
    <DialogContent className="sm:max-w-[425px] border-none shadow-2xl">
      <div className="flex flex-col items-center justify-center py-8 px-6">
        <div className="relative mb-6">
          <div className="w-16 h-16 border-4 border-primary-200 dark:border-primary-800 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
          Preparando todo para ti
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center max-w-sm">
          Estamos configurando todo para que funcione correctamente. Esto tomará solo unos segundos...
        </p>
        <div className="mt-6 w-full max-w-xs">
          <div className="h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <div className="h-full bg-primary-500 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
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
            className="fixed inset-0 z-40" 
            onClick={onClose}
          />
          {/* Card pequeño con todos los horarios - usando fixed para salir de la tabla */}
          <div 
            className="fixed z-50 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md shadow-xl p-2 max-h-48 overflow-y-auto w-auto min-w-[180px] max-w-[300px]"
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

const getImageUrl = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  if (url.startsWith('/')) {
    const apiBaseUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3030/api' : '/api');
    const baseUrl = apiBaseUrl.replace('/api', '');
    return `${baseUrl}${url}`;
  }
  return url;
};

// Función genérica para obtener URL de archivo (imagen, video, etc.)
const getFileUrl = (url: string | null | undefined): string | undefined => {
  return getImageUrl(url);
};

// Función para detectar si es un archivo de video
const isVideoFile = (file: string | null | undefined): boolean => {
  if (!file) return false;
  // Base64
  if (file.startsWith('data:video')) return true;
  // Extensiones de video
  const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.wmv', '.flv', '.mkv'];
  const lowerFile = file.toLowerCase();
  return VIDEO_EXTENSIONS.some(ext => lowerFile.includes(ext));
};

// Componente para renderizar archivo/imagen/video
interface FilePreviewProps {
  archivo?: string;
  selectedFile?: File | null;
  filePreview?: string | null;
  onRemove?: () => void;
  onReplace?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  size?: 'sm' | 'md';
  tipo?: string; // Tipo de archivo: 'image', 'video', 'document', etc.
  onClick?: () => void; // Callback para cuando se hace clic en la imagen/archivo
}

const FilePreview: React.FC<FilePreviewProps> = ({ 
  archivo, 
  selectedFile, 
  filePreview, 
  onRemove, 
  onReplace,
  size = 'md',
  tipo,
  onClick
}) => {

  const fileSource = filePreview || archivo;
  const fileUrl = getFileUrl(fileSource);
  const isImage = tipo === 'image' || (tipo !== 'video' && isImageFile(fileSource));
  const isVideo = tipo === 'video' || (tipo !== 'image' && isVideoFile(fileSource));
  const imageSize = size === 'sm' ? 'w-10 h-10' : 'w-16 h-16';
  const videoSize = size === 'sm' ? 'w-20 h-20' : 'w-32 h-32';
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-6 w-6';

  if (!archivo && !selectedFile && !filePreview) return null;

  return (
    <div className="flex items-center gap-2">
      {isVideo && fileUrl ? (
        <>
          <video
            src={fileUrl}
            className={`${videoSize} object-cover rounded border border-neutral-200 dark:border-neutral-700 ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
            controls
            muted
            playsInline
            onClick={onClick}
          />
          {size === 'md' && <ImageIcon className="h-4 w-4 text-primary-500" />}
        </>
      ) : isImage && fileUrl ? (
        <>
          <img
            src={fileUrl}
            alt="Preview"
            className={`${imageSize} object-cover rounded border border-neutral-200 dark:border-neutral-700 ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
            onClick={onClick}
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
  const [loading, setLoading] = useState(true);
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
  const [archivoVisualizar, setArchivoVisualizar] = useState<{url: string, tipo: string} | null>(null);
  
  // Estados para filtros y paginación
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroModo, setFiltroModo] = useState<string>('all');
  const [filtroTipo, setFiltroTipo] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [mensajesFiltrados, setMensajesFiltrados] = useState<MensajeMarketing[]>([]);

  // Helpers
  const resetForm = () => {
    setFormData(FORM_DATA_DEFAULT);
    setSelectedFile(null);
    setFilePreview(null);
    setEditingMensaje(null);
    setValidationError(null);
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
      modo: response.modo || '',
      diasActivos: Array.isArray(response.diasActivos) ? response.diasActivos : [],
      horasEspecificas: parseHorasEspecificas(response.horasEspecificas)
    };
    return mapeado;
  };

  // Función para obtener mensajes con cada minuto como elemento separado
  const getMensajesConMinutosPorHora = (dia: string, hora: string): Array<{mensaje: MensajeCalendario, minuto: string}> => {
    // hora viene en formato "HH:00" (ej: "11:00")
    const horaBase = getHoraBase(hora);
    const resultados: Array<{mensaje: MensajeCalendario, minuto: string}> = [];
    
    mensajesCalendario.forEach(m => {
      // Verificar que el día esté en diasActivos
      const tieneDia = m.diasActivos && m.diasActivos.includes(dia);
      
      if (!tieneDia) return;
      
      // Si hay horas específicas definidas, buscar por hora base
      if (m.horasEspecificas && Object.keys(m.horasEspecificas).length > 0) {
        // Buscar todas las horas que empiecen con la misma hora base y tengan el día
        if (m.horasEspecificas) {
          Object.keys(m.horasEspecificas).forEach(h => {
            const horaH = getHoraBase(h);
            if (horaH === horaBase && m.horasEspecificas && m.horasEspecificas[h]?.includes(dia)) {
              const minuto = getMinuto(h);
              // Crear un elemento separado para cada minuto
              resultados.push({
                mensaje: m,
                minuto: minuto
              });
            }
          });
        }
      }
    });
    
    // Ordenar por minuto
    return resultados.sort((a, b) => a.minuto.localeCompare(b.minuto));
  };

  // Función para obtener todos los minutos únicos de una hora en todos los días
  const getMinutosUnicosPorHora = (hora: string): string[] => {
    const minutosSet = new Set<string>();
    
    DIAS_SEMANA.forEach(dia => {
      const mensajesConMinutos = getMensajesConMinutosPorHora(dia, hora);
      mensajesConMinutos.forEach(({ minuto }) => {
        minutosSet.add(minuto);
      });
    });
    
    return Array.from(minutosSet).sort();
  };

  // Función para obtener mensajes de un minuto específico en una hora y día
  const getMensajesPorHoraYMinuto = (dia: string, hora: string, minuto: string): Array<{mensaje: MensajeCalendario, minuto: string}> => {
    const mensajesConMinutos = getMensajesConMinutosPorHora(dia, hora);
    return mensajesConMinutos.filter(({ minuto: m }) => m === minuto);
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
      const calendarioRes = await api.get('/marketing-mensajes/calendario');
      const calendarioData = calendarioRes.data || [];
      const mensajesCalendarioMapeados: MensajeCalendario[] = calendarioData.map(mapCalendarioResponse);
      setMensajesCalendario(mensajesCalendarioMapeados);
    } catch (error: any) {
      handleFetchError(error, 'Error al cargar los mensajes del calendario', () => setMensajesCalendario([]));
    }
  };

  // Cargar mensajes completos para la lista (solo cuando se necesite)
  const fetchMensajesCompletos = async () => {
    try {
      const mensajesRes = await api.get('/marketing-mensajes');
      const mensajesData = mensajesRes.data || [];
      const mensajesMapeados: MensajeMarketing[] = mensajesData.map(mapMensajeResponse);
      setMensajes(mensajesMapeados);
    } catch (error: any) {
      handleFetchError(error, 'Error al cargar los mensajes', () => setMensajes([]));
    }
  };

  // Handlers
  const fetchData = async () => {
    try {
      setLoading(true);
      
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
      } catch (error: any) {
        handleFetchError(error, 'Error al cargar los grupos', () => setGrupos([]));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Función auxiliar para construir FormData desde formData
  const buildFormData = (): FormData => {
    const formDataToSend = new FormData();
    
    formDataToSend.append('titulo', formData.titulo?.trim() || '');
    formDataToSend.append('mensaje', formData.mensaje?.trim() || '');
    if (formData.modo) formDataToSend.append('modo', formData.modo);
    formDataToSend.append('tipo', formData.tipo || 'ninguna');
    formDataToSend.append('whatsapp', String(formData.whatsapp || false));
    formDataToSend.append('yandex', String(formData.yandex || false));
    formDataToSend.append('activo', String(formData.activo !== undefined ? formData.activo : true));
    
    if (selectedFile) {
      formDataToSend.append('file', selectedFile);
    }
    
    appendArrayToFormData(formDataToSend, 'diasActivos', formData.diasActivos);
    appendArrayToFormData(formDataToSend, 'grupos', formData.grupos);
    appendArrayToFormData(formDataToSend, 'flotas', formData.flotas);
    
    if (formData.horasEspecificas) {
      formDataToSend.append('horasEspecificas', JSON.stringify(formData.horasEspecificas));
    }
    
    if (formData.comentarioImagen) {
      formDataToSend.append('comentarioImagen', formData.comentarioImagen);
    }
    
    return formDataToSend;
  };

  const handleSave = async () => {
    try {
      setLoadingMensaje(true);
      setValidationError(null);
      
      // Validar formulario
      const validationError = validateFormData();
      if (validationError) {
        setValidationError(validationError);
        setLoadingMensaje(false);
        return;
      }

      // Construir FormData
      const formDataToSend = buildFormData();

      let response;
      if (editingMensaje && !isViewModalCreating) {
        response = await api.put(`/marketing-mensajes/${editingMensaje.id}`, formDataToSend);
      } else {
        response = await api.post('/marketing-mensajes', formDataToSend);
      }

      if (hasResponseError(response)) {
        setValidationError(response.data?.mensajeOperacion || 'Error al guardar el mensaje');
        return;
      }

      setValidationError(null);

      const mensajeActualizado = mapMensajeResponse(response.data);
      const isUpdating = editingMensaje && !isViewModalCreating;
      
      if (isUpdating && editingMensaje) {
        setMensajes(mensajes.map(m => 
          m.id === editingMensaje.id ? mensajeActualizado : m
        ));
      } else {
        setMensajes([...mensajes, mensajeActualizado]);
      }
      
      closeModalAndReset();
      await reloadDataAfterOperation();
    } catch (error: any) {
      console.error('Error saving mensaje:', error);
      showError(getErrorMessage(error, 'Error al guardar el mensaje'));
    } finally {
      setLoadingMensaje(false);
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
    // Siempre recargar el calendario para que se refleje inmediatamente
    await fetchCalendario();
    // Recargar mensajes completos solo si estamos en la pestaña de lista
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
    if (activeTab === 'lista') {
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

  // Filtrar mensajes cuando cambien los filtros
  useEffect(() => {
    let filtered = [...mensajes];

    // Filtro por búsqueda
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(m => 
        m.titulo.toLowerCase().includes(searchLower) ||
        m.mensaje.toLowerCase().includes(searchLower) ||
        m.modo.toLowerCase().includes(searchLower) ||
        m.tipo.toLowerCase().includes(searchLower)
      );
    }

    // Filtro por modo
    if (filtroModo !== 'all') {
      filtered = filtered.filter(m => m.modo === filtroModo);
    }

    // Filtro por tipo
    if (filtroTipo !== 'all') {
      filtered = filtered.filter(m => m.tipo === filtroTipo);
    }

    setMensajesFiltrados(filtered);
    setCurrentPage(1); // Resetear a la primera página cuando cambien los filtros
  }, [mensajes, searchTerm, filtroModo, filtroTipo]);

  // Early returns
  if (!authState?.isAuthenticated) {
    return <AccessRestricted />;
  }

  if (loading) {
    return <LoadingModal />;
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


  const renderProgramacionView = () => {
    // Contar mensajes únicos programados
    const mensajesUnicos = new Set(mensajesCalendario.map(m => m.id));
    const cantidadMensajes = mensajesUnicos.size;

    return (
    <div className="h-[calc(100vh-12rem)]">
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendario Semanal
            {cantidadMensajes > 0 && (
              <span className="ml-2 px-2 py-1 text-xs font-semibold bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full">
                {cantidadMensajes} {cantidadMensajes === 1 ? 'mensaje programado' : 'mensajes programados'}
              </span>
            )}
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
                {HORAS.map(hora => {
                  const minutosUnicos = getMinutosUnicosPorHora(hora);
                  const horaBase = getHoraBase(hora);
                  
                  if (minutosUnicos.length === 0) {
                    return (
                      <tr key={hora}>
                        <td className="border border-neutral-200 dark:border-neutral-700 p-2 text-sm text-neutral-600 dark:text-neutral-400">
                          {hora}
                        </td>
                        {DIAS_SEMANA.map(dia => (
                          <td 
                            key={`${dia}-${hora}`}
                            className="border border-neutral-200 dark:border-neutral-700 p-2"
                          ></td>
                        ))}
                      </tr>
                    );
                  }
                  
                  // Crear una fila para cada minuto único
                  return minutosUnicos.map((minuto, minutoIndex) => (
                    <tr key={`${hora}-${minuto}-${minutoIndex}`}>
                      {minutoIndex === 0 && (
                        <td 
                          rowSpan={minutosUnicos.length}
                          className="border border-neutral-200 dark:border-neutral-700 p-2 text-sm text-neutral-600 dark:text-neutral-400 align-top"
                        >
                          {hora}
                        </td>
                      )}
                      {DIAS_SEMANA.map(dia => {
                        const mensajesPorMinuto = getMensajesPorHoraYMinuto(dia, hora, minuto);
                        return (
                          <td 
                            key={`${dia}-${hora}-${minuto}`}
                            className="border border-neutral-200 dark:border-neutral-700 p-2"
                          >
                            {mensajesPorMinuto.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {mensajesPorMinuto.map(({mensaje: m, minuto: mMinuto}, index) => (
                                  <div
                                    key={`${m.id}-${mMinuto}-${index}`}
                                    className={`${getColorClassesByModo(m.modo)} text-[10px] px-2 py-2 rounded-md cursor-pointer transition-all shadow-sm flex flex-col items-center justify-center text-center w-16 h-16 aspect-square`}
                                    onClick={() => handleEditDirect(m.id)}
                                    title={`${m.titulo} - ${horaBase}:${mMinuto}`}
                                  >
                                    <span className="line-clamp-2 leading-tight break-words text-[9px] text-center w-full">
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
                  ));
                })}
              </tbody>
            </table>
          </div>
          {/* Leyenda de colores */}
          <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-4 text-xs text-neutral-600 dark:text-neutral-400">
              <span className="font-semibold">Leyenda:</span>
              {OPCIONES_MODO.map(modo => (
                <div key={modo} className="flex items-center gap-2">
                  <div className={`w-4 h-4 ${COLORES_POR_MODO[modo as keyof typeof COLORES_POR_MODO]?.legend || COLORES_POR_MODO.default.legend} rounded`}></div>
                  <span className="capitalize">{modo}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    );
  };

  const renderListaView = () => {
    // Calcular paginación
    const totalMensajes = mensajesFiltrados.length;
    const totalPages = Math.ceil(totalMensajes / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const mensajesPaginados = mensajesFiltrados.slice(startIndex, endIndex);

    const handlePageChange = (page: number) => {
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
      }
    };

    const handleItemsPerPageChange = (value: string) => {
      setItemsPerPage(parseInt(value));
      setCurrentPage(1);
    };

    return (
    <div className="space-y-4">
      {/* Búsqueda */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 w-5 h-5 pointer-events-none z-10" />
            <Input
              placeholder="Buscar mensajes por título, mensaje, modo o tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
            <span className="text-sm text-neutral-700 dark:text-neutral-300">Modo:</span>
            <span className="text-sm text-neutral-700 dark:text-neutral-300">Modo:</span>
            <Select value={filtroModo} onValueChange={setFiltroModo}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {OPCIONES_MODO.map(modo => (
                  <SelectItem key={modo} value={modo}>{modo.charAt(0).toUpperCase() + modo.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-700 dark:text-neutral-300">Tipo:</span>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {OPCIONES_TIPO.map(tipo => (
                  <SelectItem key={tipo} value={tipo}>{tipo.charAt(0).toUpperCase() + tipo.slice(1)}</SelectItem>
                ))}
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Lista de Mensajes
            </div>
            {totalMensajes > 0 && (
              <span className="text-sm font-normal text-neutral-500">
                {totalMensajes} mensaje{totalMensajes !== 1 ? 's' : ''} encontrado{totalMensajes !== 1 ? 's' : ''}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mensajes.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mx-auto" />}
              message="No hay mensajes creados"
            />
          ) : mensajesFiltrados.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mx-auto" />}
              message="No se encontraron mensajes con los filtros aplicados"
            />
          ) : (
            <>
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
                    {mensajesPaginados.map((mensaje) => (
                    <tr 
                      key={mensaje.id} 
                      className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                    >
                      <td className="p-3 text-sm font-medium">{mensaje.titulo}</td>
                      <td className="p-3 text-sm text-neutral-600 dark:text-neutral-400 max-w-xs truncate">
                        {mensaje.mensaje}
                      </td>
                      <td className="p-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${getColorClassesByModo(mensaje.modo, 'badge')}`}>
                          {mensaje.modo}
                        </span>
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
                              tipo={mensaje.tipo}
                              onClick={() => {
                                const fileUrl = getFileUrl(mensaje.archivo);
                                if (fileUrl) {
                                  setArchivoVisualizar({
                                    url: fileUrl,
                                    tipo: mensaje.tipo || 'image'
                                  });
                                }
                              }}
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
            {/* Paginación */}
            {totalPages > 1 && (
              <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">
                    Mostrando {startIndex + 1} a {Math.min(endIndex, totalMensajes)} de {totalMensajes} mensajes
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
              </div>
            )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
    );
  };



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
              <label className={CSS_CLASSES.labelForm}>Título</label>
              <Input
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Ej: CAPACITACIÓN VIRTUAL - cali"
              />
            </div>
            
            <div>
              <label className={CSS_CLASSES.labelForm}>Mensaje</label>
              <Textarea
                value={formData.mensaje}
                onChange={(e) => setFormData({ ...formData, mensaje: e.target.value })}
                placeholder="Escribe tu mensaje aquí..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={CSS_CLASSES.labelForm}>Modo</label>
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
                <label className={CSS_CLASSES.labelForm}>Tipo</label>
                <Select 
                  value={formData.tipo} 
                  onValueChange={(value) => {
                    // Al cambiar el tipo, limpiar el archivo
                    setSelectedFile(null);
                    setFilePreview(null);
                    setFormData({ ...formData, tipo: value, archivo: undefined, comentarioImagen: '' });
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
                <label className={CSS_CLASSES.labelFormMb2}>Archivo/Imagen</label>
                {formData.tipo === 'ninguna' ? (
                  <div className="border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-lg p-4 text-center bg-neutral-50 dark:bg-neutral-900/50 opacity-50">
                    <Upload className="h-6 w-6 text-neutral-400 mx-auto mb-2" />
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      Campo deshabilitado (tipo: ninguna)
                    </span>
                  </div>
                ) : !selectedFile && !filePreview && !formData.archivo ? (
                  <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg p-4 text-center transition-colors hover:border-primary-500 cursor-pointer">
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      accept={getAcceptByTipo(formData.tipo)}
                      onChange={handleFileChange}
                      disabled={formData.tipo === 'ninguna'}
                    />
                    <label
                      htmlFor="file-upload"
                      className="flex flex-col items-center gap-2 cursor-pointer"
                    >
                      <Upload className="h-6 w-6 text-neutral-400" />
                      <span className="text-xs text-neutral-600 dark:text-neutral-400">
                        Haz clic para subir
                      </span>
                      <span className="text-[10px] text-neutral-500">
                        {getTipoDescription(formData.tipo)}
                      </span>
                    </label>
                  </div>
                ) : null}
                
                {(selectedFile || filePreview || formData.archivo) && formData.tipo && formData.tipo !== 'ninguna' && (
                  <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3">
                    <div className="flex items-start gap-3">
                      {(filePreview || formData.archivo) && isImageFile(filePreview || formData.archivo) ? (
                        <div className="flex-shrink-0">
                          <img
                            src={getImageUrl(filePreview || formData.archivo)}
                            alt="Preview"
                            className="w-16 h-16 object-cover rounded-lg border border-neutral-200 dark:border-neutral-700 cursor-pointer hover:opacity-80 transition-opacity"
                            onError={(e) => {
                              // Si la imagen falla al cargar, mostrar icono de archivo
                              e.currentTarget.style.display = 'none';
                            }}
                            onClick={() => {
                              const fileSource = filePreview || formData.archivo;
                              const fileUrl = getFileUrl(fileSource);
                              if (fileUrl) {
                                setArchivoVisualizar({
                                  url: fileUrl,
                                  tipo: formData.tipo || 'image'
                                });
                              }
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
                          accept={getAcceptByTipo(formData.tipo)}
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
                <label className={CSS_CLASSES.labelFormMb2}>Canales</label>
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
              <label className={CSS_CLASSES.labelFormMb2}>Horarios</label>
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
                <label className={CSS_CLASSES.labelFormMb2}>Grupos y Comunidad</label>
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
                <label className={CSS_CLASSES.labelFormMb2}>Fleet Yego</label>
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
            {loadingMensaje && (
              <div className="mb-4 p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm text-primary-700 dark:text-primary-300 font-medium">
                    {isViewModalCreating ? 'Creando mensaje...' : 'Actualizando mensaje...'}
                  </p>
                </div>
              </div>
            )}
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
                leftIcon={loadingMensaje ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Save className="h-4 w-4" />
                )}
                disabled={loadingMensaje}
              >
                {loadingMensaje 
                  ? (isViewModalCreating ? 'Guardando...' : 'Actualizando...')
                  : (isViewModalCreating ? 'Guardar' : 'Actualizar')
                }
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
                    tipo={mensajeToView.tipo}
                    onClick={() => {
                      const fileUrl = getFileUrl(mensajeToView.archivo);
                      if (fileUrl) {
                        setArchivoVisualizar({
                          url: fileUrl,
                          tipo: mensajeToView.tipo || 'image'
                        });
                      }
                    }}
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
          className="max-h-[90vh] overflow-hidden flex flex-col max-w-[95vw] w-[95vw]"
        >
          <DialogHeader className="flex-shrink-0 pb-2">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" />
              Seleccionar Horarios
            </DialogTitle>
            <DialogDescription className="text-xs">
              Haz clic en las celdas para seleccionar los horarios en los que quieres que aparezca el mensaje
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 flex-1 overflow-auto">
            {/* Cuadrícula de horarios */}
            <div className="overflow-auto border border-neutral-200 dark:border-neutral-700 rounded-lg">
              <div className="w-full">
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
                      const horaBase = getHoraBase(hora);
                      
                      const horariosConMinutos = Object.keys(horariosSeleccionados).filter(h => {
                        const horaH = getHoraBase(h);
                        return horaH === horaBase && horariosSeleccionados[h]?.includes(dia);
                      });
                      
                      const estaSeleccionadoHorario = horariosConMinutos.length > 0;
                      
                      return (
                        <div 
                          key={`${dia}-${hora}`}
                          className={`relative ${CSS_CLASSES.cellBorder}`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setMinutosModalOpen({ dia, hora });
                            }}
                            className={`
                              ${CSS_CLASSES.buttonBase}
                              ${estaSeleccionadoHorario
                                ? CSS_CLASSES.buttonSelected
                                : CSS_CLASSES.buttonDefault
                              }
                            `}
                            title="Seleccionar minutos"
                          >
                            {horariosConMinutos.length > 0 && (
                              <div className="flex flex-wrap gap-1 w-full mt-auto">
                                {horariosConMinutos.map(h => {
                                  const minuto = getMinuto(h);
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
            <div className="mt-2 flex items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
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

          <DialogFooter className="mt-2 flex-shrink-0 border-t border-neutral-200 dark:border-neutral-700 pt-2">
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
    const horaBase = getHoraBase(hora);
    
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
                
                return (
                  <button
                    key={minuto}
                    type="button"
                    onClick={() => toggleMinuto(minuto)}
                    className={`
                      p-2 rounded-md text-sm transition-all
                      ${estaSeleccionado
                        ? 'bg-primary-500 text-white hover:bg-primary-600'
                        : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                      }
                    `}
                    title={estaSeleccionado ? 'Deseleccionar' : 'Seleccionar'}
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

  // Modal para visualizar archivo/imagen
  const renderArchivoModal = () => {
    if (!archivoVisualizar) return null;

    const isImage = archivoVisualizar.tipo === 'image' || isImageFile(archivoVisualizar.url);
    const isVideo = archivoVisualizar.tipo === 'video' || isVideoFile(archivoVisualizar.url);

    return (
      <Dialog open={!!archivoVisualizar} onOpenChange={() => setArchivoVisualizar(null)}>
        <DialogContent className="sm:max-w-[800px] max-w-[800px] w-[800px] p-0">
          <div className="flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 p-4">
            {isVideo ? (
              <video
                src={archivoVisualizar.url}
                className="w-full h-[500px] object-cover rounded-lg shadow-lg"
                controls
                autoPlay
              />
            ) : isImage ? (
              <img
                src={archivoVisualizar.url}
                alt="Visualización"
                className="w-full h-[500px] object-cover rounded-lg shadow-lg"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="text-center py-8">
                <FileText className="h-16 w-16 text-neutral-400 mx-auto mb-4" />
                <p className="text-neutral-600 dark:text-neutral-400">
                  Vista previa no disponible para este tipo de archivo
                </p>
                <a
                  href={archivoVisualizar.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block text-primary-600 hover:text-primary-700 underline"
                >
                  Abrir archivo en nueva pestaña
                </a>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Renderizar contenido según la pestaña activa
  const renderTabContent = () => {
    switch (activeTab) {
      case 'programacion':
        return renderProgramacionView();
      case 'lista':
        return renderListaView();
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 p-6 relative">
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
      {renderArchivoModal()}
      
      {/* Contenedor de notificaciones toast */}
      <NotificationContainer 
        notifications={notifications} 
        onRemove={removeNotification} 
      />
    </div>
  );
};

export default MarketingMensajesModule;
