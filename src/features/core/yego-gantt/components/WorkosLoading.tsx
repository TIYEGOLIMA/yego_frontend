import { cn } from '@/utils/cn'

/** Carga inicial de pestaña: mismo estilo de spinner que el resto de Integral. */
export function WorkosTabLoading({ srLabel }: { srLabel: string }) {
  return (
    <div
      className="flex min-h-[220px] flex-1 flex-col items-center justify-center gap-3 p-8"
      role="status"
      aria-live="polite"
    >
      <div
        className="h-10 w-10 shrink-0 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"
        aria-hidden
      />
      <span className="sr-only">{srLabel}</span>
    </div>
  )
}

/** Indicador discreto al refrescar datos (solo spinner; sin texto visible). */
export function WorkosRefreshingPill({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-md border border-border/60 bg-background/90 px-2 py-1 shadow-sm',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span
        className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"
        aria-hidden
      />
      <span className="sr-only">Actualizando datos</span>
    </span>
  )
}
