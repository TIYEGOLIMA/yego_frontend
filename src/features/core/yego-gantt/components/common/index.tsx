/**
 * Componentes UI reutilizables del módulo Yego Gantt
 * Centraliza componentes comunes para evitar duplicación
 */

import type { ReactNode } from 'react'
import { type LucideIcon } from 'lucide-react'
import type { AreaTaskStatus, TaskPriority } from '../../types'
import {
  TASK_STATUS_COLOR,
  TASK_STATUS_LABEL,
  PRIO_LABEL,
  PRIO_BADGE,
} from '../../utils'

// ==================== COMPONENTES DE BADGE ====================

export interface StatusBadgeProps {
  status: AreaTaskStatus
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const classes = size === 'sm'
    ? 'text-[10px] px-2 py-0.5 rounded-full font-semibold'
    : 'text-xs px-2.5 py-1 rounded-md font-semibold'
  return (
    <span className={`${classes} ${TASK_STATUS_COLOR[status]}`}>
      {TASK_STATUS_LABEL[status]}
    </span>
  )
}

export interface PriorityBadgeProps {
  priority?: TaskPriority | null
  size?: 'sm' | 'md'
}

export function PriorityBadge({ priority, size = 'sm' }: PriorityBadgeProps) {
  const p = priority ?? 'MEDIUM'
  const classes = size === 'sm'
    ? 'text-[9px] px-1.5 py-0.5 rounded font-bold uppercase'
    : 'text-[10px] px-2 py-0.5 rounded-md font-bold uppercase'
  return (
    <span className={`${classes} ${PRIO_BADGE[p]}`}>
      {PRIO_LABEL[p]}
    </span>
  )
}

// ==================== COMPONENTES DE PROGRESO ====================

export interface ProgressBarProps {
  value: number
  max?: number
  className?: string
  variant?: 'primary' | 'amber' | 'red' | 'sky' | 'emerald' | 'slate'
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function ProgressBar({
  value,
  max = 100,
  className = '',
  variant = 'primary',
  showLabel = false,
  size = 'sm',
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)))

  const variantClasses = {
    primary: 'workos-progress-fill',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    sky: 'bg-sky-500',
    emerald: 'bg-emerald-500',
    slate: 'bg-slate-400/90 dark:bg-slate-500/80',
  }

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-2.5',
  }

  return (
    <div className={`w-full overflow-hidden rounded-full bg-muted/70 dark:bg-muted/50 ${className}`}>
      <div
        className={`${heightClasses[size]} rounded-full transition-all duration-500 ${variantClasses[variant]}`}
        style={{ width: `${percentage}%` }}
        title={`${percentage}%`}
      />
      {showLabel && (
        <span className="text-xs font-semibold tabular-nums text-muted-foreground">
          {percentage}%
        </span>
      )}
    </div>
  )
}

// ==================== COMPONENTES DE AVATAR ====================

export interface AvatarProps {
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  variant?: 'default' | 'primary' | 'red' | 'muted' | 'owner'
  title?: string
}

function getAvatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export function Avatar({ name, size = 'sm', variant = 'default', title }: AvatarProps) {
  const initials = getAvatarInitials(name)

  const sizeClasses = {
    xs: 'w-5 h-5 text-[7px]',
    sm: 'w-6 h-6 text-[9px]',
    md: 'w-7 h-7 text-[10px]',
    lg: 'w-9 h-9 text-[11px]',
  }

  const variantClasses = {
    default: 'bg-primary/15 border-background text-primary',
    primary: 'bg-primary/15 border-background text-primary',
    red: 'bg-red-100 dark:bg-red-900/30 border-white dark:border-neutral-900 text-red-600 dark:text-red-400',
    muted: 'bg-muted border-border/60 text-muted-foreground',
    owner:
      'bg-amber-100 dark:bg-amber-950/45 border-amber-400 dark:border-amber-500 text-amber-900 dark:text-amber-100',
  }

  return (
    <div
      className={`rounded-full border-2 flex items-center justify-center font-bold shrink-0 ${sizeClasses[size]} ${variantClasses[variant]}`}
      title={title || name}
    >
      {initials}
    </div>
  )
}

export interface AvatarGroupProps {
  names: string[]
  max?: number
  size?: 'xs' | 'sm' | 'md'
  variant?: 'default' | 'red'
}

export function AvatarGroup({ names, max = 4, size = 'sm', variant = 'default' }: AvatarGroupProps) {
  const displayNames = names.slice(0, max)
  const remaining = names.length - max

  return (
    <div className="flex items-center -space-x-1.5">
      {displayNames.map((name, i) => (
        <Avatar key={i} name={name} size={size} variant={variant} />
      ))}
      {remaining > 0 && (
        <div className={`w-6 h-6 rounded-full bg-muted border-2 border-white dark:border-neutral-900 flex items-center justify-center text-[8px] font-bold text-muted-foreground`}>
          +{remaining}
        </div>
      )}
    </div>
  )
}

// ==================== COMPONENTES DE PANEL/CARD ====================

export interface PanelProps {
  title: string
  Icon: LucideIcon
  children: ReactNode
  className?: string
}

export function Panel({ title, Icon, children, className = '' }: PanelProps) {
  return (
    <div className={`rounded-xl border border-border/80 bg-card p-4 workos-shadow-soft ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-foreground" />
        <h3 className="font-display font-semibold text-sm">{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

export interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  progress?: number
  barVariant?: 'primary' | 'amber' | 'red' | 'sky'
}

export function StatCard({ label, value, sub, progress, barVariant = 'primary' }: StatCardProps) {
  return (
    <div className="rounded-lg bg-card/80 border border-border/60 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          {label}
        </span>
        <span className="font-display font-bold tabular-nums text-primary-600 dark:text-primary-400">
          {value}
        </span>
      </div>
      {progress !== undefined && (
        <ProgressBar value={progress} variant={barVariant} className="mt-2" />
      )}
      {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
    </div>
  )
}

export interface SummaryCardProps {
  Icon: LucideIcon
  label: string
  value: string | number
  sub: string
  tone: 'primary' | 'info' | 'warning' | 'success'
}

export function SummaryCard({ Icon, label, value, sub, tone }: SummaryCardProps) {
  const grad = {
    primary: 'from-primary-500/15 to-primary-500/0',
    info: 'from-sky-500/15 to-sky-500/0',
    warning: 'from-amber-500/15 to-amber-500/0',
    success: 'from-emerald-500/15 to-emerald-500/0',
  }[tone]

  const iconTone = {
    primary: 'text-primary-600 dark:text-primary-400',
    info: 'text-sky-600 dark:text-sky-400',
    warning: 'text-amber-600 dark:text-amber-400',
    success: 'text-emerald-600 dark:text-emerald-400',
  }[tone]

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#e5e7eb] bg-white p-4 workos-shadow-soft dark:border-border/80 dark:bg-card">
      <div className={`absolute inset-0 bg-gradient-to-br ${grad} opacity-100 pointer-events-none`} />
      <div className="relative flex items-start gap-3">
        <div className={`h-10 w-10 rounded-lg bg-white border border-[#e5e7eb] flex items-center justify-center shrink-0 ${iconTone} dark:bg-card dark:border-border/80`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            {label}
          </div>
          <div className="font-display text-xl font-bold text-foreground truncate">{value}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
        </div>
      </div>
    </div>
  )
}

// ==================== COMPONENTES DE ESTADO VACIO ====================

export interface EmptyStateProps {
  Icon: LucideIcon
  title: string
  description: string
  action?: () => void
  actionLabel?: string
  actionButton?: ReactNode
}

export function EmptyState({
  Icon,
  title,
  description,
  action,
  actionLabel,
  actionButton,
}: EmptyStateProps) {
  return (
    <div className="rounded-xl border-2 border-dashed border-[#e5e7eb] bg-white p-12 text-center dark:border-border/60 dark:bg-card/50">
      <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <h3 className="font-display font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
      {action && actionLabel && (
        <button
          onClick={action}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg workos-gantt-btn-primary border-0 px-4 py-2 text-sm font-medium text-white"
        >
          {actionLabel}
        </button>
      )}
      {actionButton}
    </div>
  )
}

// ==================== COMPONENTES DE FILA/ROW ====================

export interface RowBarProps {
  Icon: LucideIcon
  color: string
  label: string
  value: number
  pct: number
  barClass?: string
}

export function RowBar({ Icon, color, label, value, pct, barClass }: RowBarProps) {
  const fillPct = value > 0 && pct < 1 ? 1 : Math.min(100, Math.max(0, pct))
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-sm">
        <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
        <span className={`font-medium ${color}`}>{label}</span>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {value} ({pct}%)
        </span>
      </div>
      <div
        className="h-2.5 w-full overflow-hidden rounded-full border border-border/60 bg-muted/70 dark:bg-muted/50 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]"
        title={`${value} tareas - ${pct}% del total`}
      >
        <div
          className={`h-full min-w-0 rounded-full transition-all duration-500 ${barClass || 'bg-muted-foreground/50'}`}
          style={{ width: `${fillPct}%` }}
        />
      </div>
    </div>
  )
}

