import React, { useEffect, useMemo, useState } from 'react'
import {
  Tablet,
  Monitor,
  Tv,
  RefreshCw,
  Trash2,
  Plus,
  KeyRound,
  Copy,
  Check,
  Loader2,
  Building2,
  Users,
  Pencil,
  X,
  Layers,
  Power,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react'
import { api } from '@/services/core/api'
import { getTicketeraErrorMessage } from '../../domain'
import {
  dispositivosService,
  Dispositivo,
  TipoDispositivo,
  CrearDispositivoRequest,
} from '../agentpanel/services/dispositivosService'
import {
  modulosAdminService,
  ModuloAtencion,
  CrearModuloAtencionRequest,
} from '../agentpanel/services/modulosAdminService'
import { sedesService, Sede } from '../agentpanel/services/sedesService'

type TabId = 'dispositivos' | 'modulos' | 'usuarios'

interface UsuarioApi {
  id: number
  name?: string
  lastName?: string
  username: string
  email?: string
  roleName?: string
  active?: boolean
  sedeId?: number | null
  sedeNombre?: string | null
}

const TIPO_LABEL: Record<TipoDispositivo, string> = {
  TABLET_PRINCIPAL: 'Tablet Principal',
  TABLET: 'Tablet de Calificación',
  TV: 'TV / Display',
}

const TIPO_ICON: Record<TipoDispositivo, React.ReactNode> = {
  TABLET_PRINCIPAL: <Monitor className="w-5 h-5" />,
  TABLET: <Tablet className="w-5 h-5" />,
  TV: <Tv className="w-5 h-5" />,
}

const ROL_SAC = 'SAC'

type ConfirmTone = 'warning' | 'danger' | 'info'

interface ConfirmConfig {
  title: string
  message: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: ConfirmTone
  onConfirm: () => Promise<void> | void
}

const TONE_STYLES: Record<ConfirmTone, { iconBg: string; icon: string; button: string }> = {
  danger: {
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    icon: 'text-red-600 dark:text-red-400',
    button: 'bg-red-600 hover:bg-red-700 text-white',
  },
  warning: {
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    icon: 'text-amber-600 dark:text-amber-400',
    button: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
  info: {
    iconBg: 'bg-primary-100 dark:bg-primary-900/30',
    icon: 'text-primary-600 dark:text-primary-400',
    button: 'bg-primary-600 hover:bg-primary-700 text-white',
  },
}

const ConfirmDialog: React.FC<{
  config: ConfirmConfig
  onClose: () => void
}> = ({ config, onClose }) => {
  const tone = config.tone ?? 'warning'
  const styles = TONE_STYLES[tone]
  const [running, setRunning] = useState(false)

  const handleConfirm = async () => {
    if (running) return
    setRunning(true)
    try {
      await config.onConfirm()
      onClose()
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-md w-full">
        <div className="px-6 py-5">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${styles.iconBg} flex-shrink-0`}>
              <AlertTriangle className={`w-6 h-6 ${styles.icon}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                {config.title}
              </h3>
              <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                {config.message}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={running}
              className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white disabled:opacity-40"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={running}
              className="px-4 py-2 rounded-lg text-sm border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50"
            >
              {config.cancelLabel ?? 'Cancelar'}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={running}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm shadow disabled:opacity-60 ${styles.button}`}
            >
              {running && <Loader2 className="w-4 h-4 animate-spin" />}
              {config.confirmLabel ?? 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const cargarUsuariosSac = (): Promise<UsuarioApi[]> => {
  return api
    .get<UsuarioApi[]>(`/users/by-role/${ROL_SAC}`)
    .then((response) => response.data ?? [])
}

export const TicketeraAdmin: React.FC = () => {
  const [tab, setTab] = useState<TabId>('dispositivos')
  const [sedes, setSedes] = useState<Sede[]>([])

  useEffect(() => {
    sedesService
      .listar()
      .then(setSedes)
      .catch(() => setSedes([]))
  }, [])

  return (
    <div className="min-h-screen bg-background-secondary dark:bg-background-dark p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Administración de Ticketera
            </h1>
            <p className="text-gray-600 dark:text-neutral-400 mt-1">
              Dispositivos, módulos y agentes SAC del sistema
            </p>
          </div>
        </div>

        <div className="mb-6 inline-flex p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 gap-1">
          <button
            type="button"
            onClick={() => setTab('dispositivos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'dispositivos'
                ? 'bg-white dark:bg-neutral-900 shadow text-primary-600 dark:text-primary-400'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Tablet className="w-4 h-4" />
            Dispositivos
          </button>
          <button
            type="button"
            onClick={() => setTab('modulos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'modulos'
                ? 'bg-white dark:bg-neutral-900 shadow text-primary-600 dark:text-primary-400'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            Módulos
          </button>
          <button
            type="button"
            onClick={() => setTab('usuarios')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === 'usuarios'
                ? 'bg-white dark:bg-neutral-900 shadow text-primary-600 dark:text-primary-400'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            Agentes SAC
          </button>
        </div>

        {tab === 'dispositivos' && <DispositivosTab sedes={sedes} />}
        {tab === 'modulos' && <ModulosTab sedes={sedes} />}
        {tab === 'usuarios' && <UsuariosSacTab sedes={sedes} />}
      </div>
    </div>
  )
}

const DispositivosTab: React.FC<{ sedes: Sede[] }> = ({ sedes }) => {
  const [items, setItems] = useState<Dispositivo[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroSedeId, setFiltroSedeId] = useState<number | 'all'>('all')
  const [filtroTipo, setFiltroTipo] = useState<TipoDispositivo | 'all'>('all')
  const [editando, setEditando] = useState<Dispositivo | null>(null)
  const [creando, setCreando] = useState(false)
  const [tokenRevelado, setTokenRevelado] = useState<{ id: number; token: string } | null>(null)
  const [accionando, setAccionando] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmar, setConfirmar] = useState<ConfirmConfig | null>(null)

  const cargar = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await dispositivosService.listar()
      setItems(data)
    } catch (e: unknown) {
      setError(getTicketeraErrorMessage(e, 'Error cargando dispositivos'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  const filtrados = useMemo(() => {
    return items.filter((d) => {
      if (filtroSedeId !== 'all' && d.sedeId !== filtroSedeId) return false
      if (filtroTipo !== 'all' && d.type !== filtroTipo) return false
      return true
    })
  }, [items, filtroSedeId, filtroTipo])

  const agrupadosPorSede = useMemo(() => {
    const grupos = new Map<number, { sedeId: number; sedeNombre: string; compartidos: Dispositivo[]; calificacion: Dispositivo[] }>()
    filtrados.forEach((d) => {
      const grupo = grupos.get(d.sedeId) ?? {
        sedeId: d.sedeId,
        sedeNombre: d.sedeNombre ?? `Sede ${d.sedeId}`,
        compartidos: [],
        calificacion: [],
      }
      if (d.type === 'TABLET') grupo.calificacion.push(d)
      else grupo.compartidos.push(d)
      grupos.set(d.sedeId, grupo)
    })

    const ORDEN_TIPO: Record<TipoDispositivo, number> = { TABLET_PRINCIPAL: 0, TV: 1, TABLET: 2 }
    grupos.forEach((g) => {
      g.compartidos.sort((a, b) => ORDEN_TIPO[a.type] - ORDEN_TIPO[b.type] || a.name.localeCompare(b.name))
      g.calificacion.sort((a, b) =>
        (a.moduleNombre ?? '').localeCompare(b.moduleNombre ?? '') || a.name.localeCompare(b.name),
      )
    })

    return Array.from(grupos.values()).sort((a, b) => a.sedeNombre.localeCompare(b.sedeNombre))
  }, [filtrados])

  const ejecutarRegenerar = async (d: Dispositivo) => {
    setAccionando(d.id)
    setError(null)
    try {
      const updated = await dispositivosService.regenerarToken(d.id)
      setTokenRevelado({ id: d.id, token: updated.accessTokenPlain ?? '' })
      await cargar()
    } catch (e: unknown) {
      setError(getTicketeraErrorMessage(e, 'Error regenerando token'))
    } finally {
      setAccionando(null)
    }
  }

  const ejecutarDesactivar = async (d: Dispositivo) => {
    setAccionando(d.id)
    setError(null)
    try {
      await dispositivosService.desactivar(d.id)
      await cargar()
    } catch (e: unknown) {
      setError(getTicketeraErrorMessage(e, 'Error desactivando dispositivo'))
    } finally {
      setAccionando(null)
    }
  }

  const pedirRegenerar = (d: Dispositivo) =>
    setConfirmar({
      title: 'Regenerar token de acceso',
      message: (
        <>
          Se generará un <span className="font-semibold">nuevo token</span> para{' '}
          <span className="font-semibold">{d.name}</span>. El token actual dejará de funcionar y el
          dispositivo tendrá que volver a autenticarse en <code>/login</code>.
        </>
      ),
      confirmLabel: 'Regenerar token',
      tone: 'warning',
      onConfirm: () => ejecutarRegenerar(d),
    })

  const pedirDesactivar = (d: Dispositivo) =>
    setConfirmar({
      title: 'Desactivar dispositivo',
      message: (
        <>
          <span className="font-semibold">{d.name}</span> dejará de poder autenticarse y
          desaparecerá de las pantallas activas. Podrás reactivarlo más adelante.
        </>
      ),
      confirmLabel: 'Desactivar',
      tone: 'danger',
      onConfirm: () => ejecutarDesactivar(d),
    })

  const ocupado = accionando !== null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={filtroSedeId}
          onChange={(e) =>
            setFiltroSedeId(e.target.value === 'all' ? 'all' : Number(e.target.value))
          }
          className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
        >
          <option value="all">Todas las sedes</option>
          {sedes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value as TipoDispositivo | 'all')}
          className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
        >
          <option value="all">Todos los tipos</option>
          <option value="TABLET_PRINCIPAL">Tablet Principal</option>
          <option value="TABLET">Tablet de Calificación</option>
          <option value="TV">TV / Display</option>
        </select>

        <button
          type="button"
          onClick={() => cargar()}
          disabled={ocupado}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4" />
          Refrescar
        </button>

        <button
          type="button"
          onClick={() => setCreando(true)}
          disabled={ocupado}
          className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-primary-600 hover:bg-primary-700 text-white shadow disabled:opacity-60"
        >
          <Plus className="w-4 h-4" />
          Nuevo dispositivo
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {tokenRevelado && (
        <TokenReveladoBanner
          token={tokenRevelado.token}
          onClose={() => setTokenRevelado(null)}
        />
      )}

      {confirmar && (
        <ConfirmDialog config={confirmar} onClose={() => setConfirmar(null)} />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16 text-neutral-500">No hay dispositivos para los filtros aplicados.</div>
      ) : (
        <div className="space-y-5">
          {agrupadosPorSede.map(({ sedeId, sedeNombre, compartidos, calificacion }) => (
            <SedeDispositivosCard
              key={sedeId}
              sedeNombre={sedeNombre}
              compartidos={compartidos}
              calificacion={calificacion}
              accionando={accionando}
              ocupado={ocupado}
              onEditar={(d) => setEditando(d)}
              onPedirRegenerar={pedirRegenerar}
              onPedirDesactivar={pedirDesactivar}
            />
          ))}
        </div>
      )}

      {(creando || editando) && (
        <DispositivoFormModal
          sedes={sedes}
          dispositivo={editando}
          onClose={() => {
            setCreando(false)
            setEditando(null)
          }}
          onSaved={async (resp) => {
            if (resp?.accessTokenPlain) {
              setTokenRevelado({ id: resp.id, token: resp.accessTokenPlain })
            }
            setCreando(false)
            setEditando(null)
            await cargar()
          }}
        />
      )}
    </div>
  )
}

interface DispositivoRowActions {
  accionando: number | null
  ocupado: boolean
  onEditar: (d: Dispositivo) => void
  onPedirRegenerar: (d: Dispositivo) => void
  onPedirDesactivar: (d: Dispositivo) => void
}

const DispositivoRow: React.FC<{ dispositivo: Dispositivo; actions: DispositivoRowActions }> = ({
  dispositivo: d,
  actions: { accionando, ocupado, onEditar, onPedirRegenerar, onPedirDesactivar },
}) => {
  const alcance =
    d.type === 'TABLET'
      ? { label: d.moduleNombre ?? (d.moduleId ? `Módulo ${d.moduleId}` : 'Sin módulo'), tone: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' }
      : { label: 'Sirve a toda la sede', tone: 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300' }

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
      <span className="text-primary-600 dark:text-primary-400 flex-shrink-0">{TIPO_ICON[d.type]}</span>

      <div className="min-w-[160px] flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-neutral-900 dark:text-white">{d.name}</span>
          <span className="text-[11px] uppercase tracking-wide text-neutral-500">{TIPO_LABEL[d.type]}</span>
        </div>
        {d.description && (
          <div className="text-xs text-neutral-500 mt-0.5">{d.description}</div>
        )}
      </div>

      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${alcance.tone}`}>
        {d.type === 'TABLET' ? <Layers className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
        {alcance.label}
      </span>

      <span
        className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
          d.active
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
        }`}
      >
        {d.active ? 'Activo' : 'Inactivo'}
      </span>

      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={() => onPedirRegenerar(d)}
          disabled={ocupado}
          title="Regenerar token de acceso"
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/20 disabled:opacity-50"
        >
          {accionando === d.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <KeyRound className="w-3 h-3" />}
          Token
        </button>
        <button
          onClick={() => onEditar(d)}
          disabled={ocupado}
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 disabled:opacity-50"
        >
          <Pencil className="w-3 h-3" />
          Editar
        </button>
        <button
          onClick={() => onPedirDesactivar(d)}
          disabled={ocupado || !d.active}
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20 disabled:opacity-50"
        >
          <Trash2 className="w-3 h-3" />
          Desactivar
        </button>
      </div>
    </div>
  )
}

const SedeDispositivosCard: React.FC<{
  sedeNombre: string
  compartidos: Dispositivo[]
  calificacion: Dispositivo[]
  accionando: number | null
  ocupado: boolean
  onEditar: (d: Dispositivo) => void
  onPedirRegenerar: (d: Dispositivo) => void
  onPedirDesactivar: (d: Dispositivo) => void
}> = ({ sedeNombre, compartidos, calificacion, ...actions }) => {
  const [abierto, setAbierto] = useState(false)
  const total = compartidos.length + calificacion.length
  const inactivos = [...compartidos, ...calificacion].filter((d) => !d.active).length

  const conteoPorTipo = useMemo(() => {
    const counts: Record<TipoDispositivo, number> = { TABLET_PRINCIPAL: 0, TABLET: 0, TV: 0 }
    compartidos.forEach((d) => counts[d.type]++)
    calificacion.forEach((d) => counts[d.type]++)
    return counts
  }, [compartidos, calificacion])

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="w-full px-4 py-3 bg-primary-50 dark:bg-primary-900/20 border-b border-primary-100 dark:border-primary-900/40 flex items-center justify-between gap-3 hover:bg-primary-100/60 dark:hover:bg-primary-900/30 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <ChevronDown
            className={`w-4 h-4 text-primary-600 dark:text-primary-400 transition-transform ${abierto ? 'rotate-180' : ''}`}
          />
          <Building2 className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0" />
          <h3 className="text-base font-semibold text-neutral-900 dark:text-white truncate">{sedeNombre}</h3>
          <span className="text-xs text-neutral-500 flex-shrink-0">· {total} dispositivo{total === 1 ? '' : 's'}</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {conteoPorTipo.TABLET_PRINCIPAL > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              <Monitor className="w-3 h-3" />
              {conteoPorTipo.TABLET_PRINCIPAL} Principal
            </span>
          )}
          {conteoPorTipo.TABLET > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
              <Tablet className="w-3 h-3" />
              {conteoPorTipo.TABLET} Calificación
            </span>
          )}
          {conteoPorTipo.TV > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              <Tv className="w-3 h-3" />
              {conteoPorTipo.TV} TV
            </span>
          )}
          {inactivos > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {inactivos} inactivo{inactivos === 1 ? '' : 's'}
            </span>
          )}
        </div>
      </button>

      {abierto && (
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {compartidos.map((d) => (
            <DispositivoRow key={d.id} dispositivo={d} actions={actions} />
          ))}
          {calificacion.map((d) => (
            <DispositivoRow key={d.id} dispositivo={d} actions={actions} />
          ))}
        </div>
      )}
    </div>
  )
}

const TokenReveladoBanner: React.FC<{ token: string; onClose: () => void }> = ({
  token,
  onClose,
}) => {
  const [copiado, setCopiado] = useState(false)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(token)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // ignorar
    }
  }
  return (
    <div className="px-4 py-3 rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20">
      <div className="flex items-start gap-3">
        <KeyRound className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            Token de acceso generado
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300 mb-2">
            Cópialo ahora. Por seguridad no podrás volver a verlo. Pégalo en /login &gt; Dispositivo.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 rounded bg-white dark:bg-neutral-900 border border-amber-300 dark:border-amber-700 text-sm font-mono break-all">
              {token}
            </code>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 px-3 py-2 rounded text-sm bg-amber-600 hover:bg-amber-700 text-white"
            >
              {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiado ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

interface FormState {
  name: string
  type: TipoDispositivo
  sedeId: number | ''
  moduleId: number | ''
  description: string
}

const DispositivoFormModal: React.FC<{
  sedes: Sede[]
  dispositivo: Dispositivo | null
  onClose: () => void
  onSaved: (resp: Dispositivo) => void
}> = ({ sedes, dispositivo, onClose, onSaved }) => {
  const [form, setForm] = useState<FormState>(() => ({
    name: dispositivo?.name ?? '',
    type: dispositivo?.type ?? 'TABLET_PRINCIPAL',
    sedeId: dispositivo?.sedeId ?? '',
    moduleId: dispositivo?.moduleId ?? '',
    description: dispositivo?.description ?? '',
  }))
  const [modulos, setModulos] = useState<ModuloAtencion[]>([])
  const [modulosLoading, setModulosLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    setModulosLoading(true)
    modulosAdminService
      .listar()
      .then((data) => {
        if (!cancelado) setModulos(data)
      })
      .catch(() => {
        if (!cancelado) setModulos([])
      })
      .finally(() => {
        if (!cancelado) setModulosLoading(false)
      })
    return () => {
      cancelado = true
    }
  }, [])

  const moduloAplica = form.type === 'TABLET'
  const modulosDisponibles = useMemo(() => {
    if (!moduloAplica || form.sedeId === '') return []
    return modulos.filter((m) => m.sedeId === form.sedeId && m.isActive)
  }, [modulos, moduloAplica, form.sedeId])

  useEffect(() => {
    if (!moduloAplica && form.moduleId !== '') {
      setForm((f) => ({ ...f, moduleId: '' }))
      return
    }
    if (
      moduloAplica &&
      form.moduleId !== '' &&
      !modulosDisponibles.some((m) => m.id === form.moduleId)
    ) {
      setForm((f) => ({ ...f, moduleId: '' }))
    }
  }, [moduloAplica, modulosDisponibles, form.moduleId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || form.sedeId === '') {
      setError('Nombre y sede son obligatorios')
      return
    }
    if (moduloAplica && form.moduleId === '') {
      setError('Selecciona el módulo que esta tablet de calificación va a evaluar')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload: CrearDispositivoRequest = {
        name: form.name.trim(),
        type: form.type,
        sedeId: Number(form.sedeId),
        moduleId: moduloAplica && form.moduleId !== '' ? Number(form.moduleId) : null,
        description: form.description.trim() || null,
      }
      const resp = dispositivo
        ? await dispositivosService.actualizar(dispositivo.id, payload)
        : await dispositivosService.crear(payload)
      onSaved(resp)
    } catch (e: unknown) {
      setError(getTicketeraErrorMessage(e, 'Error guardando el dispositivo'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-lg w-full">
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            {dispositivo ? 'Editar dispositivo' : 'Nuevo dispositivo'}
          </h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Nombre
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm"
              placeholder="Ej: Tablet Principal Lince"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Tipo
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as TipoDispositivo }))}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm"
              >
                <option value="TABLET_PRINCIPAL">Tablet Principal</option>
                <option value="TABLET">Tablet de Calificación</option>
                <option value="TV">TV / Display</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Sede
              </label>
              <select
                value={form.sedeId}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    sedeId: e.target.value === '' ? '' : Number(e.target.value),
                    moduleId: '',
                  }))
                }
                required
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm"
              >
                <option value="">Selecciona...</option>
                {sedes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {moduloAplica && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Módulo a calificar
              </label>
              <select
                value={form.moduleId}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    moduleId: e.target.value === '' ? '' : Number(e.target.value),
                  }))
                }
                disabled={form.sedeId === '' || modulosLoading || modulosDisponibles.length === 0}
                required
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm disabled:opacity-60"
              >
                <option value="">
                  {form.sedeId === ''
                    ? 'Primero selecciona una sede'
                    : modulosLoading
                      ? 'Cargando módulos...'
                      : modulosDisponibles.length === 0
                        ? 'No hay módulos activos en esta sede'
                        : 'Selecciona el módulo...'}
                </option>
                {modulosDisponibles.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Solo se muestran módulos activos de la sede seleccionada.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Descripción (opcional)
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-60"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {dispositivo ? 'Guardar cambios' : 'Crear dispositivo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const ModulosTab: React.FC<{ sedes: Sede[] }> = ({ sedes }) => {
  const [items, setItems] = useState<ModuloAtencion[]>([])
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroSedeId, setFiltroSedeId] = useState<number | 'all'>('all')
  const [filtroEstado, setFiltroEstado] = useState<'all' | 'activos' | 'inactivos'>('all')
  const [creando, setCreando] = useState(false)
  const [editando, setEditando] = useState<ModuloAtencion | null>(null)
  const [vinculando, setVinculando] = useState<ModuloAtencion | null>(null)
  const [accionando, setAccionando] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const [confirmar, setConfirmar] = useState<ConfirmConfig | null>(null)

  const cargar = async () => {
    setLoading(true)
    setError(null)
    try {
      const [modulosData, dispositivosData] = await Promise.all([
        modulosAdminService.listar(),
        dispositivosService.listar(),
      ])
      setItems(modulosData)
      setDispositivos(dispositivosData)
    } catch (e: unknown) {
      setError(getTicketeraErrorMessage(e, 'Error cargando módulos'))
    } finally {
      setLoading(false)
    }
  }

  const tabletsPorModulo = useMemo(() => {
    const map = new Map<number, Dispositivo[]>()
    dispositivos.forEach((d) => {
      if (d.type !== 'TABLET' || d.moduleId == null) return
      const arr = map.get(d.moduleId) ?? []
      arr.push(d)
      map.set(d.moduleId, arr)
    })
    return map
  }, [dispositivos])

  const tabletsLibresPorSede = useMemo(() => {
    const map = new Map<number, Dispositivo[]>()
    dispositivos.forEach((d) => {
      if (d.type !== 'TABLET' || d.moduleId != null || !d.active) return
      const arr = map.get(d.sedeId) ?? []
      arr.push(d)
      map.set(d.sedeId, arr)
    })
    return map
  }, [dispositivos])

  useEffect(() => {
    cargar()
  }, [])

  const filtrados = useMemo(() => {
    return items.filter((m) => {
      if (filtroSedeId !== 'all' && m.sedeId !== filtroSedeId) return false
      if (filtroEstado === 'activos' && !m.isActive) return false
      if (filtroEstado === 'inactivos' && m.isActive) return false
      return true
    })
  }, [items, filtroSedeId, filtroEstado])

  const ejecutarToggleEstado = async (m: ModuloAtencion) => {
    setAccionando(m.id)
    setError(null)
    setOkMsg(null)
    try {
      await modulosAdminService.cambiarEstado(m.id, !m.isActive)
      setOkMsg(`Módulo ${!m.isActive ? 'activado' : 'desactivado'}`)
      await cargar()
    } catch (e: unknown) {
      setError(getTicketeraErrorMessage(e, 'Error cambiando estado'))
    } finally {
      setAccionando(null)
    }
  }

  const ejecutarEliminar = async (m: ModuloAtencion) => {
    setAccionando(m.id)
    setError(null)
    setOkMsg(null)
    try {
      await modulosAdminService.eliminar(m.id)
      setOkMsg('Módulo eliminado')
      await cargar()
    } catch (e: unknown) {
      setError(getTicketeraErrorMessage(e, 'Error eliminando módulo'))
    } finally {
      setAccionando(null)
    }
  }

  const pedirToggleEstado = (m: ModuloAtencion) =>
    setConfirmar({
      title: m.isActive ? 'Desactivar módulo' : 'Activar módulo',
      message: m.isActive ? (
        <>
          <span className="font-semibold">{m.name}</span> dejará de estar disponible para asignar
          a agentes. Los tickets ya en curso no se ven afectados.
        </>
      ) : (
        <>
          Volverás a habilitar <span className="font-semibold">{m.name}</span> para asignación.
        </>
      ),
      confirmLabel: m.isActive ? 'Desactivar' : 'Activar',
      tone: m.isActive ? 'warning' : 'info',
      onConfirm: () => ejecutarToggleEstado(m),
    })

  const pedirEliminar = (m: ModuloAtencion) =>
    setConfirmar({
      title: 'Eliminar módulo',
      message: (
        <>
          Vas a eliminar <span className="font-semibold">{m.name}</span> de forma permanente. Si
          tiene tickets asociados la operación fallará; en ese caso desactívalo en su lugar.
        </>
      ),
      confirmLabel: 'Eliminar',
      tone: 'danger',
      onConfirm: () => ejecutarEliminar(m),
    })

  const ocupado = accionando !== null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={filtroSedeId}
          onChange={(e) =>
            setFiltroSedeId(e.target.value === 'all' ? 'all' : Number(e.target.value))
          }
          className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
        >
          <option value="all">Todas las sedes</option>
          {sedes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as 'all' | 'activos' | 'inactivos')}
          className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
        >
          <option value="all">Todos los estados</option>
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
        </select>

        <button
          type="button"
          onClick={() => cargar()}
          disabled={ocupado}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4" />
          Refrescar
        </button>

        <button
          type="button"
          onClick={() => setCreando(true)}
          disabled={ocupado}
          className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-primary-600 hover:bg-primary-700 text-white shadow disabled:opacity-60"
        >
          <Plus className="w-4 h-4" />
          Nuevo módulo
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {okMsg && (
        <div className="px-4 py-3 rounded-lg border border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-800 text-sm text-green-700 dark:text-green-300">
          {okMsg}
        </div>
      )}

      {confirmar && (
        <ConfirmDialog config={confirmar} onClose={() => setConfirmar(null)} />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16 text-neutral-500">No hay módulos para los filtros aplicados.</div>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-left text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-4 py-3">Módulo</th>
                <th className="px-4 py-3">Sede</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((m) => {
                const tabletsVinculadas = tabletsPorModulo.get(m.id) ?? []
                const sinTablet = tabletsVinculadas.length === 0
                return (
                <tr
                  key={m.id}
                  className="border-t border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/30"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      <div>
                        <div className="font-medium text-neutral-900 dark:text-white">{m.name}</div>
                        {m.description && (
                          <div className="text-xs text-neutral-500">{m.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800">
                      <Building2 className="w-3 h-3" />
                      {m.sedeNombre ?? (m.sedeId ? `Sede ${m.sedeId}` : 'Sin sede')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                        m.isActive
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                      }`}
                    >
                      {m.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {sinTablet && (
                        <button
                          onClick={() => setVinculando(m)}
                          disabled={ocupado}
                          title="Vincular una tablet de calificación a este módulo"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-900/20 disabled:opacity-50"
                        >
                          <Tablet className="w-3 h-3" />
                          Vincular tablet
                        </button>
                      )}
                      <button
                        onClick={() => pedirToggleEstado(m)}
                        disabled={ocupado}
                        title={m.isActive ? 'Desactivar' : 'Activar'}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs border disabled:opacity-50 ${
                          m.isActive
                            ? 'border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/20'
                            : 'border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-900/20'
                        }`}
                      >
                        {accionando === m.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Power className="w-3 h-3" />
                        )}
                        {m.isActive ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        onClick={() => setEditando(m)}
                        disabled={ocupado}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 disabled:opacity-50"
                      >
                        <Pencil className="w-3 h-3" />
                        Editar
                      </button>
                      <button
                        onClick={() => pedirEliminar(m)}
                        disabled={ocupado}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20 disabled:opacity-50"
                      >
                        <Trash2 className="w-3 h-3" />
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {(creando || editando) && (
        <ModuloFormModal
          sedes={sedes}
          modulo={editando}
          onClose={() => {
            setCreando(false)
            setEditando(null)
          }}
          onSaved={async () => {
            setCreando(false)
            setEditando(null)
            await cargar()
          }}
        />
      )}

      {vinculando && (
        <VincularTabletModal
          modulo={vinculando}
          tabletsDisponibles={tabletsLibresPorSede.get(vinculando.sedeId ?? -1) ?? []}
          onClose={() => setVinculando(null)}
          onVinculado={async (tabletNombre) => {
            setOkMsg(`Tablet "${tabletNombre}" vinculada al módulo ${vinculando.name}`)
            setVinculando(null)
            await cargar()
          }}
        />
      )}
    </div>
  )
}

const VincularTabletModal: React.FC<{
  modulo: ModuloAtencion
  tabletsDisponibles: Dispositivo[]
  onClose: () => void
  onVinculado: (tabletNombre: string) => void
}> = ({ modulo, tabletsDisponibles, onClose, onVinculado }) => {
  const [seleccionada, setSeleccionada] = useState<number | ''>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleVincular = async () => {
    if (seleccionada === '') {
      setError('Selecciona una tablet')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const tablet = tabletsDisponibles.find((t) => t.id === seleccionada)
      await dispositivosService.asignarModulo(Number(seleccionada), modulo.id)
      onVinculado(tablet?.name ?? `Tablet ${seleccionada}`)
    } catch (e: unknown) {
      setError(getTicketeraErrorMessage(e, 'Error vinculando la tablet'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Vincular tablet a {modulo.name}
          </h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Solo se muestran las tablets de calificación activas en{' '}
            <span className="font-semibold">{modulo.sedeNombre ?? `sede ${modulo.sedeId}`}</span>{' '}
            que aún no están vinculadas a otro módulo.
          </p>

          {tabletsDisponibles.length === 0 ? (
            <div className="px-4 py-6 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 text-center text-sm text-neutral-500">
              No hay tablets libres en esta sede.<br />
              Crea una nueva desde la pestaña <span className="font-semibold">Dispositivos</span> y
              elígela como Tablet de Calificación con este módulo.
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Tablet de calificación
              </label>
              <select
                value={seleccionada}
                onChange={(e) => setSeleccionada(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm"
              >
                <option value="">Selecciona una tablet...</option>
                {tabletsDisponibles.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.description ? ` · ${t.description}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleVincular}
              disabled={saving || tabletsDisponibles.length === 0 || seleccionada === ''}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-60"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Vincular
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ModuloFormState {
  name: string
  description: string
  sedeId: number | ''
}

const ModuloFormModal: React.FC<{
  sedes: Sede[]
  modulo: ModuloAtencion | null
  onClose: () => void
  onSaved: (resp: ModuloAtencion) => void
}> = ({ sedes, modulo, onClose, onSaved }) => {
  const [form, setForm] = useState<ModuloFormState>(() => ({
    name: modulo?.name ?? '',
    description: modulo?.description ?? '',
    sedeId: modulo?.sedeId ?? '',
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || form.sedeId === '') {
      setError('Nombre y sede son obligatorios')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload: CrearModuloAtencionRequest = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        sedeId: Number(form.sedeId),
      }
      const resp = modulo
        ? await modulosAdminService.actualizar(modulo.id, payload)
        : await modulosAdminService.crear(payload)
      onSaved(resp)
    } catch (e: unknown) {
      setError(getTicketeraErrorMessage(e, 'Error guardando el módulo'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-lg w-full">
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
            {modulo ? 'Editar módulo' : 'Nuevo módulo'}
          </h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Nombre
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              maxLength={50}
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm"
              placeholder="Ej: Módulo 1, Caja, Atención general"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Sede
            </label>
            <select
              value={form.sedeId}
              onChange={(e) =>
                setForm((f) => ({ ...f, sedeId: e.target.value === '' ? '' : Number(e.target.value) }))
              }
              required
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm"
            >
              <option value="">Selecciona...</option>
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Descripción (opcional)
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-60"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {modulo ? 'Guardar cambios' : 'Crear módulo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const UsuariosSacTab: React.FC<{ sedes: Sede[] }> = ({ sedes }) => {
  const [items, setItems] = useState<UsuarioApi[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroSedeId, setFiltroSedeId] = useState<number | 'all'>('all')
  const [actualizando, setActualizando] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  const cargar = async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await cargarUsuariosSac()
      setItems(list)
    } catch (e: unknown) {
      setError(getTicketeraErrorMessage(e, 'Error cargando usuarios'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  const filtrados = useMemo(() => {
    return items.filter((u) => {
      if (filtroSedeId !== 'all' && u.sedeId !== filtroSedeId) return false
      if (!search.trim()) return true
      const q = search.toLowerCase().trim()
      return (
        (u.name ?? '').toLowerCase().includes(q) ||
        (u.lastName ?? '').toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q)
      )
    })
  }, [items, search, filtroSedeId])

  const handleCambiarSede = async (userId: number, sedeId: number) => {
    setActualizando(userId)
    setError(null)
    setOkMsg(null)
    try {
      await api.patch(`/users/${userId}/sede`, { sedeId })
      const sede = sedes.find((s) => s.id === sedeId)
      setOkMsg(`Sede actualizada a ${sede?.name ?? sedeId}`)
      setItems((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, sedeId, sedeNombre: sede?.name ?? null } : u)),
      )
    } catch (e: unknown) {
      setError(getTicketeraErrorMessage(e, 'Error actualizando la sede'))
    } finally {
      setActualizando(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, usuario o email..."
          className="flex-1 min-w-[240px] px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
        />
        <select
          value={filtroSedeId}
          onChange={(e) =>
            setFiltroSedeId(e.target.value === 'all' ? 'all' : Number(e.target.value))
          }
          className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
        >
          <option value="all">Todas las sedes</option>
          {sedes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => cargar()}
          disabled={actualizando !== null}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4" />
          Refrescar
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {okMsg && (
        <div className="px-4 py-3 rounded-lg border border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-800 text-sm text-green-700 dark:text-green-300">
          {okMsg}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16 text-neutral-500">No hay agentes SAC para los filtros.</div>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-left text-xs uppercase text-neutral-500">
              <tr>
                <th className="px-4 py-3">Agente</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Sede asignada</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((u) => (
                <tr
                  key={u.id}
                  className="border-t border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/30"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-neutral-900 dark:text-white">
                      {[u.name, u.lastName].filter(Boolean).join(' ') || u.username}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">{u.username}</td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">{u.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center text-xs px-2 py-1 rounded-full ${
                        u.active
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      {u.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={u.sedeId ?? ''}
                        onChange={(e) =>
                          e.target.value !== '' && handleCambiarSede(u.id, Number(e.target.value))
                        }
                        disabled={actualizando !== null}
                        className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm disabled:opacity-60"
                      >
                        <option value="">Sin sede</option>
                        {sedes.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      {actualizando === u.id && (
                        <Loader2 className="w-3 h-3 animate-spin text-primary-600" />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default TicketeraAdmin
