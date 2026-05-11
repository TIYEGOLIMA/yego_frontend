import { useMemo } from 'react'
import { ChevronDown, GanttChartSquare, Inbox, Plus } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import type { WorkspaceDto } from '../../types'
import { projectIconByKey } from '../../projectIcons'
import { HEADER_WORKSPACE_CREATE_VALUE } from './ganttConstants'
import type { GanttShellTabDefinition } from './ganttTabDefinitions'

interface GanttModuleHeaderProps {
  workspaceFilter: string
  workspacePickerBusy: boolean
  onWorkspaceFilterChange: (next: string) => void
  workspaces: WorkspaceDto[]
  canManageWorkspaces: boolean
  canCreateTasks: boolean
  onNewTaskClick: () => void
  visibleTabs: readonly GanttShellTabDefinition[]
  activeTab: GanttShellTabDefinition['id']
  onTabChange: (tabId: GanttShellTabDefinition['id']) => void
}

export function GanttModuleHeader({
  workspaceFilter,
  workspacePickerBusy,
  onWorkspaceFilterChange,
  workspaces,
  canManageWorkspaces,
  canCreateTasks,
  onNewTaskClick,
  visibleTabs,
  activeTab,
  onTabChange,
}: GanttModuleHeaderProps) {
  const workspacePickerIcon = useMemo(() => {
    if (workspaceFilter === 'my_space') return Inbox
    const p = workspaces.find((x) => String(x.id) === workspaceFilter)
    return projectIconByKey(p?.iconKey)
  }, [workspaceFilter, workspaces])

  const workspacePickerLabel = useMemo(() => {
    if (workspaceFilter === 'my_space') return 'Mi espacio'
    if (workspaces.length === 0) return '—'
    return workspaces.find((p) => String(p.id) === workspaceFilter)?.name ?? 'Espacio de trabajo'
  }, [workspaceFilter, workspaces])

  const WorkspacePickerIcon = workspacePickerIcon

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background shadow-sm dark:shadow-dark-sm">
      <div className="mx-auto w-full px-4 lg:px-6 py-3 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 shrink-0 rounded-xl workos-gantt-gradient-icon flex items-center justify-center text-white">
            <GanttChartSquare className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="font-display font-bold text-foreground leading-tight truncate">WorkOS</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider -mt-0.5 truncate">
              Project OS
            </div>
          </div>
        </div>
        <Select
          value={workspaceFilter}
          onValueChange={onWorkspaceFilterChange}
          disabled={workspacePickerBusy}
        >
          <SelectTrigger
            title={workspacePickerBusy ? 'Cargando… espera a poder cambiar de espacio' : undefined}
            className={cn(
              'workos-project-picker-trigger',
              '[&>svg]:hidden',
              'h-auto min-h-0 py-1 pl-1.5 pr-2 gap-0 rounded-xl border border-neutral-200/90 dark:border-neutral-600/80',
              'bg-white dark:bg-neutral-900/95 shadow-sm w-[min(12.5rem,calc(100vw-10rem))] max-w-[200px]',
              'focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500/40',
              'hover:border-neutral-300 dark:hover:border-neutral-500',
            )}
          >
            <span className="sr-only">
              <SelectValue />
            </span>
            <div className="flex items-center gap-2 w-full min-w-0">
              <div
                className="h-8 w-8 shrink-0 rounded-lg bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white shadow-sm"
                aria-hidden
              >
                <WorkspacePickerIcon className="h-4 w-4 stroke-[2]" />
              </div>
              <div className="flex-1 min-w-0 text-left leading-none">
                <div className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  Espacio de trabajo
                </div>
                <div className="text-[13px] font-semibold text-foreground truncate tracking-tight">
                  {workspacePickerLabel}
                </div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
            </div>
          </SelectTrigger>
          <SelectContent align="start" className="rounded-xl">
            <SelectItem value="my_space">
              <span className="flex items-center gap-2">
                <Inbox className="h-3.5 w-3.5 shrink-0 opacity-80" />
                Mi espacio
              </span>
            </SelectItem>
            {workspaces.map((p) => {
              const ItemIcon = projectIconByKey(p.iconKey)
              return (
                <SelectItem key={p.id} value={String(p.id)}>
                  <span className="flex items-center gap-2">
                    <ItemIcon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                    {p.name}
                  </span>
                </SelectItem>
              )
            })}
            {canManageWorkspaces && (
              <>
                <SelectSeparator />
                <SelectItem
                  value={HEADER_WORKSPACE_CREATE_VALUE}
                  className="text-primary focus:text-primary cursor-pointer"
                >
                  <span className="flex items-center gap-2 font-medium">
                    <Plus className="h-3.5 w-3.5 shrink-0 opacity-90" />
                    Crear espacio de trabajo…
                  </span>
                </SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
        {canCreateTasks && (
          <Button
            type="button"
            onClick={onNewTaskClick}
            className="gap-1.5 h-9 rounded-lg border-0 workos-gantt-btn-primary shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Nuevo proyecto
          </Button>
        )}
      </div>
      <div className="mx-auto w-full px-4 lg:px-6 pb-2 pt-1">
        <div className="flex flex-wrap items-center gap-1">
          {visibleTabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                activeTab === id
                  ? 'workos-gantt-tab-active'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}
