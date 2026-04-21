import React, { useEffect, useState } from 'react'
import { Building2 } from 'lucide-react'
import { API_BASE_URL } from '../../utils/constants'
import { setSedeActiva } from '../../../shared/utils/sedeContext'

interface Sede {
  id: number
  name: string
  description?: string
}

interface SedePickerProps {
  onSedeSelected: () => void
}

const fetchSedes = async (): Promise<Sede[]> => {
  try {
    const authRaw = localStorage.getItem('auth-storage')
    const token = authRaw ? JSON.parse(authRaw)?.state?.token : null
    const res = await fetch(`${API_BASE_URL}/sedes`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data.filter((s: Sede & { active?: boolean }) => s.active !== false) : []
  } catch {
    return []
  }
}

export const SedePicker: React.FC<SedePickerProps> = ({ onSedeSelected }) => {
  const [sedes, setSedes] = useState<Sede[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSedes().then((list) => {
      setSedes(list)
      setLoading(false)
    })
  }, [])

  const handleSelect = (sede: Sede) => {
    setSedeActiva({ id: sede.id, nombre: sede.name })
    onSedeSelected()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-secondary dark:bg-background-dark p-6">
      <div className="w-full max-w-md">
        <div className="bg-surface dark:bg-surface-dark rounded-xl shadow-lg p-8">
          <div className="flex flex-col items-center mb-6">
            <Building2 className="w-10 h-10 text-primary mb-3" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Selecciona tu sede</h2>
            <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1 text-center">
              Elige la sede en la que vas a operar para ver sus módulos y tickets
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sedes.length === 0 ? (
            <p className="text-center text-red-500 py-4">No hay sedes disponibles.</p>
          ) : (
            <ul className="space-y-3">
              {sedes.map((sede) => (
                <li key={sede.id}>
                  <button
                    onClick={() => handleSelect(sede)}
                    className="w-full text-left px-5 py-4 rounded-lg border border-neutral-200 dark:border-neutral-700
                               bg-white dark:bg-surface-dark-secondary hover:bg-primary/5 dark:hover:bg-primary/10
                               transition-colors duration-150 group"
                  >
                    <span className="font-semibold text-gray-800 dark:text-white group-hover:text-primary">
                      {sede.name}
                    </span>
                    {sede.description && (
                      <p className="text-xs text-gray-400 dark:text-neutral-500 mt-0.5">{sede.description}</p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
