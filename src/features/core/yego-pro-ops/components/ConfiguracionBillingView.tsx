import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { yegoProOpsService, type BillingConfigResponse, type BonusThreshold, type PaymentPercentage } from '../../../../services/yego-pro-ops-service'
import { useAuth } from '../../../../shared/hooks/useAuth'
import { Button } from '../../../../components/ui/button'
import { Card, CardContent } from '../../../../components/ui/card'
import { Settings, Gift, Percent, Plus, Trash2, Save, X } from 'lucide-react'
import { cn } from '../../../../utils/cn'

function formatCurrency(v: number): string {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(v).replace('PEN', 'S/')
}

export function ConfiguracionBillingView() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: config, isLoading } = useQuery<BillingConfigResponse>({
    queryKey: ['pro-ops', 'config-billing'],
    queryFn: () => yegoProOpsService.obtenerConfigBilling(),
  })

  const [editBonos, setEditBonos] = useState<BonusThreshold[]>([])
  const [editPcts, setEditPcts] = useState<PaymentPercentage[]>([])
  const [dirty, setDirty] = useState(false)

  const saveMutation = useMutation({
    mutationFn: (cfg: BillingConfigResponse) => yegoProOpsService.guardarConfigBilling(cfg, user?.id ?? 0),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pro-ops', 'config-billing'] }); setDirty(false) },
  })

  const iniciarEdicion = () => {
    if (!config) return
    setEditBonos(JSON.parse(JSON.stringify(config.bonus_thresholds)))
    setEditPcts(JSON.parse(JSON.stringify(config.payment_percentages)))
    setDirty(true)
  }

  const cancelarEdicion = () => { setEditBonos([]); setEditPcts([]); setDirty(false) }

  const handleGuardar = () => {
    saveMutation.mutate({ bonus_thresholds: editBonos, payment_percentages: editPcts })
  }

  const bonosEdicion = dirty ? editBonos : (config?.bonus_thresholds ?? [])
  const pctsEdicion = dirty ? editPcts : (config?.payment_percentages ?? [])

  return (
    <div className="space-y-6 bg-white dark:bg-neutral-950 rounded-xl border border-gray-200 dark:border-neutral-800 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
            <Settings className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Configuraciones de facturación</h2>
            <p className="text-sm text-gray-400">Umbrales de bono y porcentajes de pago</p>
          </div>
        </div>
        {!dirty ? (
          <Button size="sm" onClick={iniciarEdicion} className="rounded-lg text-xs gap-2">
            <Settings className="w-3.5 h-3.5" /> Editar
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={cancelarEdicion} className="rounded-lg text-xs gap-1"><X className="w-3.5 h-3.5" />Cancelar</Button>
            <Button size="sm" onClick={handleGuardar} disabled={saveMutation.isPending} className="rounded-lg text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"><Save className="w-3.5 h-3.5" />{saveMutation.isPending ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" /></div>
      ) : (
        <div className="space-y-6">
          <Card className="border-gray-200 dark:border-neutral-800 shadow-none">
            <CardContent className="p-0">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-neutral-800">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Umbrales de bono</span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900/50">
                    <th className="py-2 px-4 text-left text-[11px] font-semibold text-gray-400 uppercase">Mín. Viajes</th>
                    <th className="py-2 px-4 text-left text-[11px] font-semibold text-gray-400 uppercase">Bono</th>
                    <th className="py-2 px-4 text-left text-[11px] font-semibold text-gray-400 uppercase">Vigencia</th>
                    {dirty && <th className="py-2 px-4 w-10" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-neutral-800/30">
                  {bonosEdicion.map((b, i) => (
                    <tr key={b.id ?? i} className="hover:bg-gray-50 dark:hover:bg-neutral-800/20">
                      <td className="py-2 px-4">
                        {dirty ? <input type="number" value={b.minTrips} onChange={e => { const n = [...editBonos]; n[i] = { ...n[i], minTrips: parseInt(e.target.value) || 0 }; setEditBonos(n) }} className="w-20 text-xs border border-gray-300 dark:border-neutral-600 rounded px-2 py-1 bg-white dark:bg-neutral-800" /> : <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{b.minTrips}</span>}
                      </td>
                      <td className="py-2 px-4">
                        {dirty ? <input type="number" step="0.01" value={b.bonusAmount} onChange={e => { const n = [...editBonos]; n[i] = { ...n[i], bonusAmount: parseFloat(e.target.value) || 0 }; setEditBonos(n) }} className="w-28 text-xs border border-gray-300 dark:border-neutral-600 rounded px-2 py-1 bg-white dark:bg-neutral-800" /> : <span className="text-sm font-semibold text-amber-600">{formatCurrency(b.bonusAmount)}</span>}
                      </td>
                      <td className="py-2 px-4">
                        {dirty ? <input type="date" value={b.effectiveFrom} onChange={e => { const n = [...editBonos]; n[i] = { ...n[i], effectiveFrom: e.target.value }; setEditBonos(n) }} className="w-36 text-xs border border-gray-300 dark:border-neutral-600 rounded px-2 py-1 bg-white dark:bg-neutral-800" /> : <span className="text-xs text-gray-500">{b.effectiveFrom}</span>}
                      </td>
                      {dirty && (
                        <td className="py-2 px-4"><button onClick={() => { const n = editBonos.filter((_, j) => j !== i); setEditBonos(n) }} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button></td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {dirty && (
                <div className="px-4 py-3 border-t border-gray-100 dark:border-neutral-800">
                  <Button variant="ghost" size="sm" className="text-xs gap-1 text-gray-500" onClick={() => setEditBonos([...editBonos, { minTrips: 0, bonusAmount: 0, effectiveFrom: new Date().toISOString().split('T')[0] }])}>
                    <Plus className="w-3 h-3" /> Agregar umbral
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-gray-200 dark:border-neutral-800 shadow-none">
            <CardContent className="p-0">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-neutral-800">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Porcentajes de pago</span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900/50">
                    <th className="py-2 px-4 text-left text-[11px] font-semibold text-gray-400 uppercase">Mín. Viajes Válidos</th>
                    <th className="py-2 px-4 text-left text-[11px] font-semibold text-gray-400 uppercase">% Pago</th>
                    <th className="py-2 px-4 text-left text-[11px] font-semibold text-gray-400 uppercase">Vigencia</th>
                    {dirty && <th className="py-2 px-4 w-10" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-neutral-800/30">
                  {pctsEdicion.map((p, i) => (
                    <tr key={p.id ?? i} className="hover:bg-gray-50 dark:hover:bg-neutral-800/20">
                      <td className="py-2 px-4">
                        {dirty ? <input type="number" value={p.minValidatedTrips} onChange={e => { const n = [...editPcts]; n[i] = { ...n[i], minValidatedTrips: parseInt(e.target.value) || 0 }; setEditPcts(n) }} className="w-20 text-xs border border-gray-300 dark:border-neutral-600 rounded px-2 py-1 bg-white dark:bg-neutral-800" /> : <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.minValidatedTrips}</span>}
                      </td>
                      <td className="py-2 px-4">
                        {dirty ? <input type="number" step="0.01" value={p.percentage} onChange={e => { const n = [...editPcts]; n[i] = { ...n[i], percentage: parseFloat(e.target.value) || 0 }; setEditPcts(n) }} className="w-20 text-xs border border-gray-300 dark:border-neutral-600 rounded px-2 py-1 bg-white dark:bg-neutral-800" /> : <span className="text-sm font-semibold text-blue-600">{(p.percentage * 100).toFixed(0)}%</span>}
                      </td>
                      <td className="py-2 px-4">
                        {dirty ? <input type="date" value={p.effectiveFrom} onChange={e => { const n = [...editPcts]; n[i] = { ...n[i], effectiveFrom: e.target.value }; setEditPcts(n) }} className="w-36 text-xs border border-gray-300 dark:border-neutral-600 rounded px-2 py-1 bg-white dark:bg-neutral-800" /> : <span className="text-xs text-gray-500">{p.effectiveFrom}</span>}
                      </td>
                      {dirty && (
                        <td className="py-2 px-4"><button onClick={() => { const n = editPcts.filter((_, j) => j !== i); setEditPcts(n) }} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button></td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {dirty && (
                <div className="px-4 py-3 border-t border-gray-100 dark:border-neutral-800">
                  <Button variant="ghost" size="sm" className="text-xs gap-1 text-gray-500" onClick={() => setEditPcts([...editPcts, { minValidatedTrips: 0, percentage: 0.5, effectiveFrom: new Date().toISOString().split('T')[0] }])}>
                    <Plus className="w-3 h-3" /> Agregar porcentaje
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
