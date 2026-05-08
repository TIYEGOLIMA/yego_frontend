import type { LucideIcon } from 'lucide-react'
import {
  Boxes,
  CalendarRange,
  FileText,
  Flame,
  GanttChartSquare,
  KanbanSquare,
  LayoutDashboard,
} from 'lucide-react'

export type GanttShellTabId =
  | 'gantt'
  | 'cartera'
  | 'board'
  | 'sprints'
  | 'actas'
  | 'calendar'
  | 'dashboard'

export interface GanttShellTabDefinition {
  id: GanttShellTabId
  label: string
  Icon: LucideIcon
}

export const GANTT_TAB_DEFINITIONS: GanttShellTabDefinition[] = [
  { id: 'gantt', label: 'Timeline', Icon: GanttChartSquare },
  { id: 'cartera', label: 'Portfolio', Icon: Boxes },
  { id: 'board', label: 'Board', Icon: KanbanSquare },
  { id: 'sprints', label: 'Sprints', Icon: Flame },
  { id: 'actas', label: 'Actas', Icon: FileText },
  { id: 'calendar', label: 'Calendario', Icon: CalendarRange },
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
]
