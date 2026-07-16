export const API_BASE_URL =
  import.meta.env.VITE_AGENT_API_URL || 'https://api-int.yego.pro/api/ticketera'

export const TICKET_STATUS = {
  WAITING: 'WAITING',
  CALLED: 'CALLED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  FALLING: 'FALLING',
} as const
