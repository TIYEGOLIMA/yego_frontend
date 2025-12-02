import { useQuery } from '@tanstack/react-query'
import { yegoProOpsService } from '../../../../services/yego-pro-ops-service'
import { Activity, XCircle, CheckCircle, MapPin } from 'lucide-react'

export function DashboardStats() {
  const { data: estadisticas, isLoading } = useQuery({
    queryKey: ['yego-pro-ops-estadisticas'],
    queryFn: () => yegoProOpsService.obtenerEstadisticas(),
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`rounded-lg p-4 animate-pulse ${
            i === 2 ? 'bg-white dark:bg-white' : 'bg-gray-700 dark:bg-gray-800'
          }`}>
            <div className={`h-16 rounded ${
              i === 2 ? 'bg-gray-200 dark:bg-gray-200' : 'bg-gray-600 dark:bg-gray-700'
            }`}></div>
          </div>
        ))}
      </div>
    )
  }

  const stats = [
    {
      title: 'Viaje activo',
      value: estadisticas?.viajeActivo || 0,
      icon: Activity,
      dotColor: 'bg-gray-400',
      gradient: 'from-blue-500 to-blue-600',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      highlighted: false,
    },
    {
      title: 'No disponible(s)',
      value: estadisticas?.noDisponibles || 0,
      icon: XCircle,
      dotColor: 'bg-gray-400',
      gradient: 'from-amber-500 to-amber-600',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      highlighted: false,
    },
    {
      title: 'Disponible(s)',
      value: estadisticas?.disponibles || 0,
      icon: CheckCircle,
      dotColor: 'bg-green-500',
      gradient: 'from-green-500 to-green-600',
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400',
      highlighted: true,
    },
    {
      title: 'Sin GPS',
      value: estadisticas?.sinGPS || 0,
      icon: MapPin,
      dotColor: '',
      gradient: 'from-red-500 to-red-600',
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400',
      highlighted: false,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <div
            key={stat.title}
            className={`overflow-hidden rounded-lg hover:shadow-md transition-all duration-300 ${
              stat.highlighted
                ? 'bg-white dark:bg-white border border-neutral-200'
                : 'bg-gray-700 dark:bg-gray-800'
            }`}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={`${stat.iconBg} p-1.5 rounded-lg flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${stat.iconColor}`} />
                  </div>
                  <span className={`text-sm font-medium truncate ${
                    stat.highlighted 
                      ? 'text-neutral-600 dark:text-neutral-600' 
                      : 'text-gray-300 dark:text-gray-300'
                  }`}>
                    {stat.title}
                  </span>
                </div>
                {stat.dotColor && (
                  <div className={`w-2 h-2 rounded-full ${stat.dotColor} flex-shrink-0 ml-2`}></div>
                )}
              </div>
              <div className={`text-2xl font-bold mb-2 ${
                stat.highlighted 
                  ? 'text-neutral-900 dark:text-neutral-900' 
                  : 'text-white dark:text-white'
              }`}>
                {stat.value}
              </div>
              <div className={`h-1 w-full bg-gradient-to-r ${stat.gradient} rounded-full`}></div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

