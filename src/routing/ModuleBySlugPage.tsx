import { Navigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/store/auth-store'
import { findFirstModuleForSlug } from '@/shared/utils/moduleUrlMatch'
import { getComponentForModule } from '@/routing/moduleComponentRegistry'
import { PermissionRoute } from '@/routing/PermissionRoute'

/**
 * Ruta dinámica: el slug de la URL debe coincidir con el módulo en BD;
 * la pantalla se elige por `codigo` (no por la URL), así puedes cambiar la URL sin tocar el frontend.
 */
export function ModuleBySlugRoute() {
  const { moduleSlug } = useParams<{ moduleSlug: string }>()
  if (!moduleSlug) return <Navigate to="/" replace />
  return (
    <PermissionRoute module={moduleSlug}>
      <ResolvedModule slug={moduleSlug} />
    </PermissionRoute>
  )
}

function ResolvedModule({ slug }: { slug: string }) {
  const { modules } = useAuthStore()

  const mod = findFirstModuleForSlug(modules, slug)
  const Cmp = getComponentForModule(mod, slug)

  if (!Cmp) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-lg font-medium text-foreground">
          Este módulo no tiene pantalla enlazada en el sistema.
        </p>
        <p className="max-w-md text-sm text-muted-foreground">
          En <strong>Administración → Módulos</strong>, asigna el campo <strong>Código de pantalla</strong>{' '}
          (por ejemplo <code className="rounded bg-muted px-1">YEGO_GANTT</code> para planificación). Ese
          valor no cambia aunque renombres la URL.
        </p>
        <p className="text-xs text-muted-foreground">
          Ruta: <code className="rounded bg-muted px-1">/{slug}</code>
          {mod?.id != null ? (
            <>
              {' '}
              · Módulo ID: {mod.id}
            </>
          ) : null}
        </p>
      </div>
    )
  }

  return <Cmp />
}
