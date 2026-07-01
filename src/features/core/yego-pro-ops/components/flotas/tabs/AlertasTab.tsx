import type { VehicleDetail } from '../types'
import { AlertTriangle, FileText, Wrench, CheckCircle, XCircle, Clock } from 'lucide-react'
import { cn } from '@/utils/cn'

interface Props { vehicle: VehicleDetail }

export default function AlertasTab({ vehicle }: Props) {
  const hoy = new Date()

  const alertasDocs = (vehicle.documents ?? []).map(doc => {
    if (!doc.fechaVigente) return null
    const fin = new Date(doc.fechaVigente)
    const dias = Math.ceil((fin.getTime() - hoy.getTime()) / 86400000)
    if (dias < 0) return { tipo: 'documento', nombre: doc.tipo, mensaje: `${doc.tipo} vencido`, severidad: 'critica' as const, icono: <XCircle className="w-4 h-4 text-red-500" />, dias }
    if (dias <= 7) return { tipo: 'documento', nombre: doc.tipo, mensaje: `${doc.tipo} vence en ${dias} días`, severidad: 'alta' as const, icono: <AlertTriangle className="w-4 h-4 text-orange-500" />, dias }
    if (dias <= 15) return { tipo: 'documento', nombre: doc.tipo, mensaje: `${doc.tipo} vence en ${dias} días`, severidad: 'media' as const, icono: <Clock className="w-4 h-4 text-yellow-500" />, dias }
    if (dias <= 30) return { tipo: 'documento', nombre: doc.tipo, mensaje: `${doc.tipo} vence en ${dias} días`, severidad: 'baja' as const, icono: <Clock className="w-4 h-4 text-blue-500" />, dias }
    return null
  }).filter(Boolean)

  const alertasMant = (vehicle.maintenance ?? [])
    .filter(m => m.estado === 'pendiente')
    .map(m => ({ tipo: 'mantenimiento', nombre: m.categoria || 'Mantenimiento', mensaje: `Pendiente: ${m.descripcion || m.categoria}`, severidad: 'media' as const, icono: <Wrench className="w-4 h-4 text-amber-500" /> }))

  const docsVigentes = (vehicle.documents ?? []).filter(d => d.estado !== 'vencido').length

  const todasLasAlertas = [...alertasDocs, ...alertasMant]
  const ordenCriticidad = { critica: 0, alta: 1, media: 2, baja: 3 }
  todasLasAlertas.sort((a, b) => (ordenCriticidad[a.severidad] ?? 9) - (ordenCriticidad[b.severidad] ?? 9))

  const severidadStyles: Record<string, string> = {
    critica: 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20',
    alta: 'border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20',
    media: 'border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20',
    baja: 'border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20',
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Panel de alertas</h3>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-4 text-center">
          <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
          <p className="text-xs text-emerald-600 uppercase">Docs vigentes</p>
          <p className="text-2xl font-bold text-emerald-700">{docsVigentes}</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-800 p-4 text-center">
          <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto mb-1" />
          <p className="text-xs text-amber-600 uppercase">Próximos a vencer</p>
          <p className="text-2xl font-bold text-amber-700">{alertasDocs.filter(a => a && a.dias !== undefined && a.dias >= 0).length}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-200 dark:border-red-800 p-4 text-center">
          <XCircle className="w-5 h-5 text-red-500 mx-auto mb-1" />
          <p className="text-xs text-red-600 uppercase">Vencidos / Pendientes</p>
          <p className="text-2xl font-bold text-red-700">{alertasDocs.filter(a => a && a.dias !== undefined && a.dias < 0).length + alertasMant.length}</p>
        </div>
      </div>

      {/* Lista de alertas */}
      {todasLasAlertas.length > 0 ? (
        <div className="space-y-3">
          {todasLasAlertas.map((alerta, i) => (
            <div key={i} className={cn('rounded-2xl border p-4 flex items-start gap-3', severidadStyles[alerta.severidad])}>
              <div className="flex-shrink-0 mt-0.5">{alerta.icono}</div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{alerta.nombre}</p>
                <p className="text-xs text-gray-500">{alerta.mensaje}</p>
              </div>
              <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold', {
                critica: 'bg-red-200 text-red-700', alta: 'bg-orange-200 text-orange-700', media: 'bg-yellow-200 text-yellow-700', baja: 'bg-blue-200 text-blue-700'
              })}>{alerta.severidad}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Todo en orden. Sin alertas activas.</p>
        </div>
      )}
    </div>
  )
}
