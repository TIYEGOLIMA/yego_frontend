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
