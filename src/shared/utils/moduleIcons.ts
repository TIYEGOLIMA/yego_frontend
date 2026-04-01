import {
  LayoutDashboard,
  UserRound,
  Users,
  ShieldCheck,
  Shield,
  KeyRound,
  AppWindow,
  ScrollText,
  FileText,
  MonitorSmartphone,
  Smartphone,
  BarChart4,
  Bell,
  Server,
  Database,
  Clock,
  Calendar,
  Sparkles,
  Send,
  Mail,
  MessageSquare,
  Settings2,
  Globe,
  CreditCard,
  Wallet,
  ShoppingCart,
  Package,
  Truck,
  Building,
  Home,
  Folder,
  MapPin,
  Phone,
  GanttChart,
  type LucideIcon
} from 'lucide-react';

// Tipo para los iconos disponibles
export interface ModuleIconConfig {
  name: string;
  icon: LucideIcon;
  label: string;
}

// Lista de iconos disponibles para seleccionar en módulos
export const AVAILABLE_ICONS: ModuleIconConfig[] = [
  { name: 'AppWindow', icon: AppWindow, label: 'Aplicación' },
  { name: 'LayoutDashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { name: 'UserRound', icon: UserRound, label: 'Usuario' },
  { name: 'Users', icon: Users, label: 'Usuarios' },
  { name: 'ShieldCheck', icon: ShieldCheck, label: 'Seguridad' },
  { name: 'Shield', icon: Shield, label: 'Escudo' },
  { name: 'KeyRound', icon: KeyRound, label: 'Llave' },
  { name: 'ScrollText', icon: ScrollText, label: 'Documento' },
  { name: 'FileText', icon: FileText, label: 'Archivo' },
  { name: 'MonitorSmartphone', icon: MonitorSmartphone, label: 'Dispositivos' },
  { name: 'Smartphone', icon: Smartphone, label: 'Móvil' },
  { name: 'BarChart4', icon: BarChart4, label: 'Gráficos' },
  { name: 'Bell', icon: Bell, label: 'Notificaciones' },
  { name: 'Server', icon: Server, label: 'Servidor' },
  { name: 'Database', icon: Database, label: 'Base de datos' },
  { name: 'Clock', icon: Clock, label: 'Reloj' },
  { name: 'Calendar', icon: Calendar, label: 'Calendario' },
  { name: 'Sparkles', icon: Sparkles, label: 'Premium' },
  { name: 'Send', icon: Send, label: 'Enviar/SMS' },
  { name: 'Mail', icon: Mail, label: 'Correo' },
  { name: 'MessageSquare', icon: MessageSquare, label: 'Mensaje' },
  { name: 'Settings2', icon: Settings2, label: 'Configuración' },
  { name: 'Globe', icon: Globe, label: 'Web' },
  { name: 'CreditCard', icon: CreditCard, label: 'Pagos' },
  { name: 'Wallet', icon: Wallet, label: 'Billetera' },
  { name: 'ShoppingCart', icon: ShoppingCart, label: 'Carrito' },
  { name: 'Package', icon: Package, label: 'Paquete' },
  { name: 'Truck', icon: Truck, label: 'Envío' },
  { name: 'Building', icon: Building, label: 'Edificio' },
  { name: 'Home', icon: Home, label: 'Inicio' },
  { name: 'Folder', icon: Folder, label: 'Carpeta' },
  { name: 'MapPin', icon: MapPin, label: 'Ubicación' },
  { name: 'Phone', icon: Phone, label: 'Teléfono' },
  { name: 'GanttChart', icon: GanttChart, label: 'Gantt' },
];

// Mapa de iconos por nombre para acceso rápido
export const ICON_MAP: Record<string, LucideIcon> = AVAILABLE_ICONS.reduce(
  (acc, { name, icon }) => {
    acc[name] = icon;
    return acc;
  },
  {} as Record<string, LucideIcon>
);

// Función para obtener el componente de icono por nombre
export const getIconByName = (iconName?: string): LucideIcon => {
  if (iconName && ICON_MAP[iconName]) {
    return ICON_MAP[iconName];
  }
  return AppWindow; // Icono por defecto
};

// Función para obtener la configuración completa del icono
export const getIconConfig = (iconName?: string): ModuleIconConfig | undefined => {
  return AVAILABLE_ICONS.find(i => i.name === iconName);
};

