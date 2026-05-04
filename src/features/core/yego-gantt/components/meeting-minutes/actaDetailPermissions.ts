import type { MeetingMinuteResponse } from '../../types'

/** Permisos en la vista detalle del acta (vista completa vs parcial por responsable/área). */
export function actaDetailPermissions(manage: boolean, detail: MeetingMinuteResponse | null) {
  const restrictedView = Boolean(detail?.partialItemsView)
  return {
    restrictedView,
    /** Editar celdas de filas visibles (gestor o colaborador con vista parcial). */
    canEditRows: manage || restrictedView,
    /** Cabecera, estado, baja acta, pegar filas, borradores, eliminar filas. */
    canManageFullActa: manage && !restrictedView,
  } as const
}
