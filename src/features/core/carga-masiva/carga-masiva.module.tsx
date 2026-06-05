import { useState, useEffect } from 'react'
import { Upload, FileSpreadsheet, CheckCircle2, Loader2, FileDown, Calendar, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { api } from '@/services/core/api'

interface PreviewResponse {
  cargaId: string
  fileName: string
  totalFilas: number
  headers: string[]
  preview: string[][]
  fechaMin: string
  fechaMax: string
  duplicados: number
  solapamiento: boolean
  fechasDuplicadas: boolean
  mensaje: string
}

interface HistorialItem {
  id: number
  cargaId: string
  fileName: string
  totalFilas: number
  filasInsertadas: number
  duplicadosOmitidos: number
  fechaMin: string
  fechaMax: string
  estado: string
  createdAt: string
}

const CargaMasivaModule = () => {
  const [tab, setTab] = useState<'importar' | 'historial'>('importar')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [historial, setHistorial] = useState<HistorialItem[]>([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)

  const fetchHistorial = async () => {
    setLoadingHistorial(true)
    try {
      const { data } = await api.get<HistorialItem[]>('/carga-masiva/historial')
      setHistorial(data)
    } catch { /* ignore */ }
    finally { setLoadingHistorial(false) }
  }

  useEffect(() => {
    if (tab === 'historial') fetchHistorial()
  }, [tab])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.name.endsWith('.xlsx') && !f.name.endsWith('.xls')) {
      setError('Solo se permiten archivos Excel (.xlsx, .xls)')
      return
    }
    setFile(f)
    setError(null)
    setPreview(null)
    setResult(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', f)
      const { data } = await api.post<PreviewResponse>('/carga-masiva/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 0,
      })
      setPreview(data)
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al procesar el archivo')
    } finally {
      setUploading(false)
    }
  }

  const handleImport = async () => {
    if (!preview?.cargaId) return
    setImporting(true)
    setError(null)
    try {
      const { data } = await api.post('/carga-masiva/import', { cargaId: preview.cargaId }, { timeout: 0 })
      if (data.importado) {
        setResult(`${data.filasImportadas} registros importados exitosamente`)
        setPreview(null)
        setFile(null)
        fetchHistorial()
      } else {
        setError(data.mensaje || 'Error en la importación')
      }
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al importar')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Carga Masiva</h1>
          <p className="text-sm text-gray-500 mt-1">Importa datos desde archivos Excel</p>
        </div>
        <div className="flex items-center gap-1">
          {([{ key: 'importar', label: 'Importar', icon: Upload }, { key: 'historial', label: 'Historial', icon: History }] as const).map(t => (
            <Button key={t.key} size="sm" variant="ghost" onClick={() => setTab(t.key)}
              className={`rounded-full px-4 h-8 text-sm font-medium ${tab === t.key ? 'bg-red-600 text-white hover:bg-red-700' : 'text-gray-500 hover:bg-gray-100'}`}>
              <t.icon className="w-4 h-4 mr-1.5" />{t.label}
            </Button>
          ))}
        </div>
      </div>

      {tab === 'importar' ? (
        <Card className="border-0 shadow-sm dark:bg-neutral-900/80 rounded-2xl">
          <CardContent className="p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />Cargar documento
            </h2>

            <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${file && !uploading ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20' : 'border-gray-300 dark:border-neutral-700 hover:border-red-400'}`}>
              <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" id="file-upload" />
              <label htmlFor="file-upload" className="cursor-pointer block">
                {uploading ? (
                  <div>
                    <Loader2 className="w-8 h-8 text-red-500 mx-auto mb-2 animate-spin" />
                    <p className="text-sm text-gray-500">Procesando {file?.name}...</p>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Seleccionar archivo Excel (.xlsx)</p>
                    {file && <p className="text-xs text-emerald-600 mt-1 font-medium">{file.name} — {(file.size / 1024 / 1024).toFixed(1)} MB</p>}
                  </div>
                )}
              </label>
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-sm text-red-600">{error}</div>
            )}

            {preview && preview.headers && (
              <div className="mt-6 pt-6 border-t border-gray-100 dark:border-neutral-800">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-500">
                    {preview.totalFilas.toLocaleString()} filas · {preview.headers.length} columnas
                    {preview.duplicados > 0 && <span className="text-amber-600 ml-2">({preview.duplicados} ya existen)</span>}
                  </p>
                  {(preview.fechaMin || preview.fechaMax) && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Calendar className="w-3.5 h-3.5" />
                      {preview.fechaMin?.substring(0, 10)} → {preview.fechaMax?.substring(0, 10)}
                    </div>
                  )}
                </div>

                {preview.fechasDuplicadas && (
                  <div className="mb-3 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 text-sm text-red-600">
                    Las fechas de este archivo ya existen en la base de datos. No se puede importar.
                  </div>
                )}

                {preview.solapamiento && !preview.fechasDuplicadas && (
                  <div className="mb-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-sm text-amber-600">
                    Las fechas se solapan con datos existentes.
                  </div>
                )}

                <div className="rounded-lg border border-gray-200 dark:border-neutral-700 overflow-auto max-h-80 mb-4">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-neutral-800 sticky top-0 z-10">
                      <tr>
                        <th className="py-1.5 px-3 text-left text-gray-400 font-semibold border-r border-gray-200 dark:border-neutral-700 sticky left-0 bg-gray-50 dark:bg-neutral-800 z-20">#</th>
                        {preview.headers.map((h, i) => (
                          <th key={i} className="py-1.5 px-3 text-left text-gray-400 font-semibold border-r border-gray-200 dark:border-neutral-700 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                      {preview.preview.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-neutral-800/30">
                          <td className="py-1 px-3 text-gray-400 border-r border-gray-100 dark:border-neutral-800 sticky left-0 bg-white dark:bg-neutral-900 font-mono">{i + 1}</td>
                          {row.map((val, j) => (
                            <td key={j} className="py-1 px-3 text-gray-700 dark:text-gray-300 border-r border-gray-100 dark:border-neutral-800 whitespace-nowrap max-w-[250px] truncate">{val || '—'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {preview.totalFilas > 20 && (
                  <p className="text-xs text-gray-400 mb-3">Primeras 20 de {preview.totalFilas.toLocaleString()} filas</p>
                )}

                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    {preview.fechasDuplicadas ? 'No se puede importar' : 'Revisa los datos antes de importar'}
                  </p>
                  <Button onClick={handleImport} disabled={importing || preview.fechasDuplicadas} size="sm"
                    className="rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-6">
                    {importing ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" />Importando...</>
                      : <><FileDown className="w-4 h-4 mr-1.5" />Importar {preview.totalFilas.toLocaleString()} registros</>}
                  </Button>
                </div>
              </div>
            )}

            {result && (
              <div className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <p className="text-sm text-emerald-700 dark:text-emerald-300">{result}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm dark:bg-neutral-900/80 rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            {loadingHistorial ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : historial.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Sin cargas registradas</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-neutral-800">
                  <tr>
                    <th className="py-2.5 px-4 text-left text-[11px] font-semibold text-gray-400 uppercase">Fecha</th>
                    <th className="py-2.5 px-4 text-left text-[11px] font-semibold text-gray-400 uppercase">Archivo</th>
                    <th className="py-2.5 px-4 text-center text-[11px] font-semibold text-gray-400 uppercase">Filas</th>
                    <th className="py-2.5 px-4 text-center text-[11px] font-semibold text-gray-400 uppercase">Insertados</th>
                    <th className="py-2.5 px-4 text-center text-[11px] font-semibold text-gray-400 uppercase">Duplicados</th>
                    <th className="py-2.5 px-4 text-left text-[11px] font-semibold text-gray-400 uppercase">Rango fechas</th>
                    <th className="py-2.5 px-4 text-left text-[11px] font-semibold text-gray-400 uppercase">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                  {historial.map(h => (
                    <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800/20">
                      <td className="py-3 px-4 text-gray-700 dark:text-gray-300 whitespace-nowrap">{h.createdAt}</td>
                      <td className="py-3 px-4 text-gray-900 dark:text-gray-100 font-medium max-w-[200px] truncate">{h.fileName}</td>
                      <td className="py-3 px-4 text-center text-gray-700 dark:text-gray-300">{h.totalFilas}</td>
                      <td className="py-3 px-4 text-center text-emerald-600 dark:text-emerald-400 font-semibold">{h.filasInsertadas}</td>
                      <td className="py-3 px-4 text-center text-amber-600 dark:text-amber-400">{h.duplicadosOmitidos > 0 ? h.duplicadosOmitidos : '—'}</td>
                      <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">{h.fechaMin ? <>{h.fechaMin} → {h.fechaMax}</> : '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${h.estado === 'completado' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                          {h.estado === 'completado' ? 'Completado' : 'Pendiente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default CargaMasivaModule
