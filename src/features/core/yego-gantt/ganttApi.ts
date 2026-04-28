/**
 * Llamadas HTTP del módulo WorkOS Gantt: rutas y tipos en un solo sitio.
 */

import { api } from '../../../services/core/api'
import type {
  AreaFull,
  ColaboradorDto,
  Kpis,
  ProjectDto,
  SprintDto,
  TaskRow,
} from './types'

/** Prefijos de API usados solo por este módulo. */
export const yegoGanttPaths = {
  taskSummary: '/yego-gantt/tasks/summary',
  projects: '/yego-gantt/projects',
  sprintsByProject: (projectId: number) => `/yego-gantt/sprints/by-project/${projectId}`,
} as const

export const areasPaths = {
  findAllActive: '/areas/find-all-active',
  collaborators: (areaId: number) => `/areas/${areaId}/colaboradores`,
  /** Un solo GET con ?ids= &ids=… (lista repetida; compatible con Spring MVC). */
  collaboratorsByAreas: '/areas/colaboradores-por-areas',
} as const

/** Query ?areaId=&priority=&projectId= para listado/resumen de tareas. */
export function ganttListParams(
  areaFilter: string,
  priorityFilter: string,
  projectFilter: string,
): Record<string, string> {
  const q: Record<string, string> = {}
  if (areaFilter !== 'all') q.areaId = areaFilter
  if (priorityFilter !== 'all') q.priority = priorityFilter
  if (projectFilter !== 'all') q.projectId = projectFilter
  return q
}

/** Clave estable del conjunto de áreas (caché de colaboradores). */
export function areasStableKey(areas: AreaFull[]): string {
  if (areas.length === 0) return ''
  return areas
    .map((a) => a.id)
    .sort((x, y) => x - y)
    .join(',')
}

export interface GanttTaskSummary {
  tasks: TaskRow[]
  kpis: Kpis
}

/** GET /yego-gantt/tasks/summary — tareas + KPIs en una petición. */
export async function fetchGanttTaskSummary(
  areaFilter: string,
  priorityFilter: string,
  projectFilter: string,
): Promise<GanttTaskSummary> {
  const res = await api.get<GanttTaskSummary>(yegoGanttPaths.taskSummary, {
    params: ganttListParams(areaFilter, priorityFilter, projectFilter),
  })
  return res.data
}

export interface GanttMasterData {
  areas: AreaFull[]
  projects: ProjectDto[]
}

/** Áreas activas + proyectos Gantt en paralelo. */
export async function fetchGanttMasterData(): Promise<GanttMasterData> {
  const [areasRes, projectsRes] = await Promise.all([
    api.get<AreaFull[]>(areasPaths.findAllActive),
    api.get<ProjectDto[]>(yegoGanttPaths.projects),
  ])
  return { areas: areasRes.data, projects: projectsRes.data }
}

/** Colaboradores por área; una petición en lugar de N GET por área. */
export async function fetchAreaCollaboratorsMap(
  areaList: AreaFull[],
): Promise<Map<number, ColaboradorDto[]>> {
  const map = new Map<number, ColaboradorDto[]>()
  if (areaList.length === 0) return map
  const ids = [...new Set(areaList.map((a) => a.id))].sort((x, y) => x - y)
  for (const id of ids) map.set(id, [])
  const params = new URLSearchParams()
  for (const id of ids) params.append('ids', String(id))
  try {
    const res = await api.get<Record<string, ColaboradorDto[]>>(
      `${areasPaths.collaboratorsByAreas}?${params.toString()}`,
    )
    const data = res.data
    for (const id of ids) {
      const list = data[String(id)]
      map.set(id, Array.isArray(list) ? list : [])
    }
  } catch {
    /* map ya tiene listas vacías por área */
  }
  return map
}

/** Sprints agrupados por id de proyecto. */
export async function fetchSprintsByProjects(
  projects: { id: number }[],
): Promise<Record<number, SprintDto[]>> {
  if (projects.length === 0) return {}
  const results = await Promise.allSettled(
    projects.map((p) => api.get<SprintDto[]>(yegoGanttPaths.sprintsByProject(p.id))),
  )
  const map: Record<number, SprintDto[]> = {}
  projects.forEach((p, i) => {
    const r = results[i]
    map[p.id] = r.status === 'fulfilled' ? r.value.data : []
  })
  return map
}

export function parseGanttLoadError(e: unknown): string {
  const data = e && typeof e === 'object' && 'response' in e
    ? (e as { response?: { data?: { message?: string; code?: string } } }).response?.data
    : undefined
  if (data?.message != null && String(data.message).trim() !== '') {
    return String(data.message)
  }
  return 'Error al cargar'
}
