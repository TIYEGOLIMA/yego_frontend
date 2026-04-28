import type { LucideIcon } from 'lucide-react'
import {
  Box,
  Briefcase,
  Building2,
  Compass,
  Cpu,
  Folder,
  FolderKanban,
  Globe,
  Heart,
  Layers,
  Lightbulb,
  Paintbrush,
  Rocket,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react'

/** Mismas claves que `ALLOWED_PROJECT_ICON_KEYS` en el backend. */
export const PROJECT_ICON_CHOICES: { key: string; label: string; Icon: LucideIcon }[] = [
  { key: 'folder', label: 'Carpeta', Icon: Folder },
  { key: 'folder-kanban', label: 'Kanban', Icon: FolderKanban },
  { key: 'rocket', label: 'Cohete', Icon: Rocket },
  { key: 'briefcase', label: 'Maletín', Icon: Briefcase },
  { key: 'layers', label: 'Capas', Icon: Layers },
  { key: 'cpu', label: 'Tecnología', Icon: Cpu },
  { key: 'sparkles', label: 'Ideas', Icon: Sparkles },
  { key: 'target', label: 'Objetivo', Icon: Target },
  { key: 'globe', label: 'Global', Icon: Globe },
  { key: 'zap', label: 'Energía', Icon: Zap },
  { key: 'building', label: 'Organización', Icon: Building2 },
  { key: 'compass', label: 'Rumbo', Icon: Compass },
  { key: 'lightbulb', label: 'Innovación', Icon: Lightbulb },
  { key: 'box', label: 'Producto', Icon: Box },
  { key: 'heart', label: 'Equipo', Icon: Heart },
  { key: 'palette', label: 'Diseño', Icon: Paintbrush },
]

const FALLBACK = Folder

export function projectIconByKey(iconKey: string | null | undefined): LucideIcon {
  const k = (iconKey || 'folder').toLowerCase().trim()
  const found = PROJECT_ICON_CHOICES.find((c) => c.key === k)
  return found?.Icon ?? FALLBACK
}
